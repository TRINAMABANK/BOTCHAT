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
import { IntentEngine } from '../services/intelligence/intentEngine.js';

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
    const lower = text.toLowerCase();
    const normalized = lower
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd');

    // 0. WEATHER & INTENT ENGINE GUARD
    if (IntentEngine.isWeatherInquiry && IntentEngine.isWeatherInquiry(text, lower, normalized)) {
      return false;
    }

    // 0B. SERVICE & REPAIR GUARDS (SỬA ≠ SỮA)
    if (IntentEngine.isRepairServiceInquiry && IntentEngine.isRepairServiceInquiry(text, lower, normalized)) {
      return false;
    }
    if (IntentEngine.isMaintenanceServiceInquiry && IntentEngine.isMaintenanceServiceInquiry(text, lower, normalized)) {
      return false;
    }
    if (IntentEngine.isCustomerSellingGoods && IntentEngine.isCustomerSellingGoods(text, lower, normalized)) {
      return false;
    }

    // Strict Vietnamese Semantic Guard: Tone marks distinguish rain vs purchase (mưa ≠ mua)
    const hasTonedRain = /\b(?:mưa|mưa lớn|mưa to|mưa rào|cơn mưa|trận mưa|hạt mưa|trời mưa|có mưa|ngập|bão)\b/i.test(lower);
    const hasTonedBuy = /\b(?:mua|mua sắm|đặt mua|chọn mua|mua hàng|mua về|đáng mua)\b/i.test(lower);
    const isDeliveryQuery = /(?:giao hàng|giao hang|ship|van chuyen|vận chuyển)(?:\s|[.,!?;:]|$)/i.test(lower) ||
      /(?:giao hang|ship|van chuyen)\b/i.test(normalized);

    if (hasTonedRain && !hasTonedBuy && !isDeliveryQuery) {
      return false;
    }

    // Casual activity exclusions that accidentally mention desks or coffee
    if (/(?:ngồi vào bàn|ngoi vao ban|dọn bàn|don ban|dọn dẹp bàn|don dep ban|lau bàn|lau ban)\b/i.test(lower)) {
      return false;
    }
    if (/(?:đá một cốc|da mot coc|uống một cốc|uong mot coc|làm cốc|lam coc|pha cốc|pha coc)\b/i.test(lower)) {
      return false;
    }
    if (/(?:sếp bảo|sep bao|anh bảo|chi bao)\b/i.test(lower)) {
      return false;
    }

    // Minimal pair tone mark guards:
    // bàn (discuss/desk) vs bán (sell)
    if (/\b(?:bàn bạc|bàn về|thảo luận|bàn kế hoạch|bàn luận)\b/i.test(lower) && !/\b(?:bán|mua)\b/i.test(lower)) {
      return false;
    }
    // bão (storm) vs bảo (tell/guarantee/insure)
    if (/\b(?:cơn bão|bão số|đổ bộ|áp thấp)\b/i.test(lower) && !/\b(?:mua|bán)\b/i.test(lower)) {
      return false;
    }
    // nghỉ (rest) vs nghĩ (think)
    if (/\b(?:nghỉ ngơi|nghỉ phép|nghĩ ngợi|suy nghĩ)\b/i.test(lower) && !/\b(?:mua|bán)\b/i.test(lower)) {
      return false;
    }

    // EXPLICIT NON-SALES EXCLUSIONS:
    // If the inquiry is about non-sales domains and does NOT contain explicit buying verbs, NEVER flag as sales!
    const nonSalesDomainPatterns = [
      /(?:chứng khoán|chung khoan|cổ phiếu|co phieu|vnindex|vcb|hpg|fpt|đầu tư tài chính|dau tu tai chinh|trái phiếu|trai phieu|quỹ đầu tư|thị trường tài chính)/i,
      /(?:thời tiết|thoi tiet|dự báo thời tiết|du bao thoi tiet|trời mưa|troi mua|nhiệt độ|nhiet do|mưa|mua bao|bao so)/i,
      /(?:soạn công văn|soan cong van|thông báo nội bộ|thong bao noi bo|biên bản|bien ban|viết thư|viet thu|hợp đồng lao động)/i,
      /(?:lỗi code|loi code|lập trình|lap trinh|viết code|viet code|sửa bug|sua bug|python|javascript|react|cài win|cài đặt hệ điều hành)/i,
      /(?:tâm sự|tam su|buồn quá|buon qua|kể chuyện|ke chuyen|triết học|triet hoc|phong thủy|phong thuy|sức khỏe|suc khoe|y tế|y te)/i,
      /(?:bạn là ai|ban la ai|em là ai|em la ai|bạn tên gì|ban ten gi|khỏe không|khoe khong|hôm nay thế nào|hom nay the nao)/i
    ];

    const hasExplicitPurchaseVerb = /(?:mua ngay|đặt mua|dat mua|chốt đơn|chot don|báo giá cho tôi|bao gia cho toi|mua hàng|mua hang)\b/i.test(lower) ||
      (!hasTonedRain && /(?:mua ngay|dat mua|chot don|bao gia cho toi|mua hang)\b/i.test(normalized));

    const isNonSales = nonSalesDomainPatterns.some(p => p.test(lower) || p.test(normalized));
    if (isNonSales && !hasExplicitPurchaseVerb && !isDeliveryQuery) {
      return false;
    }

    // Specific product names in shop catalog
    const productKeywords = [
      'may dem tien', 'xinda', 'glory', 'xiudun', 'julong', 'hang tin', 'bofa',
      'laptop', 'thinkpad', 'macbook', 'dell', 'hp', 'asus', 'lenovo', 'ideapad',
      'may in', 'may scan', 'muc in', 'brother', 'canon', 'hp laserjet',
      'man hinh', 'ban lam viec', 'ghe giam doc', 'ghe van phong',
      'matcha', 'tra oolong', 'tra cao cap', 'ca phe rang moc', 'espresso',
      'nuoc hoa', 'cindy bloom', 'ca phe', 'tra sua', 'gunam', 'sua bot', 'sua dac',
      'sua tuoi', 'sua hat', 'sua chua', 'dien thoai'
    ];

    if (productKeywords.some(pk => normalized.includes(pk))) {
      return true;
    }

    // Explicit sales intent phrases
    const salesIntentPatterns = [
      /(?:mua|dat hang|chot don|dat mua|gia bao nhieu|bao gia|bao nhieu tien|may tien|ban cho|ban tra gop|tra gop|bao hiem)\b/i,
      /(?:shop co ban|shop ban gi|ben ban co gi|ben shop co gi|con hang khong|co san hang)\b/i,
      /(?:tu van san pham|tu van mua hang|tu van chon mua|tu van bao gia)\b/i,
      /(?:danh muc san pham|cac san pham cua shop|mat hang cua shop|ban nhung mat hang|ban gi vay|ban nhung gi|bang gia|bang gia ban le|ban chay|ban chay nhat|model nao)\b/i,
      /(?:chinh sach ban hang|chinh sach ban si|ban si|giao hang|van chuyen|ban giao|bao hanh|chinh hang|chuyen khoan|thanh toan|don hang|hang ton kho|ton kho|hoi gia|dai ly|cua hang|muc gia|dia chi shop|dia chi cua hang|thong so o cot 2|thong so|shop.*nghi|cua hang.*nghi|ben ban.*nghi)\b/i
    ];

    return salesIntentPatterns.some(p => p.test(normalized));
  }
}

export default SalesEngineAdapter;
