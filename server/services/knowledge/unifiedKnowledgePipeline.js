/**
 * TRÍ AI ONE SUPER BRAIN - UNIFIED KNOWLEDGE PIPELINE SERVICE
 * 
 * Orchestrates the 10-Stage Unified Ingestion Pipeline for:
 * 1. Document Upload (PDF, DOCX, XLSX, PPTX, TXT, OCR Images)
 * 2. Website Crawler (Single page, bulk URLs, Sitemaps)
 * 3. Internet Research Candidates
 * 4. Experience & Curated Knowledge
 * 
 * Enforces SHA-256 Deduplication, Multi-Tenancy (org_id),
 * Product Scope isolation for the 6 TRÍ AI Products,
 * and Dense 128-dim Semantic Vector embeddings.
 */

import crypto, { randomUUID } from 'crypto';
import db from '../../db.js';
import MultiDocParser from '../parsers/multiDocParser.js';
import WebKnowledgeExtractor from '../crawler/webKnowledgeExtractor.js';
import RagService from '../ragService.js';

export class UnifiedKnowledgePipelineService {
  /**
   * Automatic categorization of content based on keyword heuristic
   */
  static categorizeContent(text = '', title = '') {
    const combined = `${title} ${text}`.toLowerCase();

    if (/bảng giá|đơn giá|báo giá|chiết khấu|khuyến mãi|mua hàng|bán hàng/i.test(combined)) {
      return 'SALES_PRICING';
    }
    if (/thông số kỹ thuật|cấu hình|hướng dẫn cài đặt|sơ đồ|lắp ráp|kết nối|port|cổng/i.test(combined)) {
      return 'TECHNICAL_SPEC';
    }
    if (/quy chế|quy trình|quy định|nội bộ|thủ tục|hồ sơ|công văn|chính sách/i.test(combined)) {
      return 'POLICY_PROCEDURE';
    }
    if (/bảo hành|đổi trả|hỗ trợ kỹ thuật|sửa chữa|bảo trì/i.test(combined)) {
      return 'WARRANTY_SUPPORT';
    }
    if (/lịch sử|sáng lập|người tạo ra|cha đẻ|giới thiệu công ty|về chúng tôi/i.test(combined)) {
      return 'FOUNDER_IDENTITY';
    }
    return 'GENERAL_KNOWLEDGE';
  }

