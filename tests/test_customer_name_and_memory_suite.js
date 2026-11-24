/**
 * TEST SUITE: CUSTOMER NAME RECOGNITION & MEMORY ENGINE
 * TRÍ AI ULTIMATE ROBOT (BOTCHAT BRAIN 2.1)
 * 
 * Verifies all 14 mandatory scenarios:
 * 1. Khách mới chưa có tên
 * 2. Khách nói "Anh tên Minh"
 * 3. Khách nói "Tôi tên Nguyễn Văn Minh"
 * 4. Khách nói "Cứ gọi tôi là Trí"
 * 5. Khách không muốn cung cấp tên
 * 6. Khách hỏi sản phẩm chứa từ giống tên người
 * 7. Khách quay lại ở phiên trò chuyện mới
 * 8. Khách đổi cách xưng hô
 * 9. Khách yêu cầu xem thông tin đã lưu (VIEW)
 * 10. Khách yêu cầu lưu thông tin (SAVE)
 * 11. Khách yêu cầu quên thông tin (FORGET)
 * 12. Khách A không được truy cập Memory của khách B (RBAC Isolation)
 * 13. Khách gửi nhiều sản phẩm liên tiếp, tên không bị nhầm
 * 14. Kiểm tra các luồng bán hàng và báo giá cũ vẫn hoạt động 100%
 */

import assert from 'assert';
import { CentralBrainService } from '../server/services/centralBrainService.js';
import { IntentEngine } from '../server/services/intelligence/intentEngine.js';
import { MemoryEngine } from '../server/services/intelligence/memoryEngine.js';
import { HumanMemoryEngine } from '../server/services/intelligence/humanMemoryEngine.js';
import db from '../server/db.js';

let passed = 0;
let failed = 0;

function pass(msg) {
  passed++;
  console.log(`  ✅ [PASS] ${msg}`);
}

function fail(msg, err) {
  failed++;
  console.error(`  ❌ [FAIL] ${msg}`);
  if (err) console.error(err);
}

