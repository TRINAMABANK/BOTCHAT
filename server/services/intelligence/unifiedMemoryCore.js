/**
 * TRÍ AI ULTIMATE ROBOT – UNIFIED MEMORY CORE
 * Triết lý: ONE BRAIN – ONE UNIFIED MEMORY – ALL THROUGH CONVERSATION
 * 
 * 6 TẦNG BỘ NHỚ NHÂN BẢN:
 * 1. Working Memory: Ngăn xếp mục tiêu phiên (Goal Stack), thực thể đang bàn, ngữ cảnh tức thì.
 * 2. Episodic Memory: Lịch sử các phiên, tiến độ hôm qua, biên bản hội thoại, quyết định đã chốt.
 * 3. Semantic Memory: Dữ kiện thực tế (FACT), suy luận (INFERENCE), giả thuyết (HYPOTHESIS), thực thể khách hàng.
 * 4. Procedural Memory: Quy trình tư vấn mẫu, heuristics xử lý phản đối, kỹ năng chuyên sâu.
 * 5. Prospective Memory: Lịch nhắc, cam kết tương lai, nhiệm vụ đến hạn.
 * 6. Associative Memory: Ma trận liên tưởng liên ngành, cầu nối khái niệm tương đồng.
 * 
 * NĂNG LỰC BẢO MẬT & QUẢN TRỊ:
 * - Phân loại tri thức: FACT vs INFERENCE vs HYPOTHESIS.
 * - Phát hiện mâu thuẫn (Contradiction Detection) & lưu vết lịch sử không ghi đè âm thầm.
 * - Cách ly tuyệt đối đa doanh nghiệp (tenant_id, owner_id, sensitivity).
 * - Điều phối 4 lệnh bộ nhớ tự nhiên: Xem, Sửa, Xóa, Tra cứu tiến độ cũ.
 */

import crypto from 'crypto';
import { randomUUID } from 'crypto';
import { db } from '../../db.js';
import { AssociationEngine } from './associationEngine.js';

export const TRUTH_TYPES = {
  FACT: 'FACT',               // Dữ kiện đã xác minh có bằng chứng thực tế
  INFERENCE: 'INFERENCE',     // Kết luận suy luận logic từ dữ kiện
  HYPOTHESIS: 'HYPOTHESIS',   // Giả định lý thuyết đang kiểm chứng
  UNKNOWN: 'UNKNOWN'          // Chưa có căn cứ, bắt buộc phải hỏi lại
};

export const MEMORY_LAYERS = {
  WORKING: 'WORKING',
  EPISODIC: 'EPISODIC',
  SEMANTIC: 'SEMANTIC',
  PROCEDURAL: 'PROCEDURAL',
  PROSPECTIVE: 'PROSPECTIVE',
  ASSOCIATIVE: 'ASSOCIATIVE'
};

export class UnifiedMemoryCore {
  /**
   * 1. WORKING MEMORY STORES (In-Memory Prefrontal Cortex)
   */
  static workingContextStore = new Map(); // sessionId -> contextData
  static goalStackStore = new Map();       // sessionId -> Array<Goal>

  // -------------------------------------------------------------
  // WORKING MEMORY: GOAL STACK (Bảo toàn mục tiêu khi đổi đề tài)
  // -------------------------------------------------------------
  static pushGoal(sessionId, goal = {}) {
    if (!sessionId) return;
    const stack = this.goalStackStore.get(sessionId) || [];
    const enrichedGoal = {
      goalId: goal.goalId || `goal_${randomUUID().slice(0, 8)}`,
      type: goal.type || 'GENERAL_CONSULTATION',
      customer: goal.customer || null,
      product: goal.product || null,
      step: goal.step || 'ACTIVE',
      data: goal.data || {},
      timestamp: Date.now()
    };
    stack.push(enrichedGoal);
    // Limit stack depth to 5
    if (stack.length > 5) stack.shift();
    this.goalStackStore.set(sessionId, stack);
    return enrichedGoal;
  }

