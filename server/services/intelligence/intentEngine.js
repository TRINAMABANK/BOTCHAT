import { ActiveProductContext } from './activeProductContext.js';
import {
  extractCustomerName,
  extractCustomerAddressing,
  isCustomerNameDeclaration,
  hasBlockedNameTokens
} from '../../salesEngine.js';

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
 * Canonical Intent Groups for TRÍ AI Brain 2.1 (Dual Role AI Employee)
 */
export const INTENT_GROUPS = {
  GENERAL_CHAT: 'GENERAL_CHAT',
  PRODUCT_INQUIRY: 'PRODUCT_INQUIRY',
  SERVICE_CONSULTATION: 'SERVICE_CONSULTATION',
  APPOINTMENT: 'APPOINTMENT',
  SCHEDULE_QUERY: 'SCHEDULE_QUERY',
  REMINDER: 'REMINDER',
  BUSINESS_SUPPORT: 'BUSINESS_SUPPORT',
  SECRETARY_TASK: 'SECRETARY_TASK',
  OFFICE_TASK: 'OFFICE_TASK',
  SECURITY_BLOCKED: 'SECURITY_BLOCKED',
  MIXED: 'MIXED',
  UNKNOWN: 'UNKNOWN'
};

/**
 * 9 Core Domain Categories (Giai đoạn 1 & Dịch vụ thi công)
 */
export const DOMAIN_INTENTS = {
  SALES: 'SALES',
  SERVICE: 'SERVICE',
  SECRETARY: 'SECRETARY',
  DOCUMENT: 'DOCUMENT',
  DATA: 'DATA',
  RESEARCH: 'RESEARCH',
  KNOWLEDGE: 'KNOWLEDGE',
  CONVERSATION: 'CONVERSATION',
  MIXED: 'MIXED'
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
    case 'CUSTOMER_INTRODUCTION':
    case 'CUSTOMER_DECLINE_NAME':
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
    case 'SECRETARY_CRM_SUMMARY':
    case 'SECRETARY_TASK':
    case 'OWNER_DAILY_PLAN':
      return INTENT_GROUPS.SECRETARY_TASK;
    case 'EMAIL_TASK':
    case 'OFFICE_TASK':
      return INTENT_GROUPS.OFFICE_TASK;
    case 'SECURITY_OTHER_CUSTOMER_DATA':
    case 'SECURITY_OWNER_PRIVATE_SCHEDULE':
    case 'SECURITY_STAFF_UNAUTHORIZED_REPORT':
    case 'SECURITY_IMPERSONATION_ATTEMPT':
    case 'SECURITY_BLOCKED':
      return INTENT_GROUPS.SECURITY_BLOCKED;
    case 'SERVICE_SURVEY_REQUEST':
    case 'INSTALLATION_REQUEST':
    case 'MAINTENANCE_REQUEST':
    case 'REPAIR_REQUEST':
    case 'SERVICE_CONSULTATION':
      return INTENT_GROUPS.SERVICE_CONSULTATION;
    case 'PRICE_INQUIRY':
    case 'FORMAL_QUOTATION':
    case 'ORDER_REQUEST':
    case 'PRODUCT_COMPARISON':
    case 'LIVE_WEBSITE_SEARCH':
    case 'POLICY_INQUIRY':
    case 'BROAD_CATEGORY_INQUIRY':
    case 'UNCLEAR_NEEDS':
    case 'SALES_CONSULTATION':
    case 'PAGINATION_NEXT':
    case 'VIEW_ALL_PRODUCTS':
    case 'SPEC_SEARCH':
      return INTENT_GROUPS.PRODUCT_INQUIRY;
    case 'MIXED_SALES_SECRETARY':
    case 'MIXED':
      return INTENT_GROUPS.MIXED;
    case 'UNKNOWN':
    case 'RESET_CHAT_REQUEST':
    case 'CONFIRM_RESET_CHAT':
    default:
      return INTENT_GROUPS.UNKNOWN;
  }
}

/**
 * Resolve 8 Canonical Domain Intent Categories (Giai đoạn 1)
 */
export function getDomainIntent(primaryIntent = '') {
  switch (primaryIntent) {
    case 'PRODUCT_INQUIRY':
    case 'PRICE_INQUIRY':
    case 'TECH_SPECS':
    case 'PRODUCT_COMPARISON':
    case 'ORDER_REQUEST':
    case 'FORMAL_QUOTATION':
    case 'SPEC_SEARCH':
    case 'BROAD_CATEGORY_INQUIRY':
    case 'SALES_CONSULTATION':
    case 'PAGINATION_NEXT':
    case 'VIEW_ALL_PRODUCTS':
    case 'LIVE_WEBSITE_SEARCH':
      return DOMAIN_INTENTS.SALES;

    case 'SERVICE_SURVEY_REQUEST':
    case 'INSTALLATION_REQUEST':
    case 'MAINTENANCE_REQUEST':
    case 'REPAIR_REQUEST':
    case 'SERVICE_CONSULTATION':
      return DOMAIN_INTENTS.SERVICE;

    case 'SECRETARY_TASK':
    case 'SECRETARY_CRM_SUMMARY':
    case 'OWNER_DAILY_PLAN':
    case 'APPOINTMENT':
    case 'SCHEDULE_QUERY':
    case 'REMINDER':
      return DOMAIN_INTENTS.SECRETARY;

    case 'INTERNAL_DOCUMENT_RAG':
    case 'DOCUMENT_TASK':
    case 'OFFICE_TASK':
    case 'EMAIL_TASK':
      return DOMAIN_INTENTS.DOCUMENT;

    case 'EXCEL_CALCULATION':
    case 'DATA_ANALYSIS':
      return DOMAIN_INTENTS.DATA;

    case 'INTERNET_SEARCH':
    case 'WEB_RESEARCH':
      return DOMAIN_INTENTS.RESEARCH;

    case 'KNOWLEDGE_QUERY':
    case 'GENERAL_KNOWLEDGE':
      return DOMAIN_INTENTS.KNOWLEDGE;

    case 'MIXED_SALES_SECRETARY':
    case 'MIXED':
      return DOMAIN_INTENTS.MIXED;

    case 'GREETING':
    case 'IDENTITY_INQUIRY':
    case 'GENERAL_CHAT':
    case 'GENERAL_CONVERSATION':
    case 'COMPANY_INFO':
    case 'POLICY_INQUIRY':
    case 'STAFF_HANDOFF':
    case 'COMPLAINT':
    default:
      return DOMAIN_INTENTS.CONVERSATION;
  }
}

