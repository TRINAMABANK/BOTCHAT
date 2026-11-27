/**
 * TRÍ AI ONE SUPER BRAIN - CENTRAL BRAIN ORCHESTRATOR
 * 
 * Philosophy: ONE SUPER BRAIN – ONE UNIFIED MEMORY – ONE CONTINUOUS CONVERSATION
 * 
 * Implements the 11-Stage Unified Cognitive Pipeline:
 *  1. Input Sanitization & Security Guard
 *  2. Pragmatic Intelligence & Speech Act Analysis (12 Communicative Acts)
 *  3. Dynamic Context Hydration & Session Tracking
 *  4. Multi-Thread State Management & Topic Dispatch (Stock, Weather, Memo, Sales)
 *  5. Unified Memory Retrieval & Natural Memory Commands
 *  6. Autonomy & Security Governance Gate (L1 to L4, Tier 3 strict payment block)
 *  7. Cognitive Reasoning & Domain Intelligence (5-Whys, CapEx/OpEx, LEAR, Principles)
 *  8. Knowledge & Tool Selection Gateway (Sandboxed execution, SSRF protection)
 *  9. Response Planning & Persona Layer (AI Anh, Bán hàng, Thư ký, Gia sư, Chuyên gia)
 *  10. Self-Verification Quality Gate (Ground Truth, VAT 10%, 4 Confidence Grades)
 *  11. Memory Consolidation, Episode Recording & Audit Trail
 */

import { randomUUID } from 'crypto';
import db from '../db.js';
import { sanitizeAiResponse } from './centralBrainService.js';
import { AutonomyApprovalEngine } from './intelligence/autonomyApprovalEngine.js';
import { UnifiedMemoryCore, TRUTH_TYPES } from './intelligence/unifiedMemoryCore.js';
import { NaturalHumanConversationEngine } from './intelligence/naturalHumanConversationEngine.js';
import { ContextEngine } from './intelligence/contextEngine.js';
import { ActiveProductContext } from './intelligence/activeProductContext.js';
import { ResponseEngine } from './intelligence/responseEngine.js';
import { QuotationService } from './quotationService.js';
import { UniversalSalesConsultant } from './intelligence/universalSalesConsultant.js';
import { SecretaryAgent } from './secretary/secretaryAgent.js';
import { KnowledgeGraphEngine } from './intelligence/knowledgeGraphEngine.js';
import { PragmaticIntelligenceEngine, COMMUNICATIVE_ACTS } from './intelligence/pragmaticIntelligenceEngine.js';
import { MultiThreadConversationEngine, THREAD_TOPICS, THREAD_STATUS } from './intelligence/multiThreadConversationEngine.js';
import { SecurityGovernanceGate, AUTHORIZATION_LEVELS } from './security/securityGovernanceGate.js';
import { PersonaLayer, PERSONAS } from './intelligence/personaLayer.js';
import { SelfVerificationQualityGate } from './intelligence/selfVerificationQualityGate.js';

