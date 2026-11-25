/**
 * TRÍ AI ULTIMATE ROBOT – STAGE 4 TEST SUITE
 * DOCTOR-LEVEL DEEP RESEARCH, DYNAMIC DAG PLANNING & METACOGNITION
 * 
 * Verifies:
 * 1. Hypothesis Tree Decomposition (Phân rã cây giả thuyết & biến số đo lường)
 * 2. 5-Level Epistemic Classification (Axiomatic, Empirical, Probabilistic, Heuristic, Hypothetical)
 * 3. Epistemic Humility & Knowledge Gap Identification (Khiêm tốn tri thức & Nhận diện khoảng trống dữ liệu)
 * 4. Dynamic DAG Planning & Adaptive Replanning (Tự sửa chữa kế hoạch khi gặp sự cố)
 * 5. Dialectical Scholarly Synthesis (Luận đề - Phản đề - Hợp đề & Báo cáo học thuật)
 * 6. Central Brain Integration (Xử lý truy vấn nghiên cứu chuyên sâu cấp tiến sĩ)
 * 7. Zero Regression (Bảo toàn 100% Sales Engine ThinkPad & Dịch vụ khảo sát thi công)
 */

import assert from 'assert';
import DeepResearchEngine from '../server/services/intelligence/deepResearchEngine.js';
import MetacognitionEngine, { EPISTEMIC_LEVELS } from '../server/services/intelligence/metacognitionEngine.js';
import PlanningEngine from '../server/services/intelligence/planningEngine.js';
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
    console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
    failed++;
  }
}

async function itAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
    failed++;
  }
}