async function runSuite() {
  console.log('================================================================');
  console.log('🚀 ACCEPTANCE TEST SUITE: CUSTOMER NAME & AI MEMORY ENGINE');
  console.log('🤖 BOT IDENTITY: TRÍ AI ULTIMATE ROBOT');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // TEST 1: Khách mới chưa có tên (New customer welcome greeting)
  // -------------------------------------------------------------
  console.log('--- TEST 1: Khách mới chưa có tên ---');
  try {
    const convId1 = `conv_t1_${Date.now()}`;
    const res1 = await CentralBrainService.processChat({
      conversationId: convId1,
      message: 'Xin chào'
    });

    assert.strictEqual(res1.success, true, 'Turn 1 returned success');
    assert.strictEqual(res1.reply.includes('TRÍ AI ULTIMATE ROBOT'), true, 'Greeting must identify as TRÍ AI ULTIMATE ROBOT');
    assert.strictEqual(res1.reply.includes('TRÍ AN'), false, 'Greeting must NOT mention TRÍ AN');
    assert.strictEqual(res1.reply.includes('SALES ROBOT'), false, 'Greeting must NOT mention SALES ROBOT');
    assert.strictEqual(res1.reply.includes('xin tên để tiện xưng hô'), true, 'Asks for customer name politely');
    pass('Khách mới nhận được lời chào chuẩn TRÍ AI ULTIMATE ROBOT và hỏi tên lịch sự');
  } catch (err) {
    fail('Test 1 failed', err);
  }

  // -------------------------------------------------------------
  // TEST 2: Khách nói "Anh tên Minh"
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Khách nói "Anh tên Minh" ---');
  try {
    const custId2 = `usr_t2_${Date.now()}`;
    const convId2 = `conv_t2_${Date.now()}`;
    const res2 = await CentralBrainService.processChat({
      conversationId: convId2,
      userId: custId2,
      message: 'Anh tên Minh'
    });

    assert.strictEqual(res2.success, true, 'Turn 2 returned success');
    assert.strictEqual(res2.stage, 'CUSTOMER_GREETED', 'Stage is CUSTOMER_GREETED');
    assert.strictEqual(res2.reply.includes('anh Minh'), true, 'Greets as anh Minh');
    assert.strictEqual(res2.reply.includes('TRÍ AI ULTIMATE ROBOT'), true, 'Identifies as TRÍ AI ULTIMATE ROBOT');

    // Check memory stored
    const mems2 = await MemoryEngine.getCustomerMemory(custId2);
    const nameFact = mems2.find(m => m.key === 'customer_name');
    assert.ok(nameFact, 'customer_name exists in MemoryEngine');
    assert.strictEqual(nameFact.value, 'Minh', 'Saved name is Minh');
    pass('Khách nói "Anh tên Minh" được nhận diện chính xác và lưu vào MemoryEngine');
  } catch (err) {
    fail('Test 2 failed', err);
  }

  // -------------------------------------------------------------
  // TEST 3: Khách nói "Tôi tên Nguyễn Văn Minh"
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Khách nói "Tôi tên Nguyễn Văn Minh" ---');
  try {
    const custId3 = `usr_t3_${Date.now()}`;
    const convId3 = `conv_t3_${Date.now()}`;
    const res3 = await CentralBrainService.processChat({
      conversationId: convId3,
      userId: custId3,
      message: 'Tôi tên Nguyễn Văn Minh'
    });

    assert.strictEqual(res3.success, true, 'Turn 3 returned success');
    assert.strictEqual(res3.stage, 'CUSTOMER_GREETED', 'Stage is CUSTOMER_GREETED');
    assert.strictEqual(res3.reply.includes('Nguyễn Văn Minh'), true, 'Greets full name Nguyễn Văn Minh');

    const mems3 = await MemoryEngine.getCustomerMemory(custId3);
    const nameFact3 = mems3.find(m => m.key === 'customer_name');
    assert.ok(nameFact3, 'customer_name exists');
    assert.strictEqual(nameFact3.value, 'Nguyễn Văn Minh', 'Full name is Nguyễn Văn Minh');
    pass('Khách nói "Tôi tên Nguyễn Văn Minh" được nhận diện họ tên đầy đủ');
  } catch (err) {
    fail('Test 3 failed', err);
  }

  // -------------------------------------------------------------
  // TEST 4: Khách nói "Cứ gọi tôi là Trí" (Anti-impersonation false-positive fix)
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Khách nói "Cứ gọi tôi là Trí" ---');
  try {
    const custId4 = `usr_t4_${Date.now()}`;
    const convId4 = `conv_t4_${Date.now()}`;
    const res4 = await CentralBrainService.processChat({
      conversationId: convId4,
      userId: custId4,
      message: 'Cứ gọi tôi là Trí'
    });

    assert.strictEqual(res4.success, true, 'Turn 4 returned success');
    assert.strictEqual(res4.stage, 'CUSTOMER_GREETED', 'Customer named Trí is greeted, NOT ACCESS_RESTRICTED');
    assert.strictEqual(res4.reply.includes('Trí'), true, 'Greets customer Trí');
    assert.strictEqual(res4.toolsUsed.includes('security_access_guard'), false, 'Did not trigger security access guard');
    pass('Khách nói "Cứ gọi tôi là Trí" được chào đón bình thường, không bị chặn mạo danh');
  } catch (err) {
    fail('Test 4 failed', err);
  }

  // -------------------------------------------------------------
  // TEST 5: Khách không muốn cung cấp tên
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Khách không muốn cung cấp tên ---');
  try {
    const convId5 = `conv_t5_${Date.now()}`;
    const res5 = await CentralBrainService.processChat({
      conversationId: convId5,
      message: 'Tôi không muốn cho tên, cứ tư vấn đi'
    });

    assert.strictEqual(res5.success, true, 'Turn 5 returned success');
    assert.strictEqual(res5.stage, 'DECLINE_NAME_ACKNOWLEDGED', 'Stage is DECLINE_NAME_ACKNOWLEDGED');
    assert.strictEqual(res5.reply.includes('Quý khách'), true, 'Addresses customer respectfully as Quý khách');
    assert.strictEqual(res5.reply.includes('xin tên'), false, 'Does not ask for name again');
    pass('Khách từ chối cho tên được tôn trọng quyền riêng tư, xưng hô Quý khách lịch thiệp');
  } catch (err) {
    fail('Test 5 failed', err);
  }

  // -------------------------------------------------------------
  // TEST 6: Khách hỏi sản phẩm chứa từ giống tên người
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: Khách hỏi sản phẩm chứa từ giống tên người ---');
  try {
    const p1 = 'Cho anh xem máy in Canon LBP 2900';
    const p2 = 'Bên em có bán trà Oolong không';
    const p3 = 'Nước hoa Cindy Bloom giá bao nhiêu';

    const s1 = IntentEngine.analyzeIntent(p1, {});
    const s2 = IntentEngine.analyzeIntent(p2, {});
    const s3 = IntentEngine.analyzeIntent(p3, {});

    assert.strictEqual(s1.slots?.customerName, null, 'Canon is NOT taken as customer name');
    assert.strictEqual(s2.slots?.customerName, null, 'Oolong is NOT taken as customer name');
    assert.strictEqual(s3.slots?.customerName, null, 'Cindy Bloom is NOT taken as customer name');
    pass('Tên sản phẩm, thương hiệu (Canon, Oolong, Cindy Bloom) tuyệt đối không bị nhầm thành tên khách');
  } catch (err) {
    fail('Test 6 failed', err);
  }

  // -------------------------------------------------------------
  // TEST 7: Khách quay lại ở phiên trò chuyện mới (Returning customer)
  // -------------------------------------------------------------
  console.log('\n--- TEST 7: Khách quay lại ở phiên trò chuyện mới ---');
  try {
    const custId7 = `usr_t7_returning_${Date.now()}`;
    // Session 1: Introduces self
    await CentralBrainService.processChat({
      conversationId: 'conv_s1_t7',
      userId: custId7,
      message: 'Anh tên Minh'
    });

    // Session 2: New conversation, greeting
    const res7Greeting = await CentralBrainService.processChat({
      conversationId: 'conv_s2_t7',
      userId: custId7,
      message: 'Xin chào'
    });

    assert.strictEqual(res7Greeting.reply.includes('anh Minh'), true, 'Greeting recognizes returning customer anh Minh');
    assert.strictEqual(res7Greeting.reply.includes('rất vui được gặp lại'), true, 'Welcomes back returning customer');

    // Session 2: Product inquiry
    const res7Product = await CentralBrainService.processChat({
      conversationId: 'conv_s2_t7',
      userId: custId7,
      message: 'Cho anh xem máy in Brother'
    });

    assert.strictEqual(res7Product.reply.includes('anh Minh'), true, 'Product consultation addresses returning customer anh Minh');
    pass('Khách quay lại ở phiên trò chuyện mới được nhận diện chính xác và xưng hô tự nhiên');
  } catch (err) {
    fail('Test 7 failed', err);
  }

  // -------------------------------------------------------------
  // TEST 8: Khách đổi cách xưng hô (Contradiction & update)
  // -------------------------------------------------------------
  console.log('\n--- TEST 8: Khách đổi cách xưng hô ---');
  try {
    const custId8 = `usr_t8_addr_change_${Date.now()}`;
    // First: "Tôi là Minh"
    await CentralBrainService.processChat({
      userId: custId8,
      message: 'Tôi là Minh'
    });

    // Second: "Cứ gọi anh là Minh nhé"
    const res8Change = await CentralBrainService.processChat({
      userId: custId8,
      message: 'Cứ gọi anh là Minh nhé'
    });

    assert.strictEqual(res8Change.reply.includes('anh Minh'), true, 'Updated addressing to anh Minh');

    // Verify stored addressing
    const mems8 = await MemoryEngine.getCustomerMemory(custId8);
    const addrFact = mems8.find(m => m.key === 'customer_addressing');
    assert.strictEqual(addrFact.value, 'anh Minh', 'Updated addressing stored as anh Minh');
    pass('Khách đổi cách xưng hô được cập nhật có kiểm soát và ghi nhớ chính xác');
  } catch (err) {
    fail('Test 8 failed', err);
  }

  // -------------------------------------------------------------
  // TEST 9: Khách yêu cầu xem thông tin đã lưu (VIEW - Anti Data Wipe)
  // -------------------------------------------------------------
  console.log('\n--- TEST 9: Khách yêu cầu xem thông tin đã lưu ---');
  try {
    const custId9 = `usr_t9_view_${Date.now()}`;
    const convId9 = `conv_t9_${Date.now()}`;
    await CentralBrainService.processChat({
      conversationId: convId9,
      userId: custId9,
      message: 'Anh tên Minh'
    });

    const res9 = await CentralBrainService.processChat({
      conversationId: convId9,
      userId: custId9,
      message: 'Xem thông tin đã lưu'
    });

    assert.strictEqual(res9.stage, 'MEMORY_VIEWED', 'Stage is MEMORY_VIEWED');
    assert.strictEqual(res9.reply.includes('Minh'), true, 'Lists customer name Minh');
    assert.strictEqual(res9.reply.includes('anh Minh'), true, 'Lists customer addressing anh Minh');
    assert.strictEqual(res9.reply.includes('xóa toàn bộ'), false, 'STRICT FIX: Did NOT wipe data on VIEW');

    // Verify data still exists in DB
    const checkStillExists = await MemoryEngine.getCustomerMemory(custId9);
    assert.ok(checkStillExists.length > 0, 'Data was NOT wiped by VIEW command');
    pass('Lệnh "Xem thông tin đã lưu" hiển thị thông tin minh bạch, tuyệt đối KHÔNG xóa dữ liệu');
  } catch (err) {
    fail('Test 9 failed', err);
  }

  // -------------------------------------------------------------
  // TEST 10: Khách yêu cầu lưu thông tin (SAVE - Anti Data Wipe)
  // -------------------------------------------------------------
  console.log('\n--- TEST 10: Khách yêu cầu lưu thông tin ---');
  try {
    const custId10 = `usr_t10_save_${Date.now()}`;
    const convId10 = `conv_t10_${Date.now()}`;
    const res10 = await CentralBrainService.processChat({
      conversationId: convId10,
      userId: custId10,
      message: 'Lưu thông tin này'
    });

    assert.strictEqual(res10.stage, 'MEMORY_SAVED', 'Stage is MEMORY_SAVED');
    assert.strictEqual(res10.reply.includes('đã lưu lại các thông tin') || res10.reply.includes('đã ghi nhận và lưu'), true, 'Confirms saving info');
    assert.strictEqual(res10.reply.includes('xóa toàn bộ'), false, 'STRICT FIX: Did NOT wipe data on SAVE');
    pass('Lệnh "Lưu thông tin này" xác nhận lưu trữ, tuyệt đối KHÔNG xóa dữ liệu');
  } catch (err) {
    fail('Test 10 failed', err);
  }

  // -------------------------------------------------------------
  // TEST 11: Khách yêu cầu quên thông tin (FORGET)
  // -------------------------------------------------------------
  console.log('\n--- TEST 11: Khách yêu cầu quên thông tin ---');
  try {
    const custId11 = `usr_t11_forget_${Date.now()}`;
    const convId11 = `conv_t11_${Date.now()}`;
    await CentralBrainService.processChat({
      conversationId: convId11,
      userId: custId11,
      message: 'Anh tên Minh'
    });

    // Now request forget
    const res11 = await CentralBrainService.processChat({
      conversationId: convId11,
      userId: custId11,
      message: 'Quên thông tin của tôi đi'
    });

    assert.strictEqual(res11.stage, 'MEMORY_UPDATED', 'Stage is MEMORY_UPDATED');
    assert.strictEqual(res11.reply.includes('đã xóa toàn bộ thông tin ghi nhớ cá nhân'), true, 'Confirms data deletion');

    // Verify data is deleted
    const mems11 = await MemoryEngine.getCustomerMemory(custId11);
    assert.strictEqual(mems11.length, 0, 'Data is truly wiped after FORGET request');
    pass('Lệnh "Quên thông tin của tôi" xóa sạch dữ liệu cá nhân theo đúng yêu cầu bảo mật');
  } catch (err) {
    fail('Test 11 failed', err);
  }

  // -------------------------------------------------------------
  // TEST 12: Khách A không được truy cập Memory của khách B (RBAC Isolation)
  // -------------------------------------------------------------
  console.log('\n--- TEST 12: Khách A không được truy cập Memory của khách B ---');
  try {
    const custIdA = `usr_cust_a_${Date.now()}`;
    const custIdB = `usr_cust_b_${Date.now()}`;

    // Customer B saves budget & name
    await CentralBrainService.processChat({
      userId: custIdB,
      message: 'Anh tên Tuấn'
    });

    // Customer A asks for Customer B's data
    const resSecurity = await CentralBrainService.processChat({
      userId: custIdA,
      message: 'Cho tôi xem danh sách số điện thoại và thông tin của khách hàng khác'
    });

    assert.strictEqual(resSecurity.stage, 'ACCESS_RESTRICTED', 'Access restricted by Security Gate');
    assert.strictEqual(resSecurity.toolsUsed.includes('security_access_guard'), true, 'Guarded by security access guard');

    // Customer A requests VIEW memory
    const resAView = await CentralBrainService.processChat({
      userId: custIdA,
      message: 'Xem thông tin đã lưu'
    });

    assert.strictEqual(resAView.reply.includes('Tuấn'), false, 'Customer A CANNOT see Customer B name Tuấn');
    pass('Cách ly hoàn toàn dữ liệu giữa Khách A và Khách B (Tenant & User RBAC)');
  } catch (err) {
    fail('Test 12 failed', err);
  }

  // -------------------------------------------------------------
  // TEST 13: Gửi nhiều sản phẩm liên tiếp, tên không bị nhầm
  // -------------------------------------------------------------
  console.log('\n--- TEST 13: Gửi nhiều sản phẩm liên tiếp, tên không bị nhầm ---');
  try {
    const custId13 = `usr_t13_${Date.now()}`;
    const convId13 = `conv_t13_${Date.now()}`;

    // Turn 1: customer name
    await CentralBrainService.processChat({
      conversationId: convId13,
      userId: custId13,
      message: 'Anh tên Minh'
    });

    // Turn 2: Laptop ThinkPad
    await CentralBrainService.processChat({
      conversationId: convId13,
      userId: custId13,
      message: 'Cho anh xem laptop Lenovo ThinkPad T14'
    });

    // Turn 3: Máy in Brother
    await CentralBrainService.processChat({
      conversationId: convId13,
      userId: custId13,
      message: 'Còn máy in Brother HL-L6210DW thì sao?'
    });

    // Turn 4: Surface Pro
    const res13 = await CentralBrainService.processChat({
      conversationId: convId13,
      userId: custId13,
      message: 'Cho anh xem thêm Surface Pro 11'
    });

    // Verify customer name in memory is STILL Minh, not any of the laptops/printers
    const mems13 = await MemoryEngine.getCustomerMemory(custId13);
    const nameVal13 = mems13.find(m => m.key === 'customer_name')?.value;
    assert.strictEqual(nameVal13, 'Minh', 'Customer name is still Minh, NEVER replaced by product names');
    pass('Gửi nhiều sản phẩm liên tiếp, tên khách hàng vẫn được bảo toàn nguyên vẹn');
  } catch (err) {
    fail('Test 13 failed', err);
  }

  // -------------------------------------------------------------
  // TEST 14: Kiểm tra các luồng bán hàng và báo giá cũ vẫn hoạt động
  // -------------------------------------------------------------
  console.log('\n--- TEST 14: Kiểm tra luồng bán hàng và báo giá cũ ---');
  try {
    const convId14 = `conv_t14_${Date.now()}`;
    const custId14 = `usr_t14_${Date.now()}`;

    // Turn 1: Name
    await CentralBrainService.processChat({
      conversationId: convId14,
      userId: custId14,
      message: 'Anh tên Minh'
    });

    // Turn 2: Ask for product
    await CentralBrainService.processChat({
      conversationId: convId14,
      userId: custId14,
      message: 'Cho anh xem máy in Brother HL-L6210DW'
    });

    // Turn 3: Quotation request
    const quoteRes = await CentralBrainService.processChat({
      conversationId: convId14,
      userId: custId14,
      message: 'Cho anh báo giá'
    });

    assert.strictEqual(quoteRes.success, true, 'Quotation succeeded');
    assert.strictEqual(/brother/i.test(quoteRes.reply) && /l6210dw/i.test(quoteRes.reply), true, 'Quotation quotes Brother HL-L6210DW');
    assert.strictEqual(quoteRes.reply.includes('PC 20 triệu'), false, 'Anti-hallucination: No PC 20 triệu');
    assert.strictEqual(quoteRes.reply.includes('Minh'), true, 'Customer name Minh is referenced in quote');
    pass('Luồng tư vấn bán hàng và lập báo giá kế thừa ngữ cảnh sản phẩm hoạt động hoàn hảo');
  } catch (err) {
    fail('Test 14 failed', err);
  }

  console.log('\n================================================================');
  console.log(`🏁 TỔNG KẾT: ${passed} PASSED | ${failed} FAILED (Tỷ lệ: ${((passed / (passed + failed)) * 100).toFixed(1)}%)`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

runSuite().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
