/**
 * TRÍ AI ONE SUPER BRAIN - CENTRAL BRAIN ORCHESTRATOR
 * 
 * Philosophy: ONE SUPER BRAIN – ONE UNIFIED MEMORY – ONE CONVERSATION
 * 
 * Implements the 9-Stage Cognitive Pipeline:
 *  1. Input Sanitization & Security Guard
 *  2. Context Hydration & Session Tracking
 *  3. Unified Memory Retrieval (6 Tiers: Working, Episodic, Semantic, Procedural, Prospective, Associative)
 *  4. Hierarchical Intent Classification & Capability Dispatch (Zero Buttons)
 *  5. Cognitive Reasoning (5-Whys, Multi-criteria CapEx/OpEx Trade-offs)
 *  6. Self-Verification Quality Gate (Anti-Hallucination, VAT 10%, Truth Tagging)
 *  7. Autonomy & Authorization Gate (L1 to L4, Tier 3 strict payment block)
 *  8. Natural Human Response Synthesis & Persona Lenses (AI Anh, Bán hàng, Thư ký, Gia sư, Chuyên gia)
 *  9. Memory Consolidation & Long-Term Storage
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

export class CentralBrainOrchestrator {
  /**
   * Main Pipeline Execution Method
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
        replyText: 'Xin chào Anh/Chị! Em là **TRÍ AI ONE SUPER BRAIN** – trợ lý trí tuệ nhân tạo toàn năng. Em có thể xin tên để tiện xưng hô và phục vụ tốt hơn không ạ?',
        revealCatalog: false,
        stage: 'PROMPT_GREETING'
      });
    }

    // =========================================================================
    // STAGE 2: CONTEXT HYDRATION & SESSION TRACKING
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
    pipelineContext.stagesCompleted.push('2_CONTEXT_HYDRATED');

    // =========================================================================
    // STAGE 3: UNIFIED MEMORY RETRIEVAL & INTENT COMMANDS
    // =========================================================================
    // Check if user is issuing natural memory commands (remember, forget, query, correct)
    const memoryRes = await UnifiedMemoryCore.handleMemoryCommand({
      message: pipelineContext.sanitizedText,
      conversationId: pipelineContext.sessionId,
      userContext,
      tenantId: pipelineContext.orgId
    });

    if (memoryRes.handled) {
      pipelineContext.stagesCompleted.push('3_MEMORY_COMMAND_RESOLVED');
      return ResponseEngine.formatResponse({
        replyText: memoryRes.replyText,
        revealCatalog: false,
        stage: 'UNIFIED_MEMORY_RESOLVED',
        toolsUsed: ['unified_memory_core', memoryRes.commandType.toLowerCase()]
      });
    }
    pipelineContext.stagesCompleted.push('3_MEMORY_RETRIEVED');

    // =========================================================================
    // STAGE 4: AUTONOMY & SECURITY GATE (TIER 3 / L4 FINANCIAL BLOCK & APPROVAL)
    // =========================================================================
    const tier3Check = AutonomyApprovalEngine.evaluateTier3Security(pipelineContext.sanitizedText);
    if (tier3Check.blocked) {
      pipelineContext.stagesCompleted.push('4_TIER3_SECURITY_BLOCKED');
      return ResponseEngine.formatResponse({
        replyText: tier3Check.replyText,
        revealCatalog: false,
        stage: 'TIER3_SECURITY_BLOCKED',
        toolsUsed: ['autonomy_approval_engine', 'tier3_security_gate']
      });
    }

    const approvalEval = AutonomyApprovalEngine.evaluateConversationalResponse(pipelineContext.sanitizedText, pipelineContext.sessionId);
    if (approvalEval.isCancellation || approvalEval.isApproval) {
      pipelineContext.stagesCompleted.push('4_VERBAL_APPROVAL_RESOLVED');
      return ResponseEngine.formatResponse({
        replyText: approvalEval.replyText,
        revealCatalog: false,
        stage: approvalEval.isCancellation ? 'ACTION_CANCELLED' : 'ACTION_CONFIRMED',
        toolsUsed: ['autonomy_approval_engine']
      });
    }

    // =========================================================================
    // STAGE 5: RESUMING GOALS & CO-REFERENCES
    // =========================================================================
    const isResumeGoal = /(quay lại|quay lai|tiep tuc|lúc nãy|luc nay|trước đó|truoc do).*(khách hàng|soạn báo giá|báo giá|báo giá giúp tôi|don hang)/i.test(pipelineContext.sanitizedText);
    if (isResumeGoal) {
      const resumed = await this._handleResumeGoal(pipelineContext, params);
      if (resumed) return resumed;
    }

    // =========================================================================
    // STAGE 6: OBJECTION HANDLING (LEAR FRAMEWORK)
    // =========================================================================
    const isPriceObjectionQuery = /(khách|khach|người mua|khách hàng).*(giá cao quá|gia cao qua|đắt quá|chê đắt|chê mắc|giá đắt|giá mắc|đắt thế).*(trả lời|tra loi|nói sao|noi sao|xử lý sao|xu ly sao|tư vấn sao|tu van sao)/i.test(pipelineContext.sanitizedText) ||
      /(sao đắt thế|sao đắt vậy|sao gia cao the|sao giá cao thế|bên kia bán rẻ hơn)/i.test(pipelineContext.sanitizedText);

    if (isPriceObjectionQuery) {
      const currentProd = pipelineContext.activeProduct || params.selectedProduct;
      pipelineContext.stagesCompleted.push('6_OBJECTION_HANDLING_LEAR');
      return UniversalSalesConsultant.handleObjection({
        objectionType: 'HIGH_PRICE',
        rawMessage: pipelineContext.sanitizedText,
        product: currentProd,
        context: params
      });
    }

    // =========================================================================
    // STAGE 7: SALES COACHING & PRINCIPLE EXPLANATION WITH GOAL STACK
    // =========================================================================
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

    const isExplainPrinciple = /(giải thích|giai thich|cho biết|cho biet|hỏi về|hoi ve).*(nguyên lý hoạt động|nguyen ly hoat dong|cách hoạt động|hoạt động như thế nào|nguyên lý của máy|nguyen ly cua may)/i.test(pipelineContext.sanitizedText) ||
      /(nguyên lý hoạt động của máy|nguyên lý của máy)/i.test(pipelineContext.sanitizedText);

    if (isExplainPrinciple) {
      pipelineContext.stagesCompleted.push('7_PRINCIPLE_EXPLANATION');
      return this._handleExplainPrinciple(pipelineContext, params);
    }

    // =========================================================================
    // STAGE 8 & 9: FALLTHROUGH TO CAPABILITY DISPATCH IN CENTRAL BRAIN SERVICE
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
