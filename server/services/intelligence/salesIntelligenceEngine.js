/**
 * TRÍ AI ONE SUPER BRAIN - SALES INTELLIGENCE ENGINE
 * 
 * Philosophy: CONSULTATIVE SELLING – 11-STEP PIPELINE – LEAR OBJECTION HANDLING – ZERO FABRICATION
 * 
 * The 11-Step Consultative Sales Pipeline:
 *  1. Rapport & Context Calibration
 *  2. Need Discovery (Explicit & Implicit)
 *  3. Pain Point & Constraint Diagnosis (Budget & Infrastructure)
 *  4. Solution Architecture & Value Alignment
 *  5. Multi-Option Product Recommendation (DB Grounded)
 *  6. Transparent Feature & Economic Comparison
 *  7. LEAR Objection Handling (Listen, Empathize, Address, Reframe)
 *  8. Value Proposition & ROI Demonstration
 *  9. Formal Quotation Generation (Subtotal + VAT 10% = Total)
 *  10. Natural Commitment & Closing
 *  11. Post-Purchase Nurturing & Follow-up
 */

import db from '../../db.js';
import { QuotationService } from '../quotationService.js';
import { UniversalSalesConsultant } from './universalSalesConsultant.js';

export const SALES_STEPS = {
  STEP_1_RAPPORT: 'RAPPORT',
  STEP_2_NEED_DISCOVERY: 'NEED_DISCOVERY',
  STEP_3_PAIN_DIAGNOSIS: 'PAIN_DIAGNOSIS',
  STEP_4_SOLUTION_ALIGNMENT: 'SOLUTION_ALIGNMENT',
  STEP_5_PRODUCT_RECOMMENDATION: 'PRODUCT_RECOMMENDATION',
  STEP_6_COMPARISON: 'COMPARISON',
  STEP_7_OBJECTION_HANDLING: 'OBJECTION_HANDLING',
  STEP_8_VALUE_ROI: 'VALUE_ROI',
  STEP_9_FORMAL_QUOTATION: 'FORMAL_QUOTATION',
  STEP_10_CLOSING: 'CLOSING',
  STEP_11_POST_SALES: 'POST_SALES'
};

export class SalesIntelligenceEngine {
  /**
   * Evaluate user sales stage and return appropriate consultative response
   * @param {Object} params
   * @returns {Promise<Object>}
   */
  static async consult(params = {}) {
    const {
      message = '',
      conversationId,
      activeProduct = null,
      customerInfo = null
    } = params;

    const lower = (message || '').toLowerCase();

    // 1. Objection Handling: High Price / Comparison (Step 7 LEAR)
    if (/(đắt quá|chê đắt|chê mắc|giá cao|bên kia rẻ hơn|đắt thế)/i.test(lower)) {
      return this.handleLearObjection({
        type: 'PRICE_OBJECTION',
        message,
        product: activeProduct,
        customerInfo
      });
    }

    // 2. Formal Quotation Request (Step 9)
    if (/(báo giá|bao gia|lập báo giá|gửi báo giá|xin báo giá|bảng giá)/i.test(lower)) {
      return this.generateFormalQuotation({
        product: activeProduct,
        conversationId,
        customerInfo
      });
    }

    // 3. Need Discovery & Budget Analysis (Step 2 & 3)
    if (/(tư vấn|cần mua|muốn mua|tìm máy|loại nào tốt|giá khoảng)/i.test(lower)) {
      return this.guideNeedDiscovery({
        message,
        activeProduct,
        customerInfo
      });
    }

    // Default to UniversalSalesConsultant flow
    return UniversalSalesConsultant.consult(params);
  }

