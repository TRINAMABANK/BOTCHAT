/**
 * TEST SUITE: PHASE 6 - MULTI-TURN CONTEXT & MEMORY (BOTCHAT BRAIN 2.1)
 * 
 * Verifies:
 * 1. Pronoun and Product Co-reference Resolution ("nó", "con này", "máy này")
 * 2. Time Co-reference Resolution ("ngày đó", "hôm đó", "giờ đó")
 * 3. Person Co-reference Resolution ("anh ấy", "người ấy")
 * 4. Context Correction Detection ("không phải, tôi hỏi...")
 * 5. Session Context Lifecycle & In-Memory TTL Management
 * 6. Multi-turn Message History Fetching from Database
 */

import { ContextEngine } from '../server/services/intelligence/contextEngine.js';
import { MemoryEngine } from '../server/services/intelligence/memoryEngine.js';

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
console.log('🚀 KIỂM THỬ GIAI ĐOẠN 6: MULTI-TURN CONTEXT & MEMORY');
console.log('================================================================\n');

async function runTests() {
  const convId = 'conv_multiturn_test_01';

  // -------------------------------------------------------------
  // Group 1: Session Initialization & State Tracking
  // -------------------------------------------------------------
  console.log('--- 1. Kiểm tra Khởi Tạo & Cập Nhật Phiên (Session Context) ---');

  ContextEngine.updateSessionContext(convId, {
    lastProduct: { id: 101, name: 'Máy in Brother HL-L6210DW' },
    lastTimeSpec: 'thứ sáu tuần này',
    lastTargetPerson: 'anh Trí',
    lastIntent: 'PRODUCT_CONSULTATION'
  });

  const session = ContextEngine.getSessionContext(convId);
  assert(session.lastProduct?.name === 'Máy in Brother HL-L6210DW', 'Session remembered product');
  assert(session.lastTimeSpec === 'thứ sáu tuần này', 'Session remembered timeSpec');
  assert(session.lastTargetPerson === 'anh Trí', 'Session remembered target person');

  // -------------------------------------------------------------
  // Group 2: Co-Reference Resolution
  // -------------------------------------------------------------
  console.log('\n--- 2. Kiểm tra Giải Quyết Tham Chiếu Đại Từ (Co-reference) ---');

  // 2.1 Product pronoun "nó", "con này"
  const coRef1 = ContextEngine.resolveCoReferences('Nó giá bao nhiêu tiền vậy bạn?', convId);
  assert(coRef1.resolvedProduct?.name === 'Máy in Brother HL-L6210DW', 'Resolved pronoun "nó" to previous product');

  const coRef2 = ContextEngine.resolveCoReferences('Bảo hành con này bao lâu?', convId);
  assert(coRef2.resolvedProduct?.name === 'Máy in Brother HL-L6210DW', 'Resolved "con này" to previous product');

  // 2.2 Time pronoun "ngày đó", "hôm đó"
  const coRefTime = ContextEngine.resolveCoReferences('Vậy chốt hẹn ngày đó nhé!', convId);
  assert(coRefTime.resolvedTimeSpec === 'thứ sáu tuần này', 'Resolved "ngày đó" to previous timeSpec');

  // 2.3 Person pronoun "anh ấy"
  const coRefPerson = ContextEngine.resolveCoReferences('Cho tôi gặp anh ấy lúc 2h chiều', convId);
  assert(coRefPerson.resolvedPerson === 'anh Trí', 'Resolved "anh ấy" to target person');

  // -------------------------------------------------------------
  // Group 3: Context Correction Detection
  // -------------------------------------------------------------
  console.log('\n--- 3. Kiểm tra Đính Chính Ngữ Cảnh (Context Correction) ---');

  const coRefCorrection = ContextEngine.resolveCoReferences('Không phải, tôi hỏi máy scan chứ không phải máy in', convId);
  assert(coRefCorrection.isCorrection === true, 'Detected context correction trigger');
  assert(coRefCorrection.correctionDetail.includes('máy scan'), 'Captured correction detail');

  // -------------------------------------------------------------
  // Group 4: Multi-turn DB Message History
  // -------------------------------------------------------------
  console.log('\n--- 4. Kiểm tra Tải Lịch Sử Hội Thoại Từ Database ---');

  const history = await ContextEngine.getConversationHistory('conv_unknown_empty', 5);
  assert(Array.isArray(history), 'Conversation history returns valid array');
  assert(history.length === 0, 'Empty conversation history handled gracefully without error');

  // -------------------------------------------------------------
  // Group 5: Memory Compliance (Forget / Reset)
  // -------------------------------------------------------------
  console.log('\n--- 5. Kiểm tra Tuân Thủ Bộ Nhớ (GDPR / Xóa Thông Tin) ---');

  const forgetRes = await MemoryEngine.forgetCustomer('usr_test_privacy', 'org_default');
  assert(forgetRes.success === true, 'Forget customer memory succeeded');

  console.log('\n================================================================');
  console.log(`🏁 KẾT QUẢ GIAI ĐOẠN 6: ${passed} PASS, ${failed} FAIL (Tỷ lệ: ${((passed / (passed + failed)) * 100).toFixed(1)}%)`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
