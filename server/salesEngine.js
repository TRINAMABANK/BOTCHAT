import { randomUUID } from 'crypto';
import db from './db.js';
import { callGemini } from './geminiService.js';

/**
 * Call an OpenAI-compatible Chat Completions endpoint using server-side credentials.
 */
async function callOpenAI(messages, config = {}) {
  const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.includes('your_')) {
    return null;
  }

  const baseUrl = (config.baseUrl || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const model = config.model || process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.55
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LLM HTTP ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || null;
}

/**
 * Normalize Vietnamese text for robust accent-insensitive intent matching.
 */
export function removeVietnameseTones(str) {
  if (!str && str !== 0) return '';
  return String(str)
    .toLowerCase()
    .replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a')
    .replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e')
    .replace(/ì|í|ị|ỉ|ĩ/g, 'i')
    .replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o')
    .replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u')
    .replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y')
    .replace(/đ/g, 'd')
    .replace(/[\u0300\u0301\u0303\u0309\u0323\u02C6\u0306\u031B]/g, '');
}

function parseSpecs(product) {
  if (!product?.specs_json) return {};
  try {
    return typeof product.specs_json === 'string' ? JSON.parse(product.specs_json) : product.specs_json;
  } catch {
    return {};
  }
}

function formatPrice(product) {
  if (!product) return 'Liên hệ';
  return product.price_formatted || `${Number(product.price || 0).toLocaleString('vi-VN')} ₫`;
}

function formatVnd(amount) {
  return `${Math.round(amount).toLocaleString('vi-VN')} ₫`;
}

function formatShortDesc(desc, maxLen = 85) {
  if (!desc) return '';
  const firstLine = desc.split(/[\r\n]+/)[0].replace(/^[-•*]\s*/, '').trim();
  if (firstLine.length <= maxLen) return firstLine;
  return firstLine.slice(0, maxLen).trim() + '...';
}

export function isFoodOrBeverageProduct(product) {
  if (!product) return false;
  const raw = `${product.field || ''} ${product.group_name || ''} ${product.name || ''} ${product.description || ''}`;
  const norm = removeVietnameseTones(raw);

  const foodBeveragePatterns = [
    /\b(?:tra|tea|oolong|olong|hac tra|matcha|che|hong tra|luc tra)\b/,
    /\b(?:ca phe|coffee|espresso|robusta|arabica|culi|rang moc)\b/,
    /\b(?:thuc pham|do an|thuc uong|do uong|an uong|beverage|food)\b/,
    /\b(?:banh|keo|sua|ngu coc|yen sao|to yen|dong trung ha thao|sam|nam linh chi)\b/,
    /\b(?:gia vi|nuoc mam|dau an|nong san|trai cay|hat dieu|mac ca|hanh nhan)\b/,
    /\b(?:ruou|bia|nuoc ngot|nuoc giai khat|nuoc suoi|nuoc khoang)\b/
  ];

  return foodBeveragePatterns.some((pattern) => pattern.test(norm));
}

export function isConsumableOrCosmeticProduct(product) {
  if (!product) return false;
  if (isFoodOrBeverageProduct(product)) return true;
  const raw = `${product.field || ''} ${product.group_name || ''} ${product.name || ''} ${product.description || ''}`;
  const norm = removeVietnameseTones(raw);
  return /\b(?:nuoc hoa|perfume|my pham|cosmetic|son moi|kem duong|serum|dau goi|sua tam)\b/.test(norm);
}

/**
 * Xây dựng kịch bản bán hàng tập trung 100% vào chính TÊN SẢN PHẨM và các đặc tính, thông số kỹ thuật thực tế
 * Tuyệt đối không dựa trên hoặc nêu nhóm sản phẩm chung chung.
 */
function buildProductSalesPitch(product) {
  if (!product) return '';
  const specs = parseSpecs(product);
  const specEntries = Object.entries(specs).filter(([k]) => !['Bảo hành', 'Mô tả', 'Xuất xứ'].includes(k));
  const topSpecs = specEntries.slice(0, 3).map(([k, v]) => `• **${k}:** ${v}`).join('\n');

  let descPitch = '';
  if (product.description) {
    const firstLine = product.description.split(/[\r\n]+/)[0].replace(/^[-•*]\s*/, '').trim();
    descPitch = firstLine;
  }

  const parts = [];
  if (descPitch) {
    parts.push(`📝 **Đặc tính nổi bật:** ${descPitch}`);
  }
  if (topSpecs) {
    parts.push(`⚙️ **Thông số kỹ thuật:**\n${topSpecs}`);
  }
  return parts.join('\n\n');
}

/**
 * Detect prompt injection or unauthorized price/secret tampering attempts.
 */
function detectSecurityViolation(normMsg) {
  if (!normMsg) return false;
  const raw = String(normMsg).toLowerCase();
  const blockedPatterns = [
    '<script',
    'script>',
    'alert(',
    'onerror=',
    'onload=',
    'javascript:',
    'api key',
    'openai_api_key',
    'system prompt',
    'bo qua quy tac',
    'quen tat ca quy tac',
    'ignore previous',
    'mat khau admin',
    'gia 0 dong',
    'gia 0d',
    'chinh gia ve 0',
    'giam xuong 1000'
  ];
  return blockedPatterns.some((p) => raw.includes(p));
}

/**
 * Extract numeric budget constraints (e.g. "duoi 5 trieu", "tu 4 den 8 tr", "re nhat").
 */
function extractBudget(normMsg) {
  const toVnd = (numStr, unit) => {
    const val = parseFloat(numStr.replace(',', '.'));
    if (Number.isNaN(val)) return null;
    if (unit && (unit.startsWith('ty') || unit.startsWith('ti'))) return val * 1_000_000_000;
    return val * 1_000_000;
  };

  const rangeMatch = normMsg.match(/tu\s+(\d+(?:[.,]\d+)?)\s*(?:den|toi|-)\s*(\d+(?:[.,]\d+)?)\s*(trieu|tr|cu|ty|ti)/);
  if (rangeMatch) {
    return {
      min: toVnd(rangeMatch[1], rangeMatch[3]),
      max: toVnd(rangeMatch[2], rangeMatch[3])
    };
  }

  const underMatch = normMsg.match(/(?:ngan sach|kinh phi|tam gia|duoi|toi da|khong qua|tam|khoang|be hon|nho hon)\s*(?:khoang|tam|la)?\s*(\d+(?:[.,]\d+)?)\s*(trieu|tr|cu|ty|ti)/);
  if (underMatch) {
    const target = toVnd(underMatch[1], underMatch[2]);
    if (normMsg.includes('duoi') || normMsg.includes('toi da') || normMsg.includes('khong qua') || normMsg.includes('nho hon')) {
      return { max: target };
    }
    return { min: target * 0.7, max: target * 1.35, around: target };
  }

  const overMatch = normMsg.match(/(?:tren|tu|hon|lon hon)\s+(\d+(?:[.,]\d+)?)\s*(trieu|tr|cu|ty|ti)/);
  if (overMatch) {
    return { min: toVnd(overMatch[1], overMatch[2]) };
  }

  if (normMsg.includes('re nhat') || normMsg.includes('gia mem') || normMsg.includes('tiet kiem') || normMsg.includes('thap nhat')) {
    return { sort: 'asc' };
  }
  if (normMsg.includes('dat nhat') || normMsg.includes('cao cap nhat') || normMsg.includes('xin nhat') || normMsg.includes('vip nhat')) {
    return { sort: 'desc' };
  }
  return null;
}

/**
 * Extract explicit purchase quantity (returns null if no quantity was stated).
 */
