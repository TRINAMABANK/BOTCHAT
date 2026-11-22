/**
 * TRÍ AN AUTO LEARNING - 10 MASTER ACCEPTANCE SCENARIOS
 * Tests:
 * 1. AI trả lời sai, quản trị viên sửa
 * 2. AI gặp lại câu hỏi tương tự
 * 3. AI gặp cách diễn đạt khác nhưng cùng ý nghĩa (Paraphrased query)
 * 4. Kiến thức mới trùng kiến thức cũ (Duplicate detection)
 * 5. Kiến thức mới mâu thuẫn kiến thức cũ (Conflict detection)
 * 6. Người dùng không có quyền sửa kiến thức (Unauthorized access)
 * 7. Hai tổ chức có dữ liệu riêng biệt (Tenant isolation)
 * 8. Cập nhật kiến thức nhưng kiểm thử thất bại (Test failure & Rollback)
 * 9. Khôi phục phiên bản kiến thức trước đó (Manual version rollback)
 * 10. Tự động ghi nhận lỗi tái diễn và đề xuất chủ đề yếu (Recurring errors & Weakness analytics)
 */

import { getDb, db } from '../server/db.js';
import CentralBrainService from '../server/services/centralBrainService.js';
import LearningCaptureEngine from '../server/services/intelligence/learningCaptureEngine.js';
import LearningIngestionEngine from '../server/services/intelligence/learningIngestionEngine.js';
import LearningTestEngine from '../server/services/intelligence/learningTestEngine.js';

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failedCount++;
  }
}

async function cleanupTestData() {
  await db.run(`DELETE FROM unanswered_questions WHERE org_id IN ('org_test_auto', 'tenant_alpha', 'tenant_beta') OR question LIKE '%Zebra DS2208%' OR question LIKE '%HP LaserJet%' OR question LIKE '%Dự án Alpha%'`);
  await db.run(`DELETE FROM learning_knowledge_entries WHERE org_id IN ('org_test_auto', 'tenant_alpha', 'tenant_beta') OR related_product_name LIKE '%HP LaserJet%' OR related_product_name LIKE '%Dự án Alpha%'`);
  await db.run(`DELETE FROM ai_test_cases WHERE org_id IN ('org_test_auto', 'tenant_alpha', 'tenant_beta')`);
  await db.run(`DELETE FROM knowledge_versions WHERE org_id IN ('org_test_auto', 'tenant_alpha', 'tenant_beta')`);
}

