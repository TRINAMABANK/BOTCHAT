/**
 * TRÍ AI ULTIMATE ROBOT - CENTRAL BRAIN SERVICE & SMART TOOL ORCHESTRATOR
 * 
 * Architecture: ONE BRAIN – MANY CAPABILITIES – ONE ROBOT
 * Central Brain coordinates between:
 *  - Sales Engine Adapter (Products, Pricing, Orders, Column 2 Sync)
 *  - RAG Hybrid Search (Global Knowledge & Private Org Documents)
 *  - Structured Excel Engine (Exact Numeric Aggregations & Row Queries)
 *  - Internet Research Tool (Real-time External Verification)
 */

import { randomUUID } from 'crypto';
import db from '../db.js';
import { callGemini } from '../geminiService.js';
import { SalesEngineAdapter, SALES_ENGINE_TOOL_DEFINITION } from '../adapters/salesEngineAdapter.js';
import { RagService } from './ragService.js';
import { ExcelParser } from './parsers/excelParser.js';
import { WebSearchService } from './webSearchService.js';
import { QuotationService } from './quotationService.js';

// TRÍ AI Smart Intelligence 2.0 Engines
import { IntentEngine } from './intelligence/intentEngine.js';
import { ReasoningEngine } from './intelligence/reasoningEngine.js';
import { MemoryEngine } from './intelligence/memoryEngine.js';
import { VerificationEngine } from './intelligence/verificationEngine.js';
import { LiveWebsiteRetrieval } from './intelligence/liveWebsiteRetrieval.js';
import { ResponseEngine } from './intelligence/responseEngine.js';
import { ToolOrchestrator } from './intelligence/toolOrchestrator.js';
import { LearningCaptureEngine } from './intelligence/learningCaptureEngine.js';
import { LearningIngestionEngine } from './intelligence/learningIngestionEngine.js';
import { SmartSalesConsultant } from './intelligence/smartSalesConsultant.js';
import { UniversalSalesConsultant } from './intelligence/universalSalesConsultant.js';
import { AppointmentHandler } from './intelligence/appointmentHandler.js';
import { ContextEngine } from './intelligence/contextEngine.js';
import { SecretaryHandler } from './intelligence/secretaryHandler.js';
import { SecretaryAgent } from './secretary/secretaryAgent.js';
import { HumanMemoryEngine } from './intelligence/humanMemoryEngine.js';
import { PlanningEngine } from './intelligence/planningEngine.js';
import { ActiveProductContext } from './intelligence/activeProductContext.js';
import { CrmLeadService } from './crmLeadService.js';
import { ServiceConsultant } from './serviceConsultant.js';

/**
 * Clean unwanted search engine links and placeholder citation artifacts
 */
export function sanitizeAiResponse(text = '') {
  if (!text) return '';
  return text
    .replace(/\[Nguồn:\s*https?:\/\/(?:www\.)?duckduckgo\.com[^\s\]]*\]/gi, '')
    .replace(/\[Nguồn:\s*.*duckduckgo.*\]/gi, '')
    .replace(/\(https?:\/\/(?:www\.)?duckduckgo\.com[^\s)]*\)/gi, '')
    .replace(/https?:\/\/(?:www\.)?duckduckgo\.com\S*/gi, '')
    .replace(/\[Nguồn:\s*\]/gi, '')
    .replace(/(\*\*[^*]+?)\s*của\s*(?:anh\s+|chị\s+|ông\s+|bà\s+)?Quang Nhựt Trí\*\*/gi, '$1**')
    .replace(/—\s*Thư ký AI Toàn năng của\s*(?:anh\s+|chị\s+|ông\s+)?Quang Nhựt Trí\b/gi, '— Thư ký AI Toàn năng')
    .replace(/trợ lý bán hàng (?:thông minh )?của\s*(?:anh\s+|chị\s+|ông\s+)?Quang Nhựt Trí/gi, 'trợ lý bán hàng thông minh')
    .replace(/\s*của\s*(?:anh\s+|chị\s+|ông\s+|bà\s+)?(?:\*\*|\*|__|_)?Quang Nhựt Trí(?:\*\*|\*|__|_)?[\.]?/gi, '')
    .trim();
}

/**
 * Tool Specifications for Central Brain Function Calling
 */
export const CENTRAL_BRAIN_TOOLS = [
  // 1. Sales Engine Tool
  SALES_ENGINE_TOOL_DEFINITION,

  // 1B. Supplier Catalog & Quotation Tools
  {
    type: 'function',
    function: {
      name: 'lookup_supplier_products',
      description: 'Tra cứu sản phẩm, thông số kỹ thuật, hình ảnh và đơn giá tham khảo từ kho sản phẩm nhà cung cấp đã thu thập và kiểm duyệt.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Tên hoặc từ khóa sản phẩm cần tìm' },
          category: { type: 'string', description: 'Danh mục sản phẩm (ví dụ: Laptop, Máy in, Linh kiện...)' },
          brand: { type: 'string', description: 'Hãng sản xuất (Dell, HP, Canon...)' },
          max_price: { type: 'number', description: 'Mức giá tối đa (VNĐ)' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generate_formal_quotation',
      description: 'Thiết lập bảng báo giá sản phẩm chính thức với mã báo giá, chi tiết đơn giá, số lượng, thuế VAT 10% và ghi rõ nguồn giá tham khảo/xác nhận khi khách hàng yêu cầu báo giá.',
      parameters: {
        type: 'object',
        properties: {
          product_name: { type: 'string', description: 'Tên sản phẩm cần lập báo giá' },
          quantity: { type: 'integer', description: 'Số lượng cần mua (mặc định 1 nếu khách chưa nói)' },
          customer_name: { type: 'string', description: 'Tên khách hàng hoặc tên công ty' },
          customer_phone: { type: 'string', description: 'Số điện thoại liên hệ' }
        },
        required: ['product_name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'live_website_retrieval',
      description: 'Truy xuất trực tiếp trang sản phẩm từ website nhà cung cấp đã đăng ký khi cần kiểm tra thông tin, giá bán và đường dẫn sản phẩm thực tế theo thời gian thực.',
      parameters: {
        type: 'object',
        properties: {
          product_query: { type: 'string', description: 'Tên hoặc từ khóa sản phẩm cần tìm' }
        },
        required: ['product_query']
      }
    }
  },

  // 2. Knowledge Base Search Tool
  {
    type: 'function',
    function: {
      name: 'search_knowledge_base',
      description: 'CHỈ DÙNG khi người dùng hỏi rõ về tài liệu quy chuẩn, quy trình, chính sách, quy chế hoặc văn bản pháp quy nội bộ. TUYỆT ĐỐI KHÔNG dùng khi tư vấn bán hàng, hỏi mua sản phẩm hoặc hỏi giá.',
      parameters: {
        type: 'object',
        properties: {
          search_query: {
            type: 'string',
            description: 'Từ khóa hoặc câu hỏi cần tra cứu trong kho tài liệu'
          },
          knowledge_scope: {
            type: 'string',
            enum: ['all', 'global', 'private'],
            description: 'Phạm vi tri thức: all (cả chung và riêng), global (kho chung), private (nội bộ doanh nghiệp)'
          }
        },
        required: ['search_query']
      }
    }
  },

  // 3. Structured Excel Query Tool
  {
    type: 'function',
    function: {
      name: 'query_excel_data',
      description: 'Truy vấn, tính toán số liệu chính xác (Tổng SUM, Trung bình AVG, Đếm COUNT, Lọc dòng) trên các bảng tính Excel và CSV đã được tải lên hệ thống.',
      parameters: {
        type: 'object',
        properties: {
          sheet_name: {
            type: 'string',
            description: 'Tên sheet hoặc bảng tính cần truy vấn'
          },
          filter_column: {
            type: 'string',
            description: 'Tên cột cần lọc điều kiện'
          },
          filter_value: {
            type: 'string',
            description: 'Giá trị cần lọc'
          },
          aggregate_function: {
            type: 'string',
            enum: ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX'],
            description: 'Hàm tính toán số học trên cột'
          },
          aggregate_column: {
            type: 'string',
            description: 'Tên cột số liệu cần tính toán'
          }
        }
      }
    }
  },

  // 4. Web Search Tool
  {
    type: 'function',
    function: {
      name: 'search_web_internet',
      description: 'Tra cứu thông tin, sự kiện thời sự, hoặc kiểm chứng kiến thức bên ngoài Internet khi câu hỏi không có trong cơ sở dữ liệu nội bộ.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Cụm từ tìm kiếm trên Internet'
          }
        },
        required: ['query']
      }
    }
  }
];

export class CentralBrainService {
  /**
   * Main entry point for One Brain conversation processing (with persistence & active context tracking)
   */
  static async processChat(params = {}) {
    const res = await this._processChatInternal(params);
    if (res && res.reply && params.conversationId) {
      await this._persistAssistantMessage(params.conversationId, res.reply, res.recommendedProduct);
    }
    return res;
  }

