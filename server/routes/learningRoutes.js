/**
 * TRÍ AN LEARNING CENTER - REST API ROUTES
 * Endpoints for Learning Center Dashboard, Ingestion, Testing, and Excel Export
 */

import express from 'express';
import db from '../db.js';
import * as xlsx from 'xlsx';
import LearningCaptureEngine from '../services/intelligence/learningCaptureEngine.js';
import LearningIngestionEngine from '../services/intelligence/learningIngestionEngine.js';
import LearningTestEngine from '../services/intelligence/learningTestEngine.js';
import { requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Enforce Admin Authentication on all Learning Center endpoints
router.use(requireAdmin);

// 1. GET Dashboard KPI Stats
router.get('/stats', async (req, res) => {
  try {
    const [totalRow, newRow, approvedRow, waitingRow, inReviewRow, dupsRow, topTopics] = await Promise.all([
      db.get(`SELECT COUNT(*) as count FROM unanswered_questions`),
      db.get(`SELECT COUNT(*) as count FROM unanswered_questions WHERE status = 'NEW'`),
      db.get(`SELECT COUNT(*) as count FROM unanswered_questions WHERE status = 'APPROVED'`),
      db.get(`SELECT COUNT(*) as count FROM unanswered_questions WHERE status = 'WAITING_DATA'`),
      db.get(`SELECT COUNT(*) as count FROM unanswered_questions WHERE status = 'IN_REVIEW'`),
      db.get(`SELECT COUNT(*) as count FROM unanswered_questions WHERE hit_count > 1`),
      db.all(`
        SELECT related_topic as topic, COUNT(*) as count 
        FROM unanswered_questions 
        WHERE related_topic IS NOT NULL AND related_topic != ''
        GROUP BY related_topic 
        ORDER BY count DESC 
        LIMIT 5
      `)
    ]);

    res.json({
      success: true,
      stats: {
        total: totalRow?.count || 0,
        new: newRow?.count || 0,
        approved: approvedRow?.count || 0,
        waitingData: waitingRow?.count || 0,
        inReview: inReviewRow?.count || 0,
        duplicates: dupsRow?.count || 0,
        topTopics: topTopics || []
      }
    });
  } catch (err) {
    console.error('[LEARNING API ERROR] Failed to fetch stats:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. GET Questions Queue with Filtering & Pagination
router.get('/questions', async (req, res) => {
  try {
    const { status, failure_reason, priority, search, page = 1, limit = 20 } = req.query;
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
    if (search && search.trim()) {
      whereClauses.push('(question LIKE ? OR original_question LIKE ? OR related_product_name LIKE ?)');
      const searchParam = `%${search.trim()}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const [countRow, rows] = await Promise.all([
      db.get(`SELECT COUNT(*) as total FROM unanswered_questions ${whereSql}`, params),
      db.all(`
        SELECT * FROM unanswered_questions 
        ${whereSql} 
        ORDER BY hit_count DESC, created_at DESC 
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

// 3. GET Question Detail
router.get('/questions/:id', async (req, res) => {
  try {
    const question = await db.get(`SELECT * FROM unanswered_questions WHERE id = ?`, [req.params.id]);
    if (!question) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy câu hỏi.' });
    }

    const [knowledgeEntries, testRuns] = await Promise.all([
      db.all(`SELECT * FROM learning_knowledge_entries WHERE unanswered_question_id = ? ORDER BY created_at DESC`, [req.params.id]),
      db.all(`SELECT * FROM learning_test_runs WHERE unanswered_question_id = ? ORDER BY created_at DESC`, [req.params.id])
    ]);

    res.json({
      success: true,
      question,
      knowledgeEntries: knowledgeEntries || [],
      testRuns: testRuns || []
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. PATCH Update Status (NEW -> IN_REVIEW -> WAITING_DATA -> READY_TO_TEST -> APPROVED -> REJECTED)
router.patch('/questions/:id/status', async (req, res) => {
  try {
    const { status, resolvedAnswer, resolvedBy = 'Admin' } = req.body;
    const now = new Date().toISOString();

    await db.run(`
      UPDATE unanswered_questions
      SET status = ?,
          resolved_answer = COALESCE(?, resolved_answer),
          resolved_by = ?,
          updated_at = ?
      WHERE id = ?
    `, [status, resolvedAnswer || null, resolvedBy, now, req.params.id]);

    res.json({ success: true, id: req.params.id, status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. POST Ingest Knowledge (Direct QA, File Upload Base64, or URL)
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
      sourceType,
      sourceFilename,
      sourceUrl,
      fileBase64,
      textContent,
      approvedBy
    } = req.body;

    let fileBuffer = null;
    if (fileBase64) {
      fileBuffer = Buffer.from(fileBase64, 'base64');
    }

    const result = await LearningIngestionEngine.ingestKnowledge({
      unansweredQuestionId,
      entryType: entryType || 'QA',
      standardQuestion,
      standardAnswer,
      relatedTopic,
      relatedProductId,
      relatedProductName,
      sourceType: sourceType || 'DIRECT_INPUT',
      sourceFilename,
      sourceUrl,
      fileBuffer,
      textContent,
      approvedBy: approvedBy || 'Admin'
    });

    res.json({ success: true, result });
  } catch (err) {
    console.error('[LEARNING INGEST ERROR]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. POST Run Before vs After Test Bench
router.post('/test-run', async (req, res) => {
  try {
    const { unansweredQuestionId, learningKnowledgeId, customQuery } = req.body;
    const testResult = await LearningTestEngine.runBeforeAfterTest({
      unansweredQuestionId,
      learningKnowledgeId,
      customQuery
    });
    res.json({ success: true, testResult });
  } catch (err) {
    console.error('[LEARNING TEST ERROR]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. POST Approve Knowledge Entry
router.post('/approve', async (req, res) => {
  try {
    const { entryId, approvedBy } = req.body;
    const result = await LearningIngestionEngine.approveKnowledge(entryId, approvedBy || 'Admin');
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. POST Reject Knowledge Entry
router.post('/reject', async (req, res) => {
  try {
    const { entryId, reason, rejectedBy } = req.body;
    const result = await LearningIngestionEngine.rejectKnowledge(entryId, reason, rejectedBy || 'Admin');
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. GET Top 10 Most Frequently Asked Questions (Report F)
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

// 10. GET Export Report to Excel (Report F)
router.get('/export-excel', async (req, res) => {
  try {
    const rows = await db.all(`
      SELECT 
        q.id as "Mã câu hỏi",
        q.original_question as "Nội dung câu hỏi của khách",
        q.hit_count as "Tần suất hỏi (Lần)",
        COALESCE(q.related_product_name, 'Chưa xác định') as "Sản phẩm liên quan",
        COALESCE(q.related_topic, 'Kiến thức chung') as "Chủ đề / Ngành hàng",
        q.failure_reason as "Nguyên nhân chưa trả lời",
        q.status as "Trạng thái xử lý",
        COALESCE(q.resolved_answer, 'Chưa có câu trả lời chuẩn') as "Câu trả lời chuẩn đã duyệt",
        q.created_at as "Thời gian phát sinh",
        q.updated_at as "Cập nhật gần nhất"
      FROM unanswered_questions q
      ORDER BY q.hit_count DESC, q.created_at DESC
      LIMIT 100
    `);

    const worksheet = xlsx.utils.json_to_sheet(rows || []);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Top Gaps Kiến Thức');

    const excelBuffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="TOP_10_CAU_HOI_THIEU_KIEN_THUC_TRI_AN.xlsx"');
    res.send(excelBuffer);
  } catch (err) {
    console.error('[EXPORT EXCEL ERROR]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
