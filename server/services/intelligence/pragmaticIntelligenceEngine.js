/**
 * TRÍ AI ONE SUPER BRAIN - PRAGMATIC INTELLIGENCE ENGINE (PIE)
 * 
 * Philosophy: ONE BRAIN – ONE UNIFIED MEMORY – ONE CONVERSATION
 * 
 * Analyzes conversational pragmatics, speech acts, implicit subtexts,
 * ellipsis resolution, and indirect communicative intents.
 */

export const COMMUNICATIVE_ACTS = {
  DIRECT_INQUIRY: 'DIRECT_INQUIRY',         // Hỏi trực tiếp
  INDIRECT_INQUIRY: 'INDIRECT_INQUIRY',     // Hỏi gián tiếp / Tìm giải pháp
  IMPLICIT_COMPLAINT: 'IMPLICIT_COMPLAINT', // Phàn nàn ẩn ý / Nói bóng gió
  ASSERTION: 'ASSERTION',                   // Khẳng định / Cung cấp thông tin
  COMMAND: 'COMMAND',                       // Yêu cầu / Chỉ thị
  POLITE_REFUSAL: 'POLITE_REFUSAL',         // Từ chối khéo
  NEGOTIATION: 'NEGOTIATION',               // Mặc cả / Đàm phán giá & điều khoản
  PROBING: 'PROBING',                       // Thăm dò / Khảo sát tính khả thi
  CORRECTION: 'CORRECTION',                 // Đính chính / Sửa sai
  TOPIC_SWITCH: 'TOPIC_SWITCH',             // Chuyển chủ đề
  TOPIC_RESUMPTION: 'TOPIC_RESUMPTION',     // Khôi phục chủ đề cũ
  GRATITUDE: 'GRATITUDE',                   // Cảm ơn / Kết thúc lịch sự
  HESITATION: 'HESITATION'                  // Do dự / Cần thêm thời gian cân nhắc
};