export class CentralBrainOrchestrator {
  /**
   * Main 11-Stage Cognitive Pipeline Execution
   * @param {Object} params Request parameters
   * @returns {Promise<Object>} Formatted response
   */
  static async runPipeline(params = {}) {
    const startTime = Date.now();
    const pipelineContext = {
      sessionId: params.conversationId || `conv_${randomUUID()}`,
      orgId: params.orgId || 'org_default',
      userId: params.userId || params.customerInfo?.phone || params.customerInfo?.id || 'usr_anonymous',
      rawMessage: params.message || '',
      startTime,
      stagesCompleted: [],
      metadata: {}
    };

    // =========================================================================
    // STAGE 1: INPUT SANITIZATION & SECURITY GUARD
    // =========================================================================
    const stage1Result = this._stage1SanitizeInput(pipelineContext.rawMessage);
    pipelineContext.sanitizedText = stage1Result.sanitizedText;
    pipelineContext.stagesCompleted.push('1_INPUT_SANITIZED');

    if (!pipelineContext.sanitizedText) {
      return ResponseEngine.formatResponse({
        replyText: 'Dạ em chào Anh/Chị ạ! Em là **TRÍ AI ONE SUPER BRAIN** – rất vui được đồng hành cùng Anh/Chị. Anh/Chị đang quan tâm đến sản phẩm hay cần em hỗ trợ giải pháp nào cứ nhắn cho em nhé ạ!',
        revealCatalog: false,
        stage: 'PROMPT_GREETING'
      });
    }

    // =========================================================================
    // STAGE 2: PRAGMATIC INTELLIGENCE & SPEECH ACT ANALYSIS
    // =========================================================================
    const pragmaticProfile = PragmaticIntelligenceEngine.analyze(pipelineContext.sanitizedText, params);
    pipelineContext.pragmaticProfile = pragmaticProfile;
    pipelineContext.stagesCompleted.push('2_PRAGMATIC_UNDERSTOOD');

    // =========================================================================
    // STAGE 3: DYNAMIC CONTEXT HYDRATION & SESSION TRACKING
    // =========================================================================
    const userContext = ContextEngine.resolveUserContext(params);
    pipelineContext.userContext = userContext;
    params.userContext = userContext;
    params.conversationHistory = await ContextEngine.getConversationHistory(pipelineContext.sessionId, 6);

    let activeProd = ActiveProductContext.getContext(pipelineContext.sessionId);
    if (!activeProd && pipelineContext.sessionId) {
      activeProd = await ActiveProductContext.resolveFromHistory(pipelineContext.sessionId, db);
    }
    if (params.selectedProduct) {
      activeProd = ActiveProductContext.setActiveProduct(pipelineContext.sessionId, params.selectedProduct, { customerId: pipelineContext.userId });
    }
    pipelineContext.activeProduct = activeProd;
    params.activeProductContext = activeProd;
    pipelineContext.stagesCompleted.push('3_CONTEXT_HYDRATED');

    // =========================================================================
    // STAGE 4: MULTI-THREAD STATE MANAGEMENT & TOPIC SWITCHING
    // =========================================================================
    const activeThread = MultiThreadConversationEngine.getActiveThread(pipelineContext.sessionId);
    pipelineContext.activeThread = activeThread;

    // 4A. Check Topic Resumption
    if (pragmaticProfile.communicativeAct === COMMUNICATIVE_ACTS.TOPIC_RESUMPTION ||
        /(quay lại|quay lai|tiếp tục|tiep tuc|lúc nãy|luc nay|trước đó|truoc do).*(kế hoạch|chuyện|bàn|mua|bán|máy đếm tiền|hợp đồng|khách hàng|soạn báo giá|báo giá)/i.test(pipelineContext.sanitizedText)) {
      MultiThreadConversationEngine.resumeThread(pipelineContext.sessionId);
      const resumed = await this._handleResumeGoal(pipelineContext, params);
      if (resumed) {
        pipelineContext.stagesCompleted.push('4_TOPIC_RESUMED');
        return resumed;
      }
    }

    // 4B. Topic Switch: Stock Market & Financial Investment
    if (pragmaticProfile.targetTopic === 'FINANCE_STOCK' ||
        /(chứng khoán|cổ phiếu|vnindex|vcb|hpg|fpt|thị trường chứng khoán|đầu tư cổ phiếu)/i.test(pipelineContext.sanitizedText)) {
      const stockRes = MultiThreadConversationEngine.handleStockInquiry(pipelineContext.sanitizedText, pipelineContext.sessionId);
      pipelineContext.stagesCompleted.push('4_STOCK_TOPIC_RESOLVED');
      return ResponseEngine.formatResponse({
        replyText: stockRes.replyText,
        revealCatalog: false,
        stage: stockRes.stage,
        toolsUsed: ['multi_thread_engine', 'finance_stock_advisor']
      });
    }

    // 4C. Topic Switch: Weather Forecast
    if (pragmaticProfile.targetTopic === 'WEATHER_FORECAST' ||
        /(thời tiết|thoi tiet|có mưa không|co mua khong).*(hà nội|hồ chí minh|ngày mai|hôm nay)/i.test(pipelineContext.sanitizedText)) {
      const weatherRes = MultiThreadConversationEngine.handleWeatherInquiry(pipelineContext.sanitizedText, pipelineContext.sessionId);
      pipelineContext.stagesCompleted.push('4_WEATHER_TOPIC_RESOLVED');
      return ResponseEngine.formatResponse({
        replyText: weatherRes.replyText,
        revealCatalog: false,
        stage: weatherRes.stage,
        toolsUsed: ['multi_thread_engine', 'weather_advisor']
      });
    }

    // 4D. Topic Switch: Administrative Drafting / Internal Memo
    if (pragmaticProfile.targetTopic === 'ADMINISTRATIVE_DRAFTING' ||
        /(viết giúp|soạn giúp|viết hộ|soan giup).*(thông báo|thong bao|công văn|email nội bộ)/i.test(pipelineContext.sanitizedText)) {
      const adminRes = MultiThreadConversationEngine.handleAdministrativeDrafting(pipelineContext.sanitizedText, pipelineContext.sessionId);
      pipelineContext.stagesCompleted.push('4_ADMIN_DRAFTING_RESOLVED');
      return ResponseEngine.formatResponse({
        replyText: adminRes.replyText,
        revealCatalog: false,
        stage: adminRes.stage,
        toolsUsed: ['multi_thread_engine', 'administrative_drafting_tool']
      });
    }

    pipelineContext.stagesCompleted.push('4_THREAD_STATE_SYNCED');

    // =========================================================================
    // STAGE 5: UNIFIED MEMORY RETRIEVAL & NATURAL MEMORY COMMANDS
    // =========================================================================
    const memoryRes = await UnifiedMemoryCore.handleMemoryCommand({
      message: pipelineContext.sanitizedText,
      conversationId: pipelineContext.sessionId,
      userContext,
      tenantId: pipelineContext.orgId
    });

    if (memoryRes.handled) {
      pipelineContext.stagesCompleted.push('5_MEMORY_COMMAND_RESOLVED');
      return ResponseEngine.formatResponse({
        replyText: memoryRes.replyText,
        revealCatalog: false,
        stage: 'UNIFIED_MEMORY_RESOLVED',
        toolsUsed: ['unified_memory_core', memoryRes.commandType.toLowerCase()]
      });
    }
    pipelineContext.stagesCompleted.push('5_MEMORY_RETRIEVED');

    // =========================================================================
    // STAGE 6: AUTONOMY & SECURITY GOVERNANCE GATE (TIER 3 STRICT BLOCK & L1-L4)
    // =========================================================================
    const securityCheck = SecurityGovernanceGate.evaluateAuthorization({
      message: pipelineContext.sanitizedText,
      userId: pipelineContext.userId,
      tenantId: pipelineContext.orgId
    });

    if (!securityCheck.allowed) {
      pipelineContext.stagesCompleted.push('6_SECURITY_GOVERNANCE_BLOCKED');
      return ResponseEngine.formatResponse({
        replyText: `⛔ **CHỐT CHẶN BẢO MẬT AN TOÀN HỆ THỐNG (TIER 3 / L4)**\n\n` +
          `Dạ, thao tác này liên quan đến giao dịch thanh toán và tài chính trực tiếp hoặc can thiệp dữ liệu không thể hoàn tác. Hệ thống không thể tự động thực hiện giao dịch tài chính vì yêu cầu sự phê duyệt trực tiếp của con người (người có thẩm quyền). Em xin phép giữ nguyên trạng thái an toàn để bảo vệ tài khoản của bạn nhé!`,
        revealCatalog: false,
        stage: 'TIER3_SECURITY_BLOCKED',
        toolsUsed: ['security_governance_gate', 'l4_irreversible_block']
      });
    }

    const tier3LegacyCheck = AutonomyApprovalEngine.evaluateTier3Security(pipelineContext.sanitizedText);
    if (tier3CheckLegacyCheck(tier3LegacyCheck)) {
      pipelineContext.stagesCompleted.push('6_TIER3_SECURITY_BLOCKED');
      return ResponseEngine.formatResponse({
        replyText: tier3LegacyCheck.replyText,
        revealCatalog: false,
        stage: 'TIER3_SECURITY_BLOCKED',
        toolsUsed: ['autonomy_approval_engine', 'tier3_security_gate']
      });
    }

    const approvalEval = AutonomyApprovalEngine.evaluateConversationalResponse(pipelineContext.sanitizedText, pipelineContext.sessionId);
    if (approvalEval.isCancellation || approvalEval.isApproval) {
      pipelineContext.stagesCompleted.push('6_VERBAL_APPROVAL_RESOLVED');
      return ResponseEngine.formatResponse({
        replyText: approvalEval.replyText,
        revealCatalog: false,
        stage: approvalEval.isCancellation ? 'ACTION_CANCELLED' : 'ACTION_CONFIRMED',
        toolsUsed: ['autonomy_approval_engine']
      });
    }

    // =========================================================================
    // STAGE 7: COGNITIVE REASONING & DOMAIN INTELLIGENCE
    // =========================================================================

    // 7A. Objection Handling (LEAR Framework)
    const isPriceObjectionQuery = /(khách|khach|người mua|khách hàng).*(giá cao quá|gia cao qua|đắt quá|chê đắt|chê mắc|giá đắt|giá mắc|đắt thế).*(trả lời|tra loi|nói sao|noi sao|xử lý sao|xu ly sao|tư vấn sao|tu van sao)/i.test(pipelineContext.sanitizedText) ||
      /(sao đắt thế|sao đắt vậy|sao gia cao the|sao giá cao thế|bên kia bán rẻ hơn)/i.test(pipelineContext.sanitizedText) ||
      pragmaticProfile.communicativeAct === COMMUNICATIVE_ACTS.IMPLICIT_COMPLAINT;

    if (isPriceObjectionQuery) {
      const currentProd = pipelineContext.activeProduct || params.selectedProduct;
      pipelineContext.stagesCompleted.push('7_OBJECTION_HANDLING_LEAR');
      return UniversalSalesConsultant.handleObjection({
        objectionType: 'HIGH_PRICE',
        rawMessage: pipelineContext.sanitizedText,
        product: currentProd,
        context: params
      });
    }

    // 7B. Indirect Solution Consulting (Chống tiền giả)
    if (pragmaticProfile.communicativeAct === COMMUNICATIVE_ACTS.INDIRECT_INQUIRY ||
        /(sót tiền giả|lọt tiền giả|bị tiền giả|hay bị dính tiền giả|tiền giả tinh vi|kiểm tiền mặt hay bị sót)/i.test(pipelineContext.sanitizedText)) {
      pipelineContext.stagesCompleted.push('7_INDIRECT_SOLUTION');
      return ResponseEngine.formatResponse({
        replyText: `Chào anh/chị! Hiện tượng lọt tiền giả tinh vi (đặc biệt các dòng Polymer giả siêu chuẩn) là rủi ro rất lớn đối với khâu thu ngân và kiểm quỹ. Để xử lý triệt để, hệ thống khuyến nghị phương án kỹ thuật như sau:\n\n` +
          `1. 🔬 **Áp dụng công nghệ cảm biến đa phổ:**\n` +
          `   - Không thể chỉ dựa vào cảm biến cơ học hay mắt thường. Cần sử dụng máy đếm trang bị hệ thống cảm biến quang học kép **IR (Hồng ngoại)** và **CIS (Cảm biến hình ảnh tiếp xúc)** để quét độ phản quang của mực in bảo an.\n` +
          `   - Kết hợp cảm biến **MG (Từ tính)** nhận diện dải chỉ kim loại và mực từ chuyên dụng của Ngân hàng Nhà nước.\n\n` +
          `2. 🎯 **Giải pháp thiết bị khuyến nghị:**\n` +
          `   Các dòng máy kiểm quỹ cao cấp như **XINDA Super BC-35** hoặc **GLORY GFS-120** với phần mềm cập nhật liên tục các mẫu tiền giả mới nhất.\n\n` +
          `Quy mô giao dịch tiền mặt hàng ngày tại đơn vị mình khoảng bao nhiêu để em hỗ trợ tư vấn cấu hình tối ưu nhất ạ?`,
        revealCatalog: false,
        stage: 'INDIRECT_SOLUTION_CONSULTING',
        toolsUsed: ['cognitive_reasoning_engine', 'indirect_solution_consultant']
      });
    }

    // 7C. Sales Coaching Intake
    const isSalesCoachingQuery = /(tư vấn|tu van|hướng dẫn|huong dan).*(bán|chào hàng|tiếp cận khách).*(máy đếm tiền|may dem tien|thiết bị)/i.test(pipelineContext.sanitizedText) ||
      /^(tư vấn|tu van)\s+giúp\s+tôi\s+bán\s+/i.test(pipelineContext.sanitizedText);

    if (isSalesCoachingQuery) {
      pipelineContext.stagesCompleted.push('7_SALES_COACHING');
      return ResponseEngine.formatResponse({
        replyText: `Dạ, đối với dòng sản phẩm máy đếm tiền, để xây dựng phương án chào hàng và tư vấn hiệu quả nhất, anh/chị đang dự kiến tiếp cận phân khúc khách hàng mục tiêu nào thế ạ? (Ví dụ: Hệ thống phòng giao dịch ngân hàng/kho quỹ cần độ chính xác bắt tiền giả tuyệt đối, văn phòng doanh nghiệp cần đếm kiểm kê nhanh, hay cửa hàng bán lẻ/siêu thị cần máy nhỏ gọn tiện lợi?)`,
        revealCatalog: false,
        stage: 'SALES_COACHING_INTAKE',
        toolsUsed: ['universal_sales_consultant_coaching']
      });
    }

    // 7D. Principle Explanation
    const isExplainPrinciple = /(giải thích|giai thich|cho biết|cho biet|hỏi về|hoi ve).*(nguyên lý hoạt động|nguyen ly hoat dong|cách hoạt động|hoạt động như thế nào|nguyên lý của máy|nguyen ly cua may)/i.test(pipelineContext.sanitizedText) ||
      /(nguyên lý hoạt động của máy|nguyên lý của máy)/i.test(pipelineContext.sanitizedText);

    if (isExplainPrinciple) {
      pipelineContext.stagesCompleted.push('7_PRINCIPLE_EXPLANATION');
      return this._handleExplainPrinciple(pipelineContext, params);
    }

    // =========================================================================
    // STAGES 8-11: FALLTHROUGH TO DEEP CAPABILITY DISPATCH
    // =========================================================================
    pipelineContext.stagesCompleted.push('8_ORCHESTRATED_DISPATCH');
    return null; // Signals CentralBrainService to proceed with deep multi-capability execution
  }

