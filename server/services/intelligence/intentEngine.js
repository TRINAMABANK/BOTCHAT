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

/**
 * 7 Canonical Intent Groups for TRÍ AI Brain 2.1
 */
export const INTENT_GROUPS = {
  GENERAL_CHAT: 'GENERAL_CHAT',
  PRODUCT_INQUIRY: 'PRODUCT_INQUIRY',
  APPOINTMENT: 'APPOINTMENT',
  SCHEDULE_QUERY: 'SCHEDULE_QUERY',
  REMINDER: 'REMINDER',
  BUSINESS_SUPPORT: 'BUSINESS_SUPPORT',
  UNKNOWN: 'UNKNOWN'
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

/**
 * Helper to resolve canonical Intent Group from primary intent
 */
export function getIntentGroup(primaryIntent = '') {
  switch (primaryIntent) {
    case 'APPOINTMENT':
      return INTENT_GROUPS.APPOINTMENT;
    case 'SCHEDULE_QUERY':
      return INTENT_GROUPS.SCHEDULE_QUERY;
    case 'REMINDER':
      return INTENT_GROUPS.REMINDER;
    case 'GREETING':
    case 'IDENTITY_INQUIRY':
    case 'GENERAL_CHAT':
    case 'GENERAL_CONVERSATION':
    case 'INTERNET_SEARCH':
      return INTENT_GROUPS.GENERAL_CHAT;
    case 'BUSINESS_SUPPORT':
    case 'INTERNAL_DOCUMENT_RAG':
    case 'EXCEL_CALCULATION':
    case 'STAFF_HANDOFF':
    case 'COMPANY_INFO':
    case 'COMPLAINT':
    case 'MEMORY_COMMAND':
      return INTENT_GROUPS.BUSINESS_SUPPORT;
    case 'PRICE_INQUIRY':
    case 'FORMAL_QUOTATION':
    case 'ORDER_REQUEST':
    case 'PRODUCT_COMPARISON':
    case 'LIVE_WEBSITE_SEARCH':
    case 'POLICY_INQUIRY':
    case 'BROAD_CATEGORY_INQUIRY':
    case 'UNCLEAR_NEEDS':
    case 'SALES_CONSULTATION':
    case 'SPEC_SEARCH':
      return INTENT_GROUPS.PRODUCT_INQUIRY;
    case 'UNKNOWN':
    case 'RESET_CHAT_REQUEST':
    case 'CONFIRM_RESET_CHAT':
    default:
      return INTENT_GROUPS.UNKNOWN;
  }
}

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
   * @returns {Object} { primaryIntent, intentGroup, confidence, slots, flags }
   */
  static analyzeIntent(rawMessage = '', context = {}) {
    const trimmedRaw = (rawMessage || '').trim();
    const norm = this.normalizeText(rawMessage);
    const unaccented = this.stripDiacritics(norm);

    // 0. Check UNKNOWN / Ambiguous empty / single punctuation / noise
    if (!trimmedRaw || /^[?!.,;:…\s]+$/.test(trimmedRaw) || /^(?:ừ|uh|sao|alo\?|ơ|hả|sao\s+thế|gì\s+vậy)\s*$/i.test(norm)) {
      return {
        primaryIntent: 'UNKNOWN',
        intentGroup: INTENT_GROUPS.UNKNOWN,
        confidence: 0.98,
        slots: { rawMessage: trimmedRaw },
        flags: { isSales: false, isDoc: false }
      };
    }

    // 1. Check Memory Control Commands (Xem, sửa, xóa, tắt ghi nhớ)
    const isMemoryCommand = /(quên\b.*(?:tôi|thông tin|dữ liệu|sđt|số điện thoại)|xóa\b.*(?:thông tin|trí nhớ|dữ liệu|bộ nhớ)|đừng ghi nhớ|không lưu thông tin|xem thông tin đã lưu|lưu thông tin này)/i.test(norm);
    if (isMemoryCommand) {
      let memoryAction = 'FORGET';
      if (/xem thông tin/i.test(norm)) memoryAction = 'VIEW';
      else if (/lưu thông tin/i.test(norm)) memoryAction = 'SAVE';

      return {
        primaryIntent: 'MEMORY_COMMAND',
        intentGroup: INTENT_GROUPS.BUSINESS_SUPPORT,
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
        intentGroup: INTENT_GROUPS.UNKNOWN,
        confidence: 0.99,
        slots: { rawMessage },
        flags: { isSales: false, isDoc: false }
      };
    }

    if (isResetChatCommand) {
      return {
        primaryIntent: 'RESET_CHAT_REQUEST',
        intentGroup: INTENT_GROUPS.UNKNOWN,
        confidence: 0.99,
        slots: { rawMessage },
        flags: { isSales: false, isDoc: false }
      };
    }

    // 2. Extract Entities & Slots (with strict non-product exclusions)
    const slots = this.extractSlots(norm, unaccented);

    // 3. APPOINTMENT INTENT (Hẹn gặp, đặt lịch, hẹn ăn uống, cà phê, đi nhậu, công việc)
    const isAppointmentExplicit = /(?:can\s+|muon\s+|xin\s+)?(?:hen\b|dat\s+lich|sap\s+xep\s+cuoc\s+hen|gap\s+mat|hen\s+gap|gap\s+anh|gap\s+chi|di\s+nhau|di\s+ca\s+phe|di\s+cafe|uong\s+ca\s+phe|an\s+trua|an\s+toi|di\s+an|hen\s+ho|ban\s+cong\s+viec|hop\s+mat|trao\s+doi\s+cong\s+viec|noi\s+chuyen\s+cong\s+viec)\b/i.test(unaccented);
    const isAppointmentFollowUp = /(?:vay\s+|the\s+|thi\s+)?(?:dat\s+(?:ngay\s+do|hom\s+do|gio\s+do|lich\s+do)|chot\s+(?:lich|ngay|gio)|hen\s+(?:anh\s+ay|chi\s+ay|ngay\s+do|hom\s+do)|dat\s+lich\s+ngay\s+do)\b/i.test(unaccented);

    // 4. SCHEDULE QUERY INTENT (Tra cứu lịch cá nhân, kiểm tra lịch làm việc, kiểm tra lịch trống, xem lịch đã đặt)
    const isScheduleAvailability = /(?:lich\s+(?:nao\s+ranh|ngay\s+nao\s+ranh|gio\s+nao\s+ranh|khi\s+nao\s+ranh|ngay\s+nao\s+trong|gio\s+nao\s+trong|trong|ranh)|ngay\s+nao\s+ranh|gio\s+nao\s+ranh|gio\s+nao\s+trong|luc\s+nao\s+ranh|thoi\s+gian\s+ranh|co\s+ranh\s+khong|co\s+ranh\s+ko|co\s+ban\s+khong|lich\s+lam\s+viec|lich\s+cong\s+tac|lich\s+tuan\s+nay|lich\s+hom\s+nay|lich\s+ngay\s+mai|kiem\s+tra\s+lich|tra\s+cuu\s+lich|xem\s+lich)\b/i.test(unaccented);
    const isDayAvailabilityCheck = /(?:thu\s*(?:hai|ba|tu|nam|sau|bay|chu\s*nhat|2|3|4|5|6|7|cn)|hom\s+nay|ngay\s+mai|tuan\s+nay|tuan\s+toi|chieu\s+mai|sang\s+mai)\s*(?:co\s+)?(?:ranh|trong|ban|duoc\s+khong)\b/i.test(unaccented);

    // Multi-turn context awareness for appointment/schedule
    const prevHistory = context.conversationHistory || context.history || [];
    const hadRecentAppointment = prevHistory.length > 0 && prevHistory.slice(-2).some(h => /(?:hen|lich|ranh|ca phe|di nhau|gap mat|dat ngay)/i.test(this.stripDiacritics(h.content || '')));

    // Check if query is explicitly asking price or product specs (Topic switch from appointment to shopping)
    const isExplicitProductKeywords = /(?:bao\s+nhieu\s+tien|gia\s+bao\s+nhieu|may\s+tien|bao\s+gia|mua\s+ngay|dat\s+mua|mua\s+hang|laptop|may\s+in|may\s+scan|tra\s+|ca\s+phe\s+rang|tu\s+lanh|may\s+lanh|man\s+hinh|may\s+dem\s+tien)\b/i.test(unaccented);

    if (!isExplicitProductKeywords && (isAppointmentExplicit || isAppointmentFollowUp || (hadRecentAppointment && /(ca phe|nhau|an trua|gap mat|ngay do|gio do)/i.test(unaccented)))) {
      // Prioritize APPOINTMENT when user wants to book or arrange a meeting
      return {
        primaryIntent: 'APPOINTMENT',
        intentGroup: INTENT_GROUPS.APPOINTMENT,
        confidence: 0.96,
        slots,
        flags: { isSales: false, isDoc: false, isAppointment: true }
      };
    }

    if (!isExplicitProductKeywords && (isScheduleAvailability || isDayAvailabilityCheck || (hadRecentAppointment && /(ranh|trong|ban)/i.test(unaccented)))) {
      // Prioritize SCHEDULE_QUERY when checking availability
      return {
        primaryIntent: 'SCHEDULE_QUERY',
        intentGroup: INTENT_GROUPS.SCHEDULE_QUERY,
        confidence: 0.96,
        slots,
        flags: { isSales: false, isDoc: false, isSchedule: true }
      };
    }

    // 5. REMINDER INTENT (Nhắc việc, nhắc lịch, nhắc cuộc hẹn)
    const isReminder = /(?:nhac\s+(?:toi|em|minh|giup|cho|viec|lich|hen)|tao\s+nhac\s+nho|dat\s+nhac\s+nho|len\s+lich\s+nhac|nhac\s+nho)\b/i.test(unaccented);
    if (isReminder) {
      return {
        primaryIntent: 'REMINDER',
        intentGroup: INTENT_GROUPS.REMINDER,
        confidence: 0.96,
        slots,
        flags: { isSales: false, isDoc: false, isReminder: true }
      };
    }

    // 6. BUSINESS SUPPORT & CORPORATE INQUIRIES
    const isOfficeDocDevice = /(may huy tai lieu|may scan tai lieu|may quet tai lieu)/i.test(unaccented);
    const isDocExplicitQuery = !isOfficeDocDevice && ((/(tai lieu|quy trinh|quy che|quyet dinh|dieu chuyen|nam a bank|namabank|thu tuc|cong van|van ban|so tay|quy dinh|ho so)/i.test(unaccented) || (/(chinh sach)/i.test(unaccented) && !/(bao hanh|doi tra|giao hang|mua hang)/i.test(unaccented))) && !/(bao gia)/i.test(unaccented));

    const isCompanyInfo = /(?:dia\s+chi\s+(?:cong\s+ty|cua\s+hang|shop|van\s+phong)|tru\s+so\s+o\s+dau|van\s+phong\s+o\s+dau|thoi\s+gian\s+lam\s+viec|gio\s+mo\s+cua|tong\s+dai\s+ho\s+tro|hotline\s+(?:cong\s+ty|shop)|thong\s+tin\s+doanh\s+nghiep)\b/i.test(unaccented);
    const isComplaint = /(?:khieu\s+nai|phan\s+nan|thai\s+do\s+phuc\s+vu|cham\s+soc\s+khach\s+hang\s+kem|giao\s+hang\s+qua\s+cham)\b/i.test(unaccented);

    if (isDocExplicitQuery) {
      return {
        primaryIntent: 'INTERNAL_DOCUMENT_RAG',
        intentGroup: INTENT_GROUPS.BUSINESS_SUPPORT,
        confidence: 0.95,
        slots,
        flags: { isSales: false, isDoc: true }
      };
    }

    if (isCompanyInfo || isComplaint) {
      return {
        primaryIntent: isComplaint ? 'COMPLAINT' : 'COMPANY_INFO',
        intentGroup: INTENT_GROUPS.BUSINESS_SUPPORT,
        confidence: 0.95,
        slots,
        flags: { isSales: false, isDoc: false }
      };
    }

    // 7. EXCEL QUERY INTENT
    const isExcel = /(excel|bảng tính|bang tinh|tổng cộng|tong cong|doanh thu|sheet)/i.test(norm);
    if (isExcel) {
      return {
        primaryIntent: 'EXCEL_CALCULATION',
        intentGroup: INTENT_GROUPS.BUSINESS_SUPPORT,
        confidence: 0.95,
        slots,
        flags: { isSales: false, isDoc: false }
      };
    }

    // 8. GENERAL CHAT / GREETING / SOCIAL INTERACTION
    const isGreeting = /^(hi|hello|chào|chao|alo|xin chào|xin chao|ê|hey|hê lô|bạn là ai|ban la ai|em là ai|em tên gì|bạn tên gì|khỏe không|khoe khong|chúc|cảm ơn|cam on|thanks|thank you|ok|oke|okie)(\s.*)?$/i.test(norm);
    const isIdentityInquiry = /(bạn là ai|em là ai|robot là ai|tên gì|giới thiệu bản thân)/i.test(norm);
    const isGeneralSmallTalk = /(?:thời\s+tiết|thoi\s+tiet|buồn\s+quá|buon\s+qua|vui\s+quá|vui\s+qua|kể\s+chuyện|ke\s+chuyen|tâm\s+sự|tam\s+su|hát\s+đi|hat\s+di|người\s+yêu|nguoi\s+yeu|ăn\s+cơm\s+chưa|an\s+com\s+chua|ngủ\s+ngon|ngu\s+ngon|chúc\s+một\s+ngày|chuc\s+mot\s+ngay|bạn\s+thông\s+minh\s+thật|ban\s+thong\s+minh\s+that|tạm\s+biệt|tam\s+biet|bai\s+bai|bye\s+bye|hôm\s+nay\s+thế\s+nào|hom\s+nay\s+the\s+nao)\b/i.test(norm);

    // 9. WEB SEARCH INTENT
    const isWebSearch = /(tin tức|tin tuc|thời tiết|thoi tiet|tìm trên mạng|tim tren mang|tra cứu internet|tra cuu mang)/i.test(norm);
    if (isWebSearch && !slots.productName) {
      return {
        primaryIntent: 'INTERNET_SEARCH',
        intentGroup: INTENT_GROUPS.GENERAL_CHAT,
        confidence: 0.9,
        slots,
        flags: { isSales: false, isDoc: false }
      };
    }

    // 10. PRODUCT INQUIRY INTENTS (Only triggered when customer genuinely asks for products/sales)
    const isQuotation = /(báo giá|bao gia|lập báo giá|lap bao gia|xin báo giá|bảng báo giá|bang bao gia)/i.test(norm);
    if (isQuotation) {
      return {
        primaryIntent: 'FORMAL_QUOTATION',
        intentGroup: INTENT_GROUPS.PRODUCT_INQUIRY,
        confidence: 0.98,
        slots,
        flags: { isSales: true, isDoc: false }
      };
    }

    const isStaffHandoff = /(gặp nhân viên|gap nhan vien|gặp người|gap nguoi|nói chuyện với người|chuyên viên tư vấn|chuyen vien tu van|hỗ trợ trực tiếp|ho tro truc tiep|gọi lại cho tôi|goi lai cho toi|gọi điện lại|tư vấn trực tiếp|chăm sóc khách hàng|cskh|gặp chủ shop|người thật)\b/i.test(norm);
    if (isStaffHandoff) {
      return {
        primaryIntent: 'STAFF_HANDOFF',
        intentGroup: INTENT_GROUPS.PRODUCT_INQUIRY,
        confidence: 0.98,
        slots,
        flags: { isSales: true, isDoc: false }
      };
    }

    const isPolicyInquiry = /(?:chính sách|chinh sach|thời gian|thoi gian|thời hạn|thoi han|quy định|quy dinh)?\s*(?:bảo hành|bao hanh|đổi trả|doi tra|giao hàng|giao hang|phí ship|phi ship|vận chuyển|van chuyen|ship cod)\b/i.test(norm);
    if (isPolicyInquiry) {
      return {
        primaryIntent: 'POLICY_INQUIRY',
        intentGroup: INTENT_GROUPS.PRODUCT_INQUIRY,
        confidence: 0.95,
        slots,
        flags: { isSales: true, isDoc: false }
      };
    }

    const isOrderRequest = /(đặt mua|mua ngay|lấy chiếc này|lấy con này|mua con này|đặt hàng|chốt đơn|lấy mẫu này)\b/i.test(norm);
    if (isOrderRequest) {
      return {
        primaryIntent: 'ORDER_REQUEST',
        intentGroup: INTENT_GROUPS.PRODUCT_INQUIRY,
        confidence: 0.95,
        slots,
        flags: { isSales: true, isDoc: false }
      };
    }

    const isComparison = /(so sánh|so sanh|khác nhau|khac nhau|mẫu nào tốt hơn|loại nào hơn|nên mua con nào)/i.test(norm);
    if (isComparison) {
      return {
        primaryIntent: 'PRODUCT_COMPARISON',
        intentGroup: INTENT_GROUPS.PRODUCT_INQUIRY,
        confidence: 0.92,
        slots,
        flags: { isSales: true, isDoc: false }
      };
    }

    const isLiveWebIntent = /(website|trên website|trên trang web|tren website|web nhà cung cấp|web nhacungcap|tìm trên web|kiểm tra.*website|tra cứu.*website|giá trên website|xem link|đường dẫn)/i.test(norm);
    if (isLiveWebIntent) {
      return {
        primaryIntent: 'LIVE_WEBSITE_SEARCH',
        intentGroup: INTENT_GROUPS.PRODUCT_INQUIRY,
        confidence: 0.95,
        slots,
        flags: { isSales: true, isDoc: false }
      };
    }

    const isPriceQuery = /(giá bao nhiêu|gia bao nhieu|bao nhiêu tiền|bao nhieu tien|giá cả|gia ca|chi phí|tầm giá|mấy tiền)/i.test(norm);
    if (isPriceQuery) {
      return {
        primaryIntent: 'PRICE_INQUIRY',
        intentGroup: INTENT_GROUPS.PRODUCT_INQUIRY,
        confidence: 0.92,
        slots,
        flags: { isSales: true, isDoc: false }
      };
    }

    // Check greeting and general small talk when no product or price query
    if ((isGreeting || isGeneralSmallTalk) && !slots.productName) {
      return {
        primaryIntent: isIdentityInquiry ? 'IDENTITY_INQUIRY' : (isGreeting ? 'GREETING' : 'GENERAL_CHAT'),
        intentGroup: INTENT_GROUPS.GENERAL_CHAT,
        confidence: 0.96,
        slots,
        flags: { isSales: false, isDoc: false }
      };
    }

    // Unclear needs detection (user says "tôi muốn mua", "tôi cần mua", "cần mua" with no specific product)
    if (!slots.productName && /(cần mua|muốn mua|tìm mua|bán đồ|có gì bán|tôi cần mua|tôi muốn mua)\s*$/i.test(norm)) {
      return {
        primaryIntent: 'UNCLEAR_NEEDS',
        intentGroup: INTENT_GROUPS.PRODUCT_INQUIRY,
        confidence: 0.92,
        slots,
        flags: { isSales: true, isDoc: false }
      };
    }

    // Broad Category Consultation requiring clarification (Active Listening)
    if (slots.isBroadCategory) {
      return {
        primaryIntent: 'BROAD_CATEGORY_INQUIRY',
        intentGroup: INTENT_GROUPS.PRODUCT_INQUIRY,
        confidence: 0.94,
        slots,
        flags: { isSales: true, isDoc: false }
      };
    }

    // Explicit product keywords or resolved product name from catalog
    const isSalesKeywords = /(mua|bán|ban|sản phẩm|san pham|hàng|laptop|máy in|may in|máy scan|may scan|trà|tra|cà phê|cafe|nước hoa|nuoc hoa|màn hình|tivi|tai nghe|bột matcha|cpu|tablet|chuột|bàn phím|điện thoại|dien thoai)/i.test(norm);

    if (isSalesKeywords || slots.productName) {
      return {
        primaryIntent: 'SALES_CONSULTATION',
        intentGroup: INTENT_GROUPS.PRODUCT_INQUIRY,
        confidence: 0.9,
        slots,
        flags: { isSales: true, isDoc: false }
      };
    }

    // Default fallback: General conversation (Do NOT assume sales!)
    return {
      primaryIntent: 'GENERAL_CONVERSATION',
      intentGroup: INTENT_GROUPS.GENERAL_CHAT,
      confidence: 0.85,
      slots,
      flags: { isSales: false, isDoc: false }
    };
  }

  /**
   * Extract slots: product, quantity, budget, brand, modelCode, domain, appointment entities
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
      /(?:có|co)\s+(?:những|cac|nhung)\s+(?:loại|mẫu|dong|dòng)\s+(?:máy tính|may tinh|laptop|tivi|tv|máy in|may in|trà|tra|nước hoa|nuoc hoa|máy đếm tiền|may dem tien)\s*(?:nào|nao)/i.test(normText) ||
      /^(?:tôi\s+|em\s+|anh\s+|chị\s+)?(?:cần|muốn|tìm)\s+(?:mua\s+)?(?:máy tính|may tinh|laptop|tivi|tv|máy in|may in|trà|tra|nước hoa|nuoc hoa|cà phê|ca phe)\s*$/i.test(normText)
    );

    // 7. Extract Appointment / Schedule Entities
    let targetPerson = null;
    const personMatch = normText.match(/(?:anh|chị|ông|bà|em|sếp)?\s*(trí|quang nhựt trí|nam|hùng|lan|mai|tuấn|minh|hương|hoa)\b/i);
    if (personMatch) {
      targetPerson = personMatch[0].trim();
    }

    let appointmentActivity = null;
    const actMatch = normText.match(/\b(đi nhậu|nhậu|cà phê|cafe|uống cafe|uống cà phê|ăn trưa|ăn tối|đi ăn|ăn uống|họp mặt|bàn công việc|gặp mặt|trao đổi công việc|nói chuyện)\b/i);
    if (actMatch) {
      appointmentActivity = actMatch[1].trim();
    }

    let timeSpec = null;
    const timeMatch = normText.match(/\b(?:thứ\s*(?:hai|ba|tư|tu|năm|nam|sáu|sau|bảy|bay|chủ\s*nhật|chu\s*nhat|2|3|4|5|6|7|cn)|hôm nay|ngày mai|tuần này|tuần tới|cuối tuần|\d{1,2}h(?:\d{2})?|\d{1,2}\s*(?:giờ|h)\s*(?:sáng|chiều|tối)?)\b/i);
    if (timeMatch) {
      timeSpec = timeMatch[0].trim();
    }

    // 8. Strict Product Name Candidate Cleaning (Excludes all non-product appointment, schedule, meta terms)
    const cleanedQuery = normText
      .replace(/(cho tôi|cho em|cho e|tôi|mình|minh|em|anh|chị|lập|xin|cần|bảng báo giá|báo giá|bao gia|chi tiết|giúp|với|nhé|nha|mua|bán|có sẵn|tư vấn|tìm|hỏi|dưới|khoảng|tầm giá|\b\d+\b|triệu|tr|k|nghìn|máy|cái|chiếc|bộ|sản phẩm|có hàng không|co hang khong)/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const unaccentedClean = this.stripDiacritics(cleanedQuery);

    // Blacklist non-product verbs and nouns
    const NON_PRODUCT_TERMS = /(?:hen|gap|nhau|ca phe|cafe|uong|an trua|an toi|di an|lich|ranh|trong|nhac|nho|ban|noi chuyen|tam su|thoi tiet|khieu nai|dia chi|bao hanh|giao hang|doi tra|phi ship|gap nhan vien|nguoi that|chuyen vien|so sanh|khac nhau|ho tro truc tiep|cong viec|cuoc hen|ngay nao|thu sau|thu hai|thu ba|thu tu|thu nam|thu bay|chu nhat|tuan nay|ngay mai|hom nay|tuan toi|dat ngay do|chot lich|dat lich|nguoi yeu|ban gai|ban trai|thong minh)/i;

    const isNonProductPhrase = NON_PRODUCT_TERMS.test(unaccentedClean);
    // If it has non-product terms and no verified hardware model code, resolvedProductName MUST be null!
    const resolvedProductName = (isNonProductPhrase || isBroadCategory) && !extractedModelCode ? null : (cleanedQuery || null);

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
      extractedPhone,
      targetPerson,
      appointmentActivity,
      timeSpec,
      appointmentDetails: {
        targetPerson,
        activity: appointmentActivity,
        timeSpec
      }
    };
  }
}

export default IntentEngine;