  /**
   * Process a single unified knowledge item through the 10-stage pipeline
   */
  static async ingest({
    title = '',
    sourceType = 'UPLOAD', // 'UPLOAD' | 'WEBSITE' | 'INTERNET' | 'EXPERIENCE' | 'EXPERT'
    sourceUrl = null,
    originalFilename = null,
    fileType = 'txt',
    buffer = null,
    rawText = '',
    orgId = 'org_default',
    scope = 'global', // 'global' | 'private'
    productScope = 'all', // 'all' | 'sales_robot' | 'receptionist' | 'secretary' | 'tutor' | 'voice_vision' | 'enterprise'
    approvalStatus = 'PENDING_REVIEW', // 'APPROVED' | 'PENDING_REVIEW' | 'DRAFT'
    pageCount = 1,
    skipDuplicate = true
  }) {
    const now = new Date().toISOString();
    const docId = `doc_${randomUUID()}`;

    // STAGE 1 & 2: RECEIVE & EXTRACT
    let contentToIngest = rawText || '';
    let resolvedTitle = title || originalFilename || 'Tài liệu không tên';
    let resolvedPageCount = pageCount || 1;

    if (buffer && buffer.length > 0) {
      const parsed = await MultiDocParser.parseDocument(buffer, fileType, originalFilename || title);
      if (parsed.success && parsed.text) {
        contentToIngest = parsed.text;
        resolvedPageCount = parsed.pageCount || 1;
        if (!title && parsed.filename) resolvedTitle = parsed.filename;
      } else {
        throw new Error(parsed.error || 'Không thể trích xuất nội dung từ tệp tài liệu này');
      }
    }

    if (!contentToIngest || !contentToIngest.trim()) {
      throw new Error('Nội dung tài liệu rỗng hoặc không trích xuất được chữ');
    }

    // STAGE 3: NORMALIZATION
    const normalizedContent = contentToIngest
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // STAGE 4: CATEGORIZATION
    const category = this.categorizeContent(normalizedContent, resolvedTitle);

    // STAGE 7: DEDUPLICATION (Check SHA-256 Hash)
    const contentHash = crypto.createHash('sha256').update(normalizedContent).digest('hex');

    if (skipDuplicate) {
      const existing = await db.get(
        'SELECT id, title, version, approval_status FROM knowledge_documents WHERE content_hash = ? AND org_id = ?',
        [contentHash, orgId]
      );

      if (existing) {
        return {
          status: 'DUPLICATE_SKIPPED',
          message: `Nội dung đã tồn tại trong tài liệu "${existing.title}" (ID: ${existing.id})`,
          documentId: existing.id,
          title: existing.title,
          contentHash,
          isDuplicate: true
        };
      }
    }

    // STAGE 9: CENTRAL PERSISTENCE (Master Document Record)
    await db.run(`
      INSERT INTO knowledge_documents (
        id, title, file_type, file_path, file_size, source_type, status, extracted_text,
        version, org_id, scope, category_id, approval_status, approved_by, page_count,
        source_origin, source_url, original_filename, content_hash, processing_status,
        product_scope, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'ready', ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'READY', ?, ?, ?)
    `, [
      docId,
      resolvedTitle,
      fileType,
      originalFilename || sourceUrl || 'uploaded_doc',
      normalizedContent.length,
      sourceType.toLowerCase(),
      normalizedContent,
      orgId,
      scope,
      category,
      approvalStatus,
      approvalStatus === 'APPROVED' ? 'Hệ thống Quản trị' : null,
      resolvedPageCount,
      sourceType.toUpperCase(),
      sourceUrl,
      originalFilename,
      contentHash,
      productScope,
      now,
      now
    ]);

    // STAGE 5 & 6: CHUNKING & DENSE EMBEDDING (128-DIM L2-NORMALIZED)
    const chunkSize = 500;
    const overlap = 80;
    let start = 0;
    let chunkIdx = 0;
    const chunksCreated = [];

    while (start < normalizedContent.length) {
      const end = Math.min(start + chunkSize, normalizedContent.length);
      const chunkText = normalizedContent.slice(start, end).trim();

      if (chunkText.length > 20) {
        const chunkId = `chk_${randomUUID()}`;
        await db.run(`
          INSERT INTO knowledge_chunks (id, document_id, chunk_index, content, char_count, org_id, scope, product_scope, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [chunkId, docId, chunkIdx, chunkText, chunkText.length, orgId, scope, productScope, now]);

        try {
          const chunkHash = crypto.createHash('sha256').update(chunkText).digest('hex');
          const embedding = RagService.computeSemanticEmbedding(chunkText, 128);
          await db.run(`
            INSERT OR REPLACE INTO ai_vector_embeddings (id, content_hash, chunk_id, embedding_json, dimensions, created_at)
            VALUES (?, ?, ?, ?, 128, ?)
          `, [`vec_${randomUUID().slice(0, 10)}`, chunkHash, chunkId, JSON.stringify(embedding), now]);
        } catch {}

        chunksCreated.push(chunkId);
        chunkIdx++;
      }

      start += (chunkSize - overlap);
    }

    // STAGE 10: BRAIN GATE READY
    return {
      status: 'INGESTED',
      documentId: docId,
      title: resolvedTitle,
      sourceOrigin: sourceType.toUpperCase(),
      category,
      contentHash,
      totalChunks: chunkIdx,
      approvalStatus,
      productScope,
      orgId,
      isDuplicate: false
    };
  }

  /**
   * Process multiple files in a batch with progress tracking
   */
  static async processBatchFiles({
    files = [],
    orgId = 'org_default',
    scope = 'global',
    productScope = 'all',
    approvalStatus = 'PENDING_REVIEW'
  }) {
    const batchId = `batch_${randomUUID()}`;
    const now = new Date().toISOString();
    const totalFiles = files.length;

    await db.run(`
      INSERT INTO knowledge_batch_uploads (id, org_id, total_files, processed_files, successful_files, failed_files, status, error_log_json, created_at, updated_at)
      VALUES (?, ?, ?, 0, 0, 0, 'PROCESSING', '[]', ?, ?)
    `, [batchId, orgId, totalFiles, now, now]);

    // Process asynchronously or return Promise
    const results = [];
    let successful = 0;
    let failed = 0;
    const errors = [];

    for (let i = 0; i < totalFiles; i++) {
      const file = files[i];
      try {
        let buffer;
        if (file.dataUrl) {
          const base64Data = file.dataUrl.replace(/^data:.*?;base64,/, '');
          buffer = Buffer.from(base64Data, 'base64');
        } else if (file.rawText) {
          buffer = Buffer.from(file.rawText, 'utf8');
        }

        const ext = file.fileName ? file.fileName.split('.').pop().toLowerCase() : 'txt';

        const res = await this.ingest({
          title: file.title || file.fileName,
          sourceType: 'UPLOAD',
          originalFilename: file.fileName,
          fileType: ext,
          buffer,
          rawText: file.rawText || '',
          orgId,
          scope,
          productScope,
          approvalStatus
        });

        successful++;
        results.push({ file: file.fileName, ...res });
      } catch (err) {
        failed++;
        errors.push({ file: file.fileName, error: err.message });
        results.push({ file: file.fileName, status: 'FAILED', error: err.message });
      }

      // Update progress in DB
      const processed = i + 1;
      const isComplete = processed === totalFiles;
      await db.run(`
        UPDATE knowledge_batch_uploads
        SET processed_files = ?, successful_files = ?, failed_files = ?, status = ?, error_log_json = ?, updated_at = ?
        WHERE id = ?
      `, [processed, successful, failed, isComplete ? 'COMPLETED' : 'PROCESSING', JSON.stringify(errors), new Date().toISOString(), batchId]);
    }

    return {
      batchId,
      totalFiles,
      successful,
      failed,
      results
    };
  }

  /**
   * Process Web Crawled Page through Pipeline
   */
  static async ingestCrawledWebPage({
    url,
    html,
    orgId = 'org_default',
    scope = 'global',
    productScope = 'all',
    approvalStatus = 'PENDING_REVIEW'
  }) {
    const extracted = WebKnowledgeExtractor.extract(html, url);
    if (!extracted.success || !extracted.cleanText) {
      throw new Error(extracted.error || 'Trang web không có đủ nội dung văn bản');
    }

    return await this.ingest({
      title: extracted.title,
      sourceType: 'WEBSITE',
      sourceUrl: url,
      rawText: extracted.cleanText,
      fileType: 'url',
      orgId,
      scope,
      productScope,
      approvalStatus,
      skipDuplicate: true
    });
  }
}

export default UnifiedKnowledgePipelineService;
