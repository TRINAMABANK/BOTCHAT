/**
 * REASONING ENGINE – BỘ MÁY PHÂN TÍCH & SUY LUẬN (BOTCHAT BRAIN 2.1)
 * 
 * Capabilities:
 * - Định tuyến năng lực chuẩn (System Capabilities: AI_SALES, AI_SECRETARY, DOCUMENT_RAG, DATA_EXCEL, WEB_RESEARCH, GENERAL_CONVERSATION, MIXED_ORCHESTRATION, SECURITY_GUARD).
 * - Đánh giá độ phức tạp tác vụ (Simple, Clarification, Multi-step, Comparison).
 * - Kiểm tra tính đầy đủ của dữ liệu (Data Sufficiency Check).
 * - Kiểm tra phân quyền tác vụ trước khi lập kế hoạch (RBAC Capability Permission Gate).
 * - Kiểm tra và xác thực kết quả từng bước (validateStepResult).
 * - Cơ chế fallback an toàn: Tuyệt đối KHÔNG mặc định CONSULT_SALES_ENGINE cho các yêu cầu phi bán hàng.
 * - Bảo mật tuyệt đối: Ẩn 100% Chain-of-Thought (chuỗi suy nghĩ nội bộ) khỏi client UI.
 */

export const SYSTEM_CAPABILITIES = {
  AI_SALES: 'AI_SALES',
  AI_SECRETARY: 'AI_SECRETARY',
  DOCUMENT_RAG: 'DOCUMENT_RAG',
  DATA_EXCEL: 'DATA_EXCEL',
  WEB_RESEARCH: 'WEB_RESEARCH',
  KNOWLEDGE_BASE: 'KNOWLEDGE_BASE',
  GENERAL_CONVERSATION: 'GENERAL_CONVERSATION',
  MIXED_ORCHESTRATION: 'MIXED_ORCHESTRATION',
  SECURITY_GUARD: 'SECURITY_GUARD'
};

