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

      const claimsOwner = /(?:toi|anh|minh|em)\s+la\s+(?:anh\s+)?(?:tri|quang\s+nhut\s+tri|admin|chu\s+shop|sep\s+tri)\b/i.test(unaccented) ||
                         /(?:toi|anh)\s+la\s+chu\s+(?:so\s+huu|nhan|doanh\s+nghiep)\b/i.test(unaccented);
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
    const resolved = {
      originalMessage: message,
      resolvedTimeSpec: null,
      resolvedProduct: null,
      resolvedPerson: null,
      isCorrection: false,
      correctionType: null
    };

    // 5A. Time reference resolution ("ngày đó", "hôm đó", "lúc đó", "giờ đó")
    if (/(?:ngày\s+đó|ngay\s+do|hôm\s+đó|hom\s+do|lúc\s+đó|luc\s+do|giờ\s+đó|gio\s+do|bữa\s+đó|bua\s+do)\b/i.test(lower)) {
      resolved.resolvedTimeSpec = session.lastTimeSpec || extraContext.timeSpec || null;
    }

    // 5B. Product reference resolution ("máy này", "sản phẩm này", "loại này", "mẫu này", "chiếc này")
    if (/(?:máy\s+này|may\s+nay|sản\s+phẩm\s+này|san\s+pham\s+nay|loại\s+này|loai\s+nay|mẫu\s+này|mau\s+nay|chiếc\s+này|chiec\s+nay|hộp\s+này|hop\s+nay)\b/i.test(lower)) {
      resolved.resolvedProduct = session.lastProduct || extraContext.selectedProduct || null;
    }

    // 5C. Person reference resolution ("anh ấy", "người ấy", "sếp ấy")
    if (/(?:anh\s+ấy|anh\s+ay|người\s+ấy|nguoi\s+ay|sếp\s+ấy|sep\s+ay|ông\s+ấy|ong\s+ay)\b/i.test(lower)) {
      resolved.resolvedPerson = session.lastTargetPerson || 'anh Trí';
    }

    // 5D. Context Correction Detection ("không phải, tôi tên...", "tôi hỏi laptop chứ không phải...")
    const correctionMatch = lower.match(/(?:không\s+phải|khong\s+phai|nhầm\s+rồi|nham\s+roi|đổi\s+lại|doi\s+lai)[,\s]+(?:tôi|mình|em)\s+(?:tên|hỏi|cần)\s+(.*)/i);
    if (correctionMatch) {
      resolved.isCorrection = true;
      resolved.correctionDetail = correctionMatch[1]?.trim();
    }

    return resolved;
  }
}

export default ContextEngine;
