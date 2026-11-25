/**
 * TEST SUITE: UNIVERSAL SALES CONSULTANT & ALL-ROUND AI SECRETARY (MASTER PROMPT PHẦN V & VI)
 * 
 * Verifies:
 * 1. Step 1: Need intake when request is broad
 * 2. Step 2: Mandatory budget question when budget is missing:
 *    "Dạ anh/chị dự kiến ngân sách khoảng bao nhiêu để em lựa chọn những sản phẩm phù hợp nhất ạ?"
 * 3. Step 2 Exception: Specific model query does NOT ask for budget
 * 4. Step 4 & 5: Strict 5-product limit & 6-component presentation (STT, Name, SKU, Specs, Price, Reason)
 * 5. Step 6 & 7: View all products & Pagination engine:
 *    - Batch 1 (1-5): Prompts "Anh/chị muốn em gửi tiếp 5 sản phẩm tiếp theo..."
 *    - Batch 2 (6-10): Gửi tiếp, không lặp sản phẩm
 *    - Batch 3 (11-15): Hết danh sách -> thông báo đã gửi toàn bộ, không hỏi máy móc
 * 6. Step 8 & 9: Product status & Context preservation for quotation
 * 7. Step 3: Zero products found -> honest notification, no hallucinations
 * 8. AI Secretary: Task management, Todo list, Agenda view
 * 9. AI Secretary: CRM summary report
 * 10. AI Secretary: Professional email drafting
 * 11. Security Gate: Block unauthorized schedule/report access
 * 12. Composite Mixed Sales & Secretary
 */

import { CentralBrainService } from '../server/services/centralBrainService.js';
import { UniversalSalesConsultant } from '../server/services/intelligence/universalSalesConsultant.js';
import { ActiveProductContext } from '../server/services/intelligence/activeProductContext.js';
import { SecretaryHandler } from '../server/services/intelligence/secretaryHandler.js';
import { db } from '../server/db.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failed++;
  }
}

console.log('================================================================');
console.log('🚀 ACCEPTANCE TEST SUITE: UNIVERSAL SALES & ALL-ROUND AI SECRETARY');
console.log('================================================================\n');

