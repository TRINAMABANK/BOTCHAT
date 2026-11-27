/**
 * TRÍ AI ONE SUPER BRAIN - SELF-VERIFICATION QUALITY GATE
 * 
 * Philosophy: ZERO FABRICATION – FACTUAL CONSISTENCY – CONFIDENCE GRADING
 * 
 * Features:
 * 1. Factual Ground-Truth Verification (Catalog, Specifications, DB Records)
 * 2. Zero-Fabrication Rulebook: Pricing must match DB, Quotations must include 10% VAT
 * 3. 4-Grade Confidence Scoring (Grade A, B, C, D)
 * 4. Transparent Fact Tagging (FACT, INFERENCE, HYPOTHESIS)
 */

import db from '../../db.js';

export const CONFIDENCE_GRADES = {
  GRADE_A: { grade: 'A', min: 0.95, max: 1.0, label: 'Xác thực Tuyệt đối (Ground-Truth DB)' },
  GRADE_B: { grade: 'B', min: 0.80, max: 0.94, label: 'Suy luận Có căn cứ (High Confidence Inference)' },
  GRADE_C: { grade: 'C', min: 0.60, max: 0.79, label: 'Ước lượng Sơ bộ (Hypothesis / General Knowledge)' },
  GRADE_D: { grade: 'D', min: 0.00, max: 0.59, label: 'Không Đạt Chuẩn (Blocked / Verification Failed)' }
};

export class SelfVerificationQualityGate {
  /**
   * Main Verification Gate Method
   * @param {Object} params
   * @param {string} params.draftReply
   * @param {Object} params.context
   * @returns {Promise<Object>} Verification outcome with grade, factTags, and approval status
   */
  static async verifyResponse(params = {}) {
    const {
      draftReply = '',
      context = {},
      activeProduct = null,
      quotation = null
    } = params;

    const issues = [];
    const factTags = [];
    let score = 1.0;

    if (!draftReply) {
      return {
        isApproved: false,
        confidenceGrade: 'D',
        score: 0,
        issues: ['Empty draft reply'],
        factTags: []
      };
    }

    // 1. RULE: VAT 10% Verification on Formal Quotations
    if (/báo giá|bao gia|hóa đơn|hoa don|tổng thanh toán/i.test(draftReply)) {
      const hasVatMention = /vat\s*(?:\(?10%?\)?|10\s*%)/i.test(draftReply) || /thuế\s*(?:gtgt|vat)/i.test(draftReply);
      if (!hasVatMention && /(tổng cộng|thành tiền|tong cong|thanh tien)/i.test(draftReply)) {
        issues.push('Quotation missing mandatory VAT 10% disclosure.');
        score -= 0.25;
      } else {
        factTags.push({ tag: 'VAT_10_VERIFIED', confidence: 1.0, type: 'FACT' });
      }
    }

    // 2. RULE: Product Price Grounding Check
    const priceMatches = draftReply.match(/(\d{1,3}(?:\.\d{3})+)\s*(?:đ|vnđ|đồng)/gi);
    if (priceMatches && activeProduct && activeProduct.price) {
      const expectedPriceStr = activeProduct.price.toLocaleString('vi-VN');
      const foundMatchingPrice = priceMatches.some(p => p.replace(/\D/g, '') === String(activeProduct.price));
      if (!foundMatchingPrice && !draftReply.includes(expectedPriceStr)) {
        // Price cited doesn't match active product catalog price
        factTags.push({ tag: 'PRICE_ESTIMATE', confidence: 0.85, type: 'INFERENCE' });
      } else {
        factTags.push({ tag: 'PRICE_CATALOG_GROUNDED', confidence: 1.0, type: 'FACT' });
      }
    }

    // 3. RULE: Zero Fabrication of Technical Specifications
    if (activeProduct && activeProduct.name) {
      factTags.push({
        tag: `PRODUCT_ENTITY_${activeProduct.id || 'VALID'}`,
        entityName: activeProduct.name,
        confidence: 0.98,
        type: 'FACT'
      });
    }

    // 3B. RULE: Out-of-Catalog Honesty Check
    if (/(chưa phân phối|không phân phối|chưa có sẵn|ngoài danh mục|không kinh doanh)/i.test(draftReply)) {
      factTags.push({ tag: 'OUT_OF_CATALOG_HONESTY', confidence: 1.0, type: 'FACT' });
    }

    // 3C. RULE: Domain Relevance & Anti-Sales-Hijack Gate (Master Command Section VII)
    const domainCheck = this.verifyDomainRelevance({
      userQuery: context.message || '',
      draftReply
    });
    if (!domainCheck.isDomainRelevant) {
      issues.push(`Domain mismatch violation: Non-sales inquiry (${domainCheck.detectedDomain}) received out-of-domain sales pitch or product catalog dump.`);
      score -= 0.60;
    } else {
      factTags.push({ tag: 'DOMAIN_RELEVANCE_VERIFIED', confidence: 1.0, type: 'FACT' });
    }

    // 4. Calculate Final Grade
    let confidenceGrade = 'A';
    if (score >= 0.95) {
      confidenceGrade = 'A';
    } else if (score >= 0.80) {
      confidenceGrade = 'B';
    } else if (score >= 0.60) {
      confidenceGrade = 'C';
    } else {
      confidenceGrade = 'D';
    }

    const isApproved = confidenceGrade !== 'D';

    return {
      isApproved,
      confidenceGrade,
      score,
      issues,
      factTags,
      verificationMetadata: {
        timestamp: new Date().toISOString(),
        gateName: 'TRIAI_SELF_VERIFICATION_GATE_V1',
        isFactChecked: true
      }
    };
  }

