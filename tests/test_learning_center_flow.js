import assert from 'assert';
import db, { getDb } from '../server/db.js';
import CentralBrainService from '../server/services/centralBrainService.js';
import LearningCaptureEngine from '../server/services/intelligence/learningCaptureEngine.js';
import LearningIngestionEngine from '../server/services/intelligence/learningIngestionEngine.js';
import LearningTestEngine from '../server/services/intelligence/learningTestEngine.js';
import * as xlsx from 'xlsx';

console.log('================================================================');
console.log('🚀 TEST SUITE: TRÍ AN LEARNING CENTER – END-TO-END WORKFLOW');
console.log('================================================================\n');

async function runLearningCenterTests() {
  let passedCount = 0;
  let totalTests = 0;

  async function testStep(name, fn) {
    totalTests++;
    try {
      await fn();
      console.log(`✅ [PASS] Step ${totalTests}: ${name}`);
      passedCount++;
    } catch (err) {
      console.error(`❌ [FAIL] Step ${totalTests}: ${name}`);
      console.error('   Error:', err.message);
    }
  }

  const testQuestion = 'Điện thoại Panasonic KX-TSC11 có hàng không?';
  let capturedQuestionId = null;
  let ingestedEntryId = null;

  // 1. Tự động ghi nhận câu hỏi thiếu kiến thức (Auto-capture)
  await testStep('1. Auto-Capture: Tự động ghi nhận câu hỏi thiếu hàng vào hàng đợi NEW', async () => {
    // Clear old test record for clean run
    await db.run(`DELETE FROM unanswered_questions WHERE original_question LIKE ? OR question LIKE ?`, ['%KX-TSC11%', '%KX-TSC11%']);
    await db.run(`DELETE FROM learning_knowledge_entries WHERE standard_question LIKE ?`, ['%KX-TSC11%']);
    await db.run(`DELETE FROM learning_test_runs WHERE test_query LIKE ?`, ['%KX-TSC11%']);

    const brainRes = await CentralBrainService.processChat({
      message: testQuestion,
      history: []
    });

    // Wait 1000ms for async capture hook
    await new Promise(r => setTimeout(r, 1000));

    const loggedQ = await db.get(`
      SELECT * FROM unanswered_questions 
      WHERE original_question = ?
      ORDER BY created_at DESC 
      LIMIT 1
    `, [testQuestion]);

    assert(loggedQ, 'Phải có bản ghi ghi nhận trong unanswered_questions');
    assert.strictEqual(loggedQ.status, 'NEW', 'Trạng thái ban đầu phải là NEW');
    assert(loggedQ.failure_reason, 'Phải có failure_reason');
    capturedQuestionId = loggedQ.id;
    console.log(`   Captured Question ID: ${capturedQuestionId} | Reason: ${loggedQ.failure_reason} | Status: ${loggedQ.status}`);
  });

  // 2. Tự động đếm tần suất trùng lặp (Hit Count)
  await testStep('2. Deduplication & Hit Count: Khách hỏi lại câu tương tự -> Tăng hit_count', async () => {
    await CentralBrainService.processChat({
      message: testQuestion,
      history: []
    });

    // Wait 1000ms for async capture hook
    await new Promise(r => setTimeout(r, 1000));

    const loggedQ = await db.get(`SELECT hit_count FROM unanswered_questions WHERE id = ?`, [capturedQuestionId]);
    assert(loggedQ.hit_count >= 2, `hit_count phải tăng lên >= 2, thực tế: ${loggedQ.hit_count}`);
    console.log(`   Hit Count updated to: ${loggedQ.hit_count}`);
  });

  // 3. Huấn luyện tri thức chuẩn (Ingestion)
  await testStep('3. Ingestion: Admin nhập câu trả lời chuẩn -> Trạng thái READY_TO_TEST', async () => {
    const standardAnswer = 'Dạ hiện tại bên em không phân phối dòng điện thoại bàn Panasonic KX-TSC11. Anh/chị có thể tham khảo các dòng máy tính, laptop và thiết bị văn phòng khác đang có sẵn tại Cột 2 nhé ạ!';
    
    const ingestRes = await LearningIngestionEngine.ingestKnowledge({
      unansweredQuestionId: capturedQuestionId,
      entryType: 'QA',
      standardQuestion: testQuestion,
      standardAnswer,
      relatedTopic: 'Điện thoại & Viễn thông',
      relatedProductName: 'Điện thoại Panasonic KX-TSC11',
      sourceType: 'DIRECT_INPUT',
      approvedBy: 'Admin Tri'
    });

    assert(ingestRes.success, 'Ingestion phải thành công');
    assert.strictEqual(ingestRes.status, 'READY_TO_TEST', 'Status phải là READY_TO_TEST');
    ingestedEntryId = ingestRes.entryId;

    const qUpdated = await db.get(`SELECT status, resolved_knowledge_id FROM unanswered_questions WHERE id = ?`, [capturedQuestionId]);
    assert.strictEqual(qUpdated.status, 'READY_TO_TEST', 'Question status phải là READY_TO_TEST');
    assert.strictEqual(qUpdated.resolved_knowledge_id, ingestedEntryId);
  });

  // 4. Kiểm thử tự động Before vs After (Test Bench)
  await testStep('4. Test Bench: So sánh trực quan Before vs After & Tự động chấm điểm 4 tiêu chí', async () => {
    const testResult = await LearningTestEngine.runBeforeAfterTest({
      unansweredQuestionId: capturedQuestionId,
      learningKnowledgeId: ingestedEntryId
    });

    assert(testResult.testQuery, 'Phải có testQuery');
    assert(testResult.beforeResponse, 'Phải có beforeResponse');
    assert(testResult.afterResponse, 'Phải có afterResponse');
    assert(testResult.metrics.isCorrectProduct, 'isCorrectProduct phải là true');
    assert(testResult.metrics.isGrounded, 'isGrounded phải là true');
    assert(testResult.metrics.brandConfusionFree, 'brandConfusionFree phải là true');
    assert(testResult.metrics.hasValidSource, 'hasValidSource phải là true');
    assert.strictEqual(testResult.metrics.accuracyScore, 100, 'Điểm chính xác phải là 100%');
    console.log(`   Accuracy Score: ${testResult.metrics.accuracyScore}% | Passed: ${testResult.passed}`);
  });

  // 5. Phê duyệt tri thức (Approval)
  await testStep('5. Approval: Admin bấm Phê Duyệt -> Trạng thái APPROVED', async () => {
    const approveRes = await LearningIngestionEngine.approveKnowledge(ingestedEntryId, 'Admin Tri');
    assert(approveRes.success, 'Approve phải thành công');
    assert.strictEqual(approveRes.status, 'APPROVED');

    const qApproved = await db.get(`SELECT status FROM unanswered_questions WHERE id = ?`, [capturedQuestionId]);
    assert.strictEqual(qApproved.status, 'APPROVED', 'Question status phải chuyển sang APPROVED');
  });

  // 6. Kiểm tra Runtime ngay sau khi học: Trí An trả lời chuẩn xác 100%
  await testStep('6. Runtime Verification: Khách hỏi lại -> Trí An áp dụng tri thức chuẩn đã duyệt', async () => {
    const chatRes = await CentralBrainService.processChat({
      message: testQuestion,
      history: []
    });

    assert.strictEqual(chatRes.success, true);
    assert.strictEqual(chatRes.stage, 'LEARNING_CENTER_RESOLVED', 'Stage phải là LEARNING_CENTER_RESOLVED');
    assert(chatRes.reply.includes('không phân phối dòng điện thoại bàn Panasonic KX-TSC11'), 'Phải trả lời đúng câu chuẩn đã dạy');
    assert(chatRes.reply.includes('Cột 2'), 'Phải gợi ý Cột 2');
    assert(!chatRes.reply.toLowerCase().includes('đồ gia dụng panasonic'), 'Tuyệt đối không nhầm sang đồ gia dụng');
    console.log('\n--- Trí An Response After Learning ---');
    console.log(chatRes.reply);
    console.log('--------------------------------------\n');
  });

  // 7. Báo cáo F: Top 10 câu hỏi khách hỏi nhiều nhất nhưng Trí An chưa biết
  await testStep('7. Report F: Lấy danh sách Top 10 câu hỏi thiếu kiến thức', async () => {
    const rows = await db.all(`
      SELECT original_question, hit_count, failure_reason, status 
      FROM unanswered_questions 
      ORDER BY hit_count DESC 
      LIMIT 10
    `);
    assert(rows.length > 0, 'Phải có dữ liệu báo cáo');
    assert(rows[0].hit_count >= 1, 'Hit count phải hợp lệ');
    console.log(`   Top 1 question in report: "${rows[0].original_question}" (Hỏi ${rows[0].hit_count} lần)`);
  });

  // 8. Xuất file Excel (.xlsx)
  await testStep('8. Excel Export: Xuất dữ liệu bảng câu hỏi thiếu sang Excel', async () => {
    const rows = await db.all(`
      SELECT 
        id as "Mã câu hỏi",
        original_question as "Nội dung câu hỏi của khách",
        hit_count as "Tần suất hỏi",
        status as "Trạng thái",
        failure_reason as "Nguyên nhân"
      FROM unanswered_questions
      LIMIT 10
    `);

    const ws = xlsx.utils.json_to_sheet(rows);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Gaps');
    const buf = xlsx.write(wb, { bookType: 'xlsx', type: 'buffer' });
    assert(buf && buf.length > 1000, 'File Excel buffer phải được tạo hợp lệ');
    console.log(`   Generated Excel buffer size: ${buf.length} bytes`);
  });

  console.log(`\n================================================================`);
  console.log(`🏁 KẾT QUẢ KIỂM THỬ: ${passedCount}/${totalTests} BƯỚC THÀNH CÔNG (${Math.round((passedCount / totalTests) * 100)}%)`);
  console.log(`================================================================\n`);

  if (passedCount === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runLearningCenterTests();
