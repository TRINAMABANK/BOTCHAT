/**
 * TRÍ AI ULTIMATE ROBOT - SALES ENGINE ADAPTER
 * 
 * Pattern: Adapter / Wrapper
 * Purpose: Preserves 100% of the proven sales engine logic from salesEngine.js
 * while exposing a standard Tool interface for OpenAI Central Brain
 * and seamless fallback for direct Express chat endpoints.
 */

import SalesEngine from '../salesEngine.js';
import db from '../db.js';

/**
 * Standard OpenAI Function / Tool Definition for Central Brain Orchestrator
 */
export const SALES_ENGINE_TOOL_DEFINITION = {
  type: 'function',
  function: {
    name: 'consult_sales_engine',
    description: 'Tư vấn sản phẩm, báo giá, kiểm tra thông số kỹ thuật, gợi ý danh mục và xử lý quy trình đặt hàng/chốt đơn trong hệ thống TRÍ AI. Hãy gọi tool này khi người dùng hỏi về sản phẩm, hàng hóa, giá tiền, cấu hình, mua sắm hoặc đặt hàng.',
    parameters: {
      type: 'object',
      properties: {
        user_message: {
          type: 'string',
          description: 'Nội dung nguyên văn hoặc trọng tâm câu hỏi của người dùng liên quan đến sản phẩm/mua bán'
        },
        product_focus: {
          type: 'string',
          description: 'Tên sản phẩm cụ thể mà người dùng nhắc tới hoặc hỏi đến (nếu có)'
        },
        category_or_field: {
          type: 'string',
          description: 'Lĩnh vực hoặc nhóm danh mục sản phẩm (ví dụ: Trà cao cấp, Laptop & Công nghệ, Gia dụng...)'
        },
        action_intent: {
          type: 'string',
          enum: ['inquire', 'compare', 'order_request', 'provide_info', 'greeting'],
          description: 'Mục đích hành động: inquire (hỏi sản phẩm/giá), compare (so sánh), order_request (mua hàng), provide_info (cung cấp SĐT/địa chỉ)'
        }
      },
      required: ['user_message']
    }
  }
};

/**
 * SalesEngineAdapter Class
 */
export class SalesEngineAdapter {
  /**
   * Process a message directly through the Sales Engine.
   * Completely preserves the legacy signature and returns all Column 2 UI directives.
   */
  static async processMessage(params = {}) {
    const {
      conversationId,
      message,
      selectedProduct,
      actionType,
      customerInfo,
      clientDevice,
      orgId = 'org_default'
    } = params;

    // Delegate directly to the verified SalesEngine
    const rawResult = await SalesEngine.processMessage({
      conversationId,
      message,
      selectedProduct,
      actionType,
      customerInfo,
      clientDevice
    });

    // Decorate with adapter metadata while maintaining 100% backward compatibility
    return {
      ...rawResult,
      adapter: {
        source: 'sales_engine_core',
        orgId,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Execute as a Tool Call invoked by Central Brain (OpenAI Tool Calling)
   * 
   * @param {Object} toolArgs - Arguments from Central Brain tool call
   * @param {Object} context - Execution context { conversationId, selectedProduct, customerInfo, clientDevice, orgId }
   * @returns {Object} { toolResponseForLLM, uiDirectives }
   */
  static async executeAsTool(toolArgs = {}, context = {}) {
    const {
      conversationId = context.conversationId,
      selectedProduct = context.selectedProduct,
      customerInfo = context.customerInfo,
      clientDevice = context.clientDevice,
      orgId = context.orgId || 'org_default'
    } = context;

    const message = toolArgs.user_message || context.message || '';

    // If tool specified a product_focus and no selectedProduct was passed, attempt lookup
    let effectiveSelectedProduct = selectedProduct;
    if (!effectiveSelectedProduct && toolArgs.product_focus) {
      try {
        const found = await db.get(
          'SELECT * FROM products WHERE name LIKE ? OR tags LIKE ? LIMIT 1',
          [`%${toolArgs.product_focus}%`, `%${toolArgs.product_focus}%`]
        );
        if (found) {
          effectiveSelectedProduct = found;
        }
      } catch (err) {
        console.warn('[ADAPTER] Product lookup warning:', err.message);
      }
    }

    const engineResult = await this.processMessage({
      conversationId,
      message,
      selectedProduct: effectiveSelectedProduct,
      actionType: toolArgs.action_intent || context.actionType,
      customerInfo,
      clientDevice,
      orgId
    });

    return {
      // Content returned to Central Brain LLM to integrate into final response
      toolResponseForLLM: {
        replySummary: engineResult.reply,
        recommendedProduct: engineResult.recommendedProduct
          ? {
              id: engineResult.recommendedProduct.id,
              name: engineResult.recommendedProduct.name,
              price: engineResult.recommendedProduct.price,
              field: engineResult.recommendedProduct.field,
              specs: engineResult.recommendedProduct.specs
            }
          : null,
        recommendedField: engineResult.recommendedField,
        stage: engineResult.stage,
        intent: engineResult.intent,
        orderInfo: engineResult.orderInfo,
        leadCaptured: engineResult.leadCaptured
      },
      // Directives to pass back to Frontend for Column 2 synchronization
      uiDirectives: {
        revealCatalog: engineResult.revealCatalog,
        recommendedField: engineResult.recommendedField,
        recommendedProduct: engineResult.recommendedProduct,
        requiresInput: engineResult.requiresInput,
        suggestedActions: engineResult.suggestedActions,
        stage: engineResult.stage
      },
      // Full raw engine result for seamless fallback
      rawResult: engineResult
    };
  }

  /**
   * Helper to check if a query relates to sales/products
   */
  static isSalesInquiry(text = '') {
    if (!text) return false;
    const normalized = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd');

    const keywords = [
      'mua', 'gia', 'ban', 'san pham', 'hang', 'order', 'dat hang',
      'laptop', 'tra', 'tivi', 'may dem tien', 'ghe', 'ban lam viec',
      'khuyen mai', 'ton kho', 'bao nhieu', 'co san', 'giao hang',
      'may in', 'may scan', 'muc in', 'man hinh', 'cpu', 'tablet',
      'may tinh', 'dien thoai', 'nuoc hoa', 'ca phe', 'cafe', 'matcha',
      'my pham', 'thiet bi', 'tu van', 'danh muc', 'co gi', 'canon', 'dell', 'samsung'
    ];
    return keywords.some(k => normalized.includes(k));
  }
}

export default SalesEngineAdapter;
