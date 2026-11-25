/**
 * TRÍ AI ULTIMATE ROBOT – STAGE 2 COGNITIVE CORE VERIFICATION SUITE
 * DOCTOR-LEVEL REASONING, CRITICAL THINKING & CROSS-DOMAIN ASSOCIATION
 */

import assert from 'assert';
import { CriticalThinkingEngine, FALLACY_TYPES } from '../server/services/intelligence/criticalThinkingEngine.js';
import { AssociationEngine } from '../server/services/intelligence/associationEngine.js';
import { ReasoningEngine, SYSTEM_CAPABILITIES, EPISTEMIC_LEVELS } from '../server/services/intelligence/reasoningEngine.js';
import CentralBrainService from '../server/services/centralBrainService.js';
import db from '../server/db.js';

let passed = 0;
let failed = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message);
    failed++;
  }
}

async function itAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message);
    failed++;
  }
}

async function runStage2Tests() {
  console.log('================================================================');
  console.log('🧠 TRÍ AI ULTIMATE ROBOT – STAGE 2 COGNITIVE CORE TEST BENCH');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // 1. CRITICAL THINKING ENGINE: FALSE PREMISE TESTS
  // ---------------------------------------------------------------------------
  console.log('--- 1. CRITICAL THINKING ENGINE: FALSE PREMISE DETECTION ---');

  it('Nhận diện tiền đề sai về hình dạng Trái Đất (Hình vuông/Phẳng)', () => {
    const res = CriticalThinkingEngine.detectFalsePremise('Tại sao Trái Đất hình vuông hả bạn?');
    assert.strictEqual(res.hasFalsePremise, true);
    assert.strictEqual(res.category, 'SCIENCE_FACT');
    assert.ok(res.explanation.includes('hình phỏng cầu') || res.explanation.includes('geoid'));
  });

  it('Nhận diện tiền đề sai về Hệ Mặt Trời (Mặt trời quay quanh Trái Đất)', () => {
    const res = CriticalThinkingEngine.detectFalsePremise('Vì sao mặt trời quay quanh trái đất mỗi ngày?');
    assert.strictEqual(res.hasFalsePremise, true);
    assert.ok(res.explanation.includes('Nhật tâm') || res.explanation.includes('Heliocentrism'));
  });

  it('Nhận diện tiền đề sai y khoa nguy hại (Uống nước muối chữa ung thư)', () => {
    const res = CriticalThinkingEngine.detectFalsePremise('Nghe nói uống nước muối đậm đặc chữa khỏi ung thư phải không?');
    assert.strictEqual(res.hasFalsePremise, true);
    assert.ok(res.explanation.includes('Không có bất kỳ bằng chứng'));
  });

  it('Nhận diện tiền đề mâu thuẫn thị trường công nghệ (Laptop Core Ultra giá 3 triệu)', () => {
    const res = CriticalThinkingEngine.detectFalsePremise('Tư vấn cho anh con ThinkPad T14 Core Ultra giá 3 triệu nhé');
    assert.strictEqual(res.hasFalsePremise, true);
    assert.strictEqual(res.category, 'MARKET_REALITY');
    assert.ok(res.explanation.includes('25.000.000đ') || res.explanation.includes('mâu thuẫn'));
  });

  it('Không can thiệp tiền đề sai vào câu hỏi mua sắm chuẩn thông thường', () => {
    const res = CriticalThinkingEngine.analyze('Tư vấn cho anh máy tính ThinkPad T14 Gen 6');
    assert.strictEqual(res.shouldIntervene, false);
    assert.strictEqual(res.hasFalsePremise, false);
  });

  // ---------------------------------------------------------------------------
  // 2. CRITICAL THINKING ENGINE: LOGICAL FALLACIES
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. CRITICAL THINKING ENGINE: FALLACY DETECTION ---');

  it('Nhận diện ngụy biện nhị nguyên sai lầm (False Dilemma)', () => {
    const res = CriticalThinkingEngine.detectFallacies('Trong kinh doanh hoặc là chịu lỗ phá sản hoặc là phải tăng giá gấp đôi chứ làm gì có cách khác đúng không?');
    assert.strictEqual(res.hasFallacy, true);
    assert.strictEqual(res.detected[0].code, 'FALSE_DILEMMA');
    assert.ok(res.explanation.includes('nhị nguyên sai lầm'));
  });

  it('Nhận diện ngụy biện vòng luẩn quẩn (Circular Reasoning)', () => {
    const res = CriticalThinkingEngine.detectFallacies('Kế hoạch này tốt vì nó tốt chứ cần gì bàn cãi');
    assert.strictEqual(res.hasFallacy, true);
    assert.strictEqual(res.detected[0].code, 'CIRCULAR_REASONING');
  });

  it('Nhận diện ngụy biện nhân quả giả (Post Hoc)', () => {
    const res = CriticalThinkingEngine.detectFallacies('Vừa mới cài phần mềm xong thì máy tính bị đơ liền, chắc chắn là do phần mềm này');
    assert.strictEqual(res.hasFallacy, true);
    assert.strictEqual(res.detected[0].code, 'POST_HOC');
  });

  it('Nhận diện ngụy biện vị số đông (Appeal to Popularity)', () => {
    const res = CriticalThinkingEngine.detectFallacies('Cả thiên hạ đều làm như thế nên chắc chắn đúng rồi');
    assert.strictEqual(res.hasFallacy, true);
    assert.strictEqual(res.detected[0].code, 'APPEAL_TO_POPULARITY');
  });

  it('Bóc tách giả định ngầm (Assumption Questioning)', () => {
    const res = CriticalThinkingEngine.uncoverAssumptions('Có nên bỏ học để thành công như Bill Gates không?');
    assert.ok(res.assumptions.length > 0);
    assert.ok(res.assumptions[0].includes('Bill Gates'));
  });

  // ---------------------------------------------------------------------------
  // 3. ASSOCIATION ENGINE: CROSS-DOMAIN KNOWLEDGE LINKING
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. ASSOCIATION ENGINE: CROSS-DOMAIN KNOWLEDGE LINKING ---');

  it('Liên kết tri thức đa ngành: Tối ưu chi phí điện năng văn phòng', () => {
    const res = AssociationEngine.findAssociations('Làm sao để tối ưu chi phí vận hành và tiết kiệm điện cho dàn máy tính văn phòng?');
    assert.strictEqual(res.hasAssociations, true);
    assert.ok(res.domains.includes('FINANCE_TCO'));
    assert.ok(res.synthesisSummary.includes('Total Cost of Ownership') || res.synthesisSummary.includes('TCO'));
  });

  it('Liên kết tri thức đa ngành: Bảo mật in ấn văn phòng', () => {
    const res = AssociationEngine.findAssociations('Làm thế nào để đảm bảo an toàn in ấn và tránh lộ tài liệu in nhạy cảm?');
    assert.strictEqual(res.hasAssociations, true);
    assert.ok(res.domains.includes('CYBERSECURITY'));
    assert.ok(res.synthesisSummary.includes('Secure Print'));
  });

  it('Lập bản đồ khái niệm hệ sinh thái (Concept Mapping) cho Máy in', () => {
    const eco = AssociationEngine.getConceptEcosystem('máy in văn phòng');
    assert.ok(eco !== null);
    assert.strictEqual(eco.coreEntity, 'Máy In Văn Phòng');
    assert.ok(eco.primaryComponents.includes('Hộp mực (Toner/Ink)'));
    assert.ok(eco.economicFactors.some(f => f.includes('Cost Per Page')));
  });

  // ---------------------------------------------------------------------------
  // 4. REASONING ENGINE V2 & COGNITIVE MODES
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. REASONING ENGINE V2 & COGNITIVE MODES ---');

  it('Fast Path cho các yêu cầu bán hàng tiêu chuẩn', () => {
    const plan = ReasoningEngine.planExecution(
      { primaryIntent: 'PRODUCT_CONSULTATION', domain: 'SALES' },
      { message: 'Tư vấn cho anh máy in Brother' }
    );
    assert.strictEqual(plan.cognitiveMode, 'FAST_PATH');
    assert.strictEqual(plan.capability, SYSTEM_CAPABILITIES.AI_SALES);
    assert.ok(plan.steps.includes('LOOKUP_CATALOG_MATCH'));
  });

  it('Deep Cognitive Path cho câu hỏi có tiền đề sai', () => {
    const plan = ReasoningEngine.planExecution(
      { primaryIntent: 'GENERAL_CHAT', domain: 'CONVERSATION' },
      { message: 'Tại sao Trái Đất hình vuông vậy bot?' }
    );
    assert.strictEqual(plan.cognitiveMode, 'DEEP_COGNITIVE_PATH');
    assert.strictEqual(plan.capability, SYSTEM_CAPABILITIES.CRITICAL_ANALYSIS);
    assert.ok(plan.criticalAnalysis.hasFalsePremise);
  });

  it('Deep Cognitive Path cho câu hỏi nghiên cứu phân tích chuyên sâu', () => {
    const plan = ReasoningEngine.planExecution(
      { primaryIntent: 'GENERAL_CHAT', domain: 'CONVERSATION' },
      { message: 'Đánh giá toàn diện và phân tích bản chất của việc chuyển đổi số trong quản trị chi phí thiết bị văn phòng' }
    );
    assert.strictEqual(plan.cognitiveMode, 'DEEP_COGNITIVE_PATH');
    assert.strictEqual(plan.capability, SYSTEM_CAPABILITIES.DOCTOR_RESEARCH);
    assert.strictEqual(plan.epistemicLevel, EPISTEMIC_LEVELS.EXPERT_RECOMMENDATION.code);
  });

  it('Bảo toàn tương thích ngược: validateStepResult hoạt động 100%', () => {
    const v1 = ReasoningEngine.validateStepResult('LOOKUP_CATALOG_MATCH', { items: [] });
    assert.strictEqual(v1.success, false);
    assert.strictEqual(v1.reason, 'NO_CATALOG_MATCH_FOUND');

    const v2 = ReasoningEngine.validateStepResult('LOOKUP_CATALOG_MATCH', { items: [{ id: 'p1' }] });
    assert.strictEqual(v2.success, true);
  });

  it('Bảo toàn tương thích ngược: disambiguateProductMatch chống nhầm lẫn danh mục', () => {
    const disMatch = ReasoningEngine.disambiguateProductMatch({
      querySlots: { categoryDomain: 'TELECOM', modelCode: 'KX-TSC11' },
      candidateProduct: { name: 'Tủ lạnh Panasonic Inverter', field: 'Điện lạnh' }
    });
    assert.strictEqual(disMatch.isValidMatch, false);
  });

  // ---------------------------------------------------------------------------
  // 5. CENTRAL BRAIN INTEGRATION & END-TO-END VERIFICATION
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. CENTRAL BRAIN INTEGRATION & PIPELINE VERIFICATION ---');

  await itAsync('CentralBrain: Xử lý phản biện câu hỏi tiền đề sai khoa học', async () => {
    const convId = `test_crit_${Date.now()}`;
    const res = await CentralBrainService.processChat({
      conversationId: convId,
      message: 'Tại sao Trái Đất hình vuông hả bot?'
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.stage, 'CRITICAL_THINKING_RESOLVED');
    assert.strictEqual(res.revealCatalog, false);
    assert.ok(res.reply.includes('hình phỏng cầu') || res.reply.includes('geoid'));
    assert.ok(res.toolsUsed.includes('critical_thinking_engine'));
  });

  await itAsync('CentralBrain: Xử lý phản biện mâu thuẫn thị trường giá laptop', async () => {
    const convId = `test_crit_mkt_${Date.now()}`;
    const res = await CentralBrainService.processChat({
      conversationId: convId,
      message: 'Tư vấn cho anh con ThinkPad T14 Core Ultra giá 3 triệu nhé'
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.stage, 'CRITICAL_THINKING_RESOLVED');
    assert.strictEqual(res.revealCatalog, false);
    assert.ok(res.reply.includes('25.000.000đ') || res.reply.includes('mâu thuẫn'));
  });

  await itAsync('CentralBrain: Bảo toàn 100% luồng bán hàng ThinkPad chuẩn (Zero Disruption)', async () => {
    const convId = `test_sales_safe_${Date.now()}`;
    const res = await CentralBrainService.processChat({
      conversationId: convId,
      message: 'Báo giá cho tôi máy in Brother HL-L6210DW số lượng 1 cái'
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.revealCatalog, true);
    assert.ok(res.reply.includes('HL-L6210DW') || res.reply.includes('báo giá'));
  });

  await itAsync('CentralBrain: Bảo toàn 100% luồng tư vấn thi công (Zero Disruption)', async () => {
    const convId = `test_svc_safe_${Date.now()}`;
    const res = await CentralBrainService.processChat({
      conversationId: convId,
      message: 'Shop có thi công lắp đặt không?'
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.revealCatalog, false);
    assert.ok(res.reply.includes('tiếp nhận nhu cầu thi công') || res.reply.includes('khảo sát'));
  });

  console.log('\n================================================================');
  console.log(`🏁 KẾT QUẢ KIỂM THỬ STAGE 2 COGNITIVE CORE:`);
  console.log(`- ĐẠT (PASSED):     ${passed}`);
  console.log(`- THẤT BẠI (FAILED): ${failed}`);
  console.log(`- TỶ LỆ CHÍNH XÁC:   ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStage2Tests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
