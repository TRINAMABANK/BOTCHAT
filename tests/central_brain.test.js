/**
 * TRÍ AI ULTIMATE ROBOT - PHASE 3 TEST SUITE
 * 
 * Verifies Central Brain Orchestrator, RAG Hybrid Retrieval,
 * Structured Excel Processing, and Web Search Services.
 */

import { CentralBrainService, CENTRAL_BRAIN_TOOLS } from '../server/services/centralBrainService.js';
import { RagService } from '../server/services/ragService.js';
import { ExcelParser } from '../server/services/parsers/excelParser.js';
import { WebSearchService } from '../server/services/webSearchService.js';
import { initDatabase, db } from '../server/db.js';
import * as XLSX from 'xlsx';

let totalTests = 0;
let passedTests = 0;

function assert(condition, name) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${name}`);
  } else {
    console.error(`  ❌ FAIL: ${name}`);
    throw new Error(`Assertion failed: ${name}`);
  }
}

async function runPhase3Tests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING PHASE 3 CENTRAL BRAIN & TOOL ORCHESTRATOR TESTS');
  console.log('======================================================\n');

  await initDatabase();

  // Test 1: Central Brain Tools registration
  console.log('--- Test 1: Central Brain Tools Registration ---');
  assert(Array.isArray(CENTRAL_BRAIN_TOOLS), 'CENTRAL_BRAIN_TOOLS is an array');
  assert(CENTRAL_BRAIN_TOOLS.length === 4, 'Exactly 4 core capabilities registered');
  const toolNames = CENTRAL_BRAIN_TOOLS.map(t => t.function.name);
  assert(toolNames.includes('consult_sales_engine'), 'Has consult_sales_engine');
  assert(toolNames.includes('search_knowledge_base'), 'Has search_knowledge_base');
  assert(toolNames.includes('query_excel_data'), 'Has query_excel_data');
  assert(toolNames.includes('search_web_internet'), 'Has search_web_internet');

  // Test 2: RAG Ingestion & Hybrid Retrieval
  console.log('\n--- Test 2: RAG Knowledge Base Ingestion & Search ---');
  const testDoc = {
    title: 'Quy trình bảo hành TRÍ AI Enterprise',
    content: 'Tất cả sản phẩm máy tính và thiết bị văn phòng của TRÍ AI được bảo hành chính hãng 24 tháng tận nơi. Điều kiện bảo hành là tem bảo hành còn nguyên vẹn và số serial khớp với hợp đồng mua bán.',
    scope: 'global',
    approvalStatus: 'APPROVED',
    pageCount: 2
  };
  const ingested = await RagService.ingestDocument(testDoc);
  assert(ingested.documentId !== null, 'Document ingested successfully');
  assert(ingested.totalChunks > 0, 'Document chunks generated');

  const ragResults = await RagService.searchKnowledge({
    query: 'điều kiện bảo hành máy tính',
    scope: 'global'
  });
  assert(ragResults.length > 0, 'RAG successfully retrieved relevant chunk');
  assert(ragResults[0].content.includes('24 tháng tận nơi'), 'Retrieved chunk contains warranty term');
  assert(ragResults[0].citationLabel.includes('Quy trình bảo hành'), 'Citation label formatted properly');
  console.log(`     👉 Retrieved Citation: ${ragResults[0].citationLabel}`);

  // Test 3: Structured Excel Parsing & Exact Aggregation
  console.log('\n--- Test 3: Structured Excel Parsing & Numeric Calculation ---');
  // Create an in-memory Excel workbook
  const sampleData = [
    { 'Mã SP': 'LT01', 'Tên Sản Phẩm': 'Laptop Lenovo Neo 50s', 'Đơn Giá': 15500000, 'Số Lượng Tồn': 12 },
    { 'Mã SP': 'LT02', 'Tên Sản Phẩm': 'Laptop HP OmniBook 5', 'Đơn Giá': 22900000, 'Số Lượng Tồn': 8 },
    { 'Mã SP': 'TR01', 'Tên Sản Phẩm': 'Hảo Kỳ Trà Đôi Dép', 'Đơn Giá': 1499000, 'Số Lượng Tồn': 50 }
  ];
  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bang_Ton_Kho');
  const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const excelPersist = await ExcelParser.parseAndPersist(excelBuffer, { documentId: 'doc_test_excel' });
  assert(excelPersist.sheetCount === 1, 'Excel Sheet parsed');
  assert(excelPersist.sheets[0].sheetName === 'Bang_Ton_Kho', 'Sheet name matches');
  assert(excelPersist.sheets[0].rowCount === 3, 'Row count is 3');

  // Query exact SUM of 'Số Lượng Tồn'
  const sumQuery = await ExcelParser.queryData({
    documentId: 'doc_test_excel',
    sheetName: 'Bang_Ton_Kho',
    aggregateCol: 'Số Lượng Tồn',
    aggregateFunc: 'SUM'
  });
  assert(sumQuery.success === true, 'Query succeeded');
  assert(sumQuery.aggregationResult.value === 70, 'Exact SUM calculation (12 + 8 + 50 = 70)');
  console.log(`     👉 Aggregation Result: SUM of "Số Lượng Tồn" = ${sumQuery.aggregationResult.value} (Exact)`);

  // Query row filtering
  const filterQuery = await ExcelParser.queryData({
    documentId: 'doc_test_excel',
    filterCol: 'Mã SP',
    filterVal: 'TR01',
    filterOp: 'eq'
  });
  assert(filterQuery.dataPreview.length === 1, 'Found exactly 1 row with Mã SP = TR01');
  assert(filterQuery.dataPreview[0]['Tên Sản Phẩm'] === 'Hảo Kỳ Trà Đôi Dép', 'Row data matches');

  // Test 4: Web Search Service
  console.log('\n--- Test 4: Web Search Service ---');
  const searchResult = await WebSearchService.search('Việt Nam', 2);
  assert(searchResult.query === 'Việt Nam', 'Query matches');
  assert(Array.isArray(searchResult.results), 'Results is array');
  assert(searchResult.results.length > 0, 'Returned search results');
  console.log(`     👉 Web Search Result Title: "${searchResult.results[0].title}"`);

  // Test 5: Central Brain Orchestrator End-to-End Chat
  console.log('\n--- Test 5: Central Brain Orchestrator End-to-End Chat ---');
  // Scenario 5A: Health & Polite check
  const healthChat = await CentralBrainService.processChat({ message: 'bạn khoẻ không' });
  assert(healthChat.success === true, 'Health chat success');
  assert(healthChat.reply.toLowerCase().includes('khoe') || healthChat.reply.includes('khoẻ') || healthChat.reply.includes('khỏe'), 'Health chat polite reply');
  assert(healthChat.revealCatalog === false, 'Catalog not forced on health inquiry');

  // Scenario 5B: Sales Engine Routing ("anh cần mua trà")
  const salesChat = await CentralBrainService.processChat({ message: 'anh cần mua trà' });
  assert(salesChat.success === true, 'Sales chat success');
  assert(salesChat.revealCatalog === true, 'Catalog revealed on Column 2');
  assert(salesChat.toolsUsed.includes('consult_sales_engine'), 'Tool consult_sales_engine was invoked');
  console.log(`     👉 Tools Used: [${salesChat.toolsUsed.join(', ')}]`);
  console.log(`     👉 Recommended Category: ${salesChat.recommendedField}`);

  console.log('\n======================================================');
  console.log(`🎉 ALL PHASE 3 TESTS PASSED: ${passedTests}/${totalTests}`);
  console.log('======================================================\n');
  process.exit(0);
}

runPhase3Tests().catch(err => {
  console.error('\n❌ PHASE 3 TEST RUNNER ERROR:', err);
  process.exit(1);
});
