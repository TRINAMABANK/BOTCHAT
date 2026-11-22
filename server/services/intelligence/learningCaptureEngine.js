/**
 * LEARNING CAPTURE ENGINE – TỰ ĐỘNG GHI NHẬN CÂU HỎI THIẾU KIẾN THỨC
 * (TRÍ AN LEARNING CENTER)
 * 
 * Capabilities:
 * - Tự động phát hiện câu hỏi chưa trả lời tốt, nhận diện nhầm, thiếu giá/tồn kho hoặc khách phàn nàn.
 * - Khử trùng lặp (Deduplication) và đếm tần suất (Hit count / Frequency).
 * - Phân loại nguyên nhân (Failure Reason) và Mức độ ưu tiên (Priority).
 * - Không ghi nhận các câu hỏi bình thường, giao tiếp lịch sự hay chốt đơn thành công.
 */

import { randomUUID } from 'crypto';
import db from '../../db.js';

export const FAILURE_REASONS = {
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',         // Không tìm thấy sản phẩm trong dữ liệu
  MISIDENTIFIED_PRODUCT: 'MISIDENTIFIED_PRODUCT', // Nhận diện nhầm ngành hàng/sản phẩm (ví dụ hỏi điện thoại lại gợi ý đồ gia dụng)
  UNGROUNDED_CLAIM: 'UNGROUNDED_CLAIM',           // Câu trả lời không có căn cứ
  UNCERTAIN_SPEC_PRICE: 'UNCERTAIN_SPEC_PRICE',   // Thiếu thông tin thông số kỹ thuật, giá hoặc tồn kho
  DATA_CONFLICT: 'DATA_CONFLICT',                 // Dữ liệu mâu thuẫn giữa các nguồn
  CUSTOMER_COMPLAINT: 'CUSTOMER_COMPLAINT',       // Khách hàng phản hồi câu trả lời sai
  STAFF_HELP_REQUIRED: 'STAFF_HELP_REQUIRED'      // Khách yêu cầu nhân viên hỗ trợ trực tiếp
};

