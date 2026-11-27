/**
 * TRÍ AI ONE SUPER BRAIN - COMPREHENSIVE ACCEPTANCE TEST SUITE
 * 
 * Verifies all 10 Core Capabilities & Architecture Gates:
 *  1. CentralBrainOrchestrator 9-Stage Cognitive Pipeline
 *  2. UnifiedMemoryCore 6-Tier Memory & Truth Tagging
 *  3. CognitiveReasoningEngine: 5-Whys Root Cause Analysis
 *  4. CognitiveReasoningEngine: CapEx/OpEx Trade-Off & ROI Matrix
 *  5. CognitiveReasoningEngine: Bias & Fallacy Detection
 *  6. SelfVerificationQualityGate: Ground Truth & VAT 10%
 *  7. SalesIntelligenceEngine: 11-Step Consultative & LEAR Framework
 *  8. ModelGateway: Dynamic Multi-Tier Routing
 *  9. ToolGateway: Sandboxed Execution & SSRF Protection
 *  10. SecurityGovernanceGate: L1-L4 Authorization Matrix & Tier 3 Block
 */

import assert from 'assert';
import { CentralBrainOrchestrator } from '../server/services/centralBrainOrchestrator.js';
import { CentralBrainService } from '../server/services/centralBrainService.js';
import { UnifiedMemoryCore, TRUTH_TYPES } from '../server/services/intelligence/unifiedMemoryCore.js';
import { CognitiveReasoningEngine } from '../server/services/intelligence/cognitiveReasoningEngine.js';
import { SelfVerificationQualityGate } from '../server/services/intelligence/selfVerificationQualityGate.js';
import { SalesIntelligenceEngine } from '../server/services/intelligence/salesIntelligenceEngine.js';
import { ModelGateway, MODEL_TIERS } from '../server/services/gateway/modelGateway.js';
import { ToolGateway } from '../server/services/gateway/toolGateway.js';
import { PersonaLayer, PERSONAS } from '../server/services/intelligence/personaLayer.js';
import { SecurityGovernanceGate, AUTHORIZATION_LEVELS } from '../server/services/security/securityGovernanceGate.js';

let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}: ${err.message}`);
  }
}

async function runAsyncTest(name, fn) {
  total++;
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}: ${err.message}`);
  }
}

console.log('\n================================================================');
console.log('  TRÍ AI ONE SUPER BRAIN - COMPREHENSIVE ACCEPTANCE TEST SUITE');
console.log('================================================================\n');

// 1. CentralBrainOrchestrator 9-Stage Pipeline
await runAsyncTest('Test 1: CentralBrainOrchestrator 9-stage pipeline dispatches greeting', async () => {
  const res = await CentralBrainOrchestrator.runPipeline({ message: '' });
  assert(res !== null, 'Response should not be null');
  assert(res.reply.includes('TRÍ AI ONE SUPER BRAIN'), 'Should identify as TRÍ AI One Super Brain');
});

// 2. UnifiedMemoryCore Truth Tagging
await runAsyncTest('Test 2: UnifiedMemoryCore rememberFact with Truth Tagging and Contradiction detection', async () => {
  const fact1 = await UnifiedMemoryCore.rememberFact({
    subject: 'HQ_LOCATION',
    entityId: 'ent_nam_a_test',
    content: 'Trụ sở chính tại TP. Hồ Chí Minh',
    factType: TRUTH_TYPES.FACT,
    tenantId: 'tenant_test'
  });
  assert(fact1 && fact1.status === 'ACTIVE', 'Fact 1 should be active');

  // Update fact with new location -> triggers contradiction resolution
  const fact2 = await UnifiedMemoryCore.rememberFact({
    subject: 'HQ_LOCATION',
    entityId: 'ent_nam_a_test',
    content: 'Trụ sở mới tại Hà Nội',
    factType: TRUTH_TYPES.FACT,
    tenantId: 'tenant_test'
  });
  assert(fact2 && fact2.status === 'ACTIVE', 'Fact 2 should supersede and be active');
});

// 3. CognitiveReasoningEngine: 5-Whys Analysis
runTest('Test 3: CognitiveReasoningEngine 5-Whys Root Cause Analysis', () => {
  const res = CognitiveReasoningEngine.analyzeRootCause('Máy in văn phòng hay bị kẹt giấy');
  assert(res.steps.length === 5, 'Must contain exactly 5-Whys steps');
  assert(res.rootCause.length > 10, 'Root cause must be identified');
  assert(res.strategicSolution.length > 10, 'Strategic solution must be generated');
});

// 4. CognitiveReasoningEngine: CapEx/OpEx Trade-Off Matrix
runTest('Test 4: CognitiveReasoningEngine CapEx/OpEx Trade-Off & ROI Matrix', () => {
  const tradeOff = CognitiveReasoningEngine.evaluateTradeOffs({
    optionA: { name: 'Máy in phun giá rẻ', capEx: 2500000, monthlyOpEx: 1200000 },
    optionB: { name: 'Máy in laser chuyên nghiệp', capEx: 7500000, monthlyOpEx: 400000 },
    horizonMonths: 12
  });
  assert(tradeOff.matrix.length >= 4, 'Should contain at least 4 criteria');
  assert(tradeOff.breakEvenMonth !== null, 'Should calculate break-even month');
  assert(tradeOff.recommendation.includes('tối ưu hơn về mặt kinh tế'), 'Recommendation should explain economic benefit');
});

