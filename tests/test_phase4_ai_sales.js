/**
 * TEST SUITE: PHASE 4 - FORTIFY AI SALES CAPABILITY (BOTCHAT BRAIN 2.1)
 * 
 * Verifies:
 * 1. AI Sales Consultation & Formal Quotation generation
 * 2. Strict isolation: Sales Engine NEVER activated for non-sales requests
 * 3. Anti-Confusion protection (Telecom vs Home Appliance)
 * 4. Composite Request Handling (MIXED_SALES_SECRETARY)
 */

import { CentralBrainService } from '../server/services/centralBrainService.js';
import { ReasoningEngine } from '../server/services/intelligence/reasoningEngine.js';
import { IntentEngine } from '../server/services/intelligence/intentEngine.js';

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
console.log('🚀 KIỂM THỬ GIAI ĐOẠN 4: FORTIFY AI SALES CAPABILITY');
console.log('================================================================\n');

async function runTests() {
  // -------------------------------------------------------------
  // Group 1: Sales Flow & Formal Quotation
  // -------------------------------------------------------------
  console.log('--- 1. Kiểm tra Báo Giá & Tư Vấn Bán Hàng ---');

  const resQuote = await CentralBrainService.processChat({
    message: 'Báo giá cho tôi máy in Brother HL-L6210DW số lượng 2 cái',
    conversationId: 'conv_sales_01'
  });
  assert(resQuote.success === true, 'Quotation request returned success');
  assert(resQuote.reply.includes('BÁO GIÁ') || resQuote.reply.includes('Brother') || resQuote.reply.includes('HL-L6210DW'), 'Quotation response contains product & pricing details');

  // -------------------------------------------------------------
  // Group 2: Non-Sales Query NEVER Triggers Sales Engine
  // -------------------------------------------------------------
  console.log('\n--- 2. Kiểm tra Tuyệt Đối Không Kích Hoạt Bán Hàng Khi Phi Bán Hàng ---');

  const resNonSales = await CentralBrainService.processChat({
    message: 'Cần hẹn anh Trí đi nhậu, lịch ngày nào rảnh?',
    conversationId: 'conv_sales_02'
  });
  assert(resNonSales.success === true, 'Appointment inquiry returned success');
  assert(!resNonSales.reply.includes('Bên em chuyên cung cấp các sản phẩm'), 'Bug root cause ELIMINATED: No generic store sales intro');
  assert(!resNonSales.reply.includes('BÁO GIÁ'), 'No quotation triggered for appointment');
  assert(resNonSales.revealCatalog === false, 'Catalog is kept closed for appointment');

  // -------------------------------------------------------------
  // Group 3: Anti-Confusion Protection
  // -------------------------------------------------------------
  console.log('\n--- 3. Kiểm tra Chống Nhầm Lẫn Danh Mục (Anti-Confusion) ---');

  const disambig1 = ReasoningEngine.disambiguateProductMatch({
    querySlots: { categoryDomain: 'TELECOM', modelCode: 'KX-TSC11' },
    candidateProduct: { name: 'Điện thoại Panasonic KX-TSC11', field: 'Điện thoại bàn' }
  });
  assert(disambig1.isValidMatch === true, 'Correct telecom phone match accepted');

  const disambig2 = ReasoningEngine.disambiguateProductMatch({
    querySlots: { categoryDomain: 'TELECOM', modelCode: 'KX-TSC11' },
    candidateProduct: { name: 'Tủ lạnh Panasonic Inverter 300L', field: 'Tủ lạnh' }
  });
  assert(disambig2.isValidMatch === false, 'Conflicting refrigerator candidate rejected for telecom phone query');

  // -------------------------------------------------------------
  // Group 4: Composite Multi-Intent (MIXED_SALES_SECRETARY)
  // -------------------------------------------------------------
  console.log('\n--- 4. Kiểm tra Xử Lý Yêu Cầu Kết Hợp (MIXED_SALES_SECRETARY) ---');

  const resMixed = await CentralBrainService.processChat({
    message: 'Báo giá máy in Brother HL-L6210DW và nhắc anh Trí chiều mai 3h có hẹn ăn trưa',
    conversationId: 'conv_sales_mixed'
  });
  assert(resMixed.success === true, 'Mixed query processed successfully');
  assert(resMixed.reply.includes('TƯ VẤN SẢN PHẨM & KINH DOANH (AI SALES)'), 'Contains AI Sales section');
  assert(resMixed.reply.includes('LỊCH TRÌNH & THƯ KÝ (AI SECRETARY)'), 'Contains AI Secretary section');
  assert(resMixed.reply.includes('ăn trưa') || resMixed.reply.includes('chiều mai') || resMixed.reply.includes('hẹn'), 'Secretary section captures appointment details');

  console.log('\n================================================================');
  console.log(`🏁 KẾT QUẢ GIAI ĐOẠN 4: ${passed} PASS, ${failed} FAIL (Tỷ lệ: ${((passed / (passed + failed)) * 100).toFixed(1)}%)`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
