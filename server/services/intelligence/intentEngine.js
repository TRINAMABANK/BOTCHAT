/**
 * INTENT ENGINE – BỘ MÁY HIỂU Ý ĐỊNH (TRÍ AI SMART INTELLIGENCE 2.0)
 * 
 * Capabilities:
 * - Chuẩn hóa tiếng Việt tự nhiên, giải mã từ viết tắt, tiếng lóng, lỗi chính tả phổ biến.
 * - Phân loại đa ý định chính xác (Bán hàng, Báo giá, Tra cứu web, Tài liệu nội bộ, Excel, Ghi nhớ).
 * - Trích xuất thực thể (Slots): Tên sản phẩm, Hãng, Danh mục, Số lượng, Khoảng ngân sách.
 */

// Shorthand and typo correction dictionary
const VIETNAMESE_SLANG_MAP = {
  '\\bk\\b': 'không',
  '\\bko\\b': 'không',
  '\\bhong\\b': 'không',
  '\\bhông\\b': 'không',
  '\\bkhum\\b': 'không',
  '\\bdc\\b': 'được',
  '\\bđc\\b': 'được',
  '\\bbnhieu\\b': 'bao nhiêu',
  '\\bbn\\b': 'bao nhiêu',
  '\\bbao nhiu\\b': 'bao nhiêu',
  '\\bgia sao\\b': 'giá bao nhiêu',
  '\\bib\\b': 'tư vấn',
  '\\binbox\\b': 'tư vấn',
  '\\bsp\\b': 'sản phẩm',
  '\\bsanpham\\b': 'sản phẩm',
  '\\bdt\\b': 'số điện thoại',
  '\\bsdt\\b': 'số điện thoại',
  '\\bsđt\\b': 'số điện thoại',
  '\\blaptp\\b': 'laptop',
  '\\blatop\\b': 'laptop',
  '\\blap top\\b': 'laptop',
  '\\bmay in canonn\\b': 'máy in canon',
  '\\bcanonn\\b': 'canon',
  '\\bssung\\b': 'samsung',
  '\\bsam sung\\b': 'samsung',
  '\\btv\\b': 'tư vấn',
  '\\btu van\\b': 'tư vấn'
};

export class IntentEngine {
  /**
   * Normalize input text with typo correction and slang expansion
   */
  static normalizeText(rawText = '') {
    if (!rawText) return '';
    let normalized = rawText.trim().toLowerCase();

    // Replace common Vietnamese slang & typos
    for (const [pattern, replacement] of Object.entries(VIETNAMESE_SLANG_MAP)) {
      normalized = normalized.replace(new RegExp(pattern, 'gi'), replacement);
    }

    return normalized.replace(/\s+/g, ' ');
  }

  /**
   * Remove diacritics for flexible fuzzy keyword matching
   */
  static stripDiacritics(text = '') {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd');
  }