export class ReasoningEngine {
  /**
   * Evaluate task complexity, check permissions, and construct execution plan
   * 
   * @param {Object} intentResult - Result from IntentEngine
   * @param {Object} context - Execution context (history, active product, customer info, userContext)
   * @returns {Object} Execution plan with capability, steps, data sufficiency and clarification question
   */
  static planExecution(intentResult = {}, context = {}) {
    const { primaryIntent, domain, slots = {} } = intentResult;
    const { conversationHistory = [], selectedProduct = null, userContext = {} } = context;

    const plan = {
      capability: SYSTEM_CAPABILITIES.GENERAL_CONVERSATION,
      complexity: 'SIMPLE_DIRECT',
      dataSufficient: true,
      permissionGranted: true,
      clarificationQuestion: null,
      steps: [],
      targetSources: [],
      internalReasoningLog: '' // Server-side telemetry only
    };

    // -------------------------------------------------------------------------
    // 0. SECURITY & ACCESS VIOLATIONS (Highest Priority)
    // -------------------------------------------------------------------------
    if (primaryIntent?.startsWith('SECURITY_')) {
      plan.capability = SYSTEM_CAPABILITIES.SECURITY_GUARD;
      plan.complexity = 'SECURITY_BLOCKED';
      plan.permissionGranted = false;
      plan.steps = ['ENFORCE_SECURITY_BARRIER', 'LOG_AUDIT_VIOLATION'];
      plan.targetSources = ['securityBarrier', 'secretaryHandler'];
      plan.internalReasoningLog = `Security violation detected: ${primaryIntent}. Access blocked.`;
      return plan;
    }

    // -------------------------------------------------------------------------
    // 1. MULTI-INTENT COMPOSITE ORCHESTRATION (MIXED)
    // -------------------------------------------------------------------------
    if (primaryIntent === 'MIXED_SALES_SECRETARY' || domain === 'MIXED') {
      plan.capability = SYSTEM_CAPABILITIES.MIXED_ORCHESTRATION;
      plan.complexity = 'MULTI_STEP_TASK';
      plan.steps = [
        'EXECUTE_SALES_SUBTASK',
        'EXECUTE_SECRETARY_SUBTASK',
        'SYNTHESIZE_UNIFIED_RESPONSE'
      ];
      plan.targetSources = ['salesEngine', 'secretaryHandler'];
      plan.internalReasoningLog = 'Multi-intent request detected. Orchestrating composite sales and secretary capabilities.';
      return plan;
    }

    // -------------------------------------------------------------------------
    // 2. AI SECRETARY TASKS (Owner Specific & Office Administration)
    // -------------------------------------------------------------------------
    if (primaryIntent === 'SECRETARY_CRM_SUMMARY') {
      plan.capability = SYSTEM_CAPABILITIES.AI_SECRETARY;
      // Permission check: requires owner or manager
      if (!userContext.isOwner && userContext.role !== 'admin') {
        plan.capability = SYSTEM_CAPABILITIES.SECURITY_GUARD;
        plan.permissionGranted = false;
        plan.steps = ['ENFORCE_SECURITY_BARRIER'];
        plan.targetSources = ['secretaryHandler'];
        plan.internalReasoningLog = 'Unauthorized staff or customer requested CRM summary. Access denied.';
        return plan;
      }

      plan.complexity = 'MULTI_STEP_TASK';
      plan.steps = [
        'FETCH_PENDING_CRM_LEADS',
        'CALCULATE_CRM_METRICS',
        'GENERATE_EXECUTIVE_SUMMARY'
      ];
      plan.targetSources = ['secretaryHandler', 'leads', 'quotations'];
      plan.internalReasoningLog = 'Owner requested CRM executive summary.';
      return plan;
    }

    if (primaryIntent === 'SECRETARY_TASK' || primaryIntent === 'OWNER_DAILY_PLAN') {
      plan.capability = SYSTEM_CAPABILITIES.AI_SECRETARY;
      if (!userContext.isOwner && userContext.role !== 'admin') {
        plan.capability = SYSTEM_CAPABILITIES.SECURITY_GUARD;
        plan.permissionGranted = false;
        plan.steps = ['ENFORCE_SECURITY_BARRIER'];
        plan.targetSources = ['secretaryHandler'];
        plan.internalReasoningLog = 'Unauthorized user attempted to manage owner personal tasks. Access denied.';
        return plan;
      }

      plan.complexity = 'SIMPLE_DIRECT';
      plan.steps = ['PARSE_OWNER_TASK', 'RECORD_OWNER_TODO', 'CONFIRM_TASK_SCHEDULED'];
      plan.targetSources = ['secretaryHandler', 'owner_tasks'];
      plan.internalReasoningLog = 'Owner personal task management planned.';
      return plan;
    }

    if (primaryIntent === 'EMAIL_TASK') {
      plan.capability = SYSTEM_CAPABILITIES.AI_SECRETARY;
      plan.complexity = 'SIMPLE_DIRECT';
      plan.steps = [
        'EXTRACT_EMAIL_RECIPIENT_AND_PURPOSE',
        'COMPOSE_PROFESSIONAL_DRAFT',
        'PRESENT_FOR_APPROVAL'
      ];
      plan.targetSources = ['secretaryHandler'];
      plan.internalReasoningLog = 'Professional email drafting planned.';
      return plan;
    }

    if (primaryIntent === 'APPOINTMENT') {
      plan.capability = SYSTEM_CAPABILITIES.AI_SECRETARY;
      plan.complexity = 'SIMPLE_DIRECT';
      plan.steps = ['CHECK_CALENDAR_CAPABILITY', 'REQUEST_APPOINTMENT_DETAILS', 'LOG_APPOINTMENT_CONTEXT'];
      plan.targetSources = ['appointmentHandler', 'calendar_integration'];
      plan.internalReasoningLog = 'Appointment scheduling requested. Solicit appointment parameters without hallucinating calendar availability.';
      return plan;
    }

    if (primaryIntent === 'SCHEDULE_QUERY') {
      plan.capability = SYSTEM_CAPABILITIES.AI_SECRETARY;
      plan.complexity = 'SIMPLE_DIRECT';
      plan.steps = ['CHECK_SCHEDULE_AVAILABILITY', 'INFORM_CALENDAR_STATUS', 'OFFER_APPOINTMENT_RECORDING'];
      plan.targetSources = ['scheduleHandler', 'calendar_integration'];
      plan.internalReasoningLog = 'Schedule availability queried. Explicitly inform calendar sync status and request details.';
      return plan;
    }

    if (primaryIntent === 'REMINDER') {
      plan.capability = SYSTEM_CAPABILITIES.AI_SECRETARY;
      plan.complexity = 'SIMPLE_DIRECT';
      plan.steps = ['PARSE_REMINDER_TIME_AND_TASK', 'CONFIRM_REMINDER_RECORDED'];
      plan.targetSources = ['reminderHandler'];
      plan.internalReasoningLog = 'Reminder requested by user.';
      return plan;
    }

    // -------------------------------------------------------------------------
    // 3. DOCUMENT & DATA & RESEARCH CAPABILITIES
    // -------------------------------------------------------------------------
    if (primaryIntent === 'INTERNAL_DOCUMENT_RAG' || domain === 'DOCUMENT') {
      plan.capability = SYSTEM_CAPABILITIES.DOCUMENT_RAG;
      plan.complexity = 'MULTI_STEP_TASK';
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

    if (primaryIntent === 'EXCEL_CALCULATION' || domain === 'DATA') {
      plan.capability = SYSTEM_CAPABILITIES.DATA_EXCEL;
      plan.complexity = 'MULTI_STEP_TASK';
      plan.steps = [
        'PARSE_EXCEL_AGGREGATE_PARAMETERS',
        'EXECUTE_EXCEL_QUERY',
        'FORMAT_NUMERICAL_RESULT'
      ];
      plan.targetSources = ['query_excel_data', 'excelService'];
      plan.internalReasoningLog = 'Excel aggregate computation requested.';
      return plan;
    }

    if (primaryIntent === 'INTERNET_SEARCH' || primaryIntent === 'WEB_RESEARCH' || domain === 'RESEARCH') {
      plan.capability = SYSTEM_CAPABILITIES.WEB_RESEARCH;
      plan.complexity = 'MULTI_STEP_TASK';
      plan.steps = [
        'FORMULATE_WEB_SEARCH_QUERY',
        'EXECUTE_WEB_SEARCH',
        'VERIFY_FACTUAL_ACCURACY',
        'SYNTHESIZE_FINDINGS'
      ];
      plan.targetSources = ['search_web_internet', 'webService'];
      plan.internalReasoningLog = 'External web research planned.';
      return plan;
    }

    if (primaryIntent === 'KNOWLEDGE_QUERY' || domain === 'KNOWLEDGE') {
      plan.capability = SYSTEM_CAPABILITIES.KNOWLEDGE_BASE;
      plan.complexity = 'SIMPLE_DIRECT';
      plan.steps = ['RETRIEVE_GENERAL_KNOWLEDGE', 'FORMULATE_VERIFIED_ANSWER'];
      plan.targetSources = ['knowledge_base'];
      plan.internalReasoningLog = 'General knowledge inquiry planned.';
      return plan;
    }

    // -------------------------------------------------------------------------
    // 4. AI SALES CAPABILITIES
    // -------------------------------------------------------------------------
    if (primaryIntent === 'STAFF_HANDOFF') {
      plan.capability = SYSTEM_CAPABILITIES.AI_SALES;
      plan.complexity = 'SIMPLE_DIRECT';
      plan.steps = ['COLLECT_PHONE_AND_CREATE_STAFF_LEAD'];
      plan.targetSources = ['leads', 'smartSalesConsultant'];
      plan.internalReasoningLog = 'Customer requested human staff assistance. Routing to staff handoff handler.';
      return plan;
    }

    if (primaryIntent === 'POLICY_INQUIRY') {
      plan.capability = SYSTEM_CAPABILITIES.AI_SALES;
      plan.complexity = 'SIMPLE_DIRECT';
      plan.steps = ['FETCH_GROUNDED_STORE_POLICY'];
      plan.targetSources = ['products', 'learning_knowledge_entries', 'smartSalesConsultant'];
      plan.internalReasoningLog = 'Customer inquired about store warranty/shipping policy.';
      return plan;
    }

    if (primaryIntent === 'ORDER_REQUEST') {
      plan.capability = SYSTEM_CAPABILITIES.AI_SALES;
      plan.complexity = 'SIMPLE_DIRECT';
      plan.steps = ['VALIDATE_ORDER_ITEM', 'CAPTURE_CUSTOMER_DETAILS'];
      plan.targetSources = ['products', 'leads', 'smartSalesConsultant'];
      plan.internalReasoningLog = 'Customer initiated order request.';
      return plan;
    }

    if (primaryIntent === 'FORMAL_QUOTATION') {
      plan.capability = SYSTEM_CAPABILITIES.AI_SALES;
      const hasProductContext = slots.productName || selectedProduct || slots.targetOrdinal || slots.ordinal || context.activeProductContext;
      if (!hasProductContext) {
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
      plan.internalReasoningLog = `Formal quotation planned for product "${slots.productName || selectedProduct?.name || (slots.targetOrdinal ? `Sản phẩm thứ ${slots.targetOrdinal}` : 'Sản phẩm')}" (Quantity: ${slots.quantity}).`;
      return plan;
    }

    if (primaryIntent === 'PRODUCT_COMPARISON') {
      plan.capability = SYSTEM_CAPABILITIES.AI_SALES;
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

    if (primaryIntent === 'LIVE_WEBSITE_SEARCH') {
      plan.capability = SYSTEM_CAPABILITIES.AI_SALES;
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

    if (primaryIntent === 'BROAD_CATEGORY_INQUIRY') {
      plan.capability = SYSTEM_CAPABILITIES.AI_SALES;
      plan.dataSufficient = false;
      plan.complexity = 'NEEDS_CLARIFICATION';
      const catName = slots.categoryDomainName || 'sản phẩm';
      plan.clarificationQuestion = `Dạ bên em đang có sẵn các mẫu **${catName}** chính hãng rất đa dạng. Anh/chị đang có nhu cầu sử dụng cho mục đích nào hoặc dự trù ngân sách khoảng bao nhiêu tiền để em tư vấn mẫu sát nhất cho mình ạ?`;
      plan.internalReasoningLog = `Broad category inquiry detected for domain ${slots.categoryDomain}. Asking single targeted clarification question.`;
      return plan;
    }

    if (primaryIntent === 'UNCLEAR_NEEDS') {
      plan.dataSufficient = false;
      plan.complexity = 'NEEDS_CLARIFICATION';
      plan.clarificationQuestion = 'Dạ, bạn đang quan tâm đến dòng sản phẩm nào, cần đặt lịch hẹn hay cần hỗ trợ thông tin gì để em phục vụ chu đáo nhất ạ?';
      plan.internalReasoningLog = 'User request is ambiguous. Prompting for clarification.';
      return plan;
    }

    if (primaryIntent === 'SALES_CONSULTATION' || primaryIntent === 'PRICE_INQUIRY' || domain === 'SALES') {
      plan.capability = SYSTEM_CAPABILITIES.AI_SALES;
      plan.complexity = 'SIMPLE_DIRECT';
      plan.steps = ['CONSULT_SALES_ENGINE', 'SYNC_COLUMN_2_DIRECTIVES'];
      plan.targetSources = ['salesEngine', 'products', 'crawled_products'];
      plan.internalReasoningLog = 'Routed to sales engine core.';
      return plan;
    }

    // -------------------------------------------------------------------------
    // 5. GENERAL CONVERSATION & SOCIAL SUPPORT (Safe Fallback)
    // -------------------------------------------------------------------------
    plan.capability = SYSTEM_CAPABILITIES.GENERAL_CONVERSATION;
    plan.complexity = 'SIMPLE_DIRECT';
    plan.steps = ['ENGAGE_FRIENDLY_CHAT'];
    plan.targetSources = ['appointmentHandler', 'generalChatHandler'];
    plan.internalReasoningLog = 'Non-sales query. Safely falling back to conversational assistant without sales pressure.';

    return plan;
  }

  /**
   * Validate the execution result of an individual planning step
   * 
   * @param {string} stepName - Name of the executed step
   * @param {Object} stepResult - Result produced by the step handler
   * @returns {Object} { success, reason, fallbackAction }
   */
  static validateStepResult(stepName, stepResult) {
    if (!stepResult) {
      return { success: false, reason: `Step "${stepName}" returned empty output.`, fallbackAction: 'RETRY_WITH_SAFE_DEFAULT' };
    }

    switch (stepName) {
      case 'SEARCH_PRODUCT_CATALOG':
        if (!stepResult.items || stepResult.items.length === 0) {
          return {
            success: false,
            reason: 'NO_CATALOG_MATCH_FOUND',
            fallbackAction: 'OFFER_BROAD_RECOMMENDATION'
          };
        }
        return { success: true };

      case 'VALIDATE_ORDER_ITEM':
        if (!stepResult.validItem) {
          return {
            success: false,
            reason: 'ITEM_NOT_AVAILABLE',
            fallbackAction: 'PROMPT_FOR_ALTERNATIVE'
          };
        }
        return { success: true };

      case 'RECORD_OWNER_TODO':
        if (stepResult.success === false) {
          return {
            success: false,
            reason: 'TASK_PERSISTENCE_FAILED',
            fallbackAction: 'NOTIFY_RETRY'
          };
        }
        return { success: true };

      case 'FETCH_PENDING_CRM_LEADS':
        if (!Array.isArray(stepResult.leads)) {
          return {
            success: false,
            reason: 'LEADS_EXTRACTION_FAILED',
            fallbackAction: 'FALLBACK_TO_RAW_COUNT'
          };
        }
        return { success: true };

      default:
        return { success: true };
    }
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