function extractExplicitQuantity(normMsg) {
  if (!normMsg) return null;

  // Nếu câu chứa ý hỏi có hàng không ("có không", "có chưa", "có hàng không", "có bán không", "có loại", "có mẫu", "hỏi"),
  // thì các con số trong câu (như "65 inch", "55 inch", "1000w") là thông số hỏi, KHÔNG PHẢI số lượng mua!
  const isAvailabilityInquiry = /(?:co\s+khong|co\s+chua|co\s+hang\s+khong|con\s+hang\s+khong|co\s+ban\s+khong|co\s+loai|co\s+mau|co\s+dong|co\s+san|con\s+khong|thi\s+co|hoi)\b/.test(normMsg);

  // Pattern 1: Số lượng đi kèm đơn vị tính sản phẩm rõ ràng ("2 cái", "3 máy", "5 chiếc", "10 hộp", "2 bộ")
  const qtyMatch = normMsg.match(/\b(\d{1,3})\s*(?:cai|may|chiec|bo|hop|goi|san pham|sp)\b/);
  if (qtyMatch) {
    const q = parseInt(qtyMatch[1], 10);
    if (q >= 1 && q <= 500) return q;
  }

  // Pattern 1B: Số lượng bằng chữ đi kèm đơn vị tính ("hai hộp", "một cái", "ba chiếc")
  const wordQtyMatch = normMsg.match(/(?:lay|dat|mua|giao|ship|cho|chot)\s+(?:cho\s+(?:anh|chi|em|toi|minh|bac|chu|co)\s+)?(mot|hai|ba|bon|nam|sau|bay|tam|chin|muoi)\s*(?:cai|chiec|hop|goi|bo|sp|san pham)?\b/);
  if (wordQtyMatch) {
    const wordMap = { mot: 1, hai: 2, ba: 3, bon: 4, nam: 5, sau: 6, bay: 7, tam: 8, chin: 9, muoi: 10 };
    return wordMap[wordQtyMatch[1]] || null;
  }

  // Nếu là câu hỏi thăm dò hàng có hay không, không tự suy diễn số bất kỳ thành số lượng mua
  if (isAvailabilityInquiry) {
    return null;
  }

  // Pattern 2: Cụm từ đặt mua kèm số lượng ("số lượng 2", "lấy 2", "đặt 3")
  const explicitMatch = normMsg.match(/(?:so\s+luong|lay|dat)\s*:?\s*(\d{1,3})\b/);
  if (explicitMatch) {
    const q = parseInt(explicitMatch[1], 10);
    const numIdx = normMsg.indexOf(explicitMatch[1]);
    const afterNum = normMsg.slice(numIdx + explicitMatch[1].length).trim();
    const isSpecUnit = /^(?:inch|in|"|''|lit|l|kg|g|gr|gram|hp|ngua|w|kw|v|hz|cm|mm|m|trieu|tr|k|cu|nam|thang|tuoi|gb|tb|mb|ram|ssd|cpu)\b/i.test(afterNum);
    if (!isSpecUnit && q >= 1 && q <= 500) {
      return q;
    }
  }
  return null;
}

/**
 * Extract requested purchase quantity without colliding with product model codes or phone numbers.
 */
function extractQuantity(normMsg) {
  return extractExplicitQuantity(normMsg) ?? 1;
}

/**
 * Normalize & extract 10-digit Vietnamese phone number (tolerates spaces/dots/dashes).
 */
function extractPhoneNumber(rawMsg) {
  if (!rawMsg) return null;
  const candidates = rawMsg.match(/(?:0|\+84)[\s.\-\d]{8,14}\d/g);
  if (!candidates) return null;
  for (const cand of candidates) {
    const normalized = cand.replace(/^\+84/, '0').replace(/[\s.\-]/g, '');
    if (/^0[35789]\d{8}$/.test(normalized)) {
      return normalized;
    }
  }
  return null;
}

const CUSTOMER_NAME_BLOCKED_TOKENS = new Set([
  // Action & inquiry words
  'dang', 'hoi', 'ma', 'can', 'muon', 'lay', 'xem', 'tim', 'co', 'biet', 'chua',
  'nguoi', 'khach', 'hang', 'gia', 'bao', 'nhieu', 'tien', 'mua', 'ban',
  'chao', 'alo', 'hello', 'hi', 'ship', 'shop', 'robot', 'ai',
  'san', 'pham', 'thong', 'tin', 'dia', 'so', 'dien', 'thoai',
  'sdt', 'dong', 'vnd', 'khong', 'chuc', 'nang', 'ok', 'duoc', 'cam', 'on', 'roi',
  'vang', 'dung', 'sai', 'the', 'nao', 'tiet', 'sanh', 'ton', 'kho',
  'gi', 'kinh', 'doanh', 'cai', 'mat', 'nganh', 'vuc', 'sao', 'dau',
  'loai', 'mau', 're', 'dat', 'nhat', 'nhi', 'tot', 'hon', 'khac', 'cao', 'thap',
  'chuan', 'nho', 'to', 'lon', 'dep', 'xau', 'moi', 'cu', 'chiec',
  // Chat control & system commands
  'chat', 'tin', 'nhan', 'lam', 'moi', 'xoa', 'reset', 'clear', 'bot', 'hoi', 'thoai', 'tro', 'chuyen', 'lich', 'su',
  // Appliances & Electronics (Thiết bị gia dụng & điện lạnh)
  'tu', 'lanh', 'giat', 'say', 'dieu', 'loc', 'nuoc', 'noi', 'com', 'bep', 'lo',
  'vi', 'song', 'hut', 'am', 'bui', 'quat', 'chieu', 'ep', 'xay', 'may',
  'cay', 'am', 'ui', 'chien', 'hong', 'ngoai', 'rua', 'bat', 'dia',
  // Popular Appliance & Consumer Brands
  'kangaroo', 'kangaru', 'sunhouse', 'karofi', 'panasonic', 'daikin', 'toshiba',
  'casper', 'funiki', 'sanaky', 'aqua', 'electrolux', 'sharp', 'hitachi',
  'philips', 'philip', 'midea', 'nagakawa', 'comfee', 'gree', 'haier', 'beko',
  // IT, Tech & Device Brands
  'tivi', 'tv', 'laptop', 'pc', 'cpu', 'case', 'ram', 'ssd', 'hdd', 'man', 'hinh',
  'chuot', 'phim', 'tai', 'nghe', 'loa', 'mic', 'camera', 'webcam', 'sac', 'cap', 'day',
  'the', 'nho', 'usb', 'sim',
  'samsung', 'sony', 'lg', 'apple', 'iphone', 'ipad', 'macbook', 'dell', 'asus',
  'acer', 'hp', 'lenovo', 'thinkpad', 'xiaomi', 'oppo', 'vivo', 'huawei',
  'brother', 'canon', 'epson',
  // Banking Equipment & Security Brands
  'in', 'scan', 'dem', 'bo', 'ket', 'sat', 'photo', 'fax', 'huy',
  'julong', 'xiudun', 'xinda', 'lidix', 'masu', 'glory', 'modul', 'balion', 'casio',
  // Office Furniture (Nội thất)
  'ghe', 'xoay', 'giam', 'doc', 'hop',
  // Tea, Coffee, Cosmetics (Trà, Cà phê, Mỹ phẩm)
  'tra', 'oolong', 'long', 'ca', 'phe', 'cafe', 'matcha',
  'my', 'pham', 'son', 'kem', 'phan', 'serum',
  // Vehicles & Accessories (Phương tiện & phụ kiện)
  'xe', 'balo', 'tui', 'xach', 'vinfast', 'honda', 'yamaha'
]);

/**
 * Check if a string represents a product, brand, category, chat control or device keyword.
 */
export function isProductOrDeviceTerm(str) {
  if (!str || typeof str !== 'string') return false;
  const clean = removeVietnameseTones(str).replace(/[?!.,;:()"'`~@#$%^&*+=<>{}[\]/\\|]/g, ' ').toLowerCase().trim();
  if (!clean) return false;
  const phrases = [
    // Chat control terms (never names or products)
    'chat', 'dung chat', 'noi dung chat', 'xoa chat', 'lam moi chat', 'lam moi', 'xoa tin nhan', 'tin nhan',
    // Appliances & Home
    'tu lanh', 'may giat', 'may lanh', 'dieu hoa', 'may loc nuoc', 'loc nuoc',
    'cay nuoc', 'cay nuoc nong lanh', 'binh nong lanh', 'may nuoc nong', 'binh thuy dien', 'am sieu toc',
    'noi com', 'noi com dien', 'noi chien', 'noi chien khong dau', 'may hut bui', 'robot hut bui', 'may ep', 'may say',
    'bep tu', 'bep ga', 'bep hong ngoai', 'may rua bat', 'may loc khong khi', 'noi ap suat', 'may hut am',
    // Office & Tech
    'may in', 'may scan', 'may dem tien', 'may bo tien', 'ket sat',
    'tai nghe', 'loa', 'ban phim', 'chuot', 'tivi', 'tv', 'laptop', 'may tinh',
    'dien thoai', 'tra', 'ca phe', 'cafe', 'matcha', 'nuoc hoa', 'my pham', 'man hinh',
    'ban ghe', 'ban lam viec', 'ghe xoay', 'quat', 'o to', 'xe may', 'may chieu', 'tu quan ao',
    'binh dan', 'chinh hang', 'kem duong',
    // Brands
    'kangaroo', 'kangaru', 'sunhouse', 'karofi', 'panasonic', 'daikin', 'toshiba',
    'casper', 'funiki', 'sanaky', 'aqua', 'electrolux', 'sharp', 'hitachi',
    'philips', 'philip', 'midea', 'nagakawa', 'comfee', 'gree', 'haier', 'beko',
    'samsung', 'sony', 'lg', 'apple', 'iphone', 'ipad', 'macbook', 'dell', 'asus',
    'acer', 'hp', 'lenovo', 'thinkpad', 'xiaomi', 'oppo', 'vivo', 'huawei',
    'brother', 'canon', 'epson', 'julong', 'xiudun', 'xinda', 'lidix', 'masu'
  ];
  return phrases.some((p) => clean === p || clean.startsWith(p + ' ') || clean.endsWith(' ' + p) || clean.includes(' ' + p + ' '));
}

export function hasBlockedNameTokens(str) {
  if (!str || typeof str !== 'string') return true;
  const norm = removeVietnameseTones(str).toLowerCase().trim();
  if (norm.length < 2 || norm.length > 30) return true;
  if (isProductOrDeviceTerm(norm)) return true;
  const words = norm.split(/\s+/).filter(Boolean);
  if (words.length < 1 || words.length > 3) return true;
  if (words.some((w) => CUSTOMER_NAME_BLOCKED_TOKENS.has(w))) return true;

  // Check if string contains any brand name
  const blockedBrands = [
    'kangaroo', 'kangaru', 'sunhouse', 'karofi', 'panasonic', 'daikin', 'toshiba',
    'casper', 'funiki', 'sanaky', 'aqua', 'electrolux', 'sharp', 'hitachi',
    'philips', 'philip', 'midea', 'nagakawa', 'comfee', 'gree', 'haier', 'beko',
    'samsung', 'sony', 'lg', 'apple', 'iphone', 'ipad', 'macbook', 'dell', 'asus',
    'acer', 'hp', 'lenovo', 'thinkpad', 'xiaomi', 'oppo', 'vivo', 'huawei',
    'brother', 'canon', 'epson', 'julong', 'xiudun', 'xinda', 'lidix'
  ];
  return blockedBrands.some((b) => norm.includes(b));
}

/**
 * Extract customer name cleanly (supports full intro phrases, casual introductions, and standalone names).
 */
function extractCustomerName(rawMsg, allowBare = false) {
  if (!rawMsg || typeof rawMsg !== 'string') return null;
  let s = rawMsg.trim();
  if (s.includes('?') || s.includes('@')) return null;
  if (isCatalogOverviewQuery(s)) return null;

  // Strip phone portion if present at the end
  s = s.replace(/[,.;:\s]+(?:sđt|sdt|so\s+dien\s+thoai|số\s+điện\s+thoại|so|số|dien\s+thoai|điện\s+thoại|phone)?\s*(?:là|la|:)?\s*0[35789]\d{8}\b.*$/i, '').trim();
  s = s.replace(/[,.;:\s]+(?:sđt|sdt|so\s+dien\s+thoai|số\s+điện\s+thoại|so|số|phone)$/i, '').trim();

  // Strip leading greetings
  s = s.replace(/^(?:dạ|da|dạ chào shop|chào shop|chào bạn|chào robot|alo|xin chào)[,.;:\s]+/i, '').trim();

  const introPatterns = [
    /^(?:tên tôi là|tên mình là|tên em là|tên anh là|tên chị là|tôi tên là|mình tên là|em tên là|anh tên là|chị tên là|tên là|tôi tên|mình tên|em tên|anh tên|chị tên|tên:)\s+/i,
    /^(?:cứ\s+)?gọi\s+(?:cho\s+)?(?:tôi|mình|em|anh|chị)?\s*(?:là\s+)?/i,
    /^(?:xưng\s+hô\s+là|xưng\s+là)\s+/i,
    /^(?:tôi là|mình là|em là|anh là|chị là)\s+/i
  ];

  let matchedIntro = false;
  for (const p of introPatterns) {
    if (p.test(s)) {
      s = s.replace(p, '');
      matchedIntro = true;
      break;
    }
  }

  // If allowBare is false and no intro pattern matched, it cannot be considered a customer name
  if (!allowBare && !matchedIntro) return null;
  if (allowBare && isProductOrDeviceTerm(s)) return null;

  // Strip leading honorific if followed by name (e.g. "anh Nam" -> "Nam")
  s = s.replace(/^(?:anh|chị|cô|chú|bác|ông|bà|em|bạn)\s+/i, '');

  // Strip trailing punctuation & casual particles (e.g. "nhé", "ạ", "nha", "mà")
  s = s.replace(/[,.;!?]+$/, '').trim();
  s = s.replace(/\s+(?:nhe|nha|a|ạ|nhé|nhi|đây|day|nè|ne|mà|ma)$/i, '').trim();

  if (s.length < 2 || s.length > 30) return null;
  if (/\d/.test(s)) return null;

  const norm = removeVietnameseTones(s).toLowerCase();
  const words = norm.split(/\s+/).filter(Boolean);
  if (words.length < 1 || words.length > 3) return null;

  for (const w of words) {
    if (CUSTOMER_NAME_BLOCKED_TOKENS.has(w)) return null;
  }
  if (isProductOrDeviceTerm(norm)) return null;

  return s
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Safely check if a target text contains a word/phrase with strict word boundaries
 * to prevent substring false positives (e.g., 'ultra' in Laptop falsely matching 'tra').
 */
function hasWordMatch(text, word) {
  if (!text || !word) return false;
  const cleanWord = removeVietnameseTones(String(word)).trim().toLowerCase();
  const cleanText = removeVietnameseTones(String(text)).trim().toLowerCase();
  if (!cleanWord || !cleanText) return false;
  const escaped = cleanWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(?:^|\\s|[.,;!?:()\\[\\]{}/<>-])${escaped}(?:$|\\s|[.,;!?:()\\[\\]{}/<>-])`, 'i');
  return regex.test(cleanText);
}

const STOP_WORDS = new Set([
  'cho', 'xin', 'hoi', 'muon', 'can', 'tim', 'mua', 'nhung', 'loai', 'mau',
  'nao', 'bao', 'nhieu', 'tien', 'gia', 'duoi', 'tren', 'tam', 'khoang', 'khong',
  'duoc', 'nhan', 'chu', 'sdt', 'so', 'san', 'pham', 'tu', 'van',
  'so', 'sanh', 'giup', 'voi', 'nha', 'nhe', 'anh', 'chi', 'ben', 'shop', 'may', 'cai', 'chiec',
  'tri', 'quang', 'nhut', 'toi', 'minh', 'em', 'la', 'ten', 'chao', 'alo', 'hi', 'oi', 'day', 'a', 'da',
  'gi', 'kinh', 'doanh', 'the', 'vay', 'co', 'cac',
  // Budget / superlative / relative query words that should NEVER match as product name tokens:
  're', 'dat', 'nhat', 'nhi', 'tot', 'hon', 'khac', 'nua', 'moi', 'cu', 'cao', 'thap'
]);

/**
 * Extract core product target phrase from natural customer requests by stripping
 * conversational prefixes, intent verbs, customer addressing, classifiers and question particles.
 */
function extractCoreProductQuery(rawMsg) {
  if (!rawMsg || typeof rawMsg !== 'string') return '';
  // Nếu là câu chào, xưng tên hoặc hỏi thăm sức khoẻ, tuyệt đối không tách sản phẩm
  if (isCustomerNameDeclaration(rawMsg) || isGreetingMessage(removeVietnameseTones(rawMsg)) || isHealthInquiry(removeVietnameseTones(rawMsg))) {
    return '';
  }
  let s = rawMsg.trim();
  let prev = '';
  while (prev !== s) {
    prev = s;
    s = s.replace(/^(?:dạ|vâng|ạ|alo|chào|hi|hello)\s+/i, '');
    s = s.replace(/^(?:sản phẩm|mẫu sản phẩm|dòng sản phẩm|mặt hàng)\s+/i, '');
    s = s.replace(/^(?:anh|chị|tôi|mình|em|bạn|shop|ad|bác|chú|cô)\s+/i, '');
    s = s.replace(/^(?:đang\s+hỏi\s+về|đang\s+hỏi|đang\s+nói\s+về|đang\s+nói|đang\s+tìm\s+hiểu|đang\s+tìm|đang\s+cần|đang\s+xem)\s+/i, '');
    s = s.replace(/^(?:cần\s+tìm\s+mua|muốn\s+tìm\s+mua|cần\s+mua|muốn\s+mua|đang\s+tìm|cần\s+tìm|tìm\s+mua|mua\s+giúp|mua\s+hộ|mua)\s+/i, '');
    s = s.replace(/^(?:bán\s+cho\s+(?:tôi|mình|anh|em|chị|bác|chú|cô)?|bán\s+hộ|bán)\s+/i, '');
    s = s.replace(/^(?:cho\s+(?:tôi|mình|anh|em|chị|bác|chú|cô)?\s*(?:xem|coi)|cho\s+xem|cho\s+coi|xem)\s*/i, '');
    s = s.replace(/^(?:bên\s+(?:bạn|em|shop|mình)\s+có\s+bán|bên\s+(?:bạn|em|shop|mình)\s+có|có\s+bán|có\s+sản\s+phẩm|có\s+mẫu|có)\s+/i, '');
    s = s.replace(/^(?:báo\s+giá\s+(?:cho\s+tôi|cho\s+anh|cho\s+chị|cho\s+em)?|tư\s+vấn\s+(?:cho\s+tôi|cho\s+anh|cho\s+chị|cho\s+em)?)\s+/i, '');
    s = s.replace(/^(?:cái|chiếc|mẫu|loại|dòng|con|bộ)\s+/i, '');
  }
  s = s.replace(/\s+(?:bảo\s+hành\s+bao\s+lâu|có\s+bảo\s+hành\s+không|bảo\s+hành\s+mấy\s+năm|bảo\s+hành\s+mấy\s+tháng|bảo\s+hành\s+như\s+thế\s+nào|bảo\s+hành|đổi\s+trả|giao\s+hàng|phí\s+ship|vận\s+chuyển)[?!.,;]*$/i, '');
  s = s.replace(/\s+(?:vậy\s+shop|vậy\s+ad|vậy\s+em|vậy\s+bạn|hả\s+shop|hả\s+em|shop\s+ơi|em\s+ơi)[?!.,;]*$/i, '');
  s = s.replace(/\s+(?:thì\s+có\s+không|thi\s+co\s+khong|thì\s+có|thi\s+co|có\s+không|co\s+khong|giá\s+bao\s+nhiêu|nhiêu\s+tiền|bao\s+nhiêu\s+tiền|bao\s+nhiêu|hết\s+bao\s+nhiêu|không\s+ạ|không|hông|ko|k|vậy|thế|nhỉ|nè|nhé|nha|ạ|ơi|mà|ma|đấy|day|đó|do|hả|ha)[?!.,;]*$/i, '');
  s = s.replace(/[?!.,;]+/g, '').trim();
  return s;
}

const CATALOG_OVERVIEW_KEYWORDS = [
  'kinh doanh gi',
  'kinh doanh nhung gi',
  'kinh doanh cai gi',
  'kinh doanh mat hang gi',
  'kinh doanh mat hang nao',
  'kinh doanh mat hang',
  'kinh doanh san pham gi',
  'kinh doanh san pham',
  'kinh doanh gi the',
  'kinh doanh gi vay',
  'dang kinh doanh gi',
  'chuyen kinh doanh gi',
  'kinh doanh nganh nao',
  'linh vuc kinh doanh',
  'ban gi',
  'ban nhung gi',
  'ban cai gi',
  'ban nhung mat hang',
  'ban nhung san pham',
  'ban san pham gi',
  'ban mat hang gi',
  'ban gi the',
  'ban gi vay',
  'dang ban gi',
  'chuyen ban gi',
  'co ban gi',
  'co ban gi khong',
  'co gi de ban',
  'co gi ban',
  'co san pham gi',
  'co nhung san pham gi',
  'co mat hang gi',
  'co nhung mat hang gi',
  'co nhung mat hang',
  'co nhung gi',
  'co gi khong',
  'co gi',
  'shop co gi',
  'shop ban gi',
  'ben ban co gi',
  'ben ban ban gi',
  'ben em co gi',
  'ben em ban gi',
  'ben anh co gi',
  'ben anh ban gi',
  'ban co gi',
  'ban co san pham nao',
  'danh muc san pham',
  'danh muc tong',
  'cac danh muc',
  'xem danh muc',
  'cho xem danh muc',
  'cac san pham',
  'tat ca san pham',
  'xem tat ca',
  'cac linh vuc',
  'nganh hang',
  'tu van san pham',
  'tu van giup toi',
  'tu van giup minh',
  'tu van giup em',
  'tu van giup anh',
  'tu van cho toi',
  'tu van cho minh',
  'tu van cho em',
  'tu van cho anh',
  'tu van giup',
  'tu van dum',
  'can tu van',
  'muon tu van',
  'tu van gi',
  'tu van hang',
  'tu van di',
  'tu van',
  'xem san pham',
  'cho xem san pham',
  'gioi thieu san pham'
];

/**
 * Kiểm tra xem khách có đang hỏi danh mục tổng quan / hỏi bán gì, kinh doanh gì, có sản phẩm gì, hoặc yêu cầu tư vấn chung
 */
function isCatalogOverviewQuery(normMsg) {
  if (!normMsg) return false;
  const clean = normMsg.replace(/[?!.,;:()"'`~@#$%^&*+=<>{}[\]/\\|]/g, ' ').toLowerCase().trim();

  // Nếu câu hỏi có chứa tên thương hiệu, mã máy hoặc loại sản phẩm cụ thể thì KHÔNG PHẢI hỏi tổng quan
  const SPECIFIC_PRODUCT_INDICATORS = [
    'edison', 'xinda', 'sharp', 'daikin', 'samsung', 'sony', 'lg', 'lenovo', 'dell', 'hp', 'asus',
    'julong', 'hang tin', 'hangtin', 'like sys', 'likesys', 'lda', 'xiudun', 'bofa', 'canon', 'apple', 'macbook',
    'thinkpad', 'thinkcentre', 'ideapad', 'vivobook', 'omnibook', 'legion', 'thinkstation',
    'tivi', 'tv', 'tu lanh', 'may lanh', 'dieu hoa', 'laptop', 'hut am', 'may hut am', 'man hinh',
    'dem tien', 'may dem tien', 'bo tien', 'dong chung tu', 'kiem gia', 'ket sat',
    'ban giam doc', 'ban lam viec', 'ban hop', 'ghe giam doc', 'ghe van phong', 'ghe gaming',
    'tra ', 'oolong', 'olong', 'hac tra', 'matcha', 'luc tra', 'hong tra', 'hoang ty', 'nhat minh', 'bich thuy', 'hoan nguyen', 'ngoc trac', 'hao ky', 'huong sa', 'phong mat', 'dai hoang bao', 'tam thanh',
    'ca phe', 'cafe', 'espresso', 'robusta', 'culi', 'arabica', 'rang moc',
    'cay nuoc', 'nuoc nong lanh', 'kangaroo', 'kg64a3',
    'nuoc hoa', 'my pham', 'cindy bloom', 'aroma flower', 'tay te bao chet',
    'panasonic', 'kx-tsc11', 'kx ts500', 'kx-'
  ];
  if (SPECIFIC_PRODUCT_INDICATORS.some((kw) => clean.includes(kw))) {
    return false;
  }

  const modelCodesInClean = extractModelCodes(clean);
  if (modelCodesInClean && modelCodesInClean.length > 0) {
    return false;
  }

  if (CATALOG_OVERVIEW_KEYWORDS.some((k) => clean.includes(k))) {
    return true;
  }
  if (
    /\b(kinh doanh|ban|co|cung cap)\s+(cai\s+)?gi\b/.test(clean) ||
    /\b(kinh doanh|ban|co|cung cap)\s+(nhung\s+)?(gi|mat hang|san pham|linh vuc)\b/.test(clean) ||
    /\b(co|ban|kinh doanh)\s+(nhung\s+)?(mon|do|hang|gi)\s+(gi|khong|nao)\b/.test(clean) ||
    /^(?:tu van|tu van giup|tu van ho|can tu van|muon tu van|tu van san pham|tu van mat hang)$/.test(clean)
  ) {
    return true;
  }
  return false;
}

/**
 * Extract model codes and numbers from product names and customer queries.
 */
function extractModelCodes(str) {
  if (!str) return [];
  const clean = str.replace(/[?!.,;:()"'`~@#$%^&*+=<>{}[\]/\\|]/g, ' ').toLowerCase();
  const matches = clean.match(/\b[a-z]{0,4}\d{2,5}[a-z]{0,3}\b|\b\d{2,4}[-_]\d{2,4}\b|\b[a-z0-9]+[-_][a-z0-9]+\b/g) || [];
  const codes = new Set();
  for (const m of matches) {
    codes.add(m);
    codes.add(m.replace(/[-_]/g, ''));
    const numOnly = m.match(/\d{2,5}/);
    if (numOnly) codes.add(numOnly[0]);
  }
  return [...codes];
}

const FOREIGN_BRANDS = [
  'iphone', 'ipad', 'toshiba', 'panasonic',
  'xiaomi', 'sony', 'brother',
  'casio', 'mitsubishi', 'hitachi'
];
const FOREIGN_TYPES = [
  'may giat', 'may may',
  'xe may', 'o to', 'noi com', 'hut bui', 'may ep', 'tu quan ao'
];

function isForeignProductQuery(cleanNormMsg, normProdName) {
  for (const fb of FOREIGN_BRANDS) {
    if (new RegExp(`(^|\\s)${fb}(\\s|$)`).test(cleanNormMsg) && !normProdName.includes(fb)) {
      return true;
    }
  }
  for (const ft of FOREIGN_TYPES) {
    if (new RegExp(`(^|\\s)${ft}(\\s|$)`).test(cleanNormMsg) && !normProdName.includes(ft)) {
      return true;
    }
  }
  return false;
}

/**
 * Calculate similarity percentage (0 - 100) between customer query and a product in data.
 */
function calculateProductSimilarity(cleanNormMsg, product, coreQuery = '', contextField = null) {
  if (!cleanNormMsg || !product) return 0;
  const normProdName = removeVietnameseTones(product.name || '').replace(/[?!.,;:()"'`~@#$%^&*+=<>{}[\]/\\|]/g, ' ');
  const normField = removeVietnameseTones(product.field || '');
  const normSlug = removeVietnameseTones(String(product.slug || product.id || ''));
  const normCore = coreQuery ? removeVietnameseTones(coreQuery).replace(/[?!.,;:()"'`~@#$%^&*+=<>{}[\]/\\|]/g, ' ').trim() : '';

  // 0. Foreign brands or products outside catalog => 0% similarity
  if (isForeignProductQuery(cleanNormMsg, normProdName) || (normCore && isForeignProductQuery(normCore, normProdName))) {
    return 0;
  }

  // 0A. KIỂM TRA MÂU THUẪN THÔNG SỐ KỸ THUẬT RÕ RÀNG (KÍCH THƯỚC INCH, DUNG TÍCH LÍT, CÔNG SUẤT HP):
  // Nếu khách hỏi cụ thể một kích cỡ/thông số (ví dụ: "65 inch", "600 lít", "2.5 hp")
  // mà sản phẩm có thông số khác (ví dụ: 55 inch, 23.8 inch, 417 lít) thì TUYỆT ĐỐI KHÔNG KHỚP (trả về 0%).
  const queryInchMatch = (cleanNormMsg + ' ' + normCore).match(/\b(\d+(?:\.\d)?)\s*(?:inch|in|"|'')\b/i);
  if (queryInchMatch) {
    const qInch = parseFloat(queryInchMatch[1]);
    const prodInchMatch = (normProdName + ' ' + normSlug).match(/\b(\d+(?:\.\d)?)\s*(?:inch|in|"|'')\b/i);
    if (prodInchMatch) {
      const pInch = parseFloat(prodInchMatch[1]);
      if (Math.abs(qInch - pInch) > 1.5) {
        return 0; // Mâu thuẫn kích thước màn hình rõ ràng
      }
    } else {
      return 0; // Sản phẩm không có kích thước inch
    }
  }

  const queryLitMatch = (cleanNormMsg + ' ' + normCore).match(/\b(\d{2,4})\s*(?:lit|l)\b/);
  if (queryLitMatch) {
    const qLit = parseInt(queryLitMatch[1], 10);
    const prodLitMatch = normProdName.match(/\b(\d{2,4})\s*(?:lit|l)\b/);
    if (prodLitMatch) {
      const pLit = parseInt(prodLitMatch[1], 10);
      if (Math.abs(qLit - pLit) > 30) {
        return 0; // Mâu thuẫn dung tích tủ lạnh
      }
    }
  }

  const queryHpMatch = (cleanNormMsg + ' ' + normCore).match(/\b(\d+(?:\.\d)?)\s*(?:hp|ngua)\b/);
  if (queryHpMatch) {
    const qHp = parseFloat(queryHpMatch[1]);
    const prodHpMatch = normProdName.match(/\b(\d+(?:\.\d)?)\s*(?:hp|ngua)\b/);
    if (prodHpMatch) {
      const pHp = parseFloat(prodHpMatch[1]);
      if (Math.abs(qHp - pHp) > 0.3) {
        return 0; // Mâu thuẫn công suất máy lạnh
      }
    }
  }

  // 0A1. CHỐNG NHẦM LẪN SẢN PHẨM & XUNG ĐỘT DANH MỤC (ANTI-CONFUSION & DOMAIN CONFLICT GUARD):
  // Ví dụ: Khách hỏi "Điện thoại Panasonic KX-TSC11", tuyệt đối KHÔNG ĐƯỢC lấy "Tủ lạnh Panasonic" hay "Đồ gia dụng Panasonic" để trả lời.
  const isTelecomQuery = /\b(dien thoai|dien thoai ban|tong dai|kx[-_\s]?[a-z0-9]{3,7})\b/i.test(cleanNormMsg + ' ' + normCore);
  const isFridgeQuery = /\b(tu lanh|tu dong|tu mat)\b/i.test(cleanNormMsg + ' ' + normCore);
  const isAirConditionerQuery = /\b(may lanh|dieu hoa)\b/i.test(cleanNormMsg + ' ' + normCore);
  const isHomeApplianceQuery = /\b(do gia dung|gia dung|noi com|may hut am|quat dien|may loc nuoc|hut bui)\b/i.test(cleanNormMsg + ' ' + normCore);
  const isComputerQuery = /\b(laptop|may tinh|thinkpad|thinkcentre|macbook|pc|cpu|tablet|may tinh bang)\b/i.test(cleanNormMsg + ' ' + normCore);

  const isProdTelecom = /\b(dien thoai|tong dai|kx[-_\s]?[a-z0-9]{3,7})\b/i.test(normProdName + ' ' + normField);
  const isProdFridge = /\b(tu lanh|tu dong|tu mat)\b/i.test(normProdName + ' ' + normField);
  const isProdAirConditioner = /\b(may lanh|dieu hoa)\b/i.test(normProdName + ' ' + normField);
  const isProdHomeAppliance = /\b(gia dung|do gia dung|noi com|hut am)\b/i.test(normProdName + ' ' + normField);
  const isProdComputer = /\b(laptop|may tinh|thinkpad|thinkcentre|pc|cpu|tablet|man hinh)\b/i.test(normProdName + ' ' + normField);

  if (isTelecomQuery && !isProdTelecom) {
    return 0; // Khách hỏi điện thoại bàn, sản phẩm không phải điện thoại bàn => 0%
  }
  if (isFridgeQuery && !isProdFridge) {
    return 0; // Khách hỏi tủ lạnh, sản phẩm không phải tủ lạnh => 0%
  }
  if (isAirConditionerQuery && !isProdAirConditioner) {
    return 0; // Khách hỏi máy lạnh, sản phẩm không phải máy lạnh => 0%
  }
  if (isComputerQuery && !isProdComputer && (isProdFridge || isProdAirConditioner || isProdHomeAppliance || isProdTelecom)) {
    return 0; // Khách hỏi máy tính, sản phẩm là đồ gia dụng/điện lạnh/viễn thông => 0%
  }

  // 0A2. MÂU THUẪN MÃ SẢN PHẨM CỤ THỂ (MODEL CODE DISCREPANCY GUARD):
  // Ví dụ: Khách hỏi KX-TSC11, KX-TS500, JL206, v.v. Nếu sản phẩm không chứa mã này thì không được gán >= 80%
  const specificModelMatch = (cleanNormMsg + ' ' + normCore).match(/\b(kx[-_\s]?[a-z0-9]{3,7}|jl\s*206|ml\s*2fs|bc\s*39f|ls\s*200f|hl[-_\s]?l6210dw|ads[-_\s]?4300n|tn[-_\s]?3609)\b/i);
  if (specificModelMatch) {
    const rawTargetModel = specificModelMatch[1].replace(/[-_\s]/g, '').toLowerCase();
    const prodTargetModel = (normProdName + ' ' + normSlug).replace(/[-_\s]/g, '').toLowerCase();
    if (!prodTargetModel.includes(rawTargetModel)) {
      return 0; // Mâu thuẫn mã sản phẩm cụ thể
    }
  }


  // 0B. Nếu đang có ngữ cảnh danh mục cụ thể (ví dụ Laptop) mà sản phẩm lại thuộc danh mục khác (ví dụ Trà, Tivi, Nội thất, Gia dụng):
  // Chỉ lọc bỏ nếu câu hỏi của khách KHÔNG đề cập đến tên sản phẩm hoặc từ khóa của danh mục này.
  if (contextField && contextField !== 'Tất cả') {
    const normCtx = removeVietnameseTones(contextField).toLowerCase();
    if (!normField.includes(normCtx) && !normCtx.includes(normField)) {
      const queryToCheck = (normCore || cleanNormMsg);
      const isDomainKeywordOfThisProd =
        (/\b(tra|che|oolong|bich thuy|hao ky|ngoc trac|xuan nhat|huong phu|bat thu)\b/i.test(queryToCheck) && (normField.includes('tra') || normProdName.includes('tra'))) ||
        (/\b(tivi|tv|qled|oled|smart tv)\b/i.test(queryToCheck) && (normField.includes('tivi') || normProdName.includes('tivi') || normProdName.includes('tv'))) ||
        (/\b(tu lanh)\b/i.test(queryToCheck) && normProdName.includes('tu lanh')) ||
        (/\b(may lanh|dieu hoa|daikin)\b/i.test(queryToCheck) && (normProdName.includes('may lanh') || normProdName.includes('dieu hoa'))) ||
        (/\b(may hut am|hut am|edison)\b/i.test(queryToCheck) && (normProdName.includes('hut am') || normField.includes('gia dung'))) ||
        (/\b(ban|ghe|ban ghe|sofa|noi that|giam doc)\b/i.test(queryToCheck) && (normField.includes('noi that') || normProdName.includes('ban') || normProdName.includes('ghe'))) ||
        (/\b(dem tien|may dem tien|xiudun|xinda|julong|hang tin|hangtin)\b/i.test(queryToCheck) && (normField.includes('dem tien') || normProdName.includes('dem tien'))) ||
        (/\b(may in|muc in|may scan|hop muc|may photocopy)\b/i.test(queryToCheck) && (normField.includes('may in') || normField.includes('muc in') || normField.includes('may scan') || normProdName.includes('may in') || normProdName.includes('brother'))) ||
        (/\b(ca phe|cafe|espresso|rang moc)\b/i.test(queryToCheck) && (normField.includes('ca phe') || normProdName.includes('ca phe'))) ||
        (/\b(matcha|bot matcha)\b/i.test(queryToCheck) && (normField.includes('matcha') || normProdName.includes('matcha'))) ||
        (/\b(nuoc hoa|my pham|tay te bao chet|cindy bloom|aroma flower)\b/i.test(queryToCheck) && (normField.includes('nuoc hoa') || normField.includes('my pham') || normProdName.includes('nuoc hoa') || normProdName.includes('te bao chet'))) ||
        (/\b(cpu|chip|thinkcentre)\b/i.test(queryToCheck) && (normField.includes('cpu') || normProdName.includes('thinkcentre'))) ||
        (/\b(tablet|may tinh bang|ipad)\b/i.test(queryToCheck) && (normField.includes('tablet') || normProdName.includes('tablet'))) ||
        (/\b(laptop|macbook|may tinh|man hinh|vivobook|ideapad|omnibook)\b/i.test(queryToCheck) && (normField.includes('cong nghe') || normField.includes('laptop') || normProdName.includes('laptop') || normProdName.includes('macbook')));

      const hasCategoryMatch = hasWordMatch(cleanNormMsg, normField) || (normCore && normCore.length >= 2 && hasWordMatch(normCore, normField));
      const hasProdNameMatch = normCore && normCore.length >= 2 && hasWordMatch(normProdName, normCore);

      if (!isDomainKeywordOfThisProd && !hasCategoryMatch && !hasProdNameMatch) {
        return 0;
      }
    }
  }

  // Exact phrase match
  const qTrim = cleanNormMsg.trim();
  const qWords = qTrim.split(/\s+/).filter(Boolean);
  const coreTrim = normCore ? normCore.trim() : '';
  const coreWords = coreTrim ? coreTrim.split(/\s+/).filter(Boolean) : [];

  if (qTrim === normProdName || coreTrim === normProdName) return 100;
  if (cleanNormMsg.includes(normProdName)) return 100;

  // Base product name phrase match (stripping weight, volume, size, specs like 160gr, 320gr, 250g, 14.0inch)
  const normBaseProdName = normProdName
    .replace(/\b\d{1,4}\s*(?:gr|g|kg|ml|l|lit|inch|in|w|hp)\b/gi, '')
    .replace(/\(.*?\)/g, '')
    .replace(/[-_]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  if (normBaseProdName.length >= 6) {
    if (cleanNormMsg.includes(normBaseProdName) || (normCore && normCore.includes(normBaseProdName))) {
      return 99;
    }
  }

  // Substring match: only give high score (>= 90%) if the query contains multiple words
  // and covers a significant portion (>= 45%) of the product name, or at least 3 distinct words.
  // Never give >= 90% for a single-word substring match of a multi-word product (e.g. 'nguyen' in 'bich thuy hoan nguyen')!
  if (normProdName.includes(qTrim)) {
    if (qWords.length >= 3 || (qWords.length >= 2 && qTrim.length >= normProdName.length * 0.45)) {
      return 96;
    }
    if (qWords.length >= 2) {
      return 86;
    }
  }

  if (coreTrim && normProdName.includes(coreTrim)) {
    if (coreWords.length >= 3 || (coreWords.length >= 2 && coreTrim.length >= normProdName.length * 0.45)) {
      return 95;
    }
    if (coreWords.length >= 2) {
      return 85;
    }
  }

  // Meaningful tokens - loại bỏ cả các đơn vị đo lường đơn lẻ (inch, lit, hp, w) để không làm sai lệch tỉ lệ tương đồng
  const UNIT_ONLY_TOKENS = new Set(['inch', 'in', 'lit', 'l', 'hp', 'ngua', 'kg', 'g', 'gr', 'w', 'kw', 'v', 'hz', 'cm', 'mm', 'm']);
  const targetText = normCore && normCore.length >= 3 ? normCore : cleanNormMsg;
  const queryTokens = targetText.split(/\s+/).filter((t) => t.length >= 2 && !STOP_WORDS.has(t) && !UNIT_ONLY_TOKENS.has(t));
  const prodTokens = normProdName.split(/\s+/).filter((t) => t.length >= 2 && !STOP_WORDS.has(t) && !UNIT_ONLY_TOKENS.has(t));
  if (queryTokens.length === 0) return 0;

  let matchCount = 0;
  for (const qt of queryTokens) {
    if (prodTokens.includes(qt) || prodTokens.some((pt) => pt === qt || (pt.length >= 4 && qt.length >= 4 && (pt.includes(qt) || qt.includes(pt))))) {
      matchCount++;
    }
  }

  // Distinctive base tokens match: if 3+ distinctive tokens of product name are all in query
  const baseTokens = normBaseProdName.split(/\s+/).filter(t => t.length >= 2 && !STOP_WORDS.has(t) && !UNIT_ONLY_TOKENS.has(t));
  if (baseTokens.length >= 3) {
    const allBaseTokensPresent = baseTokens.every(bt => cleanNormMsg.includes(bt) || (normCore && normCore.includes(bt)));
    if (allBaseTokensPresent) {
      return 98;
    }
  }

  // Brand detection
  const brands = [
    'xinda', 'hang tin', 'hangtin', 'edison', 'julong', 'like sys', 'likesys', 'lda', 'xiudun', 'ds', 'ht', 'canon', 'dell', 'bofa',
    'apple', 'macbook', 'asus', 'lenovo', 'hp', 'samsung', 'daikin', 'sharp', 'lg', 'ama', 'ideapad', 'vivobook', 'omnibook', 'legion',
    'panasonic', 'sony', 'toshiba', 'hitachi', 'electrolux', 'acer', 'brother', 'epson', 'philips'
  ];
  let queryBrand = null;
  let brandMatch = false;
  for (const b of brands) {
    if (cleanNormMsg.includes(b) || normCore.includes(b)) {
      queryBrand = b;
      if (normProdName.includes(b)) {
        brandMatch = true;
      }
      break;
    }
  }
  const brandMismatch = Boolean(queryBrand && !brandMatch);

  const hasCategory = cleanNormMsg.includes(normField) || normCore.includes(normField) || (normField.includes('dem tien') && cleanNormMsg.includes('dem tien'));

  // Extract model codes
  const queryModels = extractModelCodes(cleanNormMsg + ' ' + normCore);
  const prodModels = extractModelCodes(normProdName + ' ' + normSlug);

  let modelMatch = false;
  for (const qm of queryModels) {
    if (prodModels.some((pm) => pm === qm)) {
      if (/^\d{2}$/.test(qm)) {
        if (brandMatch || hasCategory) {
          modelMatch = true;
          break;
        }
      } else {
        modelMatch = true;
        break;
      }
    }
  }

  // Scenario 1: Model matches + (brand or category or specific token) => 92% - 98%
  if (modelMatch && (brandMatch || hasCategory || prodModels.some((m) => cleanNormMsg.includes(m)))) {
    const queryGenMatch = cleanNormMsg.match(/\bgen\s*(\d{1,2})\b/i);
    if (queryGenMatch) {
      const qGen = queryGenMatch[1];
      const prodGenMatch = normProdName.match(/\bgen\s*(\d{1,2})\b/i);
      if (prodGenMatch) {
        return prodGenMatch[1] === qGen ? 98 : 88;
      }
    }
    return 95;
  }
  if (modelMatch) {
    const queryGenMatch = cleanNormMsg.match(/\bgen\s*(\d{1,2})\b/i);
    if (queryGenMatch) {
      const qGen = queryGenMatch[1];
      const prodGenMatch = normProdName.match(/\bgen\s*(\d{1,2})\b/i);
      if (prodGenMatch) {
        return prodGenMatch[1] === qGen ? 96 : 86;
      }
    }
    return 92;
  }

  const matchRatio = matchCount / Math.max(queryTokens.length, 1);
  if (matchRatio >= 0.75 && queryTokens.length >= 2) {
    if (brandMatch || modelMatch || matchRatio >= 0.9) {
      return 93;
    }
    return 90;
  }
  if (matchRatio >= 0.8 && brandMatch) {
    return 91;
  }

  // Core category matching (Ghế, Bàn, Tủ lạnh, Máy lạnh, Máy đếm tiền, etc.)
  const coreTarget = normCore || cleanNormMsg;
  if (coreTarget.includes('ghe') && normProdName.includes('ghe')) {
    if (coreTarget.includes('giam doc') && normProdName.includes('giam doc')) return 95;
    if (coreTarget.includes('gaming') && normProdName.includes('gaming')) return 95;
    return 85; // Similar chair (e.g. "ghế nhân viên", "ghế văn phòng" -> 85% for Ghế giám đốc/gaming)
  }

  const isDeskQuery = /\b(ban ghe|ban lam viec|ban giam doc|ban van phong|ban hop|ban go|ban mdf|cai ban|chiec ban|mua ban)\b/.test(coreTarget);
  if (isDeskQuery && normProdName.includes('ban')) {
    if (coreTarget.includes('giam doc') && normProdName.includes('giam doc')) return 95;
    return 85; // Similar desk (e.g. "bàn làm việc", "bàn văn phòng" -> 85% for Bàn Giám Đốc)
  }

  // Tivi / TV
  if ((coreTarget.includes('tivi') || coreTarget.includes('tv')) && (normProdName.includes('tv') || normProdName.includes('tivi') || normField.includes('tivi'))) {
    if (brandMatch) return 95;
    if (brandMismatch) return 75;
    return 92;
  }

  // Tủ lạnh
  if (coreTarget.includes('tu lanh') && normProdName.includes('tu lanh')) {
    if (brandMatch) return 95;
    if (brandMismatch) return 75;
    return 92;
  }

  // Máy lạnh / điều hòa
  if ((coreTarget.includes('may lanh') || coreTarget.includes('dieu hoa')) && (normProdName.includes('may lanh') || normProdName.includes('dieu hoa'))) {
    if (brandMatch) return 95;
    if (brandMismatch) return 75;
    return 92;
  }

  // Laptop / Macbook / máy tính
  if ((coreTarget.includes('laptop') || coreTarget.includes('macbook') || coreTarget.includes('may tinh')) && (normProdName.includes('laptop') || normProdName.includes('macbook') || normProdName.includes('ideapad') || normProdName.includes('vivobook') || normProdName.includes('omnibook'))) {
    if (brandMatch) return 95;
    if (brandMismatch) return 75;
    return 92;
  }

  // Màn hình
  if (coreTarget.includes('man hinh') && normProdName.includes('man hinh')) {
    if (brandMatch) return 95;
    if (brandMismatch) return 75;
    return 92;
  }

  // Trà cao cấp (dùng word boundary \btra\b để tránh từ tiếng Anh như 'Ultra')
  if (/\b(tra|che|oolong)\b/i.test(coreTarget)) {
    const hasTeaInProd = /\b(tra|che|oolong)\b/i.test(normProdName);
    const hasTeaInField = /\b(tra|che|oolong)\b/i.test(normField);
    if (hasTeaInProd || hasTeaInField) {
      return 85; // Điểm nhóm danh mục chung, không đè lên sản phẩm cụ thể
    }
  }

  // Máy đếm tiền
  if ((coreTarget.includes('dem tien') || coreTarget.includes('may dem')) && (normProdName.includes('dem tien') || normField.includes('dem tien'))) {
    if (brandMatch) return 95;
    if (brandMismatch) return 75;
    return 92;
  }

  // Scenario 2: Same brand & category OR close model => 80% - 89%
  if (brandMatch && hasCategory) {
    return 86;
  }
  if (brandMatch && matchCount >= 2 && matchRatio >= 0.5) {
    return 83;
  }
  if (hasCategory && matchCount >= 2) {
    return 80;
  }
  const isOnlyNumberAndUnit = queryTokens.length === 2 && (/^\d+$/.test(queryTokens[0]) || /^\d+$/.test(queryTokens[1]));
  if (matchRatio >= 0.6 && queryTokens.length >= 2 && !isOnlyNumberAndUnit) {
    return 82;
  }
  if (brandMatch) {
    return 65; // Same brand but different category / low token overlap -> related product (Tier 3)
  }

  // Specific product type overlap (e.g. "máy bó tiền thếp", "máy đóng chứng từ", "máy hút ẩm")
  const productTypes = [
    'may bo tien thep', 'may bo tien', 'may dong chung tu', 'may hut am',
    'phan loai tien', 'kiem dem tien', 'ket sat'
  ];
  for (const pt of productTypes) {
    if ((cleanNormMsg.includes(pt) || normCore.includes(pt)) && normProdName.includes(pt)) {
      if (modelMatch) return 95;
      return 85;
    }
  }

  // Below 80%
  const score = Math.round(matchRatio * 70);
  return Math.min(score, 78);
}

/**
 * Evaluate product match against catalog and classify into 3 distinct business tiers:
 * - Tier 1: similarity >= 90% (Exact or high match -> Advise + Price + Reveal Col 2 + Ask budget)
 * - Tier 2: 80% <= similarity < 90% (Similar product -> Advise similar + Price + Reveal Col 2 + Ask budget)
 * - Tier 3: similarity < 80% or missing product query -> Ask for customer phone number for owner
 */
export function evaluateProductMatch(message, normMessage, allProducts, contextField = null) {
  if (!normMessage || !allProducts || allProducts.length === 0) {
    return {
      tier: 3,
      similarity: 0,
      topProduct: null,
      rankedProducts: [],
      matchedField: null,
      missingProductQuery: null
    };
  }

  // TÌNH HUỐNG KHÁCH HÀNG HỎI THĂM SỨC KHOẺ ("bạn khoẻ không", "khỏe không"...):
  // Tuyệt đối KHÔNG quảng cáo sản phẩm ngay, không mở Cột 2!
  if (isHealthInquiry(normMessage)) {
    return {
      tier: 3,
      similarity: 0,
      topProduct: null,
      rankedProducts: [],
      matchedField: null,
      missingProductQuery: null,
      isHealthInquiry: true
    };
  }

  // TÌNH HUỐNG LÀM MỚI / XÓA NỘI DUNG CHAT / THAO TÁC HỆ THỐNG:
  // Tuyệt đối KHÔNG ĐƯỢC gán là sản phẩm hay tìm kiếm hàng hoá!
  if (
    /(?:xoa\s+(?:noi\s+dung\s+)?chat|noi\s+dung\s+chat|dung\s+chat|xoa\s+chat|lam\s+moi|tin\s+nhan|lich\s+su\s+chat|cuoc\s+tro\s+chuyen|clear\s+chat|reset\s+chat)\b/i.test(normMessage)
  ) {
    return {
      tier: 3,
      similarity: 0,
      topProduct: null,
      relatedProduct: null,
      rankedProducts: [],
      matchedField: null,
      missingProductQuery: null,
      isResetChat: true
    };
  }

  // TÌNH HUỐNG KHÁCH HÀNG CHÀO HỎI THUẦN TÚY ("hi", "chào", "chào bạn", "hello"...):
  // Tuyệt đối KHÔNG ĐƯỢC gán là sản phẩm hay tìm kiếm hàng hoá!
  if (isGreetingMessage(normMessage)) {
    return {
      tier: 3,
      similarity: 0,
      topProduct: null,
      rankedProducts: [],
      matchedField: null,
      missingProductQuery: null,
      isGreeting: true
    };
  }

  // TÌNH HUỐNG HỎI DANH MỤC TỔNG QUAN / BẠN KINH DOANH GÌ / BÁN CÁI GÌ / CÓ SẢN PHẨM GÌ:
  // Không chọn sản phẩm lẻ và không ép vào 1 danh mục cụ thể
  if (isCatalogOverviewQuery(normMessage)) {
    return {
      tier: 3,
      similarity: 0,
      topProduct: null,
      rankedProducts: [],
      matchedField: null,
      missingProductQuery: null,
      isGeneralCatalogQuery: true
    };
  }

  // TÌNH HUỐNG YÊU CẦU GẶP NHÂN VIÊN HỖ TRỢ / CHUYÊN VIÊN TƯ VẤN:
  if (/(gap nhan vien|gap nguoi|noi chuyen voi nguoi|chuyen vien tu van|ho tro truc tiep|goi lai cho toi|goi dien lai|tu van truc tiep|chamsoc khach hang|cskh|gap chu shop|nguoi that)\b/i.test(normMessage)) {
    return {
      tier: 3,
      similarity: 0,
      topProduct: null,
      rankedProducts: [],
      matchedField: null,
      missingProductQuery: null,
      isStaffHandoff: true
    };
  }

  // TÌNH HUỐNG KHÁCH HÀNG NÓI TÊN ĐỂ XƯNG HÔ ("Tôi tên Trí", "Em tên Linh", "Anh là Nam"...):
  // Tuyệt đối KHÔNG ĐƯỢC gán là sản phẩm hay tìm kiếm hàng hoá!
  if (isCustomerNameDeclaration(message, normMessage)) {
    return {
      tier: 3,
      similarity: 0,
      topProduct: null,
      rankedProducts: [],
      matchedField: null,
      missingProductQuery: null,
      isNameDeclaration: true
    };
  }

  const isPolicyInquiry = /(?:chinh sach bao hanh|thoi gian bao hanh|bao hanh bao lau|bao hanh nhu the nao|bao hanh may nam|bao hanh may thang|bao hanh co khong|co bao hanh|bao hanh|chinh sach doi tra|doi tra hang|quy dinh doi tra|doi tra nhu the nao|chinh sach giao hang|phi ship|phi van chuyen|giao hang tan noi|ship cod|bao lau nhan duoc hang|chinh sach ship|ship tinh)\b/i.test(normMessage);

  const isComparison = /(?:so sanh|khac nhau nhu the nao|khac nhau diem nao|nen chon mau nao|nen mua con nao|loai nao tot hon|mau nao hon)\b/i.test(normMessage);

  const cleanNormMsg = normMessage.replace(/[?!.,;:()"'`~@#$%^&*+=<>{}[\]/\\|]/g, ' ').toLowerCase();

  // RELATIVE / CONTEXTUAL QUERIES:
  // e.g. "lấy cho anh loại rẻ nhất", "loại rẻ nhất", "mẫu đắt nhất", "dưới 10 triệu", "so sánh các mẫu", "có mẫu nào khác không"
  const hasBudget = Boolean(extractBudget(normMessage));
  const hasCompare = normMessage.includes('so sanh') || normMessage.includes('khac nhau');
  const isAskOther =
    normMessage.includes('mau khac') ||
    normMessage.includes('loai khac') ||
    normMessage.includes('dong khac') ||
    normMessage.includes('xem them') ||
    normMessage.includes('con loai nao') ||
    normMessage.includes('con mau nao') ||
    normMessage.includes('co loai nao khac') ||
    normMessage.includes('co mau nao khac') ||
    normMessage.includes('nao khac');

  const hasExplicitDomainKeyword = [
    'tivi', 'tv', 'laptop', 'tu lanh', 'may lanh', 'dieu hoa', 'ghe', 'ban',
    'dem tien', 'ket sat', 'may in', 'dien thoai', 'tra', 'may hut am', 'may bo tien',
    'ca phe', 'cafe', 'matcha', 'nuoc hoa', 'my pham', 'da chet', 'cpu', 'tablet'
  ].some((kw) => hasWordMatch(cleanNormMsg, kw));

  const hasSpecificBrandOrModel = allProducts.some((p) => {
    const normP = removeVietnameseTones(p.name || '').toLowerCase();
    const codes = extractModelCodes(normP);
    const msgCodes = extractModelCodes(cleanNormMsg);
    if (msgCodes.some((mc) => codes.includes(mc))) return true;
    const prodBrands = ['samsung', 'daikin', 'sharp', 'lg', 'xinda', 'lenovo', 'dell', 'hp', 'asus', 'edison', 'bofa', 'julong', 'canon'];
    return prodBrands.some((b) => cleanNormMsg.includes(b) && normP.includes(b));
  });

  if ((hasBudget || hasCompare || isAskOther) && !hasExplicitDomainKeyword && !hasSpecificBrandOrModel) {
    return {
      tier: 3,
      similarity: 0,
      topProduct: null,
      rankedProducts: [],
      matchedField: null,
      missingProductQuery: null,
      isRelativeQuery: true
    };
  }

  const coreQuery = extractCoreProductQuery(message);
  const normCore = removeVietnameseTones(coreQuery);

  const isForeign =
    FOREIGN_BRANDS.some((fb) => new RegExp(`(^|\\s)${fb}(\\s|$)`).test(cleanNormMsg) || (normCore && new RegExp(`(^|\\s)${fb}(\\s|$)`).test(normCore))) ||
    FOREIGN_TYPES.some((ft) => new RegExp(`(^|\\s)${ft}(\\s|$)`).test(cleanNormMsg) || (normCore && new RegExp(`(^|\\s)${ft}(\\s|$)`).test(normCore)));

  if (isForeign) {
    const hasActualMatch = allProducts.some((p) => {
      const normName = removeVietnameseTones(p.name || '').toLowerCase();
      return (
        FOREIGN_BRANDS.some((fb) => new RegExp(`(^|\\s)${fb}(\\s|$)`).test(cleanNormMsg) && normName.includes(fb)) ||
        FOREIGN_TYPES.some((ft) => new RegExp(`(^|\\s)${ft}(\\s|$)`).test(cleanNormMsg) && normName.includes(ft))
      );
    });

    if (!hasActualMatch) {
      return {
        tier: 3,
        similarity: 0,
        topProduct: null,
        rankedProducts: [],
        matchedField: null,
        missingProductQuery: formatMissingProductName(coreQuery || message.trim(), contextField)
      };
    }
  }

  const matchedField = findMatchingField(normMessage, allProducts);

  const scored = allProducts.map((p) => ({
    product: p,
    similarity: calculateProductSimilarity(cleanNormMsg, p, coreQuery, contextField)
  }));

  scored.sort((a, b) => b.similarity - a.similarity);

  const topMatch = scored[0];
  const bestSimilarity = topMatch ? topMatch.similarity : 0;
  const rankedProducts = scored.filter((s) => s.similarity >= 80).map((s) => s.product);

  let tier = 3;
  if (bestSimilarity >= 90) {
    tier = 1;
  } else if (bestSimilarity >= 80) {
    tier = 2;
  } else {
    tier = 3;
  }

  const hasMatchedProduct = bestSimilarity >= 80;
  const missingProductQuery = (!hasMatchedProduct && (tier === 3 || tier === 2) && !isPolicyInquiry && !isComparison)
    ? detectMissingProductInquiry(message, normMessage, tier === 1 ? rankedProducts : [], matchedField, allProducts, coreQuery, contextField)
    : null;

  return {
    tier,
    similarity: bestSimilarity,
    topProduct: bestSimilarity >= 80 ? topMatch.product : null,
    relatedProduct: (scored[0]?.similarity >= 50 && scored[0]?.product) ? scored[0].product : null,
    rankedProducts,
    matchedField: matchedField || (bestSimilarity >= 80 && topMatch ? topMatch.product.field : null),
    missingProductQuery,
    isPolicyInquiry: Boolean(isPolicyInquiry),
    isComparison: Boolean(isComparison)
  };
}

/**
 * Score and match products in the catalog against the customer's natural-language message.
 */
function findMatchingProducts(normMsg, allProducts) {
  if (!normMsg || !allProducts || allProducts.length === 0) return [];
  if (isHealthInquiry(normMsg) || isGreetingMessage(normMsg) || isCatalogOverviewQuery(normMsg) || isCustomerNameDeclaration(null, normMsg)) return [];
  const cleanNormMsg = normMsg.replace(/[?!.,;:()"'`~@#$%^&*+=<>{}[\]/\\|]/g, ' ').toLowerCase();
  const scored = allProducts.map((p) => ({
    product: p,
    similarity: calculateProductSimilarity(cleanNormMsg, p)
  }));

  return scored
    .filter((s) => s.similarity >= 80)
    .sort((a, b) => b.similarity - a.similarity)
    .map((s) => s.product);
}

/**
 * Detect which product field (category) in the live catalog the customer is asking about.
 */
export function findMatchingField(normMsg, allProducts) {
  if (!normMsg || !allProducts || allProducts.length === 0) return null;
  // Khi khách hỏi thăm sức khoẻ, chào hỏi, xưng tên hoặc hỏi tổng quan, không dò danh mục
  if (isHealthInquiry(normMsg) || isGreetingMessage(normMsg) || isCatalogOverviewQuery(normMsg) || isCustomerNameDeclaration(null, normMsg)) {
    return null;
  }

  const fields = [...new Set(allProducts.map((p) => p.field).filter(Boolean))];
  const cleanNorm = normMsg.replace(/[?!.,;:()"'`~@#$%^&*+=<>{}[\]/\\|]/g, ' ').toLowerCase();

  // 1. Direct normalized field name match using word boundaries
  for (const f of fields) {
    const normF = removeVietnameseTones(f).trim().toLowerCase();
    if (hasWordMatch(cleanNorm, normF) || cleanNorm.includes(normF)) {
      return f;
    }
  }

  // 2. Comprehensive domain regex mapping matched against existing catalog fields
  const domainPatterns = [
    { regex: /\b(tra|che|oolong|hong tra|hoang tra|hac tra|luc tra|tra xanh|bich thuy|hao ky|ngoc trac|xuan nhat|huong phu|bat thu)\b/i, fieldKeywords: ['tra'] },
    { regex: /\b(tivi|tv|qled|oled|smart tv|man hinh tivi)\b/i, fieldKeywords: ['tivi', 'giai tri'] },
    { regex: /\b(tu lanh)\b/i, fieldKeywords: ['gia dung', 'dien lanh', 'dien may'] },
    { regex: /\b(may lanh|dieu hoa|daikin)\b/i, fieldKeywords: ['gia dung', 'dien lanh', 'dien may'] },
    { regex: /\b(may hut am|hut am|edison)\b/i, fieldKeywords: ['gia dung', 'dien may'] },
    { regex: /\b(ban|ghe|ban ghe|giam doc|van phong|ban lam viec|ban hop|ghe xoay|ghe luoi|ghe gaming|sofa|tu ho so|noi that)\b/i, fieldKeywords: ['noi that'] },
    { regex: /\b(dem tien|may dem tien|xiudun|xinda|julong|lidix|hang tin|hangtin|ls-200f|bc-39f|bc-35|2189wv|2196wv)\b/i, fieldKeywords: ['dem tien'] },
    { regex: /\b(laptop|macbook|may tinh|may vi tinh|vivobook|ideapad|omnibook|legion|man hinh pc|man hinh lenovo)\b/i, fieldKeywords: ['laptop', 'cong nghe'] },
    { regex: /\b(may in|muc in|may scan|hop muc|may photocopy|in an)\b/i, fieldKeywords: ['may in', 'muc in', 'may scan', 'in an', 'van phong'] },
    { regex: /\b(ca phe|cafe|espresso|rang moc)\b/i, fieldKeywords: ['ca phe', 'cafe'] },
    { regex: /\b(matcha|bot matcha)\b/i, fieldKeywords: ['matcha'] },
    { regex: /\b(nuoc hoa|my pham|tay te bao chet|cindy bloom|aroma flower)\b/i, fieldKeywords: ['nuoc hoa', 'my pham', 'da chet'] },
    { regex: /\b(cpu|chip|vi xu ly|thinkcentre|may ban|may tinh de ban|may de ban|pc|may tinh ban)\b/i, fieldKeywords: ['cpu', 'thinkcentre'] },
    { regex: /\b(tablet|may tinh bang|ipad)\b/i, fieldKeywords: ['tablet', 'may tinh bang'] },
    { regex: /\b(bo tien|dong chung tu|thiet bi van phong)\b/i, fieldKeywords: ['thiet bi', 'van phong'] },
    { regex: /\b(ket sat|bofa|viet tiep)\b/i, fieldKeywords: ['ket sat'] }
  ];

  for (const dp of domainPatterns) {
    if (dp.regex.test(cleanNorm)) {
      for (const kw of dp.fieldKeywords) {
        const found = fields.find((f) => removeVietnameseTones(f).toLowerCase().includes(kw));
        if (found) return found;
      }
    }
  }

  // 3. Fallback: Check if any product name in DB matches query words with strict word boundary
  for (const p of allProducts) {
    const pNormName = removeVietnameseTones(p.name || '').toLowerCase();
    const coreTarget = extractCoreProductQuery(normMsg) || cleanNorm;
    if (coreTarget && coreTarget.length >= 2 && hasWordMatch(pNormName, coreTarget)) {
      return p.field;
    }
  }

  return null;
}

const GREETING_PHRASES = [
  'xin chao',
  'chao ban',
  'chao robot',
  'chao em',
  'chao shop',
  'chao ad',
  'ad oi',
  'shop oi',
  'xung ho'
];

function isGreetingMessage(normMsg) {
  if (!normMsg) return false;
  const clean = normMsg.trim().toLowerCase();
  const tokens = clean.split(/\s+/);
  if (tokens.some((t) => ['hi', 'alo', 'hello', 'chao', 'helo'].includes(t))) {
    const hasProductIntent = ['gia', 'bao nhieu', 'mua', 'ban', 'san pham', 'may', 'xem', 'tu van'].some((k) => clean.includes(k));
    if (!hasProductIntent) return true;
  }
  return GREETING_PHRASES.some((phrase) => {
    const reg = new RegExp('(^|\\s)' + phrase + '(\\s|$)');
    return reg.test(clean);
  });
}

/**
 * Kiểm tra khách hàng hỏi thăm sức khoẻ ("bạn khoẻ không", "khỏe không", "dạo này thế nào", "sức khoẻ sao rồi"...):
 * Khi khách hỏi thăm sức khoẻ:
 * - Trả lời lịch sự: "Dạ tôi khoẻ, cảm ơn [customerRef]! Còn [customerRef] thì sao ạ? Hôm nay tôi có thể giúp gì cho [customerRef]?"
 * - TUYỆT ĐỐI KHÔNG quảng cáo sản phẩm ngay, không mở Cột 2, không hỏi ngân sách!
 */
function isHealthInquiry(normMsg) {
  if (!normMsg) return false;
  const clean = normMsg.replace(/[?!.,;:()"'`~@#$%^&*+=<>{}[\]/\\|]/g, ' ').toLowerCase().trim();
  const hasHealth = /\b(?:(?:ban\s+)?(?:co\s+)?khoe\s+(?:khong|chua|ko|k|ha|nhi|khong\s+a|nhe)|khoe\s+(?:khong|ko|k|chu|ha)|suc\s+khoe|dao\s+nay\s+(?:the\s+nao|sao\s+roi|on\s+khong|khoe\s+khong)|the\s+nao\s+roi|on\s+khong|co\s+on\s+khong|ban\s+on\s+chu)\b/i.test(clean);
  const hasHardwareOrProductSubject = /\b(?:may|dong\s+co|pin|cau\s+hinh|tivi|tv|laptop|may\s+dem\s+tien|tu\s+lanh|may\s+lanh|ban\s+lam\s+viec|ban\s+giam\s+doc|ban\s+hop|ban\s+ghe)\b/i.test(clean);
  return hasHealth && !hasHardwareOrProductSubject;
}

/**
 * Strict check: Only return/display product cards if the customer has EXPLICITLY asked for products.
 * Prevents products from unexpectedly jumping into chat when customer hasn't asked.
 */
function userExplicitlyWantsProducts({ normMessage, actionType, matchedFromText, matchedField }) {
  if (!normMessage) return false;

  // 1. Explicit UI action button (Đặt mua ngay, Chi tiết, Xem sản phẩm, Báo giá)
  if (actionType && ['Đặt mua ngay', 'Chi tiết', 'Tìm hiểu sản phẩm', 'Xem sản phẩm', 'Báo giá', 'Xem danh mục'].includes(actionType)) {
    return true;
  }

  // 2. Explicit intent phrases asking to view / display products
  const explicitViewPhrases = [
    'cho xem san pham',
    'cho xem',
    'xem san pham',
    'cho toi xem',
    'cho minh xem',
    'cho em xem',
    'cho anh xem',
    'cho chi xem',
    'cho bac xem',
    'cho chu xem',
    'cho co xem',
    'gui san pham',
    'gui hinh',
    'gui anh',
    'gui bao gia',
    'co san pham gi',
    'co nhung san pham nao',
    'co nhung mau nao',
    'co mau nao',
    'co may nao',
    'cac mau san pham',
    'cac dong san pham',
    'danh sach san pham',
    'danh muc san pham',
    'xem danh muc',
    'xem cac mau',
    'xem mau',
    'xem hang',
    'xem may',
    'muon xem',
    'can xem',
    'toi muon xem',
    'cho coi',
    'xem thu',
    'show san pham',
    'trinh bay san pham',
    'bao gia san pham',
    'mo cot 2',
    'mo lai cot 2',
    'hien cot 2',
    'xem chi tiet',
    'xem hinh',
    'xem anh'
  ];
  if (explicitViewPhrases.some((p) => normMessage.includes(p))) {
    return true;
  }
  const explicitViewRegex = /(?:cho\s+(?:anh|chi|em|toi|minh|bac|chu|co)?\s*(?:xem|coi)|xem\s+(?:lai\s+)?san\s+pham|xem\s+chi\s+tiet|mo\s+(?:lai\s+)?cot\s+2|hien\s+cot\s+2|xem\s+hinh|xem\s+anh)\b/;
  if (explicitViewRegex.test(normMessage)) {
    return true;
  }

  // 3. Explicit budget or comparison inquiry
  const hasBudget = Boolean(extractBudget(normMessage));
  const hasCompare =
    normMessage.includes('so sanh') ||
    normMessage.includes('khac nhau') ||
    normMessage.includes('nen chon mau nao') ||
    normMessage.includes('nen mua loai nao');
  if (hasBudget || hasCompare) {
    return true;
  }

  // 4. Specific known product model code mentioned
  const specificCodes = ['2166', '6688', '9999', '39f', 'bc-39f', 'bc39', '0181', '1718', 'bc35', 'bc-35', '2189', '2196', '206', 'jl206', '2900', '3520'];
  if (specificCodes.some((code) => normMessage.includes(code))) {
    return true;
  }

  // 5. Category inquiry with clear intent to view/buy
  if (matchedField && (normMessage.includes('dem tien') || normMessage.includes('bo tien') || normMessage.includes('dong chung tu') || normMessage.includes('hut am') || normMessage.includes('ket sat') || normMessage.includes('may in') || normMessage.includes('laptop'))) {
    const actionWords = ['xem', 'mua', 'can', 'tim', 'tu van', 'mau', 'loai', 'dong', 'gia', 'bao nhieu'];
    if (actionWords.some((w) => normMessage.includes(w))) {
      return true;
    }
  }

  return false;
}

/**
 * Clean raw question wrapper around an inquired product name.
 */
function cleanInquiredProductName(str) {
  if (!str) return 'sản phẩm này';
  let s = str.trim();
  s = s.replace(/^(?:dạ|da)?\s*(?:anh|chị|em|tôi|mình|bạn)\s+(?:đang\s+hỏi\s+về|đang\s+hỏi|đang\s+cần|đang\s+tìm|cần\s+mua|muốn\s+mua|hỏi\s+mua|tìm\s+mua|cần\s+tìm|muốn\s+tìm|tìm|hỏi|cần|muốn|xem|lấy)\s+/i, '');
  s = s.replace(/^(?:anh|chị|em|tôi|mình|bạn)\s+/i, '');
  s = s.replace(/^(?:đang\s+hỏi\s+về|đang\s+hỏi|đang\s+nói\s+về|đang\s+nói)\s+/i, '');
  s = s.replace(/\s+(?:mà|ma|đấy|day|đó|do)[?!.,]*$/i, '');
  const prefixes = [
    'cho toi hoi ben ban co ban', 'cho minh hoi ben ban co ban', 'cho em hoi ben ban co ban',
    'cho hoi ben ban co ban', 'cho hoi ben em co ban', 'cho hoi shop co ban',
    'cho toi hoi co ban', 'cho minh hoi co ban', 'cho em hoi co ban', 'cho hoi co ban',
    'cho toi hoi co', 'cho minh hoi co', 'cho em hoi co', 'cho hoi co', 'cho hoi',
    'ben ban co ban', 'ben em co ban', 'ben shop co ban', 'shop co ban', 'ban co ban',
    'ben ban co', 'ben em co', 'ben shop co', 'shop co', 'ban co', 'co ban', 'co dong', 'co mau', 'co loai', 'co',
    'can mua', 'muon mua', 'hoi mua', 'tim mua', 'can tim', 'muon tim', 'tim giup', 'tim',
    'bao gia', 'gia cua'
  ];
  prefixes.sort((a, b) => b.length - a.length);

  for (const p of prefixes) {
    const normS = removeVietnameseTones(s).toLowerCase();
    if (normS.startsWith(p + ' ')) {
      const pWordCount = p.split(/\s+/).length;
      const words = s.split(/\s+/);
      s = words.slice(pWordCount).join(' ').trim();
      break;
    }
  }

  const suffixes = [
    'co hang khong shop', 'co hang khong', 'co hang ko', 'co hang', 'co khong',
    'khong shop', 'khong ban', 'khong em', 'khong a', 'khong vay', 'khong nua', 'khong',
    'bao nhieu tien', 'bao nhieu', 'gia bao nhieu', 'a', 'nhi', 'vay'
  ];
  suffixes.sort((a, b) => b.length - a.length);

  for (const suf of suffixes) {
    const normClean = removeVietnameseTones(s).toLowerCase().replace(/[?!.,]+$/, '').trim();
    if (normClean.endsWith(' ' + suf)) {
      const sufWordCount = suf.split(/\s+/).length;
      const words = s.replace(/[?!.,]+$/, '').trim().split(/\s+/);
      s = words.slice(0, words.length - sufWordCount).join(' ').trim();
      break;
    }
  }

  s = s.replace(/[?!.,]+$/, '').trim();
  return s.length >= 2 ? s : 'sản phẩm này';
}

/**
 * Định dạng tên sản phẩm còn thiếu chuẩn mực, tự động ghép loại thiết bị dựa vào ngữ cảnh (ví dụ: 65 inch -> Tivi 65 inch)
 */
function formatMissingProductName(rawName, contextField) {
  if (!rawName) return 'sản phẩm này';
  let s = cleanInquiredProductName(rawName).replace(/<[^>]*>?/gm, '').trim();
  s = s
    .replace(/^(?:anh|chị|chi|em|tôi|toi|mình|minh|bạn|ban|shop)?\s*(?:có\s+bán|co\s+ban|bán\s+cho|ban\s+cho|bán|ban|muốn\s+mua|muon\s+mua|cần\s+mua|can\s+mua|hỏi\s+mua|hoi\s+mua|mua|cần|can|muốn|muon|tìm|tim|hỏi\s+về|hoi\s+ve|hỏi|hoi|xem|lấy|lay)\s+/i, '')
    .replace(/\s+(?:có\s+hàng\s+không|co\s+hang\s+khong|có\s+hàng|co\s+hang|thì\s+có\s+không|thi\s+co\s+khong|thì\s+có|thi\s+co|có\s+không|co\s+khong|có\s+chưa|co\s+chua|có\s+bán\s+không|co\s+ban\s+khong|không|khong|có|co|ạ|a|nhé|nhe|hả|ha)\b.*$/i, '')
    .replace(/^(?:thì\s+có|thi\s+co|có|co|hỏi|hoi|lấy|lay)\s+/i, '')
    .replace(/\s+(?:thì\s+có|thi\s+co|có|co|không|khong)$/i, '')
    .trim();

  // Capitalize model codes & brand names
  s = s.replace(/\b(kx[-_\s]?[a-z0-9]+)\b/gi, (m) => m.toUpperCase().replace(/\s+/g, '-'));
  s = s.replace(/\bpanasonic\b/gi, 'Panasonic');
  s = s.replace(/\bsamsung\b/gi, 'Samsung');
  s = s.replace(/\blenovo\b/gi, 'Lenovo');
  s = s.replace(/\bbrother\b/gi, 'Brother');
  s = s.replace(/\bcanon\b/gi, 'Canon');
  const norm = removeVietnameseTones(s).toLowerCase();

  const inchMatch = norm.match(/\b(\d{2,3})\s*inch\b/);
  if (inchMatch) {
    if (!norm.includes('tivi') && !norm.includes('tv') && !norm.includes('man hinh')) {
      if (contextField && removeVietnameseTones(contextField).toLowerCase().includes('tivi')) {
        return `Tivi ${inchMatch[1]} inch`;
      }
      return `dòng ${inchMatch[1]} inch`;
    }
  }

  const litMatch = norm.match(/\b(\d{2,4})\s*lit\b/);
  if (litMatch) {
    if (!norm.includes('tu lanh')) {
      if (contextField && removeVietnameseTones(contextField).toLowerCase().includes('gia dung')) {
        return `Tủ lạnh ${litMatch[1]} lít`;
      }
      return `dòng ${litMatch[1]} lít`;
    }
  }

  const hpMatch = norm.match(/\b(\d+(?:\.\d)?)\s*(?:hp|ngua)\b/);
  if (hpMatch) {
    if (!norm.includes('may lanh') && !norm.includes('dieu hoa')) {
      return `Máy lạnh ${hpMatch[1]} HP`;
    }
  }

  return s;
}

/**
 * Detect if customer is inquiring about a product/item not available in the database.
 */
function detectMissingProductInquiry(message, normMessage, matchedProducts, matchedField, allProducts = [], coreQuery = '', contextField = null) {
  if (!message || typeof message !== 'string') return null;
  // If matched a live product (similarity >= 80%) in DB, it's NOT missing!
  if (matchedProducts && matchedProducts.length > 0) return null;

  // Filter out non-product questions, general queries, budget queries, phone submissions, or comparison questions
  if (
    Boolean(extractPhoneNumber(message)) ||
    /^\+?\d[\d\s.-]{8,}\d$/.test(message.trim()) ||
    isHealthInquiry(normMessage) ||
    isCustomerNameDeclaration(message, normMessage) ||
    detectSecurityViolation(normMessage) ||
    isGreetingMessage(normMessage) ||
    isCatalogOverviewQuery(normMessage) ||
    Boolean(extractBudget(normMessage)) ||
    normMessage.includes('so sanh') ||
    normMessage.includes('khac nhau') ||
    normMessage.includes('mau khac') ||
    normMessage.includes('loai khac') ||
    normMessage.includes('dong khac') ||
    normMessage.includes('xem them') ||
    normMessage.includes('con loai nao') ||
    normMessage.includes('con mau nao') ||
    normMessage.includes('co loai nao khac') ||
    normMessage.includes('co mau nao khac') ||
    normMessage.includes('nao khac') ||
    normMessage.includes('ban ten gi') ||
    normMessage.includes('ban la ai') ||
    normMessage.includes('em la ai') ||
    normMessage.includes('may la ai') ||
    normMessage.includes('la ai') ||
    normMessage.includes('hoi tham') ||
    normMessage.includes('lam duoc gi') ||
    normMessage.includes('giup duoc gi') ||
    normMessage.includes('so dien thoai') ||
    normMessage.includes('chu nhan') ||
    normMessage.includes('cho xin so') ||
    normMessage.includes('o dau') ||
    normMessage.includes('dia chi') ||
    /(?:xoa\s+(?:noi\s+dung\s+)?chat|noi\s+dung\s+chat|dung\s+chat|xoa\s+chat|lam\s+moi|tin\s+nhan|lich\s+su\s+chat|cuoc\s+tro\s+chuyen|clear\s+chat|reset\s+chat)\b/.test(normMessage) ||
    /(?:cho\s+(?:anh|chi|em|toi|minh|bac|chu|co)?\s*(?:xem|coi)|xem\s+(?:lai\s+)?san\s+pham|xem\s+chi\s+tiet|mo\s+(?:lai\s+)?cot\s+2|hien\s+cot\s+2|xem\s+hinh|xem\s+anh)\b/i.test(normMessage) ||
    /(?:khong\s+cho|khong\s+can|thoi\s+khoi|bo\s+qua|cu\s+tu\s+van|khong\s+tien|khong\s+noi|chua\s+tien|khong\s+thich|khoi\s+can)\b/.test(normMessage) ||
    /(?:ten\s+la|ten\s+toi|ten\s+minh|ten\s+em|ten\s+anh|ten\s+chi|toi\s+ten|minh\s+ten|em\s+ten|anh\s+ten|chi\s+ten|toi\s+la|minh\s+la|em\s+la|anh\s+la|chi\s+la)\b/.test(normMessage) ||
    /(?:bi\s+sai|lac\s+de|nham\s+roi|khong\s+dung)\b/.test(normMessage)
  ) {
    return null;
  }

  const clean = normMessage.replace(/[?!.,;:()"'`~@#$%^&*+=<>{}[\]/\\|]/g, ' ').toLowerCase().trim();
  const isChatOrSysWord = (str) => /(?:chat|noi\s+dung|dung\s+chat|tin\s+nhan|lam\s+moi|xoa)/i.test(str);

  // Pattern 1: Inquiring availability ("có bán X không", "có X không", "shop có X không", "bên bạn có X không", "em bán X không")
  const p1 = clean.match(
    /(?:em\s+co\s+ban|em\s+ban|shop\s+co\s+ban|shop\s+ban|ben\s+em\s+co\s+ban|ben\s+em\s+ban|ben\s+shop\s+co\s+ban|ben\s+shop\s+ban|ben\s+ban\s+co\s+ban|ben\s+ban\s+ban|co\s+ban|co\s+mau|co\s+dong|co\s+loai|ban\s+co\s+ban|shop\s+co|ben\s+ban\s+co|ben\s+em\s+co|ben\s+shop\s+co|co)\s+(.+?)(?:\s+thi\s+co\s+khong|\s+co\s+khong|\s+khong|\s+a\s*\?|\s*\?|$)/i
  );
  if (p1 && p1[1]) {
    const candidate = p1[1].trim();
    const normCand = removeVietnameseTones(candidate);
    const ignored = [
      'gi', 'nhung gi', 'san pham gi', 'mat hang gi', 'the', 'khong', 'chut', 'thoi gian',
      'ai o day', 'mau nao khac', 'loai nao khac', 'nao khac', 'loai khac', 'mau khac', 'xem them'
    ];
    if (candidate.length >= 2 && !ignored.includes(normCand) && !isChatOrSysWord(normCand)) {
      return formatMissingProductName(candidate, contextField);
    }
  }

  // Pattern 2: Buying / searching intent ("cần mua X", "muốn mua X", "cần tìm X", "tìm giúp X", "hỏi mua X")
  const p2 = clean.match(
    /(?:can\s+mua|muon\s+mua|hoi\s+mua|tim\s+mua|can\s+tim|muon\s+tim|tim\s+giup|tim)\s+(.+?)(?:\s+thi\s+co\s+khong|\s+co\s+khong|\s+khong|\s+a\s*\?|\s*\?|$)/i
  );
  if (p2 && p2[1]) {
    const candidate = p2[1].trim();
    const normCand = removeVietnameseTones(candidate);
    if (candidate.length >= 2 && !isChatOrSysWord(normCand)) return formatMissingProductName(candidate, contextField);
  }

  // Pattern 3: Asking about / reiterating a spec / model ("anh hỏi 65 inch mà", "đang nói về 65 inch")
  const p3 = clean.match(
    /(?:dang\s+hoi\s+ve|dang\s+hoi|hoi\s+ve|dang\s+noi\s+ve|noi\s+ve)\s+(.+?)(?:\s+thi\s+co\s+khong|\s+co\s+khong|\s+ma|\s+day|\s+do|\s+khong|\s+a\s*\?|\s*\?|$)/i
  );
  if (p3 && p3[1]) {
    const candidate = p3[1].trim();
    const normCand = removeVietnameseTones(candidate);
    if (candidate.length >= 2 && !isChatOrSysWord(normCand)) return formatMissingProductName(candidate, contextField);
  }

  // Pattern 4: Price / quotation inquiry ("giá của X", "báo giá X", "giá X bao nhiêu")
  const p4 = clean.match(
    /(?:gia\s+cua|bao\s+gia)\s+(.+?)(?:\s+khong|\s+bao\s+nhieu|\s+a\s*\?|\s*\?|$)/i
  );
  if (p4 && p4[1]) {
    const candidate = p4[1].trim();
    const normCand = removeVietnameseTones(candidate);
    if (candidate.length >= 2 && !isChatOrSysWord(normCand)) return formatMissingProductName(candidate, contextField);
  }

  // Pattern 5: Direct spec inquiry when no product matched (e.g. "65 inch", "600 lít", "2.5 hp")
  const specMatch = clean.match(/\b(\d{2,3}\s*inch|\d{2,4}\s*lit|\d+(?:\.\d)?\s*hp|\d+(?:\.\d)?\s*ngua)\b/i);
  if (specMatch && specMatch[1]) {
    return formatMissingProductName(specMatch[1], contextField);
  }

  // Pattern 6: Device / product nouns mentioned in query when no DB product matches
  const productDeviceKeywords = [
    'may ', 'dien thoai', 'laptop', 'iphone', 'ipad', 'samsung', 'canon', 'hp', 'epson',
    'brother', 'may in', 'may giat', 'may lanh', 'dieu hoa', 'tu lanh', 'camera', 'ket sat',
    'dong ho', 'tai nghe', 'loa', 'ban phim', 'chuot', 'tivi', 'xe may', 'o to', 'noi com',
    'loc nuoc', 'hut bui', 'quat', 'robot hut bui', 'may chieu', 'tu quan ao',
    'ban ghe', 'ban lam viec', 'ban giam doc', 'ban hop', 'ban van phong', 'ghe'
  ];
  if (productDeviceKeywords.some((k) => clean.includes(k))) {
    return formatMissingProductName(coreQuery || message.trim(), contextField);
  }

  if (coreQuery && typeof coreQuery === 'string' && coreQuery.trim().length >= 2) {
    const normCore = removeVietnameseTones(coreQuery).toLowerCase();
    const ignored = ['gi', 'nhung gi', 'san pham gi', 'mat hang gi', 'the', 'khong', 'chut', 'thoi gian'];
    if (!ignored.includes(normCore)) {
      return formatMissingProductName(coreQuery, contextField);
    }
  }

  return null;
}

function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Extract customer preferred addressing (pronoun + optional name) from natural Vietnamese self-introductions.
 */
function extractCustomerAddressing(rawMsg) {
  if (!rawMsg || typeof rawMsg !== 'string') return null;
  const trimmed = rawMsg.trim();
  const norm = removeVietnameseTones(trimmed).toLowerCase();
  if (!trimmed || norm.includes('tro ly ban hang') || norm.includes('san pham')) return null;
  if (isCatalogOverviewQuery(trimmed)) return null;

  let pronoun = null;
  let name = null;

  // Match pronouns with Unicode awareness: anh, chị, cô, chú, bác, ông, bà, em, bạn
  const pronounReg = /(?:^|\s)(anh|chị|cô|chú|bác|ông|bà|em|bạn)(?:\s|$)/i;
  const matchPronoun = trimmed.match(pronounReg);
  if (matchPronoun) {
    const rawP = matchPronoun[1].toLowerCase();
    // Ignore "em" if starts with "bên em" / "em ơi"
    if (rawP === 'em' && /bên\s+em|shop\s+em|em\s+ơi/i.test(trimmed)) {
      // ignore
    } else if (rawP === 'bạn' && !/(?:tôi|mình|tên|gọi|xưng|cứ\s+gọi).*(?:bạn)/i.test(trimmed)) {
      // Customer is talking TO the bot ("bạn ơi", "bạn kinh doanh gì", "bạn bán gì"), not identifying self as "bạn"
    } else {
      pronoun = rawP;
    }
  }

  // Fallback gender hints ("Tôi là nam", "Mình là nữ")
  if (!pronoun) {
    if (/(?:toi la nam|minh la nam|gioi tinh nam)\b/.test(norm)) pronoun = 'anh';
    else if (/(?:toi la nu|minh la nu|gioi tinh nu)\b/.test(norm)) pronoun = 'chị';
  }

  const hasActionOrProductVerbs = /(?:dang\s+hoi|can\s+mua|muon\s+mua|lay\s+cho|cho\s+anh|cho\s+toi|cho\s+em|xem|mua|ban|gia|hoi|so\s+sanh|tivi|laptop|may|ghe)\b/.test(norm);
  if (!hasActionOrProductVerbs) {
    name = extractCustomerName(trimmed, false);
    if (name && hasBlockedNameTokens(name)) name = null;
  }

  if (!pronoun && !name) return null;
  return { pronoun, name };
}

/**
 * Phân biệt rõ ràng lúc nào khách đang khai báo TÊN ĐỂ XƯNG HÔ vs lúc nào là HÀNG HOÁ.
 * Khi khách xưng tên ("Tôi tên Trí", "Mình tên Nam", "Anh là Tuấn", "Em tên Linh"...):
 * Tuyệt đối coi đây là thông tin xưng hô của khách hàng, không bao giờ đối chiếu hay coi là sản phẩm.
 */
function isCustomerNameDeclaration(rawMsg, normMsg) {
  const text = rawMsg || normMsg;
  if (!text || typeof text !== 'string') return false;
  const clean = removeVietnameseTones(text)
    .replace(/[?!.,;:()"'`~@#$%^&*+=<>{}[\]/\\|]/g, ' ')
    .toLowerCase()
    .trim();

  // Pattern tự giới thiệu bản thân
  const introPatterns = [
    /^(?:toi|minh|em|anh|chi)\s+ten\s+(?:la\s+)?([a-z\s]{2,30})$/,
    /^ten\s+(?:toi|minh|em|anh|chi)\s+(?:la\s+)?([a-z\s]{2,30})$/,
    /^ten\s+(?:la\s+)?([a-z\s]{2,30})$/,
    /^(?:cu\s+)?goi\s+(?:cho\s+)?(?:toi|minh|em|anh|chi)?\s*(?:la\s+)?([a-z\s]{2,30})$/,
    /^(?:xung\s+ho\s+la|xung\s+la)\s+([a-z\s]{2,30})$/,
    /^(?:toi|minh|em|anh|chi)\s+la\s+([a-z\s]{2,30})$/
  ];

  for (const p of introPatterns) {
    const m = clean.match(p);
    if (m) {
      const candidate = m[1].trim();
      const words = candidate.split(/\s+/).filter(Boolean);
      if (words.length >= 1 && words.length <= 3 && !hasBlockedNameTokens(candidate)) {
        return true;
      }
    }
  }

  // Tên được bóc tách từ extractCustomerAddressing
  const addr = extractCustomerAddressing(rawMsg);
  if (addr && addr.name && !hasBlockedNameTokens(addr.name)) {
    const hasIntroKeyword = /(?:ten\s+la|ten\s+toi|ten\s+minh|ten\s+em|ten\s+anh|ten\s+chi|toi\s+ten|minh\s+ten|em\s+ten|anh\s+ten|chi\s+ten|toi\s+la|minh\s+la|em\s+la|anh\s+la|chi\s+la|goi\s+la|xung\s+la)\b/.test(clean);
    const hasProductIntent = /(?:mua|ban|gia|bao\s+nhieu|san\s+pham|tivi|laptop|may|ghe|ban\s+ghe)\b/.test(clean);
    if (hasIntroKeyword && !hasProductIntent) {
      return true;
    }
  }

  return false;
}

export function getCustomerRef(profile) {
  if (!profile) return 'bạn';
  const rawName = (profile.name || '').trim();
  const leadingHonorificMatch = rawName.match(/^(anh|chị|chi|em|bác|bac|chú|chu|cô|co|bạn|ban)(?:\s+|$)/i);
  const leadingHonorific = leadingHonorificMatch ? leadingHonorificMatch[1] : null;
  const cleanName = rawName.replace(/^(anh|chị|chi|em|bác|bac|chú|chu|cô|co|bạn|ban)\s+/i, '').trim();
  const pronoun = (profile.pronoun || leadingHonorific || '').toLowerCase();

  if (pronoun && cleanName) {
    return `${pronoun} ${cleanName}`;
  }
  if (cleanName) {
    return `bạn ${cleanName}`;
  }
  if (pronoun) {
    return pronoun;
  }
  return 'bạn';
}

export function getProductUnit(product) {
  if (!product) return 'sản phẩm';
  const nameNorm = removeVietnameseTones(product.name || '').toLowerCase();
  const fieldNorm = removeVietnameseTones(product.field || '').toLowerCase();
  if (fieldNorm.includes('tra') || nameNorm.includes('tra') || nameNorm.includes('oolong') || nameNorm.includes('matcha')) {
    return 'hộp';
  }
  if (fieldNorm.includes('ca phe') || nameNorm.includes('ca phe') || nameNorm.includes('coffee')) {
    return 'gói';
  }
  if (fieldNorm.includes('nuoc hoa') || fieldNorm.includes('my pham')) {
    return 'chai';
  }
  if (nameNorm.includes('muc in') || nameNorm.includes('hop muc')) {
    return 'hộp';
  }
  if (fieldNorm.includes('laptop') || nameNorm.includes('laptop') || nameNorm.includes('macbook')) {
    return 'máy';
  }
  if (nameNorm.includes('may dem tien') || nameNorm.includes('may in') || nameNorm.includes('may scan') || nameNorm.includes('may huy')) {
    return 'máy';
  }
  return 'cái';
}

/**
 * Safety pass ensuring replies never address customers as generic "anh/chị" by default.
 */
function applyCustomerAddressing(text, profile) {
  if (!text) return text;
  const ref = getCustomerRef(profile);
  const capRef = capitalizeFirst(ref);
  return text
    .replace(/bạn\/anh\/chị/g, '@@BAN_ANH_CHI@@')
    .replace(/Anh\/chị|Anh\/Chị/g, capRef)
    .replace(/anh\/chị/g, ref)
    .replace(/@@BAN_ANH_CHI@@/g, 'bạn/anh/chị');
}

/**
 * Chuẩn hoá tham chiếu đại diện shop: loại bỏ cụm "của Quang Nhựt Trí", thay "chủ nhân" bằng "shop".
 */
function sanitizeOwnerReferences(text, ownerName = 'Quang Nhựt Trí') {
  if (!text) return text;
  return text
    .replace(/(\*\*[^*]+?)\s*của\s*(?:anh\s+|chị\s+|ông\s+|bà\s+)?Quang Nhựt Trí\*\*/gi, '$1**')
    .replace(/—\s*Thư ký AI Toàn năng của\s*(?:anh\s+|chị\s+|ông\s+)?Quang Nhựt Trí\b/gi, '— Thư ký AI Toàn năng')
    .replace(/trợ lý bán hàng (?:thông minh )?của\s*(?:anh\s+|chị\s+|ông\s+)?Quang Nhựt Trí/gi, 'trợ lý bán hàng thông minh')
    .replace(/\s*của\s*(?:anh\s+|chị\s+|ông\s+|bà\s+)?(?:\*\*|\*|__|_)?Quang Nhựt Trí(?:\*\*|\*|__|_)?[\.]?/gi, '')
    .replace(/chủ nhân\s*\([^)]+\)/gi, 'shop')
    .replace(/chủ nhân\s*(?:anh\s+|chị\s+|ông\s+)?(?:\*\*|\*|__|_)?Quang Nhựt Trí(?:\*\*|\*|__|_)?/gi, 'shop')
    .replace(/của chủ nhân/gi, 'của shop')
    .replace(/để chủ nhân/gi, 'để shop')
    .replace(/đến chủ nhân/gi, 'đến shop')
    .replace(/gửi chủ nhân/gi, 'gửi shop')
    .replace(/Chủ nhân sẽ/g, 'Shop sẽ')
    .replace(/chủ nhân sẽ/g, 'shop sẽ')
    .replace(/chủ nhân luôn/gi, 'shop luôn')
    .replace(/chủ nhân trực tiếp/gi, 'shop trực tiếp')
    .replace(/chủ nhân/gi, 'shop');
}

/**
 * Build a clean, persuasive side-by-side comparison using live specs from DB.
 */
function buildProductComparisonReply(productsToCompare, ownerName, customerRef = 'bạn', clientDevice = 'desktop') {
  const capRef = capitalizeFirst(customerRef);
  const isMobile = clientDevice === 'mobile';
  const sorted = [...productsToCompare].sort((a, b) => (a.price || 0) - (b.price || 0));
  const lines = sorted.map((p, idx) => {
    const short = formatShortDesc(p.description, 75);
    return `${idx + 1}. **${p.name}** — **${formatPrice(p)}**${short ? ` (${short})` : ''}`;
  });

  const guideText = `Thông số chi tiết và hình ảnh từng mẫu đã được mở sẵn ở **Cột 2**. ${capRef} đang dự tính mua trong tầm giá khoảng bao nhiêu tiền để tôi tư vấn mẫu tối ưu nhất ạ?`;

  return `Dạ, tôi xin gửi ${customerRef} so sánh nhanh các mẫu đang có:\n\n${lines.join('\n')}\n\n${guideText}`;
}

export class SalesEngine {
  /**
   * Main chat processing pipeline combining live catalog DB, CRM Lead capture, LLM & Smart Rule Brain.
   */
  static async processMessage({ conversationId, convId: altConvId, message, selectedProduct, actionType, customerInfo, clientDevice }) {
    const now = new Date().toISOString();
    let convId = conversationId || altConvId;

    // 1. Load live settings & full approved product catalog from DB (including approved supplier catalog)
    const [settingsList, rawProducts, rawCrawledProducts] = await Promise.all([
      db.all('SELECT key, value FROM bot_settings'),
      db.all('SELECT * FROM products WHERE is_active = 1 AND is_approved = 1 ORDER BY field ASC, price ASC'),
      db.all(`
        SELECT id, name, category as field, brand as group_name, sale_price as price,
               specs_json as specs, description, image_url, sku,
               1 as is_active, 1 as is_approved, price_confirmation_level
        FROM crawled_products 
        WHERE approval_status = 'APPROVED'
        ORDER BY sale_price ASC
      `).catch(() => [])
    ]);

    const allProducts = [...rawProducts, ...rawCrawledProducts];

    const settings = settingsList.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    const botName = settings.bot_name || 'TRÍ AI SALES ROBOT';
    const ownerName = settings.owner_name || 'Quang Nhựt Trí';
    const rawPhonePrompt = settings.phone_invitation_prompt ||
      'Tôi có thể ghi nhận yêu cầu để shop trực tiếp liên hệ với bạn. Bạn vui lòng để lại số điện thoại nhé.';
    const phonePrompt = sanitizeOwnerReferences(rawPhonePrompt, ownerName);
    const tone = settings.ai_tone || 'Chuyên nghiệp & Thân thiện';
    const hotline = settings.hotline || '0982441446';
    const showHotline = settings.show_hotline === '1';

    // 2. Ensure Conversation exists
    let conv = convId ? await db.get('SELECT id FROM conversations WHERE id = ?', [convId]) : null;
    if (!conv) {
      if (!convId) convId = `conv_${randomUUID().slice(0, 8)}`;
      await db.run(
        `INSERT INTO conversations (id, user_id, agent_id, skill_id, title, is_archived, created_at, updated_at)
         VALUES (?, 'usr_customer', 'tri-ai-sales-robot', 'chatbot-sales-ai', ?, 0, ?, ?)`,
        [convId, message ? message.slice(0, 45) : (selectedProduct ? `Quan tâm ${selectedProduct.name}` : 'Cuộc tư vấn bán hàng'), now, now]
      );
    }

    // 3. Save User message
    const userMsgId = `msg_${randomUUID().slice(0, 8)}`;
    await db.run(
      `INSERT INTO messages (id, conversation_id, sender_type, sender_id, content, metadata_json, created_at)
       VALUES (?, ?, 'user', 'customer', ?, ?, ?)`,
      [
        userMsgId,
        convId,
        message || (selectedProduct ? `[${actionType || 'Chọn sản phẩm'}]: ${selectedProduct.name}` : ''),
        JSON.stringify({ selectedProduct, actionType, customerInfo }),
        now
      ]
    );

    // 4. Fetch latest 14 conversation messages (ordered chronologically)
    const recentDesc = await db.all(
      `SELECT sender_type, content, metadata_json FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 14`,
      [convId]
    );
    const history = recentDesc.reverse();

    // Recover any active multi-step purchase flow, customer addressing profile & product/category context from history
    let prevOrderFlow = null;
    let checkedOrderFlow = false;
    let prevCustomerProfile = null;
    let prevActiveProduct = null;
    let prevField = null;

    for (let i = history.length - 1; i >= 0; i--) {
      const hMsg = history[i];
      if (hMsg.metadata_json) {
        try {
          const meta = JSON.parse(hMsg.metadata_json);
          if (!checkedOrderFlow && Object.prototype.hasOwnProperty.call(meta, 'orderFlow')) {
            checkedOrderFlow = true;
            if (meta.orderFlow && meta.orderFlow.active) {
              prevOrderFlow = meta.orderFlow;
            }
          }
          if (!prevCustomerProfile && meta.customerProfile) {
            const rawPrevName = meta.customerProfile.name;
            const validPrevName = rawPrevName && !hasBlockedNameTokens(rawPrevName) && !isProductOrDeviceTerm(rawPrevName) ? rawPrevName : null;
            prevCustomerProfile = {
              ...meta.customerProfile,
              name: validPrevName,
              pendingClarification: meta.customerProfile.pendingClarification || null
            };
          }
          if (!prevActiveProduct && (meta.activeProduct || meta.recommendedProduct)) {
            prevActiveProduct = meta.activeProduct || meta.recommendedProduct;
          }
          if (!prevField) {
            const fCand = meta.activeField || meta.recommendedField || meta.activeProduct?.field || meta.recommendedProduct?.field || null;
            if (fCand && fCand !== 'Tất cả') {
              prevField = fCand;
            }
          }
          if (hMsg.sender_type === 'user' && meta.selectedProduct) {
            if (!prevActiveProduct) prevActiveProduct = meta.selectedProduct;
            if (!prevField && meta.selectedProduct.field && meta.selectedProduct.field !== 'Tất cả') {
              prevField = meta.selectedProduct.field;
            }
          }
        } catch {}
      }

      // Quét thêm nội dung tin nhắn để khôi phục sản phẩm & danh mục đang đàm thoại nếu metadata thiếu
      if (!prevField || !prevActiveProduct) {
        const textContent = hMsg.content || '';
        const normContent = removeVietnameseTones(textContent).toLowerCase();
        for (const p of allProducts) {
          const normPName = removeVietnameseTones(p.name || '').toLowerCase();
          if (normContent.includes(normPName)) {
            if (!prevActiveProduct) prevActiveProduct = p;
            if (!prevField && p.field && p.field !== 'Tất cả') prevField = p.field;
            break;
          }
        }
      }
    }

    // 5. Resolve customer addressing, referenced field, product & quantity
    const normMessage = removeVietnameseTones(message || '');
    const normAction = removeVietnameseTones(actionType || '');
    const parsedAddr = extractCustomerAddressing(message);
    const hasInquiryKeywords = Boolean(
      isCatalogOverviewQuery(normMessage) ||
      isGreetingMessage(normMessage) ||
      /(?:hoi|mua|ban|can|muon|tim|lay|gia|xem|tivi|laptop|may|ghe|tra|dem tien|cho|nhan vien)\b/.test(normMessage)
    );
    const allowBareName = Boolean(
      prevOrderFlow?.step === 'ask_name' &&
      !hasInquiryKeywords &&
      !isProductOrDeviceTerm(normMessage) &&
      !hasBlockedNameTokens(normMessage)
    );
    const detectedName = extractCustomerName(message, allowBareName);
    const prevValidName = prevCustomerProfile?.pendingClarification ? null : prevCustomerProfile?.name;
    const rawResolvedName = parsedAddr?.name || detectedName || customerInfo?.name || prevValidName || null;
    const resolvedName = rawResolvedName && !hasBlockedNameTokens(rawResolvedName) && !isProductOrDeviceTerm(rawResolvedName) ? rawResolvedName : null;
    const resolvedPronoun = parsedAddr?.pronoun || prevCustomerProfile?.pronoun || null;

    const customerProfile = {
      pronoun: resolvedPronoun,
      name: resolvedName,
      askedAddressing: Boolean(prevCustomerProfile?.askedAddressing),
      pendingMissingProduct: prevCustomerProfile?.pendingMissingProduct || null,
      pendingClarification: prevCustomerProfile?.pendingClarification || null
    };

    // If customer just told their name, immediately update any existing lead in this conversation
    if (resolvedName && convId) {
      const fullLeadName = resolvedPronoun ? `${capitalizeFirst(resolvedPronoun)} ${resolvedName}` : resolvedName;
      try {
        await db.run(
          "UPDATE leads SET customer_name = ?, updated_at = ? WHERE conversation_id = ? AND (customer_name LIKE 'Khách%' OR customer_name = 'Quý Khách' OR customer_name = 'Quý khách' OR customer_name = '' OR customer_name IS NULL)",
          [fullLeadName, now, convId]
        );
      } catch (leadUpdateErr) {
        console.error('[CRM UPDATE ERROR]', leadUpdateErr.message);
      }
    }

    const justUpdatedAddressing = Boolean(parsedAddr || detectedName);
    const hasAddressingInfo = Boolean(customerProfile.pronoun || customerProfile.name);
    const customerRef = getCustomerRef(customerProfile);

    const isExplicitViewAsk =
      /(?:cho\s+(?:anh|chi|em|toi|minh|bac|chu|co)?\s*(?:xem|coi)|xem\s+(?:lai\s+)?san\s+pham|xem\s+chi\s+tiet|mo\s+(?:lai\s+)?cot\s+2|hien\s+cot\s+2|xem\s+hinh|xem\s+anh)\b/i.test(message || '') ||
      /(?:cho\s+(?:anh|chi|em|toi|minh|bac|chu|co)?\s*(?:xem|coi)|xem\s+(?:lai\s+)?san\s+pham|xem\s+chi\s+tiet|mo\s+(?:lai\s+)?cot\s+2|hien\s+cot\s+2|xem\s+hinh|xem\s+anh)\b/i.test(normMessage || '');

    const activeHistoryField = (isCatalogOverviewQuery(normMessage) || isGreetingMessage(normMessage))
      ? null
      : (selectedProduct?.field || prevField || prevActiveProduct?.field || null);
    const productMatch = evaluateProductMatch(message, normMessage, allProducts, activeHistoryField);
    const matchedFromText = productMatch.rankedProducts;
    const matchedField = productMatch.matchedField;
    let missingProductQuery = productMatch.missingProductQuery;
    const coreQuery = extractCoreProductQuery(message);
    if (missingProductQuery) {
      customerProfile.pendingMissingProduct = missingProductQuery;
    }

    const isOngoingProductInquiry =
      isExplicitViewAsk ||
      productMatch.isRelativeQuery ||
      (!productMatch.topProduct &&
        !matchedFromText.length &&
        !productMatch.missingProductQuery &&
        !isCatalogOverviewQuery(normMessage) &&
        !isGreetingMessage(normMessage));

    let activeProduct =
      productMatch.topProduct ||
      matchedFromText[0] ||
      selectedProduct ||
      (isOngoingProductInquiry ? (prevActiveProduct || null) : null);
    const explicitQty = extractExplicitQuantity(normMessage);
    const detectedQty = explicitQty ?? 1;

    // Context Category Resolution:
    // When a customer makes a relative query (e.g. "lấy loại rẻ nhất", "loại nào đắt nhất", "dưới 10 triệu", "so sánh", "có mẫu nào khác", etc.)
    // without explicitly naming a new category/product, we strictly stay within the current active category!
    // But when the customer explicitly asks for a new product/field or missing product, NEVER force them into the old category!
    const isOverviewAsk = isCatalogOverviewQuery(normMessage);
    const isGreeting = isGreetingMessage(normMessage);
    const activeSelectedField = selectedProduct?.field || null;
    const conversationContextField = (isOverviewAsk || isGreeting)
      ? null
      : (matchedField || (productMatch.topProduct?.field) || (productMatch.missingProductQuery ? null : (activeSelectedField || prevField || prevActiveProduct?.field || activeProduct?.field || null)));
    const conversationActiveProduct = (isGreeting || productMatch.missingProductQuery)
      ? null
      : (productMatch.topProduct ||
         matchedFromText[0] ||
         (isOngoingProductInquiry ? (selectedProduct || prevActiveProduct || null) : null) ||
         null);

    // 6. Detect Phone, Email, Name & auto-capture Lead into CRM
    const emailMatches = message ? message.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/) : null;
    const extractedPhone = extractPhoneNumber(message) || (customerInfo?.phone ? extractPhoneNumber(customerInfo.phone) : null);
    const extractedEmail = emailMatches ? emailMatches[0] : (customerInfo?.email || null);
    let leadCreated = null;
    let nextOrderFlow = null;
    let orderFlowReply = null;

    // 6A. Guided Step-by-Step Purchase Flow ("khi bấm mua thì hỏi khách hàng cung cấp thông tin từ từ")
    const isOrderIntentMessage =
      normAction.includes('dat mua') ||
      normMessage.includes('dat mua') ||
      normMessage.includes('mua ngay') ||
      normMessage.includes('dat hang') ||
      /(?:lay|mua|ban|giao|ship|chot|len don|dat)\s+(?:cho\s+(?:anh|chi|em|toi|minh|bac|chu|co)\s+)?(?:\d+|mot|hai|ba|bon|nam|sau|bay|tam|chin|muoi)\s*(?:cai|chiec|hop|san pham|goi|lo|thung|chuyen)?\b/i.test(normMessage) ||
      /(?:lay|chot|mua|giao|ship)\s+(?:cho\s+(?:anh|chi|em|toi|minh|bac|chu|co)\s+)?(?:san\s+pham|mau|loai|hop|cai)\s+nay\b/i.test(normMessage) ||
      /(?:giao|ship)\s+(?:ve|den|toi|dia chi)\b/i.test(normMessage);

    const wantsToStartOrder = isOrderIntentMessage;

    const wantsToCancelOrder =
      prevOrderFlow &&
      (['huy don', 'huy dat', 'khong mua nua', 'thoi khong mua', 'dung dat'].some((k) => normMessage.includes(k)) ||
        normMessage === 'huy');

    const switchedToOtherButton =
      prevOrderFlow &&
      Boolean(actionType) &&
      !normAction.includes('dat mua');

    if (wantsToCancelOrder) {
      nextOrderFlow = null;
      orderFlowReply = `Không sao đâu ${customerRef}! Tôi đã hủy thao tác đặt mua hiện tại. ${capitalizeFirst(customerRef)} cứ thoải mái xem thêm sản phẩm hoặc nhắn câu hỏi bất cứ lúc nào để tôi hỗ trợ nhé!`;
    } else if (!switchedToOtherButton && (wantsToStartOrder || prevOrderFlow)) {
      const orderTargetProd =
        matchedFromText[0] ||
        (prevOrderFlow?.productId ? allProducts.find((p) => p.id === prevOrderFlow.productId) : null) ||
        activeProduct ||
        conversationActiveProduct ||
        prevActiveProduct ||
        selectedProduct ||
        allProducts[0];

      const resultFlow = await this.handleOrderFlowStep({
        convId,
        now,
        message,
        normMessage,
        allProducts,
        targetProd: orderTargetProd,
        prevOrderFlow: wantsToStartOrder && !prevOrderFlow ? null : prevOrderFlow,
        wantsToStartOrder,
        explicitQty,
        extractedPhone,
        extractedEmail,
        customerInfo,
        customerProfile,
        customerRef,
        ownerName,
        hotline,
        showHotline
      });

      if (resultFlow) {
        orderFlowReply = resultFlow.reply;
        nextOrderFlow = resultFlow.orderFlow;
        if (resultFlow.leadCreated) leadCreated = resultFlow.leadCreated;
        if (nextOrderFlow?.name && !customerProfile.name) {
          customerProfile.name = nextOrderFlow.name;
        }
      }
    }

    if (!orderFlowReply && extractedPhone) {
      let customerName = null;
      if (customerProfile.name) {
        customerName = customerProfile.pronoun ? `${capitalizeFirst(customerProfile.pronoun)} ${customerProfile.name}` : customerProfile.name;
      } else if (customerProfile.pronoun) {
        customerName = `${capitalizeFirst(customerProfile.pronoun)} (${extractedPhone})`;
      } else {
        customerName = `Khách ${extractedPhone}`;
      }

      const existingLead = await db.get(
        'SELECT id FROM leads WHERE conversation_id = ? AND phone = ?',
        [convId, extractedPhone]
      );

      if (!existingLead) {
        const leadId = `lead_${randomUUID().slice(0, 8)}`;
        const pendingMissing = customerProfile.pendingMissingProduct;
        const reqDetail = pendingMissing
          ? `Khách hỏi sản phẩm ngoài danh mục: "${pendingMissing}". Cần kiểm tra nguồn hàng và phản hồi lại.`
          : (actionType || (activeProduct ? `Quan tâm ${activeProduct.name}` : 'Yêu cầu tư vấn trực tiếp'));
        const prodId = activeProduct?.id || null;
        const prodName = pendingMissing
          ? `Tìm nguồn hàng: ${pendingMissing}`
          : (activeProduct?.name || 'Sản phẩm tổng quan');

        await db.run(
          `INSERT INTO leads (
            id, customer_name, phone, email, product_id, product_name, quantity, customer_requirement,
            conversation_id, website_source, widget_id, consent_to_contact, created_time, lead_status, notes, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'TRÍ AI Humanoid Widget', 'WIDGET_HUMANOID_V1', 1, ?, 'NEW – WAITING FOR OWNER CONTACT', ?, ?)`,
          [
            leadId,
            customerName,
            extractedPhone,
            extractedEmail,
            prodId,
            prodName,
            detectedQty,
            reqDetail,
            convId,
            now,
            `Khách để lại SĐT trong chat: "${message}". Sản phẩm: ${prodName} (SL: ${detectedQty}).`,
            now
          ]
        );

        leadCreated = {
          id: leadId,
          name: customerName,
          phone: extractedPhone,
          product: prodName,
          quantity: detectedQty,
          status: 'NEW – WAITING FOR OWNER CONTACT'
        };
        console.log(`[CRM INTEGRATION] New Lead created: ${leadId} (${customerName} - ${extractedPhone})`);
      }
    }

    // 7. Generate Smart Response (Guided Order Flow -> Google Gemini LLM / OpenAI -> Smart Catalog AI Brain)
    let replyText = orderFlowReply || '';

    // Handle Reset Chat query / confirmation
    const isResetChatQuery = actionType === 'REQUEST_RESET_CHAT' ||
      /(?:xoa\s+(?:noi\s+dung\s+)?chat|noi\s+dung\s+chat|dung\s+chat|xoa\s+(?:het\s+)?tin\s+nhan|lam\s+moi\s+(?:chat|cuoc\s+tro\s+chuyen|cuoc\s+hoi\s+thoai|noi\s+dung\s+chat)|xoa\s+cuoc\s+(?:tro\s+chuyen|hoi\s+thoai)|xoa\s+lich\s+su\s+chat|xoa\s+chat|xoa\s+bot\s+chat|xoa\s+cuoc\s+chat|clear\s+chat|reset\s+chat|^lam\s+moi$|^xoa\s+bot$)\b/i.test(normMessage);

    const isConfirmResetQuery = actionType === 'CONFIRM_RESET_CHAT' ||
      /(?:xac\s+nhan\s+lam\s+moi|xac\s+nhan\s+xoa\s+chat|dong\s+y\s+lam\s+moi|dong\s+y\s+xoa)\b/i.test(normMessage);

    if (!replyText && isConfirmResetQuery) {
      replyText = `Dạ, hệ thống đang làm mới cuộc trò chuyện cho bạn ngay bây giờ ạ!`;
    } else if (!replyText && isResetChatQuery) {
      replyText = `Dạ, bạn có muốn làm mới cuộc trò chuyện để bắt đầu lại từ đầu không ạ?\n\nBạn có thể nhấn vào nút **"Xác nhận Làm mới"** bên dưới hoặc chọn nút **"Làm mới"** ở góc trên màn hình để xóa nội dung chat nhé!`;
    }

    // Handle customer phone submission immediately
    if (!replyText && (extractedPhone || leadCreated)) {
      const pending = customerProfile.pendingMissingProduct;
      if (pending) {
        replyText = `Dạ cảm ơn ${customerRef}! Em đã ghi nhận số điện thoại **${extractedPhone}** để nhân viên bên em liên hệ lại hỗ trợ kiểm tra nguồn hàng **${pending}** và báo giá sớm nhất nhé ạ!`;
        customerProfile.pendingMissingProduct = null;
      } else {
        const targetName = activeProduct?.name || conversationActiveProduct?.name || 'sản phẩm';
        replyText = `Dạ cảm ơn ${customerRef}! Em đã ghi nhận số điện thoại **${extractedPhone}** để nhân viên bên em liên hệ tư vấn chi tiết về **${targetName}** cho ${customerRef} sớm nhất nhé ạ!`;
      }
    }

    const isHealth = isHealthInquiry(normMessage);
    const isName = isCustomerNameDeclaration(message, normMessage);
    const isMissing = Boolean(missingProductQuery) && !extractedPhone;

    // 1. Xử lý phản hồi cho câu hỏi làm rõ trước đó: "[X] là sản phẩm bạn đang tìm kiếm hay là tên của mình?"
    if (prevCustomerProfile?.pendingClarification?.type === 'NAME_OR_PRODUCT' && !replyText) {
      const clarifyingTerm = prevCustomerProfile.pendingClarification.term;
      const isConfirmProduct =
        actionType === 'confirm_product' ||
        /(?:san\s+pham|la\s+san\s+pham|san\s+pham\s+can\s+tim|san\s+pham\s+tim\s+kiem|tim\s+kiem|tim\s+sp|mua|can\s+mua|tim\s+mua|muon\s+mua|tim|do\s+la\s+san\s+pham|san\s+pham\s+nha|san\s+pham\s+do|san\s+pham\s+a|san\s+pham\s+ban\s+oi|hang|mat\s+hang|dung\s+roi,\s*san\s+pham)\b/i.test(normMessage) ||
        normMessage.trim() === 'san pham' ||
        normMessage.trim() === 'sp';

      const isConfirmName =
        actionType === 'confirm_name' ||
        /(?:la\s+ten|day\s+la\s+ten|ten\s+cua\s+toi|ten\s+toi|ten\s+anh|ten\s+chi|ten\s+em|ten\s+minh|ten\s+tui|la\s+ten\s+minh|chinh\s+la\s+ten|ten\s+nha|ten\s+a|ten\s+do|xung\s+ten)\b/i.test(normMessage) ||
        normMessage.trim() === 'ten' ||
        isCustomerNameDeclaration(message, normMessage);

      if (isConfirmProduct) {
        customerProfile.name = null;
        customerProfile.pendingClarification = null;
        customerProfile.pendingMissingProduct = clarifyingTerm;

        // Check if clarifyingTerm exists in allProducts (full or partial match)
        const normTerm = removeVietnameseTones(clarifyingTerm).toLowerCase();
        const matchedInStore = allProducts.find((p) => {
          const normP = removeVietnameseTones(p.name || '').toLowerCase();
          return normP.includes(normTerm) || normTerm.includes(normP) || hasWordMatch(normP, normTerm);
        });

        if (matchedInStore) {
          activeProduct = matchedInStore;
          productMatch.topProduct = matchedInStore;
          productMatch.tier = 1;
          productMatch.similarity = 95;
          missingProductQuery = null;
          replyText = `Dạ em đã ghi nhận bạn đang tìm kiếm sản phẩm **${matchedInStore.name}** (${formatPrice(matchedInStore)}) ạ!\n\nThông tin chi tiết và hình ảnh thực tế đã được mở sẵn ở **Cột 2**, bạn có thể bấm xem chi tiết hoặc nhắn tôi tư vấn sâu hơn nhé!`;
        } else {
          replyText = `Dạ em đã ghi nhận bạn đang tìm kiếm sản phẩm **${clarifyingTerm}** ạ.\n\nHiện tại mẫu này chưa có sẵn trong danh mục của shop. Bạn vui lòng để lại **Số điện thoại** để nhân viên bên em liên hệ lại hỗ trợ kiểm tra nguồn hàng kho và báo giá sớm nhất nhé ạ.\n\nĐồng thời, toàn bộ danh mục sản phẩm hiện có của shop đã được mở sẵn ở **Cột 2**, bạn có thể tham khảo trực tiếp các mẫu khác ở Cột 2 nhé.`;
        }
      } else if (isConfirmName) {
        customerProfile.pendingClarification = null;
        let identifiedName = extractCustomerName(message, false);
        if (!identifiedName) {
          identifiedName = clarifyingTerm;
        }
        if (identifiedName && !hasBlockedNameTokens(identifiedName)) {
          customerProfile.name = identifiedName;
        }
        const updatedRef = getCustomerRef(customerProfile);
        replyText = `Dạ rất hân hạnh được phục vụ **${updatedRef}** ạ! Tôi đã ghi nhận tên để tiện xưng hô rồi nhé.\n\nHôm nay **${updatedRef}** đang quan tâm đến sản phẩm thuộc lĩnh vực nào hoặc cần tìm mẫu nào, tôi sẽ mở bộ sản phẩm ở **Cột 2** tư vấn ngay cho mình nhé ạ!`;
      } else {
        // Khách chuyển sang câu hỏi khác hoặc sản phẩm khác -> xóa trạng thái làm rõ và xử lý tiếp bình thường
        customerProfile.pendingClarification = null;
        customerProfile.name = null;
      }
    }

    // 2. Kiểm tra lần đầu khi vào chat: khách nhắn 1 đến 3 từ mà chưa rõ là tên hay sản phẩm
    const rawCleanWords = (message || '').trim().replace(/[?!.,;:()"'`~@#$%^&*+=<>{}[\]/\\|]/g, ' ').split(/\s+/).filter(Boolean);
    const isOneToThreeWords = rawCleanWords.length >= 1 && rawCleanWords.length <= 3;
    const hasQuestionKeywords = /(?:bao\s+nhieu|nhieu\s+tien|may\s+tien|gia\s+ca|gia\s+bao|o\s+dau|co\s+khong|co\s+ban|tinh\s+nang|thong\s+so|chuc\s+nang|cau\s+hinh|bao\s+hanh|chinh\s+sach|the\s+nao|nhu\s+the\s+nao|sao\s+the|la\s+gi|ban\s+gi|kinh\s+doanh\s+gi|co\s+nhung|cho\s+(?:anh|toi|em|minh)?\s*xem|xem\s+san\s+pham|mua|dat\s+hang|tu\s+van)\b/i.test(normMessage);
    const userMsgCount = history.filter((h) => h.sender_type === 'user').length;
    const isFirstCustomerTurn = userMsgCount <= 1 || (userMsgCount <= 2 && history.some(h => h.sender_type === 'user' && isGreetingMessage(removeVietnameseTones(h.content))));

    // Khi khách xuất phát lần đầu và chỉ nhắn 1 đến 3 từ ngắn (ví dụ: 'nguyên', 'nam', 'tủ lạnh', 'trà', 'bột matcha'):
    // TUYỆT ĐỐI KHÔNG tự ý suy diễn là sản phẩm hay tên của khách, mà BẮT BUỘC phải hỏi lại để khách xác nhận rõ ràng
    const isFirstTurnAmbiguous1To3Words =
      isFirstCustomerTurn &&
      isOneToThreeWords &&
      !isHealth &&
      !isGreeting &&
      !isName &&
      !hasQuestionKeywords &&
      !isResetChatQuery;

    if (!replyText && isFirstTurnAmbiguous1To3Words) {
      const candidateTerm = rawCleanWords.join(' ');
      const displayTerm = candidateTerm
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');

      replyText = `Dạ xin chào bạn! 👋 Để tôi có thể phục vụ bạn chu đáo và chuẩn xác nhất, cho tôi xin phép hỏi lại một chút nhé ạ:

Từ **"${displayTerm}"** bên trên là **tên của bạn/anh/chị** để tiện xưng hô, hay là **tên sản phẩm** bạn đang cần tìm kiếm ạ?

• Nếu là **tên của bạn**: Bạn xác nhận để tôi xin phép được xưng hô đúng tên mình nhé!
• Nếu là **sản phẩm cần tìm**: Bạn cho tôi biết để tôi kiểm tra nguồn hàng kho và mở bộ sản phẩm ở Cột 2 tư vấn ngay cho bạn ạ!`;

      customerProfile.name = null;
      missingProductQuery = null;
      productMatch.topProduct = null;
      productMatch.relatedProduct = null;
      productMatch.rankedProducts = [];
      productMatch.tier = 3;
      productMatch.similarity = 0;
      customerProfile.pendingClarification = {
        term: displayTerm,
        type: 'NAME_OR_PRODUCT'
      };
    }

    // 3. Xử lý các tình huống có quy tắc chuẩn xác từ khách hàng (hỏi thăm sức khoẻ, chào hỏi, xưng tên, hỏi hàng chưa có)
    if (!replyText) {
      if (isHealth) {
        const friendRef = (!customerRef || customerRef === 'Quý khách' || customerRef === 'quý khách') ? 'bạn' : customerRef;
        replyText = `Dạ tôi khoẻ, cảm ơn ${friendRef}! Còn ${friendRef} thì sao ạ? Hôm nay tôi có thể giúp gì cho ${friendRef}?`;
      } else if (isName) {
        replyText = `Dạ cảm ơn **${customerRef}** rất nhiều! Tôi đã ghi nhận và xin phép gọi **${customerRef}** ạ.\n\nHôm nay **${customerRef}** đang cần tìm sản phẩm hoặc giải pháp gì để tôi hỗ trợ nhé?`;
      } else if (isGreeting) {
        if (!hasAddressingInfo) {
          replyText = `Dạ xin chào bạn! Cảm ơn bạn đã ghé thăm shop ạ. Tôi là **TRÍ AI SALES ROBOT** — trợ lý bán hàng thông minh.\n\nXin lỗi, bạn vui lòng cho tôi biết tên hoặc cách xưng hô để tôi tiện phục vụ nhé!\n\nHôm nay bạn đang quan tâm sản phẩm gì? Bạn cần tôi giúp gì? Bạn có thể hỏi tôi hoặc tham khảo cột dự liệu bên cạnh. Do tôi là Trợ lý ảo nên Bạn viết câu từ rõ ràng giúp, tôi mới hiểu ý bạn`;
        } else {
          replyText = `Dạ xin chào **${customerRef}**! Cảm ơn **${customerRef}** rất nhiều đã ghé thăm và liên hệ shop ạ. Tôi là **TRÍ AI SALES ROBOT** — trợ lý bán hàng thông minh. Hôm nay **${customerRef}** đang cần tìm sản phẩm hoặc giải pháp gì ạ?`;
        }
      } else if (isMissing) {
        const capRef = capitalizeFirst(customerRef);
        const topSimilar = productMatch?.topProduct || productMatch?.relatedProduct || (productMatch?.rankedProducts && productMatch.rankedProducts[0]) || null;
        let step3Alternative = '';
        if (topSimilar) {
          step3Alternative = `Đồng thời, hiện tại bên em đang có sản phẩm tương tự / liên quan có thể phù hợp với nhu cầu của mình là **${topSimilar.name}** (Giá niêm yết: **${formatPrice(topSimilar)}**). Thông tin chi tiết và hình ảnh đã được mở sẵn ở **Cột 2**, ${customerRef} có thể tham khảo thêm nhé ạ!`;
        } else {
          const activeScopeField = conversationContextField || matchedField || null;
          const sameCategoryProducts = activeScopeField && activeScopeField !== 'Tất cả'
            ? allProducts.filter((p) => p.field === activeScopeField)
            : [];
          if (sameCategoryProducts.length > 0) {
            const uniqueNames = [...new Set(sameCategoryProducts.map((p) => p.name))].slice(0, 2);
            const sampleProds = uniqueNames.map((n) => `**${n}**`).join(', ');
            step3Alternative = `Đồng thời, các mẫu sản phẩm thuộc danh mục **${activeScopeField}** hiện có của shop (như ${sampleProds}) đã được mở sẵn ở **Cột 2**, ${customerRef} có thể tham khảo trực tiếp các mẫu khác ở Cột 2 nhé.`;
          } else {
            step3Alternative = `Đồng thời, toàn bộ danh mục sản phẩm hiện có của shop đã được mở sẵn ở **Cột 2**, ${customerRef} có thể tham khảo thêm các mẫu đang có sẵn tại shop ạ.`;
          }
        }

        // Kiểm tra xem khách có hỏi về giá cả hoặc tính năng cụ thể không
        const cleanNormMsg = normMessage.replace(/[?!.,;:()"'`~@#$%^&*+=<>{}[\]/\\|]/g, ' ').toLowerCase().trim();
        const hasPriceOrFeature = /(?:gia|gia ca|bao nhieu|nhieu tien|may tien|tinh nang|thong so|chuc nang|cong dung|cau hinh|xem gia|bang gia|bao gia)\b/i.test(normMessage);
        const cleanWords = cleanNormMsg.split(/\s+/).filter(Boolean);
        const isBareOrInitialMissingQuery = !hasPriceOrFeature && (cleanWords.length <= 4 || !hasInquiryKeywords);

        if (isBareOrInitialMissingQuery) {
          replyText = `Dạ hiện tại bên em chưa tìm thấy sản phẩm **${missingProductQuery}** trong hệ thống của shop ạ.\n\nCho em xin phép hỏi lại một chút để tiện phục vụ: **'${missingProductQuery}'** là sản phẩm bạn/anh/chị đang tìm kiếm hay là tên của mình để em tiện xưng hô ạ?\n\n- Nếu là sản phẩm bạn đang cần tìm: Bạn có thể để lại **Số điện thoại** để shop kiểm tra nguồn hàng kho và báo giá sớm nhất, hoặc tham khảo các danh mục sản phẩm hiện có ở **Cột 2** nhé ạ.\n- Nếu bạn muốn xưng hô tên khác: Bạn cứ nhắn tên để em tiện phục vụ chu đáo nhất nhé ạ!`;
          customerProfile.name = null;
          customerProfile.pendingClarification = {
            term: missingProductQuery,
            type: 'NAME_OR_PRODUCT'
          };
        } else {
          replyText = `Dạ hiện tại sản phẩm **${missingProductQuery}** chưa tìm thấy trong dữ liệu của shop ạ.\n\n${capRef} vui lòng để lại **Số điện thoại** để nhân viên bên em liên hệ lại hỗ trợ kiểm tra nguồn hàng kho và báo giá sớm nhất nhé ạ.\n\n${step3Alternative}`;
        }
      }
    }

    const geminiKey = settings.gemini_api_key || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const hasGeminiKey = Boolean(geminiKey && !geminiKey.includes('your_') && geminiKey.trim().length > 8);

    const openAiKey = settings.openai_api_key || process.env.OPENAI_API_KEY;
    const hasOpenAiKey = Boolean(openAiKey && !openAiKey.includes('your_') && openAiKey.trim().length > 12);

    const provider = settings.llm_provider || 'gemini';
    const canUseLlm = (hasGeminiKey || hasOpenAiKey) && !detectSecurityViolation(normMessage) && !isHealth && !isName && !isGreeting && !isMissing && !isResetChatQuery && !isConfirmResetQuery;

    if (!replyText && canUseLlm) {
      try {
        const catalogSummary = allProducts
          .map(
            (p) =>
              `- [${p.field}] **${p.name}**: Giá phê duyệt ${formatPrice(p)}. Mô tả: ${p.description}. Thông số: ${p.specs_json || 'N/A'}`
          )
          .join('\n');

        const isMobile = clientDevice === 'mobile';
        const customerBudget = extractBudget(normMessage);
        const cleanNormMsg = normMessage.replace(/[?!.,;:()"'`~@#$%^&*+=<>{}[\]/\\|]/g, ' ').toLowerCase();
        const isProductInquiry =
          cleanNormMsg.includes('may') ||
          cleanNormMsg.includes('gia') ||
          cleanNormMsg.includes('co ban') ||
          cleanNormMsg.includes('co khong') ||
          cleanNormMsg.includes('iphone') ||
          cleanNormMsg.includes('samsung') ||
          cleanNormMsg.includes('tu lanh') ||
          cleanNormMsg.includes('may giat') ||
          cleanNormMsg.includes('dieu hoa') ||
          cleanNormMsg.includes('tivi') ||
          cleanNormMsg.includes('laptop') ||
          cleanNormMsg.includes('brother') ||
          cleanNormMsg.includes('toshiba');

        let dynamicMatchDirective = '';
        if (isCatalogOverviewQuery(normMessage)) {
          const fields = [...new Set(allProducts.map((p) => p.field).filter(Boolean))];
          dynamicMatchDirective = `
CHỈ THỊ ƯU TIÊN CAO NHẤT CHO TIN NHẮN NÀY - HỎI BẠN KINH DOANH GÌ / BÁN CÁI GÌ / CÓ SẢN PHẨM GÌ:
- Khách đang hỏi chung về các mặt hàng / lĩnh vực kinh doanh của shop ("${message}").
- BẮT BUỘC THEO ĐÚNG CHỈ THỊ:
  1. CHỈ NÊU DANH MỤC TỔNG (các lĩnh vực sản phẩm: ${fields.join(', ')}).
  2. TUYỆT ĐỐI KHÔNG NÊU TÊN TỪNG SẢN PHẨM CỤ THỂ, KHÔNG BÁO GIÁ SẢN PHẨM NÀO TRONG CHAT!
  3. Thông báo rõ toàn bộ danh mục và các mẫu sản phẩm đã được mở sẵn ở Cột 2, mời khách tự xem sản phẩm ở Cột 2.
  4. Hỏi khách đang quan tâm đến lĩnh vực nào hoặc có mức ngân sách khoảng bao nhiêu tiền để tư vấn chuẩn nhất.
`;
        } else if (productMatch.tier === 1 && productMatch.topProduct) {
          const top = productMatch.topProduct;
          dynamicMatchDirective = `
CHỈ THỊ ƯU TIÊN CAO NHẤT CHO TIN NHẮN NÀY - TÌNH HUỐNG 1 (Độ khớp ${productMatch.similarity}% >= 90%):
- Khách đang hỏi đúng sản phẩm: "${top.name}".
- Báo giá niêm yết chính xác: ${formatPrice(top)}.
- BẮT BUỘC KỊCH BẢN BÁN HÀNG DỰA TRÊN CHÍNH TÊN SẢN PHẨM "${top.name}":
  1. Kịch bản tư vấn BẮT BUỘC phải dựa trên chính TÊN SẢN PHẨM "${top.name}", nêu bật tính năng, ưu điểm vượt trội và thông số kỹ thuật thực tế của chính sản phẩm này từ mô tả (${top.description}) và thông số (${top.specs_json || 'N/A'}).
  2. TUYỆT ĐỐI KHÔNG tư vấn chung chung theo NHÓM SẢN PHẨM hay gọi tên nhóm sản phẩm!
  3. Báo giá niêm yết chính xác: ${formatPrice(top)}.
  4. Hướng dẫn khách xem chi tiết và ảnh chụp thực tế của chính sản phẩm ở Cột 2 (hệ thống đã tự động mở sẵn Cột 2).
  5. ${customerBudget ? 'Khách ĐÃ NÊU ngân sách, KHÔNG hỏi lại số tiền!' : 'BẮT BUỘC hỏi số tiền khách dự tính mua: "Bạn đang dự tính mua trong tầm giá khoảng bao nhiêu tiền để tôi tư vấn cấu hình và ưu đãi phù hợp nhất nhé?"'}
`;
        } else if (productMatch.tier === 2 && productMatch.topProduct) {
          const top = productMatch.topProduct;
          const missingName = productMatch.missingProductQuery || (coreQuery ? formatMissingProductName(coreQuery, conversationContextField) : null);
          dynamicMatchDirective = `
CHỈ THỊ ƯU TIÊN CAO NHẤT CHO TIN NHẮN NÀY - TÌNH HUỐNG 2 (Độ khớp ${productMatch.similarity}% từ 80% đến dưới 90%):
- Khách đang hỏi sản phẩm: "${missingName || 'sản phẩm khách hỏi'}" (sản phẩm này hiện CHƯA TÌM THẤY trong dữ liệu của shop).
- Sản phẩm tương tự / liên quan có sẵn trong kho: "${top.name}" (Giá niêm yết: ${formatPrice(top)}).
- BẮT BUỘC TRẢ LỜI THEO ĐÚNG 3 BƯỚC TUẦN TỰ (TUYỆT ĐỐI KHÔNG ĐẢO THỨ TỰ):
  1. BƯỚC 1 - NÓI RÕ SẢN PHẨM NÀY CHƯA TÌM THẤY TRONG DỮ LIỆU CỦA SHOP:
     "Dạ, hiện tại sản phẩm **${missingName || 'mẫu bạn đang hỏi'}** chưa tìm thấy trong dữ liệu của shop ạ."
  2. BƯỚC 2 - XIN SỐ ĐIỆN THOẠI ĐỂ NHÂN VIÊN GỌI LẠI HỖ TRỢ / KIỂM TRA KHO:
     "Bạn vui lòng để lại **Số điện thoại** để nhân viên bên em liên hệ lại hỗ trợ kiểm tra nguồn hàng kho và báo giá sớm nhất nhé ạ."
  3. BƯỚC 3 - ĐỒNG THỜI MỚI GIỚI THIỆU QUA SẢN PHẨM TƯƠNG TỰ HAY LIÊN QUAN:
     "Đồng thời, hiện tại bên em đang có sản phẩm tương tự / liên quan có thể phù hợp với nhu cầu của mình là **${top.name}** (Giá niêm yết: **${formatPrice(top)}**). Thông tin chi tiết và hình ảnh đã được mở sẵn ở **Cột 2**, bạn có thể tham khảo thêm nhé ạ!"
  4. TUYỆT ĐỐI KHÔNG nhận là có hàng ${missingName || 'sản phẩm khách hỏi'}, KHÔNG tự bịa giá hay thông số của sản phẩm không có!
`;
        } else if (productMatch.tier === 3 && (productMatch.missingProductQuery || isProductInquiry)) {
          const missingName = productMatch.missingProductQuery || (coreQuery ? formatMissingProductName(coreQuery, conversationContextField) : 'mẫu sản phẩm này');
          const topSimilar = productMatch.topProduct || productMatch.relatedProduct || (productMatch.rankedProducts && productMatch.rankedProducts[0]) || null;
          dynamicMatchDirective = `
CHỈ THỊ ƯU TIÊN CAO NHẤT CHO TIN NHẮN NÀY - TÌNH HUỐNG SẢN PHẨM KHÔNG CÓ TRONG DANH MỤC:
- Khách đang hỏi sản phẩm: "${missingName}".
- BẮT BUỘC TRẢ LỜI THEO ĐÚNG 3 BƯỚC TUẦN TỰ (TUYỆT ĐỐI KHÔNG ĐẢO THỨ TỰ):
  1. BƯỚC 1 - NÓI RÕ SẢN PHẨM NÀY CHƯA TÌM THẤY TRONG DỮ LIỆU CỦA SHOP:
     "Dạ, hiện tại sản phẩm **${missingName}** chưa tìm thấy trong dữ liệu của shop ạ."
  2. BƯỚC 2 - XIN SỐ ĐIỆN THOẠI ĐỂ NHÂN VIÊN GỌI LẠI HỖ TRỢ / KIỂM TRA KHO:
     "Bạn vui lòng để lại **Số điện thoại** để nhân viên bên em liên hệ lại hỗ trợ kiểm tra nguồn hàng kho và báo giá sớm nhất nhé ạ."
  3. BƯỚC 3 - ĐỒNG THỜI MỚI GIỚI THIỆU QUA SẢN PHẨM TƯƠNG TỰ/LIÊN QUAN HOẶC MỜI XEM CỘT 2:
     ${topSimilar ? `"Đồng thời, hiện tại bên em đang có sản phẩm tương tự / liên quan có thể bạn quan tâm là **${topSimilar.name}** (Giá niêm yết: **${formatPrice(topSimilar)}**). Thông tin chi tiết và hình ảnh đã được mở sẵn ở **Cột 2**, bạn có thể tham khảo thêm nhé ạ!"` : `"Đồng thời, toàn bộ danh mục sản phẩm hiện có của shop đã được mở sẵn ở **Cột 2**, bạn có thể tham khảo thêm các mẫu đang có sẵn tại shop ạ."`}
  4. TUYỆT ĐỐI KHÔNG tự nhận là có hàng, KHÔNG tự bịa ra sản phẩm, và TUYỆT ĐỐI KHÔNG nhắc đến các sản phẩm cũ không liên quan!
`;
        }

        if (productMatch.isRelativeQuery && conversationContextField && !isCatalogOverviewQuery(normMessage)) {
          dynamicMatchDirective += `
CHỈ THỊ ĐẶC BIỆT - DUY TRÌ ĐÚNG DANH MỤC HIỆN TẠI ("${conversationContextField}"):
- Khách đang hỏi câu hỏi tiếp theo/tương đối (về giá, loại rẻ nhất/đắt nhất, so sánh, hoặc tư vấn thêm trong danh mục "${conversationContextField}"): "${message}".
- BẮT BUỘC chỉ tư vấn các sản phẩm thuộc danh mục "${conversationContextField}".
`;
        }

        const systemPrompt = `
Bạn là ${botName}, trợ lý bán hàng thông minh.
BẠN ĐƯỢC TRANG BỊ TRÍ TUỆ NHÂN TẠO GOOGLE GEMINI THÔNG MINH, NHIỆM VỤ TƯ VẤN BÁN HÀNG VÀ CHỐT KHÁCH THEO ĐÚNG CÁC TÌNH HUỐNG SAU:

${dynamicMatchDirective}

QUY TẮC SỐ 1 - LUÔN LUÔN PHÂN TÍCH CHỦ ĐỀ ĐỂ TRẢ LỜI ĐÚNG TRỌNG TÂM (TUYỆT ĐỐI KHÔNG LẠC ĐỀ):
1. BẮT BUỘC PHÂN TÍCH KỸ CHỦ ĐỀ VÀ NGỮ CẢNH CỦA KHÁCH TRƯỚC KHI TRẢ LỜI:
   - Xác định chính xác chủ đề/danh mục mà khách đang đề cập: Tivi & Thiết bị giải trí, Nội thất văn phòng, Máy đếm tiền, Laptop & Công nghệ, Gia dụng, Trà cao cấp...
   - Nếu là câu hỏi tiếp nối ngữ cảnh đang trò chuyện (như "lấy loại rẻ nhất", "loại nào rẻ nhất", "mẫu đắt nhất", "dưới 10 triệu", "so sánh", "có mẫu nào khác không"):
     -> BẮT BUỘC giữ nguyên 100% danh mục hiện tại đó${conversationContextField ? ` (${conversationContextField})` : ''}.
     -> TUYỆT ĐỐI KHÔNG nhảy sang sản phẩm thuộc danh mục khác (như đang hỏi Tivi thì KHÔNG ĐƯỢC giới thiệu Trà hay Bàn ghế)!
   - Nếu khách chủ động đổi sang sản phẩm hoặc lĩnh vực mới: chuyển sang chủ đề mới một cách nhạy bén và mở đúng danh mục mới.
2. TRẢ LỜI ĐÚNG TRỌNG TÂM - NGẮN GỌN - LOGIC:
   - Đi thẳng vào nhu cầu cốt lõi của khách, câu từ mạch lạc từ 2 - 4 câu, súc tích dễ hiểu, không dài dòng giải thích thừa thãi.

QUY TẮC XỬ LÝ CÁC TÌNH HUỐNG SẢN PHẨM:
0. TÌNH HUỐNG HỎI TỔNG QUAN - BẠN KINH DOANH GÌ / BÁN CÁI GÌ / CÓ SẢN PHẨM GÌ:
   - CHỈ NÊU DANH MỤC TỔNG (các lĩnh vực kinh doanh trong hệ thống).
   - TUYỆT ĐỐI KHÔNG NÊU TÊN TỪNG SẢN PHẨM CỤ THỂ, KHÔNG NÊU GIÁ TIỀN TRONG CHAT!
   - Thông báo rõ hệ thống đã mở toàn bộ danh mục ở Cột 2, mời khách hàng tự xem sản phẩm ở Cột 2.
   - Hỏi khách đang quan tâm đến lĩnh vực nào hoặc số tiền dự tính mua để tư vấn phù hợp nhất.

QUY TẮC CỐT LÕI - KỊCH BẢN BÁN HÀNG PHẢI DỰA TRÊN CHÍNH TÊN SẢN PHẨM (TUYỆT ĐỐI KHÔNG DỰA TRÊN NHÓM SẢN PHẨM):
- Khi khách hàng hỏi bất kỳ sản phẩm nào, kịch bản tư vấn bán hàng BẮT BUỘC phải dựa trên CHÍNH TÊN SẢN PHẨM CỤ THỂ mà khách hỏi (product.name), phân tích tính năng, thông số kỹ thuật thực tế và giá bán chính thức của chính sản phẩm đó.
- TUYỆT ĐỐI KHÔNG tư vấn chung chung theo NHÓM SẢN PHẨM (product.group_name) hay lĩnh vực (product.field). Khách hỏi đích danh sản phẩm nào thì kịch bản chốt bán hàng phải xoay quanh 100% đúng TÊN SẢN PHẨM đó!

1. TÌNH HUỐNG 1 - SẢN PHẨM GIỐNG TỪ 90% TRỞ LÊN (Khách hỏi đúng sản phẩm hoặc khớp cao với danh mục):
   - Kịch bản tư vấn dựa trên chính TÊN SẢN PHẨM, nêu điểm nổi bật chính, thông số và BÁO GIÁ NIÊM YẾT CHÍNH XÁC.
   - Hướng dẫn khách xem thông số và hình ảnh thực tế ở Cột 2 (hệ thống đã tự động mở sẵn Cột 2).
   - LUÔN LUÔN HỎI SỐ TIỀN KHÁCH DỰ TÍNH MUA nếu khách chưa nói ngân sách (ví dụ: "Bạn đang dự tính mua trong tầm giá khoảng bao nhiêu tiền để tôi tư vấn cấu hình và ưu đãi phù hợp nhất nhé?"). Nếu khách đã nói ngân sách thì không hỏi lại.

2. TÌNH HUỐNG 2 - SẢN PHẨM GIỐNG TỪ 80% ĐẾN DƯỚI 90% (Khách hỏi mẫu/dòng chưa có trong dữ liệu, có sản phẩm tương tự trong kho):
   - BẮT BUỘC THEO ĐÚNG 3 BƯỚC TUẦN TỰ (TUYỆT ĐỐI KHÔNG ĐẢO THỨ TỰ):
     + Bước 1: Nói rõ sản phẩm khách hỏi chưa tìm thấy trong dữ liệu của shop.
     + Bước 2: Xin số điện thoại để nhân viên gọi lại hỗ trợ kiểm tra nguồn hàng kho và báo giá sớm nhất.
     + Bước 3: Đồng thời mới giới thiệu qua sản phẩm tương tự/liên quan có sẵn trong kho kèm giá niêm yết và hướng dẫn xem chi tiết ở Cột 2.

3. TÌNH HUỐNG 3 - TRƯỜNG HỢP SẢN PHẨM KHÔNG CÓ TRONG DỮ LIỆU CỦA SHOP:
   - BẮT BUỘC THEO ĐÚNG 3 BƯỚC TUẦN TỰ (TUYỆT ĐỐI KHÔNG ĐẢO THỨ TỰ):
     + Bước 1: Nói rõ sản phẩm khách hỏi chưa tìm thấy trong dữ liệu của shop.
     + Bước 2: Xin số điện thoại để nhân viên gọi lại hỗ trợ kiểm tra nguồn hàng kho và báo giá sớm nhất.
     + Bước 3: Đồng thời mới giới thiệu qua sản phẩm tương tự/liên quan (nếu có) hoặc hướng dẫn tham khảo toàn bộ danh mục sản phẩm hiện có đã được mở sẵn ở Cột 2.
   - TUYỆT ĐỐI KHÔNG tự nhận là có hàng khi không có, KHÔNG tự bịa ra sản phẩm!

YÊU CẦU PHONG CÁCH BẮT BUỘC:
- LOGIC, NGẮN GỌN, DỄ HIỂU, KHÔNG DÀI DÒNG: Mỗi câu trả lời từ 2 đến 4 câu, đi thẳng vào trọng tâm, mạch lạc, dễ đọc.
- QUY TẮC XƯNG HÔ:
  + Ban đầu hỏi tên để tiện xưng hô: nếu khách không cho tên hoặc bỏ qua thì CỨ XƯNG HÔ LÀ "bạn".
  + ${
    hasAddressingInfo
      ? `Khách đã cung cấp cách xưng hô: Hãy xưng hô với khách là "${customerRef}".`
      : `Xưng "tôi" và gọi khách là "bạn". TUYỆT ĐỐI KHÔNG tự gọi khách là "anh/chị" khi chưa biết và KHÔNG hỏi lại tên làm phiền khách!`
  }
  + TUYỆT ĐỐI KHÔNG ĐƯỢC LẤY TÊN SẢN PHẨM/THIẾT BỊ LÀM TÊN KHÁCH:
    Ví dụ khách nhắn "tủ lạnh", "Kangaroo", "máy giặt", "dung chat", "ti vi"... TUYỆT ĐỐI KHÔNG được gọi khách là "Bạn Tủ Lạnh", "Bạn Kangaroo", "Bạn Kangaru" hay "Bạn Dung Chat"! Nếu chưa biết tên khách thì luôn gọi là "bạn".
- LUÔN HỎI SỐ TIỀN MUA: Trong mọi tình huống tư vấn sản phẩm, nếu chưa biết ngân sách của khách thì luôn hỏi số tiền dự tính mua để tư vấn đúng tầm giá.

QUY TẮC BẮT BUỘC KHÁC:
1. Chỉ dùng giá và thông số có thật trong DANH MỤC ĐƯỢC PHÊ DUYỆT bên dưới. Tuyệt đối KHÔNG tự bịa giá.
2. QUY TẮC BẢO HÀNH & CHÍNH HÃNG THEO NGÀNH HÀNG:
   - Với ĐỒ ĂN, THỨC UỐNG, TRÀ, CÀ PHÊ, THỰC PHẨM (Consumables):
     + KHÔNG CÓ BẢO HÀNH (thực phẩm, đồ ăn thức uống không có chế độ bảo hành kỹ thuật/điện tử như máy móc).
     + Tuyệt đối KHÔNG gán bảo hành 12 hay 24 tháng cho đồ ăn, thức uống!
     + Cam kết: 100% chính hãng, hạn sử dụng (HSD) mới nhất theo lô sản xuất, bao bì nguyên vẹn chuẩn vệ sinh an toàn thực phẩm. Hỗ trợ đổi mới 1 đổi 1 trong 7 ngày nếu lỗi đóng gói, rách hỏng do vận chuyển hoặc lỗi từ nhà sản xuất.
   - Với MÁY MÓC, THIẾT BỊ ĐIỆN TỬ, PHẦN CỨNG:
     + Bảo hành chính hãng từ 12 đến 36 tháng theo đúng thông số kỹ thuật của nhà sản xuất.
3. Khi khách hỏi SĐT: trả lời đúng tinh thần "${phonePrompt}".
4. Khi khách muốn mua/báo giá: hỗ trợ ghi nhận từng bước (số lượng -> tên -> SĐT -> ghi chú).
5. Nếu khách vừa gửi SĐT (${extractedPhone || 'không'}): cảm ơn và xác nhận đã ghi nhận để shop liên hệ sớm nhất.
${showHotline ? `Hotline: ${hotline}` : ''}

DANH MỤC SẢN PHẨM ĐƯỢC QUẢN TRỊ PHÊ DUYỆT:
${catalogSummary}

${activeProduct ? `SẢN PHẨM KHÁCH ĐANG QUAN TÂM/CHỌN HIỆN TẠI: ${activeProduct.name} (${formatPrice(activeProduct)}) | Hành động: ${actionType || 'Chat tự do'}` : ''}
`;

        const llmMessages = [
          { role: 'system', content: systemPrompt },
          ...history.map((h) => ({
            role: h.sender_type === 'user' ? 'user' : 'assistant',
            content: h.content
          }))
        ];

        // 1. Try Google Gemini if preferred/available
        const preferGemini = (provider === 'gemini' || provider === 'auto') && hasGeminiKey;
        if (preferGemini) {
          try {
            replyText = await callGemini(llmMessages, {
              apiKey: geminiKey,
              model: settings.gemini_model || 'gemini-1.5-flash',
              temperature: 0.35
            });
          } catch (geminiErr) {
            console.error('[GEMINI CHAT ERROR] Trying fallback LLM:', geminiErr.message);
          }
        }

        // 2. Try OpenAI if Gemini didn't produce reply and OpenAI is available
        if (!replyText && hasOpenAiKey) {
          try {
            replyText = await callOpenAI(llmMessages, {
              apiKey: openAiKey,
              baseUrl: settings.openai_base_url,
              model: settings.openai_model
            });
          } catch (openAiErr) {
            console.error('[OPENAI CHAT ERROR] Trying fallback to local AI:', openAiErr.message);
          }
        }

        // 3. Try Gemini as fallback if provider was openai but openai failed
        if (!replyText && hasGeminiKey && !preferGemini) {
          try {
            replyText = await callGemini(llmMessages, {
              apiKey: geminiKey,
              model: settings.gemini_model || 'gemini-1.5-flash',
              temperature: 0.35
            });
          } catch (e) {}
        }
      } catch (err) {
        console.error('[LLM ERROR] Falling back to Smart Local AI Engine:', err.message);
      }
    }

    // Handle customer health inquiry politely without premature product ads
    if (isHealthInquiry(normMessage)) {
      const friendRef = (!customerRef || customerRef === 'Quý khách' || customerRef === 'quý khách') ? 'bạn' : customerRef;
      replyText = `Dạ tôi khoẻ, cảm ơn ${friendRef}! Còn ${friendRef} thì sao ạ? Hôm nay tôi có thể giúp gì cho ${friendRef}?`;
    }

    // Handle pure customer addressing introduction ("Tôi là anh Nam", "Gọi tôi là chị Lan", "Tôi tên Trí")
    const isNameDecl = isCustomerNameDeclaration(message, normMessage);
    const isBudgetAsk = Boolean(extractBudget(normMessage));
    const isCompareAsk = normMessage.includes('so sanh') || normMessage.includes('khac nhau');
    const isProductInquiry = !isNameDecl && Boolean(
      normMessage.includes('can mua') ||
      normMessage.includes('muon mua') ||
      normMessage.includes('tim mua') ||
      normMessage.includes('hoi mua') ||
      normMessage.includes('bao gia') ||
      normMessage.includes('gia bao nhieu') ||
      /(?:co\s+ban|ban\s+cho|ban\s+hang|mua\s+ban)\b/.test(normMessage) ||
      /\b(?:ban\s+ghe|ban\s+lam\s+viec|ghe|tivi|laptop|may|tra)\b/.test(normMessage) ||
      (productMatch && (productMatch.topProduct || productMatch.missingProductQuery)) ||
      matchedField
    );

    if (
      !replyText &&
      (justUpdatedAddressing || isNameDecl) &&
      !isProductInquiry &&
      !isExplicitViewAsk &&
      !missingProductQuery &&
      !matchedField &&
      matchedFromText.length === 0 &&
      !isBudgetAsk &&
      !isCompareAsk &&
      !isOverviewAsk &&
      !extractedPhone &&
      !actionType
    ) {
      replyText = `Dạ cảm ơn **${customerRef}** rất nhiều! Tôi đã ghi nhận và xin phép gọi **${customerRef}** ạ.\n\nHiện **${customerRef}** đang cần tìm sản phẩm thuộc lĩnh vực nào để tôi tư vấn ngay ạ?`;
    }

    // Inquiring product not available in database (Tier 2 similar or Tier 3 missing)
    if (!replyText && !extractedPhone && missingProductQuery) {
      const capRef = capitalizeFirst(customerRef);
      const topSimilar = productMatch?.topProduct || productMatch?.relatedProduct || (productMatch?.rankedProducts && productMatch.rankedProducts[0]) || null;
      let step3Alternative = '';
      if (topSimilar) {
        step3Alternative = `Đồng thời, hiện tại bên em đang có sản phẩm tương tự / liên quan có thể phù hợp với nhu cầu của mình là **${topSimilar.name}** (Giá niêm yết: **${formatPrice(topSimilar)}**). Thông tin chi tiết và hình ảnh đã được mở sẵn ở **Cột 2**, ${customerRef} có thể tham khảo thêm nhé ạ!`;
      } else {
        const activeScopeField = conversationContextField || matchedField || activeHistoryField || null;
        const sameCategoryProducts = activeScopeField && activeScopeField !== 'Tất cả'
          ? allProducts.filter((p) => p.field === activeScopeField)
          : [];
        if (sameCategoryProducts.length > 0) {
          const uniqueNames = [...new Set(sameCategoryProducts.map((p) => p.name))].slice(0, 2);
          const sampleProds = uniqueNames.map((n) => `**${n}**`).join(', ');
          step3Alternative = `Đồng thời, các mẫu sản phẩm thuộc danh mục **${activeScopeField}** hiện có của shop (như ${sampleProds}) đã được mở sẵn ở **Cột 2**, ${customerRef} có thể tham khảo trực tiếp các mẫu khác ở Cột 2 nhé.`;
        } else {
          step3Alternative = `Đồng thời, toàn bộ danh mục sản phẩm hiện có của shop đã được mở sẵn ở **Cột 2**, ${customerRef} có thể tham khảo thêm các mẫu đang có sẵn tại shop ạ.`;
        }
      }
      replyText = `Dạ hiện tại sản phẩm **${missingProductQuery}** chưa tìm thấy trong dữ liệu của shop ạ.\n\n${capRef} vui lòng để lại **Số điện thoại** để nhân viên bên em liên hệ lại hỗ trợ kiểm tra nguồn hàng kho và báo giá sớm nhất nhé ạ.\n\n${step3Alternative}`;
    }

    if (!replyText) {
      replyText = this.generateSmartLocalReply({
        message,
        normMessage,
        allProducts,
        productMatch,
        matchedFromText,
        matchedField,
        conversationContextField,
        conversationActiveProduct,
        selectedProduct,
        activeProduct,
        actionType,
        detectedQty,
        extractedPhone,
        leadCreated,
      leadCaptured: Boolean(leadCreated),
        history,
        ownerName,
        phonePrompt,
        hotline,
        showHotline,
        customerRef: getCustomerRef(customerProfile),
        hasAddressingInfo,
        shouldAskAddressing: false,
        pendingMissingProduct: customerProfile.pendingMissingProduct,
        clientDevice
      });
    }

    // Clear pending missing product once phone is captured and confirmed
    if (extractedPhone && customerProfile.pendingMissingProduct) {
      customerProfile.pendingMissingProduct = null;
    }

    if (!hasAddressingInfo) {
      customerProfile.askedAddressing = true;
    }

    replyText = applyCustomerAddressing(replyText, customerProfile);
    replyText = sanitizeOwnerReferences(replyText, ownerName);

    const isMobile = clientDevice === 'mobile';

    const isMissingProduct = Boolean(missingProductQuery);

    const isNonProductIntent =
      isHealthInquiry(normMessage) ||
      detectSecurityViolation(normMessage) ||
      normMessage.includes('so dien thoai') ||
      normMessage.includes('chu nhan') ||
      normMessage.includes('cho xin so') ||
      normMessage.includes('ten gi') ||
      normMessage.includes('ban la ai') ||
      normMessage.includes('hoi tham') ||
      normMessage.includes('lam duoc gi') ||
      normMessage.includes('giup duoc gi') ||
      isGreetingMessage(normMessage) ||
      Boolean(isFirstTurnAmbiguous1To3Words) ||
      Boolean(customerProfile.pendingClarification?.type === 'NAME_OR_PRODUCT');

    const asksGeneralCatalog = isCatalogOverviewQuery(normMessage);
    const hasBudgetQuery = Boolean(extractBudget(normMessage));
    const hasCompareQuery = normMessage.includes('so sanh') || normMessage.includes('khac nhau');
    const isAskOtherModels =
      normMessage.includes('mau khac') ||
      normMessage.includes('loai khac') ||
      normMessage.includes('dong khac') ||
      normMessage.includes('xem them') ||
      normMessage.includes('con loai nao') ||
      normMessage.includes('con mau nao') ||
      normMessage.includes('co loai nao khac') ||
      normMessage.includes('co mau nao khac');

    const wantsProducts =
      !isNonProductIntent &&
      userExplicitlyWantsProducts({
        normMessage,
        actionType,
        matchedFromText,
        matchedField
      });

    const isPendingClarification = Boolean(customerProfile.pendingClarification || prevCustomerProfile?.pendingClarification);

    // Automatically reveal Column 2 whenever chat mentions or requests related products,
    // HOẶC khi khách hỏi sản phẩm chưa có (để khách tham khảo các mẫu khác cùng loại ở Cột 2)
    const mentionsRelatedProduct =
      !isPendingClarification &&
      (isMissingProduct ||
      isExplicitViewAsk ||
      (!isNonProductIntent &&
        (productMatch.tier === 1 ||
          productMatch.tier === 2 ||
          (productMatch.tier === 3 && (wantsProducts || Boolean(matchedField) || asksGeneralCatalog || hasBudgetQuery || hasCompareQuery || isAskOtherModels || Boolean(actionType))))));

    const isMissingOrCollectingPhone = Boolean(missingProductQuery) && !extractedPhone;
    if (isMissingOrCollectingPhone) {
      customerProfile.pendingMissingProduct = missingProductQuery;
    }

    const isEnteringOrderFlowOrCRM = Boolean(
      (nextOrderFlow && nextOrderFlow.active) ||
      (prevOrderFlow && prevOrderFlow.active) ||
      leadCreated ||
      isMissingOrCollectingPhone ||
      wantsToStartOrder
    );

    const revealCatalog = (isEnteringOrderFlowOrCRM && !isExplicitViewAsk)
      ? false
      : Boolean(mentionsRelatedProduct);

    // Resolve category and products to display in Column 2 (strictly honoring active conversation domain)
    const activeScopeField = matchedField || (productMatch.topProduct?.field) || conversationContextField || activeHistoryField || (conversationActiveProduct?.field) || (activeProduct?.field) || (selectedProduct?.field) || null;

    const targetProductForRecommendation =
      productMatch.topProduct ||
      matchedFromText[0] ||
      (isExplicitViewAsk ? (activeProduct || prevActiveProduct || selectedProduct) : null) ||
      (productMatch.isRelativeQuery ? (selectedProduct || prevActiveProduct) : null) ||
      activeProduct ||
      null;

    const recommendedProduct = mentionsRelatedProduct && !isMissingProduct
      ? targetProductForRecommendation
      : null;

    const recommendedField = mentionsRelatedProduct
      ? (isMissingProduct
          ? (matchedField || 'Tất cả')
          : (recommendedProduct?.field || matchedField || activeScopeField || 'Tất cả'))
      : null;

    // Collect products when related products are mentioned/requested
    let returnProducts = [];
    if (mentionsRelatedProduct) {
      if (recommendedProduct) {
        const sameFieldOthers = allProducts.filter(
          (p) => p.field === recommendedProduct.field && p.id !== recommendedProduct.id
        );
        returnProducts = [recommendedProduct, ...sameFieldOthers.slice(0, 5)];
      } else if (isMissingProduct && activeScopeField && activeScopeField !== 'Tất cả') {
        returnProducts = allProducts.filter((p) => p.field === activeScopeField).slice(0, 6);
      } else if (isMissingProduct) {
        returnProducts = allProducts.slice(0, 6);
      } else if (productMatch.rankedProducts && productMatch.rankedProducts.length > 0) {
        returnProducts = productMatch.rankedProducts.slice(0, 4);
      } else if (matchedFromText.length > 0) {
        returnProducts = matchedFromText.slice(0, 4);
      } else if (hasBudgetQuery) {
        const budget = extractBudget(normMessage);
        let pool = allProducts.filter((p) => p.field !== 'Dịch vụ bảo trì' || normMessage.includes('bao tri'));
        if (activeScopeField && activeScopeField !== 'Tất cả') {
          const scoped = pool.filter(
            (p) =>
              p.field === activeScopeField ||
              removeVietnameseTones(p.field).includes(removeVietnameseTones(activeScopeField))
          );
          if (scoped.length > 0) pool = scoped;
        } else if (normMessage.includes('dem tien') || normMessage.includes('xiudun')) {
          pool = pool.filter((p) => p.field === 'Máy đếm tiền');
        } else {
          // Chưa xác định được danh mục đang hỏi ngân sách -> không tự ý gom toàn bộ sản phẩm khác loại (như lấy Trà)
          pool = [];
        }
        if (budget?.max !== undefined) {
          const under = pool.filter((p) => (p.price || 0) <= budget.max && (p.price || 0) > 0);
          returnProducts = (under.length > 0 ? under : pool).slice(0, 4);
        } else if (budget?.sort === 'asc') {
          const sorted = [...pool].sort((a, b) => (a.price || 0) - (b.price || 0));
          returnProducts = sorted.slice(0, 4);
        } else if (budget?.sort === 'desc') {
          const sorted = [...pool].sort((a, b) => (b.price || 0) - (a.price || 0));
          returnProducts = sorted.slice(0, 4);
        } else {
          returnProducts = pool.slice(0, 4);
        }
      } else if (hasCompareQuery) {
        const compareField = activeScopeField && activeScopeField !== 'Tất cả' ? activeScopeField : 'Máy đếm tiền';
        returnProducts = allProducts.filter((p) => p.field === compareField).slice(0, 4);
      } else if (isAskOtherModels && activeScopeField && activeScopeField !== 'Tất cả') {
        returnProducts = allProducts.filter((p) => p.field === activeScopeField).slice(0, 6);
      } else if (activeScopeField && activeScopeField !== 'Tất cả') {
        returnProducts = allProducts.filter((p) => p.field === activeScopeField).slice(0, 6);
      } else if (actionType && activeProduct) {
        returnProducts = [activeProduct];
      } else if (asksGeneralCatalog) {
        returnProducts = allProducts.slice(0, 6);
      } else if (recommendedProduct) {
        returnProducts = [recommendedProduct];
      }

      // Deduplicate returnProducts by name so duplicate DB items do not repeat in Column 2
      const seenNames = new Set();
      returnProducts = returnProducts.filter((p) => {
        if (!p || !p.name) return false;
        if (seenNames.has(p.name)) return false;
        seenNames.add(p.name);
        return true;
      });
    }

    // 8. Save Assistant reply with complete context metadata for subsequent turns
    const targetSavedProduct = activeProduct || productMatch.topProduct || matchedFromText[0] || conversationActiveProduct || selectedProduct || null;
    const targetSavedField = recommendedField || activeScopeField || targetSavedProduct?.field || null;

    // Calculate user message count in this conversation
    const totalUserTurns = userMsgCount || (history.filter((h) => h.sender_type === 'user').length + 1);
    const hasCapturedPhone = Boolean(
      extractedPhone ||
      customerProfile?.phone ||
      prevCustomerProfile?.phone ||
      leadCreated ||
      (history.some((h) => {
        try {
          const meta = JSON.parse(h.metadata_json || '{}');
          return Boolean(meta.leadCreated || meta.leadCaptured);
        } catch {
          return false;
        }
      }))
    );
    const isOrderActive = Boolean(nextOrderFlow?.active || prevOrderFlow?.active);

    // Proactive hint when customer chats back and forth (>= 4 user turns) without providing phone for CRM lead
    if (totalUserTurns >= 4 && !hasCapturedPhone && !isOrderActive && !isResetChatQuery && !isConfirmResetQuery) {
      const resetTip = `\n\n💡 **Gợi ý:** Nếu bạn muốn xóa bớt nội dung chat cho gọn gàng, bạn có thể chọn nút **"Làm mới"** ở phía trên nhé. Hoặc bạn có thể nhắn cụm từ **"Xóa nội dung chat"**, hệ thống sẽ hiện nút xác nhận làm mới cho bạn ngay ạ!`;
      if (!replyText.includes('Làm mới') && !replyText.includes('Xóa nội dung chat')) {
        replyText += resetTip;
      }
    }

    const effectiveActionType = isConfirmResetQuery
      ? 'RESET_CHAT_NOW'
      : (isResetChatQuery ? 'CONFIRM_RESET_CHAT' : actionType);

    const isResetPrompt = Boolean(isResetChatQuery || isConfirmResetQuery);

    let finalSuggestedActions = [];
    if (isResetChatQuery) {
      finalSuggestedActions = [
        { id: 'confirm_reset_chat', label: '🔄 Xác nhận Làm mới', action: 'reset_chat' },
        { id: 'cancel_reset_chat', label: 'Tiếp tục trò chuyện', action: 'cancel_reset' }
      ];
    } else if (customerProfile.pendingClarification?.type === 'NAME_OR_PRODUCT') {
      const clarifyTerm = customerProfile.pendingClarification.term;
      finalSuggestedActions = [
        { id: 'confirm_name', label: `👤 "${clarifyTerm}" là tên của tôi`, action: 'confirm_name' },
        { id: 'confirm_product', label: `🔍 "${clarifyTerm}" là sản phẩm cần tìm`, action: 'confirm_product' }
      ];
    } else if (isMissingOrCollectingPhone) {
      finalSuggestedActions = [
        { id: 'leave_phone', label: 'Để lại số điện thoại' },
        { id: 'view_catalog', label: 'Xem sản phẩm Cột 2' }
      ];
    }

    if (totalUserTurns >= 4 && !hasCapturedPhone && !isOrderActive && !isResetChatQuery && !isConfirmResetQuery) {
      if (!finalSuggestedActions.some((a) => a.id === 'request_reset_chat')) {
        finalSuggestedActions.push({
          id: 'request_reset_chat',
          label: '🧹 Xóa nội dung chat',
          action: 'request_reset_chat'
        });
      }
    }

    const assistantMsgId = `msg_${randomUUID().slice(0, 8)}`;
    const assistantNow = new Date().toISOString();
    await db.run(
      `INSERT INTO messages (id, conversation_id, sender_type, sender_id, content, metadata_json, created_at)
       VALUES (?, ?, 'assistant', 'tri-ai-sales-robot', ?, ?, ?)`,
      [
        assistantMsgId,
        convId,
        replyText,
        JSON.stringify({
          leadCreated,
          leadCaptured: Boolean(leadCreated),
          activeProduct: targetSavedProduct,
          recommendedProduct: recommendedProduct || targetSavedProduct || null,
          activeField: targetSavedField,
          recommendedField,
          actionType: effectiveActionType,
          isResetPrompt,
          suggestedActions: finalSuggestedActions,
          orderFlow: nextOrderFlow,
          customerProfile
        }),
        assistantNow
      ]
    );

    await db.run('UPDATE conversations SET updated_at = ?, last_message_at = ? WHERE id = ?', [assistantNow, assistantNow, convId]);

    const enrichedProducts = returnProducts.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      field: p.field,
      group_name: p.group_name,
      price: p.price,
      price_formatted: formatPrice(p),
      image_url: p.image_url,
      description: p.description,
      short_description: formatShortDesc(p.description, 80),
      specs: parseSpecs(p)
    }));

    return {
      success: true,
      conversationId: convId,
      messageId: assistantMsgId,
      reply: replyText,
      leadCreated,
      leadCaptured: Boolean(leadCreated),
      orderFlow: nextOrderFlow,
      revealCatalog: Boolean(revealCatalog),
      recommendedField,
      recommendedProduct: recommendedProduct || productMatch?.topProduct || productMatch?.relatedProduct || null,
      products: enrichedProducts,
      botState: leadCreated ? 'success' : 'speaking',
      stage: isMissingOrCollectingPhone ? 'COLLECTING_PHONE' : (leadCreated ? 'LEAD_CAPTURED' : 'IDLE'),
      actionType: effectiveActionType,
      isResetPrompt,
      requiresInput: isMissingOrCollectingPhone ? 'PHONE' : null,
      suggestedActions: finalSuggestedActions
    };
  }

  /**
   * Handle guided multi-step order flow so customers provide quantity -> name -> phone -> optional note one step at a time.
   */
  static async handleOrderFlowStep({
    convId,
    now,
    message,
    normMessage,
    targetProd,
    prevOrderFlow,
    wantsToStartOrder,
    explicitQty,
    extractedPhone,
    extractedEmail,
    customerInfo,
    customerProfile,
    customerRef = 'bạn',
    ownerName,
    hotline,
    showHotline
  }) {
    const capRef = capitalizeFirst(customerRef);
    const isSideInquiry =
      prevOrderFlow &&
      !wantsToStartOrder &&
      prevOrderFlow.step !== 'ask_note' &&
      !extractedPhone &&
      explicitQty === null &&
      (['bao nhieu', 'duoi ', 'tren ', 'so sanh', 'bao hanh', 'ban gi', 'danh muc', 'san pham nao', 'con hang', 'ton kho', 'api key', 'system prompt', 'so dien thoai chu'].some((k) =>
        normMessage.includes(k)
      ) ||
        detectSecurityViolation(normMessage));
    if (isSideInquiry) {
      return null;
    }

    const flow = prevOrderFlow
      ? { ...prevOrderFlow }
      : {
          active: true,
          step: 'ask_quantity',
          productId: targetProd?.id || null,
          productName: targetProd?.name || 'Sản phẩm tư vấn',
          unitPrice: targetProd?.price || 0,
          unitPriceFormatted: formatPrice(targetProd),
          quantity: null,
          name: null,
          phone: null,
          note: null,
          leadId: null
        };

    // If customer clicked "Đặt mua ngay" on a different product mid-flow, switch to that product
    if (wantsToStartOrder && prevOrderFlow && targetProd && targetProd.id !== prevOrderFlow.productId) {
      flow.productId = targetProd.id;
      flow.productName = targetProd.name;
      flow.unitPrice = targetProd.price || 0;
      flow.unitPriceFormatted = formatPrice(targetProd);
      flow.quantity = null;
      flow.step = 'ask_quantity';
      flow.leadId = null;
    }

    // Step 4: Customer replying with delivery note / address / feedback after phone was saved
    if (flow.step === 'ask_note') {
      const isSwitchProduct = wantsToStartOrder && targetProd && targetProd.id !== flow.productId;
      if (!isSwitchProduct) {
        const isSkip = ['xong', 'khong', 'khong co', 'ko', 'ok', 'du roi', 'cam on', 'da xong', 'the thoi'].includes(normMessage.replace(/[.!,?]+/g, '').trim());
        const trimmedNote = (message || '').trim();
        if (!isSkip && trimmedNote && flow.leadId) {
          const noteText = `SL: ${flow.quantity || 1} | Giao hàng / Ghi chú: ${trimmedNote}`;
          await db.run('UPDATE leads SET notes = ?, updated_at = ? WHERE id = ?', [noteText, now, flow.leadId]);
          return {
            orderFlow: null,
            reply: `Dạ, tôi đã ghi nhận địa chỉ / ghi chú của bạn: **"${trimmedNote}"** vào đơn đặt hàng rồi ạ!\n\n**${ownerName}** sẽ sớm liên hệ qua số **${flow.phone}** để xác nhận và giao hàng chu đáo cho bạn.${showHotline ? ` Hotline: **${hotline}**.` : ''}`
          };
        }
        return {
          orderFlow: null,
          reply: `Dạ, đã hoàn tất rồi ạ! Tôi đã chuyển đơn hàng **${flow.productName}** (SL: **${flow.quantity || 1}**) đến **${ownerName}**.\n\n**${ownerName}** sẽ sớm liên hệ số **${flow.phone}** để hỗ trợ bạn chu đáo nhất ạ!`
        };
      }
    }

    // Collect fields from current turn according to active step
    if (!flow.quantity) {
      let parsedQty = explicitQty;
      if (parsedQty === null && flow.step === 'ask_quantity' && !wantsToStartOrder) {
        const bareNum = normMessage.match(/^\s*(\d{1,3})\s*$/);
        if (bareNum) {
          const n = parseInt(bareNum[1], 10);
          if (n >= 1 && n <= 500) parsedQty = n;
        }
      }
      if (parsedQty !== null) {
        flow.quantity = parsedQty;
      }
    }

    if (!flow.name) {
      const parsedName = extractCustomerName(message, flow.step === 'ask_name' && !wantsToStartOrder) || customerProfile?.name || null;
      if (parsedName && !hasBlockedNameTokens(parsedName) && !isProductOrDeviceTerm(parsedName)) {
        flow.name = parsedName;
      }
    }

    if (!flow.phone && extractedPhone) {
      flow.phone = extractedPhone;
    }

    // Validate bare numeric typo when specifically asking for phone number
    if (flow.step === 'ask_phone' && !wantsToStartOrder && !flow.phone && /\d{4,}/.test(normMessage)) {
      return {
        orderFlow: flow,
        reply: `Dạ, số điện thoại ${customerRef} vừa nhập chưa đủ **10 chữ số hợp lệ** (bắt đầu bằng 03, 05, 07, 08, 09).\n\n👉 ${capRef} kiểm tra và nhập lại **Số điện thoại** giúp tôi nhé!`
      };
    }

    const unit = getProductUnit(targetProd);

    // Step 1: Ask quantity first
    if (!flow.quantity) {
      flow.step = 'ask_quantity';
      return {
        orderFlow: flow,
        reply: `Dạ, tôi đã ghi nhận ${customerRef} quan tâm đặt mua **${flow.productName}** (giá niêm yết **${flow.unitPriceFormatted}**).\n\n👉 ${capRef} dự kiến đặt mua **số lượng bao nhiêu ${unit}** ạ? *(Bạn chỉ cần nhắn số, ví dụ: 1, 2...)*`
      };
    }

    const subtotalText = flow.unitPrice > 0 ? ` — tạm tính **${formatVnd(flow.unitPrice * flow.quantity)}**` : '';

    // Step 2: Ask customer name
    if (!flow.name) {
      flow.step = 'ask_name';
      return {
        orderFlow: flow,
        reply: `Dạ, tôi đã ghi nhận **${flow.quantity} ${unit}** (**${flow.productName}**${subtotalText}).\n\n👉 Xin lỗi, bạn vui lòng cho tôi biết thông tin (họ tên hoặc cách xưng hô) để tôi thuận tiện xưng hô và ghi đơn ạ?`
      };
    }

    const cleanFlowName = (flow.name || '').replace(/^(anh|chị|chi|em|bác|bac|chú|chu|cô|co|bạn|ban)\s+/i, '').trim();
    const flowHonorificMatch = (flow.name || '').match(/^(anh|chị|chi|em|bác|bac|chú|chu|cô|co|bạn|ban)(?:\s+|$)/i);
    const effectivePronoun = customerProfile?.pronoun || (flowHonorificMatch ? flowHonorificMatch[1].toLowerCase() : 'bạn');
    const namedRef = `${effectivePronoun} ${cleanFlowName}`;

    // Step 3: Ask phone number
    if (!flow.phone) {
      flow.step = 'ask_phone';
      return {
        orderFlow: flow,
        reply: `Dạ, chào **${namedRef}**!\n\n👉 Bạn vui lòng cho tôi xin **Số điện thoại** (10 chữ số) để **${ownerName}** gọi xác nhận đơn và báo ưu đãi tốt nhất nhé?`
      };
    }

    // All required info collected (quantity + name + phone) -> Save CRM Lead & ask optional note/feedback
    let leadCreated = null;
    const existingLead = await db.get('SELECT id FROM leads WHERE conversation_id = ? AND phone = ?', [convId, flow.phone]);
    if (!existingLead) {
      const leadId = `lead_${randomUUID().slice(0, 8)}`;
      const orderCustomerName = flow.name
        ? (customerProfile?.pronoun ? `${capitalizeFirst(customerProfile.pronoun)} ${cleanFlowName}` : flow.name)
        : (customerProfile?.name
          ? (customerProfile?.pronoun ? `${capitalizeFirst(customerProfile.pronoun)} ${customerProfile.name}` : customerProfile.name)
          : `Khách ${flow.phone}`);
      await db.run(
        `INSERT INTO leads (
          id, customer_name, phone, email, product_id, product_name, quantity, customer_requirement,
          conversation_id, website_source, widget_id, consent_to_contact, created_time, lead_status, notes, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'TRÍ AI Humanoid Widget', 'WIDGET_HUMANOID_V1', 1, ?, 'NEW – WAITING FOR OWNER CONTACT', ?, ?)`,
        [
          leadId,
          orderCustomerName,
          flow.phone,
          extractedEmail || customerInfo?.email || null,
          flow.productId,
          flow.productName,
          flow.quantity,
          'Đặt mua ngay',
          convId,
          now,
          `Đơn đặt hàng từng bước: ${flow.productName} × ${flow.quantity} ${unit}${subtotalText}.`,
          now
        ]
      );
      flow.leadId = leadId;
      leadCreated = {
        id: leadId,
        name: flow.name,
        phone: flow.phone,
        product: flow.productName,
        quantity: flow.quantity,
        status: 'NEW – WAITING FOR OWNER CONTACT'
      };
      console.log(`[CRM INTEGRATION] Step-by-step Order Lead created: ${leadId} (${flow.name} - ${flow.phone})`);
    } else {
      flow.leadId = existingLead.id;
    }

    flow.step = 'ask_note';
    return {
      orderFlow: flow,
      leadCreated,
      leadCaptured: Boolean(leadCreated),
      reply: `Dạ, cảm ơn **${namedRef}**! Tôi đã lưu thông tin đặt hàng vào hệ thống:\n• **Sản phẩm:** ${flow.productName} (SL: **${flow.quantity} ${unit}**${subtotalText})\n• **Số điện thoại:** **${flow.phone}**\n\n👉 Bạn có muốn nhắn thêm **địa chỉ nhận hàng hoặc ghi chú** gửi **${ownerName}** không ạ? *(Hoặc nhắn "Xong" nếu đã đủ thông tin)*`
    };
  }

  /**
   * Smart Context-Aware Local AI Sales Brain powered by live product catalog & conversation memory.
   */
  static generateSmartLocalReply({
    message,
    normMessage,
    allProducts,
    productMatch = null,
    matchedFromText = [],
    matchedField = null,
    conversationContextField = null,
    conversationActiveProduct = null,
    selectedProduct = null,
    activeProduct = null,
    actionType = null,
    detectedQty = 1,
    extractedPhone = null,
    leadCreated = null,
    ownerName,
    phonePrompt,
    hotline,
    showHotline,
    customerRef = 'bạn',
    hasAddressingInfo = false,
    shouldAskAddressing = false,
    pendingMissingProduct = null,
    clientDevice = 'desktop'
  }) {
    const isMobile = clientDevice === 'mobile';
    const capRef = capitalizeFirst(customerRef);
    const normAction = removeVietnameseTones(actionType || '');
    const isExplicitButtonAction = Boolean(actionType && actionType !== 'chat');
    const politeAskBanner = '';
    const hasBudgetInQuery = Boolean(extractBudget(normMessage));

    // 0. Security & Anti-Prompt-Injection
    if (detectSecurityViolation(normMessage)) {
      return `Dạ, tôi là trợ lý bán hàng thông minh. Tôi xin phép chỉ tư vấn thông tin và giá niêm yết chính thức của các sản phẩm đã được phê duyệt ạ. ${capRef} đang quan tâm sản phẩm nào để tôi hỗ trợ nhé?`;
    }

    // 0A. Hỏi thăm sức khoẻ ("bạn khoẻ không", "khỏe không"...) -> Đáp lại lịch sự, tuyệt đối không quảng cáo sản phẩm ngay
    if (isHealthInquiry(normMessage)) {
      const friendRef = (!customerRef || customerRef === 'Quý khách' || customerRef === 'quý khách') ? 'bạn' : customerRef;
      return `Dạ tôi khoẻ, cảm ơn ${friendRef}! Còn ${friendRef} thì sao ạ? Hôm nay tôi có thể giúp gì cho ${friendRef}?`;
    }

    // 0B. Phân biệt rõ ràng: Khách hàng khai báo tên để xưng hô ("Tôi tên Trí", "Em tên Linh"...)
    if (isCustomerNameDeclaration(message, normMessage)) {
      return `Dạ cảm ơn **${customerRef}** rất nhiều! Tôi đã ghi nhận và xin phép gọi **${customerRef}** ạ.\n\nHiện **${customerRef}** đang cần tìm sản phẩm thuộc lĩnh vực nào để tôi tư vấn ngay ạ?`;
    }

    // 0C. Yêu cầu gặp nhân viên hỗ trợ / Chuyên viên tư vấn
    if (productMatch?.isStaffHandoff) {
      return `Dạ, em đã ghi nhận yêu cầu kết nối với chuyên viên tư vấn của shop.\n\nBạn vui lòng để lại **Số điện thoại** (và tên nếu tiện), nhân viên bên em sẽ gọi lại ngay để hỗ trợ bạn trực tiếp và nhanh nhất ạ!\n\nNgoài ra, bạn cũng có thể liên hệ trực tiếp hotline của shop: **${hotline || '0982441446'}** nhé ạ.`;
    }

    // 0D. Hỏi chính sách bảo hành / Đổi trả / Giao hàng
    if (productMatch?.isPolicyInquiry) {
      if (normMessage.includes('giao hang') || normMessage.includes('phi ship')) {
        return `Dạ, shop có chính sách giao hàng tận nơi trên toàn quốc rất tiện lợi cho bạn ạ:\n\n• **Đồng kiểm:** Bạn được quyền mở kiểm tra hàng và tem niêm phong trước khi thanh toán.\n• **Miễn phí vận chuyển:** Áp dụng cho các đơn hàng máy tính, laptop và thiết bị có giá trị cao trong nội thành.\n• **Giao hàng toàn quốc:** Giao qua chuyển phát nhanh (1 - 3 ngày làm việc).\n\nBạn đang ở khu vực nào để em báo thời gian nhận hàng chính xác nhất nhé ạ!`;
      }
      const activeProd = activeProduct || conversationActiveProduct || selectedProduct || productMatch?.topProduct;
      if (activeProd) {
        const isFood = isFoodOrBeverageProduct(activeProd);
        if (isFood) {
          return `Dạ, đối với các sản phẩm trà, đồ uống và thực phẩm như **${activeProd.name}**, sản phẩm không áp dụng bảo hành điện tử mà shop cam kết chất lượng tuyệt đối:\n\n• **Chính hãng 100%:** Nguồn gốc xuất xứ rõ ràng, bao bì nguyên vẹn, đảm bảo an toàn vệ sinh thực phẩm.\n• **Hạn sử dụng:** Cam kết Date mới nhất từ nhà sản xuất theo lô hàng.\n• **Chính sách đổi trả:** Hỗ trợ đổi mới 1 đổi 1 trong 7 ngày đầu nếu có lỗi đóng gói do vận chuyển hoặc phát hiện lỗi chất lượng từ nhà sản xuất.\n\nThông số chi tiết và hình ảnh của sản phẩm đã được mở sẵn ở **Cột 2**, ${customerRef} có thể xem thêm ở Cột 2 nhé ạ!`;
        }
        const months = activeProd.warranty_months || 12;
        return `Dạ, về chính sách bảo hành của sản phẩm **${activeProd.name}**:\n\n• **Thời gian bảo hành:** **${months} tháng** chính hãng theo tiêu chuẩn của nhà sản xuất.\n• **Chính sách đổi mới:** Hỗ trợ **1 đổi 1 trong vòng 7 ngày đầu** nếu máy có lỗi phần cứng do nhà sản xuất.\n• **Hình thức bảo hành:** Tiếp nhận bảo hành tại shop hoặc trung tâm bảo hành ủy quyền của hãng trên toàn quốc.\n\nThông tin chi tiết và cấu hình của máy đã được mở sẵn ở **Cột 2**, ${customerRef} có thể xem thêm ở Cột 2 nhé ạ!`;
      }
      return `Dạ, toàn bộ sản phẩm tại shop đều là hàng chính hãng 100%. Đối với các thiết bị công nghệ, điện tử và máy móc sẽ được bảo hành chính hãng từ nhà sản xuất (từ 12 đến 36 tháng tùy từng model). Riêng các sản phẩm thực phẩm, trà & thức uống thì cam kết Date mới và hỗ trợ 1 đổi 1 trong 7 ngày nếu lỗi từ NSX.\n\n• **Chính sách 1 đổi 1:** Hỗ trợ đổi mới trong 7 ngày đầu nếu có lỗi từ nhà sản xuất.\n• **Bảo hành tận tâm:** Tiếp nhận bảo hành tại shop hoặc trung tâm bảo hành ủy quyền của hãng.\n\nBạn đang quan tâm đến sản phẩm nào để em kiểm tra chính sách bảo hành chính xác nhất của sản phẩm đó nhé ạ!`;
    }

    // 0E. So sánh sản phẩm
    if (productMatch?.isComparison) {
      const activeProd = activeProduct || conversationActiveProduct || selectedProduct;
      const isFood = isFoodOrBeverageProduct(activeProd);
      if (isFood) {
        return `Dạ, khi so sánh các dòng trà và đồ uống, shop luôn đánh giá dựa trên phẩm cấp nguyên liệu, hương vị đặc trưng, độ đậm đà và hình thức đóng gói làm quà biếu.\n\nToàn bộ các dòng trà hảo hạng đang có sẵn tại shop đã được hiển thị chi tiết ở **Cột 2**. Bạn đang phân vân giữa 2 dòng trà nào để em tư vấn chi tiết nhất cho bạn nhé ạ!`;
      }
      return `Dạ, khi so sánh các dòng sản phẩm, shop luôn đánh giá dựa trên độ bền thực tế, cấu hình chip/RAM và chính sách bảo hành chính hãng.\n\nToàn bộ các mẫu sản phẩm chất lượng cao đang có sẵn tại shop đã được hiển thị chi tiết ở **Cột 2**. Bạn đang phân vân giữa 2 model cụ thể nào để em so sánh thông số kỹ thuật chi tiết nhất cho bạn nhé ạ!`;
    }

    // 1. Lead Captured Confirmation
    if (leadCreated || extractedPhone) {
      if (pendingMissingProduct) {
        return `Dạ cảm ơn ${customerRef}! Tôi đã ghi nhận số điện thoại **${extractedPhone}** để chuyển cho ${ownerName} kiểm tra nguồn hàng **${pendingMissingProduct}** và phản hồi lại cho ${customerRef} sớm nhất nhé!`;
      }
      const unitPrice = activeProduct?.price || conversationActiveProduct?.price || 0;
      const targetName = activeProduct?.name || conversationActiveProduct?.name || 'Tư vấn chuyên sâu';
      const qtyLine =
        detectedQty > 1 && unitPrice > 0
          ? `\n- **Số lượng & Tạm tính:** ${detectedQty} sản phẩm (~${formatVnd(unitPrice * detectedQty)})`
          : '';
      return `Dạ cảm ơn ${customerRef}! Tôi đã ghi nhận thông tin đặt hàng vào hệ thống:\n- **Sản phẩm:** ${targetName}${qtyLine}\n- **Số điện thoại:** ${extractedPhone}\n\n${ownerName} sẽ trực tiếp liên hệ hỗ trợ ${customerRef} sớm nhất.${showHotline ? ` Hotline: **${hotline}**.` : ''}`;
    }

    // 2. Owner Phone / Contact Request
    if (
      normMessage.includes('so dien thoai') ||
      normMessage.includes('sdt') ||
      normMessage.includes('chu nhan') ||
      normMessage.includes('cho xin so') ||
      normMessage.includes('lien he chu') ||
      normAction.includes('chu nhan') ||
      normMessage.includes('goi lai cho toi')
    ) {
      return `${politeAskBanner}Dạ, tôi là trợ lý bán hàng thông minh. ${phonePrompt}\n\n${capRef} vui lòng để lại số điện thoại để shop liên hệ trực tiếp nhé!`;
    }

    // 2B. Explicit View Request ("cho anh xem", "cho xem sản phẩm", "cho tôi xem", "xem chi tiết")
    const isExplicitViewAskLocal =
      /(?:cho\s+(?:anh|chi|em|toi|minh|bac|chu|co)?\s*(?:xem|coi)|xem\s+(?:lai\s+)?san\s+pham|xem\s+chi\s+tiet|mo\s+(?:lai\s+)?cot\s+2|hien\s+cot\s+2|xem\s+hinh|xem\s+anh)\b/i.test(message || '') ||
      /(?:cho\s+(?:anh|chi|em|toi|minh|bac|chu|co)?\s*(?:xem|coi)|xem\s+(?:lai\s+)?san\s+pham|xem\s+chi\s+tiet|mo\s+(?:lai\s+)?cot\s+2|hien\s+cot\s+2|xem\s+hinh|xem\s+anh)\b/i.test(normMessage || '');
    if (isExplicitViewAskLocal) {
      const viewTarget = activeProduct || conversationActiveProduct || selectedProduct;
      if (viewTarget) {
        const salesPitch = buildProductSalesPitch(viewTarget);
        return `${politeAskBanner}Dạ ${customerRef} vui lòng xem hình ảnh và thông số chi tiết của sản phẩm **${viewTarget.name}** (giá niêm yết **${formatPrice(viewTarget)}**) ngay ở **Cột 2** nhé.\n\n${salesPitch}\n\n${capRef} có muốn em hỗ trợ lên đơn hoặc giữ hàng mẫu này luôn cho mình không ạ?`;
      }
    }

    // 3. Explicit Buy / Order Flow fallback
    const isAvailabilityInquiry = /(?:co\s+khong|co\s+chua|co\s+hang\s+khong|con\s+hang\s+khong|co\s+ban\s+khong|co\s+loai|co\s+mau|co\s+dong|co\s+san|con\s+khong|thi\s+co|hoi)\b/.test(normMessage);
    if (
      !isAvailabilityInquiry &&
      !productMatch?.missingProductQuery &&
      (normAction.includes('dat mua') ||
      normMessage.includes('dat mua') ||
      normMessage.includes('mua ngay') ||
      normMessage.includes('dat hang') ||
      (detectedQty > 1 && (activeProduct || conversationActiveProduct) && (normMessage.includes('mua') || normMessage.includes('tong') || normMessage.includes('bao nhieu'))))
    ) {
      const targetProd = activeProduct || conversationActiveProduct || allProducts[0];
      const totalEstimate = (targetProd?.price || 0) * detectedQty;
      const qtyText =
        detectedQty > 1
          ? `- **Số lượng:** ${detectedQty} chiếc (~${formatVnd(totalEstimate)})\n`
          : '';

      return `${politeAskBanner}Dạ tuyệt vời! Tôi xin xác nhận sản phẩm ${customerRef} quan tâm đặt mua:\n- **Sản phẩm:** ${targetProd.name}\n- **Đơn giá:** ${formatPrice(targetProd)}\n${qtyText}${capRef} vui lòng cho biết số lượng hoặc để lại SĐT để ${ownerName} liên hệ giao hàng nhé.`;
    }

    // 4. Comparison Engine (Compare 2+ matched models or all products in same category)
    if (
      normAction.includes('so sanh') ||
      normMessage.includes('so sanh') ||
      normMessage.includes('khac nhau') ||
      normMessage.includes('nen chon mau nao') ||
      normMessage.includes('nen mua loai nao') ||
      normMessage.includes('voi nhau')
    ) {
      const hardwareMatches = matchedFromText.filter((p) => p.field !== 'Dịch vụ bảo trì' || normMessage.includes('bao tri'));
      const uniqueFields = new Set(hardwareMatches.map((p) => p.field));
      if (hardwareMatches.length >= 2 && uniqueFields.size === 1) {
        return `${politeAskBanner}${buildProductComparisonReply(hardwareMatches.slice(0, 3), ownerName, customerRef, clientDevice)}`;
      }
      const refField =
        (normMessage.includes('dem tien') || normMessage.includes('xiudun'))
          ? 'Máy đếm tiền'
          : (hardwareMatches[0]?.field || matchedField || conversationContextField || selectedProduct?.field || 'Máy đếm tiền');
      const sameFieldProds = allProducts.filter((p) => p.field === refField);
      if (sameFieldProds.length >= 2) {
        return `${politeAskBanner}${buildProductComparisonReply(sameFieldProds.slice(0, 3), ownerName, customerRef, clientDevice)}`;
      }
    }

    // 5. Budget & Price Range Intelligence ("duoi 5 trieu", "re nhat", "tam 6 trieu")
    // QUY TẮC BẮT BUỘC: Giữ nguyên danh mục đang trao đổi, tuyệt đối không nhảy sang danh mục khác!
    const budget = extractBudget(normMessage);
    if (budget && !isExplicitButtonAction) {
      let pool = allProducts.filter((p) => p.field !== 'Dịch vụ bảo trì' || normMessage.includes('bao tri'));

      // Category scoping: STRICTLY preserve active category context when available
      const activeField = matchedField || conversationContextField || (conversationActiveProduct?.field) || (activeProduct?.field) || (selectedProduct?.field) || null;
      if (activeField && activeField !== 'Tất cả') {
        const fieldScoped = pool.filter(
          (p) =>
            p.field === activeField ||
            (p.field && removeVietnameseTones(p.field).includes(removeVietnameseTones(activeField))) ||
            (p.field && removeVietnameseTones(activeField).includes(removeVietnameseTones(p.field)))
        );
        if (fieldScoped.length > 0) {
          pool = fieldScoped;
        }
      } else {
        // Khi chưa có danh mục nào được trao đổi, không đoán mò nhảy sang ngành hàng khác (ví dụ nhảy sang Trà)
        const fields = [...new Set(allProducts.map((p) => p.field).filter(Boolean))];
        const fieldsList = fields.slice(0, 5).join(', ');
        return `${politeAskBanner}Dạ, bên shop hiện đang phân phối đa dạng các lĩnh vực như: **${fieldsList}**...\n\n${capRef} đang quan tâm đến dòng sản phẩm thuộc danh mục nào để tôi tư vấn mẫu có mức giá tiết kiệm và phù hợp nhất nhé?`;
      }

      if (budget.min !== undefined || budget.max !== undefined) {
        const filtered = pool.filter((p) => {
          const price = p.price || 0;
          if (budget.min !== undefined && price < budget.min) return false;
          if (budget.max !== undefined && price > budget.max) return false;
          return true;
        });
        if (filtered.length > 0) {
          pool = filtered;
        }
      }

      if (budget.sort === 'asc') {
        pool.sort((a, b) => (a.price || 0) - (b.price || 0));
      } else if (budget.sort === 'desc') {
        pool.sort((a, b) => (b.price || 0) - (a.price || 0));
      } else {
        // Prefer best-value match closest to budget ceiling & active category
        pool.sort((a, b) => (b.price || 0) - (a.price || 0));
      }

      if (pool.length === 0) {
        const categoryPool = activeField ? allProducts.filter((p) => p.field === activeField) : allProducts;
        const fallbackPool = categoryPool.length > 0 ? categoryPool : allProducts;
        const cheapest = [...fallbackPool].sort((a, b) => (a.price || 0) - (b.price || 0))[0];
        const categoryNote = activeField && activeField !== 'Tất cả' ? ` trong danh mục **${activeField}**` : '';
        return `${politeAskBanner}Dạ, trong tầm giá này hiện chưa có mẫu${categoryNote} phù hợp. Mẫu có giá tốt nhất là **${cheapest.name}** (${formatPrice(cheapest)}).\n\n${capRef} có thể để lại SĐT để ${ownerName} tư vấn giải pháp phù hợp ngân sách hơn nhé!`;
      }

      const picks = pool.slice(0, 3);
      const listText = picks
        .map((p, i) => `${i + 1}. **${p.name}** — **${formatPrice(p)}**`)
        .join('\n');

      const guideText = `Tôi đã mở danh sách ở **Cột 2**, ${capRef} có thể bấm xem chi tiết hoặc nhắn tôi tư vấn sâu hơn nhé!`;
      const scopeIntro = activeField && activeField !== 'Tất cả' ? ` trong danh mục **${activeField}**` : '';

      return `${politeAskBanner}Dạ, theo mức ngân sách của ${customerRef}${scopeIntro}, tôi xin gợi ý các lựa chọn phù hợp:\n\n${listText}\n\n${guideText}`;
    }

    // 6. Warranty, Inventory, Delivery & Discount Objections
    if (normMessage.includes('bao hanh') || normMessage.includes('sua chua') || normMessage.includes('loi')) {
      const target = matchedFromText[0] || conversationActiveProduct || selectedProduct;
      if (target && isFoodOrBeverageProduct(target)) {
        return `${politeAskBanner}Dạ, sản phẩm **${target.name}** là mặt hàng trà/thực phẩm nên không có chính sách bảo hành điện tử như máy móc ạ. Shop cam kết **chính hãng 100%**, **date mới nhất** và hỗ trợ **đổi trả trong 7 ngày** nếu có lỗi bao bì hoặc lỗi do nhà sản xuất.\n\n${capRef} cần tìm hiểu thêm thông tin nào về sản phẩm này không ạ?`;
      }
      const specs = parseSpecs(target);
      const warranty = specs['Bảo hành'] || specs['Bảo hành & Support'];
      if (target && warranty) {
        return `${politeAskBanner}Dạ, **${target.name}** có chế độ bảo hành chính hãng là: **${warranty}**.\n\n${capRef} cần tìm hiểu thêm thông tin nào về sản phẩm này không ạ?`;
      }
      return `${politeAskBanner}Dạ, các sản phẩm máy móc, thiết bị bên tôi đều được bảo hành chính hãng từ 12 - 36 tháng; riêng các sản phẩm trà, đồ uống, thực phẩm thì cam kết 100% chính hãng, Date mới và hỗ trợ đổi trả 7 ngày nếu lỗi từ NSX. ${capRef} đang quan tâm mẫu nào để tôi gửi thông tin cụ thể ạ?`;
    }

    if (normMessage.includes('con hang') || normMessage.includes('ton kho') || normMessage.includes('giao hang') || normMessage.includes('ship') || normMessage.includes('bao lau nhan')) {
      return `${politeAskBanner}Dạ, bên tôi hỗ trợ giao hàng tận nơi toàn quốc. ${capRef} vui lòng để lại số điện thoại hoặc địa chỉ để ${ownerName} kiểm tra kho và báo lịch giao chính xác nhất nhé!`;
    }

    if (normMessage.includes('giam gia') || normMessage.includes('chiet khau') || normMessage.includes('dat qua') || normMessage.includes('bot gia') || normMessage.includes('uu dai')) {
      const target = matchedFromText[0] || conversationActiveProduct || selectedProduct;
      return `${politeAskBanner}Dạ, giá niêm yết của **${target ? target.name : 'sản phẩm'}** (${target ? formatPrice(target) : ''}) là giá chính hãng đã được phê duyệt. Khi đặt mua từ 2 sản phẩm trở lên, ${ownerName} luôn có chính sách chiết khấu riêng. ${capRef} để lại SĐT để nhận ưu đãi tốt nhất nhé!`;
    }

    // 7. Quote Action
    if (normAction.includes('bao gia') || normMessage.includes('bao gia')) {
      const target = activeProduct || conversationActiveProduct || allProducts[0];
      return `${politeAskBanner}Dạ, báo giá chính thức cho **${target.name}** là: **${formatPrice(target)}**.\n\n${capRef} vui lòng cho biết số lượng dự kiến và SĐT để tôi chuyển ${ownerName} gửi báo giá ưu đãi chi tiết nhé!`;
    }

    // 8. Catalog Overview / What do you sell? ("kinh doanh gi", "ban gi", "co san pham gi", "danh muc")
    // YÊU CẦU: CHỈ BẬT CỘT 2 VÀ ĐỒNG THỜI CHỈ NÊU DANH MỤC TỔNG KHÔNG NÊU SẢN PHẨM, KHÁCH HÀNG TỰ XEM SẢN PHẨM Ở CỘT 2
    if (isCatalogOverviewQuery(normMessage)) {
      const fields = [...new Set(allProducts.map((p) => p.field).filter(Boolean))];
      const categoryBullets = fields
        .map((f) => `• **${f}**`)
        .join('\n');

      const budgetAsk = hasBudgetInQuery
        ? ` ${capRef} muốn xem chi tiết lĩnh vực nào hay cần hỗ trợ đặt mua ạ?`
        : ` ${capRef} đang quan tâm đến lĩnh vực nào hoặc có mức ngân sách khoảng bao nhiêu tiền để tôi tư vấn chuẩn nhất nhé?`;

      return `${politeAskBanner}Dạ xin chào ${customerRef}! Hiện bên em đang kinh doanh các lĩnh vực sản phẩm chính sau:\n\n${categoryBullets}\n\nToàn bộ danh mục và các mẫu sản phẩm chi tiết đã được mở sẵn ở **Cột 2**, ${customerRef} có thể tự xem sản phẩm trực tiếp ở Cột 2 nhé.\n\n${budgetAsk}`;
    }

    // 9. Smart Product Match from Customer's Text (Tier 1: >= 90% vs Tier 2: 80% - 90%)
    if ((productMatch && (productMatch.tier === 1 || productMatch.tier === 2) && productMatch.topProduct) || matchedFromText.length > 0) {
      const top = (productMatch && productMatch.topProduct) || matchedFromText[0];
      const tier = productMatch?.tier || 1;
      const salesPitch = buildProductSalesPitch(top);

      if (tier === 2) {
        // TÌNH HUỐNG 2: Giống từ 80% đến dưới 90%
        const missingName = productMatch?.missingProductQuery || (coreQuery ? formatMissingProductName(coreQuery, conversationContextField) : null);
        if (missingName && missingName !== top.name) {
          return `${politeAskBanner}Dạ hiện tại sản phẩm **${missingName}** chưa tìm thấy trong dữ liệu của shop ạ.\n\n${capRef} vui lòng để lại **Số điện thoại** để nhân viên bên em liên hệ lại hỗ trợ kiểm tra nguồn hàng kho và báo giá sớm nhất nhé ạ.\n\nĐồng thời, hiện tại bên em đang có sản phẩm tương tự rất phù hợp là:\n\n🌟 **${top.name}**\n💵 **Giá niêm yết:** **${formatPrice(top)}**\n\n${salesPitch}\n\nThông số chi tiết và hình ảnh thực tế đã được mở sẵn ở **Cột 2**, ${customerRef} có thể tham khảo thêm nhé ạ!`;
        }
        const budgetAsk = hasBudgetInQuery
          ? ` ${capRef} muốn tôi tư vấn thêm hay hỗ trợ đặt mua ngay ạ?`
          : ` Bạn đang dự tính mua trong tầm giá khoảng bao nhiêu tiền để tôi tư vấn mẫu sát nhất với nhu cầu của bạn nhé?`;
        return `Dạ hiện bên em đang có sản phẩm tương tự có thể phù hợp với nhu cầu của mình là:\n\n🌟 **${top.name}**\n💵 **Giá niêm yết:** **${formatPrice(top)}**\n\n${salesPitch}\n\nThông số chi tiết và hình ảnh thực tế đã được mở sẵn ở **Cột 2**.${budgetAsk}`;
      }

      // TÌNH HUỐNG 1: Giống từ 90% trở lên -> Kịch bản bán hàng dựa trên chính TÊN SẢN PHẨM + Báo giá niêm yết + Mở Cột 2 + Hỏi số tiền
      const budgetAsk = hasBudgetInQuery
        ? ` ${capRef} muốn tôi tư vấn thêm hay hỗ trợ đặt mua ngay ạ?`
        : ` Bạn đang dự tính mua trong tầm giá khoảng bao nhiêu tiền để tôi tư vấn cấu hình và ưu đãi phù hợp nhất nhé?`;
      return `Dạ, sản phẩm phù hợp nhất với nhu cầu của ${customerRef} là:\n\n🌟 **${top.name}**\n💵 **Giá niêm yết:** **${formatPrice(top)}**\n\n${salesPitch}\n\nThông số chi tiết và hình ảnh thực tế đã được mở sẵn ở **Cột 2**.${budgetAsk}`;
    }

    // 8B. Field / Category Discovery (chỉ kích hoạt khi khách hàng thực sự hỏi xem danh mục / lĩnh vực)
    const isExplicitCategoryBrowse =
      /(?:danh\s+muc|linh\s+vuc|nganh\s+hang|cac\s+dong\s+san\s+pham|toan\s+bo\s+san\s+pham|xem\s+danh\s+muc|mo\s+danh\s+muc|co\s+nhung\s+mat\s+hang\s+nao\s+trong|co\s+nhung\s+san\s+pham\s+nao\s+trong)\b/i.test(normMessage) ||
      (matchedField && (normMessage.startsWith('xem ') || normMessage.startsWith('mo ') || normMessage.startsWith('danh muc ')));
    if (matchedField && isExplicitCategoryBrowse && !isExplicitButtonAction) {
      const fieldProducts = allProducts.filter((p) => p.field === matchedField);
      if (fieldProducts.length > 0) {
        const previewLines = fieldProducts
          .slice(0, 4)
          .map((p, i) => {
            const short = formatShortDesc(p.description, 70);
            return `${i + 1}. **${p.name}** — **${formatPrice(p)}**${short ? ` (${short})` : ''}`;
          })
          .join('\n');
        const budgetAsk = hasBudgetInQuery
          ? ` ${capRef} muốn xem chi tiết mẫu nào hay cần hỗ trợ đặt mua ạ?`
          : ` Bạn đang dự tính mua trong tầm giá khoảng bao nhiêu tiền để tôi tư vấn mẫu chuẩn nhất nhé?`;
        return `Dạ, tôi đã mở danh mục **${matchedField}** ở **Cột 2**:\n\n${previewLines}\n\nBạn có thể bấm vào thẻ sản phẩm để xem chi tiết.${budgetAsk}`;
      }
    }

    // 8C. Discovery of other models in current category ("còn mẫu nào khác không", "xem thêm mẫu", "có loại nào khác")
    const isAskOtherModels =
      normMessage.includes('mau khac') ||
      normMessage.includes('loai khac') ||
      normMessage.includes('dong khac') ||
      normMessage.includes('xem them') ||
      normMessage.includes('con loai nao') ||
      normMessage.includes('con mau nao') ||
      normMessage.includes('co loai nao khac') ||
      normMessage.includes('co mau nao khac');

    if (isAskOtherModels && !isExplicitButtonAction) {
      const targetScopeField = matchedField || conversationContextField || (selectedProduct?.field) || null;
      if (targetScopeField && targetScopeField !== 'Tất cả') {
        const sameFieldProds = allProducts.filter((p) => p.field === targetScopeField);
        if (sameFieldProds.length > 0) {
          const previewLines = sameFieldProds
            .slice(0, 4)
            .map((p, i) => {
              const short = formatShortDesc(p.description, 70);
              return `${i + 1}. **${p.name}** — **${formatPrice(p)}**${short ? ` (${short})` : ''}`;
            })
            .join('\n');
          const budgetAsk = hasBudgetInQuery
            ? ` ${capRef} muốn xem chi tiết mẫu nào hay cần hỗ trợ đặt mua ạ?`
            : ` Bạn đang dự tính mua trong tầm giá khoảng bao nhiêu tiền để tôi tư vấn mẫu chuẩn nhất nhé?`;
          return `Dạ, trong danh mục **${targetScopeField}**, bên em có các mẫu nổi bật sau:\n\n${previewLines}\n\nToàn bộ sản phẩm đã được mở sẵn ở **Cột 2** để ${customerRef} tiện theo dõi.${budgetAsk}`;
        }
      }
    }

    // TÌNH HUỐNG 3: Không có trong data (< 80%)
    const missingCandidate = productMatch?.missingProductQuery || detectMissingProductInquiry(message, normMessage, [], null, allProducts, '', conversationContextField);
    if (missingCandidate) {
      const topSimilar = productMatch?.topProduct || productMatch?.relatedProduct || (productMatch?.rankedProducts && productMatch.rankedProducts[0]) || null;
      let relatedIntro = '';
      if (topSimilar) {
        relatedIntro = `Đồng thời, hiện tại bên em đang có sản phẩm tương tự / liên quan có thể phù hợp với nhu cầu của mình là **${topSimilar.name}** (Giá niêm yết: **${formatPrice(topSimilar)}**). Thông tin chi tiết và hình ảnh đã được mở sẵn ở **Cột 2**, ${customerRef} có thể tham khảo thêm nhé ạ!`;
      } else {
        const activeScopeField = conversationContextField || matchedField || null;
        const sameCategoryProducts = activeScopeField && activeScopeField !== 'Tất cả'
          ? allProducts.filter((p) => p.field === activeScopeField)
          : [];
        if (sameCategoryProducts.length > 0) {
          const uniqueNames = [...new Set(sameCategoryProducts.map((p) => p.name))].slice(0, 2);
          const sampleProds = uniqueNames.map((n) => `**${n}**`).join(', ');
          relatedIntro = `Đồng thời, các mẫu sản phẩm thuộc danh mục **${activeScopeField}** hiện có của shop (như ${sampleProds}) đã được mở sẵn ở **Cột 2**, ${customerRef} có thể tham khảo trực tiếp các mẫu khác ở Cột 2 nhé.`;
        } else {
          relatedIntro = `Đồng thời, toàn bộ danh mục sản phẩm hiện có của shop đã được mở sẵn ở **Cột 2**, ${customerRef} có thể tham khảo thêm các mẫu đang có sẵn tại shop ạ.`;
        }
      }
      return `${politeAskBanner}Dạ hiện tại sản phẩm **${missingCandidate}** chưa tìm thấy trong dữ liệu của shop ạ.\n\n${capRef} vui lòng để lại **Số điện thoại** để nhân viên bên em liên hệ lại hỗ trợ kiểm tra nguồn hàng kho và báo giá sớm nhất nhé ạ.\n\n${relatedIntro}`;
    }

    // 10. Button-triggered detail / price inquiry for Selected Product
    if (selectedProduct && (isExplicitButtonAction || normMessage.includes('hoi gia') || normMessage.includes('gia bao nhieu') || normMessage.includes('chi tiet') || normMessage.includes('thong so'))) {
      const salesPitch = buildProductSalesPitch(selectedProduct);
      return `${politeAskBanner}Dạ, thông tin chi tiết về **${selectedProduct.name}**:\n💵 **Giá niêm yết:** **${formatPrice(selectedProduct)}**\n\n${salesPitch}\n\n${capRef} muốn so sánh với mẫu khác, đặt mua, hay để lại SĐT để ${ownerName} tư vấn sâu hơn ạ?`;
    }

    // 11A. Robot Identity & Name Inquiry ("Bạn tên gì?", "Em tên gì?", "Bạn là ai?", "Robot là ai?")
    if (
      normMessage.includes('ten gi') ||
      normMessage.includes('ban la ai') ||
      normMessage.includes('em la ai') ||
      normMessage.includes('may la ai') ||
      normMessage.includes('la ai') ||
      normMessage.includes('gioi thieu')
    ) {
      return `${politeAskBanner}Dạ, tôi là **TRÍ AI SALES ROBOT** — trợ lý bán hàng thông minh. Rất hân hạnh được phục vụ ${customerRef}!\n\n${capRef} đang quan tâm đến sản phẩm nào để tôi gửi thông tin và ưu đãi ạ?`;
    }

    // 11B. Friendly Conversation / Asking Permission ("Tôi hỏi thăm bạn được không?", "Cho tôi hỏi chút", "Hỏi thăm")
    if (
      normMessage.includes('hoi tham') ||
      normMessage.includes('hoi ban') ||
      normMessage.includes('cho toi hoi') ||
      normMessage.includes('cho minh hoi') ||
      normMessage.includes('cho em hoi') ||
      normMessage.includes('hoi chut') ||
      normMessage.includes('khoe khong') ||
      normMessage.includes('co khoe khong')
    ) {
      return `${politeAskBanner}Dạ cảm ơn ${customerRef} nhiều ạ! Tôi luôn có mặt 24/7 để phục vụ ${customerRef}. ${capRef} cứ thoải mái chia sẻ câu hỏi hoặc nhu cầu nhé!`;
    }

    // 11C. Capabilities / What can you do? ("Bạn giúp được gì?", "Làm được gì?")
    if (
      normMessage.includes('lam duoc gi') ||
      normMessage.includes('giup duoc gi') ||
      normMessage.includes('chuc nang gi') ||
      normMessage.includes('biet lam gi')
    ) {
      const actionScope = `tìm sản phẩm theo nhu cầu, so sánh thông số & giá bán, mở danh mục trực quan ở Cột 2 và ghi nhận đơn hàng`;
      return `${politeAskBanner}Dạ, tôi có thể giúp ${customerRef}: ${actionScope}. ${capRef} cần hỗ trợ gì cứ nhắn tôi nhé!`;
    }

    // 11D. Conversational Greeting / Addressing Inquiry / Open-ended Consultation
    const isGreeting = isGreetingMessage(normMessage);
    if (isGreeting) {
      if (!hasAddressingInfo) {
        return `Dạ xin chào bạn! Cảm ơn bạn đã ghé thăm shop ạ. Tôi là **TRÍ AI SALES ROBOT** — trợ lý bán hàng thông minh.\n\nXin lỗi, bạn vui lòng cho tôi biết tên hoặc cách xưng hô để tôi tiện phục vụ nhé!\n\nHôm nay bạn đang quan tâm sản phẩm gì? Bạn cần tôi giúp gì? Bạn có thể hỏi tôi hoặc tham khảo cột dự liệu bên cạnh. Do tôi là Trợ lý ảo nên Bạn viết câu từ rõ ràng giúp, tôi mới hiểu ý bạn`;
      }
      return `Dạ xin chào **${customerRef}**! Cảm ơn **${customerRef}** rất nhiều đã ghé thăm và liên hệ shop ạ. Tôi là **TRÍ AI SALES ROBOT** — trợ lý bán hàng thông minh. Hôm nay **${customerRef}** đang cần tìm sản phẩm hoặc giải pháp gì ạ?`;
    }

    // 12. Intelligent Clarification when request is ambiguous
    const catalogHighlights = [...new Set(allProducts.map((p) => p.field || p.name).filter(Boolean))]
      .slice(0, 5)
      .join(', ');
    const highlightText = catalogHighlights ? ` (${catalogHighlights})` : '';
    return `${politeAskBanner}Dạ, tôi rất vui được hỗ trợ ${customerRef}!\n\nTôi là trợ lý bán hàng thông minh và nắm đầy đủ thông tin các sản phẩm${highlightText}.\n\n${capRef} đang quan tâm đến dòng sản phẩm nào hoặc ngân sách khoảng bao nhiêu để tôi tư vấn chuẩn xác nhất ạ?`;
  }
}

export default SalesEngine;
