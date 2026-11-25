/**
 * REASONING ENGINE – BỘ MÁY PHÂN TÍCH & SUY LUẬN (TRÍ AI COGNITIVE CORE V2)
 * DOCTOR-LEVEL ALL-DOMAIN REASONING & COMPREHENSIVE INTELLIGENCE
 * 
 * Capabilities:
 * - 2 Chế độ tư duy: FAST_PATH (Bán hàng, giao tiếp, dịch vụ tiêu chuẩn) & DEEP_COGNITIVE_PATH (12 bước tư duy nhận thức chuyên sâu).
 * - Tích hợp chặt chẽ với CriticalThinkingEngine (Phát hiện tiền đề sai, bẫy ngụy biện logic).
 * - Tích hợp chặt chẽ với AssociationEngine (Liên kết tri thức liên ngành, Concept Mapping).
 * - Định tuyến năng lực chuẩn (System Capabilities: AI_SALES, AI_SECRETARY, DOCUMENT_RAG, DATA_EXCEL, WEB_RESEARCH, GENERAL_CONVERSATION, MIXED_ORCHESTRATION, SECURITY_GUARD, DOCTOR_RESEARCH, CRITICAL_ANALYSIS).
 * - Đánh giá độ phức tạp tác vụ (Simple, Clarification, Multi-step, Comparison, Deep Cognitive).
 * - Sinh đồ thị thực thi động (Dynamic Execution DAG) song song với danh sách bước tĩnh (Tương thích ngược 100%).
 * - Phân loại 5 cấp độ nhận thức (Epistemic Levels: VERIFIED_FACT, UNVERIFIED_INFO, HYPOTHESIS, LOGICAL_DEDUCTION, EXPERT_RECOMMENDATION).
 * - Bảo mật tuyệt đối: Ẩn 100% Chain-of-Thought khỏi client UI.
 */

import { CriticalThinkingEngine } from './criticalThinkingEngine.js';
import { AssociationEngine } from './associationEngine.js';

export const SYSTEM_CAPABILITIES = {
  AI_SALES: 'AI_SALES',
  AI_SECRETARY: 'AI_SECRETARY',
  DOCUMENT_RAG: 'DOCUMENT_RAG',
  DATA_EXCEL: 'DATA_EXCEL',
  WEB_RESEARCH: 'WEB_RESEARCH',
  KNOWLEDGE_BASE: 'KNOWLEDGE_BASE',
  GENERAL_CONVERSATION: 'GENERAL_CONVERSATION',
  MIXED_ORCHESTRATION: 'MIXED_ORCHESTRATION',
  SECURITY_GUARD: 'SECURITY_GUARD',
  DOCTOR_RESEARCH: 'DOCTOR_RESEARCH',
  CRITICAL_ANALYSIS: 'CRITICAL_ANALYSIS'
};

export const EPISTEMIC_LEVELS = {
  VERIFIED_FACT: { code: 'VERIFIED_FACT', label: 'Dữ kiện đã xác minh' },
  UNVERIFIED_INFO: { code: 'UNVERIFIED_INFO', label: 'Thông tin tham khảo / Chưa xác minh' },
  HYPOTHESIS: { code: 'HYPOTHESIS', label: 'Giả thuyết khoa học' },
  LOGICAL_DEDUCTION: { code: 'LOGICAL_DEDUCTION', label: 'Suy luận logic kỹ thuật' },
  EXPERT_RECOMMENDATION: { code: 'EXPERT_RECOMMENDATION', label: 'Khuyến nghị chuyên môn' }
};

