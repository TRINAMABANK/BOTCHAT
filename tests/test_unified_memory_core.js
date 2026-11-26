/**
 * TEST SUITE: UNIFIED MEMORY CORE (6 TIERS + NATURAL MEMORY COMMANDS)
 */

import assert from 'assert';
import { UnifiedMemoryCore, TRUTH_TYPES } from '../server/services/intelligence/unifiedMemoryCore.js';

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

async function runAsync(name, fn) {
  total++;
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}:`, err.message);
  }
}

console.log('\n============================================================');
console.log('🧪 TEST SUITE: UNIFIED MEMORY CORE (6 TIERS)');
console.log('============================================================\n');

// 1. Working Memory: Goal Stack
run('1.1 Working Memory: Goal Stack push, peek, pop, resume', () => {
  const sessionId = 'test_session_mem_1';
  UnifiedMemoryCore.clearGoals(sessionId);

  UnifiedMemoryCore.pushGoal(sessionId, {
    type: 'SALES_CONSULTATION',
    customer: 'Anh Tuấn',
    product: 'Máy đếm tiền Xinda'
  });

  const top = UnifiedMemoryCore.peekGoal(sessionId);
  assert.strictEqual(top.customer, 'Anh Tuấn');
  assert.strictEqual(top.product, 'Máy đếm tiền Xinda');

  // Push second goal: Explaining science
  UnifiedMemoryCore.pushGoal(sessionId, {
    type: 'KNOWLEDGE_EXPLANATION',
    product: 'Máy đếm tiền Xinda',
    step: 'EXPLAINING_SENSOR'
  });

  const second = UnifiedMemoryCore.peekGoal(sessionId);
  assert.strictEqual(second.type, 'KNOWLEDGE_EXPLANATION');

  // Resume previous goal
  const prev = UnifiedMemoryCore.resumePreviousGoal(sessionId);
  assert.strictEqual(prev.customer, 'Anh Tuấn');
  assert.strictEqual(prev.type, 'SALES_CONSULTATION');
});

// 2. Semantic Memory & Contradiction Detection
await runAsync('2.1 Semantic Memory: rememberFact and contradiction update', async () => {
  const entityId = 'cust_test_999';
  const tenantId = 'test_tenant_a';
  const { db } = await import('../server/db.js');
  await db.run('DELETE FROM ai_memories WHERE entity_id = ?;', [entityId]);
  await db.run('DELETE FROM ai_memory_contradictions WHERE entity_id = ?;', [entityId]);

  // Save phone number 1
  const res1 = await UnifiedMemoryCore.rememberFact({
    subject: 'CUSTOMER_PHONE',
    content: '0901234567',
    entityId,
    factType: TRUTH_TYPES.FACT,
    tenantId
  });
  assert.ok(res1.memoryId, 'Must create memoryId');

  // Update to phone number 2 (Contradiction detected -> supersede old)
  const res2 = await UnifiedMemoryCore.rememberFact({
    subject: 'CUSTOMER_PHONE',
    content: '0988777666',
    entityId,
    factType: TRUTH_TYPES.FACT,
    tenantId
  });
  assert.strictEqual(res2.content, '0988777666');

  // Recall facts
  const facts = await UnifiedMemoryCore.recallFacts({ subject: 'CUSTOMER_PHONE', entityId, tenantId });
  assert.strictEqual(facts.length, 1, 'Only active fact remains');
  assert.strictEqual(facts[0].content, '0988777666');
});

// 3. Episodic Memory: Record & Recall
await runAsync('3.1 Episodic Memory: recordEpisode and recallLastEpisode', async () => {
  const convId = 'conv_episodic_test_01';
  const tenantId = 'tenant_test_ep';

  await UnifiedMemoryCore.recordEpisode({
    conversationId: convId,
    category: 'QUOTATION',
    summary: 'Đã tư vấn máy in Brother HL-L6210DW cho văn phòng',
    outcome: 'Khách chờ sếp phê duyệt',
    tenantId
  });

  const recall = await UnifiedMemoryCore.recallLastEpisode(convId, tenantId);
  assert.strictEqual(recall.found, true);
  assert.ok(recall.summary.includes('Brother HL-L6210DW'));
  assert.strictEqual(recall.outcome, 'Khách chờ sếp phê duyệt');
});

// 4. Procedural Memory: Heuristics
await runAsync('4.1 Procedural Memory: getProcedure', async () => {
  const proc = await UnifiedMemoryCore.getProcedure('PRICE_OBJECTION_HANDLING');
  assert.ok(proc);
  assert.ok(proc.steps.length >= 3);
  assert.ok(proc.steps[1].includes('TCO'));
});

// 5. Prospective Memory: Register commitment
await runAsync('5.1 Prospective Memory: registerCommitment', async () => {
  const res = await UnifiedMemoryCore.registerCommitment({
    title: 'Nhắc anh Tuấn gọi lại xác nhận số lượng máy',
    deadline: '2026-11-27T09:00:00Z',
    tenantId: 'tenant_prosp_01'
  });
  assert.ok(res.prospectiveId);
  assert.strictEqual(res.status, 'PENDING');
});

// 6. Associative Memory
run('6.1 Associative Memory: findCrossDomainAssociations', () => {
  const assoc = UnifiedMemoryCore.findCrossDomainAssociations('tiết kiệm điện văn phòng');
  assert.strictEqual(assoc.hasAssociations, true);
  assert.ok(assoc.domains.includes('FINANCE_TCO'));
});

// 7. Natural Memory Commands (Hội thoại tự nhiên)
await runAsync('7.1 Natural Command: "Hôm qua chúng ta đang làm đến đâu?"', async () => {
  const res = await UnifiedMemoryCore.handleMemoryCommand({
    message: 'Hôm qua chúng ta đang làm đến đâu?',
    conversationId: 'conv_episodic_test_01',
    tenantId: 'tenant_test_ep'
  });
  assert.strictEqual(res.handled, true);
  assert.strictEqual(res.commandType, 'RECALL_PROGRESS');
  assert.ok(res.replyText.includes('Brother HL-L6210DW'));
});

await runAsync('7.2 Natural Command: "Đổi số điện thoại thành 0911222333"', async () => {
  const res = await UnifiedMemoryCore.handleMemoryCommand({
    message: 'Đổi số điện thoại của tôi thành 0911222333',
    conversationId: 'conv_cmd_01',
    userContext: { userId: 'user_cmd_01' },
    tenantId: 'tenant_cmd_01'
  });
  assert.strictEqual(res.handled, true);
  assert.strictEqual(res.commandType, 'UPDATE_PHONE');
  assert.ok(res.replyText.includes('0911222333'));
});

await runAsync('7.3 Natural Command: "Xóa thông tin số điện thoại của tôi"', async () => {
  const res = await UnifiedMemoryCore.handleMemoryCommand({
    message: 'Xóa thông tin số điện thoại của tôi',
    conversationId: 'conv_cmd_01',
    userContext: { userId: 'user_cmd_01' },
    tenantId: 'tenant_cmd_01'
  });
  assert.strictEqual(res.handled, true);
  assert.strictEqual(res.commandType, 'FORGET_MEMORY');
  assert.ok(res.replyText.includes('đã xóa'));
});

console.log('\n============================================================');
console.log(`🎯 RESULTS: ${passed}/${total} tests passed (${Math.round((passed / total) * 100)}%)`);
console.log('============================================================\n');

process.exit(passed === total ? 0 : 1);