  /**
   * Main intent recognition entry point
   * 
   * @param {string} rawMessage - Raw customer query
   * @param {Object} context - Conversation turn context
   * @returns {Object} { primaryIntent, confidence, slots, flags }
   */
  static analyzeIntent(rawMessage = '', context = {}) {
    const norm = this.normalizeText(rawMessage);
    const unaccented = this.stripDiacritics(norm);

    // 1. Check Memory Control Commands (Xem, sửa, xóa, tắt ghi nhớ)
    const isMemoryCommand = /(quên\b.*(?:tôi|thông tin|dữ liệu|sđt|số điện thoại)|xóa\b.*(?:thông tin|trí nhớ|dữ liệu|bộ nhớ)|đừng ghi nhớ|không lưu thông tin|xem thông tin đã lưu|lưu thông tin này)/i.test(norm);
    if (isMemoryCommand) {
      let memoryAction = 'FORGET';
      if (/xem thông tin/i.test(norm)) memoryAction = 'VIEW';
      else if (/lưu thông tin/i.test(norm)) memoryAction = 'SAVE';

      return {
        primaryIntent: 'MEMORY_COMMAND',
        confidence: 0.98,
        action: memoryAction,
        slots: { rawMessage },
        flags: { isSales: false, isDoc: false }
      };
    }

    // 2. Greeting / Identity intent
    const isGreeting = /^(hi|hello|chào|chao|alo|xin chào|xin chao|ê|hey|hê lô|bạn là ai|ban la ai|em là ai|em tên gì|bạn tên gì|khỏe không|khoe khong|chúc|cảm ơn|cam on|thanks|thank you|ok|oke|okie)(\s.*)?$/i.test(norm);
    const isIdentityInquiry = /(bạn là ai|em là ai|robot là ai|tên gì|giới thiệu bản thân)/i.test(norm);

    // 3. Document / RAG explicit intent (Strictly internal documents, excluded from warranty/commercial policies)
    const isDocExplicitQuery = (/(tài liệu|tai lieu|quy trình|quy trinh|quy chế|quy che|quyết định|quyet dinh|điều chuyển|dieu chuyen|nam a bank|namabank|thủ tục|thu tuc|công văn|cong van|văn bản|van ban|sổ tay|so tay|quy định|quy dinh|hồ sơ|ho so)/i.test(norm) || (/(chính sách|chinh sach)/i.test(norm) && !/(bảo hành|bao hanh|đổi trả|doi tra|giao hàng|giao hang|mua hàng|mua hang)/i.test(norm))) && !/(báo giá|bao gia)/i.test(norm);

    // 4. Quotation intent
    const isQuotation = /(báo giá|bao gia|lập báo giá|lap bao gia|xin báo giá|bảng báo giá|bang bao gia)/i.test(norm);

    // 5. Excel query intent
    const isExcel = /(excel|bảng tính|bang tinh|tổng cộng|tong cong|doanh thu|sheet)/i.test(norm);

    // 6. External Web search intent
    const isWebSearch = /(tin tức|tin tuc|thời tiết|thoi tiet|tìm trên mạng|tim tren mang|tra cứu internet|tra cuu mang)/i.test(norm);

    // 7. Product comparison intent
    const isComparison = /(so sánh|so sanh|khác nhau|khac nhau|mẫu nào tốt hơn|loại nào hơn|nên mua con nào)/i.test(norm);

    // 8. Live Website retrieval intent
    const isLiveWebIntent = /(website|trên website|trên trang web|tren website|web nhà cung cấp|web nhacungcap|tìm trên web|kiểm tra.*website|tra cứu.*website|giá trên website|xem link|đường dẫn)/i.test(norm);

    // 9. Price inquiry intent
    const isPriceQuery = /(giá bao nhiêu|gia bao nhieu|bao nhiêu tiền|bao nhieu tien|giá cả|gia ca|chi phí|tầm giá|mấy tiền)/i.test(norm);

    // 10. Extract Entities & Slots
    const slots = this.extractSlots(norm, unaccented);

    // Priority Resolution
    if (isDocExplicitQuery && !isQuotation) {
      return {
        primaryIntent: 'INTERNAL_DOCUMENT_RAG',
        confidence: 0.95,
        slots,
        flags: { isSales: false, isDoc: true }
      };
    }

    if (isExcel) {
      return {
        primaryIntent: 'EXCEL_CALCULATION',
        confidence: 0.95,
        slots,
        flags: { isSales: false, isDoc: false }
      };
    }

    if (isWebSearch && !slots.productName) {
      return {
        primaryIntent: 'INTERNET_SEARCH',
        confidence: 0.9,
        slots,
        flags: { isSales: false, isDoc: false }
      };
    }

    if (isQuotation) {
      return {
        primaryIntent: 'FORMAL_QUOTATION',
        confidence: 0.98,
        slots,
        flags: { isSales: true, isDoc: false }
      };
    }

    if (isComparison) {
      return {
        primaryIntent: 'PRODUCT_COMPARISON',
        confidence: 0.92,
        slots,
        flags: { isSales: true, isDoc: false }
      };
    }

    if (isLiveWebIntent) {
      return {
        primaryIntent: 'LIVE_WEBSITE_SEARCH',
        confidence: 0.95,
        slots,
        flags: { isSales: true, isDoc: false }
      };
    }

    if (isGreeting && !slots.productName && !isPriceQuery) {
      return {
        primaryIntent: isIdentityInquiry ? 'IDENTITY_INQUIRY' : 'GREETING',
        confidence: 0.99,
        slots,
        flags: { isSales: false, isDoc: false }
      };
    }

    if (isPriceQuery) {
      return {
        primaryIntent: 'PRICE_INQUIRY',
        confidence: 0.92,
        slots,
        flags: { isSales: true, isDoc: false }
      };
    }

    // Unclear needs detection (user says "tôi muốn mua", "tôi cần mua", "cần mua" with no specific product)
    if (!slots.productName && /(cần mua|muốn mua|tìm mua|bán đồ|có gì bán|tôi cần mua|tôi muốn mua)\s*$/i.test(norm)) {
      return {
        primaryIntent: 'UNCLEAR_NEEDS',
        confidence: 0.92,
        slots,
        flags: { isSales: true, isDoc: false }
      };
    }

    // Default for product questions or shopping assistance
    const isSalesKeywords = /(mua|bán|ban|sản phẩm|san pham|hàng|laptop|máy in|may in|máy scan|may scan|trà|tra|cà phê|cafe|nước hoa|nuoc hoa|màn hình|tivi|tai nghe|bột matcha|cpu|tablet|chuột|bàn phím)/i.test(norm);

    return {
      primaryIntent: isSalesKeywords || slots.productName ? 'SALES_CONSULTATION' : 'GENERAL_CONVERSATION',
      confidence: isSalesKeywords ? 0.9 : 0.8,
      slots,
      flags: { isSales: true, isDoc: false }
    };
  }

