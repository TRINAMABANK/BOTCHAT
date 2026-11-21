/**
 * LEARNING INGESTION ENGINE – NẠP VÀ XỬ LÝ TRI THỨC CHO TRÍ AN
 * (TRÍ AN LEARNING CENTER)
 * 
 * Capabilities:
 * - Tiếp nhận tri thức từ: Nhập QA trực tiếp, PDF, Word (.docx), Excel (.xlsx), CSV, TXT, Website URL.
 * - Trích xuất văn bản có cấu trúc và xem trước (Preview).
 * - Gắn kết tri thức với sản phẩm hoặc chủ đề.
 * - Quản lý vòng đời tri thức: NEW -> IN_REVIEW -> WAITING_DATA -> READY_TO_TEST -> APPROVED -> REJECTED.
 * - Quản lý phiên bản và vô hiệu hóa kiến thức cũ.
 */

import { randomUUID } from 'crypto';
import db from '../../db.js';
import * as cheerio from 'cheerio';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import * as xlsx from 'xlsx';
import mammoth from 'mammoth';

export class LearningIngestionEngine {
  /**
   * Ingest Knowledge from various sources
   */
  static async ingestKnowledge(payload = {}) {
    const {
      unansweredQuestionId = null,
      entryType = 'QA', // 'QA' | 'DOCUMENT' | 'WEBSITE' | 'EXCEL'
      standardQuestion = '',
      standardAnswer = '',
      relatedTopic = 'Kiến thức chung',
      relatedProductId = null,
      relatedProductName = null,
      sourceType = 'DIRECT_INPUT', // 'DIRECT_INPUT' | 'PDF' | 'WORD' | 'EXCEL' | 'CSV' | 'TXT' | 'WEBSITE'
      sourceFilename = null,
      sourceUrl = null,
      fileBuffer = null,
      textContent = '',
      approvedBy = 'Admin'
    } = payload;

    let extractedContent = '';

    // 1. Parse File or Source based on sourceType
    if (sourceType === 'DIRECT_INPUT') {
      extractedContent = `[Hỏi đáp chuẩn]:\nCâu hỏi: ${standardQuestion}\nTrả lời: ${standardAnswer}`;
    } else if (sourceType === 'PDF' && fileBuffer) {
      try {
        const pdfData = await pdfParse(fileBuffer);
        extractedContent = (pdfData.text || '').trim();
      } catch (err) {
        throw new Error(`Lỗi đọc file PDF: ${err.message}`);
      }
    } else if (sourceType === 'WORD' && fileBuffer) {
      try {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        extractedContent = (result.value || '').trim();
      } catch (err) {
        throw new Error(`Lỗi đọc file Word: ${err.message}`);
      }
    } else if ((sourceType === 'EXCEL' || sourceType === 'CSV') && fileBuffer) {
      try {
        const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        extractedContent = `[Bảng tính ${sheetName}]:\n` + rows.map(r => r.join(' | ')).join('\n');
      } catch (err) {
        throw new Error(`Lỗi đọc file Excel/CSV: ${err.message}`);
      }
    } else if (sourceType === 'TXT') {
      extractedContent = (textContent || fileBuffer?.toString('utf8') || '').trim();
    } else if (sourceType === 'WEBSITE' && sourceUrl) {
      try {
        const response = await fetch(sourceUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TriAnLearningBot/1.0' },
          signal: AbortSignal.timeout(10000)
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const html = await response.text();
        const $ = cheerio.load(html);
        $('script, style, nav, footer, header, noscript').remove();
        const title = $('title').text().trim();
        const bodyText = $('main, article, .content, #content, body').text().replace(/\s+/g, ' ').trim();
        extractedContent = `[Website ${title} - ${sourceUrl}]:\n${bodyText.slice(0, 8000)}`;
      } catch (err) {
        throw new Error(`Lỗi cào dữ liệu website: ${err.message}`);
      }
    } else {
      extractedContent = textContent || standardAnswer || '';
    }

    if (!extractedContent && !standardAnswer) {
      throw new Error('Nội dung tri thức trích xuất rỗng. Vui lòng kiểm tra lại file hoặc thông tin nhập.');
    }

    const now = new Date().toISOString();
    const entryId = `k_entry_${randomUUID().slice(0, 10)}`;
    const finalAnswer = standardAnswer.trim() || extractedContent.slice(0, 1000);

    // 2. Insert into learning_knowledge_entries
    await db.run(`
      INSERT INTO learning_knowledge_entries (
        id, unanswered_question_id, entry_type, standard_question, standard_answer,
        related_topic, related_product_id, related_product_name, source_type,
        source_filename, source_url, extracted_content, approval_status,
        approved_by, approved_at, version, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'READY_TO_TEST', ?, ?, 1, 1, ?, ?)
    `, [
      entryId,
      unansweredQuestionId,
      entryType,
      standardQuestion.trim() || (sourceFilename ? `Tài liệu: ${sourceFilename}` : 'Tri thức tổng hợp'),
      finalAnswer,
      relatedTopic,
      relatedProductId,
      relatedProductName,
      sourceType,
      sourceFilename,
      sourceUrl,
      extractedContent,
      approvedBy,
      now,
      now,
      now
    ]);

    // 3. If tied to an unanswered question, advance question status to READY_TO_TEST
    if (unansweredQuestionId) {
      await db.run(`
        UPDATE unanswered_questions
        SET status = 'READY_TO_TEST',
            resolved_answer = ?,
            resolved_knowledge_id = ?,
            resolved_by = ?,
            updated_at = ?
        WHERE id = ?
      `, [finalAnswer, entryId, approvedBy, now, unansweredQuestionId]);
    }

    return {
      success: true,
      entryId,
      extractedPreview: extractedContent.slice(0, 400),
      status: 'READY_TO_TEST'
    };
  }

  /**
   * Approve a knowledge entry so it immediately takes effect in runtime chat
   */
  static async approveKnowledge(entryId, approvedBy = 'Admin') {
    const now = new Date().toISOString();
    const entry = await db.get(`SELECT * FROM learning_knowledge_entries WHERE id = ?`, [entryId]);
    if (!entry) throw new Error('Không tìm thấy bản ghi tri thức.');

    await db.run(`
      UPDATE learning_knowledge_entries
      SET approval_status = 'APPROVED',
          approved_by = ?,
          approved_at = ?,
          is_active = 1,
          updated_at = ?
      WHERE id = ?
    `, [approvedBy, now, now, entryId]);

    // If linked to an unanswered question, mark question as APPROVED
    if (entry.unanswered_question_id) {
      await db.run(`
        UPDATE unanswered_questions
        SET status = 'APPROVED',
            resolved_by = ?,
            resolved_at = ?,
            updated_at = ?
        WHERE id = ?
      `, [approvedBy, now, now, entry.unanswered_question_id]);
    }

    return { success: true, entryId, status: 'APPROVED' };
  }

  /**
   * Reject a knowledge entry
   */
  static async rejectKnowledge(entryId, reason = 'Không phù hợp', rejectedBy = 'Admin') {
    const now = new Date().toISOString();
    await db.run(`
      UPDATE learning_knowledge_entries
      SET approval_status = 'REJECTED',
          approved_by = ?,
          updated_at = ?
      WHERE id = ?
    `, [rejectedBy, now, entryId]);

    return { success: true, entryId, status: 'REJECTED' };
  }

  /**
   * Search approved curated knowledge entries (Priority 1 in Runtime Brain)
   */
  static async lookupApprovedKnowledge(query = '') {
    if (!query || typeof query !== 'string') return null;
    const cleanQuery = query.toLowerCase().trim();

    // Query active & approved knowledge
    const entries = await db.all(`
      SELECT * FROM learning_knowledge_entries
      WHERE approval_status = 'APPROVED' AND is_active = 1
      ORDER BY updated_at DESC
    `);

    if (!entries || entries.length === 0) return null;

    // Direct and token overlap matching
    for (const e of entries) {
      const qNorm = (e.standard_question || '').toLowerCase();
      if (qNorm && (cleanQuery.includes(qNorm) || qNorm.includes(cleanQuery))) {
        return e;
      }
      if (e.related_product_name && cleanQuery.includes(e.related_product_name.toLowerCase())) {
        return e;
      }
    }

    return null;
  }
}

export default LearningIngestionEngine;
