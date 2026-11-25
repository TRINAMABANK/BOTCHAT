/**
 * TEST SUITE: NATURAL HUMAN CONVERSATION ENGINE (TRÍ AI ULTIMATE ROBOT)
 * 
 * Verifies:
 * 1. Context Analysis: Knowledge, Problem Solving, Casual Chat, Purchase Intent.
 * 2. Anti-Robotic Sanitizer: Removes all prohibited phrases and unsolicited product pushes.
 * 3. Knowledge Inquiries: Deep explanations without catalog dumping or Column 2 triggers.
 * 4. Problem Solving: Clear diagnostic steps, at most 1 single question, zero sales pressure.
 * 5. Casual Chat: Diverse, natural, non-repetitive greetings and closings.
 * 6. Smart Sales Preservation: Explicit purchase intent and quotations remain 100% functional.
 */

import assert from 'assert';
import { NaturalHumanConversationEngine } from '../server/services/intelligence/naturalHumanConversationEngine.js';
import { CentralBrainService } from '../server/services/centralBrainService.js';
import { ResponseEngine } from '../server/services/intelligence/responseEngine.js';

let passedTests = 0;
let totalTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  [PASS] ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${testName}:`, err.message);
  }
}

async function runAsyncTest(testName, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  [PASS] ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${testName}:`, err.message);
  }
}

console.log('\n============================================================');
console.log('🧪 TEST SUITE: NATURAL HUMAN CONVERSATION ENGINE');
console.log('============================================================\n');

// -----------------------------------------------------------------------------
// 1. CONTEXT ANALYSIS TESTS
// -----------------------------------------------------------------------------
console.log('--- 1. Context Analysis & Goal Detection ---');

runTest('1.1 Should classify science question as SEEK_KNOWLEDGE with no sales intent', () => {
  const ctx = NaturalHumanConversationEngine.analyzeConversationContext({
    message: 'Giải thích cho tôi về thuyết tương đối của Einstein'
  });
  assert.strictEqual(ctx.userGoal, 'SEEK_KNOWLEDGE');
  assert.strictEqual(ctx.hasExplicitSalesIntent, false);
  assert.strictEqual(ctx.isSeekingKnowledge, true);
  assert.strictEqual(ctx.responseMode, 'COMPREHENSIVE');
});

runTest('1.2 Should classify troubleshooting query as PROBLEM_SOLVING with no sales intent', () => {
  const ctx = NaturalHumanConversationEngine.analyzeConversationContext({
    message: 'Tại sao máy in bị kẹt giấy và cách khắc phục?'
  });
  assert.strictEqual(ctx.userGoal, 'PROBLEM_SOLVING');
  assert.strictEqual(ctx.hasExplicitSalesIntent, false);
  assert.strictEqual(ctx.isProblemSolving, true);
});

runTest('1.3 Should classify casual greeting as CASUAL_CHAT', () => {
  const ctx = NaturalHumanConversationEngine.analyzeConversationContext({
    message: 'Chào bạn, hôm nay thời tiết thế nào?'
  });
  assert.strictEqual(ctx.userGoal, 'CASUAL_CHAT');
  assert.strictEqual(ctx.hasExplicitSalesIntent, false);
  assert.strictEqual(ctx.isCasualChat, true);
});

runTest('1.4 Should detect explicit sales intent when asking for quotation or buy', () => {
  const ctx1 = NaturalHumanConversationEngine.analyzeConversationContext({
    message: 'Báo giá cho tôi máy in Brother HL-L6210DW'
  });
  assert.strictEqual(ctx1.hasExplicitSalesIntent, true);
  assert.strictEqual(ctx1.userGoal, 'PURCHASE_INTENT');

  const ctx2 = NaturalHumanConversationEngine.analyzeConversationContext({
    message: 'Tầm 15 triệu có mua được laptop nào tốt không?'
  });
  assert.strictEqual(ctx2.hasExplicitSalesIntent, true);
  assert.strictEqual(ctx2.userGoal, 'PURCHASE_INTENT');
});

// -----------------------------------------------------------------------------
// 2. ANTI-ROBOTIC SANITIZER TESTS
// -----------------------------------------------------------------------------
console.log('\n--- 2. Anti-Robotic Sanitizer ---');