  /**
   * Extract slots: product, quantity, budget, brand
   */
  static extractSlots(normText = '', unaccented = '') {
    // 1. Quantity extraction
    const qtyMatch = normText.match(/\b(\d+)\s*(máy|cái|chiếc|bộ|sp|sản phẩm|hộp|chai|gói)?\b/i);
    const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;

    // 2. Budget extraction (e.g. dưới 15 triệu, tầm 2tr, khoảng 500k, đổi sang loại 25 triệu)
    let budgetMax = null;
    let budgetMin = null;

    const millionMatch = normText.match(/(?:dưới|tầm|khoảng|ngân sách|loại|mức)\s*(\d+(?:[.,]\d+)?)\s*(?:triệu|tr|trieu)\b/i);
    if (millionMatch) {
      budgetMax = parseFloat(millionMatch[1].replace(',', '.')) * 1000000;
    }

    const thousandMatch = normText.match(/(?:dưới|tầm|khoảng|ngân sách|loại|mức)\s*(\d+)\s*(?:k|nghìn|ngan)\b/i);
    if (thousandMatch) {
      budgetMax = parseInt(thousandMatch[1], 10) * 1000;
    }

    // 3. Known Brand identification
    const knownBrands = ['dell', 'hp', 'lenovo', 'canon', 'brother', 'samsung', 'logitech', 'cindy bloom', 'julong', 'lidix', 'miss saigon'];
    const matchedBrand = knownBrands.find(b => normText.includes(b)) || null;

    // 4. Product Name Candidate Cleaning
    const cleanedQuery = normText
      .replace(/(cho tôi|cho em|cho e|tôi|mình|minh|em|anh|chị|lập|xin|cần|bảng báo giá|báo giá|bao gia|chi tiết|giúp|với|nhé|nha|mua|bán|có sẵn|tư vấn|tìm|hỏi|dưới|khoảng|tầm giá|\d+|triệu|tr|k|nghìn|máy|cái|chiếc|bộ|sản phẩm)/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const extractedPhone = normText.match(/(0\d{9})\b/)?.[1] || null;

    return {
      productName: cleanedQuery || null,
      quantity,
      budget: budgetMax,
      budgetMax,
      budgetMin,
      brand: matchedBrand,
      phone: extractedPhone,
      extractedPhone
    };
  }
}

export default IntentEngine;