  /**
   * Stage 1: Clean and sanitize raw input text
   */
  static _stage1SanitizeInput(text = '') {
    if (!text) return { sanitizedText: '' };
    const cleaned = text
      .trim()
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
    return { sanitizedText: cleaned };
  }

  /**
   * Helper: Resume Previous Goal and prepare Quotation
   */
  static async _handleResumeGoal(pipelineContext, params) {
    const previousGoal = UnifiedMemoryCore.resumePreviousGoal(pipelineContext.sessionId);
    const allActiveProds = await db.all('SELECT * FROM products WHERE is_active = 1');
    let targetProd = previousGoal?.product || pipelineContext.activeProduct;

    if (!targetProd) {
      targetProd = allActiveProds.find(p => p.name.includes('XINDA') || p.name.includes('BROTHER') || p.field === 'Máy đếm tiền') || allActiveProds[0];
    }

    const targetCustomer = previousGoal?.customer || params.customerInfo?.name || 'Khách hàng';

    if (targetProd) {
      const formalQuote = await QuotationService.createQuotation({
        customerName: targetCustomer,
        conversationId: pipelineContext.sessionId,
        items: [{
          productId: targetProd.id,
          productName: targetProd.name,
          sku: targetProd.sku || '',
          specsSnippet: targetProd.configuration || '',
          quantity: 1,
          unit: targetProd.unit || 'cái',
          unitPrice: targetProd.price,
          priceType: 'CONFIRMED'
        }],
        vatPercent: 10
      });

      AutonomyApprovalEngine.registerPendingAction(pipelineContext.sessionId, {
        actionType: 'SEND_FORMAL_QUOTATION',
        payload: {
          quoteId: formalQuote.quoteCode,
          productName: targetProd.name,
          totalAmount: formalQuote.finalAmount,
          customerName: targetCustomer
        }
      });

      const approvalQuestion = `\n\nTôi đã chuẩn bị báo giá. Anh có muốn gửi cho khách hàng không?`;
      return ResponseEngine.formatResponse({
        replyText: formalQuote.markdown + approvalQuestion,
        revealCatalog: false,
        recommendedProduct: targetProd,
        stage: 'QUOTATION_PENDING_APPROVAL',
        toolsUsed: ['unified_memory_core', 'quotation_service', 'autonomy_approval_engine']
      });
    }
    return null;
  }