  /**
   * LEAR Objection Handling Implementation
   */
  static handleLearObjection({ type = 'PRICE_OBJECTION', message = '', product = null, customerInfo = null }) {
    const prodName = product ? (product.name || product.active_product_name) : 'dòng sản phẩm chính hãng';
    const prodPrice = product && product.price ? product.price.toLocaleString('vi-VN') + ' VNĐ' : 'báo giá trọn gói';

    const replyText = `Dạ em cảm ơn anh đã chia sẻ thẳng thắn về mức giá của **${prodName}** ạ! (Listen)\n\n` +
      `Em hoàn toàn hiểu là khi đầu tư trang thiết bị văn phòng, việc cân đối ngân sách và tối ưu chi phí đầu tư luôn là ưu tiên hàng đầu của anh. (Empathize)\n\n` +
      `Em xin phép chia sẻ rõ hơn: Mức giá **${prodPrice}** bên em đã bao gồm đầy đủ **thuế VAT 10%** (xuất hóa đơn tài chính chuẩn cho doanh nghiệp khấu trừ), miễn phí giao hàng & lắp đặt tận nơi, và chính sách bảo hành chính hãng 12 tháng kèm hỗ trợ kỹ thuật tận nơi trong 2 giờ. Các mức giá rẻ hơn trên sàn thương mại điện tử thường chưa gồm VAT và khách hàng phải tự chịu rủi ro vận chuyển hoặc không có hỗ trợ kỹ thuật tại chỗ ạ. (Address)\n\n` +
      `Với chế độ dịch vụ trọn gói bảo đảm thiết bị hoạt động liên tục không gián đoạn công việc, anh thấy phương án này có an tâm và tiện lợi hơn cho bên mình không ạ? (Reframe)`;

    return {
      replyText,
      stage: 'OBJECTION_RESOLVED_LEAR',
      framework: 'LEAR',
      toolsUsed: ['sales_intelligence_engine', 'lear_objection_framework']
    };
  }

  /**
   * Generate formal VAT 10% quotation
   */
  static async generateFormalQuotation({ product = null, conversationId, customerInfo = null }) {
    let target = product;
    if (!target) {
      const all = await db.all('SELECT * FROM products WHERE is_active = 1 LIMIT 1');
      target = all[0];
    }

    if (!target) {
      return {
        replyText: 'Dạ anh/chị vui lòng cho em biết tên sản phẩm hoặc nhu cầu cụ thể để em lên bảng báo giá chính thức chuẩn VAT 10% cho mình nhé.',
        stage: 'QUOTATION_NEED_PRODUCT'
      };
    }

    const formalQuote = await QuotationService.createQuotation({
      customerName: customerInfo?.name || 'Khách hàng',
      conversationId,
      items: [{
        productId: target.id,
        productName: target.name,
        sku: target.sku || '',
        specsSnippet: target.configuration || '',
        quantity: 1,
        unit: target.unit || 'cái',
        unitPrice: target.price,
        priceType: 'CONFIRMED'
      }],
      vatPercent: 10
    });

    return {
      replyText: formalQuote.markdown + `\n\nBảng báo giá trên đã bao gồm thuế GTGT (VAT 10%) và bảo hành chính hãng 12 tháng. Anh/chị có cần em gửi bản PDF hoặc điều chỉnh số lượng không ạ?`,
      stage: 'FORMAL_QUOTATION_GENERATED',
      quotationCode: formalQuote.quoteCode,
      totalAmount: formalQuote.finalAmount,
      toolsUsed: ['sales_intelligence_engine', 'quotation_service']
    };
  }

  /**
   * Need Discovery intake
   */
  static guideNeedDiscovery({ message = '', activeProduct = null, customerInfo = null }) {
    const replyText = `Dạ để giúp anh/chị chọn được giải pháp thiết bị chuẩn xác nhất với chi phí tiết kiệm nhất, em xin phép hỏi nhanh 2 câu ngắn nhé ạ:\n\n` +
      `1. Khối lượng công việc trung bình hàng ngày/hàng tháng của bên mình khoảng bao nhiêu ạ? (Ví dụ: in ấn vài trăm trang hay vài nghìn trang?)\n` +
      `2. Ngân sách dự kiến đầu tư của mình đang dao động trong khoảng bao nhiêu triệu để em cân đối lựa chọn tối ưu nhất ạ?`;

    return {
      replyText,
      stage: 'NEED_DISCOVERY_PROMPTED',
      toolsUsed: ['sales_intelligence_engine']
    };
  }
}
