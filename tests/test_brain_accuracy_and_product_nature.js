import assert from 'assert';
import db from '../server/db.js';
import SalesEngine, { getCustomerRef, getProductUnit } from '../server/salesEngine.js';
import { CentralBrainService } from '../server/services/centralBrainService.js';
import VerificationEngine from '../server/services/intelligence/verificationEngine.js';

async function runComprehensiveBrainTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING BRAIN ACCURACY, PRODUCT NATURE & POLICY OVERHAUL TESTS');
  console.log('================================================================\n');

  // TEST 1: Addressing accuracy (No "Bạn Anh Nam" or "Anh Anh Tào")
  console.log('--- TEST 1: Addressing logic ---');
  assert.strictEqual(getCustomerRef({ name: 'Anh Nam' }), 'anh Nam');
  assert.strictEqual(getCustomerRef({ name: 'Chị Lan' }), 'chị Lan');
  assert.strictEqual(getCustomerRef({ pronoun: 'anh', name: 'Anh Tào' }), 'anh Tào');
  assert.strictEqual(getCustomerRef({ pronoun: 'anh', name: 'Tào' }), 'anh Tào');
  assert.strictEqual(getCustomerRef({ name: 'Quang Trí' }), 'bạn Quang Trí');
  assert.strictEqual(getCustomerRef({ pronoun: 'em' }), 'em');
  assert.strictEqual(getCustomerRef({}), 'bạn');
  console.log('✅ [PASS] Test 1: Addressing honorifics clean and natural.');

  // TEST 2: Product unit accuracy
  console.log('\n--- TEST 2: Product unit classification ---');
  const teaProd = { name: 'Hoàng Tỳ Nhật Minh 320Gr', field: 'Trà cao cấp' };
  const coffeeProd = { name: 'Cà phê rang mộc', field: 'Cà phê & Đồ uống' };
  const laptopProd = { name: 'ThinkPad L14 Gen 7', field: 'LAPTOP' };
  const printerProd = { name: 'Máy in Brother HL-L6210DW', field: 'Thiết bị văn phòng' };
  const perfumeProd = { name: 'Nước hoa Miss Saigon', field: 'Nước hoa & Mỹ phẩm' };

  assert.strictEqual(getProductUnit(teaProd), 'hộp');
  assert.strictEqual(getProductUnit(coffeeProd), 'gói');
  assert.strictEqual(getProductUnit(laptopProd), 'máy');
  assert.strictEqual(getProductUnit(printerProd), 'máy');
  assert.strictEqual(getProductUnit(perfumeProd), 'chai');
  console.log('✅ [PASS] Test 2: Product units match physical nature.');

  // TEST 3: Hardware warranty inquiry via CentralBrain
  console.log('\n--- TEST 3: Hardware warranty inquiry (ThinkPad L14) ---');
  const convId3 = 'test_hw_warranty_' + Date.now();
  const res3 = await CentralBrainService.processChat({
    conversationId: convId3,
    message: 'Sản phẩm MÁY TÍNH XÁCH TAY (NB) LAPTOP LENOVO ThinkPad L14 Gen 7 (21X3S1PG00) bảo hành bao lâu vậy shop?',
    customerInfo: { name: 'Anh Nam' }
  });

  console.log('Reply:\n', res3.reply);
  assert(res3.recommendedProduct, 'Must recommend ThinkPad L14');
  assert(res3.recommendedProduct.name.includes('ThinkPad L14'), 'Must match ThinkPad L14');
  assert(res3.revealCatalog === true, 'Must reveal Catalog Column 2');
  assert(!res3.reply.toLowerCase().includes('chưa tìm thấy trong dữ liệu'), 'Must NOT report product missing');
  assert(res3.reply.toLowerCase().includes('tháng') || res3.reply.toLowerCase().includes('năm'), 'Must state official hardware warranty');
  console.log('✅ [PASS] Test 3: Hardware ThinkPad L14 accurately matched with manufacturer warranty.');

  // TEST 4: Food & Tea warranty inquiry via CentralBrain
  console.log('\n--- TEST 4: Food & Tea warranty inquiry (Hoàng Tỳ Nhật Minh) ---');
  const convId4 = 'test_tea_warranty_' + Date.now();
  const res4 = await CentralBrainService.processChat({
    conversationId: convId4,
    message: 'Trà Hoàng Tỳ Nhật Minh có bảo hành không shop?',
    customerInfo: { name: 'Anh Nam' }
  });

  console.log('Reply:\n', res4.reply);
  assert(res4.recommendedProduct, 'Must recommend Hoàng Tỳ Nhật Minh');
  assert(res4.recommendedProduct.name.includes('Hoàng Tỳ Nhật Minh'), 'Must match Hoàng Tỳ Nhật Minh (not Trà Oolong Tinh Tuyển!)');
  assert(res4.revealCatalog === true, 'Must reveal Catalog Column 2');
  assert(
    res4.reply.toLowerCase().includes('không áp dụng bảo hành') ||
    res4.reply.toLowerCase().includes('không có chế độ bảo hành') ||
    res4.reply.toLowerCase().includes('100% chính hãng'),
    'Must explain food/tea policy (no electronic warranty, 100% authentic)'
  );
  console.log('✅ [PASS] Test 4: Tea policy correctly explains no electronic warranty, 100% authentic commitment.');

  // TEST 5: Sentence termination guard
  console.log('\n--- TEST 5: VerificationEngine terminal punctuation guard ---');
  const unfinished1 = 'Bạn có muốn tôi tư vấn thêm về sản phẩm này với';
  const finished1 = VerificationEngine.sanitizeAndVerifyResponse(unfinished1);
  assert(finished1.endsWith('.'), 'Must end with period');

  const unfinished2 = 'Bạn xem chi tiết ở Cột 2 nhé';
  const finished2 = VerificationEngine.sanitizeAndVerifyResponse(unfinished2);
  assert(finished2.endsWith('!'), 'Must end with exclamation mark');

  const unfinished3 = 'Thông tin chi tiết (';
  const finished3 = VerificationEngine.sanitizeAndVerifyResponse(unfinished3);
  assert(!finished3.endsWith('('), 'Must strip trailing open paren');
  console.log('✅ [PASS] Test 5: Punctuation sanitization reliable.');

  console.log('\n================================================================');
  console.log('🏁 ALL BRAIN ACCURACY & NATURE TESTS PASSED PERFECTLY!');
  console.log('================================================================\n');
  process.exit(0);
}

runComprehensiveBrainTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
