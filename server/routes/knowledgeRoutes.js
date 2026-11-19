/**
 * TRÍ AI ULTIMATE ROBOT - KNOWLEDGE CENTER REST API ROUTES
 * 
 * Implements endpoints for the 14 Admin Knowledge Center modules:
 * Stats, Documents, Excel Engine, Multi-tier Pricing, Promotions,
 * AI Studio Evaluation, Citations, and Multi-Tenancy.
 */

import express from 'express';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import db from '../db.js';
import { RagService } from '../services/ragService.js';
import { ExcelParser } from '../services/parsers/excelParser.js';
import { WebSearchService } from '../services/webSearchService.js';
import { CentralBrainService } from '../services/centralBrainService.js';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const docsUploadDir = path.resolve(__dirname, '../../public/uploads/docs');

if (!fs.existsSync(docsUploadDir)) {
  fs.mkdirSync(docsUploadDir, { recursive: true });
}

const router = express.Router();

// -----------------------------------------------------------------------------
// 1. STATS & OVERVIEW DASHBOARD
// -----------------------------------------------------------------------------
router.get('/stats', async (req, res) => {
  try {
    const orgId = req.query.orgId || 'org_default';

    const [docCount] = await db.all('SELECT count(*) as count FROM knowledge_documents WHERE org_id = ? OR scope = "global"', [orgId]);
    const [chunkCount] = await db.all('SELECT count(*) as count FROM knowledge_chunks WHERE org_id = ? OR scope = "global"', [orgId]);
    const [sheetCount] = await db.all('SELECT count(*) as count FROM document_sheets');
    const [rowCount] = await db.all('SELECT count(*) as count FROM document_rows');
    const [priceListCount] = await db.all('SELECT count(*) as count FROM price_lists');
    const [promoCount] = await db.all('SELECT count(*) as count FROM promotions WHERE is_active = 1');
    const [citationCount] = await db.all('SELECT count(*) as count FROM citation_logs');
    const [orgCount] = await db.all('SELECT count(*) as count FROM organizations');

    const recentCitations = await db.all(`
      SELECT * FROM citation_logs ORDER BY created_at DESC LIMIT 5
    `);

    res.json({
      success: true,
      stats: {
        totalDocuments: docCount.count,
        totalChunks: chunkCount.count,
        totalSheets: sheetCount.count,
        totalRows: rowCount.count,
        totalPriceLists: priceListCount.count,
        activePromotions: promoCount.count,
        totalCitations: citationCount.count,
        totalOrganizations: orgCount.count
      },
      recentCitations
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -----------------------------------------------------------------------------
// 2. KNOWLEDGE DOCUMENTS (GLOBAL & PRIVATE)
// -----------------------------------------------------------------------------
router.get('/documents', async (req, res) => {
  try {
    const { scope, orgId = 'org_default', approvalStatus } = req.query;

    let sql = 'SELECT * FROM knowledge_documents WHERE 1=1';
    const params = [];

    if (scope === 'global') {
      sql += ' AND scope = "global"';
    } else if (scope === 'private') {
      sql += ' AND scope = "private" AND org_id = ?';
      params.push(orgId);
    } else {
      sql += ' AND (scope = "global" OR org_id = ?)';
      params.push(orgId);
    }

    if (approvalStatus) {
      sql += ' AND approval_status = ?';
      params.push(approvalStatus);
    }

    sql += ' ORDER BY created_at DESC';
    const documents = await db.all(sql, params);
    res.json({ success: true, documents });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/documents/upload', async (req, res) => {
  try {
    const {
      title,
      fileName,
      dataUrl,
      rawText,
      scope = 'global',
      orgId = 'org_default',
      approvalStatus = 'APPROVED'
    } = req.body;

    const docTitle = title || fileName || 'Tài liệu không tên';
    const ext = fileName ? path.extname(fileName).toLowerCase().replace('.', '') : 'txt';

    // 1. If Excel / CSV file
    if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
      let buffer;
      if (dataUrl) {
        const base64Data = dataUrl.replace(/^data:.*?;base64,/, '');
        buffer = Buffer.from(base64Data, 'base64');
      } else if (rawText) {
        buffer = Buffer.from(rawText, 'utf-8');
      } else {
        return res.status(400).json({ success: false, error: 'Thiếu dữ liệu tệp Excel/CSV' });
      }

      // Save file to disk
      const savedFileName = `${Date.now()}_${(fileName || 'data.xlsx').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const filePath = path.join(docsUploadDir, savedFileName);
      fs.writeFileSync(filePath, buffer);

      const parsedExcel = await ExcelParser.parseAndPersist(buffer, {
        title: docTitle,
        orgId
      });

      return res.json({
        success: true,
        type: 'excel',
        documentId: parsedExcel.documentId,
        title: docTitle,
        sheetCount: parsedExcel.sheetCount,
        sheets: parsedExcel.sheets
      });
    }

    // 2. Text / PDF / DOC document
    let contentToIngest = rawText || '';
    let pageCount = 1;
    let savedFilePath = null;

    if (dataUrl) {
      const base64Data = dataUrl.replace(/^data:.*?;base64,/, '');
      const fileBuffer = Buffer.from(base64Data, 'base64');

      // Save raw file to disk for persistence & future audits
      const savedFileName = `${Date.now()}_${(fileName || `doc.${ext}`).replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      savedFilePath = path.join(docsUploadDir, savedFileName);
      fs.writeFileSync(savedFilePath, fileBuffer);

      if (ext === 'pdf') {
        try {
          const pdfData = await pdfParse(fileBuffer);
          contentToIngest = pdfData.text || '';
          pageCount = pdfData.numpages || 1;
        } catch (pdfErr) {
          console.warn('[PDF PARSE PRIMARY FAILED]', pdfErr.message);
          try {
            const latinBuf = Buffer.from(fileBuffer.toString('binary'), 'binary');
            const pdfData2 = await pdfParse(latinBuf);
            contentToIngest = pdfData2.text || '';
            pageCount = pdfData2.numpages || 1;
          } catch (e2) {
            console.error('[PDF PARSE FALLBACK FAILED]', e2.message);
            contentToIngest = fileBuffer.toString('utf-8');
          }
        }
      } else {
        contentToIngest = fileBuffer.toString('utf-8');
      }
    }

    if (!contentToIngest.trim()) {
      return res.status(400).json({ success: false, error: 'Tài liệu không có nội dung văn bản hợp lệ hoặc không trích xuất được chữ.' });
    }

    const ingested = await RagService.ingestDocument({
      title: docTitle,
      fileType: ext,
      filePath: savedFilePath,
      content: contentToIngest,
      orgId,
      scope,
      approvalStatus,
      pageCount
    });

    res.json({
      success: true,
      type: 'text_document',
      ...ingested
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/documents/:id/approval', async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalStatus, approvedBy = 'Quản trị viên' } = req.body;

    if (!['APPROVED', 'REJECTED', 'PENDING_REVIEW', 'DRAFT'].includes(approvalStatus)) {
      return res.status(400).json({ success: false, error: 'Trạng thái phê duyệt không hợp lệ' });
    }

    const now = new Date().toISOString();
    await db.run(`
      UPDATE knowledge_documents
      SET approval_status = ?, approved_by = ?, updated_at = ?
      WHERE id = ?
    `, [approvalStatus, approvedBy, now, id]);

    res.json({ success: true, message: `Đã cập nhật trạng thái phê duyệt thành ${approvalStatus}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/documents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM knowledge_chunks WHERE document_id = ?', [id]);
    await db.run('DELETE FROM document_rows WHERE document_id = ?', [id]);
    await db.run('DELETE FROM document_sheets WHERE document_id = ?', [id]);
    await db.run('DELETE FROM knowledge_documents WHERE id = ?', [id]);

    res.json({ success: true, message: 'Đã xóa tài liệu và toàn bộ dữ liệu liên quan thành công' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/documents/:id/chunks', async (req, res) => {
  try {
    const { id } = req.params;
    const chunks = await db.all(
      'SELECT id, chunk_index, content, char_count, page_number, sheet_name, created_at FROM knowledge_chunks WHERE document_id = ? ORDER BY chunk_index ASC',
      [id]
    );
    res.json({ success: true, chunks });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -----------------------------------------------------------------------------
// 3. STRUCTURED EXCEL QUERY API
// -----------------------------------------------------------------------------
router.get('/excel/sheets', async (req, res) => {
  try {
    const sheets = await db.all(`
      SELECT ds.*, kd.title as doc_title
      FROM document_sheets ds
      LEFT JOIN knowledge_documents kd ON ds.document_id = kd.id
      ORDER BY ds.created_at DESC
    `);
    res.json({ success: true, sheets });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/excel/query', async (req, res) => {
  try {
    const result = await ExcelParser.queryData(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -----------------------------------------------------------------------------
// 4. WEBSITE SOURCES & AUTO-CRAWLER
// -----------------------------------------------------------------------------
router.get('/sources', async (req, res) => {
  try {
    const sources = await db.all('SELECT * FROM knowledge_sources ORDER BY created_at DESC');
    res.json({ success: true, sources });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/sources/crawl', async (req, res) => {
  try {
    const { url, title, orgId = 'org_default' } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'Thiếu URL nguồn cần crawl' });
    }

    // Crawl web content
    const webData = await WebSearchService.search(url, 1);
    const sourceTitle = title || `Nguồn Web: ${new URL(url).hostname}`;
    const now = new Date().toISOString();
    const sourceId = `src_${randomUUID()}`;

    const snippet = webData.results?.[0]?.snippet || `Nguồn crawl từ ${url}`;

    await db.run(`
      INSERT INTO knowledge_sources (id, title, type, content, metadata_json, is_active, created_at)
      VALUES (?, ?, 'url', ?, ?, 1, ?)
    `, [sourceId, sourceTitle, snippet, JSON.stringify({ url }), now]);

    // Also ingest into knowledge base
    const ingested = await RagService.ingestDocument({
      title: sourceTitle,
      fileType: 'url',
      content: `${sourceTitle}\nURL: ${url}\n\n${snippet}`,
      orgId,
      scope: 'global'
    });

    res.json({
      success: true,
      sourceId,
      title: sourceTitle,
      ingestedChunks: ingested.totalChunks
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -----------------------------------------------------------------------------
// 5. MULTI-TIER PRICE LISTS & PROMOTIONS
// -----------------------------------------------------------------------------
router.get('/pricing/lists', async (req, res) => {
  try {
    const orgId = req.query.orgId || 'org_default';
    const priceLists = await db.all('SELECT * FROM price_lists WHERE org_id = ? ORDER BY created_at DESC', [orgId]);
    res.json({ success: true, priceLists });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/pricing/lists', async (req, res) => {
  try {
    const { id, name, code, tier_type = 'retail', currency = 'VND', is_active = 1, valid_from, valid_to, org_id = 'org_default' } = req.body;
    const now = new Date().toISOString();
    const listId = id || `pl_${randomUUID()}`;

    const existing = await db.get('SELECT id FROM price_lists WHERE id = ?', [listId]);
    if (existing) {
      await db.run(`
        UPDATE price_lists
        SET name = ?, code = ?, tier_type = ?, currency = ?, is_active = ?, valid_from = ?, valid_to = ?, updated_at = ?
        WHERE id = ?
      `, [name, code, tier_type, currency, is_active, valid_from, valid_to, now, listId]);
    } else {
      await db.run(`
        INSERT INTO price_lists (id, org_id, name, code, tier_type, currency, is_active, valid_from, valid_to, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [listId, org_id, name, code, tier_type, currency, is_active, valid_from || now, valid_to, now, now]);
    }

    res.json({ success: true, id: listId, message: 'Đã lưu bảng giá thành công' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/promotions', async (req, res) => {
  try {
    const orgId = req.query.orgId || 'org_default';
    const promotions = await db.all('SELECT * FROM promotions WHERE org_id = ? ORDER BY created_at DESC', [orgId]);
    res.json({ success: true, promotions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/promotions', async (req, res) => {
  try {
    const {
      id,
      name,
      code,
      promo_type = 'discount_percent',
      discount_percent = 0,
      discount_amount = 0,
      min_order_value = 0,
      gift_description,
      start_date,
      end_date,
      is_active = 1,
      org_id = 'org_default'
    } = req.body;

    const promoId = id || `promo_${randomUUID()}`;
    const now = new Date().toISOString();

    const existing = await db.get('SELECT id FROM promotions WHERE id = ?', [promoId]);
    if (existing) {
      await db.run(`
        UPDATE promotions
        SET name = ?, code = ?, promo_type = ?, discount_percent = ?, discount_amount = ?, min_order_value = ?, gift_description = ?, start_date = ?, end_date = ?, is_active = ?, updated_at = ?
        WHERE id = ?
      `, [name, code, promo_type, discount_percent, discount_amount, min_order_value, gift_description, start_date, end_date, is_active, now, promoId]);
    } else {
      await db.run(`
        INSERT INTO promotions (id, org_id, name, code, promo_type, discount_percent, discount_amount, min_order_value, gift_description, start_date, end_date, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [promoId, org_id, name, code, promo_type, discount_percent, discount_amount, min_order_value, gift_description, start_date || now, end_date, is_active, now, now]);
    }

    res.json({ success: true, id: promoId, message: 'Đã lưu chương trình khuyến mãi thành công' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -----------------------------------------------------------------------------
// 6. AI EVALUATION STUDIO & CITATIONS
// -----------------------------------------------------------------------------
router.get('/ai-studio/test-cases', async (req, res) => {
  try {
    const testCases = await db.all('SELECT * FROM ai_test_cases ORDER BY priority ASC, created_at DESC');
    res.json({ success: true, testCases });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/ai-studio/test-cases', async (req, res) => {
  try {
    const { question, expected_intent, expected_keywords, priority = 1 } = req.body;
    const testId = `tc_${randomUUID()}`;
    const now = new Date().toISOString();

    await db.run(`
      INSERT INTO ai_test_cases (id, category, test_name, input_prompt, expected_behavior, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `, [testId, expected_intent || 'general', question.slice(0, 50), question, expected_keywords || '', now]);

    res.json({ success: true, id: testId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/ai-studio/run-benchmark', async (req, res) => {
  try {
    const testCases = await db.all('SELECT * FROM ai_test_cases WHERE is_active = 1 LIMIT 10');
    if (testCases.length === 0) {
      // Seed default golden test cases if empty
      const defaultCases = [
        { q: 'bạn khoẻ không', cat: 'GREETING_HEALTH', exp: 'khoẻ' },
        { q: 'anh cần mua trà', cat: 'PRODUCT_SEARCH', exp: 'trà' },
        { q: 'báo giá máy đếm tiền', cat: 'PRICING_LOOKUP', exp: 'giá' },
        { q: 'chính sách bảo hành như thế nào', cat: 'KNOWLEDGE_RETRIEVAL', exp: 'bảo hành' }
      ];
      for (const dc of defaultCases) {
        await db.run(`
          INSERT INTO ai_test_cases (id, category, test_name, input_prompt, expected_behavior, is_active, created_at)
          VALUES (?, ?, ?, ?, ?, 1, ?)
        `, [`tc_${randomUUID()}`, dc.cat, dc.q, dc.q, dc.exp, new Date().toISOString()]);
      }
    }

    const activeCases = await db.all('SELECT * FROM ai_test_cases WHERE is_active = 1 LIMIT 10');
    const benchmarkResults = [];
    let passedCount = 0;

    for (const tc of activeCases) {
      const startTime = Date.now();
      const chatRes = await CentralBrainService.processChat({ message: tc.input_prompt });
      const latencyMs = Date.now() - startTime;

      const reply = chatRes.reply || '';
      const hasKeywords = tc.expected_behavior 
        ? reply.toLowerCase().includes(tc.expected_behavior.toLowerCase()) 
        : true;
      const passed = chatRes.success && hasKeywords;
      if (passed) passedCount++;

      benchmarkResults.push({
        testCaseId: tc.id,
        prompt: tc.input_prompt,
        expectedIntent: tc.category,
        passed,
        latencyMs,
        replyPreview: reply.slice(0, 100),
        toolsUsed: chatRes.toolsUsed || []
      });
    }

    const score = Math.round((passedCount / activeCases.length) * 100);

    res.json({
      success: true,
      totalTests: activeCases.length,
      passedCount,
      accuracyScore: score,
      results: benchmarkResults
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/ai-studio/citations', async (req, res) => {
  try {
    const citations = await db.all(`
      SELECT cl.*, kd.title as document_title
      FROM citation_logs cl
      LEFT JOIN knowledge_documents kd ON cl.document_id = kd.id
      ORDER BY cl.created_at DESC
      LIMIT 50
    `);
    res.json({ success: true, citations });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -----------------------------------------------------------------------------
// 7. ORGANIZATIONS (MULTI-TENANCY)
// -----------------------------------------------------------------------------
router.get('/organizations', async (req, res) => {
  try {
    const organizations = await db.all('SELECT * FROM organizations ORDER BY created_at ASC');
    res.json({ success: true, organizations });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/organizations', async (req, res) => {
  try {
    const { id, name, slug, domain, description, is_active = 1 } = req.body;
    const now = new Date().toISOString();
    const orgId = id || `org_${randomUUID()}`;

    const existing = await db.get('SELECT id FROM organizations WHERE id = ?', [orgId]);
    if (existing) {
      await db.run(`
        UPDATE organizations
        SET name = ?, slug = ?, domain = ?, description = ?, is_active = ?, updated_at = ?
        WHERE id = ?
      `, [name, slug, domain, description, is_active, now, orgId]);
    } else {
      await db.run(`
        INSERT INTO organizations (id, name, slug, domain, description, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [orgId, name, slug, domain, description, is_active, now, now]);
    }

    res.json({ success: true, id: orgId, message: 'Đã lưu tổ chức thành công' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
