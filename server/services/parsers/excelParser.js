/**
 * TRÍ AI ULTIMATE ROBOT - STRUCTURED EXCEL PARSER & QUERY ENGINE
 * 
 * Preserves Sheets, Columns, Rows, and Data Types for exact computation,
 * eliminating hallucination in financial and numeric data queries.
 */

import * as XLSX from 'xlsx';
import { randomUUID } from 'crypto';
import db from '../../db.js';

/**
 * Infer data type of column values
 */
function inferType(values) {
  const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
  if (nonNull.length === 0) return 'string';

  let isNum = true;
  for (const v of nonNull) {
    if (typeof v === 'number') continue;
    const clean = String(v).replace(/[,.₫đ$\s]/g, '');
    if (isNaN(Number(clean)) || clean === '') {
      isNum = false;
      break;
    }
  }
  return isNum ? 'number' : 'string';
}

/**
 * Clean numeric string to float
 */
function parseNumeric(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const clean = String(val).replace(/[,.₫đ$\s]/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

export class ExcelParser {
  /**
   * Parse an Excel buffer or file and persist structured sheets & rows in DB
   */
  static async parseAndPersist(bufferOrPath, options = {}) {
    const { documentId, orgId = 'org_default' } = options;
    const docId = documentId || `doc_xl_${randomUUID()}`;

    let workbook;
    if (typeof bufferOrPath === 'string') {
      workbook = XLSX.readFile(bufferOrPath);
    } else {
      workbook = XLSX.read(bufferOrPath, { type: 'buffer' });
    }

    const now = new Date().toISOString();
    const parsedSheets = [];

    // Ensure parent document exists in knowledge_documents for Foreign Key integrity
    const existingDoc = await db.get('SELECT id FROM knowledge_documents WHERE id = ?', [docId]);
    if (!existingDoc) {
      await db.run(`
        INSERT INTO knowledge_documents (id, title, file_type, file_path, file_size, source_type, status, extracted_text, version, org_id, scope, approval_status, created_at, updated_at)
        VALUES (?, ?, 'xlsx', NULL, 0, 'excel_engine', 'ready', 'Structured Excel Data', 1, ?, 'global', 'PENDING_REVIEW', ?, ?)
      `, [docId, options.title || 'Bảng tính Excel', orgId, now, now]);
    }

    for (let i = 0; i < workbook.SheetNames.length; i++) {
      const sheetName = workbook.SheetNames[i];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null });

      if (jsonData.length === 0) continue;

      // Extract column headers and infer types
      const columnNames = Object.keys(jsonData[0]);
      const columns = columnNames.map((col, idx) => {
        const colVals = jsonData.map(row => row[col]);
        return {
          index: idx,
          name: col,
          type: inferType(colVals)
        };
      });

      const sheetId = `sheet_${randomUUID()}`;
      await db.run(`
        INSERT INTO document_sheets (id, document_id, sheet_name, sheet_index, row_count, column_count, columns_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [sheetId, docId, sheetName, i, jsonData.length, columns.length, JSON.stringify(columns), now]);

      // Batch insert rows
      for (let rIdx = 0; rIdx < jsonData.length; rIdx++) {
        const rowId = `row_${randomUUID()}`;
        const rowData = jsonData[rIdx];
        await db.run(`
          INSERT INTO document_rows (id, sheet_id, document_id, row_index, row_data_json, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [rowId, sheetId, docId, rIdx + 1, JSON.stringify(rowData), now]);
      }

      parsedSheets.push({
        sheetId,
        sheetName,
        rowCount: jsonData.length,
        columns
      });
    }

    return {
      documentId: docId,
      sheetCount: parsedSheets.length,
      sheets: parsedSheets
    };
  }

  /**
   * Execute exact structured query / aggregation on stored Excel sheets
   */
  static async queryData(options = {}) {
    const {
      documentId,
      sheetName,
      filterCol,
      filterVal,
      filterOp = 'contains',
      aggregateCol,
      aggregateFunc, // 'SUM', 'AVG', 'MIN', 'MAX', 'COUNT'
      limit = 20
    } = options;

    let sheetSql = 'SELECT * FROM document_sheets WHERE 1=1';
    const sheetParams = [];
    if (documentId) {
      sheetSql += ' AND document_id = ?';
      sheetParams.push(documentId);
    }
    if (sheetName) {
      sheetSql += ' AND sheet_name LIKE ?';
      sheetParams.push(`%${sheetName}%`);
    }

    const sheet = await db.get(sheetSql + ' ORDER BY created_at DESC LIMIT 1', sheetParams);
    if (!sheet) {
      return { success: false, error: 'Không tìm thấy bảng tính Excel phù hợp' };
    }

    const columns = JSON.parse(sheet.columns_json || '[]');
    const rows = await db.all(
      'SELECT id, row_index, row_data_json FROM document_rows WHERE sheet_id = ? ORDER BY row_index ASC',
      [sheet.id]
    );

    let parsedRows = rows.map(r => ({
      rowIndex: r.row_index,
      ...JSON.parse(r.row_data_json)
    }));

    // Apply filtering if provided
    if (filterCol && filterVal !== undefined && filterVal !== null) {
      const targetValStr = String(filterVal).toLowerCase();
      parsedRows = parsedRows.filter(row => {
        const cell = row[filterCol];
        if (cell === undefined || cell === null) return false;
        const cellStr = String(cell).toLowerCase();

        if (filterOp === 'eq') return cellStr === targetValStr;
        if (filterOp === 'contains') return cellStr.includes(targetValStr);
        if (filterOp === 'gt') return parseNumeric(cell) > parseNumeric(filterVal);
        if (filterOp === 'gte') return parseNumeric(cell) >= parseNumeric(filterVal);
        if (filterOp === 'lt') return parseNumeric(cell) < parseNumeric(filterVal);
        if (filterOp === 'lte') return parseNumeric(cell) <= parseNumeric(filterVal);
        return true;
      });
    }

    // Apply Aggregation if requested
    let aggregationResult = null;
    if (aggregateFunc && aggregateCol) {
      const func = aggregateFunc.toUpperCase();
      const numVals = parsedRows.map(r => parseNumeric(r[aggregateCol]));

      if (func === 'COUNT') {
        aggregationResult = { function: 'COUNT', column: aggregateCol, value: numVals.length };
      } else if (func === 'SUM') {
        const sum = numVals.reduce((acc, v) => acc + v, 0);
        aggregationResult = { function: 'SUM', column: aggregateCol, value: sum };
      } else if (func === 'AVG') {
        const sum = numVals.reduce((acc, v) => acc + v, 0);
        const avg = numVals.length > 0 ? sum / numVals.length : 0;
        aggregationResult = { function: 'AVG', column: aggregateCol, value: Math.round(avg * 100) / 100 };
      } else if (func === 'MIN') {
        const min = numVals.length > 0 ? Math.min(...numVals) : 0;
        aggregationResult = { function: 'MIN', column: aggregateCol, value: min };
      } else if (func === 'MAX') {
        const max = numVals.length > 0 ? Math.max(...numVals) : 0;
        aggregationResult = { function: 'MAX', column: aggregateCol, value: max };
      }
    }

    return {
      success: true,
      sheetName: sheet.sheet_name,
      totalMatchedRows: parsedRows.length,
      columns: columns.map(c => c.name),
      dataPreview: parsedRows.slice(0, limit),
      aggregationResult
    };
  }
}

export default ExcelParser;
