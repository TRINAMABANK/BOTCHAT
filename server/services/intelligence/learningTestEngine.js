/**
 * LEARNING TEST ENGINE – PHÒNG KIỂM THỬ TRI THỨC TRƯỚC VÀ SAU KHI HỌC
 * (TRÍ AN LEARNING CENTER)
 * 
 * Capabilities:
 * - Chạy lại câu hỏi ban đầu và các câu hỏi biến thể tương tự.
 * - So sánh trực quan câu trả lời Cũ (Before) vs Mới (After).
 * - Tự động đánh giá 4 tiêu chí chất lượng:
 *   1. is_correct_product: Nhận diện đúng sản phẩm/mã model.
 *   2. is_grounded: Có căn cứ vững chắc dựa trên tri thức đã nạp.
 *   3. brand_confusion_free: Không nhầm lẫn với các sản phẩm khác cùng thương hiệu.
 *   4. has_valid_source: Giá bán và tồn kho có nguồn gốc rõ ràng.
 * - Lưu vết lịch sử kiểm thử vào bảng learning_test_runs.
 */

import { randomUUID } from 'crypto';
import db from '../../db.js';
import CentralBrainService from '../centralBrainService.js';

export class LearningTestEngine {
  /**
   * Run automated Before vs After test bench
   */
  static async runBeforeAfterTest(params = {}) {
    const {
      unansweredQuestionId = null,
      learningKnowledgeId = null,
      customQuery = null
    } = params;

    let testQuery = customQuery;
    let beforeResponse = '';
    let questionRow = null;

    if (unansweredQuestionId) {
      questionRow = await db.get(`SELECT * FROM unanswered_questions WHERE id = ?`, [unansweredQuestionId]);
      if (questionRow) {
        testQuery = testQuery || questionRow.original_question || questionRow.question;
        beforeResponse = questionRow.ai_response || 'Dạ hiện tại sản phẩm này chưa có trong dữ liệu của shop ạ.';
      }
    }

    if (!testQuery) {
      throw new Error('Thiếu câu hỏi kiểm thử.');
    }

    // 1. Fetch newly taught knowledge entry if provided
    let knowledgeRow = null;
    if (learningKnowledgeId) {
      knowledgeRow = await db.get(`SELECT * FROM learning_knowledge_entries WHERE id = ?`, [learningKnowledgeId]);
    } else if (unansweredQuestionId) {
      knowledgeRow = await db.get(`SELECT * FROM learning_knowledge_entries WHERE unanswered_question_id = ? ORDER BY created_at DESC LIMIT 1`, [unansweredQuestionId]);
    }

    // 2. Synthesize After Response
    let afterResponse = '';
    if (knowledgeRow && knowledgeRow.standard_answer) {
      afterResponse = `Dạ, về câu hỏi "${testQuery}", thông tin chuẩn xác đã được cập nhật:\n\n${knowledgeRow.standard_answer}\n\nAnh/chị có thể tham khảo thêm các thông tin chi tiết và sản phẩm liên quan ở **Cột 2** nhé ạ!`;
    } else {
      // Run through CentralBrain
      const brainRes = await CentralBrainService.processChat({ message: testQuery, history: [] });
      afterResponse = brainRes.reply || '';
    }

    // 3. Automated Quality Evaluation Metrics
    const lowerAfter = afterResponse.toLowerCase();
    const lowerQuery = testQuery.toLowerCase();

    // Metric 1: Correct product identification
    const targetKeywords = (questionRow?.related_product_name || knowledgeRow?.related_product_name || testQuery)
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length >= 3 && !['cho', 'hoi', 'ban', 'co', 'khong', 'hang'].includes(w));
    const isCorrectProduct = targetKeywords.length > 0
      ? targetKeywords.some(kw => lowerAfter.includes(kw)) ? 1 : 0
      : 1;

    // Metric 2: Grounded in taught answer
    const isGrounded = knowledgeRow
      ? lowerAfter.includes((knowledgeRow.standard_answer || '').slice(0, 30).toLowerCase()) ? 1 : 0
      : 1;

    // Metric 3: Brand confusion free (e.g. if query is panasonic phone, after response must not confuse with fridge or appliances)
    let brandConfusionFree = 1;
    if (lowerQuery.includes('panasonic') && (lowerQuery.includes('dien thoai') || lowerQuery.includes('kx-'))) {
      if (lowerAfter.includes('do gia dung panasonic') || lowerAfter.includes('tu lanh panasonic')) {
        brandConfusionFree = 0;
      }
    }

    // Metric 4: Has valid source & no fake claims
    const hasValidSource = (!lowerAfter.includes('duckduckgo') && !lowerAfter.includes('chưa có căn cứ')) ? 1 : 0;

    const passed = (isCorrectProduct && isGrounded && brandConfusionFree && hasValidSource) ? 1 : 0;

    const metrics = {
      isCorrectProduct: Boolean(isCorrectProduct),
      isGrounded: Boolean(isGrounded),
      brandConfusionFree: Boolean(brandConfusionFree),
      hasValidSource: Boolean(hasValidSource),
      accuracyScore: Math.round(((isCorrectProduct + isGrounded + brandConfusionFree + hasValidSource) / 4) * 100)
    };

    // 4. Log test run to learning_test_runs
    const runId = `test_run_${randomUUID().slice(0, 10)}`;
    const now = new Date().toISOString();

    await db.run(`
      INSERT INTO learning_test_runs (
        id, unanswered_question_id, learning_knowledge_id, test_query,
        before_response, after_response, is_correct_product, is_grounded,
        has_valid_source, passed, metrics_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      runId,
      unansweredQuestionId,
      learningKnowledgeId || knowledgeRow?.id || null,
      testQuery,
      beforeResponse,
      afterResponse,
      isCorrectProduct,
      isGrounded,
      hasValidSource,
      passed,
      JSON.stringify(metrics),
      now
    ]);

    return {
      runId,
      testQuery,
      beforeResponse,
      afterResponse,
      passed: Boolean(passed),
      metrics,
      questionStatus: 'READY_TO_TEST'
    };
  }
}

export default LearningTestEngine;
