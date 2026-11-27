/**
 * CONTEXT ENGINE – BỘ ĐIỀU PHỐI NGỮ CẢNH HỘI THOẠI & PHÂN QUYỀN DANH TÍNH
 * (BOTCHAT BRAIN 2.1 – UNIVERSAL INTENT & CONTEXT ENGINE)
 * 
 * Capabilities:
 * - Phân định 3 nhóm danh tính: OWNER (Anh Trí), STAFF (Nhân viên), CUSTOMER (Khách hàng).
 * - Chống mạo danh tuyệt đối (Anti-Impersonation): Không tin câu tự xưng trong chat.
 * - Quản lý lịch sử hội thoại đa lượt (Multi-turn History).
 * - Giải quyết tham chiếu đại từ (Co-reference: "ngày đó", "sản phẩm này", "người ấy").
 * - Theo dõi trạng thái tác vụ dở dang (Task Context) kèm thời hạn TTL 30 phút.
 * - Hỗ trợ cơ chế khách hàng đính chính thông tin (Context Correction).
 */

import { db } from '../../db.js';

const CONTEXT_TTL_MS = 30 * 60 * 1000; // 30 minutes active window
const activeSessions = new Map();

export class ContextEngine {
  /**
   * 1. Resolve Verified User & Identity Context
   * Enforces Anti-Impersonation: Role MUST come from authenticated session/token,
   * NEVER from chat text claim ("Tôi là anh Trí").
   */
  static resolveUserContext(params = {}) {
    if (params.userContext && (params.userContext.role || params.userContext.isOwner !== undefined)) {
      return params.userContext;
    }
    const { customerInfo = {}, user = null, authenticatedUser = null, message = '' } = params;
    const authUser = user || authenticatedUser;

    let role = 'CUSTOMER';
    let userId = customerInfo?.phone || customerInfo?.id || 'usr_anonymous';
    let userName = customerInfo?.name || 'Quý khách';
    let orgId = params.orgId || authUser?.orgId || 'org_default';
    let isImpersonationAttempt = false;

    // Verify cryptographic role if authenticated
    if (authUser) {
      if (authUser.role === 'admin' || authUser.is_owner === 1 || authUser.username === 'Admin') {
        role = 'OWNER';
        userId = authUser.id || 'owner_tri';
        userName = authUser.name || authUser.username || 'Anh Trí';
      } else if (authUser.role === 'staff' || authUser.role === 'employee') {
        role = 'STAFF';
        userId = authUser.id || `staff_${authUser.username}`;
        userName = authUser.name || authUser.username || 'Nhân viên';
      }
    }

    // Check for unauthenticated impersonation attempt in chat text
    if (role !== 'OWNER') {
      const lowerMsg = (message || '').toLowerCase();
      const unaccented = lowerMsg
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd');

      const isCasualNameIntro = /(?:cu\s+goi\s+(?:toi|minh|em|anh|chi)\s+la|ten\s+(?:toi|minh|em|anh|chi)\s+la|(?:toi|minh|em|anh|chi)\s+ten\s+la)\s+/i.test(unaccented);
      const claimsOwner = !isCasualNameIntro && (
        /(?:toi|anh|minh|em)\s+la\s+(?:admin|chu\s+shop|chu\s+so\s+huu|chu\s+doanh\s+nghiep|quang\s+nhut\s+tri|sep\s+tri)\b/i.test(unaccented) ||
        /(?:toi|anh)\s+la\s+(?:chu\s+so\s+huu|chu\s+nhan|chu\s+doanh\s+nghiep)\b/i.test(unaccented) ||
        /(?:toi|anh)\s+la\s+anh\s+tri\s*(?:chu\s+shop|day|ne)?\b/i.test(unaccented)
      );
      if (claimsOwner) {
        isImpersonationAttempt = true;
      }
    }

    return {
      role, // 'OWNER' | 'STAFF' | 'CUSTOMER'
      userId,
      userName,
      orgId,
      isAuthenticated: Boolean(authUser),
      isOwner: role === 'OWNER',
      isStaff: role === 'STAFF',
      isCustomer: role === 'CUSTOMER',
      isImpersonationAttempt
    };
  }

  /**
   * 2. Load Conversation History (Multi-turn turns from DB)
   */
  static async getConversationHistory(conversationId, limit = 8) {
    if (!conversationId) return [];

    try {
      const rows = await db.all(
        `SELECT sender_type, content as text, created_at 
         FROM messages 
         WHERE conversation_id = ? 
         ORDER BY id DESC LIMIT ?`,
        [conversationId, limit]
      );

      // Return chronological order: oldest to newest
      return rows.reverse().map(r => ({
        role: r.sender_type === 'user' ? 'user' : 'assistant',
        content: r.text,
        timestamp: r.created_at
      }));
    } catch (err) {
      console.warn('[CONTEXT ENGINE] Failed to fetch message history:', err.message);
      return [];
    }
  }