  /**
   * Helper to persist assistant response to SQLite messages table for multi-turn history
   */
  static async _persistAssistantMessage(conversationId, content, recommendedProduct = null) {
    if (!conversationId || !content) return;
    try {
      const now = new Date().toISOString();
      await db.run(
        `INSERT OR IGNORE INTO users (id, email, password_hash, full_name, role, plan, is_active, created_at, updated_at)
         VALUES ('usr_anonymous', 'anonymous@triai.vn', 'hash', 'Khách Vãng Lai', 'customer', 'free', 1, ?, ?)`,
        [now, now]
      );
      await db.run(
        `INSERT OR IGNORE INTO conversations (id, user_id, title, is_archived, created_at, updated_at)
         VALUES (?, 'usr_anonymous', 'Cuộc hội thoại', 0, ?, ?)`,
        [conversationId, now, now]
      );
      const msgId = `msg_a_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await db.run(
        `INSERT INTO messages (id, conversation_id, sender_type, sender_id, content, metadata_json, created_at)
         VALUES (?, ?, 'assistant', 'central_brain', ?, ?, ?)`,
        [msgId, conversationId, content, JSON.stringify({ recommendedProduct }), now]
      );

      // If recommendedProduct exists, only update active product if it doesn't conflict with customer's explicit inquiry
      if (recommendedProduct && (recommendedProduct.name || recommendedProduct.active_product_name)) {
        const curActive = ActiveProductContext.getContext(conversationId);
        if (!curActive || !curActive.active_product_name) {
          ActiveProductContext.setActiveProduct(conversationId, recommendedProduct);
        } else {
          const recName = (recommendedProduct.name || recommendedProduct.active_product_name).toLowerCase();
          const actName = curActive.active_product_name.toLowerCase();
          const actModels = CrmLeadService.extractModelCodes(actName);
          const recModels = CrmLeadService.extractModelCodes(recName);
          // Only overwrite if customer didn't specify an explicit hardware model or if models match
          if (actModels.length === 0 || recModels.some(m => actModels.includes(m))) {
            ActiveProductContext.setActiveProduct(conversationId, recommendedProduct);
          }
        }
      }
    } catch (e) {
      console.warn('[CENTRAL BRAIN] Assistant message persist warning:', e.message);
    }
  }

  /**
   * Internal One Brain conversation processing
   */
  static async _processChatInternal(params = {}) {
    let {
      conversationId = `conv_${randomUUID()}`,
      message = '',
      selectedProduct = null,
      actionType = null,
      customerInfo = null,
      clientDevice = null,
      orgId = 'org_default',
      userId = customerInfo?.phone || customerInfo?.id || 'usr_anonymous'
    } = params;

    const trimmedMsg = (message || '').trim();
    if (!trimmedMsg) {
      return {
        success: true,
        reply: 'Xin chào Anh/Chị! Em là **TRÍ AI ULTIMATE ROBOT** – trợ lý AI thông minh, sẵn sàng hỗ trợ Anh/Chị. Em có thể xin tên để tiện xưng hô và phục vụ tốt hơn không ạ?',
        citations: [],
        toolsUsed: []
      };
    }

    // 0. CONTEXT ENGINE: Resolve user & role context (OWNER vs STAFF vs CUSTOMER) & Co-references
    const userContext = ContextEngine.resolveUserContext(params);
    params.userContext = userContext;
    params.conversationHistory = await ContextEngine.getConversationHistory(conversationId, 6);

    // Persist incoming user message into SQLite messages table for multi-turn continuity
    const userMsgId = `msg_u_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    try {
      const now = new Date().toISOString();
      await db.run(
        `INSERT OR IGNORE INTO users (id, email, password_hash, full_name, role, plan, is_active, created_at, updated_at)
         VALUES ('usr_anonymous', 'anonymous@triai.vn', 'hash', 'Khách Vãng Lai', 'customer', 'free', 1, ?, ?)`,
        [now, now]
      );
      const effectiveDbUserId = (userId && typeof userId === 'string' && userId.startsWith('usr_')) ? userId : 'usr_anonymous';
      if (effectiveDbUserId !== 'usr_anonymous') {
        await db.run(
          `INSERT OR IGNORE INTO users (id, email, password_hash, full_name, role, plan, is_active, created_at, updated_at)
           VALUES (?, ?, 'hash', 'Khách hàng', 'customer', 'free', 1, ?, ?)`,
          [effectiveDbUserId, `${effectiveDbUserId}@customer.triai.vn`, now, now]
        );
      }
      await db.run(
        `INSERT OR IGNORE INTO conversations (id, user_id, title, is_archived, created_at, updated_at)
         VALUES (?, ?, 'Cuộc hội thoại', 0, ?, ?)`,
        [conversationId, effectiveDbUserId, now, now]
      );
      await db.run(
        `INSERT INTO messages (id, conversation_id, sender_type, sender_id, content, metadata_json, created_at)
         VALUES (?, ?, 'user', ?, ?, ?, ?)`,
        [userMsgId, conversationId, effectiveDbUserId, trimmedMsg, JSON.stringify({ actionType, clientDevice }), now]
      );
    } catch (e) {
      console.warn('[CENTRAL BRAIN] User message persist warning:', e.message);
    }

    // Active Product Context Resolution (BotChat Brain 2.1)
    let activeProdContext = ActiveProductContext.getContext(conversationId);
    if (!activeProdContext && conversationId) {
      activeProdContext = await ActiveProductContext.resolveFromHistory(conversationId, db);
    }
    if (selectedProduct) {
      activeProdContext = ActiveProductContext.setActiveProduct(conversationId, selectedProduct, { customerId: userId });
    }

    // Check if customer explicitly mentions a new or switch product in the current message
    const isQuotationPrompt = /(báo giá|bao gia|lập báo giá|lap bao gia|xin báo giá|bảng báo giá|bang bao gia)/i.test(trimmedMsg);
    const isShortQuote = isQuotationPrompt && trimmedMsg.split(/\s+/).length <= 6;
    if (!isShortQuote) {
      const userDiscussedProd = ActiveProductContext.extractProductFromText(trimmedMsg);
      if (userDiscussedProd) {
        activeProdContext = ActiveProductContext.setActiveProduct(conversationId, userDiscussedProd, { customerId: userId });
      }
    }
    params.activeProductContext = activeProdContext;

    const coRef = ContextEngine.resolveCoReferences(trimmedMsg, conversationId, params);
    if (coRef.resolvedTimeSpec && !params.timeSpec) {
      params.timeSpec = coRef.resolvedTimeSpec;
    }
    if (coRef.resolvedProduct && !selectedProduct) {
      selectedProduct = coRef.resolvedProduct;
      params.selectedProduct = selectedProduct;
    }

    // 0B. THƯ KÝ RIÊNG: Kiểm tra phiên hội thoại đang chờ làm rõ giờ hoặc dời lịch
    if (SecretaryAgent.hasPendingClarification(conversationId)) {
      const secRes = await SecretaryAgent.handleSecretaryConversation({
        ...params,
        userContext,
        message: trimmedMsg,
        conversationId
      });
      if (secRes && secRes.stage !== 'SECRETARY_GENERAL_READY') {
        ContextEngine.updateSessionContext(conversationId, { lastIntent: 'SECRETARY_TASK' });
        return secRes;
      }
    }

    // 1. INTENT ENGINE: Natural language analysis, slang normalization, entity & intent extraction
    const intentResult = IntentEngine.analyzeIntent(trimmedMsg, params);
    const unaccentedMsg = IntentEngine.stripDiacritics(trimmedMsg).toLowerCase();

    // Resolve stable customer identity
    const isAuthenticated = userContext?.isAuthenticated || Boolean(params.user || params.authenticatedUser);
    const verifiedCustomerId = customerInfo?.customerId || (isAuthenticated ? userContext.userId : null);
    const isExplicitUser = userId && userId !== 'usr_anonymous';
    const effectiveUserId = verifiedCustomerId || (isExplicitUser ? userId : (conversationId ? `session_${conversationId}` : 'usr_anonymous'));
    const callerRole = userContext?.isOwner ? 'owner' : (userContext?.isStaff ? 'staff' : 'customer');

    // 0C. RETRIEVE STORED CUSTOMER PROFILE (From MemoryEngine & HumanMemoryEngine)
    let effectiveCustomerName = customerInfo?.name || null;
    let effectiveCustomerPronoun = customerInfo?.pronoun || null;
    let effectiveCustomerAddressing = customerInfo?.addressing || null;

    if (!effectiveCustomerName || effectiveCustomerName === 'Quý Khách' || effectiveCustomerName === 'Quý khách') {
      try {
        const storedKv = await MemoryEngine.getCustomerMemory(effectiveUserId, orgId);
        const nameKv = storedKv.find(m => m.key === 'customer_name')?.value;
        const pronounKv = storedKv.find(m => m.key === 'customer_pronoun')?.value;
        const addrKv = storedKv.find(m => m.key === 'customer_addressing')?.value;
        if (nameKv) {
          effectiveCustomerName = nameKv;
          effectiveCustomerPronoun = pronounKv || effectiveCustomerPronoun;
          effectiveCustomerAddressing = addrKv || (effectiveCustomerPronoun ? `${effectiveCustomerPronoun} ${effectiveCustomerName}` : effectiveCustomerName);
        }
      } catch {}
    }

    // Attach resolved customer profile to params & customerInfo for downstream engines
    if (effectiveCustomerName && (!customerInfo?.name || customerInfo.name === 'Quý Khách' || customerInfo.name === 'Quý khách')) {
      customerInfo = {
        ...(customerInfo || {}),
        name: effectiveCustomerName,
        pronoun: effectiveCustomerPronoun,
        addressing: effectiveCustomerAddressing
      };
      params.customerInfo = customerInfo;
    }

    // Remember customer name & addressing in MemoryEngine & HumanMemoryEngine
    if (intentResult.slots?.customerName) {
      const cName = intentResult.slots.customerName;
      const cPronoun = intentResult.slots.customerPronoun || null;
      const cAddressing = intentResult.slots.customerAddressing || (cPronoun ? `${cPronoun} ${cName}` : cName);

      effectiveCustomerName = cName;
      effectiveCustomerPronoun = cPronoun;
      effectiveCustomerAddressing = cAddressing;

      customerInfo = {
        ...(customerInfo || {}),
        name: cName,
        pronoun: cPronoun,
        addressing: cAddressing
      };
      params.customerInfo = customerInfo;

      await MemoryEngine.rememberCustomerFact({
        userId: effectiveUserId,
        orgId,
        memoryType: 'PROFILE',
        key: 'customer_name',
        value: cName,
        confidence: 0.98
      });
      if (cPronoun) {
        await MemoryEngine.rememberCustomerFact({
          userId: effectiveUserId,
          orgId,
          memoryType: 'PROFILE',
          key: 'customer_pronoun',
          value: cPronoun,
          confidence: 0.95
        });
      }
      await MemoryEngine.rememberCustomerFact({
        userId: effectiveUserId,
        orgId,
        memoryType: 'PROFILE',
        key: 'customer_addressing',
        value: cAddressing,
        confidence: 0.98
      });

      await HumanMemoryEngine.remember({
        memoryType: 'SEMANTIC',
        content: `Tên khách hàng: ${cName}`,
        subject: 'customer_name',
        entityId: effectiveUserId,
        source: 'USER_CHAT',
        confidence: 0.98,
        tenantId: orgId,
        sensitivity: 'INTERNAL',
        extraData: {
          customerName: cName,
          pronoun: cPronoun,
          addressing: cAddressing
        }
      });
      if (cPronoun) {
        await HumanMemoryEngine.remember({
          memoryType: 'SEMANTIC',
          content: `Cách xưng hô: ${cPronoun}`,
          subject: 'customer_pronoun',
          entityId: effectiveUserId,
          source: 'USER_CHAT',
          confidence: 0.95,
          tenantId: orgId,
          sensitivity: 'INTERNAL'
        });
      }

      if (conversationId) {
        try {
          await db.run(
            "UPDATE leads SET customer_name = ?, updated_at = ? WHERE conversation_id = ? AND (customer_name LIKE 'Khách%' OR customer_name = 'Quý Khách' OR customer_name = 'Quý khách' OR customer_name = '' OR customer_name IS NULL)",
            [cAddressing, new Date().toISOString(), conversationId]
          );
        } catch {}
      }
    }

    // 2. CUSTOMER IDENTITY & GREETING INTENTS
    if (intentResult.primaryIntent === 'CUSTOMER_INTRODUCTION') {
      const cName = intentResult.slots?.customerName || effectiveCustomerName || 'bạn';
      const cPronoun = intentResult.slots?.customerPronoun || effectiveCustomerPronoun || null;
      const addressing = cPronoun ? `${cPronoun} ${cName}` : cName;
      const ref = cPronoun || 'anh/chị';
      const replyText = `Dạ, em chào ${addressing}! Em là **TRÍ AI ULTIMATE ROBOT** – trợ lý AI thông minh, rất vui được hỗ trợ ${ref} hôm nay ạ. Hôm nay ${ref} đang quan tâm đến sản phẩm nào để em tư vấn cho ${ref} ạ?`;

      return ResponseEngine.formatResponse({
        replyText,
        revealCatalog: false,
        recommendedField: null,
        recommendedProduct: null,
        stage: 'CUSTOMER_GREETED',
        requiresInput: 'TEXT_PROMPT',
        suggestedActions: [
          { id: 'view_catalog', label: 'Xem danh mục sản phẩm', action: 'view_catalog' },
          { id: 'consult_product', label: 'Tư vấn sản phẩm', action: 'consult_product' }
        ],
        citations: [],
        toolsUsed: ['identity_handler', 'memory_engine', 'human_memory_engine']
      });
    }

    if (intentResult.primaryIntent === 'CUSTOMER_DECLINE_NAME') {
      return ResponseEngine.formatResponse({
        replyText: 'Dạ không sao ạ! Em rất hân hạnh được phục vụ Quý khách. Hôm nay Quý khách đang quan tâm đến dòng sản phẩm nào hoặc cần em hỗ trợ thông tin gì ạ?',
        revealCatalog: false,
        stage: 'DECLINE_NAME_ACKNOWLEDGED',
        requiresInput: 'TEXT_PROMPT',
        suggestedActions: [
          { id: 'view_catalog', label: 'Xem danh mục sản phẩm', action: 'view_catalog' }
        ],
        citations: [],
        toolsUsed: ['identity_handler']
      });
    }

    // 2. MEMORY ENGINE: Check for memory commands (VIEW, SAVE, FORGET)
    if (intentResult.primaryIntent === 'MEMORY_COMMAND') {
      const memoryAction = intentResult.action || 'FORGET';

      if (memoryAction === 'VIEW') {
        const storedMemories = await HumanMemoryEngine.retrieve({
          entityId: effectiveUserId,
          userRole: callerRole,
          requestingUserId: userId,
          tenantId: orgId,
          limit: 10
        });
        const kvMemories = await MemoryEngine.getCustomerMemory(effectiveUserId, orgId);

        const facts = [];
        const nameVal = kvMemories.find(m => m.key === 'customer_name')?.value ||
          storedMemories.find(m => m.subject === 'customer_name')?.content?.replace('Tên khách hàng: ', '');
        const addrVal = kvMemories.find(m => m.key === 'customer_addressing')?.value;
        const phoneVal = kvMemories.find(m => m.key === 'phone')?.value ||
          storedMemories.find(m => m.subject === 'phone')?.content?.replace('Số điện thoại liên hệ: ', '');
        const budgetVal = kvMemories.find(m => m.key === 'target_budget')?.value ||
          storedMemories.find(m => m.subject === 'budget')?.content?.replace('Ngân sách dự kiến: ', '');

        if (nameVal) facts.push(`- **Tên khách hàng:** ${nameVal}`);
        if (addrVal) facts.push(`- **Cách xưng hô:** ${addrVal}`);
        if (phoneVal) facts.push(`- **Số điện thoại:** ${phoneVal}`);
        if (budgetVal) {
          const numBudget = parseInt(budgetVal, 10);
          facts.push(`- **Ngân sách quan tâm:** ${!isNaN(numBudget) ? numBudget.toLocaleString('vi-VN') + 'đ' : budgetVal}`);
        }

        let replyText = '';
        if (facts.length > 0) {
          replyText = `Dạ, hệ thống đang lưu các thông tin hỗ trợ của bạn gồm:\n\n${facts.join('\n')}\n\nBạn có thể yêu cầu cập nhật hoặc yêu cầu xóa bất kỳ lúc nào để đảm bảo quyền riêng tư tuyệt đối ạ.`;
        } else {
          replyText = `Dạ hiện tại hệ thống chưa lưu thông tin cá nhân nào của bạn ạ.`;
        }

        return ResponseEngine.formatResponse({
          replyText,
          stage: 'MEMORY_VIEWED',
          toolsUsed: ['memory_engine', 'human_memory_engine']
        });
      }

      if (memoryAction === 'SAVE') {
        const savedDetails = [];
        if (intentResult.slots?.customerName) {
          savedDetails.push(`Tên: ${intentResult.slots.customerName}`);
        }
        if (intentResult.slots?.phone) {
          savedDetails.push(`SĐT: ${intentResult.slots.phone}`);
        }
        if (intentResult.slots?.budget) {
          savedDetails.push(`Ngân sách: ${intentResult.slots.budget}`);
        }

        // If user says "Lưu thông tin này" with a custom note, save it as semantic note
        const noteContent = trimmedMsg.replace(/(?:lưu\s+thông\s+tin\s+này|lưu\s+thông\s+tin|ghi\s+nhớ\s+giúp\s+tôi)/gi, '').trim();
        if (noteContent && noteContent.length > 3) {
          await HumanMemoryEngine.remember({
            memoryType: 'SEMANTIC',
            content: noteContent,
            subject: 'NOTE',
            entityId: effectiveUserId,
            source: 'USER_CHAT',
            confidence: 1.0,
            tenantId: orgId,
            sensitivity: 'INTERNAL'
          });
          savedDetails.push(`Ghi chú: "${noteContent}"`);
        }

        const replyText = savedDetails.length > 0
          ? `Dạ, em đã ghi nhận và lưu thông tin (${savedDetails.join(', ')}) của bạn vào hệ thống rồi nhé ạ!`
          : `Dạ, em đã lưu lại các thông tin bạn vừa cung cấp vào hệ thống để phục vụ tư vấn chu đáo nhất rồi ạ!`;

        return ResponseEngine.formatResponse({
          replyText,
          stage: 'MEMORY_SAVED',
          toolsUsed: ['memory_engine', 'human_memory_engine']
        });
      }

      // Default FORGET action
      await MemoryEngine.forgetCustomer(effectiveUserId, orgId);
      await HumanMemoryEngine.forget({ entityId: effectiveUserId, tenantId: orgId });
      return ResponseEngine.formatResponse({
        replyText: 'Dạ, tôi đã xóa toàn bộ thông tin ghi nhớ cá nhân của bạn trong hệ thống theo yêu cầu để đảm bảo quyền riêng tư tuyệt đối.',
        stage: 'MEMORY_UPDATED',
        toolsUsed: ['memory_engine', 'human_memory_engine']
      });
    }

    // 2A. RESET CHAT INTENT (Làm mới cuộc trò chuyện / Xóa nội dung chat)
    if (intentResult.primaryIntent === 'RESET_CHAT_REQUEST' || actionType === 'REQUEST_RESET_CHAT') {
      return ResponseEngine.formatResponse({
        replyText: 'Dạ, bạn có muốn làm mới cuộc trò chuyện để bắt đầu lại từ đầu không ạ?\n\nBạn có thể nhấn vào nút **"Xác nhận Làm mới"** bên dưới hoặc nút **"Làm mới"** ở góc trên màn hình để xóa nội dung chat nhé!',
        stage: 'AWAITING_RESET_CONFIRMATION',
        actionType: 'CONFIRM_RESET_CHAT',
        isResetPrompt: true,
        suggestedActions: [
          { id: 'confirm_reset_chat', label: '🔄 Xác nhận Làm mới', action: 'reset_chat' },
          { id: 'cancel_reset_chat', label: 'Tiếp tục trò chuyện', action: 'cancel_reset' }
        ],
        toolsUsed: ['reset_chat_manager']
      });
    }

    if (intentResult.primaryIntent === 'CONFIRM_RESET_CHAT' || actionType === 'CONFIRM_RESET_CHAT') {
      return ResponseEngine.formatResponse({
        replyText: 'Dạ, hệ thống đang làm mới cuộc trò chuyện cho bạn ngay bây giờ ạ!',
        stage: 'CHAT_RESET',
        actionType: 'RESET_CHAT_NOW',
        isResetPrompt: true,
        suggestedActions: [],
        toolsUsed: ['reset_chat_manager']
      });
    }

    // 2B. TRÍ AN LEARNING CENTER: Priority 1 Curated Approved Knowledge Lookup
    // Skip if customer explicitly requested staff handoff or greeting
    if (intentResult.primaryIntent !== 'STAFF_HANDOFF' && !SmartSalesConsultant.isStaffHandoff(unaccentedMsg)) {
      const approvedCurated = await LearningIngestionEngine.lookupApprovedKnowledge(trimmedMsg, orgId);
      if (approvedCurated && approvedCurated.standard_answer) {
        return ResponseEngine.formatResponse({
          replyText: `Dạ, về câu hỏi của bạn:\n\n${approvedCurated.standard_answer}\n\nThông tin chi tiết và các sản phẩm liên quan đã được mở sẵn ở **Cột 2**, bạn có thể tham khảo thêm nhé ạ!`,
          revealCatalog: true,
          recommendedField: approvedCurated.related_topic || null,
          recommendedProduct: approvedCurated.related_product_id ? { id: approvedCurated.related_product_id, name: approvedCurated.related_product_name } : null,
          stage: 'LEARNING_CENTER_RESOLVED',
          citations: [{
            source: 'learning_center',
            label: `[Tri thức đã duyệt: ${approvedCurated.standard_question || 'Chuẩn Admin'}]`
          }],
          toolsUsed: ['learning_center_approved']
        });
      }
    }

    // Remember customer phone or budget in Human Memory Engine
    if (intentResult.slots?.phone) {
      await MemoryEngine.rememberCustomerFact({
        userId: effectiveUserId,
        orgId,
        memoryType: 'PROFILE',
        key: 'phone',
        value: intentResult.slots.phone
      });
      await HumanMemoryEngine.remember({
        memoryType: 'SEMANTIC',
        content: `Số điện thoại liên hệ: ${intentResult.slots.phone}`,
        subject: 'phone',
        entityId: effectiveUserId,
        source: 'USER_CHAT',
        confidence: 1.0,
        tenantId: orgId,
        sensitivity: 'INTERNAL'
      });
    }
    if (intentResult.slots?.budget) {
      await MemoryEngine.rememberCustomerFact({
        userId: effectiveUserId,
        orgId,
        memoryType: 'BUDGET',
        key: 'target_budget',
        value: String(intentResult.slots.budget)
      });
      await HumanMemoryEngine.remember({
        memoryType: 'SEMANTIC',
        content: `Ngân sách dự kiến: ${intentResult.slots.budget}`,
        subject: 'budget',
        entityId: effectiveUserId,
        source: 'USER_CHAT',
        confidence: 0.9,
        tenantId: orgId,
        sensitivity: 'INTERNAL'
      });
    }

    // Retrieve active Human Memories for this user / entity
    const relevantMemories = await HumanMemoryEngine.retrieve({
      entityId: effectiveUserId,
      userRole: callerRole,
      requestingUserId: userId,
      tenantId: orgId,
      limit: 10
    });

    // 3. REASONING ENGINE: Assess complexity & data sufficiency (Cognitive Core V2)
    const plan = ReasoningEngine.planExecution(intentResult, {
      ...params,
      message: trimmedMsg,
      memories: relevantMemories
    });
    if (!plan.dataSufficient && plan.clarificationQuestion) {
      return ResponseEngine.formatClarification(plan.clarificationQuestion);
    }

    // 3B. CRITICAL THINKING INTERVENTION (False Premise & Fallacy Guard)
    if (plan.criticalAnalysis && plan.criticalAnalysis.shouldIntervene && plan.criticalAnalysis.interventionResponse) {
      return ResponseEngine.formatResponse({
        replyText: plan.criticalAnalysis.interventionResponse,
        revealCatalog: false,
        recommendedField: null,
        recommendedProduct: null,
        stage: 'CRITICAL_THINKING_RESOLVED',
        requiresInput: 'TEXT_PROMPT',
        suggestedActions: [
          { id: 'explore_more', label: 'Tìm hiểu thêm cơ sở khoa học', action: 'explore_more' },
          { id: 'ask_another', label: 'Đặt câu hỏi khác', action: 'ask_another' }
        ],
        citations: [],
        toolsUsed: ['critical_thinking_engine', 'reasoning_engine']
      });
    }

    // Context enriched with Intent & Plan
    const enrichedContext = {
      ...params,
      userContext,
      message: trimmedMsg,
      conversationId,
      intentResult,
      plan,
      userId,
      orgId
    };

    // -------------------------------------------------------------------------
    // 2B. SECURITY ACCESS GATES & ANTI-DATA LEAK (DUAL-ROLE PROTECTION)
    // -------------------------------------------------------------------------
    if (intentResult.primaryIntent === 'SECURITY_OTHER_CUSTOMER_DATA') {
      return SecretaryHandler.handleUnauthorizedAccess(enrichedContext, 'OTHER_CUSTOMER_DATA');
    }
    if (intentResult.primaryIntent === 'SECURITY_OWNER_PRIVATE_SCHEDULE') {
      return SecretaryHandler.handleUnauthorizedAccess(enrichedContext, 'OWNER_PRIVATE_SCHEDULE');
    }
    if (intentResult.primaryIntent === 'SECURITY_STAFF_UNAUTHORIZED_REPORT') {
      return SecretaryHandler.handleUnauthorizedAccess(enrichedContext, 'STAFF_UNAUTHORIZED_REPORT');
    }
    if (intentResult.primaryIntent === 'SECURITY_IMPERSONATION_ATTEMPT') {
      return SecretaryHandler.handleUnauthorizedAccess(enrichedContext, 'IMPERSONATION_ATTEMPT');
    }

    // -------------------------------------------------------------------------
    // 2B-SERVICE. TƯ VẤN DỊCH VỤ THI CÔNG – LẮP ĐẶT – KHẢO SÁT (BOTCHAT SERVICE)
    // Ưu tiên xử lý dịch vụ trước; TUYỆT ĐỐI không đổ danh mục sản phẩm Cột 2!
    // -------------------------------------------------------------------------
    if (intentResult.primaryIntent === 'SERVICE_SURVEY_REQUEST' || 
        intentResult.primaryIntent === 'INSTALLATION_REQUEST' || 
        intentResult.primaryIntent === 'MAINTENANCE_REQUEST' || 
        intentResult.primaryIntent === 'REPAIR_REQUEST' ||
        intentResult.domain === 'SERVICE') {
      const res = await ServiceConsultant.handleServiceConsultation(enrichedContext);
      ContextEngine.updateSessionContext(conversationId, {
        inServiceIntake: true,
        lastIntent: 'SERVICE_SURVEY_REQUEST'
      });
      return res;
    }

    // -------------------------------------------------------------------------
    // 2C. DUAL ROLE: AI SECRETARY (THƯ KÝ RIÊNG CỦA ANH TRÍ)
    // -------------------------------------------------------------------------
    if (intentResult.primaryIntent === 'SECRETARY_TASK' || intentResult.primaryIntent === 'OWNER_DAILY_PLAN') {
      const res = await SecretaryAgent.handleSecretaryConversation(enrichedContext);
      ContextEngine.updateSessionContext(conversationId, { lastIntent: 'SECRETARY_TASK', lastTimeSpec: intentResult.slots?.timeSpec });
      return res;
    }
    if (intentResult.primaryIntent === 'SECRETARY_CRM_SUMMARY') {
      const res = await SecretaryHandler.handleCrmSummary(enrichedContext);
      ContextEngine.updateSessionContext(conversationId, { lastIntent: 'SECRETARY_CRM_SUMMARY' });
      return res;
    }
    if (intentResult.primaryIntent === 'EMAIL_TASK') {
      const res = await SecretaryHandler.handleDraftEmail(enrichedContext);
      ContextEngine.updateSessionContext(conversationId, { lastIntent: 'EMAIL_TASK' });
      return res;
    }

    // -------------------------------------------------------------------------
    // 2D. SMART CONVERSATION & APPOINTMENT ROUTING (BOTCHAT BRAIN 2.1)
    // Non-product intents are handled directly; NEVER leak into Sales Engine!
    // -------------------------------------------------------------------------
    if (intentResult.primaryIntent === 'APPOINTMENT') {
      const res = await AppointmentHandler.handleAppointment(enrichedContext);
      ContextEngine.updateSessionContext(conversationId, { lastIntent: 'APPOINTMENT', lastTimeSpec: intentResult.slots?.timeSpec });
      return res;
    }
    if (intentResult.primaryIntent === 'SCHEDULE_QUERY') {
      const res = await AppointmentHandler.handleScheduleQuery(enrichedContext);
      ContextEngine.updateSessionContext(conversationId, { lastIntent: 'SCHEDULE_QUERY', lastTimeSpec: intentResult.slots?.timeSpec });
      return res;
    }
    if (intentResult.primaryIntent === 'REMINDER') {
      if (enrichedContext.userContext?.isOwner) {
        const res = await SecretaryAgent.handleSecretaryConversation(enrichedContext);
        ContextEngine.updateSessionContext(conversationId, { lastIntent: 'SECRETARY_TASK', lastTimeSpec: intentResult.slots?.timeSpec });
        return res;
      }
      const res = await AppointmentHandler.handleReminder(enrichedContext);
      ContextEngine.updateSessionContext(conversationId, { lastIntent: 'REMINDER', lastTimeSpec: intentResult.slots?.timeSpec });
      return res;
    }
    if (intentResult.primaryIntent === 'COMPANY_INFO' || intentResult.primaryIntent === 'COMPLAINT') {
      return await AppointmentHandler.handleBusinessSupport(enrichedContext);
    }
    if (intentResult.primaryIntent === 'GENERAL_CHAT' || intentResult.primaryIntent === 'GREETING' || intentResult.primaryIntent === 'IDENTITY_INQUIRY') {
      return await AppointmentHandler.handleGeneralChat(enrichedContext);
    }

    // -------------------------------------------------------------------------
    // 2E. MULTI-INTENT COMPOSITE ORCHESTRATION: MIXED_SALES_SECRETARY
    // -------------------------------------------------------------------------
    if (intentResult.primaryIntent === 'MIXED_SALES_SECRETARY' || intentResult.domain === 'MIXED') {
      return await this.handleMixedSalesSecretary(enrichedContext);
    }

    // Check if OpenAI Key is configured
    const openAiApiKey = process.env.OPENAI_API_KEY;
    const hasOpenAi = openAiApiKey && openAiApiKey.length > 10 && !openAiApiKey.includes('your_');

    let finalResult = null;
    if (hasOpenAi) {
      // -----------------------------------------------------------------------
      // PATH A: Native OpenAI Tool Calling (Central Brain)
      // -----------------------------------------------------------------------
      try {
        finalResult = await this.runOpenAiCentralBrain(enrichedContext);
      } catch (err) {
        console.warn('[CENTRAL BRAIN] OpenAI call failed, falling back to Smart Orchestrator:', err.message);
      }
    }

    // -------------------------------------------------------------------------
    // PATH B: Smart Tool Orchestrator with Gemini / Fallback Engine
    // -------------------------------------------------------------------------
    if (!finalResult) {
      finalResult = await this.runSmartOrchestratorFallback(enrichedContext);
    }

    // Preserve active product & intent in session context across turns
    if (finalResult?.recommendedProduct || selectedProduct) {
      ContextEngine.updateSessionContext(conversationId, {
        lastProduct: finalResult?.recommendedProduct || selectedProduct,
        lastIntent: intentResult?.primaryIntent
      });
    }

    return finalResult;
  }

  /**
   * Handle Composite Request: Mixed Sales & Secretary / Appointment (BOTCHAT BRAIN 2.1)
   */
  static async handleMixedSalesSecretary(context) {
    const { intentResult, conversationId } = context;
    const subIntents = intentResult.subIntents || ['SALES_CONSULTATION', 'REMINDER'];

    // Step 1: Execute Sales Subtask
    const salesSubIntent = subIntents.find(s => ['FORMAL_QUOTATION', 'PRICE_INQUIRY', 'ORDER_REQUEST', 'SALES_CONSULTATION'].includes(s)) || 'SALES_CONSULTATION';

    let salesResponse = null;
    if (salesSubIntent === 'FORMAL_QUOTATION') {
      const quoteRes = await ToolOrchestrator.executeQuotation({
        productName: intentResult.slots?.productName || 'máy in',
        quantity: intentResult.slots?.quantity || 1,
        conversationId,
        orgId: context.orgId
      });
      salesResponse = {
        reply: quoteRes.result?.quotationMarkdown || 'Dạ em đã tra cứu thông tin sản phẩm theo yêu cầu.',
        recommendedProduct: quoteRes.result?.productCandidate || null
      };
    } else {
      salesResponse = await SmartSalesConsultant.consultSales(context);
    }

    // Step 2: Execute Secretary / Appointment Subtask
    const secSubIntent = subIntents.find(s => ['REMINDER', 'APPOINTMENT', 'EMAIL_TASK', 'SECRETARY_TASK', 'SECRETARY_CRM_SUMMARY'].includes(s)) || 'APPOINTMENT';

    let secResponse = null;
    if (secSubIntent === 'APPOINTMENT' || secSubIntent === 'SCHEDULE_QUERY') {
      secResponse = await AppointmentHandler.handleAppointment(context);
    } else if (secSubIntent === 'REMINDER') {
      secResponse = await AppointmentHandler.handleReminder(context);
    } else if (secSubIntent === 'EMAIL_TASK') {
      secResponse = await SecretaryHandler.handleDraftEmail(context);
    } else {
      secResponse = await SecretaryHandler.handleOwnerTask(context);
    }

    // Step 3: Synthesize Unified Dual-Role Response
    const salesText = salesResponse?.reply || salesResponse?.content || '';
    const secText = secResponse?.reply || secResponse?.replyText || '';

    const combinedText = `Dạ, em xin phép hỗ trợ trọn vẹn cả 2 nội dung theo yêu cầu của bạn như sau ạ:\n\n` +
      `### 1. 💼 TƯ VẤN SẢN PHẨM & KINH DOANH (AI SALES):\n` +
      `${salesText}\n\n` +
      `---\n\n` +
      `### 2. 🗓️ LỊCH TRÌNH & THƯ KÝ (AI SECRETARY):\n` +
      `${secText}`;

    ContextEngine.updateSessionContext(conversationId, {
      lastIntent: 'MIXED_SALES_SECRETARY',
      lastProduct: salesResponse?.recommendedProduct || null,
      lastTimeSpec: intentResult.slots?.timeSpec || null
    });

    return ResponseEngine.formatResponse({
      replyText: combinedText,
      revealCatalog: true,
      recommendedProduct: salesResponse?.recommendedProduct || null,
      stage: 'MIXED_SALES_SECRETARY_PROCESSED',
      toolsUsed: ['smartSalesConsultant', 'secretaryHandler', 'appointmentHandler']
    });
  }

  /**
   * Smart Orchestrator Fallback Engine
   */
  static async runSmartOrchestratorFallback(context) {
    const { message, conversationId, selectedProduct, actionType, customerInfo, clientDevice, orgId, intentResult, plan, userContext = context.userContext || {} } = context;
    const toolsUsed = [];
    let uiDirectives = {};
    const citations = [];
    let intermediateContext = '';

    const lower = message.toLowerCase();
    const primaryIntent = intentResult?.primaryIntent || 'PRODUCT_CONSULTATION';
    const slots = intentResult?.slots || {};

    const isExcelQuery = primaryIntent === 'EXCEL_CALCULATION' || lower.includes('excel') || lower.includes('bang tinh') || lower.includes('bảng tính') || lower.includes('tổng cộng') || lower.includes('doanh thu');
    const isOfficeDocDevice = /(máy hủy tài liệu|may huy tai lieu|máy scan tài liệu|may scan tai lieu|máy quét tài liệu|may quet tai lieu)/i.test(message);
    const isDocExplicitQuery = !isOfficeDocDevice && (primaryIntent === 'INTERNAL_DOCUMENT_RAG' || ((/(tài liệu|tai lieu|quy trình|quy trinh|quy chế|quy che|quyết định|quyet dinh|điều chuyển|dieu chuyen|nam a bank|namabank|thủ tục|thu tuc|công văn|cong van|văn bản|van ban|nội bộ|noi bo|sổ tay|so tay|quy định|quy dinh|hồ sơ|ho so)/i.test(message) || (/(chính sách|chinh sach)/i.test(message) && !/(bảo hành|bao hanh|đổi trả|doi tra|giao hàng|giao hang|mua hàng|mua hang)/i.test(message))) && !/(mua|bán|giá|báo giá)/i.test(message)));
    const isWebSearch = primaryIntent === 'INTERNET_SEARCH' || lower.includes('tin tuc') || lower.includes('thoi tiet') || lower.includes('internet') || lower.includes('tim tren mang') || lower.includes('tra cuu mang');
    const isQuotationRequest = primaryIntent === 'FORMAL_QUOTATION' || /(báo giá|bao gia|lập báo giá|lap bao gia|xin báo giá|bảng báo giá|bang bao gia)/i.test(message);
    const isLiveWebSearch = primaryIntent === 'LIVE_WEBSITE_SEARCH' || lower.includes('website') || lower.includes('web nha cung cap');

    // 0A. Security Access Gates & Anti-Data Leak (Defense-in-depth)
    if (primaryIntent === 'SECURITY_OTHER_CUSTOMER_DATA') {
      return SecretaryHandler.handleUnauthorizedAccess(context, 'OTHER_CUSTOMER_DATA');
    }
    if (primaryIntent === 'SECURITY_OWNER_PRIVATE_SCHEDULE') {
      return SecretaryHandler.handleUnauthorizedAccess(context, 'OWNER_PRIVATE_SCHEDULE');
    }
    if (primaryIntent === 'SECURITY_STAFF_UNAUTHORIZED_REPORT') {
      return SecretaryHandler.handleUnauthorizedAccess(context, 'STAFF_UNAUTHORIZED_REPORT');
    }
    if (primaryIntent === 'SECURITY_IMPERSONATION_ATTEMPT') {
      return SecretaryHandler.handleUnauthorizedAccess(context, 'IMPERSONATION_ATTEMPT');
    }

    // 0B. AI Secretary Tasks (Defense-in-depth)
    if (primaryIntent === 'SECRETARY_TASK' || primaryIntent === 'OWNER_DAILY_PLAN') {
      return await SecretaryAgent.handleSecretaryConversation(context);
    }
    if (primaryIntent === 'SECRETARY_CRM_SUMMARY') {
      return await SecretaryHandler.handleCrmSummary(context);
    }
    if (primaryIntent === 'EMAIL_TASK') {
      return await SecretaryHandler.handleDraftEmail(context);
    }

    // 0C. Appointment & Schedule & Reminder & Support Routing (Defense-in-depth)
    if (primaryIntent === 'APPOINTMENT') {
      return await AppointmentHandler.handleAppointment(context);
    }
    if (primaryIntent === 'SCHEDULE_QUERY') {
      return await AppointmentHandler.handleScheduleQuery(context);
    }
    if (primaryIntent === 'REMINDER') {
      return await AppointmentHandler.handleReminder(context);
    }
    if (primaryIntent === 'COMPANY_INFO' || primaryIntent === 'COMPLAINT') {
      return await AppointmentHandler.handleBusinessSupport(context);
    }
    if (primaryIntent === 'GENERAL_CHAT') {
      return await AppointmentHandler.handleGeneralChat(context);
    }
    if (primaryIntent === 'MIXED_SALES_SECRETARY') {
      return await this.handleMixedSalesSecretary(context);
    }

    // 0B. Greeting & Conversational Routing (Polite Personal Assistant)
    const isGreeting = primaryIntent === 'GREETING' || primaryIntent === 'IDENTITY_INQUIRY' || primaryIntent === 'GENERAL_CONVERSATION' || /^(hi|hello|chào|chao|alo|xin chào|xin chao|ê|hey|hê lô|bạn là ai|ban la ai|em là ai|em tên gì|bạn tên gì|khỏe không|khoe khong|chúc|cảm ơn|cam on|thanks|thank you|ok|oke|okie)(\s.*)?$/i.test(message.trim());
    if (isGreeting && !isQuotationRequest && !isDocExplicitQuery && !isExcelQuery && !isLiveWebSearch) {
      return await AppointmentHandler.handleGeneralChat(context);
    }

    // 0B-RESEARCH. DOCTOR-LEVEL ADVANCED COGNITIVE RESEARCH & MULTIDISCIPLINARY SYNTHESIS
    if ((plan?.capability === 'DOCTOR_RESEARCH' || plan?.complexity === 'DEEP_COGNITIVE') && !isQuotationRequest && !isDocExplicitQuery && !isExcelQuery) {
      toolsUsed.push('doctor_research_engine');
      let assocText = '';
      if (plan?.crossAssociations && plan.crossAssociations.associations?.length > 0) {
        assocText = '\n\n### 🌐 GÓC NHÌN LIÊN NGÀNH & BẢN ĐỒ KHÁI NIỆM:\n' +
          plan.crossAssociations.associations.map(a => `- **${a.perspective} (${a.concept}):** ${a.insight}`).join('\n');
      }

      const academicPrompt = `Bạn là TRÍ AI ULTIMATE ROBOT – hệ thống trí tuệ nhân tạo chuyên sâu cấp tiến sĩ.
Yêu cầu phân tích: "${message}".
${assocText ? `Thông tin liên ngành liên quan:\n${assocText}\n` : ''}
Quy tắc:
- Trả lời bằng tiếng Việt chuẩn mực, tư duy phản biện, lập luận logic đa chiều.
- Phân tích nguyên nhân gốc rễ, đối chiếu các phương án giải pháp.
- Đưa ra kết luận có cơ sở khoa học và khuyến nghị hành động cụ thể.
- Xưng hô lịch thiệp: TRÍ AI ULTIMATE ROBOT.`;

      let replyText = '';
      try {
        replyText = await callGemini(academicPrompt);
      } catch (e) {
        replyText = `Dạ, về yêu cầu nghiên cứu và phân tích chuyên sâu cho "${message}":\n\n` +
          `Dưới góc nhìn khoa học và tư duy hệ thống, vấn đề này cần được bóc tách từ nhiều khía cạnh cấu thành.${assocText}\n\n` +
          `📌 **Khuyến nghị chuyên môn:** Cần xác định rõ các ràng buộc mục tiêu và nguồn lực trước khi đưa ra quyết định tối ưu cuối cùng.`;
      }

      return ResponseEngine.formatResponse({
        replyText,
        revealCatalog: false,
        recommendedField: null,
        recommendedProduct: null,
        stage: 'DOCTOR_RESEARCH_RESOLVED',
        citations,
        toolsUsed,
        confidenceTag: 'DOCTOR_LEVEL_SYNTHESIZED'
      });
    }

    // 0B. Live Website Retrieval
    if (isLiveWebSearch && !isDocExplicitQuery && !isExcelQuery) {
      toolsUsed.push('live_website_retrieval');
      const liveRes = await ToolOrchestrator.executeLiveWebSearch(slots.productName || message, { orgId });
      if (liveRes.status === 'SUCCESS' && liveRes.result?.product) {
        const prod = liveRes.result.product;
        const liveCitation = prod.productUrl ? [{
          source: 'live_website',
          url: prod.productUrl,
          label: `[Website: ${prod.name}]`
        }] : [];

        return ResponseEngine.formatResponse({
          replyText: `Dạ, tôi đã tra cứu trực tiếp từ website nhà cung cấp:\n\n**${prod.name}**\n- Giá tham khảo: **${Number(prod.salePrice || prod.price || 0).toLocaleString('vi-VN')} đ**\n- Hãng sản xuất: ${prod.brand || 'Chính hãng'}\n${prod.productUrl ? `- Link sản phẩm xác thực: ${prod.productUrl}` : ''}\n\nBạn có muốn tôi hỗ trợ lập bảng báo giá chính thức cho sản phẩm này không ạ?`,
          revealCatalog: true,
          recommendedField: prod.category || null,
          recommendedProduct: prod,
          stage: 'CONSULTING',
          citations: liveCitation,
          toolsUsed,
          confidenceTag: 'LIVE_WEBSITE_EXTRACTED'
        });
      }
    }

    // 0C. Formal Quotation Engine Routing (Section VI - Cơ Chế Báo Giá)
    if (isQuotationRequest && !isDocExplicitQuery && !isExcelQuery) {
      toolsUsed.push('generate_formal_quotation');
      const qtyMatch = message.match(/\b(\d+)\s*(máy|cái|chiếc|bộ|sp|sản phẩm)?/i);
      const qty = slots.quantity || (qtyMatch ? parseInt(qtyMatch[1]) : 1);

      const quoteExec = await ToolOrchestrator.executeQuotation({
        productName: slots.productName,
        ordinal: slots.targetOrdinal || slots.ordinal,
        quantity: qty,
        customerInfo,
        conversationId,
        selectedProduct,
        db
      });

      if (quoteExec?.status === 'NEED_CLARIFICATION' || quoteExec?.result?.status === 'NEED_CLARIFICATION') {
        const clarMsg = quoteExec.result?.message || quoteExec.message;
        const resp = ResponseEngine.formatResponse({
          replyText: clarMsg,
          stage: 'CONSULTING',
          toolsUsed,
          confidenceTag: 'CLARIFICATION_REQUIRED'
        });
        await this._persistAssistantMessage(conversationId, resp.reply, null);
        return resp;
      }

      if (quoteExec?.status === 'PRICE_UNVERIFIED' || quoteExec?.result?.status === 'PRICE_UNVERIFIED') {
        const unverifiedMsg = quoteExec.result?.message || quoteExec.message;
        const resp = ResponseEngine.formatResponse({
          replyText: unverifiedMsg,
          stage: 'CONSULTING',
          toolsUsed,
          confidenceTag: 'PRICE_UNVERIFIED'
        });
        await this._persistAssistantMessage(conversationId, resp.reply, null);
        return resp;
      }

      if (quoteExec?.status === 'SUCCESS' && (quoteExec.result?.quote || quoteExec.quote)) {
        const primaryProd = quoteExec.result?.product || quoteExec.product;
        const quote = quoteExec.result?.quote || quoteExec.quote;
        const resp = ResponseEngine.formatResponse({
          replyText: `Dạ em xin gửi bảng báo giá chính thức cho **${primaryProd.name}** (Số lượng: ${qty} ${primaryProd.unit || 'cái'}) theo thông tin từ kho nhà cung cấp ạ:\n\n${quote.markdown}`,
          revealCatalog: true,
          recommendedField: primaryProd.category || null,
          recommendedProduct: primaryProd,
          stage: 'CONSULTING',
          requiresInput: null,
          suggestedActions: [
            { id: 'confirm_order', label: 'Xác nhận đặt hàng theo báo giá' },
            { id: 'adjust_qty', label: 'Thay đổi số lượng hoặc cấu hình' }
          ],
          citations: [{
            source: 'quotation_engine',
            label: `[Mã báo giá: ${quote.quoteCode}]`
          }],
          toolsUsed,
          confidenceTag: 'FORMAL_QUOTATION_GENERATED'
        });
        await this._persistAssistantMessage(conversationId, resp.reply, primaryProd);
        return resp;
      }
    }

    // 1. Explicit Internal Corporate Document Query (RAG KNOWLEDGE BASE)
    // TUYỆT ĐỐI CHỈ KHI NGƯỜI DÙNG HỎI RÕ VỀ TÀI LIỆU, QUY TRÌNH, QUY CHẾ, VĂN BẢN NỘI BỘ
    if (isDocExplicitQuery) {
      toolsUsed.push('search_knowledge_base');
      const ragChunks = await RagService.searchKnowledge({
        query: message,
        orgId,
        limit: 4
      });

      if (ragChunks.length > 0) {
        intermediateContext += '\n[Kiến thức từ Kho Tài liệu]:\n' + ragChunks.map(c => `${c.citationLabel}\n${c.content}`).join('\n\n');
        ragChunks.forEach(c => {
          citations.push({
            source: 'knowledge_doc',
            documentId: c.documentId,
            docTitle: c.docTitle,
            pageNumber: c.pageNumber,
            sheetName: c.sheetName,
            label: c.citationLabel
          });
        });
      }

      const docInstruction = `Bạn là TRÍ AI ULTIMATE ROBOT – trợ lý AI thông minh hỗ trợ tra cứu tài liệu quy chuẩn và quy trình nội bộ.
Nguyên tắc:
- Dựa vào nội dung tài liệu trích dẫn để giải đáp chính xác, khách quan.
- Dẫn kèm nguồn trích dẫn theo nhãn [Nguồn: ...].
- Nếu tài liệu không có thông tin về câu hỏi của người dùng, trả lời trung thực rằng tài liệu hiện có chưa có quy định về nội dung này.
- Tuyệt đối không đề cập đến việc bán hàng hay sản phẩm thương mại khi đang trả lời về văn bản nội bộ.
- Tuyệt đối không xưng hô "của Quang Nhựt Trí" hay "của anh Quang Nhựt Trí". Chỉ xưng là TRÍ AI ULTIMATE ROBOT.`;

      const prompt = `${docInstruction}\n\n${intermediateContext ? `Dữ liệu tham khảo tra cứu được:\n${intermediateContext}\n\n` : ''}Câu hỏi của người dùng: "${message}"`;

      let replyText = '';
      try {
        replyText = await callGemini(prompt);
      } catch (e) {
        replyText = intermediateContext 
          ? `Dạ, tôi đã tra cứu được quy định liên quan đến "${message}" trong kho tài liệu nội bộ:\n\n${ragChunks.slice(0, 2).map(c => c.content).join('\n\n')}`
          : `Dạ hiện tại trong kho tài liệu nội bộ chưa có thông tin quy định cụ thể về "${message}" ạ.`;
      }

      const filteredCitations = citations.filter(c => !c.url?.includes('duckduckgo.com') && !c.label?.toLowerCase().includes('duckduckgo'));
      if (filteredCitations.length > 0) {
        await RagService.logCitations(conversationId, randomUUID(), filteredCitations);
      }

      return ResponseEngine.formatResponse({
        replyText,
        revealCatalog: false,
        recommendedField: null,
        recommendedProduct: null,
        stage: 'KNOWLEDGE_CONSULTATION',
        citations: filteredCitations,
        toolsUsed
      });
    }

    // 2. Excel Query Tool
    if (isExcelQuery) {
      toolsUsed.push('query_excel_data');
      const excelRes = await ExcelParser.queryData({
        filterVal: message
      });
      if (excelRes.success && excelRes.dataPreview?.length > 0) {
        intermediateContext += `\n[Dữ liệu Excel tìm thấy từ Sheet "${excelRes.sheetName}"]:\n` + JSON.stringify(excelRes.dataPreview.slice(0, 5));
        citations.push({
          source: 'excel_sheet',
          sheetName: excelRes.sheetName,
          label: `[Bảng tính: ${excelRes.sheetName}]`
        });
      }

      const excelInstruction = `Bạn là TRÍ AI ULTIMATE ROBOT – trợ lý AI thông minh hỗ trợ tính toán và phân tích bảng tính Excel.
Nguyên tắc:
- Dựa trên dữ liệu bảng tính trích xuất để trả lời chính xác, mạch lạc.
- Dẫn kèm nguồn trích dẫn theo nhãn [Bảng tính: ...].
- Tuyệt đối không bịa đặt số liệu tài chính.
- Tuyệt đối không xưng hô "của Quang Nhựt Trí" hay "của anh Quang Nhựt Trí". Chỉ xưng là TRÍ AI ULTIMATE ROBOT.`;

      const prompt = `${excelInstruction}\n\n${intermediateContext ? `Dữ liệu tham khảo tra cứu được:\n${intermediateContext}\n\n` : ''}Câu hỏi của người dùng: "${message}"`;

      let replyText = '';
      try {
        replyText = await callGemini(prompt);
      } catch (e) {
        replyText = `Dạ, kết quả tra cứu bảng tính cho câu hỏi "${message}":\n\n${JSON.stringify(excelRes.dataPreview?.slice(0, 5) || {})}`;
      }

      return ResponseEngine.formatResponse({
        replyText,
        revealCatalog: false,
        recommendedField: null,
        recommendedProduct: null,
        stage: 'EXCEL_QUERY',
        citations,
        toolsUsed
      });
    }

    // 3. Web Search ONLY if user explicitly requested external internet lookups
    if (isWebSearch) {
      const webRes = await WebSearchService.search(message, 3);
      const cleanResults = (webRes.results || []).filter(r => r.url && !r.url.includes('duckduckgo.com'));
      if (cleanResults.length > 0) {
        toolsUsed.push('search_web_internet');
        intermediateContext += '\n[Tra cứu Internet]:\n' + cleanResults.map(r => `- ${r.title}: ${r.snippet} (${r.url})`).join('\n');
        cleanResults.forEach(r => {
          citations.push({
            source: 'web_search',
            title: r.title,
            url: r.url,
            label: `[Internet: ${r.title}]`
          });
        });
      }

      const webInstruction = `Bạn là TRÍ AI ULTIMATE ROBOT – trợ lý AI thông minh tra cứu thông tin Internet.
Nguyên tắc:
- Trả lời bằng tiếng Việt lịch sự, thông minh, chuyên nghiệp, súc tích.
- Khi có dữ liệu trích dẫn được cung cấp, hãy tổng hợp câu trả lời chính xác và dẫn kèm nguồn theo nhãn [Nguồn: ...].
- Tuyệt đối không dẫn nguồn duckduckgo hoặc các đường link tìm kiếm rác.
- Tuyệt đối không xưng hô "của Quang Nhựt Trí" hay "của anh Quang Nhựt Trí". Chỉ xưng là TRÍ AI ULTIMATE ROBOT.`;

      const prompt = `${webInstruction}\n\n${intermediateContext ? `Dữ liệu tham khảo tra cứu được:\n${intermediateContext}\n\n` : ''}Câu hỏi của người dùng: "${message}"`;

      let replyText = '';
      try {
        replyText = await callGemini(prompt);
      } catch (e) {
        replyText = `Dạ, tôi đã tra cứu internet về "${message}" nhưng chưa tìm thấy kết quả phù hợp.`;
      }

      const filteredCitations = citations.filter(c => !c.url?.includes('duckduckgo.com') && !c.label?.toLowerCase().includes('duckduckgo'));
      return ResponseEngine.formatResponse({
        replyText,
        revealCatalog: false,
        recommendedField: null,
        recommendedProduct: null,
        stage: 'WEB_SEARCH',
        citations: filteredCitations,
        toolsUsed
      });
    }

    // 3B. TRÍ AN SMART SALES CONSULTANT (LEVEL 2.0 - PROMPT 04)
    // Phục vụ: Yêu cầu gặp nhân viên, Chính sách bảo hành/giao hàng, So sánh sản phẩm, Tra cứu cấu hình & Đặt hàng
    const unaccentedMsg = IntentEngine.stripDiacritics(message).toLowerCase();

    // 3B.1. STAFF HANDOFF: Chuyển nhân viên hỗ trợ khi vượt khả năng hoặc khách yêu cầu
    if (primaryIntent === 'STAFF_HANDOFF' || SmartSalesConsultant.isStaffHandoff(unaccentedMsg)) {
      toolsUsed.push('smart_staff_handoff');
      return await SmartSalesConsultant.handleStaffHandoff({
        message,
        conversationId,
        customerInfo,
        extractedPhone: slots.phone || slots.extractedPhone,
        orgId
      });
    }

    // 3B.2. POLICY INQUIRY: Chính sách bảo hành, đổi trả, giao hàng (Có căn cứ DB, không bịa)
    if (primaryIntent === 'POLICY_INQUIRY' || SmartSalesConsultant.isPolicyInquiry(unaccentedMsg)) {
      toolsUsed.push('smart_policy_inquiry');
      const allActiveProds = await db.all('SELECT * FROM products WHERE is_active = 1');
      return await SmartSalesConsultant.handlePolicyInquiry({
        message,
        normMessage: unaccentedMsg,
        conversationId,
        allProducts: allActiveProds,
        customerInfo
      });
    }

    // 3B.3. ORDER REQUEST: Khách yêu cầu mua ngay / đặt hàng
    if (primaryIntent === 'ORDER_REQUEST' || SmartSalesConsultant.isOrderRequest(unaccentedMsg)) {
      toolsUsed.push('smart_order_flow');
      const allActiveProds = await db.all('SELECT * FROM products WHERE is_active = 1');
      return await SmartSalesConsultant.handleOrderRequest({
        message,
        conversationId,
        selectedProduct,
        customerInfo,
        extractedPhone: slots.phone || slots.extractedPhone,
        allProducts: allActiveProds,
        orgId
      });
    }

    // 3B.4. PRODUCT COMPARISON: So sánh sản phẩm khách quan, không ép thành tên sản phẩm thiếu
    if (primaryIntent === 'PRODUCT_COMPARISON' || SmartSalesConsultant.isComparison(unaccentedMsg)) {
      toolsUsed.push('smart_product_comparison');
      const allActiveProds = await db.all('SELECT * FROM products WHERE is_active = 1');
      return await SmartSalesConsultant.handleComparison({
        message,
        normMessage: unaccentedMsg,
        allProducts: allActiveProds,
        conversationContextField: null
      });
    }

    // 3B.5. PRECISION SPEC SEARCH: Tra cứu cấu hình chi tiết (RAM 16GB, in 2 mặt, 144Hz)
    if (SmartSalesConsultant.isSpecSearch(unaccentedMsg) && !slots.isBroadCategory) {
      toolsUsed.push('smart_spec_search');
      const allActiveProds = await db.all('SELECT * FROM products WHERE is_active = 1');
      return await SmartSalesConsultant.handleSpecSearch({
        message,
        normMessage: unaccentedMsg,
        allProducts: allActiveProds
      });
    }

    // 3B.5C. UNIVERSAL SALES CONSULTANT: PAGINATION & VIEW ALL (PHẦN V)
    const isPaginationReq = primaryIntent === 'PAGINATION_NEXT' ||
      /(?:gui\s+tiep|xem\s+tiep|tiep\s+tuc|gui\s+them|cho\s+xem\s+tiep|5\s+mau\s+tiep\s+theo|5\s+san\s+pham\s+tiep\s+theo|gui\s+tiep\s+5\s+mau|xem\s+tiep\s+5\s+san\s+pham|mau\s+tiep|trang\s+sau|trang\s+tiep|gui\s+5\s+mau\s+tiep|gui\s+5\s+mau\s+nua|ok\s+gui\s+tiep|dong\s+y\s+gui\s+tiep)\b/i.test(unaccentedMsg);

    const isViewAllReq = primaryIntent === 'VIEW_ALL_PRODUCTS' ||
      /(?:cho\s+anh\s+xem\s+tat\s+ca|cho\s+toi\s+xem\s+tat\s+ca|xem\s+tat\s+ca|gui\s+het\s+danh\s+sach|gui\s+het|co\s+nhung\s+mau\s+nao|tham\s+khao\s+toan\s+bo|xem\s+toan\s+bo|xem\s+het|toan\s+bo\s+danh\s+muc)\b/i.test(unaccentedMsg);

    if (isPaginationReq || isViewAllReq) {
      toolsUsed.push('universal_sales_consultant_pagination');
      return await UniversalSalesConsultant.consultSales({
        message,
        conversationId,
        userContext,
        slots,
        intentResult,
        customerInfo,
        selectedProduct,
        orgId
      });
    }

    // 3B.5B. UNKNOWN MODEL CODE GUARD: Prevent hallucinating when customer asks for a non-existent model
    if (slots.modelCode) {
      const codeClean = slots.modelCode.replace(/[-_\s]/g, '').toLowerCase();
      const allActiveProds = await db.all('SELECT * FROM products WHERE is_active = 1');
      const modelExists = allActiveProds.some(p => {
        const nClean = (p.name || '').replace(/[-_\s]/g, '').toLowerCase();
        const sClean = (p.sku || '').replace(/[-_\s]/g, '').toLowerCase();
        return nClean.includes(codeClean) || sClean.includes(codeClean);
      });
      if (!modelExists) {
        toolsUsed.push('unknown_model_guard', 'learning_capture_engine');
        let missingName = slots.modelCode;
        if (slots.brand && !missingName.toUpperCase().includes(slots.brand.toUpperCase())) {
          missingName = `${slots.brand} ${slots.modelCode}`;
        } else if (slots.productName) {
          const cleanP = slots.productName.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim();
          missingName = cleanP ? `${cleanP} ${slots.modelCode}` : `mẫu ${slots.modelCode}`;
        } else {
          missingName = `mẫu ${slots.modelCode}`;
        }
        const relatedProd = allActiveProds.find(p => slots.categoryDomain ? p.field === slots.categoryDomainName : p.field === 'CONG NGHE' || p.field === 'MAY TINH XACH TAY') || allActiveProds[0];

        try {
          await LearningCaptureEngine.recordGap({
            unansweredQuestion: message,
            aiResponse: `Dạ hiện tại sản phẩm ${missingName} chưa tìm thấy trong dữ liệu của shop ạ.`,
            conversationId,
            reason: 'MODEL_NOT_FOUND',
            relatedTopic: slots.categoryDomainName || 'Sản phẩm',
            relatedProductName: missingName,
            orgId
          });
        } catch (_) {}

        const reply = `Dạ hiện tại sản phẩm **${missingName}** chưa tìm thấy trong dữ liệu của shop ạ.\n\n` +
          `Bạn vui lòng để lại **Số điện thoại** để nhân viên bên em liên hệ lại hỗ trợ kiểm tra nguồn hàng kho và báo giá sớm nhất nhé ạ.\n\n` +
          (relatedProd ? `Đồng thời, hiện tại bên em đang có sản phẩm tương tự có thể phù hợp với nhu cầu của mình là **${relatedProd.name}** (Giá niêm yết: **${SmartSalesConsultant.formatPrice(relatedProd.price)}**). Thông tin chi tiết đã được mở sẵn ở **Cột 2**, bạn có thể tham khảo thêm nhé ạ!` : `Đồng thời, toàn bộ danh mục sản phẩm hiện có của shop đã được mở sẵn ở **Cột 2**, bạn có thể tham khảo thêm nhé ạ!`);

        return ResponseEngine.formatResponse({
          replyText: reply,
          revealCatalog: true,
          recommendedField: relatedProd ? relatedProd.field : null,
          recommendedProduct: relatedProd || null,
          stage: 'MISSING_PRODUCT_CAPTURED',
          toolsUsed
        });
      }
    }

    // 3B.6. GROUNDED PRICE INQUIRY: Báo giá niêm yết chính xác từ Database khi khách hỏi giá cụ thể
    if (primaryIntent === 'PRICE_INQUIRY' || /(gia bao nhieu|bao nhieu tien|may tien)\b/i.test(unaccentedMsg)) {
      const allActiveProds = await db.all('SELECT * FROM products WHERE is_active = 1');
      let targetProd = null;
      if (slots.modelCode) {
        targetProd = allActiveProds.find(p => p.name.toUpperCase().includes(slots.modelCode) || (p.sku && p.sku.toUpperCase().includes(slots.modelCode)));
      }
      if (!targetProd && slots.productName) {
        const pClean = slots.productName.toLowerCase();
        targetProd = allActiveProds.find(p => p.name.toLowerCase().includes(pClean) || pClean.includes((p.name || '').toLowerCase()));
      }
      if (!targetProd && selectedProduct) {
        targetProd = selectedProduct;
      }
      if (targetProd) {
        toolsUsed.push('grounded_price_inquiry');
        const formattedPrice = SmartSalesConsultant.formatPrice(targetProd.price);
        const isFood = SmartSalesConsultant.isFoodOrBeverageProduct(targetProd);
        const guaranteeLine = isFood
          ? `🛡️ **Cam kết:** Chính hãng 100%, Date mới nhất (Hỗ trợ 1 đổi 1 trong 7 ngày nếu lỗi NSX hoặc bao bì).`
          : `🛡️ **Bảo hành:** Chính hãng **${targetProd.warranty_months || 12} tháng** (1 đổi 1 trong 7 ngày đầu nếu lỗi NSX).`;
        const reply = `Dạ, giá niêm yết chính thức của sản phẩm **${targetProd.name}** tại shop hiện là **${formattedPrice}** ạ.\n\n${guaranteeLine}\n📦 **Tình trạng:** **Có sẵn tại kho**, sẵn sàng giao ngay.\n\nToàn bộ thông số chi tiết và hình ảnh đã được mở sẵn ở **Cột 2**, bạn có thể tự xem chi tiết ở Cột 2 nhé ạ!\n\nBạn có muốn em hỗ trợ đặt mua hay tư vấn thêm ưu đãi cho sản phẩm này không ạ?`;
        return ResponseEngine.formatResponse({
          replyText: reply,
          revealCatalog: true,
          recommendedField: targetProd.field,
          recommendedProduct: targetProd,
          stage: 'PRICE_QUOTED',
          citations: [{
            source: 'official_price_list',
            label: `[Giá niêm yết: ${targetProd.name}]`
          }],
          toolsUsed
        });
      }
    }

    // 4. BÁN HÀNG & TƯ VẤN SẢN PHẨM & CHAT SHOP (CORE DEFAULT CHO TOÀN BỘ CÂU HỎI CÒN LẠI)
    // TUYỆT ĐỐI KHÔNG LÔI KÉO TÀI LIỆU NỘI BỘ, QUY CHẾ VÀO BÁN HÀNG!
    toolsUsed.push('consult_sales_engine');
    const salesResult = await SalesEngineAdapter.processMessage({
      conversationId,
      message,
      selectedProduct,
      actionType,
      customerInfo,
      clientDevice,
      orgId
    });

    const finalRes = ResponseEngine.formatResponse({
      replyText: salesResult.reply,
      revealCatalog: salesResult.revealCatalog || false,
      recommendedField: salesResult.recommendedField || null,
      recommendedProduct: salesResult.recommendedProduct || null,
      stage: salesResult.stage || 'IDLE',
      actionType: salesResult.actionType || actionType || null,
      isResetPrompt: Boolean(salesResult.isResetPrompt),
      requiresInput: salesResult.requiresInput || null,
      suggestedActions: salesResult.suggestedActions || [],
      orderInfo: salesResult.orderInfo || null,
      orderFlow: salesResult.orderFlow || null,
      leadCreated: salesResult.leadCreated || null,
      leadCaptured: salesResult.leadCaptured || false,
      products: salesResult.products || [],
      citations: [],
      toolsUsed,
      intentResult,
      message
    });

    // Log gap to TRÍ AN Learning Center if quality gap detected
    const cleanTurnMsg = (message || '').trim();
    try {
      await LearningCaptureEngine.inspectAndLogTurn({
        conversationId,
        message: cleanTurnMsg,
        aiResponse: finalRes.reply || '',
        intentResult,
        productMatch: salesResult.productMatch || null,
        disambiguation: null,
        stage: finalRes.stage,
        toolsUsed,
        customerInfo
      });
    } catch (err) {
      console.error('[LEARNING CAPTURE HOOK ERROR]:', err.message);
    }

    return finalRes;
  }

  /**
   * Native OpenAI Tool Calling implementation
   */
  static async runOpenAiCentralBrain(context) {
    const { message, conversationId, selectedProduct, actionType, customerInfo, clientDevice, orgId } = context;
    const apiKey = process.env.OPENAI_API_KEY;
    const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    const isDocExplicitQuery = /(tài liệu|tai lieu|quy trình|quy trinh|chính sách|chinh sach|hướng dẫn|huong dan|quy chế|quy che|quyết định|quyet dinh|điều chuyển|dieu chuyen|nam a bank|namabank|thủ tục|thu tuc|công văn|cong van|văn bản|van ban|nội bộ|noi bo|sổ tay|so tay|quy định|quy dinh|hồ sơ|ho so)/i.test(message);

    const systemPrompt = `Bạn là TRÍ AI ULTIMATE ROBOT – trợ lý AI thông minh & bán hàng toàn năng.
Bạn có quyền truy cập các công cụ:
1. consult_sales_engine: Tư vấn sản phẩm, tồn kho, kiểm tra danh mục và chốt đơn mua hàng.
2. lookup_supplier_products: Tra cứu sản phẩm, thông số kỹ thuật và đơn giá từ kho nhà cung cấp đã thu thập và kiểm duyệt.
3. live_website_retrieval: Truy xuất trực tiếp trang sản phẩm từ website nhà cung cấp theo thời gian thực.
4. generate_formal_quotation: Khởi tạo bảng báo giá chính thức kèm mã báo giá, bảng tính chi tiết, VAT 10% và ghi rõ nguồn giá khi khách hàng hỏi hoặc xin báo giá.
${isDocExplicitQuery ? '5. search_knowledge_base: Tra cứu kho tài liệu quy chuẩn, sổ tay quy trình, chính sách nội bộ (quy chế, văn bản pháp quy).\n' : ''}6. query_excel_data: Tính toán và truy vấn số liệu chính xác trên các bảng tính Excel/CSV.
7. search_web_internet: Tra cứu thông tin trên Internet khi được yêu cầu.
QUY TẮC BẮT BUỘC:
- Khi khách hàng tìm hiểu, hỏi mua sản phẩm, hỏi giá, báo giá hoặc trò chuyện mua sắm, BÁN HÀNG LÀ ƯU TIÊN DUY NHẤT. TUYỆT ĐỐI KHÔNG lôi kéo nội dung tài liệu nội bộ (như quy chế ngân hàng, văn bản công văn) vào câu trả lời bán hàng!
- Tuyệt đối không xưng hô "của Quang Nhựt Trí" hay "của anh Quang Nhựt Trí". Chỉ tự xưng là TRÍ AI ULTIMATE ROBOT.`;

    const historyTurns = (await ContextEngine.getConversationHistory(conversationId, 6))
      .map(h => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.content }));

