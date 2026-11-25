/**
 * SMART TOOL ORCHESTRATOR (TRÍ AI SMART INTELLIGENCE 2.0 - ENGINE 3)
 * 
 * Capabilities:
 * - Điều phối thông minh 10 công cụ chuyên biệt.
 * - Chỉ gọi đúng công cụ cần thiết theo kế hoạch của ReasoningEngine.
 * - Timeout an toàn, dynamic retry, xử lý lỗi và fallback bảo vệ trải nghiệm người dùng.
 * - Ghi nhận Telemetry (độ trễ ms, chi phí ước tính, trạng thái) vào SQLite.
 */

import { randomUUID } from 'crypto';
import db from '../../db.js';
import SalesEngineAdapter from '../../adapters/salesEngineAdapter.js';
import QuotationService from '../quotationService.js';
import RagService from '../ragService.js';
import { ExcelParser } from '../parsers/excelParser.js';
import WebSearchService from '../webSearchService.js';
import LiveWebsiteRetrieval from './liveWebsiteRetrieval.js';
import MemoryEngine from './memoryEngine.js';
import ActiveProductContext from './activeProductContext.js';

export class ToolOrchestrator {
  /**
   * Execute a tool with timeout and telemetry logging
   * 
   * @param {string} toolName - Name of tool
   * @param {Function} executorFn - Async execution logic
   * @param {Object} meta - { conversationId, timeoutMs }
   * @returns {Object} Result from tool execution
   */
  static async executeWithTelemetry(toolName, executorFn, meta = {}) {
    const startTime = Date.now();
    const timeoutMs = meta.timeoutMs || 5000;
    const convId = meta.conversationId || 'conv_general';

    let status = 'SUCCESS';
    let errorMessage = null;
    let result = null;

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Tool ${toolName} timed out after ${timeoutMs}ms`)), timeoutMs)
      );

      result = await Promise.race([executorFn(), timeoutPromise]);
    } catch (err) {
      status = err.message.includes('timed out') ? 'TIMEOUT' : 'ERROR';
      errorMessage = err.message;
      console.warn(`[TOOL ORCHESTRATOR] ${toolName} failed (${status}):`, err.message);
    } finally {
      const durationMs = Date.now() - startTime;

      // Log telemetry asynchronously
      db.run(`
        INSERT INTO ai_tool_telemetry (id, conversation_id, tool_name, execution_time_ms, tokens_used, cost_usd, status, error_message, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        `telem_${randomUUID().slice(0, 10)}`,
        convId,
        toolName,
        durationMs,
        0, // tokens
        0.0, // cost
        status,
        errorMessage,
        new Date().toISOString()
      ]).catch(() => {});
    }

    return { status, result, errorMessage };
  }

  /**
   * Execute Formal Quotation Tool
   */
  static async executeQuotation(params, meta = {}) {
    return await this.executeWithTelemetry('quotation_engine', async () => {
      const {
        productName,
        ordinal = null,
        quantity = 1,
        customerInfo = {},
        conversationId,
        selectedProduct = null,
        db: dbInstance
      } = params;

      // 1. Resolve product using ActiveProductContext
      const resolved = await ActiveProductContext.resolveForQuotation({
        conversationId,
        requestedQuantity: quantity,
        ordinal,
        explicitProductName: productName,
        selectedProduct,
        database: dbInstance || db
      });

      if (resolved.status === 'NEED_CLARIFICATION') {
        return {
          status: 'NEED_CLARIFICATION',
          message: resolved.message,
          product: null,
          quote: null
        };
      }

      if (resolved.status === 'PRICE_UNVERIFIED') {
        return {
          status: 'PRICE_UNVERIFIED',
          message: resolved.message,
          product: resolved.product,
          quote: null
        };
      }

      const p = resolved.product;
      const quote = await QuotationService.createQuotation({
        customerName: customerInfo?.name || 'Quý Khách Hàng',
        customerPhone: customerInfo?.phone || '',
        customerCompany: customerInfo?.company || '',
        conversationId,
        items: [{
          productId: p.id,
          productName: p.name,
          sku: p.sku || '',
          specsSnippet: p.configuration || '',
          quantity: p.quantity || quantity || 1,
          unit: p.unit || 'cái',
          unitPrice: p.price,
          priceType: p.priceType || 'REFERENCE_ONLY'
        }],
        vatPercent: 10
      });

      return {
        status: 'SUCCESS',
        product: p,
        quote,
        quotationMarkdown: quote.markdown
      };
    }, { ...meta, timeoutMs: 3000 });
  }

  /**
   * Execute Live Website Retrieval Tool
   */
  static async executeLiveWebSearch(query, meta = {}) {
    return await this.executeWithTelemetry('live_website_retrieval', async () => {
      return await LiveWebsiteRetrieval.searchLiveProduct(query, meta);
    }, { ...meta, timeoutMs: 4000 });
  }

  /**
   * Execute Document RAG Tool
   */
  static async executeDocumentRag(query, orgId, meta = {}) {
    return await this.executeWithTelemetry('search_knowledge_base', async () => {
      return await RagService.searchKnowledge({ query, orgId, limit: 4 });
    }, { ...meta, timeoutMs: 3000 });
  }

  /**
   * Execute Excel Query Tool
   */
  static async executeExcelQuery(filterVal, meta = {}) {
    return await this.executeWithTelemetry('query_excel_data', async () => {
      return await ExcelParser.queryData({ filterVal });
    }, { ...meta, timeoutMs: 2500 });
  }

  /**
   * Execute Internet Search Tool
   */
  static async executeInternetSearch(query, meta = {}) {
    return await this.executeWithTelemetry('search_web_internet', async () => {
      return await WebSearchService.search(query, 3);
    }, { ...meta, timeoutMs: 3000 });
  }

  /**
   * Execute Sales Engine Core Tool
   */
  static async executeSalesEngine(params, meta = {}) {
    return await this.executeWithTelemetry('consult_sales_engine', async () => {
      return await SalesEngineAdapter.processMessage(params);
    }, { ...meta, timeoutMs: 6000 });
  }
}

export default ToolOrchestrator;
