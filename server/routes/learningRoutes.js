/**
 * TRÍ AN LEARNING CENTER - REST API ROUTES
 * Endpoints for Learning Center Dashboard, Ingestion, Testing, Knowledge Management, and Excel Export
 */

import express from 'express';
import db from '../db.js';
import * as xlsx from 'xlsx';
import { randomUUID } from 'crypto';
import LearningCaptureEngine from '../services/intelligence/learningCaptureEngine.js';
import LearningIngestionEngine from '../services/intelligence/learningIngestionEngine.js';
import LearningTestEngine from '../services/intelligence/learningTestEngine.js';
import { requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Enforce Admin Authentication on all Learning Center endpoints
router.use(requireAdmin);

// 1. GET Dashboard KPI Stats (Section 4)
router.get('/stats', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { orgId } = req.query;

    let orgFilter = '';
    let orgParams = [];
    if (orgId && orgId !== 'all') {
      orgFilter = 'WHERE (org_id = ? OR org_id = "default")';
      orgParams = [orgId];
    }

    const [
      totalRow,
      newRow,
      newTodayRow,
      waitingRow,
      readyToTestRow,
      testingRow,
      resolvedRow,
      rejectedRow,
      dupsRow,
      conflictRow,
      topTopics,
      topProducts,
      dailyTrend
    ] = await Promise.all([
      db.get(`SELECT COUNT(*) as count FROM unanswered_questions ${orgFilter}`, orgParams),
      db.get(`SELECT COUNT(*) as count FROM unanswered_questions ${orgFilter ? orgFilter + ' AND' : 'WHERE'} status = 'NEW'`, orgParams),
      db.get(`SELECT COUNT(*) as count FROM unanswered_questions ${orgFilter ? orgFilter + ' AND' : 'WHERE'} date(created_at) = date('now')`, orgParams),
      db.get(`SELECT COUNT(*) as count FROM unanswered_questions ${orgFilter ? orgFilter + ' AND' : 'WHERE'} status IN ('NEW', 'REVIEWING', 'WAITING_KNOWLEDGE')`, orgParams),
      db.get(`SELECT COUNT(*) as count FROM unanswered_questions ${orgFilter ? orgFilter + ' AND' : 'WHERE'} status = 'READY_TO_TEST'`, orgParams),
      db.get(`SELECT COUNT(*) as count FROM unanswered_questions ${orgFilter ? orgFilter + ' AND' : 'WHERE'} status = 'TESTING'`, orgParams),
      db.get(`SELECT COUNT(*) as count FROM unanswered_questions ${orgFilter ? orgFilter + ' AND' : 'WHERE'} status = 'RESOLVED'`, orgParams),
      db.get(`SELECT COUNT(*) as count FROM unanswered_questions ${orgFilter ? orgFilter + ' AND' : 'WHERE'} status = 'REJECTED'`, orgParams),
      db.get(`SELECT COUNT(*) as count FROM unanswered_questions ${orgFilter ? orgFilter + ' AND' : 'WHERE'} hit_count > 1`, orgParams),
      db.get(`SELECT COUNT(*) as count FROM learning_knowledge_entries WHERE conflict_flag = 1`),
      db.all(`
        SELECT related_topic as topic, COUNT(*) as count 
        FROM unanswered_questions 
        ${orgFilter ? orgFilter + ' AND' : 'WHERE'} related_topic IS NOT NULL AND related_topic != ''
        GROUP BY related_topic 
        ORDER BY count DESC 
        LIMIT 5
      `, orgParams),
      db.all(`
        SELECT related_product_name as product, COUNT(*) as count, SUM(hit_count) as total_hits
        FROM unanswered_questions 
        ${orgFilter ? orgFilter + ' AND' : 'WHERE'} related_product_name IS NOT NULL AND related_product_name != ''
        GROUP BY related_product_name 
        ORDER BY total_hits DESC 
        LIMIT 5
      `, orgParams),
      db.all(`
        SELECT date(created_at) as day, COUNT(*) as count
        FROM unanswered_questions
        ${orgFilter ? orgFilter + ' AND' : 'WHERE'} created_at >= date('now', '-14 days')
        GROUP BY date(created_at)
        ORDER BY day ASC
      `, orgParams)
    ]);

    const total = totalRow?.count || 0;
    const resolved = resolvedRow?.count || 0;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 100;

    res.json({
      success: true,
      stats: {
        total,
        new: newRow?.count || 0,
        newToday: newTodayRow?.count || 0,
        waitingKnowledge: waitingRow?.count || 0,
        readyToTest: readyToTestRow?.count || 0,
        testing: testingRow?.count || 0,
        resolved,
        rejected: rejectedRow?.count || 0,
        duplicates: dupsRow?.count || 0,
        conflicts: conflictRow?.count || 0,
        resolutionRate,
        topTopics: topTopics || [],
        topProducts: topProducts || [],
        dailyTrend: dailyTrend || []
      }
    });
  } catch (err) {
    console.error('[LEARNING API ERROR] Failed to fetch stats:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. GET Questions Queue with Full Multi-criteria Filtering & Pagination (Section 3 & 4)
router.get('/questions', async (req, res) => {
  try {
    const { 
      status, 
      failure_reason, 
      priority, 
      topic,
      orgId, 
      chatbotId,
      search, 
      dateFrom, 
      dateTo,
      page = 1, 
      limit = 20 
    } = req.query;

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let whereClauses = [];
    let params = [];

    if (status && status !== 'all') {
      whereClauses.push('status = ?');
      params.push(status);
    }
    if (failure_reason && failure_reason !== 'all') {
      whereClauses.push('failure_reason = ?');
      params.push(failure_reason);
    }
    if (priority && priority !== 'all') {
      whereClauses.push('priority = ?');
      params.push(priority);
    }
    if (topic && topic !== 'all') {
      whereClauses.push('related_topic = ?');
      params.push(topic);
    }
    if (orgId && orgId !== 'all') {
      whereClauses.push('(org_id = ? OR org_id = "default")');
      params.push(orgId);
    }
    if (chatbotId && chatbotId !== 'all') {
      whereClauses.push('chatbot_id = ?');
      params.push(chatbotId);
    }
    if (dateFrom) {
      whereClauses.push('date(created_at) >= date(?)');
      params.push(dateFrom);
    }
    if (dateTo) {
      whereClauses.push('date(created_at) <= date(?)');
      params.push(dateTo);
    }
    if (search && search.trim()) {
      whereClauses.push('(question LIKE ? OR original_question LIKE ? OR related_product_name LIKE ? OR related_topic LIKE ?)');
      const searchParam = `%${search.trim()}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const [countRow, rows] = await Promise.all([
      db.get(`SELECT COUNT(*) as total FROM unanswered_questions ${whereSql}`, params),
      db.all(`
        SELECT * FROM unanswered_questions 
        ${whereSql} 
        ORDER BY 
          CASE priority WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END ASC,
          hit_count DESC, 
          created_at DESC 
        LIMIT ? OFFSET ?
      `, [...params, parseInt(limit, 10), offset])
    ]);

    res.json({
      success: true,
      data: rows || [],
      pagination: {
        total: countRow?.total || 0,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil((countRow?.total || 0) / parseInt(limit, 10))
      }
    });
  } catch (err) {
    console.error('[LEARNING API ERROR] Failed to fetch questions:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. GET Question Detail with Knowledge, Test Runs & Audit Logs
router.get('/questions/:id', async (req, res) => {
  try {
    const question = await db.get(`SELECT * FROM unanswered_questions WHERE id = ?`, [req.params.id]);
    if (!question) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy câu hỏi.' });
    }

    const [knowledgeEntries, testRuns, auditLogs] = await Promise.all([
      db.all(`SELECT * FROM learning_knowledge_entries WHERE unanswered_question_id = ? ORDER BY created_at DESC`, [req.params.id]),
      db.all(`SELECT * FROM learning_test_runs WHERE unanswered_question_id = ? ORDER BY created_at DESC`, [req.params.id]),
      db.all(`SELECT * FROM learning_audit_log WHERE question_id = ? ORDER BY created_at DESC`, [req.params.id])
    ]);

    res.json({
      success: true,
      question,
      knowledgeEntries: knowledgeEntries || [],
      testRuns: testRuns || [],
      auditLogs: auditLogs || []
    });
  } catch (err) {
    console.error('[LEARNING DETAIL ERROR]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. PUT Update Question Status & Assignment (Section 3)
router.put('/questions/:id/status', async (req, res) => {
  try {
    const { status, assignedTo, priority } = req.body;
    const now = new Date().toISOString();
    const adminUser = req.admin?.username || 'Admin';

    const question = await db.get(`SELECT * FROM unanswered_questions WHERE id = ?`, [req.params.id]);
    if (!question) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy câu hỏi.' });
    }

    await db.run(`
      UPDATE unanswered_questions
      SET status = COALESCE(?, status),
          assigned_to = COALESCE(?, assigned_to),
          priority = COALESCE(?, priority),
          resolved_at = CASE WHEN ? = 'RESOLVED' THEN ? ELSE resolved_at END,
          updated_at = ?
      WHERE id = ?
    `, [status || null, assignedTo || null, priority || null, status, now, now, req.params.id]);

    // Audit Log
    try {
      await db.run(`
        INSERT INTO learning_audit_log (id, question_id, action, actor, org_id, details_json, created_at)
        VALUES (?, ?, 'UPDATE_STATUS', ?, ?, ?, ?)
      `, [
        `audit_${randomUUID().slice(0, 10)}`,
        req.params.id,
        adminUser,
        question.org_id || 'default',
        JSON.stringify({ previousStatus: question.status, newStatus: status, assignedTo, priority }),
        now
      ]);
    } catch (_) {}

    res.json({ success: true, id: req.params.id, status, assignedTo, priority });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. GET All Curated Knowledge Entries (Section 5)
router.get('/knowledge-entries', async (req, res) => {
  try {
    const { status, entryType, orgId, search, conflictOnly, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let whereClauses = [];
    let params = [];

    if (status && status !== 'all') {
      whereClauses.push('approval_status = ?');
      params.push(status);
    }
    if (entryType && entryType !== 'all') {
      whereClauses.push('entry_type = ?');
      params.push(entryType);
    }
    if (orgId && orgId !== 'all') {
      whereClauses.push('(org_id = ? OR org_id = "default")');
      params.push(orgId);
    }
    if (conflictOnly === 'true' || conflictOnly === '1') {
      whereClauses.push('conflict_flag = 1');
    }
    if (search && search.trim()) {
      whereClauses.push('(standard_question LIKE ? OR standard_answer LIKE ? OR related_topic LIKE ? OR related_product_name LIKE ?)');
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const [countRow, rows] = await Promise.all([
      db.get(`SELECT COUNT(*) as total FROM learning_knowledge_entries ${whereSql}`, params),
      db.all(`
        SELECT * FROM learning_knowledge_entries 
        ${whereSql} 
        ORDER BY updated_at DESC 
        LIMIT ? OFFSET ?
      `, [...params, parseInt(limit, 10), offset])
    ]);

    res.json({
      success: true,
      data: rows || [],
      pagination: {
        total: countRow?.total || 0,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil((countRow?.total || 0) / parseInt(limit, 10))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. PUT Update Knowledge Entry Content (Section 5)
router.put('/knowledge-entries/:id', async (req, res) => {
  try {
    const adminUser = req.admin?.username || 'Admin';
    const result = await LearningIngestionEngine.updateKnowledge(req.params.id, req.body, adminUser);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. POST Toggle Knowledge Active Status
router.post('/knowledge-entries/:id/toggle-active', async (req, res) => {
  try {
    const { isActive } = req.body;
    const adminUser = req.admin?.username || 'Admin';
    const result = await LearningIngestionEngine.toggleKnowledgeActive(req.params.id, isActive, adminUser);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. GET Uploaded Documents (PDF, DOCX, XLSX, TXT, Website)
router.get('/uploaded-documents', async (req, res) => {
  try {
    const { orgId } = req.query;
    let whereClauses = ["source_type IN ('PDF', 'WORD', 'EXCEL', 'CSV', 'TXT', 'WEBSITE')"];
    let params = [];

    if (orgId && orgId !== 'all') {
      whereClauses.push('(org_id = ? OR org_id = "default")');
      params.push(orgId);
    }

    const rows = await db.all(`
      SELECT 
        id, 
        entry_type, 
        standard_question as title, 
        source_type, 
        source_filename, 
        source_url, 
        approval_status, 
        version, 
        is_active, 
        created_at, 
        updated_at,
        substr(extracted_content, 1, 300) as preview
      FROM learning_knowledge_entries
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT 100
    `, params);

    res.json({ success: true, data: rows || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. GET Audit Log (Section 7 & 9)
router.get('/audit-log', async (req, res) => {
  try {
    const { orgId, limit = 50 } = req.query;
    let whereSql = '';
    let params = [];

    if (orgId && orgId !== 'all') {
      whereSql = 'WHERE (org_id = ? OR org_id = "default")';
      params.push(orgId);
    }

    const rows = await db.all(`
      SELECT * FROM learning_audit_log
      ${whereSql}
      ORDER BY created_at DESC
      LIMIT ?
    `, [...params, parseInt(limit, 10)]);

    res.json({ success: true, data: rows || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. POST Ingest Knowledge (Direct QA, File Upload Base64, or URL)
router.post('/ingest', async (req, res) => {
  try {
    const {
      unansweredQuestionId,
      entryType,
      standardQuestion,
      standardAnswer,
      relatedTopic,
      relatedProductId,
      relatedProductName,
      policyType,
      businessGroup,
      orgId,
      sourceType,
      sourceFilename,
      sourceUrl,
      fileBase64,
      textContent,
      approvedBy,
      isDraft
    } = req.body;

    let fileBuffer = null;
    if (fileBase64) {
      fileBuffer = Buffer.from(fileBase64, 'base64');
    }

    const adminUser = req.admin?.username || approvedBy || 'Admin';

    const result = await LearningIngestionEngine.ingestKnowledge({
      unansweredQuestionId,
      entryType: entryType || 'QA',
      standardQuestion,
      standardAnswer,
      relatedTopic,
      relatedProductId,
      relatedProductName,
      policyType,
      businessGroup,
      orgId: orgId || req.admin?.orgId || 'default',
      sourceType: sourceType || 'DIRECT_INPUT',
      sourceFilename,
      sourceUrl,
      fileBuffer,
      textContent,
      approvedBy: adminUser,
      isDraft: Boolean(isDraft)
    });

    res.json({ success: true, result });
  } catch (err) {
    console.error('[LEARNING INGEST ERROR]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. POST Run Before vs After Test Bench (Section 6)
router.post('/test-run', async (req, res) => {
  try {
    const { unansweredQuestionId, learningKnowledgeId, customQuery, orgId } = req.body;
    const adminUser = req.admin?.username || 'Admin';

    const testResult = await LearningTestEngine.runBeforeAfterTest({
      unansweredQuestionId,
      learningKnowledgeId,
      customQuery,
      orgId: orgId || req.admin?.orgId || 'default',
      testedBy: adminUser
    });

    res.json({ success: true, testResult });
  } catch (err) {
    console.error('[LEARNING TEST ERROR]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 12. POST Approve Knowledge Entry
router.post('/approve', async (req, res) => {
  try {
    const { entryId, approvedBy } = req.body;
    const adminUser = req.admin?.username || approvedBy || 'Admin';
    const result = await LearningIngestionEngine.approveKnowledge(entryId, adminUser);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 13. POST Reject Knowledge Entry
router.post('/reject', async (req, res) => {
  try {
    const { entryId, reason, rejectedBy } = req.body;
    const adminUser = req.admin?.username || rejectedBy || 'Admin';
    const result = await LearningIngestionEngine.rejectKnowledge(entryId, reason, adminUser);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 14. GET Top 10 Most Frequently Asked Questions
router.get('/top10-report', async (req, res) => {
  try {
    const rows = await db.all(`
      SELECT 
        id,
        original_question as question,
        hit_count as frequency,
        related_product_name as product,
        related_topic as topic,
        failure_reason,
        priority,
        status,
        created_at,
        updated_at
      FROM unanswered_questions
      ORDER BY hit_count DESC, created_at DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      title: 'TOP 10 CÂU HỎI KHÁCH HÀNG HỎI NHIỀU NHẤT NHƯNG TRÍ AN CHƯA BIẾT',
      data: rows || []
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 15. GET Export Comprehensive Gap Report to Excel (Section 3 & 4)
router.get('/export-excel', async (req, res) => {
  try {
    const rows = await db.all(`
      SELECT 
        q.id as "Mã báo cáo",
        q.original_question as "Câu hỏi gốc của khách",
        q.ai_response as "Câu trả lời AI đã đưa ra",
        q.hit_count as "Số lần xuất hiện",
        q.priority as "Mức độ ưu tiên",
        q.failure_reason as "Lý do không trả lời được",
        COALESCE(q.related_topic, 'Kiến thức chung') as "Nhóm kiến thức",
        COALESCE(q.related_product_name, 'Chưa xác định') as "Sản phẩm liên quan",
        COALESCE(q.org_id, 'default') as "Đối tác / Tenant",
        COALESCE(q.chatbot_id, 'tri-an-core') as "Chatbot liên quan",
        q.status as "Trạng thái xử lý",
        COALESCE(q.assigned_to, 'Chưa phân công') as "Người phụ trách",
        COALESCE(q.resolved_answer, 'Chưa bổ sung') as "Câu trả lời chuẩn đã duyệt",
        q.created_at as "Ngày giờ ghi nhận",
        q.updated_at as "Cập nhật gần nhất"
      FROM unanswered_questions q
      ORDER BY 
        CASE q.priority WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END ASC,
        q.hit_count DESC, 
        q.created_at DESC
      LIMIT 500
    `);

    const worksheet = xlsx.utils.json_to_sheet(rows || []);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Báo Cáo Kiến Thức Thiếu');

    const excelBuffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="BAO_CAO_KIEN_THUC_THIEU_TRI_AN.xlsx"');
    res.send(excelBuffer);
  } catch (err) {
    console.error('[EXPORT EXCEL ERROR]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
