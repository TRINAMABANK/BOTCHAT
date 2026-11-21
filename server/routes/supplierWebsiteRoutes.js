/**
 * TRÍ AI ULTIMATE ROBOT - SUPPLIER WEBSITES & QUOTATIONS ROUTER
 * Handles CRUD for Supplier Organizations, Websites, Crawl Jobs,
 * Product Catalog Review & Approval, Price History, and Formal Quotations.
 */

import express from 'express';
import { db } from '../db.js';
import UniversalCrawler from '../services/crawler/universalCrawler.js';
import crypto from 'crypto';
import { requireAdmin } from '../middleware/authMiddleware.js';
import { isSafePublicUrl } from '../utils/ssrfProtection.js';

const router = express.Router();

// Enforce Admin Authentication on all Supplier Website Center endpoints
router.use(requireAdmin);

// =============================================================================
// 1. STATS & DASHBOARD SUMMARY (Screen 12)
// =============================================================================
router.get('/stats', async (req, res) => {
  try {
    const suppliersCount = await db.get('SELECT COUNT(*) as count FROM supplier_organizations WHERE is_active = 1');
    const websitesCount = await db.get('SELECT COUNT(*) as count FROM supplier_websites');
    const productsCount = await db.get('SELECT COUNT(*) as count FROM crawled_products');
    const approvedCount = await db.get("SELECT COUNT(*) as count FROM crawled_products WHERE approval_status = 'APPROVED'");
    const pendingCount = await db.get("SELECT COUNT(*) as count FROM crawled_products WHERE approval_status = 'PENDING'");
    const priceChangesCount = await db.get('SELECT COUNT(*) as count FROM product_price_history');
    const runningJobsCount = await db.get("SELECT COUNT(*) as count FROM crawl_jobs WHERE status = 'RUNNING'");
    const avgConfidence = await db.get('SELECT AVG(data_confidence) as avg FROM crawled_products');

    res.json({
      success: true,
      data: {
        totalSuppliers: suppliersCount?.count || 0,
        totalWebsites: websitesCount?.count || 0,
        totalProducts: productsCount?.count || 0,
        approvedProducts: approvedCount?.count || 0,
        pendingReviewProducts: pendingCount?.count || 0,
        totalPriceChanges: priceChangesCount?.count || 0,
        runningCrawlJobs: runningJobsCount?.count || 0,
        averageConfidence: Math.round((avgConfidence?.avg || 0) * 100) / 100
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// 2. SUPPLIER ORGANIZATIONS CRUD
// =============================================================================
router.get('/suppliers', async (req, res) => {
  try {
    const suppliers = await db.all(`
      SELECT s.*, 
        (SELECT COUNT(*) FROM supplier_websites w WHERE w.supplier_id = s.id) as websites_count,
        (SELECT COUNT(*) FROM crawled_products p WHERE p.supplier_id = s.id) as products_count
      FROM supplier_organizations s
      ORDER BY s.created_at DESC
    `);
    res.json({ success: true, data: suppliers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/suppliers', async (req, res) => {
  try {
    const { name, contact_email, contact_phone, address, notes } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Tên nhà cung cấp là bắt buộc' });
    }

    const id = `supp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    await db.run(`
      INSERT INTO supplier_organizations (id, name, contact_email, contact_phone, address, notes, org_id, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'org_default', 1, ?, ?)
    `, [id, name.trim(), contact_email || '', contact_phone || '', address || '', notes || '', now, now]);

    const created = await db.get('SELECT * FROM supplier_organizations WHERE id = ?', [id]);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/suppliers/:id', async (req, res) => {
  try {
    const { name, contact_email, contact_phone, address, notes, is_active } = req.body;
    const now = new Date().toISOString();

    await db.run(`
      UPDATE supplier_organizations 
      SET name = COALESCE(?, name),
          contact_email = COALESCE(?, contact_email),
          contact_phone = COALESCE(?, contact_phone),
          address = COALESCE(?, address),
          notes = COALESCE(?, notes),
          is_active = COALESCE(?, is_active),
          updated_at = ?
      WHERE id = ?
    `, [name, contact_email, contact_phone, address, notes, is_active, now, req.params.id]);

    const updated = await db.get('SELECT * FROM supplier_organizations WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/suppliers/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM supplier_organizations WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Nhà cung cấp đã được xóa' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// 3. SUPPLIER WEBSITES CRUD (Screens 1, 2, 3, 10)
// =============================================================================
router.get('/websites', async (req, res) => {
  try {
    const websites = await db.all(`
      SELECT w.*, s.name as supplier_name,
        (SELECT COUNT(*) FROM crawled_products p WHERE p.website_id = w.id) as products_count,
        (SELECT COUNT(*) FROM crawled_products p WHERE p.website_id = w.id AND p.approval_status = 'APPROVED') as approved_products_count
      FROM supplier_websites w
      JOIN supplier_organizations s ON w.supplier_id = s.id
      ORDER BY w.created_at DESC
    `);
    res.json({ success: true, data: websites });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/websites', async (req, res) => {
  try {
    const { supplier_id, name, url, category_hint, crawl_frequency = 'DAILY', auto_crawl = 0 } = req.body;
    if (!url || !url.trim()) {
      return res.status(400).json({ success: false, error: 'URL website là bắt buộc' });
    }

    // Validate URL format and SSRF safety
    const ssrfCheck = await isSafePublicUrl(url);
    if (!ssrfCheck.safe) {
      return res.status(400).json({ success: false, error: `URL không hợp lệ: ${ssrfCheck.reason}` });
    }
    const cleanUrl = ssrfCheck.cleanUrl;

    const now = new Date().toISOString();
    const id = `web_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const websiteName = (name && name.trim()) || new URL(cleanUrl).hostname;

    await db.run(`
      INSERT INTO supplier_websites (id, supplier_id, name, url, category_hint, crawl_frequency, last_status, products_count, auto_crawl, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'IDLE', 0, ?, ?, ?)
    `, [id, supplier_id || 'supp_default', websiteName, cleanUrl, category_hint || '', crawl_frequency, auto_crawl ? 1 : 0, now, now]);

    const created = await db.get('SELECT * FROM supplier_websites WHERE id = ?', [id]);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/websites/:id', async (req, res) => {
  try {
    const { name, url, category_hint, crawl_frequency, auto_crawl } = req.body;
    const now = new Date().toISOString();

    await db.run(`
      UPDATE supplier_websites 
      SET name = COALESCE(?, name),
          url = COALESCE(?, url),
          category_hint = COALESCE(?, category_hint),
          crawl_frequency = COALESCE(?, crawl_frequency),
          auto_crawl = COALESCE(?, auto_crawl),
          updated_at = ?
      WHERE id = ?
    `, [name, url, category_hint, crawl_frequency, auto_crawl, now, req.params.id]);

    const updated = await db.get('SELECT * FROM supplier_websites WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/websites/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM supplier_websites WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Website và dữ liệu liên quan đã được xóa' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// 4. CRAWL JOBS & EXECUTION (Screens 4, 11)
// =============================================================================
router.post('/websites/:id/crawl', async (req, res) => {
  try {
    const { maxUrls = 40, depth = 2 } = req.body;
    const websiteId = req.params.id;

    // Check website existence and SSRF safety
    const website = await db.get('SELECT * FROM supplier_websites WHERE id = ?', [websiteId]);
    if (!website) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy website nhà cung cấp' });
    }
    const ssrfCheck = await isSafePublicUrl(website.url);
    if (!ssrfCheck.safe) {
      return res.status(400).json({ success: false, error: `Website không an toàn để thu thập: ${ssrfCheck.reason}` });
    }

    const result = await UniversalCrawler.startCrawl({
      websiteId,
      maxUrls: parseInt(maxUrls) || 40,
      depth: parseInt(depth) || 2
    });

    res.json({
      success: true,
      message: 'Tiến trình thu thập website đã được khởi động ở chế độ ngầm',
      data: result
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/jobs/:jobId/stop', (req, res) => {
  try {
    const stopped = UniversalCrawler.stopCrawl(req.params.jobId);
    res.json({ success: true, stopped, message: stopped ? 'Đã gửi lệnh dừng tiến trình' : 'Tiến trình không tồn tại hoặc đã hoàn tất' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/websites/:id/jobs', async (req, res) => {
  try {
    const jobs = await db.all(`
      SELECT * FROM crawl_jobs 
      WHERE website_id = ? 
      ORDER BY created_at DESC 
      LIMIT 20
    `, [req.params.id]);
    res.json({ success: true, data: jobs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/jobs', async (req, res) => {
  try {
    const jobs = await db.all(`
      SELECT j.*, w.name as website_name, w.url as website_url, s.name as supplier_name
      FROM crawl_jobs j
      JOIN supplier_websites w ON j.website_id = w.id
      JOIN supplier_organizations s ON j.supplier_id = s.id
      ORDER BY j.created_at DESC
      LIMIT 50
    `);
    res.json({ success: true, data: jobs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// 5. CRAWLED PRODUCTS & APPROVAL WORKFLOW (Screens 5, 6, 7)
// =============================================================================
router.get('/products', async (req, res) => {
  try {
    const { website_id, supplier_id, status, category, search, limit = 50, offset = 0 } = req.query;
    let query = `
      SELECT p.*, s.name as supplier_name, w.name as website_name
      FROM crawled_products p
      JOIN supplier_organizations s ON p.supplier_id = s.id
      JOIN supplier_websites w ON p.website_id = w.id
      WHERE 1=1
    `;
    const params = [];

    if (website_id) {
      query += ' AND p.website_id = ?';
      params.push(website_id);
    }
    if (supplier_id) {
      query += ' AND p.supplier_id = ?';
      params.push(supplier_id);
    }
    if (status) {
      query += ' AND p.approval_status = ?';
      params.push(status);
    }
    if (category) {
      query += ' AND p.category = ?';
      params.push(category);
    }
    if (search) {
      query += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.brand LIKE ? OR p.description LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    // Count total
    const countSql = query.replace('SELECT p.*, s.name as supplier_name, w.name as website_name', 'SELECT COUNT(*) as total');
    const totalRow = await db.get(countSql, params);

    query += ' ORDER BY p.crawled_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const products = await db.all(query, params);

    res.json({
      success: true,
      total: totalRow?.total || 0,
      data: products
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/products/:id', async (req, res) => {
  try {
    const product = await db.get(`
      SELECT p.*, s.name as supplier_name, w.name as website_name, w.url as website_url
      FROM crawled_products p
      JOIN supplier_organizations s ON p.supplier_id = s.id
      JOIN supplier_websites w ON p.website_id = w.id
      WHERE p.id = ?
    `, [req.params.id]);

    if (!product) {
      return res.status(404).json({ success: false, error: 'Sản phẩm không tồn tại' });
    }

    const priceHistory = await db.all(`
      SELECT * FROM product_price_history 
      WHERE product_id = ? 
      ORDER BY changed_at DESC
    `, [req.params.id]);

    res.json({
      success: true,
      data: {
        ...product,
        priceHistory
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/products/:id', async (req, res) => {
  try {
    const {
      name, sku, brand, category, description, sale_price, original_price,
      availability, approval_status, price_confirmation_level, notes
    } = req.body;

    const now = new Date().toISOString();
    const verifiedAt = approval_status === 'APPROVED' ? now : null;

    await db.run(`
      UPDATE crawled_products 
      SET name = COALESCE(?, name),
          sku = COALESCE(?, sku),
          brand = COALESCE(?, brand),
          category = COALESCE(?, category),
          description = COALESCE(?, description),
          sale_price = COALESCE(?, sale_price),
          original_price = COALESCE(?, original_price),
          availability = COALESCE(?, availability),
          approval_status = COALESCE(?, approval_status),
          price_confirmation_level = COALESCE(?, price_confirmation_level),
          verified_at = COALESCE(?, verified_at),
          notes = COALESCE(?, notes),
          updated_at = ?
      WHERE id = ?
    `, [
      name, sku, brand, category, description, sale_price, original_price,
      availability, approval_status, price_confirmation_level, verifiedAt, notes, now, req.params.id
    ]);

    const updated = await db.get('SELECT * FROM crawled_products WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/products/batch-approval', async (req, res) => {
  try {
    const { productIds, approval_status } = req.body;
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Danh sách sản phẩm không hợp lệ' });
    }
    if (!['APPROVED', 'REJECTED', 'PENDING'].includes(approval_status)) {
      return res.status(400).json({ success: false, error: 'Trạng thái kiểm duyệt không hợp lệ' });
    }

    const now = new Date().toISOString();
    const verifiedAt = approval_status === 'APPROVED' ? now : null;

    for (const pid of productIds) {
      await db.run(`
        UPDATE crawled_products 
        SET approval_status = ?, verified_at = ?, updated_at = ?
        WHERE id = ?
      `, [approval_status, verifiedAt, now, pid]);
    }

    res.json({
      success: true,
      message: `Đã cập nhật trạng thái ${approval_status} cho ${productIds.length} sản phẩm`,
      count: productIds.length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM crawled_products WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Sản phẩm đã được xóa khỏi hệ thống' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// 6. PRICE HISTORY AUDIT TRAIL (Screens 8, 9)
// =============================================================================
router.get('/price-history', async (req, res) => {
  try {
    const history = await db.all(`
      SELECT h.*, p.name as product_name, p.sku, p.image_url, s.name as supplier_name, w.name as website_name
      FROM product_price_history h
      JOIN crawled_products p ON h.product_id = p.id
      JOIN supplier_websites w ON p.website_id = w.id
      JOIN supplier_organizations s ON p.supplier_id = s.id
      ORDER BY h.changed_at DESC
      LIMIT 100
    `);
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// 7. QUOTATIONS API
// =============================================================================
router.get('/quotations', async (req, res) => {
  try {
    const quotes = await db.all(`
      SELECT q.*, 
        (SELECT COUNT(*) FROM quotation_items qi WHERE qi.quotation_id = q.id) as items_count
      FROM quotations q 
      ORDER BY q.created_at DESC 
      LIMIT 50
    `);
    res.json({ success: true, data: quotes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/quotations/:id', async (req, res) => {
  try {
    const quotation = await db.get('SELECT * FROM quotations WHERE id = ?', [req.params.id]);
    if (!quotation) {
      return res.status(404).json({ success: false, error: 'Báo giá không tồn tại' });
    }
    const items = await db.all('SELECT * FROM quotation_items WHERE quotation_id = ?', [req.params.id]);
    res.json({ success: true, data: { ...quotation, items } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/quotations', async (req, res) => {
  try {
    const {
      customer_name, customer_phone, customer_email, customer_company,
      conversation_id, items, vat_percent = 10, notes, valid_days = 7
    } = req.body;

    if (!customer_name) {
      return res.status(400).json({ success: false, error: 'Tên khách hàng là bắt buộc' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Báo giá phải có ít nhất 1 sản phẩm' });
    }

    const now = new Date();
    const validUntil = new Date(now.getTime() + valid_days * 24 * 60 * 60 * 1000).toISOString();
    const quoteCode = `BG-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const quoteId = `quote_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    let totalAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      const qty = parseInt(item.quantity) || 1;
      const unitPrice = parseFloat(item.unit_price) || 0;
      const totalPrice = qty * unitPrice;
      totalAmount += totalPrice;

      validatedItems.push({
        id: `qi_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        quotation_id: quoteId,
        product_id: item.product_id || null,
        product_name: item.product_name,
        sku: item.sku || '',
        specs_snippet: item.specs_snippet || '',
        quantity: qty,
        unit: item.unit || 'cái',
        unit_price: unitPrice,
        price_type: item.price_type || 'REFERENCE_ONLY',
        total_price: totalPrice,
        notes: item.notes || ''
      });
    }

    const vatRate = parseFloat(vat_percent) || 0;
    const vatAmount = Math.round(totalAmount * (vatRate / 100));
    const finalAmount = totalAmount + vatAmount;

    await db.run(`
      INSERT INTO quotations (
        id, quote_code, customer_name, customer_phone, customer_email, customer_company,
        conversation_id, total_amount, vat_percent, vat_amount, final_amount,
        status, notes, valid_until, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, 'Central Brain AI', ?, ?)
    `, [
      quoteId, quoteCode, customer_name, customer_phone || '', customer_email || '', customer_company || '',
      conversation_id || null, totalAmount, vatRate, vatAmount, finalAmount,
      notes || '', validUntil, now.toISOString(), now.toISOString()
    ]);

    for (const vi of validatedItems) {
      await db.run(`
        INSERT INTO quotation_items (
          id, quotation_id, product_id, product_name, sku, specs_snippet,
          quantity, unit, unit_price, price_type, total_price, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [vi.id, vi.quotation_id, vi.product_id, vi.product_name, vi.sku, vi.specs_snippet, vi.quantity, vi.unit, vi.unit_price, vi.price_type, vi.total_price, vi.notes]);
    }

    const createdQuote = await db.get('SELECT * FROM quotations WHERE id = ?', [quoteId]);
    res.status(201).json({
      success: true,
      data: {
        ...createdQuote,
        items: validatedItems
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/quotations/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['DRAFT', 'ISSUED', 'CONFIRMED', 'EXPIRED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Trạng thái báo giá không hợp lệ' });
    }
    const now = new Date().toISOString();
    await db.run('UPDATE quotations SET status = ?, updated_at = ? WHERE id = ?', [status, now, req.params.id]);
    const updated = await db.get('SELECT * FROM quotations WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
