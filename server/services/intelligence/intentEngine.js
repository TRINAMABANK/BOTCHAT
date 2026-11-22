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
  '\\btv\\b': 'tivi',
  '\\btu van\\b': 'tư vấn'
};

export const DOMAIN_CATEGORIES = {
  TELECOM: {
    id: 'TELECOM',
    name: 'Điện thoại & Viễn thông',
    keywords: ['dien thoai ban', 'dien thoai de ban', 'dien thoai', 'tong dai', 'may dien thoai', 'kx-tsc', 'kx-ts', 'panasonic kx']
  },
  REFRIGERATOR: {
    id: 'REFRIGERATOR',
    name: 'Tủ lạnh & Thiết bị điện lạnh',
    keywords: ['tu lanh', 'tu dong', 'tu mat', 'inverter 2 canh', 'side by side']
  },
  AIR_CONDITIONER: {
    id: 'AIR_CONDITIONER',
    name: 'Máy lạnh & Điều hòa',
    keywords: ['may lanh', 'dieu hoa', 'daikin', 'inverter 1 hp', 'inverter 1.5 hp']
  },
  WASHING_MACHINE: {
    id: 'WASHING_MACHINE',
    name: 'Máy giặt & Máy sấy',
    keywords: ['may giat', 'may say']
  },
  HOME_APPLIANCE: {
    id: 'HOME_APPLIANCE',
    name: 'Đồ gia dụng',
    keywords: ['do gia dung', 'gia dung', 'noi com', 'may hut am', 'quat dien', 'may loc nuoc', 'hut bui']
  },
  LAPTOP_PC: {
    id: 'LAPTOP_PC',
    name: 'Máy tính & Laptop',
    keywords: ['may tinh', 'máy tính', 'laptop', 'may tinh xach tay', 'may vi tinh', 'may tinh de ban', 'pc', 'thinkcentre', 'thinkpad', 'macbook', 'cpu', 'tablet', 'may tinh bang', 'ideapad', 'vivobook']
  },
  MONITOR: {
    id: 'MONITOR',
    name: 'Màn hình vi tính',
    keywords: ['man hinh', 'màn hình', 'man hinh vi tinh', 'man hinh pc', 'man hinh lenovo', 'man hinh lcd', 'man hinh 24', 'man hinh 27']
  },
  PRINTER_SCANNER: {
    id: 'PRINTER_SCANNER',
    name: 'Máy in & Máy scan',
    keywords: ['may in', 'máy in', 'may scan', 'máy scan', 'muc in', 'hop muc', 'may photocopy', 'hl-l6210dw', 'ads-4300n', 'tn3609']
  },
  BANK_EQUIPMENT: {
    id: 'BANK_EQUIPMENT',
    name: 'Thiết bị ngân hàng & Máy đếm tiền',
    keywords: ['may dem tien', 'máy đếm tiền', 'dem tien', 'đếm tiền', 'phan loai tien', 'may bo tien', 'dong chung tu', 'ket sat', 'julong', 'lidix', 'xinda', 'xiudun']
  },
  TEA: {
    id: 'TEA',
    name: 'Trà cao cấp',
    keywords: ['tra', 'trà', 'tra cao cap', 'tra oolong', 'tra xanh', 'hong tra', 'bich thuy', 'hoang ty', 'xuan nhat', 'tam thanh', 'hao ky', 'matcha', 'bot matcha']
  },
  COFFEE: {
    id: 'COFFEE',
    name: 'Cà phê rang mộc',
    keywords: ['ca phe', 'cà phê', 'cafe', 'espresso', 'robusta', 'arabica', 'rang moc', 'doi dep']
  },
  COSMETICS: {
    id: 'COSMETICS',
    name: 'Nước hoa & Mỹ phẩm',
    keywords: ['nuoc hoa', 'nước hoa', 'my pham', 'mỹ phẩm', 'tay da chet', 'tay te bao chet', 'miss saigon', 'cindy bloom']
  },
  FURNITURE: {
    id: 'FURNITURE',
    name: 'Nội thất văn phòng',
    keywords: ['ban ghe', 'bàn ghế', 'ban lam viec', 'ban giam doc', 'ban hop', 'ghe xoay', 'ghe giam doc', 'ghe gaming', 'sofa', 'noi that', 'nội thất']
  }
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

    // 1B. Check Reset Chat Request or Confirm Reset
    const isResetChatCommand = /(xóa\s+(?:nội\s+dung\s+)?chat|xoa\s+(?:noi\s+dung\s+)?chat|nội\s+dung\s+chat|noi\s+dung\s+chat|dung\s+chat|xóa\s+(?:hết\s+)?tin\s+nhắn|xoa\s+(?:het\s+)?tin\s+nhan|làm\s+mới\s+(?:cuộc\s+hội\s+thoại|cuộc\s+trò\s+chuyện|nội\s+dung\s+chat|chat)|lam\s+moi\s+(?:cuoc\s+hoi\s+thoai|cuoc\s+tro\s+chuyen|noi\s+dung\s+chat|chat)|xóa\s+cuộc\s+(?:trò\s+chuyện|hội\s+thoại)|xoa\s+cuoc\s+(?:tro\s+chuyen|hoi\s+thoai)|xóa\s+lịch\s+sử\s+chat|xoa\s+lich\s+su\s+chat|xóa\s+chat|xoa\s+chat|clear\s+chat|reset\s+chat)/i.test(norm);
    const isConfirmResetCommand = /(xác\s+nhận\s+làm\s+mới|xac\s+nhan\s+lam\s+moi|xác\s+nhận\s+xóa\s+chat|xac\s+nhan\s+xoa\s+chat|đồng\s+ý\s+làm\s+mới|dong\s+y\s+lam\s+moi|đồng\s+ý\s+xóa|dong\s+y\s+xoa)/i.test(norm);

    if (isConfirmResetCommand) {
      return {
        primaryIntent: 'CONFIRM_RESET_CHAT',
        confidence: 0.99,
        slots: { rawMessage },
        flags: { isSales: false, isDoc: false }
      };
    }

    if (isResetChatCommand) {
      return {
        primaryIntent: 'RESET_CHAT_REQUEST',
        confidence: 0.99,
        slots: { rawMessage },
        flags: { isSales: false, isDoc: false }
      };
    }

    // 2. Greeting / Identity intent
    const isGreeting = /^(hi|hello|chào|chao|alo|xin chào|xin chao|ê|hey|hê lô|bạn là ai|ban la ai|em là ai|em tên gì|bạn tên gì|khỏe không|khoe khong|chúc|cảm ơn|cam on|thanks|thank you|ok|oke|okie)(\s.*)?$/i.test(norm);
    const isIdentityInquiry = /(bạn là ai|em là ai|robot là ai|tên gì|giới thiệu bản thân)/i.test(norm);

    // 3. Document / RAG explicit intent (Strictly internal documents, excluded from warranty/commercial policies)
    const isOfficeDocDevice = /(máy hủy tài liệu|may huy tai lieu|máy scan tài liệu|may scan tai lieu|máy quét tài liệu|may quet tai lieu)/i.test(norm);
    const isDocExplicitQuery = !isOfficeDocDevice && ((/(tài liệu|tai lieu|quy trình|quy trinh|quy chế|quy che|quyết định|quyet dinh|điều chuyển|dieu chuyen|nam a bank|namabank|thủ tục|thu tuc|công văn|cong van|văn bản|van ban|sổ tay|so tay|quy định|quy dinh|hồ sơ|ho so)/i.test(norm) || (/(chính sách|chinh sach)/i.test(norm) && !/(bảo hành|bao hanh|đổi trả|doi tra|giao hàng|giao hang|mua hàng|mua hang)/i.test(norm))) && !/(báo giá|bao gia)/i.test(norm));

    // 4. Quotation intent
    const isQuotation = /(báo giá|bao gia|lập báo giá|lap bao gia|xin báo giá|bảng báo giá|bang bao gia)/i.test(norm);

    // 5. Excel query intent
    const isExcel = /(excel|bảng tính|bang tinh|tổng cộng|tong cong|doanh thu|sheet)/i.test(norm);

    // 6. External Web search intent
    const isWebSearch = /(tin tức|tin tuc|thời tiết|thoi tiet|tìm trên mạng|tim tren mang|tra cứu internet|tra cuu mang)/i.test(norm);

    // 7. Product comparison intent
    const isComparison = /(so sánh|so sanh|khác nhau|khac nhau|mẫu nào tốt hơn|loại nào hơn|nên mua con nào)/i.test(norm);

    // 7B. Staff Handoff intent
    const isStaffHandoff = /(gặp nhân viên|gap nhan vien|gặp người|gap nguoi|nói chuyện với người|chuyên viên tư vấn|chuyen vien tu van|hỗ trợ trực tiếp|ho tro truc tiep|gọi lại cho tôi|goi lai cho toi|gọi điện lại|tư vấn trực tiếp|chăm sóc khách hàng|cskh|gặp chủ shop|người thật)\b/i.test(norm);

    // 7C. Policy Inquiry intent (Warranty, Shipping, Return)
    const isPolicyInquiry = /(?:chính sách|chinh sach|thời gian|thoi gian|thời hạn|thoi han|quy định|quy dinh)?\s*(?:bảo hành|bao hanh|đổi trả|doi tra|giao hàng|giao hang|phí ship|phi ship|vận chuyển|van chuyen|ship cod)\b/i.test(norm);

    // 7D. Order Request intent
    const isOrderRequest = /(đặt mua|mua ngay|lấy chiếc này|lấy con này|mua con này|đặt hàng|chốt đơn|lấy mẫu này)\b/i.test(norm);

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

    if (isStaffHandoff) {
      return {
        primaryIntent: 'STAFF_HANDOFF',
        confidence: 0.98,
        slots,
        flags: { isSales: true, isDoc: false }
      };
    }

    if (isPolicyInquiry) {
      return {
        primaryIntent: 'POLICY_INQUIRY',
        confidence: 0.95,
        slots,
        flags: { isSales: true, isDoc: false }
      };
    }

    if (isOrderRequest) {
      return {
        primaryIntent: 'ORDER_REQUEST',
        confidence: 0.95,
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

    // Broad Category Consultation requiring clarification (Active Listening)
    if (slots.isBroadCategory) {
      return {
        primaryIntent: 'BROAD_CATEGORY_INQUIRY',
        confidence: 0.94,
        slots,
        flags: { isSales: true, isDoc: false }
      };
    }

    // Default for product questions or shopping assistance
    const isSalesKeywords = /(mua|bán|ban|sản phẩm|san pham|hàng|laptop|máy in|may in|máy scan|may scan|trà|tra|cà phê|cafe|nước hoa|nuoc hoa|màn hình|tivi|tai nghe|bột matcha|cpu|tablet|chuột|bàn phím|điện thoại|dien thoai)/i.test(norm);

    return {
      primaryIntent: isSalesKeywords || slots.productName ? 'SALES_CONSULTATION' : 'GENERAL_CONVERSATION',
      confidence: isSalesKeywords ? 0.9 : 0.8,
      slots,
      flags: { isSales: true, isDoc: false }
    };
  }

  /**
   * Extract slots: product, quantity, budget, brand, modelCode, domain
   */
  static extractSlots(normText = '', unaccented = '') {
    // 1. Quantity extraction
    const qtyMatch = normText.match(/\b(\d+)\s*(máy|cái|chiếc|bộ|sp|sản phẩm|hộp|chai|gói)?\b/i);
    const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;

    // 2. Budget extraction (e.g. dưới 15 triệu, tầm 2tr, khoảng 500k, đổi sang loại 25 triệu)
    let budgetMax = null;
    let budgetMin = null;

    const millionMatch = normText.match(/(?:dưới|duoi|tầm|tam|khoảng|khoang|ngân sách|ngan sach|loại|loai|mức|muc|giá|gia)?\s*(\d+(?:[.,]\d+)?)\s*(?:triệu|tr|trieu)\b/i);
    if (millionMatch) {
      budgetMax = parseFloat(millionMatch[1].replace(',', '.')) * 1000000;
    }

    const thousandMatch = normText.match(/(?:dưới|duoi|tầm|tam|khoảng|khoang|ngân sách|ngan sach|loại|loai|mức|muc|giá|gia)?\s*(\d+)\s*(?:k|nghìn|ngan)\b/i);
    if (thousandMatch) {
      budgetMax = parseInt(thousandMatch[1], 10) * 1000;
    }

    // 3. Known Brand identification
    const knownBrands = [
      'panasonic', 'samsung', 'daikin', 'sharp', 'lg', 'dell', 'hp', 'lenovo',
      'canon', 'brother', 'logitech', 'cindy bloom', 'julong', 'lidix', 'miss saigon',
      'xinda', 'xiudun', 'bofa', 'apple', 'asus', 'acer', 'sony', 'toshiba', 'hitachi',
      'electrolux', 'philips'
    ];
    const matchedBrand = knownBrands.find(b => normText.includes(b)) || null;

    // 4. Model Code Extraction (e.g. KX-TSC11, KX-TS500, QA55Q6FA, neo 50s, E14, L14, JL206, ML-2FS, HL-L6210DW)
    let extractedModelCode = null;
    const modelPatterns = [
      /\b([a-z]{1,4}[-_][a-z0-9]{2,8})\b/i,
      /\b(kx[-_\s]?[a-z0-9]{3,7})\b/i,
      /\b(jl\s*206|ml\s*2fs|bc\s*39f|ls\s*200f|neo\s*50s|e14|l14|l24-4c|hl\s*l6210dw|ads\s*4300n|tn\s*3609)\b/i
    ];
    for (const pat of modelPatterns) {
      const match = normText.match(pat);
      if (match) {
        extractedModelCode = match[1].toUpperCase().replace(/\s+/g, '-');
        break;
      }
    }

    // 5. Category Domain Identification
    let categoryDomain = null;
    let categoryDomainName = null;
    for (const [domKey, domObj] of Object.entries(DOMAIN_CATEGORIES)) {
      if (domObj.keywords.some(kw => normText.includes(kw) || unaccented.includes(kw))) {
        categoryDomain = domKey;
        categoryDomainName = domObj.name;
        break;
      }
    }

    // 6. Broad Category Inquiry Detection (Trí An Active Listening: Hỏi lại khi câu hỏi chưa rõ)
    const isBroadCategory = !extractedModelCode && !budgetMax && (
      /^(?:tư vấn|tu van|hỏi về|hoi ve|tìm hiểu|tim hieu)\s+(?:máy tính|may tinh|laptop|tivi|tv|máy in|may in|trà|tra|nước hoa|nuoc hoa|máy đếm tiền|may dem tien|cà phê|ca phe)\s*$/i.test(normText) ||
      /(?:có|co)\s+(?:những|cac|nhung)\s+(?:loại|mẫu|dong|dòng)\s+(?:máy tính|may tinh|laptop|tivi|tv|máy in|may in|trà|tra|nước hoa|nuoc hoa|máy đếm tiền|may dem tien)\s*(?:nào|nao)/i.test(normText)
    );

    // 7. Product Name Candidate Cleaning
    const cleanedQuery = normText
      .replace(/(cho tôi|cho em|cho e|tôi|mình|minh|em|anh|chị|lập|xin|cần|bảng báo giá|báo giá|bao gia|chi tiết|giúp|với|nhé|nha|mua|bán|có sẵn|tư vấn|tìm|hỏi|dưới|khoảng|tầm giá|\d+|triệu|tr|k|nghìn|máy|cái|chiếc|bộ|sản phẩm|có hàng không|co hang khong)/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Filter out policy, handoff and comparison meta phrases so they are never mistakenly treated as product names
    const isNonProductPhrase = /(bảo hành|giao hàng|đổi trả|phí ship|gặp nhân viên|người thật|chuyên viên|so sánh|khác nhau|hỗ trợ trực tiếp)/i.test(cleanedQuery);
    const resolvedProductName = isNonProductPhrase ? null : (cleanedQuery || null);

    const extractedPhone = normText.match(/(0\d{9})\b/)?.[1] || null;

    return {
      productName: resolvedProductName,
      quantity,
      budget: budgetMax,
      budgetMax,
      budgetMin,
      brand: matchedBrand,
      modelCode: extractedModelCode,
      categoryDomain,
      categoryDomainName,
      isBroadCategory,
      phone: extractedPhone,
      extractedPhone
    };
  }
}

export default IntentEngine;
