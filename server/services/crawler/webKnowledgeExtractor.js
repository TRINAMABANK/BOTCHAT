/**
 * TRÍ AI ONE SUPER BRAIN - WEB KNOWLEDGE EXTRACTOR
 * 
 * Extracts clean, high-signal educational and business articles, policies,
 * documentation, and news from raw web pages.
 * Strips HTML boilerplate (navbars, headers, footers, sidebars, ads, scripts).
 * Generates SHA-256 content checksum for deduplication.
 */

import * as cheerio from 'cheerio';
import crypto from 'crypto';

export class WebKnowledgeExtractor {
  /**
   * Extract clean article text, metadata, and hash from raw HTML
   * @param {string} html - Raw HTML source
   * @param {string} sourceUrl - Original URL
   * @returns {object} Extracted article payload
   */
  static extract(html = '', sourceUrl = '') {
    if (!html || typeof html !== 'string') {
      return {
        success: false,
        title: 'Trang web không có nội dung',
        cleanText: '',
        contentHash: '',
        charCount: 0,
        sourceUrl
      };
    }

    try {
      const $ = cheerio.load(html);

      // 1. Remove non-content tags & boilerplate elements
      $('script, style, noscript, nav, header, footer, aside, form, svg, iframe, select, button, .ads, .sidebar, .banner, .footer, .menu, .cookie-banner').remove();

      // 2. Extract Document Title
      let title = $('meta[property="og:title"]').attr('content')
        || $('title').text()
        || $('h1').first().text()
        || '';
      title = title.replace(/\s+/g, ' ').trim();
      if (!title && sourceUrl) {
        try {
          title = `Trang web: ${new URL(sourceUrl).hostname}`;
        } catch {
          title = 'Tài liệu web đã cào';
        }
      }

      // 3. Extract description
      const metaDesc = $('meta[name="description"]').attr('content')
        || $('meta[property="og:description"]').attr('content')
        || '';

      // 4. Extract structured paragraphs, headings, and lists
      const contentParts = [];
      if (metaDesc.trim()) {
        contentParts.push(`[Mô tả]: ${metaDesc.trim()}`);
      }

      $('h1, h2, h3, h4, p, li, blockquote, table').each((_, el) => {
        const tagName = el.tagName.toLowerCase();
        const text = $(el).text().replace(/\s+/g, ' ').trim();

        if (!text || text.length < 15) return;

        if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3') {
          contentParts.push(`\n### ${text}\n`);
        } else if (tagName === 'li') {
          contentParts.push(`• ${text}`);
        } else {
          contentParts.push(text);
        }
      });

      let cleanText = contentParts.join('\n\n').trim();

      // If text extraction yielded too little, fallback to body text
      if (cleanText.length < 80) {
        cleanText = $('body').text().replace(/\s+/g, ' ').trim();
      }

      // 5. Compute SHA-256 Content Hash for deduplication
      const contentHash = crypto.createHash('sha256').update(cleanText).digest('hex');

      return {
        success: cleanText.length > 50,
        title,
        cleanText,
        contentHash,
        charCount: cleanText.length,
        sourceUrl
      };
    } catch (err) {
      console.error('[WEB KNOWLEDGE EXTRACTOR] Extraction failed:', err.message);
      return {
        success: false,
        title: 'Lỗi bóc tách nội dung web',
        cleanText: '',
        contentHash: '',
        charCount: 0,
        sourceUrl,
        error: err.message
      };
    }
  }
}

export default WebKnowledgeExtractor;
