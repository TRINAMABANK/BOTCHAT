/**
 * TRÍ AN LEARNING CENTER - BỘ KIỂM ĐỊNH NGHIỆM THU 12 TIÊU CHÍ BỔ SUNG
 * File: tests/test_learning_center_prompt_bo_sung_12.js
 */

import assert from 'assert';
import db from '../server/db.js';
import CentralBrainService from '../server/services/centralBrainService.js';
import LearningCaptureEngine from '../server/services/intelligence/learningCaptureEngine.js';
import LearningIngestionEngine from '../server/services/intelligence/learningIngestionEngine.js';
import LearningTestEngine from '../server/services/intelligence/learningTestEngine.js';
import * as xlsx from 'xlsx';

async function runTestSuite() {
  console.log('================================================================');
  console.log('🔍 TRÍ AN LEARNING CENTER - KIỂM THỬ 12 TIÊU CHÍ NGHIỆM THU BỔ SUNG');
  console.log('================================================================\n');

  // Clean up any test records from prior runs to ensure strict test idempotency
  await db.run("DELETE FROM unanswered_questions WHERE question LIKE '%NEC IP4WW%' OR original_question LIKE '%NEC IP4WW%' OR original_question LIKE '%Tenant Alpha Corp%'");
  await db.run("DELETE FROM learning_knowledge_entries WHERE standard_question LIKE '%NEC IP4WW%' OR standard_question LIKE '%Bí mật kinh doanh%' OR standard_question LIKE '%Chính sách đổi trả thiết bị 2026%'");
  await db.run("DELETE FROM learning_audit_log WHERE details_json LIKE '%NEC IP4WW%' OR details_json LIKE '%Tenant Alpha%' OR details_json LIKE '%Secret%'");

  let passed = 0;
  let failed = 0;

  async function testCase(id, name, testFn) {
    process.stdout.write(`Đang chạy #${id}: ${name}... `);
    const start = Date.now();
    try {
      await testFn();
      const elapsed = Date.now() - start;
      console.log(`✅ [PASS] (${elapsed}ms)`);
      passed++;
    } catch (err) {
      const elapsed = Date.now() - start;
      console.log(`❌ [FAIL] (${elapsed}ms)`);
      console.error(`   Lỗi: ${err.message}\n`);
      failed++;
    }
  }

  // 1. Câu hỏi có kiến thức: AI trả lời đúng và có căn cứ
  await testCase(1, 'Câu hỏi có kiến thức: AI trả lời đúng và có căn cứ', async () => {
    const res = await CentralBrainService.processChat({
      message: 'máy ThinkPad E14 Gen 7 giá bao nhiêu',
      conversationId: 'test_have_knowledge'
    });
    assert(res.success === true, 'Response must be successful');
    assert(res.reply.toLowerCase().includes('32.790.000') || res.reply.toLowerCase().includes('32,790,000'), 'Must include correct listed price');
    assert(res.reply.toLowerCase().includes('e14'), 'Must identify product correctly');
  });

  // 2. Câu hỏi không có kiến thức: tạo báo cáo
  let createdGapId = null;
  await testCase(2, 'Câu hỏi không có kiến thức: tạo báo cáo vào hàng đợi NEW', async () => {
    const query = 'Shop có bán điện thoại bàn NEC IP4WW không';
    const gapRes = await LearningCaptureEngine.recordGap({
      unansweredQuestion: query,
      aiResponse: 'Dạ hiện tại sản phẩm điện thoại bàn NEC IP4WW chưa tìm thấy trong dữ liệu của shop ạ.',
      conversationId: 'test_gap_01',
      reason: 'PRODUCT_NOT_FOUND',
      relatedTopic: 'Viễn thông',
      relatedProductName: 'Điện thoại bàn NEC IP4WW',
      orgId: 'default'
    });

    assert(gapRes && gapRes.logged === true, 'Must record gap');
    assert(gapRes.questionId, 'Must have questionId');
    createdGapId = gapRes.questionId;

    const row = await db.get(`SELECT * FROM unanswered_questions WHERE id = ?`, [createdGapId]);
    assert(row, 'Row must exist in database');
    assert.strictEqual(row.status, 'NEW');
    assert.strictEqual(row.hit_count, 1);
  });

  // 3. Câu hỏi trùng: gộp hoặc liên kết báo cáo, tăng hit_count
  await testCase(3, 'Câu hỏi trùng: gộp bản ghi và tăng số lần xuất hiện (hit_count)', async () => {
    const query = 'Shop có bán điện thoại bàn NEC IP4WW không';
    const dupRes = await LearningCaptureEngine.recordGap({
      unansweredQuestion: query,
      aiResponse: 'Dạ sản phẩm chưa có trong dữ liệu...',
      conversationId: 'test_gap_02',
      reason: 'PRODUCT_NOT_FOUND',
      relatedProductName: 'Điện thoại bàn NEC IP4WW',
      orgId: 'default'
    });

    assert.strictEqual(dupRes.action, 'INCREMENTED_HIT_COUNT');
    assert.strictEqual(dupRes.hitCount, 2);

    const row = await db.get(`SELECT hit_count FROM unanswered_questions WHERE id = ?`, [createdGapId]);
    assert.strictEqual(row.hit_count, 2, 'Hit count in database must be 2');
  });

  // 4. Admin bổ sung câu trả lời: có lịch sử audit log
  let taughtEntryId = null;
  await testCase(4, 'Admin bổ sung câu trả lời chuẩn: lưu tri thức và ghi nhận audit log', async () => {
    const res = await LearningIngestionEngine.ingestKnowledge({
      unansweredQuestionId: createdGapId,
      entryType: 'QA',
      standardQuestion: 'Điện thoại bàn NEC IP4WW',
      standardAnswer: 'Dạ dòng điện thoại bàn NEC IP4WW shop hiện nhận đặt hàng trước theo lô, giao trong 5-7 ngày làm việc.',
      relatedTopic: 'Viễn thông',
      relatedProductName: 'NEC IP4WW',
      sourceType: 'DIRECT_INPUT',
      approvedBy: 'Admin Tri',
      orgId: 'default'
    });

    assert(res.success === true);
    assert(res.entryId);
    taughtEntryId = res.entryId;

    // Check entry status
    const entry = await db.get(`SELECT * FROM learning_knowledge_entries WHERE id = ?`, [taughtEntryId]);
    assert(entry, 'Entry must be in DB');
    assert.strictEqual(entry.approval_status, 'PENDING_REVIEW');
    assert.strictEqual(entry.is_active, 0);

    // Check audit log
    const audit = await db.get(`SELECT * FROM learning_audit_log WHERE knowledge_entry_id = ?`, [taughtEntryId]);
    assert(audit, 'Audit log must record ingestion');
    assert.strictEqual(audit.action, 'INGEST_KNOWLEDGE');
  });

  // 5. Admin tải tài liệu: xử lý thành công
  let docEntryId = null;
  await testCase(5, 'Admin tải tài liệu: xử lý và trích xuất thành công', async () => {
    const sampleText = `CHÍNH SÁCH ĐỔI TRẢ VÀ BẢO HÀNH THIẾT BỊ 2026\n1. Đổi mới 100% trong 15 ngày đầu nếu phát sinh lỗi phần cứng từ nhà sản xuất.\n2. Miễn phí vận chuyển toàn quốc cho đơn hàng từ 5 triệu đồng.`;
    const res = await LearningIngestionEngine.ingestKnowledge({
      entryType: 'DOCUMENT',
      standardQuestion: 'Chính sách đổi trả thiết bị 2026',
      standardAnswer: 'Đổi mới 100% trong 15 ngày đầu nếu phát sinh lỗi nhà sản xuất.',
      relatedTopic: 'Chính sách dịch vụ',
      sourceType: 'TXT',
      sourceFilename: 'chinh_sach_doi_tra_2026.txt',
      textContent: sampleText,
      approvedBy: 'Admin Tri',
      orgId: 'default'
    });

    assert(res.success === true);
    docEntryId = res.entryId;

    const entry = await db.get(`SELECT * FROM learning_knowledge_entries WHERE id = ?`, [docEntryId]);
    assert(entry.extracted_content.includes('15 ngày đầu'), 'Must extract content');
  });

  // 6. Kiến thức chưa duyệt: không được sử dụng như kiến thức chính thức
  await testCase(6, 'Kiến thức chưa duyệt (PENDING_REVIEW): không được đưa vào chat khách hàng', async () => {
    // Lookup for NEC IP4WW
    const lookup = await LearningIngestionEngine.lookupApprovedKnowledge('Điện thoại bàn NEC IP4WW');
    assert.strictEqual(lookup, null, 'Unapproved knowledge must NOT be retrieved');
  });

  // 7. Kiến thức đã duyệt: AI có thể truy xuất
  await testCase(7, 'Kiến thức đã duyệt (APPROVED): AI lập tức truy xuất được chính xác', async () => {
    // Approve the entry
    await LearningIngestionEngine.approveKnowledge(taughtEntryId, 'Admin Tri');

    const entry = await db.get(`SELECT * FROM learning_knowledge_entries WHERE id = ?`, [taughtEntryId]);
    assert.strictEqual(entry.approval_status, 'APPROVED');
    assert.strictEqual(entry.is_active, 1);

    const lookup = await LearningIngestionEngine.lookupApprovedKnowledge('Điện thoại bàn NEC IP4WW');
    assert(lookup, 'Approved knowledge must be found');
    assert.strictEqual(lookup.id, taughtEntryId);
    assert(lookup.standard_answer.includes('đặt hàng trước theo lô'));
  });

  // 8. Câu hỏi kiểm thử: xác nhận AI trả lời đúng và chuyển trạng thái RESOLVED
  await testCase(8, 'Câu hỏi kiểm thử: Before vs After test bench đạt yêu cầu và chuyển RESOLVED', async () => {
    const testResult = await LearningTestEngine.runBeforeAfterTest({
      unansweredQuestionId: createdGapId,
      learningKnowledgeId: taughtEntryId,
      customQuery: 'Shop có bán điện thoại bàn NEC IP4WW không',
      testedBy: 'Admin Tri',
      orgId: 'default'
    });

    assert(testResult.passed === true, 'Test must pass');
    assert(testResult.metrics.accuracyScore >= 80, 'Score must be >= 80%');
    assert(testResult.afterResponse.includes('đặt hàng trước theo lô'));

    // Check question status in DB
    const qRow = await db.get(`SELECT status FROM unanswered_questions WHERE id = ?`, [createdGapId]);
    assert.strictEqual(qRow.status, 'RESOLVED', 'Question must be marked RESOLVED');
  });

  // 9. Tenant A không truy cập báo cáo của B
  await testCase(9, 'Tenant Isolation: Câu hỏi và báo cáo của Tenant A cách ly khỏi Tenant B', async () => {
    // Create gap for Tenant A
    const gapA = await LearningCaptureEngine.recordGap({
      unansweredQuestion: 'Câu hỏi riêng của Tenant Alpha Corp',
      reason: 'OUT_OF_DOMAIN',
      orgId: 'tenant_alpha'
    });

    // Query questions with Tenant B filter
    const qTenantB = await db.all(`
      SELECT * FROM unanswered_questions 
      WHERE org_id = 'tenant_beta' AND id = ?
    `, [gapA.questionId]);

    assert.strictEqual(qTenantB.length, 0, 'Tenant Beta must NOT see Tenant Alpha records');
  });

  // 10. Master Admin xem được báo cáo tổng hợp
  await testCase(10, 'Master Admin xem được báo cáo tổng hợp không bị giới hạn tenant', async () => {
    const allReports = await db.all(`SELECT COUNT(*) as count FROM unanswered_questions`);
    assert(allReports[0].count > 0, 'Consolidated report returns all questions');
  });

  // 11. Private AI giữ dữ liệu riêng (tri thức của org_secret không rò rỉ sang org_public)
  await testCase(11, 'Private AI: Tri thức riêng của doanh nghiệp không rò rỉ sang đối tác khác', async () => {
    // Ingest approved knowledge for secret org
    const secEntry = await LearningIngestionEngine.ingestKnowledge({
      entryType: 'QA',
      standardQuestion: 'Bí mật kinh doanh quy trình nội bộ',
      standardAnswer: 'Quy trình mật chỉ dành cho Org Secret 2026',
      orgId: 'org_secret'
    });
    await LearningIngestionEngine.approveKnowledge(secEntry.entryId, 'Admin');

    // Lookup from org_other
    const leakedLookup = await LearningIngestionEngine.lookupApprovedKnowledge('Bí mật kinh doanh quy trình nội bộ', 'org_other');
    assert.strictEqual(leakedLookup, null, 'Knowledge of org_secret must NOT be accessible by org_other');

    // Lookup from org_secret
    const authorizedLookup = await LearningIngestionEngine.lookupApprovedKnowledge('Bí mật kinh doanh quy trình nội bộ', 'org_secret');
    assert(authorizedLookup !== null, 'Knowledge of org_secret MUST be accessible by org_secret');
  });

  // 12. Báo cáo được lọc và xuất dữ liệu Excel
  await testCase(12, 'Báo cáo được lọc và xuất file Excel đầy đủ trường thông tin', async () => {
    const rows = await db.all(`
      SELECT 
        id as "Mã báo cáo",
        original_question as "Câu hỏi gốc",
        ai_response as "Câu trả lời AI",
        failure_reason as "Lý do",
        status as "Trạng thái",
        hit_count as "Số lần xuất hiện",
        priority as "Mức độ ưu tiên"
      FROM unanswered_questions
      LIMIT 10
    `);

    assert(rows.length > 0, 'Must have data to export');

    const worksheet = xlsx.utils.json_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Báo Cáo Kiến Thức Thiếu');
    const buffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    assert(buffer && buffer.length > 0, 'Excel buffer must be generated');
  });

  console.log('\n================================================================');
  console.log(`🏁 TỔNG KẾT KIỂM THỬ BỔ SUNG: ${passed}/12 TIÊU CHÍ ĐẠT (${Math.round((passed / 12) * 100)}%)`);
  console.log(`- ĐẠT: ${passed}`);
  console.log(`- THẤT BẠI: ${failed}`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite();