runTest('2.1 Strips prohibited phrases: "Hệ thống bên tôi hiện đang cung cấp..."', () => {
  const dirty = 'Dạ máy in kẹt giấy do bánh cuốn mòn. Hệ thống bên tôi hiện đang cung cấp rất nhiều sản phẩm máy in mới nhé!';
  const cleaned = NaturalHumanConversationEngine.sanitizeResponse(dirty, { hasExplicitSalesIntent: false });
  assert.ok(!cleaned.includes('Hệ thống bên tôi hiện đang cung cấp'), 'Prohibited phrase must be removed');
  assert.ok(cleaned.includes('Dạ máy in kẹt giấy'), 'Core answer preserved');
});

runTest('2.2 Strips prohibited phrases: "Bạn có đang cần tư vấn sản phẩm nào không?"', () => {
  const dirty = 'Lá cây có màu xanh do chất diệp lục. Bạn có đang cần tư vấn sản phẩm nào không?';
  const cleaned = NaturalHumanConversationEngine.sanitizeResponse(dirty, { hasExplicitSalesIntent: false });
  assert.ok(!cleaned.includes('Bạn có đang cần tư vấn sản phẩm nào không'), 'Robotic pitch must be removed');
});

runTest('2.3 Strips prohibited phrases: "Chúng tôi có rất nhiều sản phẩm..."', () => {
  const dirty = 'Thuyết tương đối giải thích không thời gian. Chúng tôi có rất nhiều sản phẩm sách và giáo trình hay!';
  const cleaned = NaturalHumanConversationEngine.sanitizeResponse(dirty, { hasExplicitSalesIntent: false });
  assert.ok(!cleaned.includes('Chúng tôi có rất nhiều sản phẩm'), 'Store bragging must be removed');
});

runTest('2.4 Strips prohibited phrases: "Bạn có nhu cầu mua hàng không?"', () => {
  const dirty = 'Chào bạn! Bạn có nhu cầu mua hàng không?';
  const cleaned = NaturalHumanConversationEngine.sanitizeResponse(dirty, { hasExplicitSalesIntent: false });
  assert.ok(!cleaned.includes('Bạn có nhu cầu mua hàng không'), 'Unsolicited purchase probe must be removed');
});

runTest('2.5 Strips Column 2 promotional push in non-sales context', () => {
  const dirty = 'Lỗi này do quạt gió bám bụi. Toàn bộ danh mục sản phẩm hiện có của shop đã được mở sẵn ở **Cột 2** để bạn tham khảo!';
  const cleaned = NaturalHumanConversationEngine.sanitizeResponse(dirty, { hasExplicitSalesIntent: false, isSalesContext: false });
  assert.ok(!cleaned.toLowerCase().includes('cột 2'), 'Column 2 mention must be removed in non-sales context');
});

// -----------------------------------------------------------------------------
// 3. CENTRAL BRAIN INTEGRATION & END-TO-END FLOW TESTS
// -----------------------------------------------------------------------------
console.log('\n--- 3. Central Brain End-to-End Flows ---');

await runAsyncTest('3.1 Knowledge Inquiry: Einstein Relativity (No catalog, No Column 2)', async () => {
  const res = await CentralBrainService.processChat({
    message: 'Giải thích cho tôi về thuyết tương đối của Einstein',
    conversationId: 'test_natural_suite_1',
    userContext: { role: 'guest' }
  });

  assert.strictEqual(res.revealCatalog, false, 'Must not reveal catalog');
  assert.strictEqual(res.recommendedProduct, null, 'Must not recommend product');
  assert.ok(res.toolsUsed.includes('natural_human_conversation_engine'), 'Must use natural human engine');
  assert.ok(res.reply && res.reply.length > 50, 'Reply must be comprehensive');
  assert.ok(!res.reply.includes('Hệ thống bên tôi'), 'No prohibited phrases');
  assert.ok(!res.reply.toLowerCase().includes('cột 2'), 'No Column 2 mention');
});

await runAsyncTest('3.2 Knowledge Inquiry: Why leaves are green (No sales pitch)', async () => {
  const res = await CentralBrainService.processChat({
    message: 'Tại sao lá cây có màu xanh lục?',
    conversationId: 'test_natural_suite_2',
    userContext: { role: 'guest' }
  });

  assert.strictEqual(res.revealCatalog, false, 'Must not reveal catalog');
  assert.strictEqual(res.recommendedProduct, null, 'Must not recommend product');
  assert.ok(res.reply.toLowerCase().includes('diệp lục') || res.reply.toLowerCase().includes('quang phổ'), 'Must explain chlorophyll / light');
  assert.ok(!res.reply.includes('Bạn có nhu cầu mua hàng không'), 'No purchase probe');
});