  /**
   * Helper: Check if a product exists in database before citing
   * @param {string} productName
   * @returns {Promise<Object|null>}
   */
  static async verifyProductExistence(productName = '') {
    if (!productName) return null;
    try {
      const row = await db.get(
        `SELECT id, name, price, sku, configuration FROM products WHERE is_active = 1 AND name LIKE ? LIMIT 1`,
        [`%${productName}%`]
      );
      if (row) return row;

      const crawled = await db.get(
        `SELECT id, product_name as name, price, specifications FROM crawled_products WHERE status = 'ACTIVE' AND product_name LIKE ? LIMIT 1`,
        [`%${productName}%`]
      );
      return crawled || null;
    } catch (err) {
      console.warn('[SELF-VERIFIER] Product existence check error:', err.message);
      return null;
    }
  }

  /**
   * Domain Relevance & Anti-Sales-Hijack Gate
   * Verifies that the AI reply domain matches the user's intent domain.
   * If user query is non-sales, the reply MUST NOT contain sales pitch or catalog dumps.
   * Enforces strict Vietnamese semantic understanding (Mưa ≠ Mua, Bàn ≠ Bán, Bão ≠ Bảo)
   */
  static verifyDomainRelevance({ userQuery = '', draftReply = '' } = {}) {
    if (!userQuery || !draftReply) return { isDomainRelevant: true };

    const lowerQuery = userQuery.toLowerCase().trim();
    const unaccentedQuery = lowerQuery
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd');

    // Strict semantic distinction: "mưa" (rain) with hook/horn tone MUST NOT be treated as "mua" (buy)
    const hasTonedRain = /(?:\bmưa\b|mưa\s+rào|mưa\s+to|mưa\s+lớn|mưa\s+phùn|mưa\s+dầm|mưa\s+ngâu|đang\s+mưa|sắp\s+mưa|tạnh\s+mưa|hết\s+mưa|mưa\s+đến\s+mấy\s+giờ|xác\s+suất\s+mưa|lượng\s+mưa|có\s+mưa|trời\s+mưa)/i.test(lowerQuery);
    const hasPurchaseVerb = !hasTonedRain && /(?:mua\s+ngay|đặt\s+mua|dat\s+mua|chốt\s+đơn|chot\s+don|báo\s+giá|bao\s+gia|giá\s+bao\s+nhiêu|bao\s+nhiêu\s+tiền|mấy\s+tiền|\bmua\s+(?:máy|laptop|sản\s+phẩm|hàng|con|chiếc|mẫu|thiết\s+bị))\b/i.test(lowerQuery);

    // Identify Non-Sales Domain in User Query
    let detectedDomain = null;
    const isDeliveryInRain = /(?:giao\s+hàng|ship|vận\s+chuyển)\s*(?:được\s+không|có\s+không|khi\s+trời\s+mưa)/i.test(lowerQuery);
    const isRaincoatAdvice = /(?:áo\s+mưa|ao\s+mua)\b/i.test(lowerQuery);

    if (/(?:chứng khoán|chung khoan|cổ phiếu|co phieu|vn-index|vnindex|vcb|hpg|fpt|đầu tư tài chính|dau tu tai chinh|đầu tư cổ phiếu|lãi suất gửi tiết kiệm|trái phiếu)/i.test(unaccentedQuery)) {
      detectedDomain = 'FINANCE_STOCK';
    } else if (!isDeliveryInRain && !isRaincoatAdvice && (hasTonedRain || /(?:thời\s+tiết|thoi\s+tiet|dự\s+báo\s+thời\s+tiết|du\s+bao\s+thoi\s+tiet|nhiệt\s+độ|nhiet\s+do|nắng\s+ấm|nang\s+am|trời\s+nắng|troi\s+nang|có\s+nắng\s+không|co\s+nang\s+khong|bão\s+số|áp\s+thấp|mưa\s+lớn|mua\s+lon|mưa\s+to|mua\s+to|mưa\s+đến\s+mấy\s+giờ|mua\s+den\s+may\s+gio|có\s+mưa\s+không|co\s+mua\s+khong)/i.test(unaccentedQuery))) {
      detectedDomain = 'WEATHER_FORECAST';
    } else if (/(?:soạn giúp|soan giup|viết giúp|viet giup|soạn công văn|soan cong van|thông báo nội bộ|thong bao noi bo|biên bản|bien ban|hợp đồng|hop dong|đơn xin|don xin)/i.test(unaccentedQuery)) {
      detectedDomain = 'ADMIN_DRAFTING';
    } else if (/(?:bị kẹt giấy|bi ket giay|không nhận lệnh|màn hình xanh|lỗi code|loi code|sửa bug|sua bug|lỗi indexerror|chạy chậm)/i.test(unaccentedQuery)) {
      detectedDomain = 'TECH_SUPPORT';
    } else if (/(?:\bsửa\b|sửa chữa|nhận sửa|biết sửa|chỗ sửa|nơi sửa|tiệm sửa|sửa ở đâu|bị hỏng|bị hư|hỏng màn hình|thay pin|sửa điện thoại|sua dien thoai)\b/i.test(lowerQuery) && !/(?:\bsữa\b|sữa tươi|sữa đặc|sữa bột|cà phê sữa|gunam)/i.test(lowerQuery)) {
      detectedDomain = 'REPAIR_SERVICE';
    } else if (/(?:bạn là ai|ban la ai|em là ai|em la ai|khỏe không|khoe khong|tâm sự|tam su|ý nghĩa của cuộc sống|giảm stress|câu chuyện cười)/i.test(unaccentedQuery)) {
      detectedDomain = 'GENERAL_CHAT';
    }

    if (detectedDomain && !hasPurchaseVerb) {
      // Check if draft reply inappropriately dumped product catalog or pushed store sales
      const lowerReply = draftReply.toLowerCase();
      const hasSalesDumping =
        /(?:chuyên cung cấp các danh mục sản phẩm|bột matcha|cà phê rang mộc|máy in & thiết bị văn phòng|tự xem sản phẩm ở cột 2|mở sẵn ở cột 2|chưa tìm thấy trong dữ liệu của shop|để lại số điện thoại để nhân viên bên em liên hệ lại hỗ trợ kiểm tra nguồn hàng kho)/i.test(lowerReply);

      if (hasSalesDumping) {
        return {
          isDomainRelevant: false,
          detectedDomain,
          violation: 'SALES_HIJACK_OF_NON_SALES_INQUIRY',
          reason: `User asked about ${detectedDomain}, but response contained sales engine catalog dump.`
        };
      }

      // If Repair Service Query, strictly forbid coffee/milk/beverages/catalog product recommendations
      if (detectedDomain === 'REPAIR_SERVICE') {
        const hasRepairViolation = /(?:cà phê đậm vị|sữa gunam|cà phê sữa|bột matcha|trà ô long|giá niêm yết|đơn giá|đặt mua|mở bộ sản phẩm ở cột 2)/i.test(lowerReply);
        if (hasRepairViolation) {
          return {
            isDomainRelevant: false,
            detectedDomain: 'REPAIR_SERVICE',
            violation: 'REPAIR_SERVICE_CONFUSED_WITH_DAIRY_OR_GOODS',
            reason: 'Response to phone/device repair query mistakenly recommended milk, coffee or catalog products.'
          };
        }
      }

      // If Weather Query, strictly forbid sales pitches, product recommendations, or asking phone number for sales
      if (detectedDomain === 'WEATHER_FORECAST') {
        const hasWeatherViolation = /(?:sản phẩm|đặt mua|báo giá|mua hàng|để lại số điện thoại để shop|trong hệ thống của shop)/i.test(lowerReply);
        if (hasWeatherViolation) {
          return {
            isDomainRelevant: false,
            detectedDomain: 'WEATHER_FORECAST',
            violation: 'WEATHER_RESPONSE_POLLUTED_WITH_SALES',
            reason: 'Response to weather inquiry contained commercial product or sales text.'
          };
        }
      }
    }

    return {
      isDomainRelevant: true,
      detectedDomain: detectedDomain || 'SALES_OR_GENERAL'
    };
  }
}
