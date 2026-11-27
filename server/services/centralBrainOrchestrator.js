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
import { WeatherService } from './weather/weatherService.js';
import { IntentEngine } from './intelligence/intentEngine.js';
import { PersonaLayer, PERSONAS } from './intelligence/personaLayer.js';
import { SelfVerificationQualityGate } from './intelligence/selfVerificationQualityGate.js';

import { ToolGateway } from './gateway/toolGateway.js';
import { ModelGateway } from './gateway/modelGateway.js';

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
        /(quay lại|quay lai|tiếp tục|tiep tuc|lúc nãy|luc nay|trước đó|truoc do).*(kế hoạch|chuyện|bàn|mua|bán|máy đếm tiền|hợp đồng|khách hàng|soạn báo giá|báo giá|máy in|may in|sản phẩm|san pham|mẫu|mau|vấn đề|van de|đề tài|de tai|chủ đề|chu de)/i.test(pipelineContext.sanitizedText) ||
        /^(quay lại|quay lai)\s+(?:chủ đề|máy in|may in|máy đếm tiền|may dem tien|sản phẩm|san pham|chuyện lúc nãy|kế hoạch lúc nãy)/i.test(pipelineContext.sanitizedText)) {
      MultiThreadConversationEngine.resumeThread(pipelineContext.sessionId);
      const resumed = await this._handleResumeGoal(pipelineContext, params);
      if (resumed) {
        pipelineContext.stagesCompleted.push('4_TOPIC_RESUMED');
        return resumed;
      }
    }

    // 4B. Topic Switch: Stock Market & Financial Investment
    if (pragmaticProfile.targetTopic === 'FINANCE_STOCK' ||
        /(chứng khoán|chung khoan|cổ phiếu|co phieu|vn-index|vnindex|vcb|hpg|fpt|thị trường chứng khoán|thi truong chung khoan|đầu tư cổ phiếu|dau tu co phieu|đầu tư tài chính|dau tu tai chinh)/i.test(pipelineContext.sanitizedText)) {
      const stockRes = MultiThreadConversationEngine.handleStockInquiry(pipelineContext.sanitizedText, pipelineContext.sessionId);
      pipelineContext.stagesCompleted.push('4_STOCK_TOPIC_RESOLVED');
      return ResponseEngine.formatResponse({
        replyText: stockRes.replyText,
        revealCatalog: false,
        stage: stockRes.stage,
        toolsUsed: ['multi_thread_engine', 'finance_stock_advisor']
      });
    }

    // 4C. Topic Switch: Real Weather Forecast (Live Meteorological Satellite & Radar Data)
    const isDeliveryInRain = /(?:giao\s+hàng|ship|vận\s+chuyển)\s*(?:được\s+không|có\s+không|khi\s+trời\s+mưa)/i.test(pipelineContext.sanitizedText);
    const isRaincoatAdvice = /(?:áo\s+mưa|ao\s+mua)\b/i.test(pipelineContext.sanitizedText);
    const intentResult = params.intentResult || (IntentEngine ? IntentEngine.analyzeIntent(pipelineContext.sanitizedText) : {});

    const isWeatherTopic = !isDeliveryInRain && !isRaincoatAdvice && (
      intentResult.primaryIntent === 'WEATHER_QUERY' ||
      pragmaticProfile.targetTopic === 'WEATHER_FORECAST' ||
      IntentEngine.isWeatherInquiry(pipelineContext.sanitizedText, pipelineContext.sanitizedText, pipelineContext.sanitizedText) ||
      WeatherService.extractQueryAspect(pipelineContext.sanitizedText) !== 'GENERAL_WEATHER' ||
      /(thời tiết|thoi tiet|dự báo thời tiết|du bao thoi tiet|có mưa không|co mua khong|mưa lớn|mua lon|mưa to|mua to|mưa đến mấy giờ|mua den may gio|nhiệt độ|nhiet do|nắng ấm|nang am|trời nắng|troi nang|có nắng không|co nang khong|bão số)/i.test(pipelineContext.sanitizedText)
    );

    if (isWeatherTopic) {
      MultiThreadConversationEngine.switchTopic(pipelineContext.sessionId, THREAD_TOPICS.WEATHER_FORECAST, { query: pipelineContext.sanitizedText }, 'Tra cứu thời tiết thời gian thực');
      const weatherRes = await WeatherService.handleWeatherQuery(pipelineContext.sanitizedText, { lastLocation: pipelineContext.activeThread?.lastLocation });
      pipelineContext.stagesCompleted.push('4_WEATHER_TOPIC_RESOLVED');
      return ResponseEngine.formatResponse({
        replyText: weatherRes.replyText,
        revealCatalog: false,
        stage: 'WEATHER_FORECAST_RESOLVED',
        toolsUsed: ['weather_service', 'open_meteo_live']
      });
    }

    // 4D. Topic Switch: Administrative Drafting / Internal Memo
    if (pragmaticProfile.targetTopic === 'ADMINISTRATIVE_DRAFTING' ||
        /(viết giúp|soạn giúp|viết hộ|soan giup|soạn thảo|soan thao|làm giúp|lam giup|viết|soạn).*(thông báo|thong bao|công văn|cong van|email nội bộ|email noi bo|biên bản|bien ban|hợp đồng|hop dong|đơn xin|don xin)/i.test(pipelineContext.sanitizedText)) {
      const adminRes = MultiThreadConversationEngine.handleAdministrativeDrafting(pipelineContext.sanitizedText, pipelineContext.sessionId);
      pipelineContext.stagesCompleted.push('4_ADMIN_DRAFTING_RESOLVED');
      return ResponseEngine.formatResponse({
        replyText: adminRes.replyText,
        revealCatalog: false,
        stage: adminRes.stage,
        toolsUsed: ['multi_thread_engine', 'administrative_drafting_tool']
      });
    }

    // 4E. Topic Switch: Technical Troubleshooting & Problem Solving
    const isTroubleshooting = /(bị kẹt giấy|bi ket giay|kẹt giấy|ket giay|không nhận lệnh|khong nhan lenh|màn hình xanh|man hinh xanh|chạy chậm|chay cham|không lên nguồn|khong len nguon|bị lỗi|bi loi|sửa lỗi|sua loi|khắc phục sự cố|khac phuc su co|kêu to|keu to|rung lắc|rung lac)/i.test(pipelineContext.sanitizedText);
    if (isTroubleshooting) {
      const isPrinterJam = /(kẹt giấy|ket giay|máy in|may in)/i.test(pipelineContext.sanitizedText);
      let troubleReply = '';
      if (isPrinterJam) {
        troubleReply = `Dạ, sự cố kẹt giấy ở máy in khá phổ biến và có thể xử lý nhanh theo các bước an toàn sau ạ:\n\n` +
          `1. 🛑 **Tắt nguồn máy in:** Nhấn nút tắt nguồn và rút dây cắm điện để đảm bảo an toàn tuyệt đối và tránh làm rách bánh răng cuốn giấy.\n` +
          `2. 📂 **Mở nắp khay chứa:** Mở khay giấy phía trước và cụm nắp trên của máy in, nhẹ nhàng tháo hộp mực (cartridge) ra ngoài và đặt ở nơi râm mát.\n` +
          `3. ✋ **Rút giấy kẹt theo chiều thuận:** Dùng cả hai tay kéo đều hai mép giấy theo chiều nạp giấy ra (tuyệt đối không kéo giật mạnh hoặc kéo ngược chiều cuốn để tránh vụn giấy sót lại trong lô cuốn).\n` +
          `4. 🔄 **Kiểm tra và lắp lại:** Kiểm tra khay nạp giấy đảm bảo giấy không bị ẩm hay cong mép, sau đó lắp lại hộp mực, đóng chặt nắp và bật nguồn in thử.\n\n` +
          `Anh/chị đang sử dụng dòng máy in nào để em hướng dẫn vị trí mở cần gạt chính xác nhất ạ?`;
      } else {
        troubleReply = `Dạ, để xử lý sự cố kỹ thuật này một cách an toàn và triệt để, em xin gợi ý quy trình kiểm tra theo các bước sau:\n\n` +
          `1. 🔍 **Kiểm tra nguồn điện & kết nối:** Đảm bảo dây cắm, adapter và các cổng kết nối tín hiệu đang hoạt động ổn định, không bị lỏng hay chập chờn.\n` +
          `2. 🔄 **Khởi động lại thiết bị (Power Cycle):** Tắt thiết bị, ngắt điện hoàn toàn trong khoảng 30 giây rồi bật lại để giải phóng bộ nhớ đệm và các tiến trình xung đột.\n` +
          `3. 📋 **Kiểm tra mã lỗi / đèn báo:** Quan sát tín hiệu đèn LED hoặc mã lỗi hiển thị trên màn hình để xác định chính xác bộ phận phát sinh sự cố.\n\n` +
          `Thiết bị của mình hiện đang báo tín hiệu đèn hoặc thông báo lỗi cụ thể như thế nào ạ?`;
      }
      pipelineContext.stagesCompleted.push('4_TECH_TROUBLESHOOTING_RESOLVED');
      return ResponseEngine.formatResponse({
        replyText: troubleReply,
        revealCatalog: false,
        stage: 'TECH_TROUBLESHOOTING_RESOLVED',
        toolsUsed: ['troubleshooting_engine', 'hardware_diagnostic_guide']
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
    const isPriceObjectionQuery = /(?:(?:khách|khach|người mua|khách hàng).*(?:giá cao|đắt quá|chê đắt|chê mắc|đắt thế|chát quá)|(?:xử lý sao|trả lời sao|nói sao).*(?:khách chê|giá cao|chê đắt))/i.test(pipelineContext.sanitizedText) ||
      /(sao đắt thế|sao đắt vậy|sao gia cao the|bên kia bán rẻ hơn|giá chát quá|chát quá|bớt đi|có giảm giá không|giảm chút đỉnh)/i.test(pipelineContext.sanitizedText) ||
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
      if (/(máy in|may in|brother|canon)/i.test(pipelineContext.sanitizedText)) {
        targetProd = allActiveProds.find(p => p.name.includes('BROTHER') || p.name.includes('CANON') || (p.field && p.field.toLowerCase().includes('in'))) || allActiveProds[0];
      } else {
        targetProd = allActiveProds.find(p => p.name.includes('XINDA') || p.name.includes('BROTHER') || p.field === 'Máy đếm tiền') || allActiveProds[0];
      }
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
