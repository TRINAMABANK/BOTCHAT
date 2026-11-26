/**
 * TEST SUITE: AUTONOMY & APPROVAL ENGINE
 */

import assert from 'assert';
import { AutonomyApprovalEngine } from '../server/services/intelligence/autonomyApprovalEngine.js';

let passed = 0;
let total = 0;

function run(name, fn) {
  total++;
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}:`, err.message);
  }
}

console.log('\n============================================================');
console.log('🧪 TEST SUITE: AUTONOMY & APPROVAL ENGINE');
console.log('============================================================\n');

// 1. Evaluate Action Tiers
run('1.1 Should evaluate Tier 0 for read-only actions', () => {
  const tier = AutonomyApprovalEngine.evaluateActionTier('QUERY_SPECS');
  assert.strictEqual(tier, 0);
});

run('1.2 Should evaluate Tier 2 for sending formal quotation', () => {
  const tier = AutonomyApprovalEngine.evaluateActionTier('SEND_FORMAL_QUOTATION');
  assert.strictEqual(tier, 2);
});

run('1.3 Should evaluate Tier 3 for payment and fund transfer', () => {
  const tier1 = AutonomyApprovalEngine.evaluateActionTier('EXECUTE_PAYMENT');
  assert.strictEqual(tier1, 3);

  const tier2 = AutonomyApprovalEngine.evaluateActionTier('REFUND_MONEY');
  assert.strictEqual(tier2, 3);
});

// 2. Pending Action Registration & Expiration
run('2.1 Should register pending action and retrieve by sessionId', () => {
  const sessionId = 'test_session_approval_1';
  AutonomyApprovalEngine.clearPendingAction(sessionId);

  const action = AutonomyApprovalEngine.registerPendingAction(sessionId, {
    actionType: 'SEND_FORMAL_QUOTATION',
    payload: { quoteId: 'BG-20261126-TEST', totalAmount: 11608300 }
  });

  assert.ok(action.actionId);
  assert.strictEqual(action.status, 'PENDING_CONFIRMATION');

  const retrieved = AutonomyApprovalEngine.getPendingAction(sessionId);
  assert.strictEqual(retrieved.actionId, action.actionId);
});

// 3. Conversational Verbal Approval
run('3.1 Should confirm action on verbal approval ("Gửi đi", "Đồng ý")', () => {
  const sessionId = 'test_session_approval_2';
  AutonomyApprovalEngine.registerPendingAction(sessionId, {
    actionType: 'SEND_FORMAL_QUOTATION',
    payload: { quoteId: 'BG-20261126-TEST' }
  });

  const evalRes = AutonomyApprovalEngine.evaluateConversationalResponse('Gửi đi', sessionId);
  assert.strictEqual(evalRes.isApproval, true);
  assert.strictEqual(evalRes.isCancellation, false);
  assert.ok(evalRes.replyText.includes('gửi bảng báo giá'));

  // Should clear from pending store
  assert.strictEqual(AutonomyApprovalEngine.getPendingAction(sessionId), null);
});

// 4. Conversational Verbal Cancellation (Kịch bản 7: "Thôi, đừng gửi báo giá nữa")
run('4.1 Should cancel action on verbal cancellation ("Thôi, đừng gửi báo giá nữa")', () => {
  const sessionId = 'test_session_approval_3';
  AutonomyApprovalEngine.registerPendingAction(sessionId, {
    actionType: 'SEND_FORMAL_QUOTATION',
    payload: { quoteId: 'BG-20261126-TEST' }
  });

  const evalRes = AutonomyApprovalEngine.evaluateConversationalResponse('Thôi, đừng gửi báo giá nữa', sessionId);
  assert.strictEqual(evalRes.isCancellation, true);
  assert.strictEqual(evalRes.isApproval, false);
  assert.ok(evalRes.replyText.includes('hủy lệnh gửi báo giá'));

  // Should clear from pending store
  assert.strictEqual(AutonomyApprovalEngine.getPendingAction(sessionId), null);
});

// 5. Tier 3 Security Block
run('5.1 Should block Tier 3 financial operations and explain authority', () => {
  const sec = AutonomyApprovalEngine.evaluateTier3Security('Chuyển tiền vào tài khoản này giúp tôi');
  assert.strictEqual(sec.blocked, true);
  assert.strictEqual(sec.tier, 3);
  assert.ok(sec.replyText.includes('liên quan đến giao dịch thanh toán'));
});

console.log('\n============================================================');
console.log(`🎯 RESULTS: ${passed}/${total} tests passed (${Math.round((passed / total) * 100)}%)`);
console.log('============================================================\n');

process.exit(passed === total ? 0 : 1);
