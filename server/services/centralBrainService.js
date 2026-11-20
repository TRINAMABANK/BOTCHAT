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

  // 2. Knowledge Base Search Tool
  {
    type: 'function',
    function: {
      name: 'search_knowledge_base',
      description: 'Tra cứu tài liệu, quy trình, chính sách, sổ tay kiến thức trong kho tri thức chung (Global) hoặc kho tri thức riêng của doanh nghiệp.',
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
   * Main entry point for One Brain conversation processing
   */
  static async processChat(params = {}) {
    const {
      conversationId = `conv_${randomUUID()}`,
      message = '',
      selectedProduct = null,
      actionType = null,
      customerInfo = null,
      clientDevice = null,
      orgId = 'org_default'
    } = params;

    const trimmedMsg = (message || '').trim();
    if (!trimmedMsg) {
      return {
        success: true,
        reply: 'Dạ, tôi là TRÍ AI ULTIMATE ROBOT — Thư ký AI Toàn năng. Tôi có thể giúp gì cho bạn hôm nay ạ?',
        citations: [],
        toolsUsed: []
      };
    }

    const toolsUsed = [];
    let uiDirectives = {
      revealCatalog: false,
      recommendedField: null,
      recommendedProduct: null,
      stage: 'IDLE',
      orderInfo: null,
      leadCaptured: false
    };
    const accumulatedCitations = [];

    // Check if OpenAI Key is configured
    const openAiApiKey = process.env.OPENAI_API_KEY;
    const hasOpenAi = openAiApiKey && openAiApiKey.length > 10 && !openAiApiKey.includes('your_');

    if (hasOpenAi) {
      // -----------------------------------------------------------------------
      // PATH A: Native OpenAI Tool Calling (Central Brain)
      // -----------------------------------------------------------------------
      try {
        const brainResult = await this.runOpenAiCentralBrain({
          message: trimmedMsg,
          conversationId,
          selectedProduct,
          actionType,
          customerInfo,
          clientDevice,
          orgId
        });
        return brainResult;
      } catch (err) {
        console.warn('[CENTRAL BRAIN] OpenAI call failed, falling back to Smart Orchestrator:', err.message);
      }
    }

    // -------------------------------------------------------------------------
    // PATH B: Smart Tool Orchestrator with Gemini / Fallback Engine
    // -------------------------------------------------------------------------
    return await this.runSmartOrchestratorFallback({
      message: trimmedMsg,
      conversationId,
      selectedProduct,
      actionType,
      customerInfo,
      clientDevice,
      orgId
    });
  }

  /**
   * Smart Orchestrator Fallback Engine
   */
  static async runSmartOrchestratorFallback(context) {
    const { message, conversationId, selectedProduct, actionType, customerInfo, clientDevice, orgId } = context;
    const toolsUsed = [];
    let uiDirectives = {};
    const citations = [];
    let intermediateContext = '';

    const lower = message.toLowerCase();
    const isExcelQuery = lower.includes('excel') || lower.includes('bang tinh') || lower.includes('bảng tính') || lower.includes('tổng cộng') || lower.includes('doanh thu');
    const isDocExplicitQuery = lower.includes('tai lieu') || lower.includes('tài liệu') || lower.includes('quy trinh') || lower.includes('chinh sach') || lower.includes('hướng dẫn') || lower.includes('quy che') || lower.includes('quy chế') || lower.includes('quyet dinh') || lower.includes('quyết định') || lower.includes('dieu chuyen') || lower.includes('điều chuyển') || lower.includes('nam a bank') || lower.includes('namabank') || lower.includes('thu tuc') || lower.includes('thủ tục') || lower.includes('data upload') || lower.includes('du lieu');
    const isWebSearch = lower.includes('tin tuc') || lower.includes('thoi tiet') || lower.includes('internet') || lower.includes('tim tren mang') || lower.includes('tra cuu mang');
    const isQuotationRequest = /(báo giá|bao gia|lập báo giá|lap bao gia|xin báo giá|bảng báo giá|bang bao gia)/i.test(message);
    const isExplicitPurchase = (/\b(mua|ban|dat hang|dat mua|gia ca|gia bao nhieu|bao nhieu tien|mua ngay|san pham|tu van mau)\b/i.test(message));

    // 0A. Greeting & Conversational Routing (Polite Personal Secretary)
    const isGreeting = /^(hi|hello|chào|chao|alo|xin chào|xin chao|ê|hey|hê lô|bạn là ai|ban la ai|em là ai|em tên gì|bạn tên gì|khỏe không|khoe khong|chúc|cảm ơn|cam on|thanks|thank you|ok|oke|okie)(\s.*)?$/i.test(message.trim());
    if (isGreeting && !isQuotationRequest && !isExplicitPurchase && !isDocExplicitQuery && !isExcelQuery) {
      return {
        success: true,
        reply: 'Dạ, em chào anh/chị ạ! Em là **TRÍ AI ULTIMATE ROBOT — Thư ký AI Toàn năng của Quang Nhựt Trí**.\n\nHôm nay em có thể hỗ trợ anh/chị tra cứu tài liệu, tư vấn sản phẩm, kiểm tra tồn kho hay lập bảng báo giá nào không ạ?',
        revealCatalog: false,
        recommendedField: null,
        recommendedProduct: null,
        stage: 'GREETING',
        citations: [],
        toolsUsed: ['greeting_handler']
      };
    }

    // 0B. Formal Quotation Engine Routing (Section VI - Cơ Chế Báo Giá)
    if (isQuotationRequest && !isDocExplicitQuery && !isExcelQuery) {
      toolsUsed.push('generate_formal_quotation');
      const qtyMatch = message.match(/\b(\d+)\s*(máy|cái|chiếc|bộ|sp|sản phẩm)?/i);
      const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;

      const cleanedQuery = message
        .replace(/(cho tôi|cho e|cho em|lập|xin|cần|bảng báo giá|báo giá|bao gia|chi tiết|giúp|với|nhé|nha|\d+|máy|cái|chiếc|bộ)/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      let matchedProds = await QuotationService.searchSupplierCatalog({ query: cleanedQuery || 'máy', limit: 3 });

      if (matchedProds.length === 0) {
        const dbProds = await db.all(`
          SELECT * FROM products 
          WHERE is_active = 1 AND is_approved = 1 AND (name LIKE ? OR field LIKE ?)
          ORDER BY price ASC
          LIMIT 3
        `, [`%${cleanedQuery || ''}%`, `%${cleanedQuery || ''}%`]);

        matchedProds = dbProds.map(dp => ({
          id: dp.id,
          name: dp.name,
          sku: dp.sku || `SKU-${dp.id}`,
          brand: dp.group_name || 'Chính hãng',
          category: dp.field,
          salePrice: dp.price,
          unit: 'cái',
          priceConfirmationLevel: 'SUPPLIER_VERIFIED',
          specs: {}
        }));
      }

      if (matchedProds.length > 0) {
        const primaryProd = matchedProds[0];
        const quote = await QuotationService.createQuotation({
          customerName: customerInfo?.name || 'Quý Khách Hàng',
          customerPhone: customerInfo?.phone || '',
          customerCompany: customerInfo?.company || '',
          conversationId,
          items: [{
            productId: primaryProd.id,
            productName: primaryProd.name,
            sku: primaryProd.sku,
            quantity: qty,
            unit: primaryProd.unit || 'cái',
            unitPrice: primaryProd.salePrice,
            priceType: primaryProd.priceConfirmationLevel || 'REFERENCE_ONLY'
          }],
          vatPercent: 10
        });

        return {
          success: true,
          reply: `Dạ em xin gửi bảng báo giá chính thức cho **${primaryProd.name}** (Số lượng: ${qty} ${primaryProd.unit || 'cái'}) theo thông tin từ kho nhà cung cấp ạ:\n\n${quote.markdown}`,
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
          toolsUsed
        };
      }
    }

    // 1. Direct Sales Routing: If customer explicitly asks to purchase/inquire product and NOT asking for documents
    if (isExplicitPurchase && !isDocExplicitQuery && !isExcelQuery) {
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

      return {
        success: true,
        reply: salesResult.reply,
        revealCatalog: salesResult.revealCatalog || false,
        recommendedField: salesResult.recommendedField || null,
        recommendedProduct: salesResult.recommendedProduct || null,
        stage: salesResult.stage || 'IDLE',
        requiresInput: salesResult.requiresInput || null,
        suggestedActions: salesResult.suggestedActions || [],
        orderInfo: salesResult.orderInfo || null,
        leadCaptured: salesResult.leadCaptured || false,
        citations: [],
        toolsUsed
      };
    }

    // 2. Evaluate RAG Knowledge Base early so ingested documents are accessible
    const ragChunks = await RagService.searchKnowledge({
      query: message,
      orgId,
      limit: 4
    });

    const hasStrongRagMatch = ragChunks.length > 0 && (ragChunks[0].score >= 2.0 || isDocExplicitQuery);

    const isSales = (SalesEngineAdapter.isSalesInquiry(message) || Boolean(selectedProduct) || Boolean(actionType)) && !hasStrongRagMatch && !isDocExplicitQuery;

    // 3. Sales Engine Priority (bảo toàn nghiệp vụ bán hàng & Cột 2)
    if (isSales && !isExcelQuery && !isDocExplicitQuery && !isWebSearch) {
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

      return {
        success: true,
        reply: salesResult.reply,
        revealCatalog: salesResult.revealCatalog || false,
        recommendedField: salesResult.recommendedField || null,
        recommendedProduct: salesResult.recommendedProduct || null,
        stage: salesResult.stage || 'IDLE',
        requiresInput: salesResult.requiresInput || null,
        suggestedActions: salesResult.suggestedActions || [],
        orderInfo: salesResult.orderInfo || null,
        leadCaptured: salesResult.leadCaptured || false,
        citations: [],
        toolsUsed
      };
    }

    // 3. Excel Query Tool
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
    }

    // 4. Knowledge Base Search Tool (RAG)
    if (ragChunks.length > 0) {
      toolsUsed.push('search_knowledge_base');
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

    // 4. Web Search ONLY if user explicitly requested external internet lookups
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
    }

    // 5. Synthesize unified response with Gemini
    const systemInstruction = `Bạn là TRÍ AI ULTIMATE ROBOT — Thư ký AI Toàn năng của Quang Nhựt Trí.
Nguyên tắc:
- Trả lời bằng tiếng Việt lịch sự, thông minh, chuyên nghiệp, súc tích.
- Khi có dữ liệu trích dẫn được cung cấp, hãy tổng hợp câu trả lời chính xác và dẫn kèm nguồn theo nhãn [Nguồn: ...].
- Nếu câu hỏi chào hỏi/sức khỏe, hãy đáp lịch sự và sẵn sàng hỗ trợ.
- Tuyệt đối không dẫn nguồn duckduckgo hoặc các đường link tìm kiếm rác.
- Tuyệt đối không bịa đặt số liệu tài chính hoặc bảng giá.`;

    const prompt = `${systemInstruction}\n\n${intermediateContext ? `Dữ liệu tham khảo tra cứu được:\n${intermediateContext}\n\n` : ''}Câu hỏi của người dùng: "${message}"`;

    let replyText = '';
    try {
      replyText = await callGemini(prompt);
    } catch (e) {
      replyText = `Dạ, tôi là TRÍ AI ULTIMATE ROBOT. Tôi đã ghi nhận câu hỏi của bạn về "${message}". ${intermediateContext ? 'Tôi đã tra cứu được các thông tin liên quan và sẵn sàng hỗ trợ bạn chi tiết.' : 'Bạn cần tôi hỗ trợ cụ thể thêm điều gì ạ?'}`;
    }

    // Clean any DuckDuckGo URLs or unwanted citation patterns
    const cleanedReply = sanitizeAiResponse(replyText);
    const filteredCitations = citations.filter(c => !c.url?.includes('duckduckgo.com') && !c.label?.toLowerCase().includes('duckduckgo'));

    // Log citations
    if (filteredCitations.length > 0) {
      await RagService.logCitations(conversationId, randomUUID(), filteredCitations);
    }

    return {
      success: true,
      reply: cleanedReply,
      revealCatalog: false,
      recommendedField: null,
      recommendedProduct: null,
      stage: 'KNOWLEDGE_CONSULTATION',
      citations: filteredCitations,
      toolsUsed
    };
  }

  /**
   * Native OpenAI Tool Calling implementation
   */
  static async runOpenAiCentralBrain(context) {
    const { message, conversationId, selectedProduct, actionType, customerInfo, clientDevice, orgId } = context;
    const apiKey = process.env.OPENAI_API_KEY;
    const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    const systemPrompt = `Bạn là TRÍ AI ULTIMATE ROBOT — Thư ký AI Toàn năng của Quang Nhựt Trí.
Bạn có quyền truy cập các công cụ:
1. consult_sales_engine: Tư vấn sản phẩm tiêu biểu, tồn kho, kiểm tra danh mục và chốt đơn mua hàng.
2. lookup_supplier_products: Tra cứu sản phẩm, thông số kỹ thuật và đơn giá từ kho nhà cung cấp đã thu thập và kiểm duyệt.
3. generate_formal_quotation: Khởi tạo bảng báo giá chính thức kèm mã báo giá, bảng tính chi tiết, VAT 10% và ghi rõ nguồn giá khi khách hàng hỏi hoặc xin báo giá.
4. search_knowledge_base: Tra cứu kho tài liệu quy chuẩn, sổ tay tri thức chung (Global) hoặc nội bộ doanh nghiệp.
5. query_excel_data: Tính toán và truy vấn số liệu chính xác trên các bảng tính Excel/CSV.
6. search_web_internet: Tra cứu thông tin trên Internet.
Hãy chủ động gọi đúng công cụ khi cần thiết. Khi khách hàng hỏi xin báo giá hoặc mua hàng số lượng cụ thể, BẮT BUỘC gọi generate_formal_quotation để lập bảng báo giá chuẩn.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message }
    ];

    const isQuotation = /(báo giá|bao gia|lập báo giá|lap bao gia|xin báo giá|bảng báo giá|bang bao gia)/i.test(message);
    let toolChoice = 'auto';
    if (isQuotation) {
      toolChoice = { type: 'function', function: { name: 'generate_formal_quotation' } };
    }

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
        tools: CENTRAL_BRAIN_TOOLS,
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
        } else if (fnName === 'generate_formal_quotation') {
          let matchedProds = await QuotationService.searchSupplierCatalog({ query: args.product_name, limit: 1 });
          let unitPrice = 0;
          let prodId = null;
          let sku = '';
          let unit = 'cái';
          let priceType = 'REFERENCE_ONLY';

          if (matchedProds.length > 0) {
            const p = matchedProds[0];
            unitPrice = p.salePrice;
            prodId = p.id;
            sku = p.sku;
            unit = p.unit;
            priceType = p.priceConfirmationLevel || 'REFERENCE_ONLY';
            uiDirectives.revealCatalog = true;
            uiDirectives.recommendedProduct = p;
            uiDirectives.recommendedField = p.category;
          } else {
            const dbP = await db.get('SELECT * FROM products WHERE is_active = 1 AND is_approved = 1 AND name LIKE ?', [`%${args.product_name}%`]);
            if (dbP) {
              unitPrice = dbP.price;
              prodId = dbP.id;
              sku = dbP.sku;
              priceType = 'SUPPLIER_VERIFIED';
              uiDirectives.revealCatalog = true;
              uiDirectives.recommendedProduct = dbP;
              uiDirectives.recommendedField = dbP.field;
            }
          }

          const qRes = await QuotationService.createQuotation({
            customerName: args.customer_name || customerInfo?.name || 'Quý Khách Hàng',
            customerPhone: args.customer_phone || customerInfo?.phone || '',
            conversationId,
            items: [{
              productId: prodId,
              productName: args.product_name,
              sku,
              quantity: args.quantity || 1,
              unit,
              unitPrice,
              priceType
            }],
            vatPercent: 10
          });

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