// 5. CognitiveReasoningEngine: Bias & Fallacy Detection
runTest('Test 5: CognitiveReasoningEngine Sunk Cost Fallacy Detection', () => {
  const res = CognitiveReasoningEngine.detectBiasesAndFallacies('Tôi đã sửa mất 10 triệu cho cái máy này rồi, giờ phải sửa tiếp');
  assert(res.detected === true, 'Should detect fallacy');
  assert(res.fallacies[0].type === 'SUNK_COST_FALLACY', 'Should identify SUNK_COST_FALLACY');
  assert(res.fallacies[0].constructiveReframe.length > 20, 'Should provide constructive reframe');
});

// 6. SelfVerificationQualityGate: VAT 10% & Price Grounding
await runAsyncTest('Test 6: SelfVerificationQualityGate verifies VAT 10% and product grounding', async () => {
  const draftQuote = `Bảng báo giá máy in: Tạm tính: 5.000.000 đ. Thuế VAT 10%: 500.000 đ. Tổng thanh toán: 5.500.000 đ.`;
  const verification = await SelfVerificationQualityGate.verifyResponse({
    draftReply: draftQuote,
    activeProduct: { id: 'p_test', name: 'Canon LBP 2900', price: 5000000 }
  });
  assert(verification.isApproved === true, 'Should approve valid quotation');
  assert(verification.confidenceGrade === 'A', 'Should award Grade A');
  assert(verification.factTags.some(t => t.tag === 'VAT_10_VERIFIED'), 'Must verify VAT 10%');
});

// 7. SalesIntelligenceEngine: LEAR Objection Handling
runTest('Test 7: SalesIntelligenceEngine LEAR Objection Handling', () => {
  const objection = SalesIntelligenceEngine.handleLearObjection({
    type: 'PRICE_OBJECTION',
    message: 'Giá con này 6.5 triệu đắt hơn chỗ khác 500k',
    product: { name: 'Canon LBP 2900', price: 6500000 }
  });
  assert(objection.framework === 'LEAR', 'Should use LEAR framework');
  assert(objection.replyText.includes('thuế VAT 10%'), 'Should address VAT 10% in justification');
  assert(objection.replyText.includes('(Listen)'), 'Should follow Listen step');
  assert(objection.replyText.includes('(Reframe)'), 'Should follow Reframe step');
});

// 8. ModelGateway: Dynamic Multi-Tier Routing
await runAsyncTest('Test 8: ModelGateway routes tasks dynamically', async () => {
  const localRes = await ModelGateway.execute({ taskType: 'COMMAND' });
  assert(localRes.tierUsed === MODEL_TIERS.TIER_LOCAL, 'Should select local tier for commands');
});

// 9. ToolGateway: Sandboxed Execution & SSRF Block
await runAsyncTest('Test 9: ToolGateway blocks SSRF internal requests', async () => {
  const ssrfRes = await ToolGateway.executeTool('search_web_internet', { query: 'http://127.0.0.1:8080/admin' });
  assert(ssrfRes.success === false, 'Should block SSRF');
  assert(ssrfRes.error.includes('SSRF'), 'Error should cite SSRF restriction');
});

// 10. SecurityGovernanceGate: L1-L4 Matrix & Tier 3 Block
runTest('Test 10: SecurityGovernanceGate blocks L4 financial operations and permits L1/L2', () => {
  const l4Check = SecurityGovernanceGate.evaluateAuthorization({ message: 'Chuyển 50 triệu thanh toán nhà cung cấp' });
  assert(l4Check.allowed === false, 'L4 financial transfer must be blocked');
  assert(l4Check.level === AUTHORIZATION_LEVELS.L4_IRREVERSIBLE, 'Should classify as L4');

  const l2Check = SecurityGovernanceGate.evaluateAuthorization({ message: 'Nhắc tôi họp lúc 9h sáng mai' });
  assert(l2Check.allowed === true, 'L2 personal task should be allowed');
  assert(l2Check.level === AUTHORIZATION_LEVELS.L2_PERSONAL, 'Should classify as L2');
});

// 11. PersonaLayer: Dynamic Resolution
runTest('Test 11: PersonaLayer dynamic resolution for all 5 personas', () => {
  assert(PersonaLayer.resolvePersona({ message: 'Tôi muốn mua máy in' }) === PERSONAS.SALES, 'Should resolve to SALES');
  assert(PersonaLayer.resolvePersona({ message: 'Nhắc tôi mai 8h đi gặp đối tác' }) === PERSONAS.SECRETARY, 'Should resolve to SECRETARY');
  assert(PersonaLayer.resolvePersona({ message: 'Giải thích nguyên lý cảm biến quang học' }) === PERSONAS.TUTOR, 'Should resolve to TUTOR');
  assert(PersonaLayer.resolvePersona({ message: 'Phân tích ma trận CapEx OpEx và dòng tiền TCO' }) === PERSONAS.EXPERT, 'Should resolve to EXPERT');
  assert(PersonaLayer.resolvePersona({ message: 'Hôm nay trời đẹp quá anh nhỉ' }) === PERSONAS.ANH, 'Should resolve to ANH');
});

// 12. CentralBrainService Integrated Pipeline
await runAsyncTest('Test 12: CentralBrainService processChat runs end-to-end through CentralBrainOrchestrator', async () => {
  const res = await CentralBrainService.processChat({
    message: 'Máy in Canon 2900 giá thế nào em?',
    conversationId: 'conv_one_super_brain_test'
  });
  assert(res && res.reply, 'Should return a valid response');
  assert(res.reply.length > 20, 'Reply should be substantial');
});

console.log(`\n================================================================`);
console.log(`  RESULT: ${passed}/${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
console.log(`================================================================\n`);

if (passed !== total) {
  process.exit(1);
}
