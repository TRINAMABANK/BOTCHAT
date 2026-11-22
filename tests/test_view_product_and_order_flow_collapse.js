import assert from 'assert';
import { SalesEngine } from '../server/salesEngine.js';
import db from '../server/db.js';

async function runTestSuite() {
  console.log('================================================================');
  console.log('🧪 KIỂM THỬ: HIỂN THỊ ĐÚNG SẢN PHẨM Ở CỘT 2 KHI "CHO ANH XEM"');
  console.log('   VÀ TỰ ĐỘNG THU LẠI CỘT 2 KHI CHỐT SỐ LƯỢNG / NƠI GIAO / CRM');
  console.log('================================================================\n');

  const convId = `test_flow_${Date.now()}`;

  // TURN 1: Khách hỏi tư vấn về sản phẩm "Hoàng Tỳ Nhật Minh 320Gr"
  console.log('--- TEST 1: Khách hỏi về Hoàng Tỳ Nhật Minh 320Gr ---');
  const resTurn1 = await SalesEngine.processMessage({
    convId,
    message: 'Tư vấn giúp anh trà Hoàng Tỳ Nhật Minh 320Gr',
    selectedProduct: null
  });

  console.log('  Reply Turn 1:', resTurn1.reply.slice(0, 150) + '...');
  assert.strictEqual(resTurn1.revealCatalog, true, 'Turn 1 must reveal catalog');
  assert.ok(resTurn1.recommendedProduct, 'Turn 1 must have recommendedProduct');
  assert.strictEqual(resTurn1.recommendedProduct.name, 'Hoàng Tỳ Nhật Minh 320Gr', 'Recommended product must be Hoàng Tỳ Nhật Minh 320Gr');
  assert.strictEqual(resTurn1.products[0].name, 'Hoàng Tỳ Nhật Minh 320Gr', 'Index 0 in Column 2 must be Hoàng Tỳ Nhật Minh 320Gr');
  console.log('  ✅ [PASS] Turn 1: Mở Cột 2, đưa Hoàng Tỳ Nhật Minh 320Gr lên index 0\n');

  // TURN 2: Khách nhắn "cho anh xem" (không nhắc lại tên sản phẩm!)
  console.log('--- TEST 2: Khách nhắn cụm từ "cho anh xem" ---');
  const resTurn2 = await SalesEngine.processMessage({
    convId,
    message: 'cho anh xem',
    selectedProduct: null
  });

  console.log('  Reply Turn 2:', resTurn2.reply.slice(0, 150) + '...');
  assert.strictEqual(resTurn2.revealCatalog, true, 'Turn 2 must keep Column 2 revealed');
  assert.ok(resTurn2.recommendedProduct, 'Turn 2 must have recommendedProduct');
  assert.strictEqual(resTurn2.recommendedProduct.name, 'Hoàng Tỳ Nhật Minh 320Gr', 'Turn 2 must identify Hoàng Tỳ Nhật Minh 320Gr');
  assert.strictEqual(resTurn2.products[0].name, 'Hoàng Tỳ Nhật Minh 320Gr', 'Turn 2: Index 0 in Column 2 MUST be Hoàng Tỳ Nhật Minh 320Gr');
  assert.ok(resTurn2.reply.includes('Hoàng Tỳ Nhật Minh 320Gr') || resTurn2.reply.includes('Cột 2'), 'Reply should reference product and Column 2');
  console.log('  ✅ [PASS] Turn 2: "cho anh xem" nhận diện đúng sản phẩm đang trao đổi và xếp index 0 Cột 2\n');

  // TURN 3: Khách bắt đầu chốt số lượng đặt mua: "lấy cho anh 2 hộp"
  console.log('--- TEST 3: Khách chốt số lượng "lấy cho anh 2 hộp" -> Cột 2 tự động thu lại ---');
  const resTurn3 = await SalesEngine.processMessage({
    convId,
    message: 'lấy cho anh 2 hộp',
    selectedProduct: resTurn2.recommendedProduct
  });

  console.log('  Reply Turn 3:', resTurn3.reply.slice(0, 150) + '...');
  assert.ok(resTurn3.orderFlow, 'Order flow must be triggered');
  assert.strictEqual(resTurn3.orderFlow.active, true, 'Order flow must be active');
  assert.strictEqual(resTurn3.orderFlow.quantity, 2, 'Quantity must be parsed as 2');
  assert.strictEqual(resTurn3.orderFlow.productName, 'Hoàng Tỳ Nhật Minh 320Gr', 'Product in order must be Hoàng Tỳ Nhật Minh 320Gr');
  assert.strictEqual(resTurn3.revealCatalog, false, 'Column 2 MUST be collapsed (revealCatalog === false) when ordering');
  console.log('  ✅ [PASS] Turn 3: Cột 2 tự động thu lại (revealCatalog = false) khi chốt số lượng\n');

  // TURN 4: Khách cung cấp tên: "anh tên Tào"
  console.log('--- TEST 4: Khách cung cấp tên "anh tên Tào" -> Cột 2 vẫn thu lại ---');
  const resTurn4 = await SalesEngine.processMessage({
    convId,
    message: 'anh tên Tào',
    selectedProduct: null
  });

  console.log('  Reply Turn 4:', resTurn4.reply.slice(0, 150) + '...');
  assert.ok(resTurn4.orderFlow, 'Order flow remains active');
  assert.strictEqual(resTurn4.orderFlow.name, 'Tào', 'Customer name must be parsed as Tào');
  assert.strictEqual(resTurn4.orderFlow.step, 'ask_phone', 'Next step should be ask_phone');
  assert.strictEqual(resTurn4.revealCatalog, false, 'Column 2 remains collapsed during name entry');
  console.log('  ✅ [PASS] Turn 4: Nhận tên khách "Tào", Cột 2 vẫn thu gọn để khách tập trung\n');

  // TURN 5: Khách cung cấp số điện thoại: "0982441446"
  console.log('--- TEST 5: Khách gửi SĐT "0982441446" -> CRM Lead được lưu, Cột 2 vẫn thu lại ---');
  const resTurn5 = await SalesEngine.processMessage({
    convId,
    message: '0982441446',
    selectedProduct: null
  });

  console.log('  Reply Turn 5:', resTurn5.reply.slice(0, 150) + '...');
  assert.ok(resTurn5.leadCreated, 'Lead must be created in CRM');
  assert.strictEqual(resTurn5.leadCreated.phone, '0982441446', 'Lead phone must be 0982441446');
  assert.strictEqual(resTurn5.orderFlow?.step, 'ask_note', 'Flow moves to ask_note for delivery address');
  assert.strictEqual(resTurn5.revealCatalog, false, 'Column 2 remains collapsed when collecting CRM');
  console.log('  ✅ [PASS] Turn 5: CRM lưu thành công (Anh Tào - 0982441446 - 2 hộp Hoàng Tỳ Nhật Minh 320Gr), Cột 2 vẫn đóng\n');

  // TURN 6: Khách cung cấp nơi giao: "Giao về 123 Lê Lợi, Quận 1 nhé"
  console.log('--- TEST 6: Khách nhắn nơi giao "Giao về 123 Lê Lợi, Quận 1 nhé" ---');
  const resTurn6 = await SalesEngine.processMessage({
    convId,
    message: 'Giao về 123 Lê Lợi, Quận 1 nhé',
    selectedProduct: null
  });

  console.log('  Reply Turn 6:', resTurn6.reply.slice(0, 150) + '...');
  assert.strictEqual(resTurn6.revealCatalog, false, 'Column 2 remains collapsed after order note');
  const savedLead = await db.get('SELECT * FROM leads WHERE conversation_id = ?', [convId]);
  assert.ok(savedLead, 'Lead must exist in database');
  assert.ok(savedLead.notes.includes('123 Lê Lợi, Quận 1'), 'Notes must record delivery address');
  console.log('  ✅ [PASS] Turn 6: Ghi nhận địa chỉ giao hàng vào đơn hàng CRM thành công\n');

  // TURN 7: Sau khi chốt đơn, khách muốn xem lại sản phẩm: "cho anh xem lại sản phẩm"
  console.log('--- TEST 7: Khách yêu cầu "cho anh xem lại sản phẩm" -> Cột 2 tự động mở lại đúng sản phẩm ---');
  const resTurn7 = await SalesEngine.processMessage({
    convId,
    message: 'cho anh xem lại sản phẩm',
    selectedProduct: null
  });

  console.log('  Reply Turn 7:', resTurn7.reply.slice(0, 150) + '...');
  assert.strictEqual(resTurn7.revealCatalog, true, 'Column 2 MUST re-open when customer asks to view again');
  assert.strictEqual(resTurn7.recommendedProduct?.name, 'Hoàng Tỳ Nhật Minh 320Gr', 'Must re-select Hoàng Tỳ Nhật Minh 320Gr');
  assert.strictEqual(resTurn7.products[0].name, 'Hoàng Tỳ Nhật Minh 320Gr', 'Index 0 in Column 2 must be Hoàng Tỳ Nhật Minh 320Gr');
  console.log('  ✅ [PASS] Turn 7: Cột 2 tự động mở lại và xếp đúng sản phẩm lên đầu\n');

  console.log('================================================================');
  console.log('🏁 TẤT CẢ 7/7 TEST CASES ĐỀU ĐẠT CHUẨN XUẤT SẮC (100% PASSED)');
  console.log('================================================================\n');
}

runTestSuite().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
