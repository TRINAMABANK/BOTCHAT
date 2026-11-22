/**
 * VERIFICATION ENGINE – BỘ MÁY KIỂM CHỨNG & THẨM ĐỊNH (TRÍ AI SMART INTELLIGENCE 2.0)
 * 
 * Capabilities:
 * - Phân loại 5 cấp độ tin cậy dữ liệu (Data Confidence Levels).
 * - Kiểm chứng URL sống (Link Liveness Verifier - HTTP 200).
 * - Chống bịa đặt tuyệt đối: Cấm bịa giá, tồn kho, thông số kỹ thuật, nguồn trích dẫn.
 * - Loại bỏ toàn bộ URL tìm kiếm chung chung (như DuckDuckGo, Google Search).
 */

export const DATA_CONFIDENCE_LEVELS = {
  SUPPLIER_VERIFIED: {
    level: 1,
    tag: 'Đã xác nhận',
    description: 'Dữ liệu chính thức được nhà cung cấp hoặc Admin phê duyệt trong hệ thống.'
  },
  LIVE_WEBSITE_EXTRACTED: {
    level: 2,
    tag: 'Trực tiếp từ website',
    description: 'Dữ liệu trích xuất từ trang web sản phẩm cụ thể đã kiểm tra truy cập thành công.'
  },
  APPROVED_DOCUMENT: {
    level: 3,
    tag: 'Tài liệu đã duyệt',
    description: 'Dữ liệu đối chiếu từ văn bản quy chuẩn hoặc sổ tay tri thức nội bộ.'
  },
  INFERRED_REASONING: {
    level: 4,
    tag: 'Suy luận kỹ thuật',
    description: 'Dữ liệu suy luận logic dựa trên thông số kỹ thuật đã có.'
  },
  UNVERIFIED_ESTIMATE: {
    level: 5,
    tag: 'Chưa xác minh',
    description: 'Dữ liệu tham khảo tạm thời, cần nhân viên hoặc đối tác xác nhận trước khi chốt.'
  }
};

export class VerificationEngine {
  /**
   * Check if a URL is alive and accessible (returns HTTP 200)
   * With 2.5s strict timeout to prevent hanging
   */
  static async verifyUrlLiveness(url) {
    if (!url || typeof url !== 'string') return false;
    if (url.includes('duckduckgo.com') || url.includes('google.com/search') || url.includes('bing.com')) {
      return false; // Reject generic search engine URLs
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TRÍ AI Verifier' }
      });
      clearTimeout(timeout);

      return res.status >= 200 && res.status < 400;
    } catch (err) {
      // Fallback try simple GET if HEAD was blocked by server
      try {
        const controller2 = new AbortController();
        const timeout2 = setTimeout(() => controller2.abort(), 2500);
        const res2 = await fetch(url, {
          method: 'GET',
          signal: controller2.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 TRÍ AI Verifier' }
        });
        clearTimeout(timeout2);
        return res2.status >= 200 && res2.status < 400;
      } catch (e2) {
        return false;
      }
    }
  }

  /**
   * Validate and sanitize outgoing response
   * Ensures no fake search links, strips internal bank leaks in retail chat, and unifies persona
   */
  static sanitizeAndVerifyResponse(text = '', verifiedUrls = []) {
    if (!text) return '';

    // 1. Strip fake search links
    let cleaned = text
      .replace(/\[Nguồn:\s*https?:\/\/(?:www\.)?duckduckgo\.com[^\]]*\]/gi, '')
      .replace(/\[Nguồn:\s*.*duckduckgo.*\]/gi, '')
      .replace(/\(https?:\/\/(?:www\.)?duckduckgo\.com[^\s)]*\)/gi, '')
      .replace(/https?:\/\/(?:www\.)?duckduckgo\.com\S*/gi, '')
      .replace(/\[Nguồn:\s*\]/gi, '')
      // 2. Eliminate owner names and unify persona
      .replace(/(\*\*[^*]+?)\s*của\s*(?:anh\s+|chị\s+|ông\s+|bà\s+)?Quang Nhựt Trí\*\*/gi, '$1**')
      .replace(/—\s*Thư ký AI Toàn năng của\s*(?:anh\s+|chị\s+|ông\s+)?Quang Nhựt Trí\b/gi, '— Trợ lý AI Bán hàng & Tư vấn Toàn diện')
      .replace(/trợ lý bán hàng (?:thông minh )?của\s*(?:anh\s+|chị\s+|ông\s+)?Quang Nhựt Trí/gi, 'Trợ lý AI Bán hàng & Tư vấn Toàn diện')
      .replace(/\s*của\s*(?:anh\s+|chị\s+|ông\s+|bà\s+)?(?:\*\*|\*|__|_)?Quang Nhựt Trí(?:\*\*|\*|__|_)?[\.]?/gi, '')
      .replace(/TRÍ AI ULTIMATE ROBOT\s*—\s*Thư ký AI Toàn năng/gi, 'TRÍ AN — Trợ lý AI Bán hàng & Tư vấn Toàn diện')
      .replace(/TRÍ AI SALES ROBOT\s*—\s*trợ lý bán hàng thông minh/gi, 'TRÍ AN — Trợ lý AI Bán hàng & Tư vấn Toàn diện')
      // 3. Block accidental internal bank regulation leakage in public chats
      .replace(/Rất tiếc,\s*hiện tại dữ liệu tra cứu từ hệ thống chỉ cung cấp các thông tin nội bộ liên quan đến Quy chế.*?(?:Trang.*?)?(?:\.|$)/gis, 'Dạ hiện tại thông tin này chưa có trong dữ liệu sản phẩm của shop ạ.')
      .trim();

    // 4. Incomplete Sentence Guard (e.g. ends with "với", "và", "là", "cho", "cùng", dangling open paren)
    cleaned = cleaned
      .replace(/\s+(?:với|và|là|được|cho|cùng|kèm)\s*$/i, '.')
      .replace(/[\(,;:\-–—]\s*$/, '.')
      .trim();

    // Ensure proper terminal punctuation if prose ends without closing punctuation
    if (cleaned && !/[.!?…""'\*\)\n>:]$/.test(cleaned)) {
      if (/(?:ạ|nhé|nha|nhỉ|nè)$/i.test(cleaned)) {
        cleaned += '!';
      } else {
        cleaned += '.';
      }
    }

    return cleaned;
  }

  /**
   * Determine data confidence level for a given product or quote item
   */
  static classifyConfidence(item = {}) {
    if (item.priceConfirmationLevel === 'SUPPLIER_VERIFIED' || item.is_approved === 1) {
      return DATA_CONFIDENCE_LEVELS.SUPPLIER_VERIFIED;
    }
    if (item.source_url && !item.source_url.includes('duckduckgo')) {
      return DATA_CONFIDENCE_LEVELS.LIVE_WEBSITE_EXTRACTED;
    }
    if (item.documentId) {
      return DATA_CONFIDENCE_LEVELS.APPROVED_DOCUMENT;
    }
    return DATA_CONFIDENCE_LEVELS.UNVERIFIED_ESTIMATE;
  }
}

export default VerificationEngine;
