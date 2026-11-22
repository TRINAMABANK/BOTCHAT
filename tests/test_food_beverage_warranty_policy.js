import assert from 'assert';
import db from '../server/db.js';
import { SalesEngineAdapter } from '../server/adapters/salesEngineAdapter.js';
import { SmartSalesConsultant, isFoodOrBeverageProduct, isConsumableOrCosmeticProduct } from '../server/services/intelligence/smartSalesConsultant.js';
import { CentralBrainService } from '../server/services/centralBrainService.js';

async function runTests() {
  console.log('--- STARTING FOOD & BEVERAGE WARRANTY & AUTHENTIC POLICY VERIFICATION ---');

  // Test 1: Classification test
  const teaProduct = {
    name: 'Hoàng Tỳ Nhật Minh 320Gr',
    field: 'Trà cao cấp',
    group_name: 'Hắc trà Oolong cao cấp',
    description: 'Hoàng Tỳ Nhật Minh là dòng hắc trà Oolong cao cấp'
  };
  const coffeeProduct = {
    name: 'Cà phê Espresso 250gr',
    field: 'Cà phê & Đồ uống',
    group_name: 'Cà phê nguyên chất',
    description: 'Cà phê rang mộc thơm ngon'
  };
  const cosmeticProduct = {
    name: 'Bộ Sưu Tập Nước Hoa Miss Saigon',
    field: 'Nước hoa & Mỹ phẩm',
    group_name: 'Nước hoa cao cấp',
    description: 'Nước hoa mini cao cấp'
  };
  const hardwareProduct = {
    name: 'MÁY TÍNH XÁCH TAY LAPTOP LENOVO ThinkPad L14 Gen 7',
    field: 'LAPTOP',
    group_name: 'LAPTOP LENOVO',
    description: 'Laptop văn phòng siêu bền'
  };

  assert.strictEqual(isFoodOrBeverageProduct(teaProduct), true, 'Tea product must be classified as food/beverage');
  assert.strictEqual(isFoodOrBeverageProduct(coffeeProduct), true, 'Coffee product must be classified as food/beverage');
  assert.strictEqual(isFoodOrBeverageProduct(cosmeticProduct), false, 'Cosmetic product is not food/beverage');
  assert.strictEqual(isConsumableOrCosmeticProduct(cosmeticProduct), true, 'Cosmetic product is consumable/cosmetic');
  assert.strictEqual(isFoodOrBeverageProduct(hardwareProduct), false, 'Laptop is not food/beverage');
  assert.strictEqual(isConsumableOrCosmeticProduct(hardwareProduct), false, 'Laptop is not consumable');
  console.log('✅ Test 1 Passed: Product classification logic accurate.');

  // Test 2: Inquiring warranty for tea product via SalesEngineAdapter
  const teaInDb = await db.get('SELECT * FROM products WHERE name LIKE ? LIMIT 1', ['%Hoàng Tỳ Nhật Minh 320Gr%']);
  assert(teaInDb, 'Tea product must exist in database');

  const teaWarrantyRes = await SalesEngineAdapter.processMessage({
    conversationId: 'test_tea_warranty_' + Date.now(),
    message: 'Trà Hoàng Tỳ Nhật Minh có bảo hành không shop?',
    selectedProduct: teaInDb,
    customerInfo: { name: 'Anh Nam' },
    orgId: 'org_default'
  });

  console.log('\n[Tea Warranty Response]:\n', teaWarrantyRes.reply);
  const teaNorm = teaWarrantyRes.reply
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

  assert(
    !teaNorm.includes('12 - 36 thang') && !teaNorm.includes('bao hanh 12 thang'),
    'Tea warranty reply must NOT claim 12-36 months electronic warranty!'
  );
  assert(
    teaNorm.includes('khong co che do bao hanh') ||
    teaNorm.includes('khong co chinh sach bao hanh') ||
    teaNorm.includes('khong co bao hanh') ||
    teaNorm.includes('khong ap dung bao hanh') ||
    teaNorm.includes('100% chinh hang') ||
    teaNorm.includes('chinh hang 100%'),
    'Tea warranty reply must explain that consumables/teas do not have electronic warranty and commit 100% authentic / fresh date.'
  );
  console.log('✅ Test 2 Passed: Tea warranty response correctly denies electronic warranty and commits authentic / return policy.');

  // Test 3: Inquiring warranty for hardware laptop via SalesEngineAdapter
  const laptopInDb = await db.get('SELECT * FROM products WHERE field = ? LIMIT 1', ['LAPTOP']);
  assert(laptopInDb, 'Laptop product must exist in database');

  const laptopWarrantyRes = await SalesEngineAdapter.processMessage({
    conversationId: 'test_laptop_warranty_' + Date.now(),
    message: `Sản phẩm ${laptopInDb.name} bảo hành bao lâu vậy shop?`,
    selectedProduct: laptopInDb,
    customerInfo: { name: 'Anh Hùng' },
    orgId: 'org_default'
  });

  console.log('\n[Laptop Warranty Response]:\n', laptopWarrantyRes.reply);
  assert(
    laptopWarrantyRes.reply.includes('tháng') || laptopWarrantyRes.reply.includes('bảo hành'),
    'Laptop warranty response must include warranty duration.'
  );
  console.log('✅ Test 3 Passed: Laptop retains official hardware warranty.');

  // Test 4: CentralBrain Grounded Price Inquiry for Tea vs Laptop
  const teaPriceRes = await CentralBrainService.processChat({
    conversationId: 'test_cb_tea_price_' + Date.now(),
    message: 'giá bao nhiêu Hoàng Tỳ Nhật Minh 320Gr',
    selectedProduct: teaInDb,
    orgId: 'org_default'
  });
  console.log('\n[CentralBrain Tea Price Response]:\n', teaPriceRes.reply);
  assert(
    !teaPriceRes.reply.includes('Bảo hành: Chính hãng 12 tháng'),
    'CentralBrain tea price inquiry must NOT claim 12 months warranty!'
  );
  assert(
    teaPriceRes.reply.includes('Cam kết') || teaPriceRes.reply.includes('Chính hãng 100%'),
    'CentralBrain tea price inquiry must show authentic guarantee line.'
  );
  console.log('✅ Test 4 Passed: CentralBrain price inquiry does not display warranty for tea.');

  // Test 5: General Policy Inquiry via SmartSalesConsultant
  const generalPolicyRes = await SmartSalesConsultant.handlePolicyInquiry({
    message: 'chính sách bảo hành của bên bạn thế nào',
    selectedProduct: null
  });
  console.log('\n[General Policy Response]:\n', generalPolicyRes.reply);
  assert(
    generalPolicyRes.reply.includes('Thiết bị công nghệ') || generalPolicyRes.reply.includes('điện tử'),
    'General policy must mention tech/electronics warranty'
  );
  assert(
    generalPolicyRes.reply.includes('Thực phẩm') || generalPolicyRes.reply.includes('Trà & Đồ uống'),
    'General policy must distinguish food/tea with authentic commitment'
  );
  console.log('✅ Test 5 Passed: General policy clearly distinguishes hardware warranty from food/beverage authentic commitment.');

  console.log('\n🎉 ALL FOOD & BEVERAGE WARRANTY & POLICY TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
