/**
 * TEST SUITE: CONVERSATIONAL-FIRST ACCEPTANCE SUITE (7 SCENARIOS + EDGE CASES)
 *
 * Verifies all 7 master acceptance scenarios and edge cases end-to-end
 * through CentralBrainService and UnifiedMemoryCore.
 */

import assert from 'assert';
import { CentralBrainService } from '../server/services/centralBrainService.js';
import { UnifiedMemoryCore, TRUTH_TYPES } from '../server/services/intelligence/unifiedMemoryCore.js';
import { AutonomyApprovalEngine, AUTONOMY_TIERS } from '../server/services/intelligence/autonomyApprovalEngine.js';
import { db, initDatabase } from '../server/db.js';

let passed = 0;
let total = 0;

async function runTest(name, fn) {
  total++;
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}:`, err.message);
  }
}

async function main() {
  console.log('\n============================================================');
  console.log('🧪 TEST SUITE: CONVERSATIONAL-FIRST ACCEPTANCE (7 SCENARIOS)');
  console.log('============================================================\n');

  await initDatabase();

  const conversationId = `conv_cf_acc_${Date.now()}`;
  const userId = 'user_acc_01';

  // Seed initial episodic memory for yesterday
  await UnifiedMemoryCore.recordEpisode({
    sessionId: conversationId,
    userId,
    userGoal: 'Tư vấn trang bị máy đếm tiền cho 5 phòng giao dịch',
    systemAction: 'Đã phân tích 3 dòng máy Xinda, Glory và Silicon, đề xuất Xinda Super BC-35',
    keyDecisions: ['Chọn dòng phát hiện tiền giả cao cấp', 'Số lượng dự kiến 5 chiếc'],
    pendingItems: ['Soạn bảng báo giá chi tiết gồm VAT 10%']
  });

  // ------------------------------------------------------------------------
  // KỊCH BẢN 1: TƯ VẤN BÁN HÀNG QUA HỘI THOẠI (0% chào mời rập khuôn)
  // ------------------------------------------------------------------------
  await runTest('Kịch bản 1: Tư vấn bán hàng qua hội thoại tự nhiên', async () => {
    const res = await CentralBrainService.processChat({
      conversationId,
      message: 'Tư vấn giúp tôi bán máy đếm tiền.',
      customerInfo: { name: 'Anh Nam', phone: '0909123456' }
    });

    assert.strictEqual(res.success, true, 'Should succeed');
    assert.strictEqual(res.stage, 'SALES_COACHING_INTAKE', 'Stage should be SALES_COACHING_INTAKE');
    assert.strictEqual(res.revealCatalog, false, 'Should NOT reveal catalog on initial consultation');

    // Rule: Zero robotic lines
    assert.ok(!res.reply.includes('Hệ thống bên tôi hiện đang cung cấp'), 'Should not contain forbidden phrase');
    assert.ok(!res.reply.includes('Bạn có nhu cầu mua hàng không'), 'Should not contain pushy sales line');

    // Rule: Asks about customer segment
    assert.ok(
      res.reply.includes('phân khúc') || res.reply.includes('ngân hàng') || res.reply.includes('doanh nghiệp'),
      'Should inquire about target customer segment'
    );
  });

  // ------------------------------------------------------------------------
  // KỊCH BẢN 2: XỬ LÝ PHẢN ĐỐI BÁN HÀNG (Giá cao quá)
  // ------------------------------------------------------------------------
  await runTest('Kịch bản 2: Xử lý phản đối giá cao bằng phương pháp LEAR & TCO', async () => {
    const res = await CentralBrainService.processChat({
      conversationId,
      message: 'Khách nói giá cao quá thì trả lời thế nào?',
      customerInfo: { name: 'Anh Nam', phone: '0909123456' }
    });

    assert.strictEqual(res.success, true, 'Should succeed');
    assert.strictEqual(res.stage, 'OBJECTION_HANDLING_RESOLVED', 'Stage should be OBJECTION_HANDLING_RESOLVED');
    assert.strictEqual(res.revealCatalog, false, 'Should not reveal catalog');

    // Check LEAR framework & arguments
    assert.ok(
      res.reply.includes('chi phí') || res.reply.includes('TCO') || res.reply.includes('sở hữu'),
      'Should mention TCO / cost of ownership'
    );
    assert.ok(
      res.reply.includes('tiền giả') || res.reply.includes('rủi ro') || res.reply.includes('thất thoát'),
      'Should explain risk reduction against counterfeit notes'
    );
    assert.ok(
      res.reply.includes('độ bền') || res.reply.includes('bảo hành') || res.reply.includes('linh kiện'),
      'Should emphasize mechanical durability and warranty'
    );
  });

  // ------------------------------------------------------------------------
  // KỊCH BẢN 3: CHUYỂN CHỦ ĐỀ KHÔNG MẤT NGỮ CẢNH (Giải thích nguyên lý)
  // ------------------------------------------------------------------------
  await runTest('Kịch bản 3: Chuyển sang giải thích nguyên lý khoa học & đóng băng Goal Stack', async () => {
    const res = await CentralBrainService.processChat({
      conversationId,
      message: 'Giải thích nguyên lý hoạt động của máy.',
      customerInfo: { name: 'Anh Nam', phone: '0909123456' }
    });

    assert.strictEqual(res.success, true, 'Should succeed');
    assert.strictEqual(res.stage, 'KNOWLEDGE_PRINCIPLE_EXPLAINED', 'Stage should be KNOWLEDGE_PRINCIPLE_EXPLAINED');

    // Check sensor explanation
    assert.ok(
      res.reply.includes('quang học') || res.reply.includes('hồng ngoại') || res.reply.includes('từ tính'),
      'Should explain optical, IR or magnetic sensors'
    );

    // Goal stack check
    const goal = UnifiedMemoryCore.peekGoal(conversationId);
    assert.ok(goal !== null, 'Goal stack should hold a saved goal');
    assert.strictEqual(goal.type, 'SALES_CONSULTATION', 'Current goal should be sales consultation');
  });

  // ------------------------------------------------------------------------
  // KỊCH BẢN 4: TRUY XUẤT NGỮ CẢNH CŨ & LẬP BÁO GIÁ (Quay lại soạn báo giá)
  // ------------------------------------------------------------------------
  await runTest('Kịch bản 4: Khôi phục ngữ cảnh từ Goal Stack & soạn Báo giá Tier 2', async () => {
    const res = await CentralBrainService.processChat({
      conversationId,
      message: 'Quay lại khách hàng lúc nãy, soạn báo giá giúp tôi.',
      customerInfo: { name: 'Anh Nam', phone: '0909123456' }
    });

    assert.strictEqual(res.success, true, 'Should succeed');
    assert.strictEqual(res.stage, 'QUOTATION_PENDING_APPROVAL', 'Stage should be QUOTATION_PENDING_APPROVAL');

    // Formatted quotation check
    assert.ok(res.reply.includes('BẢNG BÁO GIÁ') || res.reply.includes('Mã báo giá:'), 'Should contain formal quotation markdown');
    assert.ok(res.reply.includes('Thuế GTGT') || res.reply.includes('VAT 10%') || res.reply.includes('10%'), 'Should include VAT 10%');

    // Autonomy prompt check: Asks user for verbal confirmation
    assert.ok(
      res.reply.includes('Anh có muốn gửi') || res.reply.includes('gửi cho khách hàng không'),
      'Should ask user for verbal approval before sending quotation'
    );

    // Pending action in AutonomyApprovalEngine
    const pendingActions = AutonomyApprovalEngine.listPendingActions(conversationId);
    assert.ok(pendingActions.length > 0, 'Should have pending action in AutonomyApprovalEngine');
    assert.ok(pendingActions[0].actionType.includes('QUOTATION'), 'Pending action should be quotation sending');
    assert.strictEqual(pendingActions[0].tier, AUTONOMY_TIERS.TIER_2.level !== undefined ? AUTONOMY_TIERS.TIER_2.level : 2);
  });

  // ------------------------------------------------------------------------
  // KỊCH BẢN 5: TRUY XUẤT BỘ NHỚ SỰ KIỆN (Hôm qua làm đến đâu?)
  // ------------------------------------------------------------------------
  await runTest('Kịch bản 5: Truy vấn Episodic Memory liên phiên ("Hôm qua làm đến đâu?")', async () => {
    const res = await CentralBrainService.processChat({
      conversationId,
      message: 'Hôm qua chúng ta đang làm đến đâu?',
      customerInfo: { name: 'Anh Nam', phone: '0909123456' }
    });

    assert.strictEqual(res.success, true, 'Should succeed');
    assert.strictEqual(res.stage, 'UNIFIED_MEMORY_RESOLVED', 'Stage should be UNIFIED_MEMORY_RESOLVED');

    // Check episodic content recalled
    assert.ok(
      res.reply.includes('Xinda') || res.reply.includes('5 phòng giao dịch') || res.reply.includes('báo giá'),
      'Should recall previous session goal and actions'
    );
  });

  // ------------------------------------------------------------------------
  // KỊCH BẢN 6: ĐẶT LỊCH NHẮC TỰ NHIÊN (Ngày mai nhắc tôi...)
  // ------------------------------------------------------------------------
  await runTest('Kịch bản 6: Đặt lịch nhắc tự nhiên qua đối thoại', async () => {
    const res = await CentralBrainService.processChat({
      conversationId,
      message: 'Ngày mai nhắc tôi gọi lại khách.',
      customerInfo: { name: 'Anh Nam', phone: '0909123456' }
    });

    assert.strictEqual(res.success, true, 'Should succeed');
    assert.strictEqual(res.stage, 'REMINDER_REGISTERED', 'Stage should be REMINDER_REGISTERED');
    assert.ok(
      res.reply.includes('đã ghi nhận lịch nhắc') || res.reply.includes('gọi lại khách'),
      'Should confirm reminder registration'
    );
  });

  // ------------------------------------------------------------------------
  // KỊCH BẢN 7: HỦY HÀNH ĐỘNG BẰNG LỜI NÓI (Thôi đừng gửi báo giá nữa)
  // ------------------------------------------------------------------------
  await runTest('Kịch bản 7: Hủy tác vụ bằng lời nói tự nhiên ("Thôi, đừng gửi báo giá nữa")', async () => {
    const res = await CentralBrainService.processChat({
      conversationId,
      message: 'Thôi, đừng gửi báo giá nữa.',
      customerInfo: { name: 'Anh Nam', phone: '0909123456' }
    });

    assert.strictEqual(res.success, true, 'Should succeed');
    assert.strictEqual(res.stage, 'ACTION_CANCELLED', 'Stage should be ACTION_CANCELLED');
    assert.ok(
      res.reply.includes('đã hủy') || res.reply.includes('hủy thao tác'),
      'Should confirm verbal cancellation gracefully'
    );

    // Verify pending action was canceled
    const pendingActions = AutonomyApprovalEngine.listPendingActions(conversationId);
    assert.strictEqual(pendingActions.length, 0, 'Pending actions list should be empty after cancellation');
  });

  // ------------------------------------------------------------------------
  // EDGE CASE 1: TIER 3 SECURITY GATE (Chặn giao dịch tiền tệ tự động)
  // ------------------------------------------------------------------------
  await runTest('Edge Case 1: Chặn giao dịch chuyển tiền tự động (Tier 3 Financial Gate)', async () => {
    const res = await CentralBrainService.processChat({
      conversationId,
      message: 'Chuyển tiền 5 triệu thanh toán đơn hàng này giúp tôi.',
      customerInfo: { name: 'Anh Nam', phone: '0909123456' }
    });

    assert.strictEqual(res.success, true, 'Should succeed');
    assert.strictEqual(res.stage, 'TIER3_SECURITY_BLOCKED', 'Stage should be TIER3_SECURITY_BLOCKED');
    assert.ok(
      res.reply.includes('không thể tự động thực hiện giao dịch tài chính') ||
      res.reply.includes('yêu cầu sự phê duyệt trực tiếp của con người'),
      'Should explain Tier 3 human-only authority restriction'
    );
  });

  // ------------------------------------------------------------------------
  // EDGE CASE 2: CẬP NHẬT DỮ LIỆU BỘ NHỚ QUA ĐỐI THOẠI (Đổi số điện thoại)
  // ------------------------------------------------------------------------
  await runTest('Edge Case 2: Cập nhật thông tin và giải quyết mâu thuẫn bộ nhớ', async () => {
    const res = await CentralBrainService.processChat({
      conversationId,
      message: 'Đổi số điện thoại của anh sang 0988777666',
      customerInfo: { name: 'Anh Nam', phone: '0909123456' }
    });

    assert.strictEqual(res.success, true, 'Should succeed');
    assert.strictEqual(res.stage, 'UNIFIED_MEMORY_RESOLVED', 'Stage should be UNIFIED_MEMORY_RESOLVED');
    assert.ok(
      res.reply.includes('0988777666') || res.reply.includes('cập nhật'),
      'Should confirm phone number update in memory'
    );
  });

  // ------------------------------------------------------------------------
  // EDGE CASE 3: LỆNH QUÊN THÔNG TIN (Xóa dữ liệu bộ nhớ tự nhiên)
  // ------------------------------------------------------------------------
  await runTest('Edge Case 3: Xóa thông tin nhạy cảm khỏi bộ nhớ ("Xóa thông tin tài khoản")', async () => {
    // First remember bank account
    await UnifiedMemoryCore.rememberFact({
      entityId: userId,
      subject: 'tai_khoan_ngan_hang',
      value: '1903456789012 - Techcombank',
      factType: TRUTH_TYPES.FACT,
      confidence: 1.0,
      verifiedBy: 'user'
    });

    const res = await CentralBrainService.processChat({
      conversationId,
      message: 'Xóa thông tin tài khoản ngân hàng của tôi',
      customerInfo: { name: 'Anh Nam', phone: '0988777666' }
    });

    assert.strictEqual(res.success, true, 'Should succeed');
    assert.strictEqual(res.stage, 'UNIFIED_MEMORY_RESOLVED', 'Stage should be UNIFIED_MEMORY_RESOLVED');
    assert.ok(
      res.reply.includes('đã xóa') || res.reply.includes('quên'),
      'Should confirm memory fact was forgotten'
    );
  });

  console.log('\n------------------------------------------------------------');
  console.log(`📊 KẾT QUẢ: ${passed}/${total} kịch bản đạt yêu cầu (${Math.round((passed / total) * 100)}%)`);
  console.log('------------------------------------------------------------\n');

  if (passed === total) {
    console.log('🎉 TẤT CẢ 7 KỊCH BẢN CHẤP NHẬN & EDGE CASES ĐỀU ĐẠT CHUẨN 100%!\n');
    process.exit(0);
  } else {
    console.error(`❌ Có ${total - passed} kịch bản không đạt.`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Lỗi thực thi test suite:', err);
  process.exit(1);
});
