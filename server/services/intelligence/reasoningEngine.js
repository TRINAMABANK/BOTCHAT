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
    if (primaryIntent === 'STAFF_HANDOFF') {
      plan.complexity = 'SIMPLE_DIRECT';
      plan.steps = ['COLLECT_PHONE_AND_CREATE_STAFF_LEAD'];
      plan.targetSources = ['leads', 'smartSalesConsultant'];
      plan.internalReasoningLog = 'Customer requested human staff assistance. Routing to staff handoff handler.';
      return plan;
    }

    if (primaryIntent === 'POLICY_INQUIRY') {
      plan.complexity = 'SIMPLE_DIRECT';
      plan.steps = ['FETCH_GROUNDED_STORE_POLICY'];
      plan.targetSources = ['products', 'learning_knowledge_entries', 'smartSalesConsultant'];
      plan.internalReasoningLog = 'Customer inquired about store warranty/shipping policy.';
      return plan;
    }

    if (primaryIntent === 'ORDER_REQUEST') {
      plan.complexity = 'SIMPLE_DIRECT';
      plan.steps = ['VALIDATE_ORDER_ITEM', 'CAPTURE_CUSTOMER_DETAILS'];
      plan.targetSources = ['products', 'leads', 'smartSalesConsultant'];
      plan.internalReasoningLog = 'Customer initiated order request.';
      return plan;
    }

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

    // 5B. Khách hỏi danh mục rộng (Broad Category Inquiry - Trí An Active Listening)
    if (primaryIntent === 'BROAD_CATEGORY_INQUIRY') {
      plan.dataSufficient = false;
      plan.complexity = 'NEEDS_CLARIFICATION';
      const catName = slots.categoryDomainName || 'sản phẩm';
      plan.clarificationQuestion = `Dạ bên em đang có sẵn các mẫu **${catName}** chính hãng rất đa dạng. Anh/chị đang có nhu cầu sử dụng cho mục đích nào hoặc dự trù ngân sách khoảng bao nhiêu tiền để em tư vấn mẫu sát nhất cho mình ạ?`;
      plan.internalReasoningLog = `Broad category inquiry detected for domain ${slots.categoryDomain}. Asking single targeted clarification question.`;
      return plan;
    }

    // 5C. Lịch hẹn & Hẹn gặp (Appointment Handler Plan)
    if (primaryIntent === 'APPOINTMENT') {
      plan.complexity = 'SIMPLE_DIRECT';
      plan.steps = ['CHECK_CALENDAR_CAPABILITY', 'REQUEST_APPOINTMENT_DETAILS', 'LOG_APPOINTMENT_CONTEXT'];
      plan.targetSources = ['appointmentHandler', 'calendar_integration'];
      plan.internalReasoningLog = 'Appointment scheduling requested. Solicit appointment parameters without hallucinating calendar availability.';
      return plan;
    }

    // 5D. Tra cứu lịch trống & lịch làm việc (Schedule Query Plan)
    if (primaryIntent === 'SCHEDULE_QUERY') {
      plan.complexity = 'SIMPLE_DIRECT';
      plan.steps = ['CHECK_SCHEDULE_AVAILABILITY', 'INFORM_CALENDAR_STATUS', 'OFFER_APPOINTMENT_RECORDING'];
      plan.targetSources = ['scheduleHandler', 'calendar_integration'];
      plan.internalReasoningLog = 'Schedule availability queried. Explicitly inform calendar sync status and request details.';
      return plan;
    }

    // 5E. Nhắc việc (Reminder Plan)
    if (primaryIntent === 'REMINDER') {
      plan.complexity = 'SIMPLE_DIRECT';
      plan.steps = ['PARSE_REMINDER_TIME_AND_TASK', 'CONFIRM_REMINDER_RECORDED'];
      plan.targetSources = ['reminderHandler'];
      plan.internalReasoningLog = 'Reminder requested by user.';
      return plan;
    }

    // 5F. Giao tiếp xã hội / Chào hỏi / Tâm sự (General Chat Plan)
    if (primaryIntent === 'GENERAL_CHAT' || primaryIntent === 'GREETING' || primaryIntent === 'IDENTITY_INQUIRY' || primaryIntent === 'GENERAL_CONVERSATION') {
      plan.complexity = 'SIMPLE_DIRECT';
      plan.steps = ['ENGAGE_FRIENDLY_CHAT'];
      plan.targetSources = ['generalChatHandler'];
      plan.internalReasoningLog = 'Social greeting / small talk. Keep catalog closed.';
      return plan;
    }

    // 5G. Thông tin doanh nghiệp / Khiếu nại (Business Support Plan)
    if (primaryIntent === 'COMPANY_INFO' || primaryIntent === 'COMPLAINT') {
      plan.complexity = 'SIMPLE_DIRECT';
      plan.steps = ['RESOLVE_BUSINESS_INQUIRY'];
      plan.targetSources = ['supportHandler'];
      plan.internalReasoningLog = 'Business info / complaint recorded.';
      return plan;
    }

    // 5H. Yêu cầu chưa rõ (Unknown Intent)
    if (primaryIntent === 'UNKNOWN') {
      plan.dataSufficient = false;
      plan.complexity = 'NEEDS_CLARIFICATION';
      plan.clarificationQuestion = 'Dạ em chưa rõ yêu cầu của bạn, bạn có thể nói rõ hơn bạn cần hỗ trợ về sản phẩm, đặt lịch hẹn hay thông tin nào không ạ?';
      plan.internalReasoningLog = 'Unknown query with insufficient information. Asking targeted clarification.';
      return plan;
    }

    // 6. Mặc định: Bán hàng và tư vấn sản phẩm
    plan.complexity = 'SIMPLE_DIRECT';
    plan.steps = ['CONSULT_SALES_ENGINE', 'SYNC_COLUMN_2_DIRECTIVES'];
    plan.targetSources = ['salesEngine', 'products', 'crawled_products'];
    plan.internalReasoningLog = 'Routed to sales engine core.';

    return plan;
  }

  /**
   * Anti-Confusion & Domain Disambiguation Check
   * Ensures that queries for one product domain (e.g. Panasonic KX-TSC11 desk phone)
   * are never mistakenly answered with a conflicting product (e.g. Panasonic refrigerator or home appliance).
   * 
   * @param {Object} params - { querySlots, candidateProduct }
   * @returns {Object} { isValidMatch, reason }
   */
  static disambiguateProductMatch({ querySlots = {}, candidateProduct = {} }) {
    if (!candidateProduct) return { isValidMatch: false, reason: 'NO_PRODUCT' };

    const { categoryDomain, modelCode, brand } = querySlots;
    const prodName = (candidateProduct.name || '').toLowerCase();
    const prodField = (candidateProduct.field || '').toLowerCase();
    const prodSpecs = JSON.stringify(candidateProduct.specs || candidateProduct.specs_json || '').toLowerCase();

    // 1. Model Code Discrepancy Check:
    // If the customer specifically asks for model "KX-TSC11" and candidate product does not contain "KX-TSC11"
    if (modelCode) {
      const normModel = modelCode.toLowerCase().replace(/[-_\s]/g, '');
      const prodNormName = prodName.replace(/[-_\s]/g, '');
      const prodNormSpecs = prodSpecs.replace(/[-_\s]/g, '');
      const hasModel = prodNormName.includes(normModel) || prodNormSpecs.includes(normModel);

      if (!hasModel) {
        return {
          isValidMatch: false,
          reason: `MODEL_CODE_MISMATCH: Customer asked for ${modelCode} but product is ${candidateProduct.name}`
        };
      }
    }

    // 2. Category Domain Conflict Check:
    // Telecom phone vs Home Appliance / Refrigerator / Laptop / Tea / Furniture
    if (categoryDomain === 'TELECOM') {
      const isTelecomCandidate = /dien thoai|tong dai|kx-ts|kx-tsc/i.test(prodName) || /dien thoai|viễn thông/i.test(prodField);
      if (!isTelecomCandidate) {
        return {
          isValidMatch: false,
          reason: `DOMAIN_CONFLICT: Customer asked for Telecom phone, but candidate is ${candidateProduct.field || candidateProduct.name}`
        };
      }
    }

    if (categoryDomain === 'REFRIGERATOR') {
      const isFridge = /tu lanh|tu dong|tu mat/i.test(prodName) || /tu lanh/i.test(prodField);
      if (!isFridge) {
        return {
          isValidMatch: false,
          reason: `DOMAIN_CONFLICT: Customer asked for Refrigerator, but candidate is ${candidateProduct.field || candidateProduct.name}`
        };
      }
    }

    if (categoryDomain === 'LAPTOP_PC') {
      const isPc = /laptop|may tinh|thinkpad|thinkcentre|macbook|pc|cpu|tablet/i.test(prodName) || /laptop|cpu|tablet|man hinh/i.test(prodField);
      if (!isPc) {
        return {
          isValidMatch: false,
          reason: `DOMAIN_CONFLICT: Customer asked for Computer/Laptop, but candidate is ${candidateProduct.field || candidateProduct.name}`
        };
      }
    }

    return { isValidMatch: true, reason: 'VERIFIED_DOMAIN_MATCH' };
  }
}

export default ReasoningEngine;
