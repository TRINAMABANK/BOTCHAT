/**
 * TRÍ AI BOTCHAT - MULTI-FORMAT DOCUMENT PARSER SERVICE
 * 
 * Ingests PDF, Word (.docx), Excel (.xlsx, .xls, .csv), and Text files.
 * Preserves document layout, page counts, table structures, and metadata.
 */

import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

export class MultiDocParser {
  /**
   * Parse a file buffer according to its extension / MIME type
   * @param {Buffer} buffer - File buffer
   * @param {string} fileType - Extension or mime type (pdf, docx, xlsx, txt...)
   * @param {string} filename - Original filename
   */
  static async parseDocument(buffer, fileType = '', filename = '') {
    const ext = (fileType || filename.split('.').pop() || '').toLowerCase().replace(/^\./, '');

    switch (ext) {
      case 'pdf':
        return await this.parsePdf(buffer, filename);

      case 'docx':
      case 'doc':
        return await this.parseWord(buffer, filename);

      case 'xlsx':
      case 'xls':
      case 'csv':
        return await this.parseExcel(buffer, filename);

      case 'txt':
      case 'md':
      case 'json':
      default:
        return this.parsePlainText(buffer, filename);
    }
  }

  /**
   * Parse PDF buffer
   */
  static async parsePdf(buffer, filename = '') {
    try {
      const data = await pdfParse(buffer);
      return {
        success: true,
        fileType: 'pdf',
        filename,
        text: (data.text || '').trim(),
        pageCount: data.numpages || 1,
        info: data.info || {},
        metadata: {
          totalPages: data.numpages || 1,
          characterCount: (data.text || '').length
        }
      };
    } catch (err) {
      console.error('[MULTI-DOC PARSER] PDF parse failed:', err.message);
      return {
        success: false,
        fileType: 'pdf',
        filename,
        text: '',
        pageCount: 1,
        error: err.message
      };
    }
  }

  /**
   * Parse Word (.docx) buffer using mammoth
   */
  static async parseWord(buffer, filename = '') {
    try {
      const rawRes = await mammoth.extractRawText({ buffer });
      const rawText = (rawRes.value || '').trim();

      // Estimate page count based on ~2,500 characters per standard page
      const estPages = Math.max(1, Math.ceil(rawText.length / 2500));

      return {
        success: true,
        fileType: 'docx',
        filename,
        text: rawText,
        pageCount: estPages,
        warnings: rawRes.messages || [],
        metadata: {
          estimatedPages: estPages,
          characterCount: rawText.length
        }
      };
    } catch (err) {
      console.error('[MULTI-DOC PARSER] Word parse failed:', err.message);
      return {
        success: false,
        fileType: 'docx',
        filename,
        text: '',
        pageCount: 1,
        error: err.message
      };
    }
  }

  /**
   * Parse Excel (.xlsx, .xls, .csv) buffer preserving tabular rows & sheet headers
   */
  static async parseExcel(buffer, filename = '') {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetTexts = [];
      let totalRows = 0;

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) continue;

        // Convert to CSV string representation to retain row/column alignment
        const csv = XLSX.utils.sheet_to_csv(sheet);
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        totalRows += rows.length;

        sheetTexts.push(`--- BẢNG TÍNH / SHEET: ${sheetName} (Gồm ${rows.length} dòng) ---\n${csv}`);
      }

      const fullText = sheetTexts.join('\n\n');

      return {
        success: true,
        fileType: 'xlsx',
        filename,
        text: fullText,
        pageCount: workbook.SheetNames.length,
        sheetNames: workbook.SheetNames,
        totalRows,
        metadata: {
          sheets: workbook.SheetNames,
          totalRows,
          characterCount: fullText.length
        }
      };
    } catch (err) {
      console.error('[MULTI-DOC PARSER] Excel parse failed:', err.message);
      return {
        success: false,
        fileType: 'xlsx',
        filename,
        text: '',
        pageCount: 1,
        error: err.message
      };
    }
  }

  /**
   * Parse plain text / markdown / CSV
   */
  static parsePlainText(buffer, filename = '') {
    const text = buffer.toString('utf8').trim();
    const estPages = Math.max(1, Math.ceil(text.length / 2500));
    return {
      success: true,
      fileType: 'txt',
      filename,
      text,
      pageCount: estPages,
      metadata: {
        characterCount: text.length
      }
    };
  }
}

export default MultiDocParser;