    const messages = [
      { role: 'system', content: systemPrompt },
      ...historyTurns,
      { role: 'user', content: message }
    ];

    const isQuotation = /(báo giá|bao gia|lập báo giá|lap bao gia|xin báo giá|bảng báo giá|bang bao gia)/i.test(message);
    let toolChoice = 'auto';
    if (isQuotation) {
      toolChoice = { type: 'function', function: { name: 'generate_formal_quotation' } };
    }

    const availableTools = isDocExplicitQuery
      ? CENTRAL_BRAIN_TOOLS
      : CENTRAL_BRAIN_TOOLS.filter(t => t.function?.name !== 'search_knowledge_base');

    // Initial tool calling request
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        tools: availableTools,
        tool_choice: toolChoice,
        temperature: 0.5
      })
    });

    if (!res.ok) {
      throw new Error(`OpenAI HTTP ${res.status}`);
    }

    const data = await res.json();
    const responseMsg = data.choices?.[0]?.message;
    if (!responseMsg) {
      throw new Error('Empty response from OpenAI');
    }

    const toolsUsed = [];
    let uiDirectives = {};
    const citations = [];

    // If model decided to call tools
    if (responseMsg.tool_calls && responseMsg.tool_calls.length > 0) {
      messages.push(responseMsg);

      for (const tCall of responseMsg.tool_calls) {
        const fnName = tCall.function.name;
        const args = JSON.parse(tCall.function.arguments || '{}');
        toolsUsed.push(fnName);

        let toolResultStr = '';

        if (fnName === 'consult_sales_engine') {
          const salesExec = await SalesEngineAdapter.executeAsTool(args, context);
          uiDirectives = salesExec.uiDirectives || {};
          toolResultStr = JSON.stringify(salesExec.toolResponseForLLM);
        } else if (fnName === 'search_knowledge_base') {
          const kResults = await RagService.searchKnowledge({
            query: args.search_query,
            orgId,
            scope: args.knowledge_scope || 'all'
          });
          kResults.forEach(c => citations.push(c));
          toolResultStr = JSON.stringify(kResults);
        } else if (fnName === 'lookup_supplier_products') {
          const sResults = await QuotationService.searchSupplierCatalog({
            query: args.query,
            category: args.category,
            brand: args.brand,
            maxPrice: args.max_price
          });
          toolResultStr = JSON.stringify(sResults);
          if (sResults.length > 0) {
            uiDirectives.revealCatalog = true;
            uiDirectives.recommendedProduct = sResults[0];
            uiDirectives.recommendedField = sResults[0].category;
          }
        } else if (fnName === 'live_website_retrieval') {
          const lwRes = await LiveWebsiteRetrieval.searchLiveProduct(args.product_query, { orgId });
          toolResultStr = JSON.stringify(lwRes);
          if (lwRes.success && lwRes.product) {
            uiDirectives.revealCatalog = true;
            uiDirectives.recommendedProduct = lwRes.product;
            uiDirectives.recommendedField = lwRes.product.category;
            if (lwRes.product.productUrl) {
              citations.push({
                source: 'live_website',
                url: lwRes.product.productUrl,
                label: `[Website: ${lwRes.product.name}]`
              });
            }
          }
        } else if (fnName === 'generate_formal_quotation') {
          const resolvedProd = await ActiveProductContext.resolveForQuotation({
            conversationId,
            explicitProductName: args.product_name,
            requestedQuantity: args.quantity || 1,
            selectedProduct,
            database: db
          });

          if (resolvedProd.status === 'NEED_CLARIFICATION' || resolvedProd.status === 'PRICE_UNVERIFIED') {
            toolResultStr = JSON.stringify({
              status: resolvedProd.status,
              message: resolvedProd.message,
              quoteCode: null
            });
          } else {
            const p = resolvedProd.product;
            const qRes = await QuotationService.createQuotation({
              customerName: args.customer_name || customerInfo?.name || 'Quý Khách Hàng',
              customerPhone: args.customer_phone || customerInfo?.phone || '',
              customerCompany: customerInfo?.company || '',
              conversationId,
              items: [{
                productId: p.id,
                productName: p.name,
                sku: p.sku || '',
                specsSnippet: p.configuration || '',
                quantity: p.quantity || args.quantity || 1,
                unit: p.unit || 'cái',
                unitPrice: p.price,
                priceType: p.priceType || 'REFERENCE_ONLY'
              }],
              vatPercent: 10
            });

            uiDirectives.revealCatalog = true;
            uiDirectives.recommendedProduct = p;
            citations.push({
              source: 'quotation_engine',
              label: `[Mã báo giá: ${qRes.quoteCode}]`
            });
            toolResultStr = JSON.stringify({
              quoteCode: qRes.quoteCode,
              totalAmount: qRes.subtotal,
              vatAmount: qRes.vatAmount,
              finalAmount: qRes.finalAmount,
              validUntil: qRes.validUntil,
              markdownTable: qRes.markdown
            });
          }
        } else if (fnName === 'query_excel_data') {
          const xResults = await ExcelParser.queryData(args);
          toolResultStr = JSON.stringify(xResults);
          if (xResults.sheetName) {
            citations.push({ label: `[Bảng tính: ${xResults.sheetName}]` });
          }
        } else if (fnName === 'search_web_internet') {
          const wResults = await WebSearchService.search(args.query);
          toolResultStr = JSON.stringify(wResults);
        }

        messages.push({
          role: 'tool',
          tool_call_id: tCall.id,
          content: toolResultStr
        });
      }

      // Second call to get final synthesized response
      const followUpRes = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.5
        })
      });

      const followUpData = await followUpRes.json();
      const rawFinalReply = followUpData.choices?.[0]?.message?.content || responseMsg.content;
      const cleanedReply = sanitizeAiResponse(rawFinalReply);
      const filteredCitations = citations.filter(c => !c.url?.includes('duckduckgo.com') && !c.label?.toLowerCase().includes('duckduckgo'));

      return {
        success: true,
        reply: cleanedReply,
        revealCatalog: uiDirectives.revealCatalog || false,
        recommendedField: uiDirectives.recommendedField || null,
        recommendedProduct: uiDirectives.recommendedProduct || null,
        stage: uiDirectives.stage || 'CENTRAL_BRAIN_RESOLVED',
        requiresInput: uiDirectives.requiresInput || null,
        suggestedActions: uiDirectives.suggestedActions || [],
        orderInfo: uiDirectives.orderInfo || null,
        leadCaptured: uiDirectives.leadCaptured || false,
        citations: filteredCitations,
        toolsUsed
      };
    }

    // Direct answer with no tools needed
    return {
      success: true,
      reply: sanitizeAiResponse(responseMsg.content),
      revealCatalog: false,
      recommendedField: null,
      recommendedProduct: null,
      stage: 'IDLE',
      citations: [],
      toolsUsed: []
    };
  }
}

export default CentralBrainService;