await runAsyncTest('3.3 Problem Solving: Printer Paper Jam (Safe steps, 1 question max)', async () => {
  const res = await CentralBrainService.processChat({
    message: 'Tại sao máy in bị kẹt giấy?',
    conversationId: 'test_natural_suite_3',
    userContext: { role: 'guest' }
  });

  assert.strictEqual(res.revealCatalog, false, 'Must not reveal catalog');
  assert.strictEqual(res.recommendedProduct, null, 'Must not recommend product');
  assert.ok(res.reply.includes('khay') || res.reply.includes('cao su') || res.reply.includes('kẹt giấy'), 'Must address printer jam');
  
  // Count question marks to verify at most 1 clarification question
  const questionMarks = (res.reply.match(/\?/g) || []).length;
  assert.ok(questionMarks <= 1, `Must ask at most 1 question, found ${questionMarks}`);
});

await runAsyncTest('3.4 Problem Solving: Laptop overheating & sluggish', async () => {
  const res = await CentralBrainService.processChat({
    message: 'Tại sao laptop bị nóng và quạt kêu to?',
    conversationId: 'test_natural_suite_4',
    userContext: { role: 'guest' }
  });

  assert.strictEqual(res.revealCatalog, false, 'Must not reveal catalog');
  assert.strictEqual(res.recommendedProduct, null, 'Must not recommend product');
  assert.ok(res.reply.toLowerCase().includes('tản nhiệt') || res.reply.toLowerCase().includes('bụi') || res.reply.toLowerCase().includes('task manager'), 'Must provide technical troubleshooting');
  assert.ok(!res.reply.includes('Bạn có đang cần tư vấn sản phẩm'), 'No unsolicited product consultation');
});

await runAsyncTest('3.5 Casual Chat: Identity inquiry', async () => {
  const res = await CentralBrainService.processChat({
    message: 'Bạn là ai?',
    conversationId: 'test_natural_suite_5',
    userContext: { role: 'guest' }
  });

  assert.strictEqual(res.revealCatalog, false, 'Must not reveal catalog');
  assert.ok(res.reply.includes('TRÍ AI'), 'Must identify as TRÍ AI');
  assert.ok(!res.reply.includes('Bạn có nhu cầu mua hàng không'), 'No sales pitch');
});

await runAsyncTest('3.6 Casual Chat: Gratitude closing', async () => {
  const res = await CentralBrainService.processChat({
    message: 'Cảm ơn bạn nhiều nhé',
    conversationId: 'test_natural_suite_6',
    userContext: { role: 'guest' }
  });

  assert.strictEqual(res.revealCatalog, false, 'Must not reveal catalog');
  assert.ok(res.reply.toLowerCase().includes('không có chi') || res.reply.toLowerCase().includes('niềm vui') || res.reply.toLowerCase().includes('rất vui'), 'Warm response');
});

// -----------------------------------------------------------------------------
// 4. SMART SALES PRESERVATION TESTS
// -----------------------------------------------------------------------------
console.log('\n--- 4. Smart Sales Preservation ---');

await runAsyncTest('4.1 Quotation Request: Preserves full quotation engine & Column 2', async () => {
  const res = await CentralBrainService.processChat({
    message: 'Báo giá cho tôi máy in Brother HL-L6210DW',
    conversationId: 'test_natural_suite_sales_1',
    userContext: { role: 'guest' }
  });

  assert.strictEqual(res.revealCatalog, true, 'Quotation MUST reveal catalog / column 2');
  assert.ok(res.recommendedProduct, 'Quotation MUST recommend product');
  assert.ok(res.reply.includes('BẢNG BÁO GIÁ') || res.reply.includes('báo giá'), 'Quotation table generated');
});

await runAsyncTest('4.2 Budget-Based Shopping: Preserves sales engine', async () => {
  const res = await CentralBrainService.processChat({
    message: 'Tầm 15 triệu có laptop nào tốt?',
    conversationId: 'test_natural_suite_sales_2',
    userContext: { role: 'guest' }
  });

  assert.strictEqual(res.revealCatalog, true, 'Budget shopping MUST reveal catalog');
  assert.ok(res.toolsUsed.includes('consult_sales_engine'), 'Must use sales engine');
});

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n============================================================');
console.log(`🎯 RESULTS: ${passedTests}/${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log('============================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
} else {
  process.exit(0);
}
