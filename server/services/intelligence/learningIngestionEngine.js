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
   * Analyze textual and semantic differences between old and new response
   */
  static analyzeDiff(oldText = '', newText = '') {
    const oldTokens = (oldText || '').trim().split(/\s+/).filter(Boolean);
    const newTokens = (newText || '').trim().split(/\s+/).filter(Boolean);
    const oldSet = new Set(oldTokens.map(t => t.toLowerCase()));
    const newSet = new Set(newTokens.map(t => t.toLowerCase()));

    const addedWords = newTokens.filter(t => !oldSet.has(t.toLowerCase()));
    const removedWords = oldTokens.filter(t => !newSet.has(t.toLowerCase()));

    let summary = 'Cập nhật nội dung câu trả lời chuẩn';
    if (removedWords.length > 0 && addedWords.length > 0) {
      summary = `Thay thế ${removedWords.length} từ cũ và bổ sung ${addedWords.length} thông tin mới`;
    } else if (addedWords.length > 0) {
      summary = `Bổ sung ${addedWords.length} thông tin chi tiết mới vào tri thức`;
    } else if (removedWords.length > 0) {
      summary = `Rút gọn và loại bỏ ${removedWords.length} thông tin không chính xác`;
    }

    return {
      summary,
      addedWordsCount: addedWords.length,
      removedWordsCount: removedWords.length,
      sampleAdded: addedWords.slice(0, 10).join(' '),
      sampleRemoved: removedWords.slice(0, 10).join(' '),
      oldLength: (oldText || '').length,
      newLength: (newText || '').length,
      similarityRatio: oldTokens.length > 0 
        ? Math.round((newTokens.filter(t => oldSet.has(t.toLowerCase())).length / Math.max(oldTokens.length, newTokens.length)) * 100) 
        : 0
    };
  }

  /**
   * Auto Learn from Admin correction:
   * Saves old/new answer, editor, edit time, diff analysis, versioning, conflict check, test case generation & automated testing
   */
  static async autoLearnFromCorrection(params = {}) {
    const {
      questionId = null,
      correctedAnswer = '',
      actor = 'Admin',
      orgId = 'default',
      relatedTopic = null,
      relatedProductName = null,
      relatedProductId = null,
      runTestNow = true
    } = params;

    if (!correctedAnswer || typeof correctedAnswer !== 'string' || !correctedAnswer.trim()) {
      throw new Error('Câu trả lời sửa của quản trị viên không được để trống.');
    }

    const cleanAnswer = correctedAnswer.trim();
    const now = new Date().toISOString();

    // 1. Fetch question record
    let questionRow = null;
    if (questionId) {
      questionRow = await db.get(`SELECT * FROM unanswered_questions WHERE id = ?`, [questionId]);
    }
    const standardQuestion = questionRow?.original_question || questionRow?.question || 'Câu hỏi tự học';
    const finalTopic = relatedTopic || questionRow?.related_topic || 'Kiến thức chung';
    const finalProductName = relatedProductName || questionRow?.related_product_name || null;
    const finalProductId = relatedProductId || questionRow?.related_product_id || null;
    const oldAnswer = questionRow?.ai_response || questionRow?.resolved_answer || '';

    // 2. Perform Diff Analysis
    const diffAnalysis = this.analyzeDiff(oldAnswer, cleanAnswer);

    // 3. Check for duplicates and conflicts
    let conflictFlag = 0;
    let conflictNotes = null;
    const existingKnowledge = await db.all(`
      SELECT id, standard_question, standard_answer, version
      FROM learning_knowledge_entries
      WHERE approval_status = 'APPROVED' AND is_active = 1
        AND (org_id = ? OR org_id = 'default')
        AND (related_topic = ? OR (related_product_name IS NOT NULL AND related_product_name = ?))
    `, [orgId, finalTopic, finalProductName]);

    if (existingKnowledge && existingKnowledge.length > 0) {
      for (const ex of existingKnowledge) {
        if (ex.standard_answer && ex.standard_answer.trim() !== cleanAnswer) {
          conflictFlag = 1;
          conflictNotes = `Cảnh báo mâu thuẫn: Mục tri thức "${ex.standard_question || ex.id}" có nội dung khác.`;
          break;
        }
      }
    }

    // 4. Update existing entry or Create new entry
    let entryId = questionRow?.resolved_knowledge_id;
    let previousAnswer = oldAnswer;
    let newVersion = 1;

    let targetEntry = null;
    if (entryId) {
      targetEntry = await db.get(`SELECT * FROM learning_knowledge_entries WHERE id = ?`, [entryId]);
    }

    if (targetEntry) {
      previousAnswer = targetEntry.standard_answer;
      newVersion = (targetEntry.version || 1) + 1;
      await db.run(`
        UPDATE learning_knowledge_entries
        SET standard_answer = ?,
            standard_question = COALESCE(?, standard_question),
            related_topic = COALESCE(?, related_topic),
            related_product_name = COALESCE(?, related_product_name),
            version = ?,
            approval_status = 'APPROVED',
            approved_by = ?,
            approved_at = ?,
            is_active = 1,
            conflict_flag = ?,
            conflict_notes = ?,
            updated_at = ?
        WHERE id = ?
      `, [cleanAnswer, standardQuestion, finalTopic, finalProductName, newVersion, actor, now, conflictFlag, conflictNotes, now, entryId]);
    } else {
      entryId = `k_entry_${randomUUID().slice(0, 10)}`;
      await db.run(`
        INSERT INTO learning_knowledge_entries (
          id, unanswered_question_id, entry_type, standard_question, standard_answer,
          related_topic, related_product_id, related_product_name, org_id,
          source_type, extracted_content, approval_status, approved_by, approved_at,
          conflict_flag, conflict_notes, version, is_active, created_at, updated_at
        ) VALUES (?, ?, 'QA', ?, ?, ?, ?, ?, ?, 'DIRECT_INPUT', ?, 'APPROVED', ?, ?, ?, ?, 1, 1, ?, ?)
      `, [
        entryId,
        questionId,
        standardQuestion,
        cleanAnswer,
        finalTopic,
        finalProductId,
        finalProductName,
        orgId,
        `[Sửa lỗi tự học do Admin ${actor}]: ${cleanAnswer}`,
        actor,
        now,
        conflictFlag,
        conflictNotes,
        now,
        now
      ]);
    }

    // 5. Save record in knowledge_versions
    const versionId = `kv_${randomUUID().slice(0, 10)}`;
    await db.run(`
      INSERT INTO knowledge_versions (
        id, document_id, version_number, change_summary, approved_by, created_at,
        entry_id, previous_answer, new_answer, diff_analysis_json, org_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      versionId,
      entryId,
      newVersion,
      diffAnalysis.summary,
      actor,
      now,
      entryId,
      previousAnswer,
      cleanAnswer,
      JSON.stringify(diffAnalysis),
      orgId
    ]);

    // 6. Generate Regression Test Case in ai_test_cases
    const testCaseId = `tc_auto_${randomUUID().slice(0, 10)}`;
    await db.run(`
      INSERT INTO ai_test_cases (
        id, category, test_name, input_prompt, expected_behavior,
        unanswered_question_id, knowledge_entry_id, org_id, is_active, created_at
      ) VALUES (?, 'AUTO_LEARNING_REGRESSION', ?, ?, ?, ?, ?, ?, 1, ?)
    `, [
      testCaseId,
      `Kiểm thử ngăn lỗi tái diễn: "${standardQuestion.slice(0, 40)}"`,
      standardQuestion,
      `Phải phản hồi đúng nội dung chuẩn: "${cleanAnswer.slice(0, 50)}"`,
      questionId,
      entryId,
      orgId,
      now
    ]);

    // 7. Update unanswered_questions
    if (questionId) {
      await db.run(`
        UPDATE unanswered_questions
        SET status = 'TESTING',
            resolved_answer = ?,
            resolved_by = ?,
            resolved_at = ?,
            resolved_knowledge_id = ?,
            last_corrected_at = ?,
            correction_diff_json = ?,
            updated_at = ?
        WHERE id = ?
      `, [cleanAnswer, actor, now, entryId, now, JSON.stringify(diffAnalysis), now, questionId]);
    }

    // 8. Run Automated Test if requested
    let testResult = null;
    let didRollback = false;
    if (runTestNow) {
      try {
        const { LearningTestEngine } = await import('./learningTestEngine.js');
        testResult = await LearningTestEngine.runBeforeAfterTest({
          unansweredQuestionId: questionId,
          learningKnowledgeId: entryId,
          customQuery: standardQuestion,
          orgId,
          testedBy: actor
        });

        if (testResult && testResult.passed) {
          if (questionId) {
            await db.run(`UPDATE unanswered_questions SET status = 'RESOLVED', updated_at = ? WHERE id = ?`, [now, questionId]);
          }
        } else {
          // Test failed! Trigger automatic rollback to previous version
          console.warn(`[AUTO LEARNING TEST FAILED] Score: ${testResult?.metrics?.accuracyScore || 0}%. Triggering Rollback!`);
          await this.rollbackKnowledgeVersion(entryId, Math.max(1, newVersion - 1), 'System_Auto_Rollback', orgId);
          didRollback = true;
          if (questionId) {
            await db.run(`
              UPDATE unanswered_questions 
              SET status = 'REVIEWING',
                  test_notes = 'Kiểm thử sau học không đạt yêu cầu. Đã tự động khôi phục phiên bản trước.',
                  updated_at = ? 
              WHERE id = ?
            `, [now, questionId]);
          }
        }
      } catch (testErr) {
        console.error('[AUTO LEARNING TEST ERROR]', testErr.message);
      }
    }

    // 9. Audit Log
    try {
      await db.run(`
        INSERT INTO learning_audit_log (id, question_id, knowledge_entry_id, action, actor, org_id, details_json, created_at)
        VALUES (?, ?, ?, 'AUTO_LEARN_CORRECTION', ?, ?, ?, ?)
      `, [
        `audit_${randomUUID().slice(0, 10)}`,
        questionId,
        entryId,
        actor,
        orgId,
        JSON.stringify({ newVersion, didRollback, diffAnalysis, conflictFlag }),
        now
      ]);
    } catch (_) {}

    return {
      success: true,
      entryId,
      version: newVersion,
      diffAnalysis,
      testCaseId,
      testResult,
      didRollback,
      conflictFlag: Boolean(conflictFlag),
      conflictNotes
    };
  }

  /**
   * Rollback Knowledge Entry to a specific previous version
   */
  static async rollbackKnowledgeVersion(entryId, targetVersionNumber, actor = 'Admin', orgId = 'default') {
    const now = new Date().toISOString();
    const entry = await db.get(`SELECT * FROM learning_knowledge_entries WHERE id = ?`, [entryId]);
    if (!entry) throw new Error('Không tìm thấy bản ghi tri thức.');

    const versionRow = await db.get(`
      SELECT * FROM knowledge_versions 
      WHERE (entry_id = ? OR document_id = ?) AND version_number = ?
      ORDER BY created_at DESC LIMIT 1
    `, [entryId, entryId, targetVersionNumber]);

    if (!versionRow && targetVersionNumber > 1) {
      throw new Error(`Không tìm thấy phiên bản v${targetVersionNumber} để khôi phục.`);
    }

    const restoredAnswer = versionRow ? (versionRow.new_answer || versionRow.previous_answer) : entry.standard_answer;

    await db.run(`
      UPDATE learning_knowledge_entries
      SET standard_answer = ?,
          version = ?,
          approval_status = 'APPROVED',
          is_active = 1,
          updated_at = ?
      WHERE id = ?
    `, [restoredAnswer, targetVersionNumber, now, entryId]);

    // Audit Log
    try {
      await db.run(`
        INSERT INTO learning_audit_log (id, question_id, knowledge_entry_id, action, actor, org_id, details_json, created_at)
        VALUES (?, ?, ?, 'ROLLBACK_VERSION', ?, ?, ?, ?)
      `, [
        `audit_${randomUUID().slice(0, 10)}`,
        entry.unanswered_question_id,
        entryId,
        actor,
        orgId,
        JSON.stringify({ targetVersionNumber, restoredAnswer: (restoredAnswer || '').slice(0, 100) }),
        now
      ]);
    } catch (_) {}

    return {
      success: true,
      entryId,
      restoredVersion: targetVersionNumber,
      restoredAnswer
    };
  }

  /**
   * Retrieve all versions of a specific knowledge entry
   */
  static async getKnowledgeVersions(entryId) {
    return await db.all(`
      SELECT * FROM knowledge_versions 
      WHERE entry_id = ? OR document_id = ?
      ORDER BY version_number DESC, created_at DESC
    `, [entryId, entryId]);
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

      // Check model code (distinctive entity with digits, e.g. m428fdw, kx-tsc11, 2166)
      const entryTokens = qNorm.split(/\s+/).filter(w => w.length >= 2 && !STOPWORDS.has(w));
      const modelCode = entryTokens.find(t => /\d/.test(t));

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
