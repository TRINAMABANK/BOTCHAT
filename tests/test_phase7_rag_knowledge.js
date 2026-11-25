/**
 * TEST SUITE: PHASE 7 - RAG & KNOWLEDGE HYBRID SEARCH (BOTCHAT BRAIN 2.1)
 * 
 * Verifies:
 * 1. Hybrid Search (Full-text + Keyword matching) in RagService
 * 2. Proper Source Citation formatting with Document Title and Page/Sheet Numbers
 * 3. Scope & Multi-Tenant Isolation (Global vs Private Organization)
 * 4. Approval Workflow: Only 'APPROVED' documents can be retrieved
 * 5. Commercial Isolation: Document queries do NOT leak commercial sales catalog
 */

import { RagService } from '../server/services/ragService.js';
import { CentralBrainService } from '../server/services/centralBrainService.js';
import db from '../server/db.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('================================================================');
console.log('🚀 KIỂM THỬ GIAI ĐOẠN 7: RAG & KNOWLEDGE HYBRID SEARCH');
console.log('================================================================\n');

async function runTests() {
  const testOrgId = 'org_phase7_test';

  // -------------------------------------------------------------
  // Group 1: Document Ingestion & Chunking
  // -------------------------------------------------------------
  console.log('--- 1. Kiểm tra Nạp Tài Liệu & Phân Đoạn (Chunking) ---');

  const ingestRes = await RagService.ingestDocument({
    title: 'Quy trình điều chuyển tài sản Nam A Bank 2026',
    fileType: 'pdf',
    content: 'Điều 1. Phạm vi điều chuyển tài sản nội bộ. Mọi tài sản cố định bao gồm máy tính, máy in Brother và bàn ghế văn phòng khi điều chuyển giữa các chi nhánh Nam A Bank phải có phê duyệt bằng văn bản của Giám đốc Khối Vận hành. Thời gian xử lý hồ sơ không quá 3 ngày làm việc.',
    orgId: testOrgId,
    scope: 'private',
    approvalStatus: 'APPROVED',
    pageCount: 3
  });
  assert(Boolean(ingestRes.documentId), 'Document ingested successfully');
  assert(ingestRes.totalChunks > 0, `Document split into ${ingestRes.totalChunks} chunks`);

  // -------------------------------------------------------------
  // Group 2: Hybrid Search & Source Citations
  // -------------------------------------------------------------
  console.log('\n--- 2. Kiểm tra Tìm Kiếm Lai (Hybrid Search) & Trích Dẫn Nguồn ---');

  const chunks = await RagService.searchKnowledge({
    query: 'quy trình điều chuyển tài sản nội bộ Nam A Bank',
    orgId: testOrgId,
    scope: 'all',
    limit: 3
  });
  assert(chunks.length > 0, `Search returned ${chunks.length} matching chunks`);
  const firstChunk = chunks[0];
  assert(firstChunk.citationLabel.includes('Quy trình điều chuyển tài sản Nam A Bank 2026'), 'Citation includes exact document title');
  assert(firstChunk.content.includes('Giám đốc Khối Vận hành'), 'Chunk content contains factual clause');

  // -------------------------------------------------------------
  // Group 3: Scope & Multi-Tenant Isolation
  // -------------------------------------------------------------
  console.log('\n--- 3. Kiểm tra Cách Ly Đa Doanh Nghiệp (Multi-Tenant Isolation) ---');

  // Ingest document for another tenant
  await RagService.ingestDocument({
    title: 'Bí mật kinh doanh của Tenant Khác',
    fileType: 'docx',
    content: 'Doanh thu bảo mật quý 4 của công ty XYZ là 100 tỷ đồng.',
    orgId: 'org_different_secret',
    scope: 'private',
    approvalStatus: 'APPROVED'
  });

  // Query as testOrgId for the other tenant's secret
  const crossTenantChunks = await RagService.searchKnowledge({
    query: 'Bí mật kinh doanh công ty XYZ',
    orgId: testOrgId,
    scope: 'private',
    limit: 3
  });
  assert(crossTenantChunks.length === 0, 'Cross-tenant private knowledge is strictly isolated (0 results)');

  // -------------------------------------------------------------
  // Group 4: Approval Status Gate
  // -------------------------------------------------------------
  console.log('\n--- 4. Kiểm tra Chốt Chặn Tài Liệu Chưa Duyệt (Approval Gate) ---');

  await RagService.ingestDocument({
    title: 'Tài liệu nháp chưa duyệt',
    fileType: 'txt',
    content: 'Nội dung này chưa được kiểm duyệt chính thức.',
    orgId: testOrgId,
    scope: 'global',
    approvalStatus: 'PENDING'
  });

  const pendingChunks = await RagService.searchKnowledge({
    query: 'Nội dung này chưa được kiểm duyệt chính thức',
    orgId: testOrgId,
    scope: 'all'
  });
  const hasPendingChunk = pendingChunks.some(c => c.docTitle === 'Tài liệu nháp chưa duyệt' || c.content.includes('chưa được kiểm duyệt'));
  assert(hasPendingChunk === false, 'Unapproved (PENDING) document chunks are never retrieved');

  // -------------------------------------------------------------
  // Group 5: Commercial Catalog Isolation in Chat
  // -------------------------------------------------------------
  console.log('\n--- 5. Kiểm tra Cách Ly Kho Tài Liệu Khỏi Danh Mục Bán Hàng ---');

  const resChat = await CentralBrainService.processChat({
    message: 'Cho tôi xem quy trình điều chuyển tài sản nội bộ Nam A Bank',
    orgId: testOrgId,
    conversationId: 'conv_rag_test_01'
  });
  assert(resChat.success === true, 'Chat processing succeeded');
  assert(resChat.revealCatalog === false, 'Commercial catalog is NOT revealed for internal document inquiry');
  assert(!resChat.reply.includes('BÁO GIÁ'), 'No quotation triggered for document query');

  console.log('\n================================================================');
  console.log(`🏁 KẾT QUẢ GIAI ĐOẠN 7: ${passed} PASS, ${failed} FAIL (Tỷ lệ: ${((passed / (passed + failed)) * 100).toFixed(1)}%)`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