export class IntentEngine {
  /**
   * Normalize input text with typo correction and slang expansion
   */
  static normalizeText(rawText = '') {
    if (!rawText) return '';
    let normalized = rawText.trim().toLowerCase();

    // Replace common Vietnamese slang & typos with Unicode boundaries
    for (const [pattern, replacement] of Object.entries(VIETNAMESE_SLANG_MAP)) {
      const cleanPattern = pattern.replace(/^\\b|\\b$/g, '');
      const unicodeRegex = new RegExp(`(?<![\\p{L}\\p{N}])${cleanPattern}(?![\\p{L}\\p{N}])`, 'giu');
      normalized = normalized.replace(unicodeRegex, replacement);
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
   * Standardize and format intent output (Giai đoạn 1 - Universal Intent Engine)
   */
  static formatIntentOutput(result = {}) {
    const rawConf = Number(result?.confidence);
    const confidence = Math.min(1.0, Math.max(0.0, isNaN(rawConf) ? 0.8 : rawConf));
    const isLowConfidence = confidence < 0.65;
    const needsClarification = isLowConfidence || result?.primaryIntent === 'UNCLEAR_NEEDS' || result?.needsClarification === true;

    let primaryIntent = result?.primaryIntent || 'GENERAL_CONVERSATION';
    let domain = result?.domain || getDomainIntent(primaryIntent);
    let intentGroup = result?.intentGroup || getIntentGroup(primaryIntent);

    if (isLowConfidence) {
      primaryIntent = 'UNCLEAR_NEEDS';
      domain = DOMAIN_INTENTS.CONVERSATION;
      intentGroup = INTENT_GROUPS.UNKNOWN;
    }

    // STRICT SALES ENFORCEMENT: isSales is ONLY true when domain is SALES or MIXED
    const isSales = (domain === DOMAIN_INTENTS.SALES || domain === DOMAIN_INTENTS.MIXED);
    const isDoc = domain === DOMAIN_INTENTS.DOCUMENT;
    const isSecretary = (domain === DOMAIN_INTENTS.SECRETARY || domain === DOMAIN_INTENTS.MIXED);
    const isMixed = domain === DOMAIN_INTENTS.MIXED;

    return {
      primaryIntent,
      domain,
      intentGroup,
      confidence: Number(confidence.toFixed(2)),
      action: result?.action || null,
      needsClarification,
      subIntents: result?.subIntents || [],
      capabilities: result?.capabilities || (
        domain === DOMAIN_INTENTS.SALES ? ['AI_SALES'] :
        domain === DOMAIN_INTENTS.SERVICE ? ['SERVICE_CONSULTANT'] :
        domain === DOMAIN_INTENTS.SECRETARY ? ['AI_SECRETARY'] :
        domain === DOMAIN_INTENTS.DOCUMENT ? ['DOCUMENT_RAG'] :
        domain === DOMAIN_INTENTS.DATA ? ['DATA_EXCEL'] :
        domain === DOMAIN_INTENTS.RESEARCH ? ['WEB_RESEARCH'] :
        domain === DOMAIN_INTENTS.KNOWLEDGE ? ['KNOWLEDGE_BASE'] :
        domain === DOMAIN_INTENTS.MIXED ? ['AI_SALES', 'AI_SECRETARY'] :
        ['GENERAL_CONVERSATION']
      ),
      slots: result?.slots || {},
      flags: {
        ...(result?.flags || {}),
        isSales,
        isDoc,
        isSecretary,
        isMixed
      }
    };
  }

  /**
   * Main intent recognition entry point
   * 
   * @param {string} rawMessage - Raw customer query
   * @param {Object} context - Conversation turn context
   * @returns {Object} { primaryIntent, domain, intentGroup, confidence, needsClarification, subIntents, capabilities, slots, flags }
   */
  static analyzeIntent(rawMessage = '', context = {}) {
    const rawResult = this._detectRawIntent(rawMessage, context);
    return this.formatIntentOutput(rawResult);
  }

  /**
   * Internal raw intent detector
   */
  static _detectRawIntent(rawMessage = '', context = {}) {
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
    const slots = this.extractSlots(norm, unaccented, context);

    // 2B. SECURITY & PRIVACY CHECKS (Anti-Data Leak & Access Protection)
    const isCustomerAskingOtherData = /(?:so\s+dien\s+thoai|sdt|thong\s+tin|danh\s+sach)\s+(?:cua\s+)?(?:khach\s+hang\s+khac|khach\s+khac|nguoi\s+khac|anh\s+tuan|khach\s+mua)/i.test(unaccented) ||
      /(?:cho\s+toi\s+xem|xem)\s+(?:danh\s+sach\s+so\s+dien\s+thoai|so\s+dien\s+thoai\s+cac\s+khach)/i.test(unaccented);

    if (isCustomerAskingOtherData) {
      return {
        primaryIntent: 'SECURITY_OTHER_CUSTOMER_DATA',
        intentGroup: INTENT_GROUPS.SECURITY_BLOCKED,
        confidence: 0.99,
        slots,
        flags: { isSales: false, isDoc: false, isBlocked: true }
      };
    }

    // Anti-Impersonation Check: User self-claims to be Anh Trí in chat without verified admin token
    const isCustomerIntro = slots.isNameDeclaration || /(?:cu\s+goi\s+(?:toi|minh|em|anh|chi)\s+la|ten\s+(?:toi|minh|em|anh|chi)\s+la|(?:toi|minh|em|anh|chi)\s+ten\s+la)\s+/i.test(unaccented);
    const isImpersonatingOwner = context.userContext?.isImpersonationAttempt || (!context.userContext?.isOwner && !isCustomerIntro && (
      /(?:toi\s+la|anh\s+la|minh\s+la)\s+(?:admin|chu\s+shop|chu\s+so\s+huu|chu\s+doanh\s+nghiep|quang\s+nhut\s+tri|sep\s+tri)/i.test(unaccented) ||
      /(?:toi|anh)\s+la\s+anh\s+tri\b/i.test(unaccented)
    ));
    if (isImpersonatingOwner) {
      return {
        primaryIntent: 'SECURITY_IMPERSONATION_ATTEMPT',
        intentGroup: INTENT_GROUPS.SECURITY_BLOCKED,
        confidence: 0.99,
        slots,
        flags: { isSales: false, isDoc: false, isBlocked: true }
      };
    }

    // Check Customer Decline Name
    const isCustomerDeclineName = /(?:khong\s+muon\s+(?:cho|noi|cung\s+cap)\s+ten|khong\s+can\s+(?:biet|xung|hoi)\s+ten|thoi\s+khong\s+can\s+ten|cu\s+tu\s+van\s+di|goi\s+la\s+khach\s+duoc\s+roi|cu\s+goi\s+(?:toi\s+)?la\s+khach|goi\s+la\s+khach\s+la\s+duoc)/i.test(unaccented);
    if (isCustomerDeclineName) {
      return {
        primaryIntent: 'CUSTOMER_DECLINE_NAME',
        intentGroup: INTENT_GROUPS.GENERAL_CHAT,
        confidence: 0.99,
        slots,
        flags: { isSales: false, isDoc: false }
      };
    }

    // Check Customer Self-Introduction (Khai báo tên / Cách xưng hô)
    if (slots.isNameDeclaration && slots.customerName && !slots.productName && !slots.isShortQuotationRequest) {
      return {
        primaryIntent: 'CUSTOMER_INTRODUCTION',
        intentGroup: INTENT_GROUPS.GENERAL_CHAT,
        confidence: 0.99,
        slots,
        flags: { isSales: false, isDoc: false }
      };
    }

    const isAskingOwnerPrivateSchedule = /(?:cho\s+toi\s+xem|xem\s+lich|kiem\s+tra\s+lich|xem|kiem\s+tra)\s+(?:lich|lich\s+trinh|danh\s+sach\s+viec|viec\s+can\s+lam|ke\s+hoach|todo)?.*(?:rieng|chi\s+tiet|ca\s+nhan|danh\s+sach\s+viec|viec\s+can\s+lam|ke\s+hoach|todo).*(?:anh\s+tri|sep\s+tri)/i.test(unaccented) ||
      /(?:anh\s+tri|sep\s+tri)\s+.*(?:cho\s+toi\s+xem\s+lich|xem\s+lich\s+rieng|lich\s+rieng|danh\s+sach\s+viec|viec\s+can\s+lam)/i.test(unaccented) ||
      /(?:lich\s+rieng\s+chi\s+tiet|lich\s+rieng|danh\s+sach\s+viec\s+can\s+lam|danh\s+sach\s+viec|viec\s+can\s+lam)\s+cua\s+(?:anh\s+tri|sep\s+tri)/i.test(unaccented);

    if (isAskingOwnerPrivateSchedule && !context.userContext?.isOwner) {
      return {
        primaryIntent: 'SECURITY_OWNER_PRIVATE_SCHEDULE',
        intentGroup: INTENT_GROUPS.SECURITY_BLOCKED,
        confidence: 0.99,
        slots,
        flags: { isSales: false, isDoc: false, isBlocked: true }
      };
    }

    const isAskingConfidentialReports = /(?:xuat\s+toan\s+bo|xem|bao\s+cao)\s+(?:doanh\s+thu|doanh\s+so|loi\s+nhuan|tai\s+chinh)\s+(?:mat|thang\s+nay|nam\s+nay)/i.test(unaccented);
    if (isAskingConfidentialReports && !context.userContext?.isOwner) {
      return {
        primaryIntent: 'SECURITY_STAFF_UNAUTHORIZED_REPORT',
        intentGroup: INTENT_GROUPS.SECURITY_BLOCKED,
        confidence: 0.99,
        slots,
        flags: { isSales: false, isDoc: false, isBlocked: true }
      };
    }

    // 2B-1. DỊCH VỤ THI CÔNG – LẮP ĐẶT – KHẢO SÁT – SỬA CHỮA – BẢO TRÌ
    // (BẮT BUỘC ƯU TIÊN TRƯỚC TRUY VẤN DANH MỤC SẢN PHẨM & AI SALES)
    const isServiceKeywords = /(?:thi\s+cong|lap\s+dat|khao\s+sat|thao\s+do|di\s+doi|chuyen\s+doi|thao\s+lap|lap\s+rap|sua\s+chua|bao\s+tri|bao\s+duong|ve\s+sinh\s+may)/i.test(unaccented);
    
    const isDirectServiceInquiry = /(?:co\s+(?:nhan\s+)?thi\s+cong|thi\s+cong\s+(?:khong|ko|dc\s+khong|duoc\s+khong|tron\s+goi)|co\s+(?:nhan\s+)?lap\s+dat|lap\s+dat\s+(?:khong|ko|tan\s+noi|tai\s+nha|dc\s+khong|duoc\s+khong)|co\s+khao\s+sat|khao\s+sat\s+(?:khong|ko|tan\s+noi|thuc\s+te|cong\s+trinh)|khao\s+sat\s+va\s+lap\s+dat|co\s+(?:nhan\s+)?thao\s+do|co\s+di\s+doi|thao\s+do|di\s+doi|co\s+sua\s+chua|sua\s+chua\s+(?:khong|ko)|co\s+bao\s+tri|bao\s+tri\s+(?:khong|ko|dinh\s+ky)|bao\s+duong\s+khong|chi\s+phi\s+thi\s+cong|gia\s+thi\s+cong|chi\s+phi\s+lap\s+dat|gia\s+lap\s+dat|chi\s+phi\s+khao\s+sat|khao\s+sat\s+co\s+mat\s+phi)/i.test(unaccented);

    // Multi-turn context check: customer in an active service consultation session
    const prevHistory = context.conversationHistory || context.history || [];
    const lastSessionIntent = context.sessionContext?.lastIntent || (prevHistory.length > 0 ? prevHistory[prevHistory.length - 1]?.intent : null);
    const inServiceIntake = context.sessionContext?.inServiceIntake || lastSessionIntent === 'SERVICE_SURVEY_REQUEST' || (prevHistory.slice(-2).some(h => /(?:thi cong|lap dat|khao sat|cong trinh)/i.test(this.stripDiacritics(h.content || ''))));

    const isTopicSwitch = /(?:mua\s+ngay|dat\s+mua|bao\s+gia\s+laptop|bao\s+gia\s+may\s+in|thu\s+ky\s+cua\s+anh)\b/i.test(unaccented);

    const isServiceFollowUp = inServiceIntake && !isTopicSwitch && (
      Boolean(slots.phone || slots.extractedPhone) ||
      /(?:dia\s+chi|o\s+quan|tai\s+quan|o\s+phuong|tai\s+phuong|duong\s+|so\s+nha|quan\s+\d+|quan\s+[a-z]+|tp|thanh\s+pho|tinh)/i.test(unaccented) ||
      /(?:bao\s+nhieu\s+tien|chi\s+phi|gia\s+ca|mat\s+phi|khi\s+nao|mai|sang\s+mai|chieu\s+mai|tuan\s+sau|may\s+gio|qua\s+lam|lam\s+luon|khao\s+sat|qua\s+xem|chot\s+lich|thoi\s+gian|quy\s+mo|\d+\s*(?:may|bo|thiet\s+bi|cai|chiec|diem|phong)|som\s+nhat)/i.test(unaccented)
    );

    if (isDirectServiceInquiry || (isServiceKeywords && /(?:co\s+|nhan\s+|khong|ko|giup|cho|tan\s+noi|tai\s+nha|tron\s+goi|o\s+dau|nhu\s+the\s+nao|ra\s+sao)/i.test(unaccented)) || isServiceFollowUp) {
      let serviceType = 'SERVICE_SURVEY_REQUEST';
      if (/(?:sua|sua\s+chua|khac\s+phuc|hu\s+hong|bao\s+hong|bi\s+loi|khong\s+len)/i.test(unaccented)) {
        serviceType = 'REPAIR_REQUEST';
      } else if (/(?:bao\s+tri|bao\s+duong|ve\s+sinh|kiem\s+tra\s+dinh\s+ky)/i.test(unaccented)) {
        serviceType = 'MAINTENANCE_REQUEST';
      } else if (/(?:lap\s+dat|thao\s+do|di\s+doi|thao\s+lap|lap\s+rap|gan|treo)/i.test(unaccented)) {
        serviceType = 'INSTALLATION_REQUEST';
      }

      // Explicitly wipe productName to prevent leaking product catalogs or Column 2
      slots.productName = null;
      slots.serviceType = serviceType;

      return {
        primaryIntent: 'SERVICE_SURVEY_REQUEST',
        domain: DOMAIN_INTENTS.SERVICE,
        intentGroup: INTENT_GROUPS.SERVICE_CONSULTATION,
        confidence: 0.99,
        serviceType,
        slots,
        flags: { isSales: false, isDoc: false, isSecretary: false, isService: true }
      };
    }

    // 2B. PRIVATE SECRETARY CỦA ANH TRÍ ("Thư ký của anh", "Thư ký ơi", "Thư ký, ...")
    const isSecretaryActivationOrCall = /^(?:thư ký(?: của anh| riêng| ơi)?|thu ky(?: cua anh| rieng| oi)?)(?:[,.!]|\s|$)/i.test(unaccented) ||
      /(?:thư ký của anh|thu ky cua anh|thư ký riêng|thu ky rieng|em là thư ký của anh|em la thu ky cua anh)/i.test(unaccented) ||
      /^(?:thư ký|thu ky)[,:]/i.test(unaccented);

    const isSecretaryManagement = /(?:hôm nay (?:anh|tôi) còn (?:những )?việc|hom nay (?:anh|toi) con (?:nhung )?viec|việc nào đang quá hạn|viec nao dang qua han|tổng hợp công việc tuần|tong hop cong viec tuan|dời lịch nhắc|doi lich nhac|dời việc|doi viec|đã hoàn thành|da hoan thanh|hoàn thành việc|hoan thanh viec|lưu lại thông tin|luu lai thong tin)/i.test(unaccented);

    const isExplicitTaskReminder = /(?:nhắc anh|nhac anh|nhắc tôi|nhac toi|nhắc sếp|nhac sep|lên lịch nhắc|len lich nhac|tạo lịch nhắc|tao lich nhac)/i.test(unaccented);

    const hasSalesSignalsInOwnerTask = /(?:bao\s+gia|mua\s+ngay|dat\s+mua|gia\s+bao\s+nhieu|bao\s+nhieu\s+tien)\b/i.test(unaccented);

    if ((isSecretaryActivationOrCall || isSecretaryManagement || isExplicitTaskReminder) && !hasSalesSignalsInOwnerTask) {
      return {
        primaryIntent: 'SECRETARY_TASK',
        intentGroup: INTENT_GROUPS.SECRETARY_TASK,
        confidence: 0.99,
        slots,
        flags: { isSales: false, isDoc: false, isSecretary: true }
      };
    }

    // 2C. AI SECRETARY TASKS (Owner Specific or Administrative)
    const isSecretaryCrmSummary = /(?:tong\s+hop|thong\s+ke|bao\s+cao|danh\s+sach)\s+(?:cac\s+)?(?:khach\s+hang|leads|khach)\s+(?:dang\s+)?(?:cho\s+bao\s+gia|cho\s+chot|tiem\s+nang|moi)/i.test(unaccented);
    if (isSecretaryCrmSummary) {
      return {
        primaryIntent: 'SECRETARY_CRM_SUMMARY',
        intentGroup: INTENT_GROUPS.SECRETARY_TASK,
        confidence: 0.98,
        slots,
        flags: { isSales: false, isDoc: false, isSecretary: true }
      };
    }

    const isDraftEmail = /(?:soan|viet|lap|gui)\s+(?:giup\s+toi\s+)?(?:email|thu|thu\s+dien\s+tu)\s+(?:gui|cho|den|cam\s+on|bao\s+gia|cham\s+soc)/i.test(unaccented) ||
      /(?:soan\s+giup\s+toi\s+email|soan\s+email)/i.test(unaccented);
    if (isDraftEmail) {
      return {
        primaryIntent: 'EMAIL_TASK',
        intentGroup: INTENT_GROUPS.OFFICE_TASK,
        confidence: 0.98,
        slots,
        flags: { isSales: false, isDoc: false, isOffice: true }
      };
    }

    // Owner personal agenda view vs task recording
    const isOwnerAgendaQuery = (context.userContext?.isOwner || /anh|toi/i.test(unaccented)) && /(?:xem|cho\s+toi\s+xem|kiem\s+tra)\s+(?:danh\s+sach\s+viec|viec\s+can\s+lam|ke\s+hoach|todo|lich\s+trinh|nhiem\s+vu)/i.test(unaccented);
    if (isOwnerAgendaQuery) {
      return {
        primaryIntent: 'OWNER_DAILY_PLAN',
        intentGroup: INTENT_GROUPS.SECRETARY_TASK,
        confidence: 0.98,
        slots,
        flags: { isSales: false, isDoc: false, isSecretary: true }
      };
    }

    // 3. APPOINTMENT INTENT (Hẹn gặp, đặt lịch, hẹn ăn uống, cà phê, đi nhậu, công việc)
    const isAppointmentExplicit = /(?:can\s+|muon\s+|xin\s+)?\b(?:hen\b|dat\s+lich|sap\s+xep\s+cuoc\s+hen|gap\s+mat|hen\s+gap|gap\s+anh|gap\s+chi|di\s+nhau|di\s+ca\s+phe|di\s+cafe|uong\s+ca\s+phe|an\s+trua|an\s+toi|di\s+an|hen\s+ho|ban\s+cong\s+viec|hop\s+mat|trao\s+doi\s+cong\s+viec|noi\s+chuyen\s+cong\s+viec)\b/i.test(unaccented);
    const isAppointmentFollowUp = /(?:vay\s+|the\s+|thi\s+)?(?:dat\s+(?:ngay\s+do|hom\s+do|gio\s+do|lich\s+do)|chot\s+(?:lich|ngay|gio)|hen\s+(?:anh\s+ay|chi\s+ay|ngay\s+do|hom\s+do)|dat\s+lich\s+ngay\s+do)\b/i.test(unaccented);

    // 4. SCHEDULE QUERY INTENT (Tra cứu lịch cá nhân, kiểm tra lịch làm việc, kiểm tra lịch trống, xem lịch đã đặt)
    const isScheduleAvailability = /(?:lich\s+(?:nao\s+ranh|ngay\s+nao\s+ranh|gio\s+nao\s+ranh|khi\s+nao\s+ranh|ngay\s+nao\s+trong|gio\s+nao\s+trong|trong|ranh)|ngay\s+nao\s+ranh|gio\s+nao\s+ranh|gio\s+nao\s+trong|luc\s+nao\s+ranh|thoi\s+gian\s+ranh|co\s+ranh\s+khong|co\s+ranh\s+ko|co\s+ban\s+khong|lich\s+lam\s+viec|lich\s+cong\s+tac|lich\s+tuan\s+nay|lich\s+hom\s+nay|lich\s+ngay\s+mai|kiem\s+tra\s+lich|tra\s+cuu\s+lich|xem\s+lich)\b/i.test(unaccented);
    const isDayAvailabilityCheck = /(?:thu\s*(?:hai|ba|tu|nam|sau|bay|chu\s*nhat|2|3|4|5|6|7|cn)|hom\s+nay|ngay\s+mai|tuan\s+nay|tuan\s+toi|chieu\s+mai|sang\s+mai)\s*(?:co\s+)?(?:ranh|trong|ban|duoc\s+khong)\b/i.test(unaccented);

    // Multi-turn context awareness for appointment/schedule
    const hadRecentAppointment = prevHistory.length > 0 && prevHistory.slice(-2).some(h => /(?:hen|lich|ranh|ca phe|di nhau|gap mat|dat ngay)/i.test(this.stripDiacritics(h.content || '')));

    // Check if query is explicitly asking price or product specs (Topic switch from appointment to shopping)
    const maskedForTea = unaccented.replace(/\b(?:kiem\s+tra|tra\s+cuu|dieu\s+tra|tra\s+loi|tra\s+gop|tra\s+hang|trao\s+doi)\b/gi, '___verb___');
    const isExplicitProductKeywords = /(?:bao\s+nhieu\s+tien|gia\s+bao\s+nhieu|may\s+tien|bao\s+gia|mua\s+ngay|dat\s+mua|mua\s+hang|laptop|may\s+in|may\s+scan|tra\s+|ca\s+phe\s+rang|tu\s+lanh|may\s+lanh|man\s+hinh|may\s+dem\s+tien)\b/i.test(maskedForTea);

    // 5. REMINDER INTENT (Nhắc việc, nhắc lịch, nhắc cuộc hẹn)
    const isReminder = /(?:nhac\s+(?:anh|chi|sep|ong|ba|ban|toi|em|minh|giup|cho|viec|lich|hen)|tao\s+nhac\s+nho|dat\s+nhac\s+nho|len\s+lich\s+nhac|nhac\s+nho|nhac\s+lich)\b/i.test(unaccented);

    // 2D. MULTI-INTENT DETECTION: Composite requests (e.g. Sales + Secretary)
    const isMeetingSignal = /(?:cuoc\s+hop|buoi\s+hop|lich\s+hop|di\s+hop|phong\s+hop|hop\s+giao\s+ban|hop\s+noi\s+bo|hop\s+voi)\b/i.test(unaccented) || (/\bhọp\b/i.test(rawMessage) && !/\bhộp\b/i.test(rawMessage));
    const isSuppliesCompatibility = /(?:dung\s+muc\s+nao|hop\s+muc\s+nao|cum\s+trong\s+nao|sac\s+gi|phu\s+kien\s+nao|linh\s+kien\s+nao|tuong\s+thich\s+voi)/i.test(unaccented);
    const hasSalesSignals = (isExplicitProductKeywords || !!slots.productName || /(?:bao\s+gia|mua\s+ngay|dat\s+mua|gia\s+bao\s+nhieu)\b/i.test(unaccented)) && !slots.isBroadCategory;
    const hasSecretarySignals = !isSuppliesCompatibility && (isAppointmentExplicit || isReminder || isDraftEmail || isSecretaryCrmSummary || isExplicitTaskReminder || isSecretaryActivationOrCall || isSecretaryManagement || isMeetingSignal);

    if (hasSalesSignals && hasSecretarySignals) {
      let salesSub = 'SALES_CONSULTATION';
      if (/(?:bao\s+gia)\b/i.test(unaccented)) salesSub = 'FORMAL_QUOTATION';
      else if (/(?:gia\s+bao\s+nhieu|bao\s+nhieu\s+tien)\b/i.test(unaccented)) salesSub = 'PRICE_INQUIRY';
      else if (/(?:dat\s+mua|mua\s+ngay)\b/i.test(unaccented)) salesSub = 'ORDER_REQUEST';

      let secretarySub = 'SECRETARY_TASK';
      if (isReminder) secretarySub = 'REMINDER';
      else if (isAppointmentExplicit) secretarySub = 'APPOINTMENT';
      else if (isDraftEmail) secretarySub = 'EMAIL_TASK';
      else if (isSecretaryCrmSummary) secretarySub = 'SECRETARY_CRM_SUMMARY';

      return {
        primaryIntent: 'MIXED_SALES_SECRETARY',
        domain: DOMAIN_INTENTS.MIXED,
        intentGroup: INTENT_GROUPS.MIXED,
        confidence: 0.95,
        subIntents: [salesSub, secretarySub],
        capabilities: ['AI_SALES', 'AI_SECRETARY'],
        slots,
        flags: { isSales: true, isDoc: false, isSecretary: true, isMixed: true }
      };
    }

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
    const isGeneralSmallTalk = /(?:thời\s+tiết\s+(?:đẹp|xấu|hôm\s+nay\s+đẹp)|thoi\s+tiet\s+(?:dep|xau|hom\s+nay\s+dep)|buồn\s+quá|buon\s+qua|vui\s+quá|vui\s+qua|kể\s+chuyện|ke\s+chuyen|tâm\s+sự|tam\s+su|hát\s+đi|hat\s+di|người\s+yêu|nguoi\s+yeu|ăn\s+cơm\s+chưa|an\s+com\s+chua|ngủ\s+ngon|ngu\s+ngon|chúc\s+một\s+ngày|chuc\s+mot\s+ngay|bạn\s+thông\s+minh\s+thật|ban\s+thong\s+minh\s+that|tạm\s+biệt|tam\s+biet|bai\s+bai|bye\s+bye|hôm\s+nay\s+thế\s+nào|hom\s+nay\s+the\s+nao)\b/i.test(norm);

    // If explicit greeting or small talk without product
    if ((isGreeting || isGeneralSmallTalk) && !slots.productName) {
      return {
        primaryIntent: isIdentityInquiry ? 'IDENTITY_INQUIRY' : (isGreeting ? 'GREETING' : 'GENERAL_CHAT'),
        domain: DOMAIN_INTENTS.CONVERSATION,
        intentGroup: INTENT_GROUPS.GENERAL_CHAT,
        confidence: 0.96,
        slots,
        flags: { isSales: false, isDoc: false }
      };
    }

    // 9. WEB SEARCH INTENT
    const isWebSearch = /(tin tức|tin tuc|dự báo thời tiết|du bao thoi tiet|thời tiết hôm nay thế nào|thoi tiet hom nay the nao|thời tiết|thoi tiet|tìm trên mạng|tim tren mang|tra cứu internet|tra cuu mang)/i.test(norm);
    if (isWebSearch && !slots.productName) {
      return {
        primaryIntent: 'INTERNET_SEARCH',
        domain: DOMAIN_INTENTS.RESEARCH,
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

    const isTcoOrFinancial = /(?:tco|chi\s+phí\s+sở\s+hữu|chi\s+phí\s+vận\s+hành|chi\s+phí\s+đầu\s+tư|phân\s+tích\s+chi\s+phí|dòng\s+tiền)/i.test(norm);
    const isPriceQuery = !isTcoOrFinancial && /(giá bao nhiêu|gia bao nhieu|bao nhiêu tiền|bao nhieu tien|giá cả|gia ca|chi phí|tầm giá|mấy tiền)/i.test(norm);
    if (isPriceQuery) {
      return {
        primaryIntent: 'PRICE_INQUIRY',
        intentGroup: INTENT_GROUPS.PRODUCT_INQUIRY,
        confidence: 0.92,
        slots,
        flags: { isSales: true, isDoc: false }
      };
    }

    // 10B. CATALOG PAGINATION & VIEW ALL INTENTS (PHẦN V)
    const isPaginationNext = /(?:gửi\s+tiếp|xem\s+tiếp|tiếp\s+tục|gửi\s+thêm|cho\s+xem\s+tiếp|5\s+mẫu\s+tiếp\s+theo|5\s+sản\s+phẩm\s+tiếp\s+theo|gửi\s+tiếp\s+5\s+mẫu|xem\s+tiếp\s+5\s+sản\s+phẩm|mẫu\s+tiếp|trang\s+sau|trang\s+tiếp|gửi\s+5\s+mẫu\s+tiếp|gửi\s+5\s+mẫu\s+nữa)\b/i.test(norm) ||
      /(?:gui\s+tiep|xem\s+tiep|tiep\s+tuc|gui\s+them|cho\s+xem\s+tiep|5\s+mau\s+tiep\s+theo|5\s+san\s+pham\s+tiep\s+theo|gui\s+tiep\s+5\s+mau|xem\s+tiep\s+5\s+san\s+pham|mau\s+tiep|trang\s+sau|trang\s+tiep|gui\s+5\s+mau\s+tiep|gui\s+5\s+mau\s+nua)\b/i.test(unaccented);

    if (isPaginationNext) {
      return {
        primaryIntent: 'PAGINATION_NEXT',
        intentGroup: INTENT_GROUPS.PRODUCT_INQUIRY,
        confidence: 0.96,
        slots,
        flags: { isSales: true, isDoc: false, isPagination: true }
      };
    }

    const isViewAll = /(?:cho\s+anh\s+xem\s+tất\s+cả|cho\s+tôi\s+xem\s+tất\s+cả|xem\s+tất\s+cả|gửi\s+hết\s+danh\s+sách|gửi\s+hết|có\s+những\s+mẫu\s+nào|tham\s+khảo\s+toàn\s+bộ|xem\s+toàn\s+bộ|xem\s+hết|toàn\s+bộ\s+danh\s+mục)\b/i.test(norm) ||
      /(?:cho\s+anh\s+xem\s+tat\s+ca|cho\s+toi\s+xem\s+tat\s+ca|xem\s+tat\s+ca|gui\s+het\s+danh\s+sach|gui\s+het|co\s+nhung\s+mau\s+nao|tham\s+khao\s+toan\s+bo|xem\s+toan\s+bo|xem\s+het|toan\s+bo\s+danh\s+muc)\b/i.test(unaccented);

    if (isViewAll) {
      return {
        primaryIntent: 'VIEW_ALL_PRODUCTS',
        intentGroup: INTENT_GROUPS.PRODUCT_INQUIRY,
        confidence: 0.96,
        slots,
        flags: { isSales: true, isDoc: false, isViewAll: true }
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
    const normMasked = norm.replace(/\b(?:kiểm\s+tra|kiem\s+tra|tra\s+cứu|tra\s+cuu|điều\s+tra|dieu\s+tra|trả\s+lời|tra\s+loi|trả\s+góp|tra\s+gop|trả\s+hàng|tra\s+hang|trao\s+đổi|trao\s+doi)\b/gi, '___verb___');
    const isSalesKeywords = /(mua|bán|ban|sản phẩm|san pham|hàng|laptop|máy in|may in|máy scan|may scan|trà|tra|cà phê|cafe|nước hoa|nuoc hoa|màn hình|tivi|tai nghe|bột matcha|cpu|tablet|chuột|bàn phím|điện thoại|dien thoai)/i.test(normMasked);

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
    const isVagueOrLowConfidence = norm.split(' ').length <= 3 && !isGreeting && !isGeneralSmallTalk;
    if (isVagueOrLowConfidence) {
      return {
        primaryIntent: 'UNCLEAR_NEEDS',
        domain: DOMAIN_INTENTS.CONVERSATION,
        intentGroup: INTENT_GROUPS.UNKNOWN,
        confidence: 0.5,
        slots,
        flags: { isSales: false, isDoc: false }
      };
    }

    return {
      primaryIntent: 'GENERAL_CONVERSATION',
      domain: DOMAIN_INTENTS.CONVERSATION,
      intentGroup: INTENT_GROUPS.GENERAL_CHAT,
      confidence: 0.85,
      slots,
      flags: { isSales: false, isDoc: false }
    };
  }

  /**
   * Extract slots: product, quantity, budget, brand, modelCode, domain, appointment entities, ordinal & quotation context
   */
  static extractSlots(normText = '', unaccented = '', context = {}) {
    // 0. Ordinal extraction for multi-product selection (e.g. "sản phẩm thứ hai", "máy thứ 2", "con thứ nhất", "sp thứ 3")
    let targetOrdinal = null;
    const ordinalMap = {
      'nhất': 1, 'nhat': 1, 'một': 1, 'mot': 1, '1': 1,
      'hai': 2, '2': 2,
      'ba': 3, '3': 3,
      'bốn': 4, 'bon': 4, 'tư': 4, 'tu': 4, '4': 4,
      'năm': 5, 'nam': 5, '5': 5
    };
    const ordMatch = normText.match(/(?:sản phẩm|san pham|máy|may|con|mẫu|mau|mục|muc|sp)\s+thứ\s+(nhất|nhat|một|mot|1|hai|2|ba|3|bốn|bon|tư|tu|4|năm|nam|5)\b/i) ||
      normText.match(/\bthứ\s+(nhất|nhat|một|mot|1|hai|2|ba|3|bốn|bon|tư|tu|4|năm|nam|5)\b/i);
    if (ordMatch && ordMatch[1]) {
      targetOrdinal = ordinalMap[ordMatch[1].toLowerCase()] || null;
    }

    // 0B. Customer Name & Addressing extraction
    let customerName = null;
    let customerPronoun = null;
    let customerAddressing = null;
    let isNameDeclaration = false;

    const rawMessage = context.rawMessage || context.message || normText;
    const addr = extractCustomerAddressing(rawMessage);
    const detectedName = extractCustomerName(rawMessage, false);
    const candidateName = detectedName || addr?.name || null;
    if (candidateName && !hasBlockedNameTokens(candidateName)) {
      isNameDeclaration = isCustomerNameDeclaration(rawMessage, normText) ||
        Boolean(/(?:ten\s+la|ten\s+toi|ten\s+minh|ten\s+em|ten\s+anh|ten\s+chi|toi\s+ten|minh\s+ten|em\s+ten|anh\s+ten|chi\s+ten|toi\s+la|minh\s+la|em\s+la|anh\s+la|chi\s+la|cu\s+goi|goi\s+toi\s+la|goi\s+la|xung\s+la)\b/i.test(unaccented));
      if (isNameDeclaration) {
        customerName = candidateName;
        customerPronoun = addr?.pronoun || null;
        customerAddressing = customerPronoun ? `${customerPronoun} ${customerName}` : customerName;
      }
    }

    const isQuotationKeyword = /(báo giá|bao gia|lập báo giá|lap bao gia|xin báo giá|bảng báo giá|bang bao gia)/i.test(normText);
    const isShortQuotationRequest = isQuotationKeyword && (
      /(?:cho\s+(?:anh|em|tôi|chị|mình)?\s*(?:xin\s+)?(?:báo\s+giá|bảng\s+báo\s+giá)|làm\s+báo\s+giá|gửi\s+(?:anh|em|tôi|chị|mình)?\s*(?:báo\s+giá|bảng\s+báo\s+giá)|báo\s+giá\s+(?:sản\s+phẩm|máy|con)?\s*(?:này|đó)?|xin\s+báo\s+giá)\b/i.test(normText) ||
      normText.split(/\s+/).length <= 6
    );

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
    const unaccentedCleanCategory = unaccented.replace(/\b(?:kiem\s+tra|tra\s+cuu|dieu\s+tra|tra\s+loi|tra\s+gop|tra\s+hang|trao\s+doi)\b/gi, '___verb___');
    for (const [domKey, domObj] of Object.entries(DOMAIN_CATEGORIES)) {
      if (domObj.keywords.some(kw => {
        if (kw === 'tra' || kw === 'trà') {
          return new RegExp(`(^|\\s)${kw}(\\s|$)`, 'i').test(unaccentedCleanCategory);
        }
        return normText.includes(kw) || unaccentedCleanCategory.includes(kw);
      })) {
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
      .replace(/(cho tôi|cho em|cho e|tôi|mình|minh|em|anh|chị|lập|xin|cần|bảng báo giá|báo giá|bao gia|chi tiết|giúp|với|nhé|nha|mua|bán|có sẵn|tư vấn|tìm|hỏi|dưới|khoảng|tầm giá|\b\d+\b|triệu|tr|k|nghìn|máy|cái|chiếc|bộ|sản phẩm|có hàng không|co hang khong|số lượng|so luong|sl)/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const unaccentedClean = this.stripDiacritics(cleanedQuery);

    // Blacklist non-product verbs, fillers, conversational particles, service terms
    const NON_PRODUCT_TERMS = /(?:thi cong|lap dat|khao sat|thao do|di doi|sua chua|bao tri|bao duong|ve sinh may|lap rap|thao lap|hen|gap|nhau|ca phe|cafe|uong|an trua|an toi|di an|lich|ranh|trong|nhac|nho|ban|noi chuyen|tam su|thoi tiet|khieu nai|dia chi|bao hanh|giao hang|doi tra|phi ship|gap nhan vien|nguoi that|chuyen vien|so sanh|khac nhau|ho tro truc tiep|cong viec|cuoc hen|ngay nao|thu sau|thu hai|thu ba|thu tu|thu nam|thu bay|chu nhat|tuan nay|ngay mai|hom nay|tuan toi|dat ngay do|chot lich|dat lich|nguoi yeu|ban gai|ban trai|thong minh|danh sach viec|viec can lam|ke hoach|todo|to do|bao cao|doanh thu|de xem|de coi|thu xem|thu coi|xem sao|biet dau|khong ro|chua ro|the nao|ra sao|sao cung duoc|u de xem|uh|um|u|sao|co gi|khong co|chua|roi|thoi|vay|nhi|the|a|ha|day|kia)/i;

    const unaccentedMasked = unaccentedClean.replace(/\b(?:kiem\s+tra|tra\s+cuu|dieu\s+tra|tra\s+loi|tra\s+gop|tra\s+hang|trao\s+doi)\b/gi, '___verb___');
    const hasProductSignal = !!matchedBrand || !!extractedModelCode || !!categoryDomain || /(?:laptop|may in|may scan|may dem tien|may lanh|tu lanh|man hinh|tivi|dien thoai|tai nghe|chuot|ban phim|tra\b|ca phe|nuoc hoa|muc in|giay in)/i.test(unaccentedMasked);

    const isNonProductPhrase = NON_PRODUCT_TERMS.test(unaccentedClean) || (!hasProductSignal && unaccentedClean.split(' ').length <= 2);
    // If it has non-product terms, name declaration, or broad category, resolvedProductName MUST be null!
    let resolvedProductName = (isNonProductPhrase || isBroadCategory || (isNameDeclaration && !extractedModelCode)) && !extractedModelCode ? null : (cleanedQuery || null);

    // Context continuity: If quotation request without explicit product, inherit active product
    const convId = context.conversationId || context.conversation_id;
    let activeProdContext = null;
    if (convId && ActiveProductContext) {
      activeProdContext = ActiveProductContext.getContext(convId);
    }
    if (!activeProdContext && context.selectedProduct) {
      activeProdContext = context.selectedProduct;
    }

    if (isQuotationKeyword && !resolvedProductName && !targetOrdinal && activeProdContext) {
      resolvedProductName = activeProdContext.active_product_name || activeProdContext.name || null;
    }

    const extractedPhone = normText.match(/(0\d{9})\b/)?.[1] || null;

    return {
      productName: resolvedProductName,
      customerName,
      customerPronoun,
      customerAddressing,
      isNameDeclaration,
      quantity,
      targetOrdinal,
      ordinal: targetOrdinal,
      isShortQuotationRequest,
      activeProduct: activeProdContext,
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