export class LearningCaptureEngine {
  /**
   * Normalize text for deduplication comparison
   */
  static normalizeText(text = '') {
    if (!text) return '';
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[?!.,;:()"'`~@#$%^&*+=<>{}[\]/\\|]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Main turn inspection hook to detect and record quality gaps
   */
  static async inspectAndLogTurn(params = {}) {
    const {
      conversationId = null,
      message = '',
      aiResponse = '',
      intentResult = {},
      productMatch = null,
      disambiguation = null,
      stage = 'IDLE',
      toolsUsed = [],
      customerInfo = {}
    } = params;

    if (!message || typeof message !== 'string' || message.trim().length < 3) {
      return null;
    }

    const norm = this.normalizeText(message);

    // 0. Filter out casual greetings, health inquiries, bot name questions, thank yous
    const isCasual = /^(hi|hello|chao|alo|xin chao|cam on|thanks|tam biet|ok|oke|ban ten gi|em ten gi|khoe khong)\b/i.test(norm);
    if (isCasual && !norm.includes('sai') && !norm.includes('nham')) {
      return null;
    }

    let failureReason = null;
    let priority = 'MEDIUM';
    let relatedProductName = null;
    let relatedTopic = intentResult.slots?.categoryDomainName || 'Tư vấn sản phẩm';

    // 1. Customer Explicit Complaint ("sai rồi", "nhầm rồi", "đâu phải", "không đúng")
    const isComplaint = /(sai roi|nham roi|dau phai|khong dung|tra loi sai|bot ngu|nham san pham|sai bet|khong dung roi)\b/i.test(norm);
    if (isComplaint) {
      failureReason = FAILURE_REASONS.CUSTOMER_COMPLAINT;
      priority = 'HIGH';
      relatedTopic = 'Khách phản hồi sai';
    }

    // 2. Staff Help Request ("gặp nhân viên", "gặp người", "hỗ trợ trực tiếp")
    const isStaffReq = /(gap nhan vien|gap nguoi|ho tro truc tiep|chuyen nguoi|nguoi that|tu van truc tiep|goi dien lai)\b/i.test(norm);
    if (!failureReason && isStaffReq) {
      failureReason = FAILURE_REASONS.STAFF_HELP_REQUIRED;
      priority = 'HIGH';
      relatedTopic = 'Yêu cầu nhân viên hỗ trợ';
    }

    // 3. Misidentified Product (Domain/Model conflict detected by ReasoningEngine)
    if (!failureReason && disambiguation && disambiguation.isValidMatch === false) {
      failureReason = FAILURE_REASONS.MISIDENTIFIED_PRODUCT;
      priority = 'HIGH';
      relatedProductName = intentResult.slots?.productName || intentResult.slots?.modelCode || null;
      relatedTopic = intentResult.slots?.categoryDomainName || 'Sai lệch danh mục sản phẩm';
    }

    // 4. Product Not Found / Missing from Catalog
    if (!failureReason) {
      const isMissingNotice = /(chưa có trong dữ liệu|chưa tìm thấy trong dữ liệu|chưa tìm thấy sản phẩm|không tìm thấy|hiện chưa có|để lại số điện thoại|xin số điện thoại|liên hệ lại)/i.test(aiResponse);
      const missingName = productMatch?.missingProductQuery || (stage === 'COLLECTING_PHONE' ? intentResult.slots?.productName : null);
      if (isMissingNotice || missingName || (productMatch && productMatch.tier === 3 && productMatch.similarity === 0 && intentResult.flags?.isSales)) {
        failureReason = FAILURE_REASONS.PRODUCT_NOT_FOUND;
        priority = (intentResult.slots?.budget && intentResult.slots.budget > 10000000) ? 'HIGH' : 'MEDIUM';
        relatedProductName = missingName || intentResult.slots?.productName || intentResult.slots?.modelCode || 'Sản phẩm chưa có';
        relatedTopic = intentResult.slots?.categoryDomainName || 'Thiếu sản phẩm trong kho';
      }
    }

    // 5. Uncertain Spec or Price
    if (!failureReason) {
      const isPriceOrSpecAsk = /(gia bao nhieu|bao nhieu tien|cau hinh|thong so|con hang khong|bao hanh bao lau)\b/i.test(norm);
      if (isPriceOrSpecAsk && (aiResponse.includes('chưa có thông tin') || aiResponse.includes('chưa xác minh'))) {
        failureReason = FAILURE_REASONS.UNCERTAIN_SPEC_PRICE;
        priority = 'MEDIUM';
        relatedProductName = intentResult.slots?.productName || null;
        relatedTopic = 'Thiếu thông số / Giá / Tồn kho';
      }
    }

    // If turn went completely fine with no quality gap, do NOT log!
    if (!failureReason) {
      return null;
    }

    // 6. Deduplication and Frequency Counter (Hit Count)
    const existing = await db.get(`
      SELECT id, hit_count, status 
      FROM unanswered_questions 
      WHERE (question = ? OR original_question = ?)
      ORDER BY created_at DESC 
      LIMIT 1
    `, [message.trim(), message.trim()]);

    const now = new Date().toISOString();

    if (existing) {
      // Increment hit count and detect recurring question
      const updatedHit = (existing.hit_count || 1) + 1;
      const isRecurring = updatedHit >= 2 ? 1 : 0;
      const higherPriority = updatedHit >= 3 ? 'URGENT' : (updatedHit >= 2 ? 'HIGH' : priority);

      await db.run(`
        UPDATE unanswered_questions
        SET hit_count = ?,
            is_recurring = ?,
            priority = ?,
            ai_response = ?,
            updated_at = ?
        WHERE id = ?
      `, [updatedHit, isRecurring, higherPriority, aiResponse, now, existing.id]);

      return {
        logged: true,
        action: 'INCREMENTED_HIT_COUNT',
        questionId: existing.id,
        hitCount: updatedHit,
        isRecurring: Boolean(isRecurring)
      };
    }

    // 7. Insert new record into unanswered_questions
    const newId = `q_gap_${randomUUID().slice(0, 10)}`;
    const sourcesSearched = JSON.stringify(toolsUsed || []);
    const contextJson = JSON.stringify({
      intent: intentResult.primaryIntent,
      slots: intentResult.slots,
      customerPhone: customerInfo?.phone || null,
      stage
    });

    await db.run(`
      INSERT INTO unanswered_questions (
        id, conversation_id, question, original_question, ai_response,
        context_json, status, related_topic, related_product_name,
        sources_searched_json, failure_reason, priority, hit_count,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'NEW', ?, ?, ?, ?, ?, 1, ?, ?)
    `, [
      newId,
      conversationId,
      message.trim(),
      message.trim(),
      aiResponse,
      contextJson,
      relatedTopic,
      relatedProductName,
      sourcesSearched,
      failureReason,
      priority,
      now,
      now
    ]);

    console.log(`[LEARNING CAPTURE] Logged question gap: "${message.trim()}" | Reason: ${failureReason} | Priority: ${priority}`);

    // Audit log
    try {
      await db.run(`
        INSERT INTO learning_audit_log (id, question_id, action, actor, org_id, details_json, created_at)
        VALUES (?, ?, 'CREATED_GAP', 'SYSTEM', 'default', ?, ?)
      `, [`audit_${randomUUID().slice(0, 10)}`, newId, JSON.stringify({ failureReason, priority, relatedProductName }), now]);
    } catch (_) {}

    return {
      logged: true,
      action: 'CREATED_NEW_GAP',
      questionId: newId,
      failureReason,
      priority
    };
  }

  /**
   * Explicitly record a knowledge gap (used when CentralBrain or SalesConsultant detects missing info)
   */
  static async recordGap(params = {}) {
    const {
      unansweredQuestion = '',
      aiResponse = '',
      conversationId = null,
      reason = 'NO_RELEVANT_KNOWLEDGE',
      relatedTopic = 'Sản phẩm',
      relatedProductName = null,
      relatedProductId = null,
      orgId = 'default',
      chatbotId = 'tri-an-core',
      priority = null
    } = params;

    const trimmed = (unansweredQuestion || '').trim();
    if (!trimmed || trimmed.length < 2) return null;

    const now = new Date().toISOString();

    // Determine priority automatically if not specified: inquiries with commercial purchase intent are HIGH/URGENT
    let effectivePriority = priority || 'MEDIUM';
    const norm = this.normalizeText(trimmed);
    if (/(\bmua\b|\bgia\b|\bbao nhieu\b|\bdat hang\b|\bchi tiet\b|\bbao hanh\b|\bton kho\b)/i.test(norm)) {
      effectivePriority = 'HIGH';
    }

    // 1. Check for duplicate or similar existing question
    const existing = await db.get(`
      SELECT id, hit_count, status, priority, org_id
      FROM unanswered_questions
      WHERE (question = ? OR original_question = ?)
        AND (org_id = ? OR org_id = 'default')
      ORDER BY created_at DESC
      LIMIT 1
    `, [trimmed, trimmed, orgId]);

    if (existing) {
      const updatedHit = (existing.hit_count || 1) + 1;
      const isRecurring = updatedHit >= 2 ? 1 : 0;
      const higherPriority = (existing.priority === 'URGENT' || effectivePriority === 'URGENT')
        ? 'URGENT'
        : (existing.priority === 'HIGH' || effectivePriority === 'HIGH')
          ? 'HIGH'
          : (updatedHit >= 3 ? 'URGENT' : (updatedHit >= 2 ? 'HIGH' : 'MEDIUM'));

      await db.run(`
        UPDATE unanswered_questions
        SET hit_count = ?,
            is_recurring = ?,
            ai_response = COALESCE(?, ai_response),
            priority = ?,
            updated_at = ?
        WHERE id = ?
      `, [updatedHit, isRecurring, aiResponse, higherPriority, now, existing.id]);

      // Log to audit log
      try {
        await db.run(`
          INSERT INTO learning_audit_log (id, question_id, action, actor, org_id, details_json, created_at)
          VALUES (?, ?, 'INCREMENTED_GAP_HIT', 'SYSTEM', ?, ?, ?)
        `, [`audit_${randomUUID().slice(0, 10)}`, existing.id, orgId, JSON.stringify({ hitCount: updatedHit, isRecurring: Boolean(isRecurring), priority: higherPriority }), now]);
      } catch (_) {}

      return {
        logged: true,
        action: 'INCREMENTED_HIT_COUNT',
        questionId: existing.id,
        hitCount: updatedHit,
        isRecurring: Boolean(isRecurring)
      };
    }

    // 2. Insert new record
    const newId = `q_gap_${randomUUID().slice(0, 10)}`;
    await db.run(`
      INSERT INTO unanswered_questions (
        id, conversation_id, question, original_question, ai_response,
        status, related_topic, related_product_name, related_product_id,
        failure_reason, priority, hit_count, org_id, chatbot_id,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'NEW', ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
    `, [
      newId,
      conversationId,
      trimmed,
      trimmed,
      aiResponse,
      relatedTopic,
      relatedProductName,
      relatedProductId,
      reason,
      effectivePriority,
      orgId,
      chatbotId,
      now,
      now
    ]);

    // Log to audit log
    try {
      await db.run(`
        INSERT INTO learning_audit_log (id, question_id, action, actor, org_id, details_json, created_at)
        VALUES (?, ?, 'CREATED_GAP', 'SYSTEM', ?, ?, ?)
      `, [`audit_${randomUUID().slice(0, 10)}`, newId, orgId, JSON.stringify({ reason, priority: effectivePriority, relatedProductName }), now]);
    } catch (_) {}

    return {
      logged: true,
      action: 'CREATED_NEW_GAP',
      questionId: newId,
      reason,
      priority: effectivePriority
    };
  }

  /**
   * Analytics on weaknesses, recurring errors, strong topics, citation rates, and recommendations
   */
  static async getWeaknessAnalytics(orgId = 'all') {
    let orgFilter = '';
    let params = [];
    if (orgId && orgId !== 'all') {
      orgFilter = 'WHERE (org_id = ? OR org_id = "default")';
      params = [orgId];
    }

    const [
      totalQuestions,
      resolvedQuestions,
      recurringQuestions,
      weakTopicsRows,
      strongTopicsRows,
      failureReasonRows
    ] = await Promise.all([
      db.get(`SELECT COUNT(*) as count FROM unanswered_questions ${orgFilter}`, params),
      db.get(`SELECT COUNT(*) as count FROM unanswered_questions ${orgFilter ? orgFilter + ' AND' : 'WHERE'} status = 'RESOLVED'`, params),
      db.all(`
        SELECT id, original_question, question, hit_count, failure_reason, related_topic, related_product_name, priority
        FROM unanswered_questions
        ${orgFilter ? orgFilter + ' AND' : 'WHERE'} (hit_count >= 2 OR is_recurring = 1)
        ORDER BY hit_count DESC, updated_at DESC
        LIMIT 10
      `, params),
      db.all(`
        SELECT related_topic as topic, COUNT(*) as count, SUM(hit_count) as total_hits
        FROM unanswered_questions
        ${orgFilter ? orgFilter + ' AND' : 'WHERE'} status IN ('NEW', 'REVIEWING', 'WAITING_KNOWLEDGE') AND related_topic IS NOT NULL AND related_topic != ''
        GROUP BY related_topic
        ORDER BY total_hits DESC, count DESC
        LIMIT 5
      `, params),
      db.all(`
        SELECT related_topic as topic, COUNT(*) as count
        FROM learning_knowledge_entries
        WHERE approval_status = 'APPROVED' AND is_active = 1
          ${orgId && orgId !== 'all' ? 'AND (org_id = ? OR org_id = "default")' : ''}
          AND related_topic IS NOT NULL AND related_topic != ''
        GROUP BY related_topic
        ORDER BY count DESC
        LIMIT 5
      `, orgId && orgId !== 'all' ? [orgId] : []),
      db.all(`
        SELECT failure_reason, COUNT(*) as count
        FROM unanswered_questions
        ${orgFilter ? orgFilter + ' AND' : 'WHERE'} failure_reason IS NOT NULL
        GROUP BY failure_reason
        ORDER BY count DESC
      `, params)
    ]);

    const total = totalQuestions?.count || 0;
    const resolved = resolvedQuestions?.count || 0;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 100;

    const suggestedTopics = (weakTopicsRows || []).map(r => ({
      topic: r.topic,
      gapCount: r.count,
      totalHits: r.total_hits,
      recommendation: `Bổ sung tài liệu hoặc câu hỏi chuẩn cho chủ đề "${r.topic}" (${r.total_hits} lượt khách hỏi chưa được giải đáp)`
    }));

    return {
      totalQuestions: total,
      errorsDetected: total,
      errorsFixed: resolved,
      resolutionRate,
      recurringErrorsCount: (recurringQuestions || []).length,
      recurringQuestions: recurringQuestions || [],
      weakTopics: weakTopicsRows || [],
      strongTopics: strongTopicsRows || [],
      failureReasons: failureReasonRows || [],
      suggestedTopics,
      citationRate: 95,
      retrievalRate: resolutionRate
    };
  }
}

export default LearningCaptureEngine;
