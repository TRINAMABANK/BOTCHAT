/**
 * TRÍ AI ULTIMATE ROBOT - UNIVERSAL CRAWLER ENGINE
 * Orchestrates respectful, rate-limited crawling of supplier eCommerce websites.
 * Adheres strictly to RFC 9309 robots.txt rules, sitemap discovery,
 * 22-field normalization, and audit-logged price history.
 */

import { db } from '../../db.js';
import RobotsChecker from './robotsChecker.js';
import SitemapParser from './sitemapParser.js';
import ProductNormalizer from './productNormalizer.js';
import * as cheerio from 'cheerio';
import crypto from 'crypto';

const activeJobs = new Map(); // jobId -> abortController

export class UniversalCrawler {
  /**
   * Helper sleep for rate limiting
   */
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Extract HTML links from a page that may lead to products or catalog pages
   */
  static extractPageLinks(html, currentUrl) {
    const links = new Set();
    try {
      const $ = cheerio.load(html);
      const origin = new URL(currentUrl).origin;

      $('a[href]').each((_, el) => {
        let href = $(el).attr('href');
        if (!href) return;
        href = href.trim();
        if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

        try {
          const absolute = new URL(href, currentUrl).href;
          if (absolute.startsWith(origin)) {
            // Strip hash
            const cleanUrl = absolute.split('#')[0];
            links.add(cleanUrl);
          }
        } catch (e) {}
      });
    } catch (e) {}
    return Array.from(links);
  }