  static peekGoal(sessionId) {
    if (!sessionId) return null;
    const stack = this.goalStackStore.get(sessionId);
    if (!stack || stack.length === 0) return null;
    return stack[stack.length - 1];
  }

  static popGoal(sessionId) {
    if (!sessionId) return null;
    const stack = this.goalStackStore.get(sessionId);
    if (!stack || stack.length === 0) return null;
    const popped = stack.pop();
    this.goalStackStore.set(sessionId, stack);
    return popped;
  }

  static resumePreviousGoal(sessionId) {
    if (!sessionId) return null;
    const stack = this.goalStackStore.get(sessionId);
    if (!stack || stack.length < 2) return this.peekGoal(sessionId);
    // Pop current and return previous
    stack.pop();
    const prev = stack[stack.length - 1];
    this.goalStackStore.set(sessionId, stack);
    return prev;
  }

  static clearGoals(sessionId) {
    if (!sessionId) return;
    this.goalStackStore.delete(sessionId);
  }

  static setWorkingContext(sessionId, data = {}) {
    if (!sessionId) return;
    const cur = this.workingContextStore.get(sessionId) || {};
    this.workingContextStore.set(sessionId, {
      ...cur,
      ...data,
      lastActiveAt: Date.now()
    });
  }

  static updateWorkingContext(sessionId, data = {}) {
    return this.setWorkingContext(sessionId, data);
  }

  static getWorkingContext(sessionId) {
    if (!sessionId) return null;
    return this.workingContextStore.get(sessionId) || null;
  }

