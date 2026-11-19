/**
 * TRÍ AI ULTIMATE ROBOT - RAG SERVICE (KNOWLEDGE RETRIEVAL ENGINE)
 * 
 * Supports Multi-Tenancy (Global Knowledge vs Private Organization Knowledge),
 * Hybrid full-text/token search, page/sheet citations, and approval workflows.
 */

import { randomUUID } from 'crypto';
import db from '../db.js';

function removeVietnameseTones(str = '') {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd');
}

export class RagService {
  /**
   * Hybrid Search over Knowledge Base with strict Scope & Approval isolation
   */
  static async searchKnowledge(options = {}) {
    const {
      query = '',
      orgId = 'org_default',
      scope = 'all', // 'all', 'global', 'private'
      limit = 5
    } = options;

    if (!query.trim()) {
      return [];
    }

    // Build Scope Condition
    let scopeSql = "kd.approval_status = 'APPROVED'";
    const params = [];

    if (scope === 'global') {
      scopeSql += " AND kd.scope = 'global'";
    } else if (scope === 'private') {
      scopeSql += " AND kd.scope = 'private' AND kd.org_id = ?";
      params.push(orgId);
    } else {
      // 'all': Allow both global knowledge AND current organization's private knowledge
      scopeSql += " AND (kd.scope = 'global' OR kd.org_id = ?)";
      params.push(orgId);
    }

    // Retrieve active chunks
    const sql = `
      SELECT 
        kc.id as chunk_id,
        kc.document_id,
        kc.chunk_index,
        kc.content,
        kc.page_number,
        kc.sheet_name,
        kd.title as doc_title,
        kd.file_type,
        kd.scope,
        kd.org_id
      FROM knowledge_chunks kc
      JOIN knowledge_documents kd ON kc.document_id = kd.id
      WHERE ${scopeSql}
    `;

    const allChunks = await db.all(sql, params);
    if (!allChunks || allChunks.length === 0) {
      return [];
    }

    // Hybrid Scoring (Keyword Matching + Title Priority + Vietnamese Normalization)
    const normQuery = removeVietnameseTones(query);
    const queryTokens = normQuery.split(/\s+/).filter(t => t.length > 1);

    const scoredChunks = allChunks.map(chunk => {
      const normContent = removeVietnameseTones(chunk.content);
      const normTitle = removeVietnameseTones(chunk.doc_title);

      let score = 0;

      // Exact phrase match
      if (normContent.includes(normQuery)) {
        score += 5.0;
      }

      // Title match gives strong boost
      if (normTitle.includes(normQuery)) {
        score += 4.0;
      }

      // Individual token matches
      queryTokens.forEach(token => {
        if (normTitle.includes(token)) score += 1.5;
        if (normContent.includes(token)) score += 0.8;
      });

      return {
        ...chunk,
        score: Math.round(score * 100) / 100
      };
    });

    // Filter and Sort by Score
    return scoredChunks
      .filter(c => c.score > 0.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(c => ({
        chunkId: c.chunk_id,
        documentId: c.document_id,
        docTitle: c.doc_title,
        fileType: c.file_type,
        scope: c.scope,
        pageNumber: c.page_number,
        sheetName: c.sheet_name,
        content: c.content,
        score: c.score,
        citationLabel: c.page_number 
          ? `[Nguồn: ${c.doc_title} - Trang: ${c.page_number}]` 
          : c.sheet_name 
            ? `[Nguồn: ${c.doc_title} - Sheet: ${c.sheet_name}]` 
            : `[Nguồn: ${c.doc_title}]`
      }));
  }

  /**
   * Ingest and chunk a text document
   */
  static async ingestDocument(doc = {}) {
    const {
      title,
      fileType = 'txt',
      filePath = null,
      content = '',
      orgId = 'org_default',
      scope = 'global',
      approvalStatus = 'APPROVED',
      pageCount = 1
    } = doc;

    const docId = `doc_${randomUUID()}`;
    const now = new Date().toISOString();

    await db.run(`
      INSERT INTO knowledge_documents (id, title, file_type, file_path, file_size, source_type, status, extracted_text, version, org_id, scope, approval_status, page_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'upload', 'ready', ?, 1, ?, ?, ?, ?, ?, ?)
    `, [docId, title, fileType, filePath, content.length, content, orgId, scope, approvalStatus, pageCount, now, now]);

    // Split content into chunks (~500 chars with 100 chars overlap)
    const chunkSize = 500;
    const overlap = 80;
    let start = 0;
    let chunkIdx = 0;

    while (start < content.length) {
      const end = Math.min(start + chunkSize, content.length);
      const chunkText = content.slice(start, end).trim();

      if (chunkText.length > 20) {
        const chunkId = `chk_${randomUUID()}`;
        await db.run(`
          INSERT INTO knowledge_chunks (id, document_id, chunk_index, content, char_count, org_id, scope, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [chunkId, docId, chunkIdx, chunkText, chunkText.length, orgId, scope, now]);
        chunkIdx++;
      }

      start += (chunkSize - overlap);
    }

    return {
      documentId: docId,
      title,
      totalChunks: chunkIdx
    };
  }

  /**
   * Log verified citation for AI transparency and audit
   */
  static async logCitations(conversationId, messageId, citations = []) {
    if (!citations || citations.length === 0) return;
    const now = new Date().toISOString();

    for (const c of citations) {
      const logId = `cite_${randomUUID()}`;
      await db.run(`
        INSERT INTO citation_logs (id, conversation_id, message_id, document_id, chunk_id, citation_text, score, page_number, sheet_name, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [logId, conversationId || 'anon', messageId || 'anon', c.documentId || null, c.chunkId || null, c.citationLabel || '', c.score || 0, c.pageNumber || null, c.sheetName || null, now]);
    }
  }
}

export default RagService;
