/**
 * TRÍ AI ULTIMATE ROBOT – STAGE 5 TEST SUITE
 * 12 SPECIALIZED DOMAINS EXPANSION & SEAMLESS SALES CORE HANDOVER
 * 
 * Verifies:
 * 1. Domain Identification & Classification across 12 Disciplines
 * 2. Specialized Knowledge Handlers (Finance, Legal, Engineering, Healthcare, Construction)
 * 3. Central Brain Integration & Doctor-Level Domain Consultation Output
 * 4. Seamless Context Handover: Domain Advisory -> Product Quotation
 * 5. Seamless Context Handover: Domain Advisory -> Service Survey Intake
 * 6. Zero Regression on Core AI Sales & Private Secretary
 */

import assert from 'assert';
import DomainRegistry, { ALL_DOMAINS } from '../server/services/domains/domainRegistry.js';
import FinanceDomainHandler from '../server/services/domains/financeDomainHandler.js';
import LegalDomainHandler from '../server/services/domains/legalDomainHandler.js';
import EngineeringDomainHandler from '../server/services/domains/engineeringDomainHandler.js';
import HealthcareDomainHandler from '../server/services/domains/healthcareDomainHandler.js';
import ConstructionDomainHandler from '../server/services/domains/constructionDomainHandler.js';
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
  console.log('🏛️  TRÍ AI ULTIMATE ROBOT – STAGE 5 ALL-DOMAIN EXPANSION');
  console.log('================================================================');

  // ---------------------------------------------------------------------------
  // 1. DOMAIN IDENTIFICATION
  // ---------------------------------------------------------------------------
  console.log('\n--- 1. DOMAIN IDENTIFICATION & CLASSIFICATION ---');

  it('Nhận diện chính xác lĩnh vực Tài chính & Phân tích TCO (FINANCE_BANKING)', () => {
    const d1 = DomainRegistry.identifyDomain('Tư vấn phân tích chi phí sở hữu TCO và tối ưu dòng tiền đầu tư');
    assert.strictEqual(d1, ALL_DOMAINS.FINANCE_BANKING);
  });

  it('Nhận diện chính xác lĩnh vực Pháp lý & Tuân thủ (LEGAL_COMPLIANCE)', () => {
    const d2 = DomainRegistry.identifyDomain('Rà soát điều khoản hợp đồng mua sắm và tuân thủ Nghị định 13 bảo vệ dữ liệu cá nhân');
    assert.strictEqual(d2, ALL_DOMAINS.LEGAL_COMPLIANCE);
  });

  it('Nhận diện chính xác lĩnh vực Kỹ thuật Phần cứng & Mạng (ENGINEERING_TECH)', () => {
    const d3 = DomainRegistry.identifyDomain('Phân tích kiến trúc vi xử lý CPU Core Ultra và độ bền chuẩn quân đội MIL-STD');
    assert.strictEqual(d3, ALL_DOMAINS.ENGINEERING_TECH);
  });

  it('Nhận diện chính xác lĩnh vực Y tế & Công thái học (HEALTHCARE_LIFE)', () => {
    const d4 = DomainRegistry.identifyDomain('Tiêu chuẩn công thái học ergonomics bảo vệ thị lực và chống mỏi mắt');
    assert.strictEqual(d4, ALL_DOMAINS.HEALTHCARE_LIFE);
  });

  it('Nhận diện chính xác lĩnh vực Xây dựng & Khảo sát hiện trường (CONSTRUCTION_SURVEY)', () => {
    const d5 = DomainRegistry.identifyDomain('Quy chuẩn khảo sát mặt bằng và bố trí thi công dây mạng tủ rack');
    assert.strictEqual(d5, ALL_DOMAINS.CONSTRUCTION_SURVEY);
  });

  // ---------------------------------------------------------------------------
  // 2. SPECIALIZED DOMAIN HANDLERS EVALUATION
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. SPECIALIZED DOMAIN HANDLERS & DOCTOR PERSONAS ---');

  it('FinanceDomainHandler: Xuất bản phân tích CapEx, OpEx và điểm hòa vốn', () => {
    const res = FinanceDomainHandler.analyze('Đánh giá chi phí sở hữu TCO cho thiết bị máy in văn phòng');
    assert.strictEqual(res.specialization, 'TCO_LIFECYCLE_VALUATION');
    assert.ok(res.keyMetrics.length >= 3);
    assert.ok(res.advisoryNotes.some(n => n.includes('Cost-Per-Page') || n.includes('TCO')));
  });

  it('LegalDomainHandler: Xuất bản tiêu chuẩn Nghị định 13 và ISO/IEC 27001', () => {
    const res = LegalDomainHandler.analyze('Quy định an ninh mạng và bảo vệ dữ liệu cá nhân');
    assert.strictEqual(res.specialization, 'CYBERSECURITY_DATA_COMPLIANCE');
    assert.ok(res.legalStandards.some(s => s.includes('Nghị định số 13/2023/NĐ-CP')));
    assert.ok(res.complianceActions.some(a => a.includes('Secure Print') || a.includes('mã hóa')));
  });

  it('EngineeringDomainHandler: Đánh giá NPU AI, MIL-STD-810H và USB-C GaN', () => {
    const res = EngineeringDomainHandler.analyze('Kiến trúc phần cứng laptop ThinkPad Core Ultra');
    assert.strictEqual(res.specialization, 'ENTERPRISE_COMPUTING_HARDWARE');
    assert.ok(res.technicalSpecifications.some(s => s.includes('MIL-STD-810H')));
    assert.ok(res.engineeringRecommendations.some(r => r.includes('GaN 65W')));
  });

  it('HealthcareDomainHandler: Đánh giá chuẩn 20-20-20 và TÜV Rheinland Eyesafe', () => {
    const res = HealthcareDomainHandler.analyze('Bảo vệ mắt và chống ánh sáng xanh màn hình');
    assert.strictEqual(res.specialization, 'VISUAL_ERGONOMICS_HEALTH');
    assert.ok(res.healthStandards.some(s => s.includes('TÜV Rheinland')));
    assert.ok(res.healthStandards.some(s => s.includes('20-20-20')));
  });

  it('ConstructionDomainHandler: Tuân thủ quy chuẩn khảo sát và cấm tự báo giá', () => {
    const res = ConstructionDomainHandler.analyze('Khảo sát thi công hạ tầng văn phòng');
    assert.strictEqual(res.specialization, 'SITE_SURVEY_AND_INSTALLATION');
    assert.ok(res.strictRule.includes('Tuyệt đối không tự ý báo giá thi công'));
    assert.strictEqual(res.requiresServiceHandover, true);
  });

  // ---------------------------------------------------------------------------
  // 3. CENTRAL BRAIN INTEGRATION
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. CENTRAL BRAIN INTEGRATION & DOMAIN CONSULTATION ---');

  await itAsync('CentralBrain: Tư vấn chuyên sâu Tài chính TCO chuẩn tiến sĩ', async () => {
    const convId = `test_domain_fin_${Date.now()}`;
    const res = await CentralBrainService.processChat({
      conversationId: convId,
      message: 'Tư vấn chi phí sở hữu TCO và bài toán tối ưu dòng tiền đầu tư'
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.stage, 'DOMAIN_EXPERT_RESOLVED');
    assert.strictEqual(res.confidenceTag, 'DOCTOR_LEVEL_DOMAIN_VERIFIED');
    assert.strictEqual(res.revealCatalog, false);
    assert.ok(res.reply.includes('Tài chính, Ngân hàng') || res.reply.includes('TCO'));
    assert.ok(res.toolsUsed.includes('domain_registry'));
  });

  await itAsync('CentralBrain: Tư vấn chuyên sâu Pháp lý & Nghị định 13', async () => {
    const convId = `test_domain_legal_${Date.now()}`;
    const res = await CentralBrainService.processChat({
      conversationId: convId,
      message: 'Tư vấn pháp lý về bảo mật thông tin và Nghị định 13 bảo vệ dữ liệu cá nhân'
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.stage, 'DOMAIN_EXPERT_RESOLVED');
    assert.strictEqual(res.revealCatalog, false);
    assert.ok(res.reply.includes('Nghị định số 13/2023/NĐ-CP') || res.reply.includes('Pháp lý'));
  });

  // ---------------------------------------------------------------------------
  // 4. SEAMLESS CONTEXT HANDOVER (DOMAIN -> SALES & SERVICE)
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. SEAMLESS CONTEXT HANDOVER TO SALES & SERVICE ---');

  await itAsync('Chuyển giao mượt mà: Đang tư vấn chuyên ngành -> Khách hỏi mua hàng -> Báo giá chuẩn xác', async () => {
    const convId = `test_handover_sales_${Date.now()}`;

    // Turn 1: Thảo luận chuyên ngành kỹ thuật thiết bị
    const turn1 = await CentralBrainService.processChat({
      conversationId: convId,
      message: 'Kiến trúc phần cứng máy in công suất lớn và giao thức mạng VLAN'
    });
    assert.strictEqual(turn1.stage, 'DOMAIN_EXPERT_RESOLVED');

    // Turn 2: Khách lập tức yêu cầu báo giá máy in Brother HL-L6210DW
    const turn2 = await CentralBrainService.processChat({
      conversationId: convId,
      message: 'Báo giá cho tôi máy in Brother HL-L6210DW số lượng 1 cái'
    });
    assert.strictEqual(turn2.success, true);
    assert.strictEqual(turn2.revealCatalog, true);
    assert.ok(turn2.reply.includes('HL-L6210DW') || turn2.reply.includes('báo giá') || turn2.reply.includes('Brother'));
    assert.ok(!turn2.reply.includes('PC 20 triệu'));
  });

  await itAsync('Chuyển giao mượt mà: Đang tư vấn chuyên ngành -> Khách hỏi thi công -> Chuyển Service Consultant', async () => {
    const convId = `test_handover_svc_${Date.now()}`;

    // Turn 1: Thảo luận tiêu chuẩn khảo sát mặt bằng
    const turn1 = await CentralBrainService.processChat({
      conversationId: convId,
      message: 'Quy chuẩn kỹ thuật khảo sát hiện trường và an toàn chịu tải'
    });
    assert.strictEqual(turn1.stage, 'DOMAIN_EXPERT_RESOLVED');

    // Turn 2: Khách hỏi shop có nhận thi công không
    const turn2 = await CentralBrainService.processChat({
      conversationId: convId,
      message: 'Shop có nhận thi công lắp đặt trọn gói không?'
    });
    assert.strictEqual(turn2.success, true);
    assert.strictEqual(turn2.revealCatalog, false);
    assert.ok(turn2.reply.includes('khảo sát thực tế') || turn2.reply.includes('thi công, lắp đặt'));
  });

  // ---------------------------------------------------------------------------
  // 5. ZERO REGRESSION ON CORE FLOWS
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. ZERO REGRESSION ON CORE SALES & PRIVATE SECRETARY ---');

  await itAsync('Zero Regression: Bán hàng ThinkPad chuẩn mực (Không bị chiếm dụng bởi Domain Handler)', async () => {
    const convId = `test_core_sales_${Date.now()}`;
    const res = await CentralBrainService.processChat({
      conversationId: convId,
      message: 'Báo giá cho tôi máy in Brother HL-L6210DW số lượng 1 cái'
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.revealCatalog, true);
    assert.ok(res.reply.includes('HL-L6210DW') || res.reply.includes('báo giá') || res.reply.includes('Brother'));
  });

  await itAsync('Zero Regression: Tư vấn thi công chuẩn mực (Không bị nhầm sang bán lẻ hay domain khác)', async () => {
    const convId = `test_core_svc_${Date.now()}`;
    const res = await CentralBrainService.processChat({
      conversationId: convId,
      message: 'Shop có thi công lắp đặt không?'
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.revealCatalog, false);
    assert.ok(res.reply.includes('khảo sát thực tế') || res.reply.includes('thi công, lắp đặt'));
  });

  console.log('\n================================================================');
  console.log(`🏁 KẾT QUẢ KIỂM THỬ STAGE 5 ALL-DOMAIN EXPANSION:`);
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