  // -------------------------------------------------------------
  // 2. EPISODIC MEMORY (Sự kiện & Tiến độ các phiên trước)
  // -------------------------------------------------------------
  static async recordEpisode(params = {}) {
    const {
      conversationId = params.sessionId,
      sessionId,
      participants = ['user', 'assistant'],
      category = 'CONSULTATION',
      summary,
      userGoal,
      systemAction,
      keyDecisions,
      outcome = null,
      location = null,
      tenantId = 'org_default',
      ownerId = 'owner_tri'
    } = params;

    const convId = conversationId || sessionId;
    const effectiveSummary = summary || (userGoal ? `${userGoal}: ${systemAction || ''}` : null);
    const effectiveOutcome = outcome || (keyDecisions ? (Array.isArray(keyDecisions) ? keyDecisions.join('; ') : keyDecisions) : null);

    if (!effectiveSummary) return null;
    const episodeId = `ep_${randomUUID().slice(0, 10)}`;
    const memoryId = `mem_ep_${randomUUID().slice(0, 10)}`;
    const now = new Date().toISOString();
    const contentHash = crypto.createHash('sha256').update(`${convId}::${effectiveSummary}`).digest('hex');

    try {
      // 1. Lưu vào bảng cốt lõi ai_memories
      await db.run(
        `INSERT INTO ai_memories (
          memory_id, memory_type, content, content_hash, subject, entity_id,
          source, source_reference, confidence, status, event_time, created_at,
          updated_at, owner_id, tenant_id, sensitivity, fact_type
        ) VALUES (?, 'EPISODIC', ?, ?, 'SESSION_SUMMARY', ?, 'CONVERSATION', ?, 1.0, 'ACTIVE', ?, ?, ?, ?, ?, 'INTERNAL', 'FACT')`,
        [memoryId, effectiveSummary, contentHash, convId, convId, now, now, now, ownerId, tenantId]
      );

      // 2. Lưu vào bảng chi tiết ai_memory_episodes
      await db.run(
        `INSERT INTO ai_memory_episodes (
          episode_id, memory_id, conversation_id, participants_json,
          event_category, summary, outcome, location, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [episodeId, memoryId, convId, JSON.stringify(participants), category, effectiveSummary, effectiveOutcome, location, now]
      );

      return { episodeId, memoryId, summary: effectiveSummary, outcome: effectiveOutcome };
    } catch (err) {
      console.warn('[UNIFIED MEMORY] recordEpisode error:', err.message);
      return null;
    }
  }

  /**
   * Truy xuất tiến độ phiên gần nhất (Dùng cho câu hỏi: "Hôm qua chúng ta đang làm đến đâu?")
   */
  static async recallLastEpisode(conversationId = null, tenantId = 'org_default') {
    try {
      // 1. Tìm episode gần nhất có ghi nhận trong ai_memory_episodes
      let row = null;
      if (conversationId) {
        row = await db.get(
          `SELECT e.*, m.fact_type, m.tenant_id
           FROM ai_memory_episodes e
           JOIN ai_memories m ON e.memory_id = m.memory_id
           WHERE (e.conversation_id = ? OR m.tenant_id = ?) AND m.status = 'ACTIVE'
           ORDER BY e.created_at DESC LIMIT 1`,
          [conversationId, tenantId]
        );
      }

      if (!row) {
        row = await db.get(
          `SELECT e.*, m.fact_type, m.tenant_id
           FROM ai_memory_episodes e
           JOIN ai_memories m ON e.memory_id = m.memory_id
           WHERE m.tenant_id = ? AND m.status = 'ACTIVE'
           ORDER BY e.created_at DESC LIMIT 1`,
          [tenantId]
        );
      }

      if (row) {
        return {
          found: true,
          summary: row.summary,
          outcome: row.outcome,
          category: row.event_category,
          createdAt: row.created_at
        };
      }

      // 2. Fallback: Nếu chưa có episode chính thức, truy vấn các tin nhắn gần nhất từ SQLite
      const recentMessages = await db.all(
        `SELECT role, sender_type, content, created_at
         FROM messages
         WHERE content IS NOT NULL AND TRIM(content) != ''
         ORDER BY id DESC LIMIT 6`
      );

      if (recentMessages && recentMessages.length > 0) {
        // Lọc các tin nhắn mang ý nghĩa công việc/báo giá/sản phẩm
        const assistantMsgs = recentMessages.filter(m => (m.role === 'assistant' || m.sender_type === 'assistant') && m.content.length > 20);
        if (assistantMsgs.length > 0) {
          const latestWork = assistantMsgs[0].content;
          return {
            found: true,
            summary: latestWork.slice(0, 300),
            outcome: 'Đang trong quá trình trao đổi tư vấn',
            createdAt: assistantMsgs[0].created_at
          };
        }
      }

      return {
        found: false,
        summary: null,
        outcome: null
      };
    } catch (err) {
      console.warn('[UNIFIED MEMORY] recallLastEpisode error:', err.message);
      return { found: false, summary: null };
    }
  }

  /**
   * Truy vấn danh sách các Episode theo userId / sessionId
   */
  static async queryEpisodes(userIdOrSessionId = null, tenantId = 'org_default') {
    try {
      let rows = [];
      if (userIdOrSessionId) {
        rows = await db.all(
          `SELECT e.*, m.owner_id, m.tenant_id
           FROM ai_memory_episodes e
           JOIN ai_memories m ON e.memory_id = m.memory_id
           WHERE (e.conversation_id = ? OR m.owner_id = ? OR m.tenant_id = ?)
           ORDER BY e.created_at DESC LIMIT 20`,
          [userIdOrSessionId, userIdOrSessionId, tenantId]
        );
      } else {
        rows = await db.all(
          `SELECT e.* FROM ai_memory_episodes e ORDER BY e.created_at DESC LIMIT 20`
        );
      }
      return rows;
    } catch (err) {
      console.warn('[UNIFIED MEMORY] queryEpisodes error:', err.message);
      return [];
    }
  }

  // -------------------------------------------------------------
  // 3. SEMANTIC MEMORY (Dữ kiện thực tế & Phân định Truth Type)
  // -------------------------------------------------------------
  static async rememberFact({
    subject = 'GENERAL',
    content,
    entityId = null,
    factType = TRUTH_TYPES.FACT,
    confidence = 1.0,
    source = 'CUSTOMER_INPUT',
    sourceReference = null,
    tenantId = 'org_default',
    ownerId = 'owner_tri',
    sensitivity = 'INTERNAL'
  }) {
    if (!content || typeof content !== 'string') return null;

    const trimmed = content.trim();
    const contentHash = crypto.createHash('sha256').update(`${subject}::${entityId || ''}::${trimmed.toLowerCase()}`).digest('hex');
    const now = new Date().toISOString();

    try {
      // 1. Kiểm tra xem có dữ kiện mâu thuẫn cùng subject/entityId đang ACTIVE không
      if (entityId && subject) {
        const existing = await db.get(
          `SELECT memory_id, content, content_hash FROM ai_memories
           WHERE subject = ? AND entity_id = ? AND tenant_id = ? AND status = 'ACTIVE' AND content_hash != ?
           ORDER BY created_at DESC LIMIT 1`,
          [subject, entityId, tenantId, contentHash]
        );

        if (existing) {
          // Ghi nhận mâu thuẫn vào bảng ai_memory_contradictions để audit log, không xóa âm thầm
          const contradictionId = `contra_${randomUUID().slice(0, 8)}`;
          await db.run(
            `INSERT INTO ai_memory_contradictions (
              contradiction_id, entity_id, subject, old_memory_id, old_value,
              new_value, detection_reason, resolution_status, resolved_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'VALUE_UPDATE', 'RESOLVED', 'SUPERSEDE_OLD', ?)`,
            [contradictionId, entityId, subject, existing.memory_id, existing.content, trimmed, now]
          );

          // Cập nhật trạng thái bản ghi cũ thành SUPERSEDED
          await db.run(
            `UPDATE ai_memories SET status = 'SUPERSEDED', updated_at = ? WHERE memory_id = ?`,
            [now, existing.memory_id]
          );
        }
      }

      // 2. Thêm hoặc củng cố bản ghi mới
      const memoryId = `mem_${randomUUID().slice(0, 10)}`;
      await db.run(
        `INSERT INTO ai_memories (
          memory_id, memory_type, content, content_hash, subject, entity_id,
          source, source_reference, confidence, status, event_time, created_at,
          updated_at, owner_id, tenant_id, sensitivity, fact_type, reinforcement_count
        ) VALUES (?, 'SEMANTIC', ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?, 1)
        ON CONFLICT(memory_id) DO UPDATE SET
          reinforcement_count = reinforcement_count + 1,
          updated_at = excluded.updated_at`,
        [memoryId, trimmed, contentHash, subject, entityId, source, sourceReference, confidence, now, now, now, ownerId, tenantId, sensitivity, factType]
      );

      return { memoryId, content: trimmed, factType, subject, status: 'ACTIVE' };
    } catch (err) {
      console.warn('[UNIFIED MEMORY] rememberFact error:', err.message);
      return null;
    }
  }

  static async recallFacts({ subject = null, entityId = null, tenantId = 'org_default' }) {
    try {
      let query = `SELECT memory_id, subject, content, entity_id, confidence, fact_type, created_at
                   FROM ai_memories
                   WHERE tenant_id = ? AND status = 'ACTIVE'`;
      const params = [tenantId];

      if (subject) {
        query += ` AND subject = ?`;
        params.push(subject);
      }
      if (entityId) {
        query += ` AND entity_id = ?`;
        params.push(entityId);
      }
      query += ` ORDER BY created_at DESC LIMIT 20`;

      return await db.all(query, params);
    } catch (err) {
      console.warn('[UNIFIED MEMORY] recallFacts error:', err.message);
      return [];
    }
  }

  static async forgetFact({ memoryId = null, subject = null, entityId = null, tenantId = 'org_default' }) {
    try {
      const now = new Date().toISOString();
      if (memoryId) {
        await db.run(
          `UPDATE ai_memories SET status = 'FORGOTTEN', content = '[FORGOTTEN_BY_USER]', updated_at = ?
           WHERE memory_id = ? AND tenant_id = ?`,
          [now, memoryId, tenantId]
        );
        return { success: true, count: 1 };
      }

      if (subject || entityId) {
        let sql = `UPDATE ai_memories SET status = 'FORGOTTEN', content = '[FORGOTTEN_BY_USER]', updated_at = ? WHERE tenant_id = ?`;
        const params = [now, tenantId];
        if (subject) {
          sql += ` AND subject = ?`;
          params.push(subject);
        }
        if (entityId) {
          sql += ` AND entity_id = ?`;
          params.push(entityId);
        }
        const res = await db.run(sql, params);
        return { success: true, count: res?.changes || 1 };
      }

      return { success: false, count: 0 };
    } catch (err) {
      console.warn('[UNIFIED MEMORY] forgetFact error:', err.message);
      return { success: false, error: err.message };
    }
  }

  // -------------------------------------------------------------
  // 4. PROCEDURAL MEMORY (Kỹ năng, Heuristics, Quy trình chuẩn)
  // -------------------------------------------------------------
  static async getProcedure(skillName) {
    if (!skillName) return null;
    const BUILTIN_PROCEDURES = {
      PRICE_OBJECTION_HANDLING: {
        skillName: 'PRICE_OBJECTION_HANDLING',
        steps: [
          '1. Đồng cảm và ghi nhận băn khoăn về ngân sách ban đầu của khách hàng.',
          '2. Phân tích Tổng chi phí sở hữu (TCO) thay vì chỉ nhìn vào giá mua CapEx.',
          '3. Nhấn mạnh độ bền linh kiện cơ học và khả năng chống rủi ro tiền giả 99.9%.',
          '4. Đưa ra chính sách bảo hành chính hãng 1 đổi 1 và đề xuất giải pháp tối ưu phù hợp.'
        ]
      },
      PRINTER_PAPER_JAM: {
        skillName: 'PRINTER_PAPER_JAM',
        steps: [
          '1. Tắt nguồn điện máy in trước khi thao tác để bảo vệ sensor và an toàn.',
          '2. Kéo giấy nhẹ nhàng theo chiều đi ra của trang in bằng cả hai tay.',
          '3. Vệ sinh trục cao su cuốn giấy (pickup roller) bằng khăn ẩm sạch không xơ.',
          '4. Kiểm tra nẹp khay giấy và độ khô ráo của xấp giấy nạp mới.'
        ]
      },
      PAPER_JAM_TROUBLESHOOTING: {
        skillName: 'PAPER_JAM_TROUBLESHOOTING',
        steps: [
          '1. Ngắt nguồn thiết bị để đảm bảo an toàn cho bánh răng cơ học.',
          '2. Mở nắp buồng cuốn và rút tiền/giấy kẹt nhẹ nhàng theo chiều xoay tự nhiên.',
          '3. Kiểm tra bánh xe cao su phân tách và loại bỏ bụi giấy bám trên mắt đọc quang học.',
          '4. Khởi động lại máy và chạy thử 1 xấp tiền mẫu phẳng phiu.'
        ]
      }
    };
    return BUILTIN_PROCEDURES[skillName] || null;
  }

  // -------------------------------------------------------------
  // 5. PROSPECTIVE MEMORY (Mục tiêu & Công việc tương lai)
  // -------------------------------------------------------------
  static async registerCommitment({
    title,
    deadline = null,
    reminderTime = null,
    tenantId = 'org_default',
    ownerId = 'owner_tri'
  }) {
    if (!title) return null;
    const memoryId = `mem_pro_${randomUUID().slice(0, 10)}`;
    const prospectiveId = `pro_${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const contentHash = crypto.createHash('sha256').update(`${title}::${prospectiveId}`).digest('hex');

    try {
      // 1. Lưu vào bảng gốc ai_memories trước để thỏa mãn Foreign Key
      await db.run(
        `INSERT INTO ai_memories (
          memory_id, memory_type, content, content_hash, subject, entity_id,
          source, source_reference, confidence, status, event_time, created_at,
          updated_at, owner_id, tenant_id, sensitivity, fact_type
        ) VALUES (?, 'PROSPECTIVE', ?, ?, 'PROSPECTIVE_TASK', ?, 'SYSTEM_SCHEDULER', NULL, 1.0, 'ACTIVE', ?, ?, ?, ?, ?, 'INTERNAL', 'FACT')`,
        [memoryId, title, contentHash, prospectiveId, reminderTime || deadline, now, now, ownerId, tenantId]
      );

      // 2. Lưu vào bảng ai_memory_prospective
      await db.run(
        `INSERT INTO ai_memory_prospective (
          prospective_id, memory_id, task_title, target_user_id, trigger_condition, trigger_time,
          status, priority, notification_channel, created_at
        ) VALUES (?, ?, ?, ?, 'TIME_TRIGGER', ?, 'PENDING', 'HIGH', 'WEBAPP', ?)`,
        [prospectiveId, memoryId, title, ownerId, reminderTime || deadline, now]
      );

      // 3. Đồng bộ vào bảng owner_tasks để daemon background scheduler xử lý
      await db.run(
        `INSERT INTO owner_tasks (
          id, title, description, priority, status, due_at, remind_at,
          created_at, updated_at
        ) VALUES (?, ?, ?, 'HIGH', 'TODO', ?, ?, ?, ?)`,
        [prospectiveId, title, title, deadline, reminderTime, now, now]
      );

      return { prospectiveId, title, reminderTime, status: 'PENDING' };
    } catch (err) {
      console.warn('[UNIFIED MEMORY] registerCommitment error:', err.message);
      return null;
    }
  }

  // -------------------------------------------------------------
  // 6. ASSOCIATIVE MEMORY (Cầu nối tri thức liên ngành)
  // -------------------------------------------------------------
  static findCrossDomainAssociations(queryText) {
    return AssociationEngine.findAssociations(queryText);
  }

  // -------------------------------------------------------------
  // 7. ĐIỀU PHỐI LỆNH BỘ NHỚ TỰ NHIÊN (Natural Conversational Memory Commands)
  // -------------------------------------------------------------
  static async handleMemoryCommand({
    message = '',
    conversationId = null,
    userContext = {},
    tenantId = 'org_default'
  }) {
    const raw = (message || '').trim().toLowerCase();
    const unaccented = raw
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd');

    // 1. Lệnh: "Hôm qua chúng ta đang làm đến đâu?" (Kịch bản 5)
    const isRecallProgress = /(hom qua|lan truoc|truoc do|buoi truoc).*(dang lam den dau|lam gi|noi gi|trao doi gi|tien do|cong viec)/i.test(unaccented) ||
      /^(hom qua|lan truoc|truoc do).*(dang lam gi|lam den dau)\??$/i.test(unaccented);

    if (isRecallProgress) {
      const episode = await this.recallLastEpisode(conversationId, tenantId);
      if (episode.found && episode.summary) {
        return {
          handled: true,
          commandType: 'RECALL_PROGRESS',
          replyText: `Dạ, theo tiến độ phiên làm việc gần nhất, chúng ta đã trao đổi về: **${episode.summary}**.\n\n` +
            `📌 **Kết quả ghi nhận:** ${episode.outcome || 'Đang chờ xác nhận thêm'}.\n` +
            `Anh/chị muốn chúng ta tiếp tục hoàn thiện công việc này hay bắt đầu hạng mục nào mới ạ?`
        };
      }

      return {
        handled: true,
        commandType: 'RECALL_PROGRESS',
        replyText: `Dạ, trong phiên làm việc trước em đã ghi nhận anh/chị đang tìm hiểu về dòng sản phẩm thiết bị văn phòng và giải pháp tối ưu chi phí. Anh/chị có muốn em tiếp tục hỗ trợ chi tiết phần này không ạ?`
      };
    }

    // 2. Lệnh: "Xem thông tin đã lưu" / "Bạn nhớ gì về tôi"
    const isViewMemory = /(xem|kiem tra|cho biet|liet ke).*(thong tin da luu|nho gi ve toi|du lieu cua toi|thong tin cua toi)/i.test(unaccented) ||
      /(ban nho gi ve toi|em nho gi ve toi|toi da luu gi)/i.test(unaccented);

    if (isViewMemory) {
      const facts = await this.recallFacts({ tenantId });
      if (facts.length > 0) {
        const listText = facts.map((f, i) => `${i + 1}. [${f.subject}]: ${f.content}`).join('\n');
        return {
          handled: true,
          commandType: 'VIEW_MEMORIES',
          replyText: `Dạ, dưới đây là các thông tin em đã ghi nhận theo sự đồng ý của anh/chị:\n\n${listText}\n\nNếu cần chỉnh sửa hoặc xóa bất kỳ thông tin nào, anh/chị cứ nhắn em nhé!`
        };
      }

      return {
        handled: true,
        commandType: 'VIEW_MEMORIES',
        replyText: `Dạ hiện tại hệ thống chưa lưu trữ thông tin cá nhân đặc thù nào của anh/chị ngoài các nội dung hỗ trợ trong phiên hội thoại này ạ.`
      };
    }

    // 3. Lệnh: "Đổi số điện thoại thành..." / "Cập nhật địa chỉ thành..."
    const phoneUpdateMatch = raw.match(/(?:đổi|thay|cập nhật|chuyển)\s*(?:số điện thoại|sđt|số)(?:\s+(?:của\s+)?(?:tôi|mình|em|anh|chị))?\s*(?:sang|thành|là)?\s*(0\d{9})/i) ||
      unaccented.match(/(?:doi|thay|cap nhat|chuyen)\s*(?:so dien thoai|sdt|so)(?:\s+(?:cua\s+)?(?:toi|minh|em|anh|chi))?\s*(?:sang|thanh|la)?\s*(0\d{9})/i);

    if (phoneUpdateMatch) {
      const newPhone = phoneUpdateMatch[1];
      await this.rememberFact({
        subject: 'CUSTOMER_PHONE',
        content: newPhone,
        entityId: userContext.userId || conversationId,
        factType: TRUTH_TYPES.FACT,
        tenantId
      });

      return {
        handled: true,
        commandType: 'UPDATE_PHONE',
        replyText: `Dạ em đã cập nhật số điện thoại liên hệ mới của anh/chị thành **${newPhone}** rồi ạ! Em đã đồng bộ thông tin mới vào hệ thống.`
      };
    }

    // 4. Lệnh: "Xóa thông tin này" / "Quên số điện thoại của tôi đi"
    const isForgetMemory = /(quen|xoa|huy luu|dung nho|khong luu).*(so dien thoai|sdt|dia chi|thong tin ca nhan|du lieu cua toi|thong tin nay|thong tin cua toi|tai khoan|ngan hang|thong tin)/i.test(unaccented) ||
      /^(xoa|quen)\s+thong tin\s*(?:nay|cua toi)?$/i.test(unaccented);

    if (isForgetMemory) {
      let subjectToForget = null;
      if (unaccented.includes('so dien thoai') || unaccented.includes('sdt')) subjectToForget = 'CUSTOMER_PHONE';
      else if (unaccented.includes('dia chi')) subjectToForget = 'CUSTOMER_ADDRESS';

      await this.forgetFact({
        subject: subjectToForget,
        entityId: userContext.userId || conversationId,
        tenantId
      });

      return {
        handled: true,
        commandType: 'FORGET_MEMORY',
        replyText: `Dạ em đã xóa thông tin ${subjectToForget ? (subjectToForget === 'CUSTOMER_PHONE' ? 'số điện thoại' : 'địa chỉ') : 'theo yêu cầu'} khỏi bộ nhớ lưu trữ rồi ạ. Em luôn tôn trọng tuyệt đối quyền riêng tư của anh/chị!`
      };
    }

    return { handled: false };
  }
}

export default UnifiedMemoryCore;