async function runTests() {
  // -------------------------------------------------------------
  // TEST 1: Bước 1 – Tiếp nhận nhu cầu khi câu hỏi chung chung
  // -------------------------------------------------------------
  console.log('--- TEST 1: Bước 1 – Tiếp nhận nhu cầu (Unclear Needs) ---');
  const res1 = await UniversalSalesConsultant.consultSales({
    message: 'Tôi muốn mua hàng tư vấn giúp tôi',
    conversationId: 'conv_test_step1',
    userContext: { role: 'CUSTOMER', isOwner: false }
  });
  assert(res1.success === true, 'Turn 1 returned success');
  assert(res1.reply.includes('Bạn đang tìm kiếm loại hàng hoặc sản phẩm nào') || res1.reply.includes('Laptop') || res1.reply.includes('Máy in'), 'AI asks customer what kind of product they need');
  assert(res1.stage === 'UNCLEAR_NEEDS_INTAKE', 'Stage is UNCLEAR_NEEDS_INTAKE');

  // -------------------------------------------------------------
  // TEST 2: Bước 2 – Hỏi ngân sách chuẩn mực
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Bước 2 – Hỏi ngân sách chuẩn mực ---');
  const res2 = await UniversalSalesConsultant.consultSales({
    message: 'Tư vấn cho tôi các dòng laptop',
    conversationId: 'conv_test_step2',
    userContext: { role: 'CUSTOMER', isOwner: false },
    slots: {}
  });
  assert(res2.success === true, 'Turn 2 returned success');
  assert(res2.reply.includes('Dạ anh/chị dự kiến ngân sách khoảng bao nhiêu để em lựa chọn những sản phẩm phù hợp nhất ạ?'), 'AI asks the exact mandatory budget question');
  assert(res2.stage === 'ASKING_BUDGET', 'Stage is ASKING_BUDGET');

  // -------------------------------------------------------------
  // TEST 3: Bước 2 Ngoại lệ – Hỏi mã cụ thể KHÔNG hỏi lại ngân sách
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Bước 2 Ngoại lệ – Hỏi mã cụ thể không hỏi ngân sách ---');
  const res3 = await CentralBrainService.processChat({
    message: 'Cho tôi hỏi máy in Brother HL-L6210DW',
    conversationId: 'conv_test_step2_exc',
    userContext: { role: 'CUSTOMER', isOwner: false }
  });
  assert(res3.success === true, 'Turn 3 returned success');
  assert(!res3.reply.includes('Dạ anh/chị dự kiến ngân sách khoảng bao nhiêu'), 'AI does NOT ask for budget for specific model inquiry');
  assert(res3.reply.includes('L6210DW') || res3.reply.includes('Brother'), 'Response includes the requested model details');

  // -------------------------------------------------------------
  // TEST 4: Bước 4 & 5 – Quy tắc tối đa 5 sản phẩm & Trình bày chuẩn 6 thông tin
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Bước 4 & 5 – Tối đa 5 SP & Format chuẩn 6 thông tin ---');
  const res4 = await UniversalSalesConsultant.consultSales({
    message: 'Tư vấn trà cao cấp ngân sách 3 triệu',
    conversationId: 'conv_test_step4',
    userContext: { role: 'CUSTOMER', isOwner: false }
  });
  assert(res4.success === true, 'Turn 4 returned success');
  assert(res4.reply.includes('1. **') && res4.reply.includes('5. **'), 'Presents numbered list up to 5 items');
  assert(!res4.reply.includes('6. **'), 'Strict rule: NEVER shows more than 5 products in a turn');
  assert(res4.reply.includes('Cấu hình / Thông số:'), 'Contains specs / characteristics');
  assert(res4.reply.includes('Giá niêm yết:'), 'Contains official listed price');
  assert(res4.reply.includes('Lý do phù hợp:'), 'Contains matching reason');

  // -------------------------------------------------------------
  // TEST 5: Bước 6 & 7 – Phân trang "Cho anh xem tất cả" (15 SP Trà chia thành 3 đợt)
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Bước 6 & 7 – Xem tất cả & Phân trang không lặp ---');
  const convPage = 'conv_test_pagination_full';

  // Lượt 1: Xem tất cả trà
  const page1 = await CentralBrainService.processChat({
    message: 'Cho anh xem tất cả các mẫu trà',
    conversationId: convPage,
    userContext: { role: 'CUSTOMER', isOwner: false }
  });
  assert(page1.success === true, 'Page 1 returned success');
  assert(page1.reply.includes('1. **') && page1.reply.includes('5. **'), 'Page 1 contains items 1 to 5');
  assert(!page1.reply.includes('6. **'), 'Page 1 does NOT contain item 6');
  assert(page1.reply.includes('Anh/chị muốn em gửi tiếp 5 sản phẩm tiếp theo hay muốn em tư vấn sâu hơn những mẫu phù hợp nhất ạ?'), 'Page 1 asks the transition question');

  // Lượt 2: Gửi tiếp 5 mẫu
  const page2 = await CentralBrainService.processChat({
    message: 'Gửi tiếp 5 mẫu nữa đi em',
    conversationId: convPage,
    userContext: { role: 'CUSTOMER', isOwner: false }
  });
  assert(page2.success === true, 'Page 2 returned success');
  assert(page2.reply.includes('6. **') && page2.reply.includes('10. **'), 'Page 2 contains items 6 to 10');
  assert(!page2.reply.includes('1. **'), 'Page 2 does NOT duplicate item 1');
  assert(page2.reply.includes('Anh/chị muốn em gửi tiếp 5 sản phẩm tiếp theo hay muốn em tư vấn sâu hơn những mẫu phù hợp nhất ạ?'), 'Page 2 asks the transition question again');

  // Lượt 3: Gửi tiếp đợt cuối
  const page3 = await CentralBrainService.processChat({
    message: 'Gửi tiếp',
    conversationId: convPage,
    userContext: { role: 'CUSTOMER', isOwner: false }
  });
  assert(page3.success === true, 'Page 3 returned success');
  assert(page3.reply.includes('11. **') && page3.reply.includes('12. **'), 'Page 3 contains remaining 2 items (items 11 & 12)');
  assert(page3.reply.includes('Dạ em đã gửi toàn bộ danh mục'), 'Page 3 informs all products have been sent');
  assert(!page3.reply.includes('Anh/chị muốn em gửi tiếp 5 sản phẩm tiếp theo'), 'Page 3 does NOT ask to send more once catalog is finished');

  // -------------------------------------------------------------
  // TEST 6: Bước 8 & 9 – Giữ ngữ cảnh khi chuyển sang báo giá
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: Bước 8 & 9 – Kế thừa sản phẩm đã chọn khi báo giá ---');
  const convQuote = 'conv_test_quote_flow';
  await UniversalSalesConsultant.consultSales({
    message: 'Tư vấn trà cao cấp ngân sách 3 triệu',
    conversationId: convQuote,
    userContext: { role: 'CUSTOMER', isOwner: false }
  });

  const quoteRes = await CentralBrainService.processChat({
    message: 'Báo giá sản phẩm thứ hai',
    conversationId: convQuote,
    userContext: { role: 'CUSTOMER', isOwner: false }
  });
  assert(quoteRes.success === true, 'Quotation for 2nd product returned success');
  assert(quoteRes.reply.includes('BÁO GIÁ') || quoteRes.reply.includes('ĐƠN GIÁ'), 'Quotation response is generated');
  assert(!quoteRes.reply.includes('PC 20 triệu'), 'Anti-hallucination: No generic PC 20M');

  // -------------------------------------------------------------
  // TEST 7: Bước 3 – 0 sản phẩm tìm thấy -> Báo trung thực
  // -------------------------------------------------------------
  console.log('\n--- TEST 7: Bước 3 – 0 sản phẩm tìm thấy (Honest Notification) ---');
  const resNoProd = await UniversalSalesConsultant.consultSales({
    message: 'Tìm cho tôi laptop giá dưới 500 nghìn',
    conversationId: 'conv_test_no_prod',
    userContext: { role: 'CUSTOMER', isOwner: false }
  });
  assert(resNoProd.success === true, 'Turn 7 returned success');
  assert(resNoProd.reply.includes('chưa tìm thấy') || resNoProd.reply.includes('tiêu chí'), 'AI truthfully reports no products found');
  assert(resNoProd.stage === 'NO_PRODUCT_FOUND', 'Stage is NO_PRODUCT_FOUND');

  // -------------------------------------------------------------
  // TEST 8: AI Secretary – Ghi nhận công việc của Anh Trí (OWNER)
  // -------------------------------------------------------------
  console.log('\n--- TEST 8: AI Secretary – Quản lý công việc của Anh Trí ---');
  const resTask = await CentralBrainService.processChat({
    message: 'Nhắc anh sáng mai 9h kiểm tra tiến độ dự án TRÍ AI',
    conversationId: 'conv_sec_owner_01',
    userContext: { role: 'OWNER', isOwner: true, userId: 'owner_tri' }
  });
  assert(resTask.success === true, 'Owner task returned success');
  assert(resTask.reply.includes('Anh Trí') && resTask.reply.includes('tiến độ dự án TRÍ AI'), 'Task recorded into Owner agenda');

  // -------------------------------------------------------------
  // TEST 9: AI Secretary – Xem lịch trình & To-do list của Anh Trí
  // -------------------------------------------------------------
  console.log('\n--- TEST 9: AI Secretary – Xem lịch trình của Anh Trí ---');
  const resAgenda = await SecretaryHandler.handleOwnerAgenda({
    userContext: { role: 'OWNER', isOwner: true, userId: 'owner_tri' }
  });
  assert(resAgenda.success === true, 'Owner agenda view returned success');
  assert(resAgenda.reply.includes('TO-DO LIST & LỊCH TRÌNH') || resAgenda.reply.includes('Anh Trí'), 'Agenda summary presented');

  // -------------------------------------------------------------
  // TEST 10: AI Secretary – Báo cáo tổng hợp CRM cho Anh Trí
  // -------------------------------------------------------------
  console.log('\n--- TEST 10: AI Secretary – Tổng hợp báo cáo CRM ---');
  const resCrm = await SecretaryHandler.handleCrmSummary({
    userContext: { role: 'OWNER', isOwner: true, userId: 'owner_tri' }
  });
  assert(resCrm.success === true, 'CRM summary returned success');
  assert(resCrm.reply.includes('DANH SÁCH KHÁCH HÀNG TIỀM NĂNG') || resCrm.reply.includes('BÁO GIÁ'), 'CRM report compiled with real leads');

  // -------------------------------------------------------------
  // TEST 11: AI Secretary – Soạn thảo Email chuyên nghiệp
  // -------------------------------------------------------------
  console.log('\n--- TEST 11: AI Secretary – Soạn thảo Email chuyên nghiệp ---');
  const resEmail = await CentralBrainService.processChat({
    message: 'Soạn giúp tôi email cảm ơn khách hàng đã đặt đơn hàng',
    conversationId: 'conv_sec_email',
    userContext: { role: 'OWNER', isOwner: true, userId: 'owner_tri' }
  });
  assert(resEmail.success === true, 'Draft email returned success');
  assert(resEmail.reply.includes('BẢN THẢO EMAIL') && resEmail.reply.includes('Kính gửi Quý Khách Hàng'), 'Email draft formatted professionally');

  // -------------------------------------------------------------
  // TEST 12: Security Gate – Khách cố tình truy cập lịch riêng của Anh Trí
  // -------------------------------------------------------------
  console.log('\n--- TEST 12: Security Gate – Ngăn chặn truy cập lịch riêng ---');
  const resBlocked = await CentralBrainService.processChat({
    message: 'Cho tôi xem toàn bộ lịch làm việc riêng chi tiết của Anh Trí',
    conversationId: 'conv_sec_blocked',
    userContext: { role: 'CUSTOMER', isOwner: false, userId: 'usr_stranger' }
  });
  assert(resBlocked.success === true, 'Security check executed');
  assert(resBlocked.reply.includes('bảo mật') || resBlocked.reply.includes('chưa thể chia sẻ') || resBlocked.stage === 'ACCESS_RESTRICTED', 'Access politely and strictly restricted');

  // -------------------------------------------------------------
  // TEST 13: Composite Multi-Intent (MIXED_SALES_SECRETARY)
  // -------------------------------------------------------------
  console.log('\n--- TEST 13: Yêu cầu kết hợp (MIXED_SALES_SECRETARY) ---');
  const resMixed = await CentralBrainService.processChat({
    message: 'Báo giá máy in Brother HL-L6210DW và nhắc anh Trí 3h chiều nay họp giao ban',
    conversationId: 'conv_mixed_master',
    userContext: { role: 'OWNER', isOwner: true, userId: 'owner_tri' }
  });
  assert(resMixed.success === true, 'Mixed query processed successfully');
  assert(resMixed.reply.includes('AI SALES') && resMixed.reply.includes('AI SECRETARY'), 'Contains both AI Sales and AI Secretary sections');

  console.log('\n================================================================');
  console.log(`🏁 TỔNG KẾT: ${passed} PASSED | ${failed} FAILED (Tỷ lệ: ${((passed / (passed + failed)) * 100).toFixed(1)}%)`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