  /**
   * Helper: Explain principle with goal freezing
   */
  static async _handleExplainPrinciple(pipelineContext, params) {
    let currentProd = pipelineContext.activeProduct || params.selectedProduct;
    if (!currentProd) {
      const allProds = await db.all('SELECT * FROM products WHERE is_active = 1');
      currentProd = allProds.find(p => p.field === 'Máy đếm tiền' || p.name.includes('XINDA')) || allProds[0];
    }

    if (currentProd) {
      UnifiedMemoryCore.pushGoal(pipelineContext.sessionId, {
        type: 'SALES_CONSULTATION',
        product: currentProd,
        customer: params.customerInfo?.name || 'Khách hàng'
      });
    }

    const prodName = currentProd ? (currentProd.name || currentProd.active_product_name) : 'máy đếm tiền chuyên dụng';
    const explanation = `Dạ, về nguyên lý hoạt động của dòng **${prodName}**, thiết bị vận hành dựa trên sự kết hợp đồng bộ giữa cơ chế cơ học chính xác và hệ thống cảm biến quang học đa tầng:\n\n` +
      `1. 🌀 **Cơ chế nạp và tách tiền cơ học:**\n` +
      `   Khi tiền được đưa vào khay nạp, quả đào cao su (Pickup Roller) cuốn từng tờ tiền qua khe phân tách (Separation Pad) với tốc độ cao (khoảng 1.000 – 1.200 tờ/phút), đảm bảo tiền đi qua buồng quét đơn lẻ, không bị dính rít.\n\n` +
      `2. 🔍 **Hệ thống cảm biến nhận dạng & phát hiện tiền giả:**\n` +
      `   - **Cảm biến hồng ngoại (IR):** Quét kiểm tra chất liệu giấy in và các họa tiết in chìm chống làm giả.\n` +
      `   - **Cảm biến từ tính (MG):** Nhận diện từ tính trên dải băng từ và mực in từ tính chuyên biệt của tiền thật.\n` +
      `   - **Cảm biến tia cực tím (UV):** Phát hiện đặc tính phát quang của sợi bảo an.\n` +
      `   - **Cảm biến hình ảnh CIS / Kích thước (3D Size):** Đo chính xác chiều dài, chiều rộng và độ dày của tờ tiền để nhận biết tiền lẫn loại, tiền rách hoặc tiền giả mạo kích thước.\n\n` +
      `3. ⚡ **Bộ xử lý trung tâm (MCU):**\n` +
      `   So sánh tức thời các tín hiệu quang học với cơ sở dữ liệu mẫu tiền tệ được nạp sẵn trong bộ nhớ; nếu phát hiện tiền giả, tiền rách hoặc tiền sai mệnh giá, máy sẽ lập tức kích hoạt còi báo động, dừng nạp tiền và hiển thị mã lỗi trên màn hình LED.\n\n` +
      `Anh/chị có cần em giải thích thêm chi tiết kỹ thuật nào về hệ thống cảm biến này không ạ?`;

    return ResponseEngine.formatResponse({
      replyText: explanation,
      revealCatalog: false,
      recommendedProduct: currentProd,
      stage: 'KNOWLEDGE_PRINCIPLE_EXPLAINED',
      toolsUsed: ['deep_knowledge_engine', 'unified_memory_goal_stack']
    });
  }
}

function tier3CheckLegacyCheck(check) {
  return check && check.blocked;
}
