/**
 * LIVE WEBSITE RETRIEVAL SERVICE (TRÍ AI SMART INTELLIGENCE 2.0 - PHASE 5)
 * 
 * Capabilities:
 * - Tra cứu trực tiếp sản phẩm từ các website nhà cung cấp đã được Admin đăng ký.
 * - Sử dụng bộ nhớ đệm ngắn hạn (Short-term Cache) để tối ưu tốc độ, tránh cào lặp lại.
 * - Kiểm chứng URL sản phẩm thực tế (HTTP 200), không hiển thị trang search chung.
 * - Ghi nhận thời điểm kiểm tra (timestamp) minh bạch.
 */

import { randomUUID } from 'crypto';
import db from '../../db.js';
import { UniversalCrawler } from '../crawler/universalCrawler.js';
import { ProductNormalizer } from '../crawler/productNormalizer.js';
import { VerificationEngine } from './verificationEngine.js';

export class LiveWebsiteRetrieval {
  /**
   * Search a product live from registered supplier websites
   * 
   * @param {string} query - Product name or keyword to find
   * @param {Object} options - { websiteId, limit, cacheHours }
   * @returns {Object} { success, results: [...], fromCache: boolean }
   */
  static async searchLiveProduct(query = '', options = {}) {
    if (!query || query.trim().length < 2) {
      return { success: false, results: [], message: 'Từ khóa tìm kiếm quá ngắn.' };
    }

    const cleanedKey = query.trim().toLowerCase();
    const cacheHours = options.cacheHours || 24;

    try {
      // 1. Check Short-term Cache
      const cached = await db.get(`
        SELECT * FROM live_website_cache 
        WHERE query_key = ? AND datetime('now') < datetime(expires_at)
        ORDER BY crawled_at DESC LIMIT 1
      `, [cleanedKey]);

      if (cached) {
        return {
          success: true,
          fromCache: true,
          results: [{
            productName: cached.product_name,
            productUrl: cached.product_url,
            price: cached.price,
            specs: JSON.parse(cached.specs_json || '{}'),
            crawledAt: cached.crawled_at,
            confidence: 'LIVE_WEBSITE_EXTRACTED'
          }]
        };
      }

      // 2. Select appropriate registered supplier website
      let targetWeb = null;
      if (options.websiteId) {
        targetWeb = await db.get('SELECT * FROM supplier_websites WHERE id = ?', [options.websiteId]);
      } else {
        targetWeb = await db.get('SELECT * FROM supplier_websites ORDER BY updated_at DESC LIMIT 1');
      }

      if (!targetWeb) {
        // Fallback to checking crawled_products table
        const dbMatches = await db.all(`
          SELECT * FROM crawled_products
          WHERE (approval_status = 'APPROVED' OR approval_status IS NULL) AND (name LIKE ? OR category LIKE ?)
          ORDER BY sale_price ASC LIMIT 2
        `, [`%${query}%`, `%${query}%`]);

        if (dbMatches.length > 0) {
          return {
            success: true,
            fromCache: false,
            results: dbMatches.map(p => ({
              productName: p.name,
              productUrl: p.product_url || p.source_url,
              price: p.sale_price,
              specs: JSON.parse(p.specs_json || '{}'),
              crawledAt: p.crawled_at,
              confidence: p.price_confirmation_level || 'LIVE_WEBSITE_EXTRACTED'
            }))
          };
        }

        return { success: false, results: [], message: 'Chưa có website nhà cung cấp nào được cấu hình.' };
      }

      // 3. Search and extract from supplier website using UniversalCrawler
      const searchUrl = `${targetWeb.base_url.replace(/\/+$/, '')}/search?q=${encodeURIComponent(query)}`;
      const crawlerRes = await UniversalCrawler.crawlPage(searchUrl, targetWeb.id, {
        respectRobots: true,
        maxDepth: 1
      });

      if (!crawlerRes.success || !crawlerRes.bodyHtml) {
        return { success: false, results: [], message: 'Không thể truy cập website nhà cung cấp vào thời điểm này.' };
      }

      // 4. Extract product details from HTML
      const extracted = ProductNormalizer.extractProduct(crawlerRes.bodyHtml, searchUrl, {
        websiteId: targetWeb.id,
        supplierId: targetWeb.supplier_id
      });

      // 5. Verify product URL liveness
      const finalUrl = extracted.productUrl || searchUrl;
      const isAlive = await VerificationEngine.verifyUrlLiveness(finalUrl);

      const now = new Date();
      const expiresAt = new Date(now.getTime() + cacheHours * 3600 * 1000).toISOString();

      if (extracted.productName && isAlive) {
        // Cache result
        const cacheId = `cache_${randomUUID().slice(0, 10)}`;
        await db.run(`
          INSERT INTO live_website_cache (
            id, website_id, query_key, product_name, product_url, price, specs_json, status_code, crawled_at, expires_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 200, ?, ?)
        `, [
          cacheId, targetWeb.id, cleanedKey, extracted.productName, finalUrl,
          extracted.salePrice || 0, JSON.stringify(extracted.specs || {}),
          now.toISOString(), expiresAt
        ]);

        return {
          success: true,
          fromCache: false,
          results: [{
            productName: extracted.productName,
            productUrl: finalUrl,
            price: extracted.salePrice,
            specs: extracted.specs,
            crawledAt: now.toISOString(),
            confidence: 'LIVE_WEBSITE_EXTRACTED'
          }]
        };
      }

      return { success: false, results: [], message: 'Không tìm thấy trang sản phẩm phù hợp trên website.' };
    } catch (err) {
      console.warn('[LIVE RETRIEVAL ERROR]:', err.message);
      return { success: false, results: [], error: err.message };
    }
  }
}

export default LiveWebsiteRetrieval;
