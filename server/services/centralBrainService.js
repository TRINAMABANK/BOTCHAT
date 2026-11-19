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

/**
 * Tool Specifications for Central Brain Function Calling
 */
export const CENTRAL_BRAIN_TOOLS = [
  // 1. Sales Engine Tool
  SALES_ENGINE_TOOL_DEFINITION,

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
    const isWebSearch = lower.includes('tin tuc') || lower.includes('thoi tiet') || lower.includes('internet') || lower.includes('tim tren mang');

    // 1. Always evaluate RAG Knowledge Base early so ingested documents are accessible
    const ragChunks = await RagService.searchKnowledge({
      query: message,
      orgId,
      limit: 4
    });

    const hasStrongRagMatch = ragChunks.length > 0 && (ragChunks[0].score >= 1.5 || isDocExplicitQuery);

    const isSales = (SalesEngineAdapter.isSalesInquiry(message) || Boolean(selectedProduct) || Boolean(actionType)) && !hasStrongRagMatch && !isDocExplicitQuery;

    // 2. Sales Engine Priority (bảo toàn nghiệp vụ bán hàng & Cột 2 khi hỏi sản phẩm/đặt hàng)
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

    // 4. Web Search if needed
    if (isWebSearch || (!isSales && ragChunks.length === 0 && !isExcelQuery)) {
      const webRes = await WebSearchService.search(message, 3);
      if (webRes.results?.length > 0) {
        toolsUsed.push('search_web_internet');
        intermediateContext += '\n[Tra cứu Internet]:\n' + webRes.results.map(r => `- ${r.title}: ${r.snippet} (${r.url})`).join('\n');
        webRes.results.forEach(r => {
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
- Tuyệt đối không bịa đặt số liệu tài chính hoặc bảng giá.`;

    const prompt = `${systemInstruction}\n\n${intermediateContext ? `Dữ liệu tham khảo tra cứu được:\n${intermediateContext}\n\n` : ''}Câu hỏi của người dùng: "${message}"`;

    let replyText = '';
    try {
      replyText = await callGemini(prompt);
    } catch (e) {
      replyText = `Dạ, tôi là TRÍ AI ULTIMATE ROBOT. Tôi đã ghi nhận câu hỏi của bạn về "${message}". ${intermediateContext ? 'Tôi đã tra cứu được các thông tin liên quan và sẵn sàng hỗ trợ bạn chi tiết.' : 'Bạn cần tôi hỗ trợ cụ thể thêm điều gì ạ?'}`;
    }

    // Log citations
    if (citations.length > 0) {
      await RagService.logCitations(conversationId, randomUUID(), citations);
    }

    return {
      success: true,
      reply: replyText,
      revealCatalog: false,
      recommendedField: null,
      recommendedProduct: null,
      stage: 'KNOWLEDGE_CONSULTATION',
      citations,
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
1. consult_sales_engine: Tư vấn sản phẩm, báo giá, tồn kho, kiểm tra danh mục và chốt đơn mua hàng.
2. search_knowledge_base: Tra cứu kho tài liệu quy chuẩn, sổ tay tri thức chung (Global) hoặc nội bộ doanh nghiệp.
3. query_excel_data: Tính toán và truy vấn số liệu chính xác trên các bảng tính Excel/CSV.
4. search_web_internet: Tra cứu thông tin trên Internet.
Hãy chủ động gọi đúng công cụ khi cần thiết.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message }
    ];

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
        tool_choice: 'auto',
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
      const finalReply = followUpData.choices?.[0]?.message?.content || responseMsg.content;

      return {
        success: true,
        reply: finalReply,
        revealCatalog: uiDirectives.revealCatalog || false,
        recommendedField: uiDirectives.recommendedField || null,
        recommendedProduct: uiDirectives.recommendedProduct || null,
        stage: uiDirectives.stage || 'CENTRAL_BRAIN_RESOLVED',
        requiresInput: uiDirectives.requiresInput || null,
        suggestedActions: uiDirectives.suggestedActions || [],
        orderInfo: uiDirectives.orderInfo || null,
        leadCaptured: uiDirectives.leadCaptured || false,
        citations,
        toolsUsed
      };
    }

    // Direct answer with no tools needed
    return {
      success: true,
      reply: responseMsg.content,
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