async function runSuite() {
  console.log('================================================================');
  console.log('🔬 TRÍ AI ULTIMATE ROBOT – STAGE 4 DEEP RESEARCH & DAG PLANNING');
  console.log('================================================================');

  // ---------------------------------------------------------------------------
  // 1. HYPOTHESIS TREE DECOMPOSITION
  // ---------------------------------------------------------------------------
  console.log('\n--- 1. HYPOTHESIS TREE DECOMPOSITION & VARIABLES ---');

  it('Phân rã chủ đề phức tạp thành Cây giả thuyết và Ma trận biến số', () => {
    const topic = 'Đánh giá tối ưu hóa tổng chi phí sở hữu TCO cho giải pháp máy in doanh nghiệp';
    const tree = DeepResearchEngine.decomposeResearchTopic(topic);

    assert.ok(tree.researchId);
    assert.strictEqual(tree.coreProblem, topic);
    assert.ok(tree.hypotheses.length >= 2, 'Must generate at least 2 hypotheses');
    assert.ok(tree.hypotheses[0].statement.length > 20);
    assert.ok(tree.hypotheses[0].testMethod.length > 10);
    assert.strictEqual(tree.perspectives.length, 4, 'Must encompass 4 multidisciplinary perspectives');
    assert.ok(tree.keyVariables.length >= 4, 'Must identify at least 4 quantitative/qualitative variables');
  });

  // ---------------------------------------------------------------------------
  // 2. 5-LEVEL EPISTEMIC CLASSIFICATION
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. 5-LEVEL EPISTEMIC CLASSIFICATION & EVALUATION ---');

  it('Nhận diện chân lý tiên đề AXIOMATIC (Định luật vật lý & Toán học)', () => {
    const res = MetacognitionEngine.evaluateEpistemicStatus('Định luật vạn vật hấp dẫn và bảo toàn năng lượng');
    assert.strictEqual(res.level, EPISTEMIC_LEVELS.AXIOMATIC);
    assert.ok(res.confidenceScore >= 0.95);
  });

  it('Nhận diện chân lý thực nghiệm EMPIRICAL_PROVEN (Tiêu chuẩn ISO/TCVN/Datasheet)', () => {
    const res = MetacognitionEngine.evaluateEpistemicStatus('Đạt tiêu chuẩn ISO 27001 và datasheet thông số nhà sản xuất', [
      { type: 'CATALOG' }, { type: 'OFFICIAL_DOC' }
    ]);
    assert.strictEqual(res.level, EPISTEMIC_LEVELS.EMPIRICAL_PROVEN);
    assert.ok(res.confidenceScore >= 0.85);
  });

  it('Nhận diện chân lý xác suất PROBABILISTIC (Dự báo xu hướng & Thống kê kinh tế)', () => {
    const res = MetacognitionEngine.evaluateEpistemicStatus('Dự báo xu hướng thị trường và xác suất tối ưu chi phí vận hành');
    assert.strictEqual(res.level, EPISTEMIC_LEVELS.PROBABILISTIC);
    assert.ok(res.confidenceScore >= 0.70 && res.confidenceScore <= 0.84);
  });

  it('Nhận diện phỏng đoán kinh nghiệm HEURISTIC (Quy tắc ngón tay cái)', () => {
    const res = MetacognitionEngine.evaluateEpistemicStatus('Kinh nghiệm thông thường khi thay thế linh kiện văn phòng');
    assert.strictEqual(res.level, EPISTEMIC_LEVELS.HEURISTIC);
    assert.ok(res.confidenceScore >= 0.40 && res.confidenceScore <= 0.65);
  });

  // ---------------------------------------------------------------------------
  // 3. EPISTEMIC HUMILITY & KNOWLEDGE GAPS
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. EPISTEMIC HUMILITY & KNOWLEDGE GAPS ---');

  it('Tự nhận diện khoảng trống tri thức (Knowledge Gaps) khi thiếu dữ liệu tài chính/thực địa', () => {
    const query = 'Nghiên cứu phương án đầu tư hạ tầng mạng và chi phí bảo mật 5 năm';
    const gaps = MetacognitionEngine.identifyKnowledgeGaps(query, {});

    assert.ok(gaps.length >= 2, 'Should identify financial & security gaps');
    assert.ok(gaps.some(g => g.domain === 'FINANCIAL_METRICS'));
    assert.ok(gaps.some(g => g.domain === 'SECURITY_COMPLIANCE'));

    const disclaimer = MetacognitionEngine.generateEpistemicDisclaimer(gaps, 0.75);
    assert.ok(disclaimer.includes('Ghi chú Siêu nhận thức & Khiêm tốn Tri thức'));
    assert.ok(disclaimer.includes('FINANCIAL_METRICS'));
  });

  // ---------------------------------------------------------------------------
  // 4. DYNAMIC DAG PLANNING & ADAPTIVE REPLANNING (SELF-HEALING)
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. DYNAMIC DAG PLANNING & ADAPTIVE REPLANNING ---');

  it('Khởi tạo đồ thị thực thi động Dynamic DAG với quan hệ phụ thuộc có điều kiện', () => {
    const dag = PlanningEngine.createDynamicDagPlan('Khảo sát thị trường thiết bị in ấn doanh nghiệp');
    assert.ok(dag.dagId);
    assert.strictEqual(dag.nodes.length, 5);

    // Verify node 2 has contingency fallback
    const gatherNode = dag.nodes.find(n => n.id === 'node_2_gather');
    assert.strictEqual(gatherNode.canFallback, true);
    assert.strictEqual(gatherNode.fallbackNodeId, 'node_2_fallback');

    // Verify downstream node depends on node_2_gather
    const synthNode = dag.nodes.find(n => n.id === 'node_3_synthesize');
    assert.ok(synthNode.dependsOn.includes('node_2_gather'));
  });

  it('Tự sửa kế hoạch (Adaptive Replanning) khi bước chính gặp sự cố', () => {
    const dag = PlanningEngine.createDynamicDagPlan('Nghiên cứu công nghệ laptop doanh nghiệp');
    const repairedDag = PlanningEngine.replanOnFailure(dag, 'node_2_gather', 'External Search API timeout');

    assert.strictEqual(repairedDag.isHealed, true);
    assert.strictEqual(repairedDag.status, 'HEALED_AND_REROUTED');

    const failedNode = repairedDag.nodes.find(n => n.id === 'node_2_gather');
    assert.strictEqual(failedNode.status, 'FAILED');

    const fallbackNode = repairedDag.nodes.find(n => n.id === 'node_2_fallback');
    assert.strictEqual(fallbackNode.status, 'IN_PROGRESS');

    // Downstream node must now depend on fallback node instead of failed node
    const synthNode = repairedDag.nodes.find(n => n.id === 'node_3_synthesize');
    assert.ok(synthNode.dependsOn.includes('node_2_fallback'));
    assert.ok(!synthNode.dependsOn.includes('node_2_gather'));
    assert.strictEqual(repairedDag.executionHistory.length, 1);
  });

  // ---------------------------------------------------------------------------
  // 5. DIALECTICAL SCHOLARLY SYNTHESIS
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. DIALECTICAL SCHOLARLY SYNTHESIS ---');

  await itAsync('Tổng hợp luận đề - phản đề - hợp đề và lập báo cáo nghiên cứu hoàn chỉnh', async () => {
    const report = await DeepResearchEngine.synthesizeDialecticalReport(
      'Đánh giá hiệu năng và chi phí vòng đời của laptop ThinkPad T14 trong khối doanh nghiệp',
      { orgId: 'org_default' }
    );

    assert.strictEqual(report.success, true);
    assert.ok(report.reportText.includes('BÁO CÁO NGHIÊN CỨU & PHÂN TÍCH CHUYÊN SÂU'));
    assert.ok(report.reportText.includes('TÓM TẮT ĐIỀU HÀNH'));
    assert.ok(report.reportText.includes('Luận Đề Thuận (Thesis'));
    assert.ok(report.reportText.includes('Phản Đề & Cảnh Báo Rủi Ro (Antithesis'));
    assert.ok(report.reportText.includes('Hợp Đề & Ma Trận Quyết Định (Synthesis'));
    assert.ok(report.reportText.includes('TRÍCH DẪN & TÀI LIỆU THAM CHIẾU'));
    assert.ok(report.toolsUsed.includes('deep_research_engine'));
    assert.ok(report.confidenceScore >= 0.60);
  });

  // ---------------------------------------------------------------------------
  // 6. CENTRAL BRAIN INTEGRATION & DIALECTICAL CHAT
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. CENTRAL BRAIN INTEGRATION & ACADEMIC INQUIRY ---');

  await itAsync('CentralBrain: Xử lý yêu cầu nghiên cứu chuyên sâu cấp tiến sĩ', async () => {
    const res = await CentralBrainService.processChat({
      conversationId: `test_doc_research_${Date.now()}`,
      message: 'Phân tích và nghiên cứu toàn diện hiệu quả đầu tư giải pháp in ấn tập trung cho doanh nghiệp'
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.stage, 'DOCTOR_RESEARCH_RESOLVED');
    assert.strictEqual(res.confidenceTag, 'DOCTOR_LEVEL_SYNTHESIZED');
    assert.strictEqual(res.revealCatalog, false);
    assert.ok(res.reply.includes('BÁO CÁO NGHIÊN CỨU & PHÂN TÍCH CHUYÊN SÂU') || res.reply.includes('TÓM TẮT ĐIỀU HÀNH'));
    assert.ok(res.toolsUsed.includes('deep_research_engine'));
  });

  // ---------------------------------------------------------------------------
  // 7. ZERO REGRESSION GUARANTEES
  // ---------------------------------------------------------------------------
  console.log('\n--- 7. ZERO REGRESSION ON SALES & SERVICE ---');

  await itAsync('CentralBrain: Bảo toàn 100% luồng bán hàng ThinkPad chuẩn (Zero Disruption)', async () => {
    const res = await CentralBrainService.processChat({
      conversationId: `test_sales_guard_${Date.now()}`,
      message: 'Báo giá cho tôi máy in Brother HL-L6210DW số lượng 1 cái'
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.revealCatalog, true);
    assert.ok(res.reply.includes('HL-L6210DW') || res.reply.includes('báo giá') || res.reply.includes('Brother'));
    assert.ok(!res.reply.includes('PC 20 triệu'));
  });

  await itAsync('CentralBrain: Bảo toàn 100% luồng tư vấn thi công (Zero Disruption)', async () => {
    const res = await CentralBrainService.processChat({
      conversationId: `test_service_guard_${Date.now()}`,
      message: 'Shop có nhận thi công lắp đặt trọn gói không?'
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.revealCatalog, false);
    assert.ok(res.reply.includes('khảo sát thực tế') || res.reply.includes('thi công, lắp đặt'));
  });

  console.log('\n================================================================');
  console.log(`🏁 KẾT QUẢ KIỂM THỬ STAGE 4 DEEP RESEARCH & DAG PLANNING:`);
  console.log(`- ĐẠT (PASSED):     ${passed}`);
  console.log(`- THẤT BẠI (FAILED): ${failed}`);
  console.log(`- TỶ LỆ CHÍNH XÁC:   ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runSuite().catch(err => {
  console.error('Test Suite encountered fatal error:', err);
  process.exit(1);
});