async function runMasterAutoLearningTests() {
  console.log('================================================================');
  console.log('🤖 TRÍ AN AUTO LEARNING – 10 MASTER ACCEPTANCE SCENARIOS');
  console.log('================================================================\n');

  await cleanupTestData();

  const now = new Date().toISOString();

  // -------------------------------------------------------------
  // TEST 1: AI trả lời sai, Quản trị viên sửa qua Auto Learning
  // -------------------------------------------------------------
  console.log('TEST 1: AI trả lời sai, Quản trị viên sửa qua Auto Learning...');
  const qId1 = 'q_gap_test_master_01';
  await db.run(`
    INSERT INTO unanswered_questions (
      id, question, original_question, ai_response, failure_reason,
      related_topic, related_product_name, priority, hit_count, status, org_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'UNCERTAIN_SPEC_PRICE', 'Máy in văn phòng', 'HP LaserJet M428fdw', 'HIGH', 1, 'NEW', 'org_test_auto', ?, ?)
  `, [
    qId1,
    'Máy in đa năng HP LaserJet M428fdw có photo màu không?',
    'Máy in đa năng HP LaserJet M428fdw có photo màu không?',
    'Dạ em chưa có thông tin rõ về tính năng photo màu của model này ạ.',
    now,
    now
  ]);

  const correctedAnswer1 = 'Dạ, HP LaserJet M428fdw là dòng máy in laser đen trắng đa năng (In, Scan, Copy, Fax), do đó máy chỉ hỗ trợ in và photo đen trắng, không photo màu ạ.';
  
  const autoLearnRes1 = await LearningIngestionEngine.autoLearnFromCorrection({
    questionId: qId1,
    correctedAnswer: correctedAnswer1,
    actor: 'Anh_Tri_Admin',
    orgId: 'org_test_auto',
    relatedTopic: 'Máy in văn phòng',
    relatedProductName: 'HP LaserJet M428fdw',
    runTestNow: true
  });

  assert(autoLearnRes1.success === true, 'Auto Learn thực thi thành công');
  assert(autoLearnRes1.version === 1, 'Phiên bản tri thức khởi tạo là v1');
  assert(autoLearnRes1.diffAnalysis && autoLearnRes1.diffAnalysis.addedWordsCount > 0, 'Phân tích Diff ghi nhận số từ mới bổ sung');
  assert(autoLearnRes1.didRollback === false, 'Kiểm thử đạt yêu cầu, không xảy ra Rollback');

  const questionCheck1 = await db.get(`SELECT * FROM unanswered_questions WHERE id = ?`, [qId1]);
  assert(questionCheck1.status === 'RESOLVED', 'Trạng thái câu hỏi tự động chuyển sang RESOLVED');
  assert(questionCheck1.resolved_answer === correctedAnswer1, 'Câu trả lời giải quyết lưu đúng nội dung Admin cung cấp');

  const versionCheck1 = await db.get(`SELECT * FROM knowledge_versions WHERE entry_id = ?`, [autoLearnRes1.entryId]);
  assert(versionCheck1 !== null && versionCheck1.version_number === 1, 'Bản ghi phiên bản được lưu vào bảng knowledge_versions');

  const testCaseCheck1 = await db.get(`SELECT * FROM ai_test_cases WHERE unanswered_question_id = ?`, [qId1]);
  assert(testCaseCheck1 !== null, 'Tình huống kiểm thử ngăn lỗi tái diễn được tạo trong ai_test_cases');

  // -------------------------------------------------------------
  // TEST 2: AI gặp lại câu hỏi tương tự
  // -------------------------------------------------------------
  console.log('\nTEST 2: AI gặp lại câu hỏi tương tự...');
  const chatRes2 = await CentralBrainService.processChat({
    message: 'Máy in đa năng HP LaserJet M428fdw có photo màu không?',
    orgId: 'org_test_auto'
  });

  assert(chatRes2.toolsUsed.includes('learning_center_approved'), 'Central Brain sử dụng công cụ learning_center_approved');
  assert(chatRes2.reply.includes('HP LaserJet M428fdw') && chatRes2.reply.includes('không photo màu'), 'AI trả lời chính xác thông tin chuẩn vừa được học');
  assert(chatRes2.citations && chatRes2.citations.length > 0, 'Phản hồi có trích dẫn nguồn tri thức đã duyệt');

  // -------------------------------------------------------------
  // TEST 3: AI gặp cách diễn đạt khác nhưng cùng ý nghĩa (Paraphrased query)
  // -------------------------------------------------------------
  console.log('\nTEST 3: AI gặp cách diễn đạt khác nhưng cùng ý nghĩa...');
  const chatRes3 = await CentralBrainService.processChat({
    message: 'Cho tôi hỏi HP M428fdw photo màu được không shop ơi?',
    orgId: 'org_test_auto'
  });

  assert(chatRes3.toolsUsed.includes('learning_center_approved'), 'Paraphrased query được đối sánh thành công vào tri thức chuẩn');
  assert(chatRes3.reply.includes('chỉ hỗ trợ in và photo đen trắng'), 'AI nhận diện đúng model và trả lời đúng nội dung');

  // -------------------------------------------------------------
  // TEST 4: Kiến thức mới trùng kiến thức cũ (Duplicate detection)
  // -------------------------------------------------------------
  console.log('\nTEST 4: Kiến thức mới trùng kiến thức cũ (Duplicate detection)...');
  const autoLearnRes4 = await LearningIngestionEngine.autoLearnFromCorrection({
    questionId: qId1,
    correctedAnswer: correctedAnswer1, // Exactly identical answer
    actor: 'Anh_Tri_Admin',
    orgId: 'org_test_auto',
    relatedTopic: 'Máy in văn phòng',
    relatedProductName: 'HP LaserJet M428fdw',
    runTestNow: false
  });

  assert(autoLearnRes4.success === true, 'Xử lý nạp lặp thành công');
  assert(autoLearnRes4.conflictFlag === false, 'Nội dung trùng khớp không bị gắn cờ mâu thuẫn');

  // -------------------------------------------------------------
  // TEST 5: Kiến thức mới mâu thuẫn kiến thức cũ (Conflict detection)
  // -------------------------------------------------------------
  console.log('\nTEST 5: Kiến thức mới mâu thuẫn kiến thức cũ (Conflict detection)...');
  const conflictingAnswer = 'HP LaserJet M428fdw là máy in phun đa năng có photo màu sắc nét rực rỡ.';
  const autoLearnRes5 = await LearningIngestionEngine.autoLearnFromCorrection({
    questionId: null, // New inquiry entry
    correctedAnswer: conflictingAnswer,
    actor: 'Staff_A',
    orgId: 'org_test_auto',
    relatedTopic: 'Máy in văn phòng',
    relatedProductName: 'HP LaserJet M428fdw',
    runTestNow: false
  });

  assert(autoLearnRes5.conflictFlag === true, 'Hệ thống phát hiện mâu thuẫn (conflict_flag = 1)');
  assert(autoLearnRes5.conflictNotes && autoLearnRes5.conflictNotes.includes('Cảnh báo mâu thuẫn'), 'Có ghi chú cảnh báo mâu thuẫn với tri thức cũ');

  // -------------------------------------------------------------
  // TEST 6: Người dùng không có quyền sửa kiến thức (Unauthorized access)
  // -------------------------------------------------------------
  console.log('\nTEST 6: Kiểm tra bảo mật và quyền truy cập (Unauthorized access)...');
  // Verify token validation logic
  import('../server/middleware/authMiddleware.js').then(({ requireAdmin }) => {
    let unauthRejected = false;
    const mockReq = { headers: {}, query: {} };
    const mockRes = {
      status(code) {
        if (code === 401) unauthRejected = true;
        return { json: () => {} };
      }
    };
    requireAdmin(mockReq, mockRes, () => {});
    assert(unauthRejected === true, 'Middleware chặn 401 Unauthorized khi không có token Admin');
  });

  // -------------------------------------------------------------
  // TEST 7: Hai tổ chức có dữ liệu riêng biệt (Tenant isolation)
  // -------------------------------------------------------------
  console.log('\nTEST 7: Hai tổ chức có dữ liệu riêng biệt (Tenant isolation)...');
  // Tenant A learns private knowledge
  const qId7A = 'q_gap_test_master_07_a';
  await LearningIngestionEngine.autoLearnFromCorrection({
    questionId: qId7A,
    correctedAnswer: 'Chính sách chiết khấu nội bộ dự án Alpha của Doanh nghiệp A là 18% giá trị đơn hàng.',
    actor: 'Admin_Org_A',
    orgId: 'tenant_alpha',
    relatedTopic: 'Chính sách chiết khấu',
    relatedProductName: 'Dự án Alpha',
    runTestNow: true
  });

  // Tenant B searches for Tenant A's private question
  const chatRes7B = await CentralBrainService.processChat({
    message: 'Chính sách chiết khấu nội bộ dự án Alpha của Doanh nghiệp A là bao nhiêu?',
    orgId: 'tenant_beta'
  });

  assert(!chatRes7B.reply.includes('18% giá trị đơn hàng'), 'Tenant Beta KHÔNG truy xuất được tri thức riêng tư của Tenant Alpha');
  assert(chatRes7B.stage !== 'LEARNING_CENTER_RESOLVED', 'Bảo vệ Private AI thành công tuyệt đối');

  // Tenant A searches for its own question
  const chatRes7A = await CentralBrainService.processChat({
    message: 'Chính sách chiết khấu nội bộ dự án Alpha của Doanh nghiệp A là bao nhiêu?',
    orgId: 'tenant_alpha'
  });
  assert(chatRes7A.reply.includes('18% giá trị đơn hàng'), 'Tenant Alpha truy xuất chính xác tri thức riêng của mình');

  // -------------------------------------------------------------
  // TEST 8: Cập nhật kiến thức nhưng kiểm thử thất bại & Tự động Rollback
  // -------------------------------------------------------------
  console.log('\nTEST 8: Kiểm thử thất bại & Tự động Rollback...');
  const qId8 = 'q_gap_test_master_08';
  await db.run(`
    INSERT INTO unanswered_questions (
      id, question, original_question, ai_response, failure_reason,
      priority, hit_count, status, org_id, created_at, updated_at
    ) VALUES (?, 'Điện thoại Panasonic KX-TSC11 có chức năng gì?', 'Điện thoại Panasonic KX-TSC11 có chức năng gì?', 'Chưa có thông tin', 'PRODUCT_NOT_FOUND', 'MEDIUM', 1, 'NEW', 'org_test_auto', ?, ?)
  `, [qId8, now, now]);

  // Admin mistakenly enters fridge appliances info for Panasonic telephone
  const faultyAnswer = 'Dạ Panasonic KX-TSC11 là tủ lạnh đồ gia dụng Panasonic tiết kiệm điện công nghệ Inverter dung tích 300L.';
  const autoLearnRes8 = await LearningIngestionEngine.autoLearnFromCorrection({
    questionId: qId8,
    correctedAnswer: faultyAnswer,
    actor: 'Admin_Error',
    orgId: 'org_test_auto',
    relatedTopic: 'Thiết bị viễn thông',
    relatedProductName: 'Panasonic KX-TSC11',
    runTestNow: true
  });

  assert(autoLearnRes8.didRollback === true, 'Hệ thống tự động kích hoạt Rollback khi bài test phát hiện xung đột nhãn hàng (Tủ lạnh vs Điện thoại)');
  const questionCheck8 = await db.get(`SELECT * FROM unanswered_questions WHERE id = ?`, [qId8]);
  assert(questionCheck8.status === 'REVIEWING', 'Trạng thái câu hỏi được trả về REVIEWING để Admin xem xét lại');

  // -------------------------------------------------------------
  // TEST 9: Khôi phục phiên bản kiến thức trước đó (Manual Version Rollback)
  // -------------------------------------------------------------
  console.log('\nTEST 9: Khôi phục phiên bản kiến thức trước đó (Manual Version Rollback)...');
  const entryId1 = autoLearnRes1.entryId;
  
  // Update to v2 with a temporary message
  await db.run(`
    UPDATE learning_knowledge_entries
    SET standard_answer = 'Phiên bản tạm thời v2 cần hủy bỏ',
        version = 2
    WHERE id = ?
  `, [entryId1]);

  // Rollback to v1
  const rollbackRes = await LearningIngestionEngine.rollbackKnowledgeVersion(entryId1, 1, 'Anh_Tri_Admin', 'org_test_auto');
  assert(rollbackRes.success === true, 'Thực hiện Rollback thành công');
  assert(rollbackRes.restoredVersion === 1, 'Phiên bản được khôi phục về v1');

  const restoredEntry = await db.get(`SELECT standard_answer, version FROM learning_knowledge_entries WHERE id = ?`, [entryId1]);
  assert(restoredEntry.version === 1, 'Số phiên bản trong cơ sở dữ liệu là 1');
  assert(restoredEntry.standard_answer === correctedAnswer1, 'Nội dung câu trả lời được khôi phục nguyên vẹn về v1');

  // -------------------------------------------------------------
  // TEST 10: Tự động ghi nhận lỗi tái diễn & Đề xuất chủ đề yếu
  // -------------------------------------------------------------
  console.log('\nTEST 10: Tự động ghi nhận lỗi tái diễn và đề xuất chủ đề yếu...');
  const recurringQuestion = 'Máy quét mã vạch 2D Zebra DS2208 có đọc được trên màn hình điện thoại không?';
  
  // Customer asks 1st time
  await LearningCaptureEngine.recordGap({
    unansweredQuestion: recurringQuestion,
    aiResponse: 'Dạ shop chưa có thông tin model này.',
    reason: 'PRODUCT_NOT_FOUND',
    relatedTopic: 'Thiết bị mã vạch',
    relatedProductName: 'Zebra DS2208',
    orgId: 'org_test_auto'
  });

  // Customer asks 2nd time (duplicate)
  await LearningCaptureEngine.recordGap({
    unansweredQuestion: recurringQuestion,
    aiResponse: 'Dạ shop chưa có thông tin model này.',
    reason: 'PRODUCT_NOT_FOUND',
    relatedTopic: 'Thiết bị mã vạch',
    relatedProductName: 'Zebra DS2208',
    orgId: 'org_test_auto'
  });

  // Customer asks 3rd time (recurring & urgent)
  const gapRes3 = await LearningCaptureEngine.recordGap({
    unansweredQuestion: recurringQuestion,
    aiResponse: 'Dạ shop chưa có thông tin model này.',
    reason: 'PRODUCT_NOT_FOUND',
    relatedTopic: 'Thiết bị mã vạch',
    relatedProductName: 'Zebra DS2208',
    orgId: 'org_test_auto'
  });

  assert(gapRes3.hitCount === 3, 'Tần suất hỏi (hit_count) tăng lên 3');
  assert(gapRes3.isRecurring === true, 'Ghi nhận cờ lỗi tái diễn (is_recurring = 1)');

  const analytics = await LearningCaptureEngine.getWeaknessAnalytics('org_test_auto');
  assert(analytics.recurringErrorsCount > 0, 'Phân tích điểm yếu phát hiện lỗi tái diễn');
  assert(analytics.suggestedTopics && analytics.suggestedTopics.length > 0, 'AI tự động đưa ra danh sách đề xuất chủ đề cần bổ sung tri thức');

  // -------------------------------------------------------------
  // TỔNG KẾT
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`🏁 TỔNG KẾT KIỂM THỬ 10 TÌNH HUỐNG AUTO LEARNING:`);
  console.log(`- ĐẠT (PASSED): ${passedCount}`);
  console.log(`- THẤT BẠI (FAILED): ${failedCount}`);
  console.log(`- TỶ LỆ THÀNH CÔNG: ${Math.round((passedCount / (passedCount + failedCount)) * 100)}%`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runMasterAutoLearningTests().catch(err => {
  console.error('[FATAL ERROR IN TEST SUITE]', err);
  process.exit(1);
});