  /**
   * Start a crawl job for a registered supplier website
   */
  static async startCrawl({ websiteId, maxUrls = 30, depth = 2 }) {
    // 1. Get website and supplier info
    const website = await db.get(`
      SELECT w.*, s.name as supplier_name 
      FROM supplier_websites w
      JOIN supplier_organizations s ON w.supplier_id = s.id
      WHERE w.id = ?
    `, [websiteId]);

    if (!website) {
      throw new Error(`Website not found with ID: ${websiteId}`);
    }

    const now = new Date().toISOString();
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const abortController = new AbortController();
    activeJobs.set(jobId, abortController);

    // 2. Initialize crawl_jobs record
    await db.run(`
      INSERT INTO crawl_jobs (id, website_id, supplier_id, status, urls_discovered, urls_crawled, products_found, products_new, products_updated, errors_count, error_log_json, started_at, created_at)
      VALUES (?, ?, ?, 'RUNNING', 0, 0, 0, 0, 0, 0, '[]', ?, ?)
    `, [jobId, website.id, website.supplier_id, now, now]);

    await db.run(`
      UPDATE supplier_websites 
      SET last_status = 'CRAWLING', updated_at = ?
      WHERE id = ?
    `, [now, website.id]);

    // Run crawler asynchronously in background
    (async () => {
      let urlsDiscovered = 0;
      let urlsCrawled = 0;
      let productsFound = 0;
      let productsNew = 0;
      let productsUpdated = 0;
      let errorsCount = 0;
      const errorLogs = [];

      try {
        console.log(`[CRAWLER START] Starting crawl job ${jobId} for website: ${website.url}`);

        // 3. Check robots.txt compliance
        const robotsCheck = await RobotsChecker.isAllowed(website.url);
        if (!robotsCheck.allowed) {
          throw new Error(`Crawling not allowed by robots.txt: ${robotsCheck.reason}`);
        }

        const crawlDelayMs = Math.max(400, Math.round((robotsCheck.crawlDelay || 0.5) * 1000));
        console.log(`[CRAWLER] Using crawl delay: ${crawlDelayMs}ms`);

        // 4. Discover candidate URLs
        const candidateUrls = new Set();

        // 4A. Sitemap discovery
        const sitemapUrls = await SitemapParser.discoverProductUrls(website.url, maxUrls);
        sitemapUrls.forEach(u => candidateUrls.add(u));
        console.log(`[CRAWLER] Discovered ${sitemapUrls.length} product URLs via sitemaps`);

        // 4B. If sitemap yielded few URLs, crawl homepage to find product links
        if (candidateUrls.size < 5) {
          try {
            console.log(`[CRAWLER] Crawling homepage to discover catalog links: ${website.url}`);
            const homeResp = await fetch(website.url, {
              signal: abortController.signal,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 (compatible; TriAIRobot/1.0; +https://quangnhuttri.com)'
              }
            });
            if (homeResp.ok) {
              const homeHtml = await homeResp.text();
              const pageLinks = UniversalCrawler.extractPageLinks(homeHtml, website.url);
              for (const link of pageLinks) {
                if (SitemapParser.isLikelyProductUrl(link)) {
                  candidateUrls.add(link);
                  if (candidateUrls.size >= maxUrls) break;
                }
              }
            }
          } catch (e) {
            console.warn(`[CRAWLER] Homepage discovery error:`, e.message);
          }
        }

        // If site itself is a single direct product URL, add it
        candidateUrls.add(website.url);

        const urlList = Array.from(candidateUrls).slice(0, maxUrls);
        urlsDiscovered = urlList.length;

        await db.run(`
          UPDATE crawl_jobs 
          SET urls_discovered = ? 
          WHERE id = ?
        `, [urlsDiscovered, jobId]);

        // Insert into crawl_urls frontier
        for (const url of urlList) {
          const urlId = `curl_${crypto.createHash('md5').update(jobId + url).digest('hex').substring(0, 12)}`;
          await db.run(`
            INSERT OR IGNORE INTO crawl_urls (id, job_id, website_id, url, url_type, depth, crawl_status, created_at)
            VALUES (?, ?, ?, ?, 'PRODUCT', 1, 'PENDING', ?)
          `, [urlId, jobId, website.id, url, new Date().toISOString()]);
        }

        // 5. Process URLs
        for (const targetUrl of urlList) {
          if (abortController.signal.aborted) {
            console.log(`[CRAWLER STOPPED] Crawl job ${jobId} was aborted by user.`);
            break;
          }

          // Check robots.txt for this specific URL
          const urlCheck = await RobotsChecker.isAllowed(targetUrl);
          if (!urlCheck.allowed) {
            await db.run(`
              UPDATE crawl_urls 
              SET crawl_status = 'SKIPPED', error_message = ? 
              WHERE job_id = ? AND url = ?
            `, [urlCheck.reason, jobId, targetUrl]);
            continue;
          }

          // Respect crawl delay (rate limit)
          await UniversalCrawler.sleep(crawlDelayMs);

          try {
            const fetchController = new AbortController();
            const fetchTimeout = setTimeout(() => fetchController.abort(), 8000);

            const resp = await fetch(targetUrl, {
              signal: fetchController.signal,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 (compatible; TriAIRobot/1.0; +https://quangnhuttri.com)'
              }
            });
            clearTimeout(fetchTimeout);

            const httpStatus = resp.status;
            if (!resp.ok) {
              errorsCount++;
              errorLogs.push({ url: targetUrl, status: httpStatus, error: `HTTP ${httpStatus}` });
              await db.run(`
                UPDATE crawl_urls 
                SET http_status = ?, crawl_status = 'FAILED', error_message = ?, crawled_at = ?
                WHERE job_id = ? AND url = ?
              `, [httpStatus, `HTTP error ${httpStatus}`, new Date().toISOString(), jobId, targetUrl]);
              continue;
            }

            const html = await resp.text();

            // Normalize product data
            const product = ProductNormalizer.normalize({
              html,
              productUrl: targetUrl,
              supplierId: website.supplier_id,
              websiteId: website.id,
              categoryHint: website.category_hint
            });

            // Discard if invalid name or empty page
            if (!product.name || product.name === 'Sản phẩm chưa đặt tên' || product.data_confidence < 0.3) {
              await db.run(`
                UPDATE crawl_urls 
                SET http_status = ?, crawl_status = 'SKIPPED', error_message = 'Not a recognizable product page', crawled_at = ?
                WHERE job_id = ? AND url = ?
              `, [httpStatus, new Date().toISOString(), jobId, targetUrl]);
              continue;
            }

            // Deduplication and Price History Tracking
            const existingProduct = await db.get(`
              SELECT * FROM crawled_products 
              WHERE product_url = ? OR (sku = ? AND supplier_id = ?)
            `, [product.product_url, product.sku, website.supplier_id]);

            const crawlTimestamp = new Date().toISOString();

            if (existingProduct) {
              // Check if sale price changed
              if (existingProduct.sale_price !== product.sale_price && product.sale_price > 0 && existingProduct.sale_price > 0) {
                const oldPrice = existingProduct.sale_price;
                const newPrice = product.sale_price;
                const changePercent = Math.round(((newPrice - oldPrice) / oldPrice) * 10000) / 100;

                const historyId = `ph_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
                await db.run(`
                  INSERT INTO product_price_history (id, product_id, old_price, new_price, price_type, changed_at, change_percent, job_id, source_url)
                  VALUES (?, ?, ?, ?, 'sale_price', ?, ?, ?, ?)
                `, [historyId, existingProduct.id, oldPrice, newPrice, crawlTimestamp, changePercent, jobId, targetUrl]);

                console.log(`[PRICE CHANGE DETECTED] Product "${product.name}": ${oldPrice} -> ${newPrice} (${changePercent}%)`);
              }

              // Update existing product with refreshed specs/prices
              await db.run(`
                UPDATE crawled_products 
                SET sale_price = ?, original_price = ?, specs_json = ?, description = ?, image_url = ?, data_confidence = ?, crawled_at = ?, updated_at = ?
                WHERE id = ?
              `, [product.sale_price, product.original_price, product.specs_json, product.description, product.image_url, product.data_confidence, crawlTimestamp, crawlTimestamp, existingProduct.id]);

              productsUpdated++;
            } else {
              // Insert new product record (PENDING approval)
              await db.run(`
                INSERT INTO crawled_products (
                  id, supplier_id, website_id, product_id, name, sku, brand, category, description,
                  specs_json, original_price, sale_price, currency, unit, availability, image_url,
                  product_url, source_url, crawled_at, approval_status, price_confirmation_level,
                  data_confidence, org_id, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 'REFERENCE_ONLY', ?, 'org_default', ?, ?)
              `, [
                product.id, product.supplier_id, product.website_id, product.product_id, product.name, product.sku,
                product.brand, product.category, product.description, product.specs_json, product.original_price,
                product.sale_price, product.currency, product.unit, product.availability, product.image_url,
                product.product_url, product.source_url, crawlTimestamp, product.data_confidence,
                crawlTimestamp, crawlTimestamp
              ]);

              productsNew++;
            }

            productsFound++;
            urlsCrawled++;

            await db.run(`
              UPDATE crawl_urls 
              SET http_status = ?, crawl_status = 'CRAWLED', crawled_at = ?
              WHERE job_id = ? AND url = ?
            `, [httpStatus, crawlTimestamp, jobId, targetUrl]);

          } catch (fetchErr) {
            errorsCount++;
            errorLogs.push({ url: targetUrl, error: fetchErr.message });
            await db.run(`
              UPDATE crawl_urls 
              SET crawl_status = 'FAILED', error_message = ?, crawled_at = ?
              WHERE job_id = ? AND url = ?
            `, [fetchErr.message, new Date().toISOString(), jobId, targetUrl]);
          }

          // Progress update to crawl_jobs
          await db.run(`
            UPDATE crawl_jobs 
            SET urls_crawled = ?, products_found = ?, products_new = ?, products_updated = ?, errors_count = ?
            WHERE id = ?
          `, [urlsCrawled, productsFound, productsNew, productsUpdated, errorsCount, jobId]);
        }

        // 6. Complete Job
        const finishTimestamp = new Date().toISOString();
        const finalStatus = abortController.signal.aborted ? 'STOPPED' : 'COMPLETED';

        await db.run(`
          UPDATE crawl_jobs 
          SET status = ?, urls_crawled = ?, products_found = ?, products_new = ?, products_updated = ?, errors_count = ?, error_log_json = ?, finished_at = ?
          WHERE id = ?
        `, [finalStatus, urlsCrawled, productsFound, productsNew, productsUpdated, errorsCount, JSON.stringify(errorLogs), finishTimestamp, jobId]);

        // Update website count and status
        const totalWebsiteProducts = await db.get(`
          SELECT COUNT(*) as count FROM crawled_products WHERE website_id = ?
        `, [website.id]);

        await db.run(`
          UPDATE supplier_websites 
          SET last_status = 'SUCCESS', last_crawled_at = ?, products_count = ?, updated_at = ?
          WHERE id = ?
        `, [finishTimestamp, totalWebsiteProducts ? totalWebsiteProducts.count : 0, finishTimestamp, website.id]);

        console.log(`[CRAWLER COMPLETED] Job ${jobId} finished. Found: ${productsFound}, New: ${productsNew}, Updated: ${productsUpdated}, Errors: ${errorsCount}`);

      } catch (jobErr) {
        console.error(`[CRAWLER FAILED] Job ${jobId} failed:`, jobErr);
        const failTimestamp = new Date().toISOString();
        errorLogs.push({ fatal: jobErr.message });

        await db.run(`
          UPDATE crawl_jobs 
          SET status = 'FAILED', errors_count = errors_count + 1, error_log_json = ?, finished_at = ?
          WHERE id = ?
        `, [JSON.stringify(errorLogs), failTimestamp, jobId]);

        await db.run(`
          UPDATE supplier_websites 
          SET last_status = 'FAILED', updated_at = ?
          WHERE id = ?
        `, [failTimestamp, website.id]);
      } finally {
        activeJobs.delete(jobId);
      }
    })();

    return { jobId, status: 'RUNNING', websiteId: website.id };
  }

  /**
   * Stop an ongoing crawl job
   */
  static stopCrawl(jobId) {
    const controller = activeJobs.get(jobId);
    if (controller) {
      controller.abort();
      activeJobs.delete(jobId);
      return true;
    }
    return false;
  }
}

export default UniversalCrawler;
