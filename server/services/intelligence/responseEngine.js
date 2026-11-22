/**
 * RESPONSE ENGINE – BỘ MÁY TẠO PHẢN HỒI (TRÍ AI SMART INTELLIGENCE 2.0)
 * 
 * Capabilities:
 * - Tạo câu trả lời đúng trọng tâm, không lặp ý, không liệt kê hỗn loạn.
 * - Linh hoạt theo độ phức tạp: Câu hỏi đơn giản trả lời ngắn gọn, câu hỏi phức tạp phân tích theo phần.
 * - Khi thiếu dữ liệu: Hỏi đúng duy nhất 1 câu cốt lõi nhất.
 * - Đồng bộ hóa hoàn hảo với UI Cột 2 (Product Selector Card, Báo giá, Lead CRM).
 */

import { VerificationEngine } from './verificationEngine.js';

export class ResponseEngine {
  /**
   * Format a concise, structured response
   * 
   * @param {Object} params - Response components
   * @returns {Object} Structured final payload matching API contract
   */
  static formatResponse(params = {}) {
    const {
      replyText = '',
      revealCatalog = false,
      recommendedField = null,
      recommendedProduct = null,
      stage = 'IDLE',
      requiresInput = null,
      suggestedActions = [],
      orderInfo = null,
      leadCaptured = false,
      citations = [],
      toolsUsed = [],
      confidenceTag = null
    } = params;

    // 1. Sanitize text with VerificationEngine
    let cleanedReply = VerificationEngine.sanitizeAndVerifyResponse(replyText);

    // 2. Append confidence and time badge if live web was extracted
    if (confidenceTag && !cleanedReply.includes('Lưu ý về nguồn giá')) {
      if (confidenceTag === 'LIVE_WEBSITE_EXTRACTED') {
        cleanedReply += `\n\n*(Thông tin và giá được đối chiếu trực tiếp từ website nhà cung cấp tại thời điểm kiểm tra).*`;
      }
    }

    return {
      success: true,
      reply: cleanedReply,
      revealCatalog: Boolean(revealCatalog),
      recommendedField,
      recommendedProduct,
      stage,
      actionType: params.actionType || null,
      isResetPrompt: Boolean(params.isResetPrompt),
      requiresInput,
      suggestedActions,
      orderInfo,
      leadCaptured: Boolean(leadCaptured),
      citations,
      toolsUsed
    };
  }

  /**
   * Helper for single-question clarification when crucial data is missing
   */
  static formatClarification(questionText = '', suggestedActions = []) {
    return {
      success: true,
      reply: questionText,
      revealCatalog: false,
      recommendedField: null,
      recommendedProduct: null,
      stage: 'CLARIFYING',
      requiresInput: 'TEXT_PROMPT',
      suggestedActions,
      citations: [],
      toolsUsed: ['reasoning_engine']
    };
  }
}

export default ResponseEngine;
