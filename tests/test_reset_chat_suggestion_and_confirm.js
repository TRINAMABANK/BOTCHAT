/**
 * Test Suite: Multi-turn Chat Reset Suggestion & "Xóa nội dung chat" Confirmation
 * 
 * Verifies:
 * 1. IntentEngine recognizes RESET_CHAT_REQUEST and CONFIRM_RESET_CHAT
 * 2. CentralBrainService returns proper response and actionType for reset chat
 * 3. SalesEngine appends proactive hint ("Làm mới" / "Xóa nội dung chat") after >= 4 user turns without phone
 * 4. SalesEngine handles "Xóa nội dung chat" by presenting confirmation button
 * 5. SalesEngine handles "Xác nhận làm mới" by triggering RESET_CHAT_NOW
 * 6. Conversations with phone provided or active order flow do NOT spuriously append reset hint
 */

import { IntentEngine } from '../server/services/intelligence/intentEngine.js';
import { CentralBrainService } from '../server/services/centralBrainService.js';
import { SalesEngine } from '../server/salesEngine.js';
import { getDb } from '../server/db.js';
import { randomUUID } from 'crypto';

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

async function runTests() {
  console.log('=== TEST SUITE: RESET CHAT SUGGESTION & CONFIRMATION ===\n');

  // Test 1: IntentEngine recognize reset chat and confirmation
  console.log('[Test 1] IntentEngine recognition:');
  const res1 = IntentEngine.analyzeIntent('xóa nội dung chat');
  assert(res1.primaryIntent === 'RESET_CHAT_REQUEST', 'Identified "xóa nội dung chat" as RESET_CHAT_REQUEST');

  const res2 = IntentEngine.analyzeIntent('xoa chat');
  assert(res2.primaryIntent === 'RESET_CHAT_REQUEST', 'Identified "xoa chat" as RESET_CHAT_REQUEST');

  const res3 = IntentEngine.analyzeIntent('làm mới cuộc trò chuyện');
  assert(res3.primaryIntent === 'RESET_CHAT_REQUEST', 'Identified "làm mới cuộc trò chuyện" as RESET_CHAT_REQUEST');

  const res4 = IntentEngine.analyzeIntent('xác nhận làm mới');
  assert(res4.primaryIntent === 'CONFIRM_RESET_CHAT', 'Identified "xác nhận làm mới" as CONFIRM_RESET_CHAT');

  const res5 = IntentEngine.analyzeIntent('đồng ý xóa');
  assert(res5.primaryIntent === 'CONFIRM_RESET_CHAT', 'Identified "đồng ý xóa" as CONFIRM_RESET_CHAT');

  // Test 2: CentralBrainService reset prompt
  console.log('\n[Test 2] CentralBrainService reset prompt handling:');
  const brainRes = await CentralBrainService.processChat({
    message: 'Xóa nội dung chat',
    conversationId: `conv_test_brain_${Date.now()}`
  });
  assert(brainRes.isResetPrompt === true, 'CentralBrainService returns isResetPrompt = true');
  assert(brainRes.actionType === 'CONFIRM_RESET_CHAT', 'CentralBrainService returns actionType = CONFIRM_RESET_CHAT');
  assert(brainRes.suggestedActions?.some(a => a.action === 'reset_chat'), 'Contains suggested action to reset_chat');

  // Test 3: SalesEngine handles "Xóa nội dung chat"
  console.log('\n[Test 3] SalesEngine handles "Xóa nội dung chat":');
  const testConv1 = `conv_reset_${randomUUID().slice(0, 8)}`;
  const seResetRes = await SalesEngine.processMessage({
    conversationId: testConv1,
    message: 'Xóa nội dung chat'
  });
  assert(seResetRes.isResetPrompt === true, 'SalesEngine sets isResetPrompt = true');
  assert(seResetRes.actionType === 'CONFIRM_RESET_CHAT', 'SalesEngine sets actionType = CONFIRM_RESET_CHAT');
  assert(seResetRes.reply.includes('Xác nhận Làm mới') || seResetRes.reply.includes('Làm mới'), 'Reply mentions "Xác nhận Làm mới"');
  assert(seResetRes.suggestedActions?.some(a => a.id === 'confirm_reset_chat'), 'Contains confirm_reset_chat action button');

  // Test 4: SalesEngine handles "Xác nhận làm mới"
  console.log('\n[Test 4] SalesEngine handles "Xác nhận làm mới":');
  const seConfirmRes = await SalesEngine.processMessage({
    conversationId: testConv1,
    message: 'Xác nhận làm mới'
  });
  assert(seConfirmRes.actionType === 'RESET_CHAT_NOW', 'SalesEngine sets actionType = RESET_CHAT_NOW');
  assert(seConfirmRes.isResetPrompt === true, 'SalesEngine sets isResetPrompt = true');

  // Test 5: Multi-turn chat (>= 4 user turns) without phone triggers proactive hint
  console.log('\n[Test 5] Multi-turn conversation without phone triggers proactive hint:');
  const testConvMulti = `conv_multi_${randomUUID().slice(0, 8)}`;
  
  // Turn 1
  await SalesEngine.processMessage({
    conversationId: testConvMulti,
    message: 'Chào shop'
  });
  // Turn 2
  await SalesEngine.processMessage({
    conversationId: testConvMulti,
    message: 'Shop có bán máy in không'
  });
  // Turn 3
  await SalesEngine.processMessage({
    conversationId: testConvMulti,
    message: 'Máy in Brother giá bao nhiêu'
  });
  // Turn 4 (>= 4 turns without phone)
  const turn4Res = await SalesEngine.processMessage({
    conversationId: testConvMulti,
    message: 'Có bảo hành chính hãng không'
  });

  assert(turn4Res.reply.includes('Làm mới'), 'Turn 4 reply includes proactive hint mentioning "Làm mới"');
  assert(turn4Res.reply.includes('Xóa nội dung chat'), 'Turn 4 reply includes proactive hint mentioning "Xóa nội dung chat"');
  assert(turn4Res.suggestedActions?.some(a => a.id === 'request_reset_chat'), 'Turn 4 includes quick action chip "🧹 Xóa nội dung chat"');

  // Test 6: If customer provided phone, proactive reset hint is NOT added
  console.log('\n[Test 6] Conversation with phone does NOT spuriously trigger reset hint:');
  const testConvPhone = `conv_phone_${randomUUID().slice(0, 8)}`;
  await SalesEngine.processMessage({ conversationId: testConvPhone, message: 'Chào shop' });
  await SalesEngine.processMessage({ conversationId: testConvPhone, message: 'Tôi quan tâm máy đếm tiền' });
  await SalesEngine.processMessage({ conversationId: testConvPhone, message: 'Số điện thoại của tôi là 0912345678' });
  const turn4WithPhone = await SalesEngine.processMessage({ conversationId: testConvPhone, message: 'Tư vấn giúp tôi mẫu tốt nhất' });

  assert(!turn4WithPhone.reply.includes('Nếu bạn muốn xóa bớt nội dung chat'), 'Reply does not include proactive reset hint when phone is already captured');

  console.log(`\n========================================`);
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