  /**
   * 3. Get or Initialize Session Context (In-Memory + TTL)
   */
  static getSessionContext(conversationId) {
    if (!conversationId) {
      return {
        activeTopic: null,
        lastIntent: null,
        lastProduct: null,
        lastTimeSpec: null,
        lastTargetPerson: null,
        pendingTask: null,
        updatedAt: Date.now()
      };
    }

    const now = Date.now();
    const existing = activeSessions.get(conversationId);

    if (existing && (now - existing.updatedAt < CONTEXT_TTL_MS)) {
      existing.updatedAt = now;
      return existing;
    }

    const freshContext = {
      conversationId,
      activeTopic: null,
      lastIntent: null,
      lastProduct: null,
      lastTimeSpec: null,
      lastTargetPerson: null,
      pendingTask: null,
      updatedAt: now
    };

    activeSessions.set(conversationId, freshContext);
    return freshContext;
  }

  /**
   * 4. Update Session Context
   */
  static updateSessionContext(conversationId, updates = {}) {
    if (!conversationId) return;
    const current = this.getSessionContext(conversationId);
    const updated = {
      ...current,
      ...updates,
      updatedAt: Date.now()
    };
    activeSessions.set(conversationId, updated);
    return updated;
  }

  /**
   * 5. Co-reference Resolution: Resolve pronouns & relative references
   * e.g. "ngày đó" -> previous timeSpec, "máy này" -> previous product, "người ấy" -> targetPerson
   */
  static resolveCoReferences(message = '', conversationId = null, extraContext = {}) {
    const session = this.getSessionContext(conversationId);
    const lower = message.toLowerCase();
    const unaccented = lower
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd');

    const resolved = {
      originalMessage: message,
      resolvedTimeSpec: null,
      resolvedProduct: null,
      resolvedPerson: null,
      isCorrection: false,
      correctionType: null
    };

    // 5A. Time reference resolution ("ngày đó", "hôm đó", "lúc đó", "giờ đó")
    if (/(?:ngay\s+do|hom\s+do|luc\s+do|gio\s+do|bua\s+do)\b/i.test(unaccented)) {
      resolved.resolvedTimeSpec = session.lastTimeSpec || extraContext.timeSpec || null;
    }

    // 5B. Product reference resolution ("máy này", "sản phẩm này", "loại này", "mẫu này", "chiếc này", "nó", "con này", "cái đó", "con đó", "mẫu đó", "loại đó")
    if (/(?:may\s+nay|san\s+pham\s+nay|loai\s+nay|mau\s+nay|chiec\s+nay|hop\s+nay|con\s+nay|cai\s+nay|mon\s+nay|cai\s+do|con\s+do|mau\s+do|loai\s+do|may\s+do|chiec\s+do|\bno\b)\b/i.test(unaccented)) {
      resolved.resolvedProduct = session.lastProduct || extraContext.selectedProduct || null;
      resolved.hasPronounReference = true;
    }

    // 5B.2 Alternative inquiry resolution ("còn loại nào khác", "còn mẫu nào khác", "còn phương án kia")
    if (/(?:con\s+loai\s+nao\s+khac|con\s+mau\s+nao\s+khac|co\s+loai\s+nao\s+khac|co\s+mau\s+nao\s+khac|phuong\s+an\s+khac|phuong\s+an\s+kia|lua\s+chon\s+khac)\b/i.test(unaccented)) {
      resolved.isAlternativeRequest = true;
      resolved.referenceCategory = session.lastProduct?.field || extraContext.selectedProduct?.field || null;
    }

    // 5C. Person reference resolution ("anh ấy", "người ấy", "sếp ấy")
    if (/(?:anh\s+ay|nguoi\s+ay|sep\s+ay|ong\s+ay)\b/i.test(unaccented)) {
      resolved.resolvedPerson = session.lastTargetPerson || 'anh Trí';
    }

    // 5D. Context Correction & Clarification Detection
    // ("không phải ý anh", "ý anh không phải vậy", "không phải, tôi tên...", "tôi hỏi laptop chứ không phải...")
    const isGentleCorrection = /(?:khong\s+phai\s+y\s+(?:anh|chi|toi|em|minh)|y\s+(?:anh|chi|toi|em|minh)\s+khong\s+phai|khong\s+dung\s+y|hieu\s+nham\s+y)\b/i.test(unaccented);
    const correctionMatch = lower.match(/(?:không\s+phải|khong\s+phai|nhầm\s+rồi|nham\s+roi|đổi\s+lại|doi\s+lai)[,\s]+(?:tôi|mình|em|anh|chị)\s+(?:tên|hỏi|cần|muốn|nói)\s+(.*)/i);
    if (isGentleCorrection || correctionMatch) {
      resolved.isCorrection = true;
      resolved.correctionType = isGentleCorrection ? 'INTENT_MISUNDERSTANDING' : 'FIELD_VALUE_UPDATE';
      resolved.correctionDetail = correctionMatch ? correctionMatch[1]?.trim() : 'USER_DISAVOWED_PREVIOUS_INFERENCE';
    }

    // 5E. Topic Resumption Detection ("quay lại máy in lúc nãy", "quay lại chuyện lúc nãy")
    const resumptionMatch = unaccented.match(/(?:quay\s+lai|tiep\s+tuc)\s+(.+?)(?:\s+luc\s+nay|\s+truoc\s+do|$)/i);
    if (resumptionMatch && resumptionMatch[1]) {
      resolved.isTopicResumption = true;
      resolved.resumptionTarget = resumptionMatch[1].trim();
    }

    return resolved;
  }
}

export default ContextEngine;