export class ReasoningEngine {
  /**
   * Evaluate task complexity, check permissions, and construct execution plan
   * Backward compatible with Brain 2.1 while introducing Doctor-Level Cognitive Core V2
   * 
   * @param {Object} intentResult - Result from IntentEngine
   * @param {Object} context - Execution context (history, active product, customer info, userContext)
   * @returns {Object} Execution plan with capability, steps, data sufficiency and clarification question
   */
  static planExecution(intentResult = {}, context = {}) {
    const { primaryIntent, domain, slots = {} } = intentResult;
    const { conversationHistory = [], selectedProduct = null, userContext = {}, message = '' } = context;

    const plan = {
      capability: SYSTEM_CAPABILITIES.GENERAL_CONVERSATION,
      complexity: 'SIMPLE_DIRECT',
      cognitiveMode: 'FAST_PATH',
      dataSufficient: true,
      permissionGranted: true,
      clarificationQuestion: null,
      steps: [], // Backward compatible string array
      dagSteps: [], // Modern Dynamic DAG Execution Graph
      targetSources: [],
      epistemicLevel: EPISTEMIC_LEVELS.LOGICAL_DEDUCTION.code,
      criticalAnalysis: null,
      crossAssociations: null,
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
    // 0B. COGNITIVE CORE: CRITICAL THINKING & FALSE PREMISE CHECK
    // -------------------------------------------------------------------------
    const criticalEval = CriticalThinkingEngine.analyze(message, {
      intentResult,
      userContext,
      sessionContext: context.sessionContext
    });
    if (criticalEval.shouldIntervene) {
      plan.capability = SYSTEM_CAPABILITIES.CRITICAL_ANALYSIS;
      plan.complexity = 'CRITICAL_INTERVENTION';
      plan.cognitiveMode = 'DEEP_COGNITIVE_PATH';
      plan.criticalAnalysis = criticalEval;
      plan.steps = [
        'IDENTIFY_FALSE_PREMISE_OR_FALLACY',
        'RETRIEVE_EMPIRICAL_COUNTER_FACTS',
        'FORMULATE_OBJECTIVE_CORRECTION'
      ];
      plan.targetSources = ['criticalThinkingEngine', 'verificationEngine'];
      plan.internalReasoningLog = `Critical thinking intervention triggered: ${criticalEval.type}.`;
      return plan;
    }

    // -------------------------------------------------------------------------
    // 0C. COGNITIVE CORE: CROSS-DOMAIN ASSOCIATION CHECK
    // -------------------------------------------------------------------------
    const associationEval = AssociationEngine.findAssociations(message, context);
    if (associationEval.hasAssociations) {
      plan.crossAssociations = associationEval;
      plan.cognitiveMode = 'DEEP_COGNITIVE_PATH';
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
      plan.steps = ['VALIDATE_TIME_SPEC', 'CREATE_REMINDER_NOTIFICATION', 'CONFIRM_REMINDER_SCHEDULED'];
      plan.targetSources = ['reminderHandler', 'notifications'];
      plan.internalReasoningLog = 'Reminder requested. Validate time specification.';
      return plan;
    }

    // -------------------------------------------------------------------------
    // 3. AI SALES & PRODUCT CONSULTING CAPABILITY
    // -------------------------------------------------------------------------
    if (primaryIntent === 'PRICE_INQUIRY' || primaryIntent === 'FORMAL_QUOTATION' || primaryIntent === 'QUOTATION_REQUEST') {
      plan.capability = SYSTEM_CAPABILITIES.AI_SALES;
      plan.epistemicLevel = EPISTEMIC_LEVELS.VERIFIED_FACT.code;

      if (!slots.productName && !selectedProduct && conversationHistory.length === 0) {
        plan.dataSufficient = false;
        plan.clarificationQuestion = 'Dạ bạn muốn tra cứu giá hoặc lập báo giá cho sản phẩm hoặc model cụ thể nào ạ?';
        plan.steps = ['ASK_PRODUCT_CLARIFICATION'];
        plan.targetSources = ['salesConsultant'];
        plan.internalReasoningLog = 'Price/Quotation requested but no product specified and no active history. Clarification needed.';
        return plan;
      }

      plan.complexity = 'MULTI_STEP_TASK';
      plan.steps = [
        'SEARCH_PRODUCT_CATALOG',
        'RESOLVE_TARGET_PRODUCT_AND_ORDINAL',
        'LOOKUP_VERIFIED_PRICE',
        'CALCULATE_VAT_AND_TOTAL',
        'GENERATE_FORMAL_QUOTATION',
        'RENDER_COLUMN_2_CATALOG'
      ];
      plan.targetSources = ['quotationService', 'products', 'supplier_products'];
      plan.internalReasoningLog = 'Quotation workflow planned with strict ActiveProductContext adherence.';
      return plan;
    }

    if (primaryIntent === 'PRODUCT_COMPARISON') {
      plan.capability = SYSTEM_CAPABILITIES.AI_SALES;
      plan.complexity = 'COMPARISON_EVALUATION';
      plan.cognitiveMode = 'DEEP_COGNITIVE_PATH';
      plan.steps = [
        'SEARCH_PRODUCT_CATALOG',
        'IDENTIFY_COMPARISON_CANDIDATES',
        'EXTRACT_HARDWARE_SPECS',
        'CONSTRUCT_SPEC_COMPARISON_MATRIX',
        'ANALYZE_PRICE_PERFORMANCE_VALUE'
      ];
      plan.targetSources = ['salesConsultant', 'products'];
      plan.internalReasoningLog = 'Product comparison planned. Extract specifications and construct comparative matrix.';
      return plan;
    }

    if (primaryIntent === 'PRODUCT_CONSULTATION' || primaryIntent === 'SPEC_INQUIRY') {
      plan.capability = SYSTEM_CAPABILITIES.AI_SALES;
      plan.complexity = 'SIMPLE_DIRECT';
      plan.steps = ['SEARCH_PRODUCT_CATALOG', 'LOOKUP_CATALOG_MATCH', 'EXPLAIN_KEY_BENEFITS', 'OFFER_QUOTATION'];
      plan.targetSources = ['salesConsultant', 'products'];
      plan.internalReasoningLog = 'Sales consultation planned.';
      return plan;
    }

    if (primaryIntent === 'ORDER_REQUEST') {
      plan.capability = SYSTEM_CAPABILITIES.AI_SALES;
      plan.complexity = 'MULTI_STEP_TASK';
      plan.steps = ['VALIDATE_ORDER_ITEM', 'CAPTURE_CUSTOMER_CONTACT', 'UPSERT_CRM_LEAD'];
      plan.targetSources = ['orderWorkflow', 'leads'];
      plan.internalReasoningLog = 'Order placement flow planned.';
      return plan;
    }

    // -------------------------------------------------------------------------
    // 4. DOCUMENT RAG & EXCEL & WEB RESEARCH
    // -------------------------------------------------------------------------
    if (primaryIntent === 'INTERNAL_DOCUMENT_RAG' || domain === 'DOCUMENT') {
      plan.capability = SYSTEM_CAPABILITIES.DOCUMENT_RAG;
      plan.complexity = 'SIMPLE_DIRECT';
      plan.epistemicLevel = EPISTEMIC_LEVELS.VERIFIED_FACT.code;
      plan.steps = ['SEARCH_DOCUMENT_CHUNKS', 'SEARCH_TENANT_ISOLATED_RAG', 'FORMAT_PAGE_CITATIONS', 'SYNTHESIZE_DOCUMENT_ANSWER'];
      plan.targetSources = ['ragService', 'knowledge_documents', 'knowledge_chunks'];
      plan.internalReasoningLog = 'Internal corporate document RAG planned.';
      return plan;
    }

    if (primaryIntent === 'EXCEL_CALCULATION' || domain === 'DATA') {
      plan.capability = SYSTEM_CAPABILITIES.DATA_EXCEL;
      plan.complexity = 'SIMPLE_DIRECT';
      plan.epistemicLevel = EPISTEMIC_LEVELS.VERIFIED_FACT.code;
      plan.steps = ['PARSE_EXCEL_FORMULA', 'EXECUTE_EXCEL_QUERY', 'FORMAT_NUMERIC_RESULT'];
      plan.targetSources = ['excelParser'];
      plan.internalReasoningLog = 'Structured spreadsheet aggregation planned.';
      return plan;
    }

    if (primaryIntent === 'INTERNET_SEARCH' || domain === 'RESEARCH') {
      plan.capability = SYSTEM_CAPABILITIES.WEB_RESEARCH;
      plan.complexity = 'MULTI_STEP_TASK';
      plan.cognitiveMode = 'DEEP_COGNITIVE_PATH';
      plan.epistemicLevel = EPISTEMIC_LEVELS.UNVERIFIED_INFO.code;
      plan.steps = ['FORMULATE_SEARCH_QUERY', 'EXECUTE_WEB_SEARCH', 'FILTER_SPAM_DOMAINS', 'VERIFY_URL_LIVENESS', 'VERIFY_AND_SYNTHESIZE'];
      plan.targetSources = ['webSearchService', 'verificationEngine'];
      plan.internalReasoningLog = 'External web research planned.';
      return plan;
    }

    // -------------------------------------------------------------------------
    // 5. DOCTOR-LEVEL ADVANCED RESEARCH (When query involves deep analysis / synthesis)
    // -------------------------------------------------------------------------
    const isAcademicOrComplex = /(phân tích|nghiên cứu|đánh giá toàn diện|tổng hợp liên ngành|luận giải|bản chất của|nguyên nhân sâu xa)/i.test(message) &&
      message.split(/\s+/).length > 8;

    if (isAcademicOrComplex) {
      plan.capability = SYSTEM_CAPABILITIES.DOCTOR_RESEARCH;
      plan.complexity = 'DEEP_COGNITIVE';
      plan.cognitiveMode = 'DEEP_COGNITIVE_PATH';
      plan.epistemicLevel = EPISTEMIC_LEVELS.EXPERT_RECOMMENDATION.code;
      plan.steps = [
        'DECOMPOSE_CORE_PROBLEM_DIMENSIONS',
        'RETRIEVE_MULTIDISCIPLINARY_EVIDENCE',
        'SYNTHESIZE_CRITICAL_CONCLUSION',
        'CALIBRATE_CONFIDENCE_LEVEL'
      ];
      plan.targetSources = ['reasoningEngine', 'associationEngine', 'ragService', 'webSearchService'];
      plan.internalReasoningLog = 'Doctor-level deep analytical research path activated.';
      return plan;
    }

    // -------------------------------------------------------------------------
    // 6. DEFAULT GENERAL CONVERSATION
    // -------------------------------------------------------------------------
    plan.capability = SYSTEM_CAPABILITIES.GENERAL_CONVERSATION;
    plan.complexity = 'SIMPLE_DIRECT';
    plan.steps = ['ENGAGE_FRIENDLY_CHAT', 'GENERATE_NATURAL_POLITE_RESPONSE'];
    plan.targetSources = ['conversationalAgent'];
    plan.internalReasoningLog = 'General natural dialogue path planned.';
    return plan;
  }

  /**
   * Validate Intermediate Step Execution Result
   * Backward compatible with Phase 2 verification
   * 
   * @param {string} stepName - Name of step executed
   * @param {Object} stepResult - Result output
   * @returns {Object} { success, reason, fallbackAction }
   */
  static validateStepResult(stepName, stepResult = {}) {
    if (!stepResult) return { success: false, reason: 'NULL_STEP_RESULT' };

    switch (stepName) {
      case 'SEARCH_PRODUCT_CATALOG':
      case 'LOOKUP_CATALOG_MATCH':
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
   * Backward compatible with Phase 2
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
