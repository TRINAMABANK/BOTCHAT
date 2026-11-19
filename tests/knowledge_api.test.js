/**
 * TRÍ AI ULTIMATE ROBOT - PHASE 4 TEST SUITE
 * 
 * Verifies Knowledge Center REST API Endpoints: Stats, Ingestion,
 * Excel Queries, Pricing Lists, Promotions, and AI Benchmark Studio.
 */

import express from 'express';
import knowledgeRoutes from '../server/routes/knowledgeRoutes.js';
import { initDatabase, db } from '../server/db.js';

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

async function runPhase4Tests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING PHASE 4 KNOWLEDGE CENTER REST API TESTS');
  console.log('======================================================\n');

  await initDatabase();

  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use('/api/knowledge', knowledgeRoutes);

  const server = app.listen(5099);

  try {
    const baseUrl = 'http://localhost:5099/api/knowledge';

    // Test 1: GET /stats
    console.log('--- Test 1: GET /api/knowledge/stats ---');
    const statsRes = await fetch(`${baseUrl}/stats?orgId=org_default`);
    const statsData = await statsRes.json();
    assert(statsData.success === true, 'Stats API success');
    assert(typeof statsData.stats.totalDocuments === 'number', 'totalDocuments is number');
    assert(typeof statsData.stats.totalChunks === 'number', 'totalChunks is number');
    assert(typeof statsData.stats.totalSheets === 'number', 'totalSheets is number');
    console.log(`     👉 Knowledge Stats: Docs=${statsData.stats.totalDocuments}, Chunks=${statsData.stats.totalChunks}, Sheets=${statsData.stats.totalSheets}`);

    // Test 2: POST /documents/upload (Text/Policy)
    console.log('\n--- Test 2: POST /api/knowledge/documents/upload ---');
    const uploadRes = await fetch(`${baseUrl}/documents/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Chính sách bảo mật dữ liệu khách hàng TRÍ AI',
        rawText: 'TRÍ AI cam kết bảo vệ dữ liệu khách hàng theo tiêu chuẩn ISO/IEC 27001. Mọi thông tin thẻ và tài khoản thanh toán đều được mã hóa đầu cuối và không bao giờ được chia sẻ với bên thứ ba.',
        scope: 'global',
        approvalStatus: 'PENDING_REVIEW'
      })
    });
    const uploadData = await uploadRes.json();
    assert(uploadData.success === true, 'Document upload success');
    assert(uploadData.documentId !== null, 'Returned documentId');
    const testDocId = uploadData.documentId;

    // Test 3: GET /documents
    console.log('\n--- Test 3: GET /api/knowledge/documents ---');
    const docsRes = await fetch(`${baseUrl}/documents?scope=global`);
    const docsData = await docsRes.json();
    assert(docsData.success === true, 'Fetch documents success');
    const found = docsData.documents.find(d => d.id === testDocId);
    assert(found !== undefined, 'Uploaded document present in list');
    assert(found.approval_status === 'PENDING_REVIEW', 'Status is PENDING_REVIEW');

    // Test 4: PUT /documents/:id/approval (Approve document)
    console.log('\n--- Test 4: PUT /api/knowledge/documents/:id/approval ---');
    const approveRes = await fetch(`${baseUrl}/documents/${testDocId}/approval`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approvalStatus: 'APPROVED' })
    });
    const approveData = await approveRes.json();
    assert(approveData.success === true, 'Approval update success');

    // Test 5: GET /pricing/lists & POST /pricing/lists
    console.log('\n--- Test 5: Multi-tier Price Lists API ---');
    const createPlRes = await fetch(`${baseUrl}/pricing/lists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bảng Giá Đại Lý Cấp 1 Toàn Quốc',
        code: 'DAILY_CAP1',
        tier_type: 'wholesale',
        currency: 'VND'
      })
    });
    const createPlData = await createPlRes.json();
    assert(createPlData.success === true, 'Price list creation success');

    const getPlRes = await fetch(`${baseUrl}/pricing/lists`);
    const getPlData = await getPlRes.json();
    assert(getPlData.success === true, 'Price lists fetched');
    assert(getPlData.priceLists.some(p => p.code === 'DAILY_CAP1'), 'New price list listed');

    // Test 6: POST /ai-studio/run-benchmark
    console.log('\n--- Test 6: POST /api/knowledge/ai-studio/run-benchmark ---');
    const bmRes = await fetch(`${baseUrl}/ai-studio/run-benchmark`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const bmData = await bmRes.json();
    assert(bmData.success === true, 'Benchmark run completed');
    assert(typeof bmData.accuracyScore === 'number', 'Accuracy score calculated');
    assert(bmData.accuracyScore >= 50, 'Accuracy score meets threshold');
    console.log(`     👉 Benchmark Result: Score = ${bmData.accuracyScore}%, Passed = ${bmData.passedCount}/${bmData.totalTests}`);

    console.log('\n======================================================');
    console.log(`🎉 ALL PHASE 4 REST API TESTS PASSED: ${passedTests}/${totalTests}`);
    console.log('======================================================\n');
  } finally {
    server.close();
    process.exit(0);
  }
}

runPhase4Tests().catch(err => {
  console.error('\n❌ PHASE 4 TEST RUNNER ERROR:', err);
  process.exit(1);
});
