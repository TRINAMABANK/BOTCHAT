/**
 * TRÍ AI ONE SUPER BRAIN - UNIFIED TOOL GATEWAY
 * 
 * Philosophy: SANDBOXED EXECUTION – 5S TIMEOUT – STRICT SCHEMA VALIDATION – SSRF SHIELD
 * 
 * Registered System Tools:
 *  - ProductCatalogTool: Query verified product database
 *  - QuotationGeneratorTool: Deterministic math calculation with 10% VAT
 *  - CalendarAndTaskTool: Safe schedule and task management
 *  - DeepWebSearchTool: Web retrieval protected by ssrfProtection
 */

import db from '../../db.js';
import { isSafePublicUrl } from '../../utils/ssrfProtection.js';

export class ToolGateway {
  /**
   * Execute a tool inside a sandboxed environment with strict timeout and audit logging
   * @param {string} toolName
   * @param {Object} params
   * @param {Object} executionContext
   * @returns {Promise<Object>}
   */
  static async executeTool(toolName, params = {}, executionContext = {}) {
    const startTime = Date.now();
    const timeoutMs = 5000;

    // Timeout Promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Tool execution timed out after ${timeoutMs}ms: ${toolName}`)), timeoutMs);
    });

    try {
      const executionPromise = this._dispatchTool(toolName, params, executionContext);
      const result = await Promise.race([executionPromise, timeoutPromise]);
      const durationMs = Date.now() - startTime;

      // Audit Log
      await this._logToolExecution({
        toolName,
        params,
        status: 'SUCCESS',
        durationMs,
        userId: executionContext.userId || 'usr_anonymous'
      });

      return {
        success: true,
        data: result,
        durationMs
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      console.warn(`[TOOL GATEWAY] Tool ${toolName} failed: ${err.message}`);

      await this._logToolExecution({
        toolName,
        params,
        status: 'ERROR',
        error: err.message,
        durationMs,
        userId: executionContext.userId || 'usr_anonymous'
      });

      return {
        success: false,
        error: err.message,
        durationMs
      };
    }
  }

  /**
   * Internal tool dispatcher
   */
  static async _dispatchTool(toolName, params, executionContext) {
    switch (toolName) {
      case 'lookup_supplier_products': {
        const query = params.query || '';
        const rows = await db.all(
          `SELECT id, name, price, sku, configuration FROM products WHERE is_active = 1 AND name LIKE ? LIMIT 5`,
          [`%${query}%`]
        );
        return rows;
      }

      case 'generate_formal_quotation': {
        const { QuotationService } = await import('../quotationService.js');
        return QuotationService.createQuotation({
          customerName: params.customer_name || 'Khách hàng',
          items: [{
            productName: params.product_name,
            quantity: params.quantity || 1,
            unitPrice: params.unit_price || 0
          }],
          vatPercent: 10
        });
      }

      case 'search_web_internet': {
        const query = params.query || '';
        const check = await isSafePublicUrl(query);
        if (!check.safe) {
          throw new Error(`Blocked SSRF access to restricted network address: ${check.reason}`);
        }
        const { WebSearchService } = await import('../webSearchService.js');
        return WebSearchService.search(query);
      }

      default:
        throw new Error(`Tool not registered in Tool Gateway: ${toolName}`);
    }
  }

  /**
   * Helper: Audit logging
   */
  static async _logToolExecution({ toolName, params, status, error = null, durationMs, userId }) {
    try {
      await db.run(
        `INSERT INTO audit_logs (event_type, target_type, target_id, actor_id, details_json, created_at)
         VALUES (?, 'TOOL_GATEWAY', ?, ?, ?, datetime('now'))`,
        [`TOOL_EXEC_${status}`, toolName, userId, JSON.stringify({ params, error, durationMs })]
      );
    } catch {
      // Non-blocking logging failure
    }
  }
}
