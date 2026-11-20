/**
 * TRÍ AI ULTIMATE ROBOT - SITEMAP PARSER
 * Discovers and recursively parses XML sitemaps and sitemap indexes.
 * Filters eCommerce product URLs cleanly.
 */

import RobotsChecker from './robotsChecker.js';

export class SitemapParser {
  /**
   * Extract <loc> tag contents from XML string using RegExp
   */
  static extractLocTags(xmlText) {
    const locRegex = /<loc>\s*(https?:\/\/[^\s<]+)\s*<\/loc>/gi;
    const urls = [];
    let match;
    while ((match = locRegex.exec(xmlText)) !== null) {
      urls.push(match[1].trim());
    }
    return urls;
  }

  /**
   * Determine if an XML is a sitemap index (contains other sitemaps)
   */
  static isSitemapIndex(xmlText) {
    return /<sitemapindex/i.test(xmlText);
  }

  /**
   * Check if a URL looks like a product URL based on typical eCommerce patterns
   */
  static isLikelyProductUrl(url) {
    try {
      const parsed = new URL(url);
      const path = parsed.pathname.toLowerCase();

      // Strong product URL patterns
      const productPatterns = [
        /\/san-pham\//,
        /\/product\//,
        /\/products\//,
        /\/item\//,
        /\/p\//,
        /\/shop\/[^\/]+\/[^\/]+/,
        /\/hang-hoa\//,
        /\/chi-tiet-san-pham\//,
        /\/chi-tiet\//,
        /\.html$/
      ];

      // Non-product blacklists (categories, tags, accounts, blogs)
      const nonProductPatterns = [
        /\/category\//,
        /\/danh-muc\//,
        /\/tag\//,
        /\/cart/,
        /\/checkout/,
        /\/account/,
        /\/tai-khoan/,
        /\/tin-tuc\//,
        /\/blog\//,
        /\/author\//,
        /\/page\//,
        /\/lien-he/,
        /\/gioi-thieu/
      ];

      for (const pattern of nonProductPatterns) {
        if (pattern.test(path)) return false;
      }

      for (const pattern of productPatterns) {
        if (pattern.test(path)) return true;
      }

      // If URL has at least 2 path segments and not in non-product list, might be a product
      const segments = path.split('/').filter(Boolean);
      return segments.length >= 2;
    } catch {
      return false;
    }
  }

  /**
   * Discover and fetch all product URLs from domain sitemaps
   * @param {string} baseUrl
   * @param {number} maxUrls
   */
  static async discoverProductUrls(baseUrl, maxUrls = 50) {
    try {
      const origin = new URL(baseUrl).origin;
      const discoveredProductUrls = new Set();
      const sitemapsToFetch = new Set();

      // 1. Check robots.txt sitemaps
      const robotsSitemaps = await RobotsChecker.getSitemaps(baseUrl);
      robotsSitemaps.forEach(s => sitemapsToFetch.add(s));

      // 2. Add common default sitemaps
      sitemapsToFetch.add(`${origin}/sitemap.xml`);
      sitemapsToFetch.add(`${origin}/sitemap_index.xml`);
      sitemapsToFetch.add(`${origin}/product-sitemap.xml`);

      const fetchedSitemaps = new Set();

      for (const sitemapUrl of sitemapsToFetch) {
        if (fetchedSitemaps.has(sitemapUrl)) continue;
        fetchedSitemaps.add(sitemapUrl);

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 7000);

          const resp = await fetch(sitemapUrl, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; TriAIRobot/1.0; +https://quangnhuttri.com)'
            }
          });
          clearTimeout(timeoutId);

          if (!resp.ok) continue;

          const xml = await resp.text();
          const locs = SitemapParser.extractLocTags(xml);

          if (SitemapParser.isSitemapIndex(xml)) {
            // Nested sitemaps: prioritize ones containing 'product' or 'san-pham'
            for (const childSitemap of locs) {
              if (/product|san-pham|goods|items/i.test(childSitemap)) {
                sitemapsToFetch.add(childSitemap);
              } else if (sitemapsToFetch.size < 10) {
                sitemapsToFetch.add(childSitemap);
              }
            }
          } else {
            // Regular sitemap with URLs
            for (const url of locs) {
              if (SitemapParser.isLikelyProductUrl(url)) {
                discoveredProductUrls.add(url);
                if (discoveredProductUrls.size >= maxUrls) break;
              }
            }
          }

          if (discoveredProductUrls.size >= maxUrls) break;
        } catch (err) {
          // Ignore individual sitemap failure
        }
      }

      return Array.from(discoveredProductUrls);
    } catch (err) {
      console.warn(`[SITEMAP ERROR] Error processing sitemaps for ${baseUrl}:`, err.message);
      return [];
    }
  }
}

export default SitemapParser;
