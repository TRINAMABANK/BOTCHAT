/**
 * REASONING ENGINE – BỘ MÁY PHÂN TÍCH & SUY LUẬN (TRÍ AI SMART INTELLIGENCE 2.0)
 * 
 * Capabilities:
 * - Đánh giá độ phức tạp tác vụ (Simple, Clarification, Multi-step, Comparison).
 * - Kiểm tra tính đầy đủ của dữ liệu (Data Sufficiency Check).
 * - Xác định chính xác khi nào cần hỏi lại khách hàng (chỉ hỏi đúng 1 câu trọng tâm nhất).
 * - Giải quyết xung đột dữ liệu giữa các nguồn.
 * - Bảo mật tuyệt đối: Ẩn 100% Chain-of-Thought (chuỗi suy nghĩ nội bộ) khỏi client UI.
 */

export class ReasoningEngine {
  /**
   * Evaluate task complexity and construct execution plan
   * 
   * @param {Object} intentResult - Result from IntentEngine
   * @param {Object} context - Execution context (history, active product, customer info)
   * @returns {Object} Execution plan with steps, data sufficiency and clarification question
   */
  static planExecution(intentResult, context = {}) {
    const { primaryIntent, slots } = intentResult;
    const { conversationHistory = [], selectedProduct = null } = context;

    const plan = {
      complexity: 'SIMPLE_DIRECT',
      dataSufficient: true,
      clarificationQuestion: null,
      steps: [],
      targetSources: [],
      internalReasoningLog: '' // Server-side telemetry only
    };

    // 1. Quản lý yêu cầu Báo giá (Quotation Flow)
    if (primaryIntent === 'FORMAL_QUOTATION') {
      if (!slots.productName && !selectedProduct) {
        plan.dataSufficient = false;
        plan.complexity = 'NEEDS_CLARIFICATION';
        plan.clarificationQuestion = 'Dạ, bạn muốn lập bảng báo giá cho sản phẩm hoặc dòng máy cụ thể nào ạ?';
        plan.internalReasoningLog = 'Quotation requested without product entity. Needs single clarification.';
        return plan;
      }

      plan.complexity = 'MULTI_STEP_TASK';
      plan.steps = [
        'SEARCH_PRODUCT_CATALOG',
        'VERIFY_PRICE_LEVEL',
        'CALCULATE_TOTAL_AND_VAT',
        'FORMAT_MARKDOWN_QUOTATION'
      ];
      plan.targetSources = ['crawled_products', 'products', 'quotationService'];
      plan.internalReasoningLog = `Formal quotation planned for product "${slots.productName || selectedProduct.name}" (Quantity: ${slots.quantity}).`;
      return plan;
    }

    // 2. So sánh sản phẩm (Comparison Flow)
    if (primaryIntent === 'PRODUCT_COMPARISON') {
      plan.complexity = 'COMPARISON_REQUIRED';
      plan.steps = [
        'FETCH_CANDIDATE_PRODUCTS',
        'EXTRACT_SPECS_MATRIX',
        'COMPARE_PRICE_AND_PERFORMANCE',
        'GENERATE_COMPARISON_SUMMARY'
      ];
      plan.targetSources = ['products', 'crawled_products'];
      plan.internalReasoningLog = `Product comparison planned for query "${slots.productName}".`;
      return plan;
    }

    // 3. Tra cứu Website nhà cung cấp trực tiếp (Live Website Retrieval)
    if (primaryIntent === 'LIVE_WEBSITE_SEARCH') {
      plan.complexity = 'MULTI_STEP_TASK';
      plan.steps = [
        'IDENTIFY_SUPPLIER_WEBSITE',
        'RETRIEVE_LIVE_PRODUCT_PAGE',
        'VERIFY_URL_LIVENESS',
        'EXTRACT_SPECS_AND_PRICE',
        'FORMAT_VERIFIED_URL_RESPONSE'
      ];
      plan.targetSources = ['supplier_websites', 'universalCrawler', 'productNormalizer'];
      plan.internalReasoningLog = `Live website retrieval requested for "${slots.productName}".`;
      return plan;
    }

    // 4. Tra cứu Tài liệu nội bộ (RAG)
    if (primaryIntent === 'INTERNAL_DOCUMENT_RAG') {
      plan.complexity = 'SIMPLE_DIRECT';
      plan.steps = [
        'SEARCH_DOCUMENT_CHUNKS',
        'SCORE_RELEVANCE',
        'EXTRACT_SOURCE_CITATION',
        'SYNTHESIZE_WITH_PROPER_CITATIONS'
      ];
      plan.targetSources = ['knowledge_chunks', 'ragService'];
      plan.internalReasoningLog = 'Internal document query isolated from commercial catalog.';
      return plan;
    }

    // 5. Yêu cầu chưa rõ nhu cầu (Unclear needs / Ambiguous)
    if (primaryIntent === 'UNCLEAR_NEEDS') {
      plan.dataSufficient = false;
      plan.complexity = 'NEEDS_CLARIFICATION';
      plan.clarificationQuestion = 'Dạ, bạn đang quan tâm đến dòng sản phẩm nào hoặc ngân sách khoảng bao nhiêu để tôi hỗ trợ tư vấn sát nhất nhé?';
      plan.internalReasoningLog = 'User request is ambiguous. Prompting for category or budget.';
      return plan;
    }

    // 6. Mặc định: Bán hàng và tư vấn sản phẩm
    plan.complexity = 'SIMPLE_DIRECT';
    plan.steps = ['CONSULT_SALES_ENGINE', 'SYNC_COLUMN_2_DIRECTIVES'];
    plan.targetSources = ['salesEngine', 'products', 'crawled_products'];
    plan.internalReasoningLog = 'Routed to sales engine core.';

    return plan;
  }
}

export default ReasoningEngine;