export class PragmaticIntelligenceEngine {
  /**
   * Deep pragmatic analysis of user message
   * @param {string} rawText Raw user text
   * @param {Object} context Current conversation & thread context
   * @returns {Object} Pragmatic profile
   */
  static analyze(rawText = '', context = {}) {
    const text = (rawText || '').trim();
    if (!text) {
      return {
        communicativeAct: COMMUNICATIVE_ACTS.ASSERTION,
        implicitNeed: null,
        tone: 'NEUTRAL',
        isElliptical: false,
        resolvedSubject: null,
        confidence: 1.0
      };
    }

    const lower = text.toLowerCase();

    // 1. Check Topic Resumption
    if (/(quay lại|quay lai|tiếp tục|tiep tuc|lúc nãy|luc nay|trước đó|truoc do).*(kế hoạch|chuyện|bàn|mua|bán|máy đếm tiền|hợp đồng|chủ đề trước)/i.test(lower) ||
        /^(thôi\s+)?(quay lại|quay lai)\s+/i.test(lower)) {
      return {
        communicativeAct: COMMUNICATIVE_ACTS.TOPIC_RESUMPTION,
        implicitNeed: 'Khôi phục lại tiến trình và thực thể của chủ đề trước đó',
        tone: 'PURPOSEFUL',
        isElliptical: false,
        resolvedSubject: 'PREVIOUS_THREAD',
        confidence: 0.98
      };
    }

    // 2. Check Topic Switch
    if (/(chứng khoán|cổ phiếu|vnindex|vcb|hpg|fpt|đầu tư cổ phiếu|thị trường chứng khoán)/i.test(lower)) {
      return {
        communicativeAct: COMMUNICATIVE_ACTS.TOPIC_SWITCH,
        targetTopic: 'FINANCE_STOCK',
        implicitNeed: 'Tham vấn góc nhìn đầu tư chứng khoán, tìm hiểu mã cổ phiếu tiềm năng',
        tone: 'CURIOUS_EXPLORATIVE',
        isElliptical: false,
        resolvedSubject: 'THỊ TRƯỜNG CHỨNG KHOÁN',
        confidence: 0.96
      };
    }

    if (/(thời tiết|thoi tiet|có mưa không|co mua khong|nhiệt độ|nhiet do).*(hà nội|hồ chí minh|đà nẵng|ngày mai|hôm nay)/i.test(lower)) {
      return {
        communicativeAct: COMMUNICATIVE_ACTS.TOPIC_SWITCH,
        targetTopic: 'WEATHER_FORECAST',
        implicitNeed: 'Tra cứu thông tin thời tiết địa phương',
        tone: 'CASUAL',
        isElliptical: false,
        resolvedSubject: 'THỜI TIẾT',
        confidence: 0.95
      };
    }

    if (/(viết giúp|soạn giúp|viết hộ|soan giup).*(thông báo|thong bao|công văn|email nội bộ|bien ban)/i.test(lower)) {
      return {
        communicativeAct: COMMUNICATIVE_ACTS.TOPIC_SWITCH,
        targetTopic: 'ADMINISTRATIVE_DRAFTING',
        implicitNeed: 'Hỗ trợ thư ký soạn thảo văn bản hành chính/nội bộ',
        tone: 'REQUEST_WORK',
        isElliptical: false,
        resolvedSubject: 'VĂN BẢN HÀNH CHÍNH',
        confidence: 0.95
      };
    }

    // 3. Correction / Self-correction
    if (/(không phải|khong phai|nhầm rồi|nham roi|ý tôi là|y toi la|ý anh là|y anh la|đổi lại|doi lai|sửa lại|sua lai)/i.test(lower)) {
      return {
        communicativeAct: COMMUNICATIVE_ACTS.CORRECTION,
        implicitNeed: 'Đính chính thông tin đã cung cấp sai hoặc hiểu lầm trước đó',
        tone: 'CORRECTIVE',
        isElliptical: false,
        resolvedSubject: null,
        confidence: 0.95
      };
    }

    // 4. Implicit Complaint & Innuendo (Nói bóng gió, chê đắt ẩn ý)
    if (/(chắc chỉ dành cho ngân hàng lớn|dành cho đại gia|giá này thì ai mua nổi|bên bạn bán máy giá trên trời|chắc phải giàu lắm mới dám mua)/i.test(lower)) {
      return {
        communicativeAct: COMMUNICATIVE_ACTS.IMPLICIT_COMPLAINT,
        implicitNeed: 'Khách hàng thấy giá niêm yết cao so với ngân sách, mong muốn dòng sản phẩm vừa túi tiền hơn',
        tone: 'SKEPTICAL_DIPLOMATIC',
        isElliptical: false,
        resolvedSubject: 'GIÁ SẢN PHẨM',
        confidence: 0.92
      };
    }

    // 5. Indirect Inquiry (Tìm giải pháp cho vấn đề thực tế)
    if (/(sót tiền giả|lọt tiền giả|bị tiền giả|hay bị dính tiền giả|tiền giả tinh vi|kiểm tiền mặt hay bị sót)/i.test(lower)) {
      return {
        communicativeAct: COMMUNICATIVE_ACTS.INDIRECT_INQUIRY,
        implicitNeed: 'Cần giải pháp công nghệ ngăn chặn tiền giả tuyệt đối (cảm biến UV/MG/IR/CIS)',
        tone: 'CONCERNED_SEEKING_HELP',
        isElliptical: false,
        resolvedSubject: 'GIẢI PHÁP CHỐNG TIỀN GIẢ',
        confidence: 0.94
      };
    }

    // 6. Elliptical questions (Tỉnh lược chủ ngữ / đại từ phụ thuộc)
    const isElliptical = /^(bảo hành bao lâu|bao nhiêu tiền|giá sao|có đếm được ngoại tệ không|cái thứ hai|cái này|loại đó|máy đó|có bền không|giao hàng thế nào|có hóa đơn vat không)\??$/i.test(text) ||
      /^(\?|bao nhiêu|bảo hành sao|đắt không|nặng bao nhiêu|kích thước sao)\??$/i.test(text);

    if (isElliptical) {
      const activeProd = context.activeProduct || context.activeProductContext;
      const fallbackSubject = activeProd ? (activeProd.name || activeProd.active_product_name) : 'máy đếm tiền';
      return {
        communicativeAct: COMMUNICATIVE_ACTS.DIRECT_INQUIRY,
        implicitNeed: `Hỏi thông số cụ thể của sản phẩm đang thảo luận (${fallbackSubject})`,
        tone: 'DIRECT_CONCISE',
        isElliptical: true,
        resolvedSubject: fallbackSubject,
        confidence: 0.90
      };
    }

    // 7. Negotiation / Polite Refusal
    if (/(bớt chút được không|chiết khấu thêm không|có giảm giá không|giá tốt hơn được không)/i.test(lower)) {
      return {
        communicativeAct: COMMUNICATIVE_ACTS.NEGOTIATION,
        implicitNeed: 'Khách hàng có thiện chí mua nhưng muốn tối ưu chi phí hoặc xin chính sách ưu đãi',
        tone: 'NEGOTIATING',
        isElliptical: false,
        resolvedSubject: 'GIÁ VÀ CHIẾT KHẤU',
        confidence: 0.91
      };
    }

    if (/(để anh suy nghĩ thêm|để cân nhắc lại|chưa vội|khi nào cần anh gọi|chưa có nhu cầu ngay)/i.test(lower)) {
      return {
        communicativeAct: COMMUNICATIVE_ACTS.POLITE_REFUSAL,
        implicitNeed: 'Khách hàng từ chối khéo, cần giữ thiện cảm và cung cấp tài liệu tham khảo không gây áp lực',
        tone: 'POLITE_DEFLECTIVE',
        isElliptical: false,
        resolvedSubject: 'QUYẾT ĐỊNH MUA HÀNG',
        confidence: 0.90
      };
    }

    // Default Fallback: Direct Inquiry or Assertion
    const isQuestion = /\?$/.test(text) || /(là gì|sao|thế nào|ở đâu|khi nào|bao giờ|ai|được không|không)/i.test(lower);
    return {
      communicativeAct: isQuestion ? COMMUNICATIVE_ACTS.DIRECT_INQUIRY : COMMUNICATIVE_ACTS.ASSERTION,
      implicitNeed: null,
      tone: 'NEUTRAL',
      isElliptical: false,
      resolvedSubject: null,
      confidence: 0.85
    };
  }

  /**
   * Disambiguates co-reference or ordinal entities like "cái thứ hai anh vừa nói"
   * @param {string} text User input
   * @param {Array} recentEntities List of recent entities/products mentioned
   * @returns {Object|null} The resolved entity
   */
  static resolveOrdinalReference(text = '', recentEntities = []) {
    if (!Array.isArray(recentEntities) || recentEntities.length === 0) return null;
    const lower = text.toLowerCase();

    if (/(cái đầu tiên|loại thứ nhất|sản phẩm 1|cái trước)/i.test(lower)) {
      return recentEntities[0] || null;
    }
    if (/(cái thứ hai|loại thứ hai|cái sau|sản phẩm 2)/i.test(lower)) {
      return recentEntities[1] || recentEntities[0] || null;
    }
    if (/(cái thứ ba|loại thứ ba|sản phẩm 3)/i.test(lower)) {
      return recentEntities[2] || recentEntities[recentEntities.length - 1] || null;
    }
    return null;
  }
}
