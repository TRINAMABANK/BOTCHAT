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
import { isSafePublicUrl } from '../../utils/ssrfProtection.js';

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
      policyType = null,
      businessGroup = null,
      orgId = 'default',
      sourceType = 'DIRECT_INPUT', // 'DIRECT_INPUT' | 'PDF' | 'WORD' | 'EXCEL' | 'CSV' | 'TXT' | 'WEBSITE'
      sourceFilename = null,
      sourceUrl = null,
      fileBuffer = null,
      textContent = '',
      approvedBy = 'Admin',
      isDraft = false
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
      // Security Check: Block SSRF attempts
      if (!isSafePublicUrl(sourceUrl)) {
        throw new Error('URL website không hợp lệ hoặc bị chặn vì lý do bảo mật mạng nội bộ (SSRF Protection).');
      }
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
    const initialStatus = isDraft ? 'DRAFT' : 'PENDING_REVIEW';

    // 2. Conflict Detection: Check if active approved knowledge already exists with conflicting info
    let conflictFlag = 0;
    let conflictNotes = null;
    try {
      const existingEntries = await db.all(`
        SELECT id, standard_question, standard_answer 
        FROM learning_knowledge_entries 
        WHERE approval_status = 'APPROVED' AND is_active = 1
          AND (org_id = ? OR org_id = 'default')
          AND (
            related_topic = ? 
            OR (related_product_name IS NOT NULL AND related_product_name = ?)
          )
        LIMIT 5
      `, [orgId, relatedTopic, relatedProductName]);

      if (existingEntries && existingEntries.length > 0) {
        for (const ex of existingEntries) {
          // If answer is substantially different, flag as potential conflict for Admin review
          if (ex.standard_answer && ex.standard_answer.trim() !== finalAnswer.trim()) {
            conflictFlag = 1;
            conflictNotes = `Cảnh báo mâu thuẫn: Đã tồn tại tri thức đã duyệt "${ex.standard_question || ex.id}" với nội dung khác. Cần Admin kiểm tra rà soát.`;
            break;
          }
        }
      }
    } catch (_) {}

    // 3. Insert into learning_knowledge_entries
    await db.run(`
      INSERT INTO learning_knowledge_entries (
        id, unanswered_question_id, entry_type, standard_question, standard_answer,
        related_topic, related_product_id, related_product_name, policy_type,
        business_group, org_id, source_type, source_filename, source_url,
        extracted_content, approval_status, approved_by, approved_at,
        conflict_flag, conflict_notes, version, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, 1, 0, ?, ?)
    `, [
      entryId,
      unansweredQuestionId,
      entryType,
      standardQuestion.trim() || (sourceFilename ? `Tài liệu: ${sourceFilename}` : 'Tri thức tổng hợp'),
      finalAnswer,
      relatedTopic,
      relatedProductId,
      relatedProductName,
      policyType,
      businessGroup,
      orgId,
      sourceType,
      sourceFilename,
      sourceUrl,
      extractedContent,
      initialStatus,
      conflictFlag,
      conflictNotes,
      now,
      now
    ]);

    // 4. If tied to an unanswered question, advance question status to WAITING_KNOWLEDGE or READY_TO_TEST
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

    // 5. Audit Log
    try {
      await db.run(`
        INSERT INTO learning_audit_log (id, question_id, knowledge_entry_id, action, actor, org_id, details_json, created_at)
        VALUES (?, ?, ?, 'INGEST_KNOWLEDGE', ?, ?, ?, ?)
      `, [
        `audit_${randomUUID().slice(0, 10)}`,
        unansweredQuestionId,
        entryId,
        approvedBy,
        orgId,
        JSON.stringify({ entryType, sourceType, isDraft, conflictFlag }),
        now
      ]);
    } catch (_) {}

    return {
      success: true,
      entryId,
      extractedPreview: extractedContent.slice(0, 400),
      status: initialStatus,
      conflictFlag: Boolean(conflictFlag),
      conflictNotes
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

    // If linked to an unanswered question, advance question status to READY_TO_TEST
    if (entry.unanswered_question_id) {
      await db.run(`
        UPDATE unanswered_questions
        SET status = 'READY_TO_TEST',
            resolved_by = ?,
            resolved_at = ?,
            updated_at = ?
        WHERE id = ?
      `, [approvedBy, now, now, entry.unanswered_question_id]);
    }

    // Audit Log
    try {
      await db.run(`
        INSERT INTO learning_audit_log (id, question_id, knowledge_entry_id, action, actor, org_id, details_json, created_at)
        VALUES (?, ?, ?, 'APPROVE_KNOWLEDGE', ?, ?, ?, ?)
      `, [`audit_${randomUUID().slice(0, 10)}`, entry.unanswered_question_id, entryId, approvedBy, entry.org_id || 'default', JSON.stringify({ previousStatus: entry.approval_status }), now]);
    } catch (_) {}

    return { success: true, entryId, status: 'APPROVED' };
  }

  /**
   * Reject a knowledge entry
   */
  static async rejectKnowledge(entryId, reason = 'Không phù hợp', rejectedBy = 'Admin') {
    const now = new Date().toISOString();
    const entry = await db.get(`SELECT * FROM learning_knowledge_entries WHERE id = ?`, [entryId]);
    if (!entry) throw new Error('Không tìm thấy bản ghi tri thức.');

    await db.run(`
      UPDATE learning_knowledge_entries
      SET approval_status = 'REJECTED',
          approved_by = ?,
          is_active = 0,
          updated_at = ?
      WHERE id = ?
    `, [rejectedBy, now, entryId]);

    if (entry.unanswered_question_id) {
      await db.run(`
        UPDATE unanswered_questions
        SET status = 'REJECTED',
            updated_at = ?
        WHERE id = ?
      `, [now, entry.unanswered_question_id]);
    }

    // Audit Log
    try {
      await db.run(`
        INSERT INTO learning_audit_log (id, question_id, knowledge_entry_id, action, actor, org_id, details_json, created_at)
        VALUES (?, ?, ?, 'REJECT_KNOWLEDGE', ?, ?, ?, ?)
      `, [`audit_${randomUUID().slice(0, 10)}`, entry.unanswered_question_id, entryId, rejectedBy, entry.org_id || 'default', JSON.stringify({ reason }), now]);
    } catch (_) {}

    return { success: true, entryId, status: 'REJECTED' };
  }

  /**
   * Update an existing knowledge entry
   */
  static async updateKnowledge(entryId, updates = {}, updatedBy = 'Admin') {
    const now = new Date().toISOString();
    const entry = await db.get(`SELECT * FROM learning_knowledge_entries WHERE id = ?`, [entryId]);
    if (!entry) throw new Error('Không tìm thấy bản ghi tri thức.');

    const { standardQuestion, standardAnswer, relatedTopic, relatedProductName, policyType, businessGroup } = updates;
    
    await db.run(`
      UPDATE learning_knowledge_entries
      SET standard_question = COALESCE(?, standard_question),
          standard_answer = COALESCE(?, standard_answer),
          related_topic = COALESCE(?, related_topic),
          related_product_name = COALESCE(?, related_product_name),
          policy_type = COALESCE(?, policy_type),
          business_group = COALESCE(?, business_group),
          version = version + 1,
          updated_at = ?
      WHERE id = ?
    `, [standardQuestion || null, standardAnswer || null, relatedTopic || null, relatedProductName || null, policyType || null, businessGroup || null, now, entryId]);

    // Audit Log
    try {
      await db.run(`
        INSERT INTO learning_audit_log (id, question_id, knowledge_entry_id, action, actor, org_id, details_json, created_at)
        VALUES (?, ?, ?, 'UPDATE_KNOWLEDGE', ?, ?, ?, ?)
      `, [`audit_${randomUUID().slice(0, 10)}`, entry.unanswered_question_id, entryId, updatedBy, entry.org_id || 'default', JSON.stringify(updates), now]);
    } catch (_) {}

    return { success: true, entryId, updated: true };
  }

  /**
   * Enable or disable (vô hiệu hóa) a knowledge entry
   */
  static async toggleKnowledgeActive(entryId, isActive = true, updatedBy = 'Admin') {
    const now = new Date().toISOString();
    const entry = await db.get(`SELECT * FROM learning_knowledge_entries WHERE id = ?`, [entryId]);
    if (!entry) throw new Error('Không tìm thấy bản ghi tri thức.');

    await db.run(`
      UPDATE learning_knowledge_entries
      SET is_active = ?,
          updated_at = ?
      WHERE id = ?
    `, [isActive ? 1 : 0, now, entryId]);

    // Audit Log
    try {
      await db.run(`
        INSERT INTO learning_audit_log (id, question_id, knowledge_entry_id, action, actor, org_id, details_json, created_at)
        VALUES (?, ?, ?, 'TOGGLE_ACTIVE', ?, ?, ?, ?)
      `, [`audit_${randomUUID().slice(0, 10)}`, entry.unanswered_question_id, entryId, updatedBy, entry.org_id || 'default', JSON.stringify({ isActive }), now]);
    } catch (_) {}

    return { success: true, entryId, isActive: Boolean(isActive) };
  }

  /**
   * Search approved curated knowledge entries (Priority 1 in Runtime Brain)
   * Scoped by tenant orgId to prevent cross-tenant knowledge leaks!
   */
  static async lookupApprovedKnowledge(query = '', orgId = 'default') {
    if (!query || typeof query !== 'string') return null;
    const cleanQuery = query.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').trim();
    if (!cleanQuery) return null;

    // Filter out pure staff handoff or greeting queries
    if (/^(toi can gap nhan vien|gap nhan vien|gap nguoi|ho tro truc tiep|chuyen nguoi|tu van truc tiep|xin chao|chao ban|chao shop)\b/i.test(cleanQuery)) {
      return null;
    }

    // Query active & approved knowledge strictly for this tenant or shared 'default'
    const entries = await db.all(`
      SELECT * FROM learning_knowledge_entries
      WHERE approval_status = 'APPROVED' AND is_active = 1
        AND (org_id = ? OR org_id = 'default')
      ORDER BY updated_at DESC
    `, [orgId]);

    if (!entries || entries.length === 0) return null;

    const STOPWORDS = new Set([
      'shop', 'cua', 'của', 'ben', 'bên', 'minh', 'mình', 'ban', 'bán', 'cho', 'xin', 'co', 'có', 
      'khong', 'không', 'the', 'thế', 'nao', 'nào', 'nay', 'này', 'em', 'anh', 'chi', 'chị', 'hoi', 
      'hỏi', 'muon', 'muốn', 'voi', 'với', 'va', 'và', 'hay', 'da', 'dạ', 'dang', 'đang', 'duoc', 
      'được', 'di', 'đi', 'gi', 'gì', 'k', 'ko', 'nhe', 'nhé', 'a', 'ạ', 'oi', 'ơi', 'ti', 'la', 'là',
      've', 'về', 'cac', 'các', 'loai', 'loại', 'mau', 'mẫu', 'dien', 'thoai', 'điện', 'thoại'
    ]);

    const BRANDS = ['panasonic', 'nec', 'lenovo', 'brother', 'samsung', 'canon', 'apple', 'dell', 'hp', 'avision', 'silicon'];
    const queryBrand = BRANDS.find(b => cleanQuery.includes(b));

    const queryWords = cleanQuery.split(/\s+/).filter(w => w.length >= 2);
    const queryWordSet = new Set(queryWords);

    // Direct and token overlap matching
    for (const e of entries) {
      const qNorm = (e.standard_question || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').trim();
      const entryBrand = BRANDS.find(b => qNorm.includes(b) || (e.related_product_name && e.related_product_name.toLowerCase().includes(b)));

      // If both have brand or query mentions a brand, they must match!
      if (queryBrand && entryBrand && queryBrand !== entryBrand) {
        continue;
      }
      if (entryBrand && !queryBrand && !cleanQuery.includes(entryBrand)) {
        // Entry is specifically about a brand that query does not mention
        continue;
      }

      // Check model code / distinctive entity
      const entryTokens = qNorm.split(/\s+/).filter(w => w.length >= 2 && !STOPWORDS.has(w));
      const modelCode = entryTokens.find(t => /\d/.test(t) || t.length >= 4);

      if (qNorm && (cleanQuery.includes(qNorm) || qNorm.includes(cleanQuery))) {
        return e;
      }
      if (e.related_product_name) {
        const prodNorm = e.related_product_name.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').trim();
        if (prodNorm && cleanQuery.includes(prodNorm)) {
          return e;
        }
      }

      // Token overlap matching for natural paraphrased queries
      if (entryTokens.length >= 2) {
        const matchCount = entryTokens.filter(t => queryWordSet.has(t) || cleanQuery.includes(t)).length;
        const ratio = matchCount / entryTokens.length;
        // If entry has a model code or distinctive token, it must be matched!
        if (modelCode && !cleanQuery.includes(modelCode)) {
          continue;
        }
        if ((matchCount >= 2 && ratio >= 0.4) || matchCount >= 3) {
          return e;
        }
      }
    }

    return null;
  }
}

export default LearningIngestionEngine;
