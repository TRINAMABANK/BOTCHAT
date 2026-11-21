import assert from 'assert';
import CentralBrainService from '../server/services/centralBrainService.js';
import { IntentEngine } from '../server/services/intelligence/intentEngine.js';
import { ReasoningEngine } from '../server/services/intelligence/reasoningEngine.js';
import { VerificationEngine } from '../server/services/intelligence/verificationEngine.js';
import SalesEngine, { evaluateProductMatch } from '../server/salesEngine.js';
import db, { getDb } from '../server/db.js';

console.log('================================================================');
console.log('🚀 TEST SUITE: TRÍ AN LEVEL 2.0 – BỘ NÃO AI VÀ KHẢ NĂNG SUY LUẬN');
console.log('================================================================\n');

async function runTests() {
  let passedCount = 0;
  let totalTests = 0;

  function test(name, fn) {
    totalTests++;
    try {
      fn();
      console.log(`✅ [PASS] Test ${totalTests}: ${name}`);
      passedCount++;
    } catch (err) {
      console.error(`❌ [FAIL] Test ${totalTests}: ${name}`);
      console.error('   Error:', err.message);
    }
  }

  async function asyncTest(name, fn) {
    totalTests++;
    try {
      await fn();
      console.log(`✅ [PASS] Test ${totalTests}: ${name}`);
      passedCount++;
    } catch (err) {
      console.error(`❌ [FAIL] Test ${totalTests}: ${name}`);
      console.error('   Error:', err.message);
    }
  }

  // 1. Kiểm tra Entity Extraction trong IntentEngine (Panasonic KX-TSC11)
  test('Entity Extraction: Nhận diện đúng thương hiệu, mã model và ngành hàng', () => {
    const rawMsg = 'Điện thoại Panasonic KX-TSC11 có hàng không?';
    const intentRes = IntentEngine.analyzeIntent(rawMsg);
    assert.strictEqual(intentRes.slots.brand, 'panasonic', 'Brand phải là panasonic');
    assert.strictEqual(intentRes.slots.modelCode, 'KX-TSC11', 'ModelCode phải là KX-TSC11');
    assert.strictEqual(intentRes.slots.categoryDomain, 'TELECOM', 'Domain phải là TELECOM');
  });

  // 2. Chống nhầm lẫn sản phẩm (Anti-confusion) trong ReasoningEngine
  test('Anti-Confusion: Từ chối ghép điện thoại bàn với tủ lạnh hoặc đồ gia dụng', () => {
    const querySlots = {
      brand: 'panasonic',
      modelCode: 'KX-TSC11',
      categoryDomain: 'TELECOM'
    };
    const fakeProduct1 = {
      name: 'Tủ lạnh Panasonic Inverter 417 lít',
      field: 'Thiết bị gia dụng',
      specs_json: '{}'
    };
    const fakeProduct2 = {
      name: 'Đồ gia dụng Panasonic',
      field: 'Điện máy gia đình',
      specs_json: '{}'
    };

    const check1 = ReasoningEngine.disambiguateProductMatch({ querySlots, candidateProduct: fakeProduct1 });
    assert.strictEqual(check1.isValidMatch, false, 'Không được chấp nhận Tủ lạnh Panasonic');

    const check2 = ReasoningEngine.disambiguateProductMatch({ querySlots, candidateProduct: fakeProduct2 });
    assert.strictEqual(check2.isValidMatch, false, 'Không được chấp nhận Đồ gia dụng Panasonic');
  });

  // 3. Khách hỏi rộng (Broad category inquiry) -> Trí An chủ động hỏi lại 1 câu
  await asyncTest('Active Listening: Khách hỏi chung chung -> Hỏi lại 1 câu làm rõ nhu cầu', async () => {
    const res = await CentralBrainService.processChat({
      message: 'Tư vấn máy tính',
      history: []
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.stage, 'CLARIFYING', 'Stage phải là CLARIFYING');
    assert(res.reply.includes('máy tính') || res.reply.includes('Máy tính'), 'Phải đề cập máy tính');
    assert(res.reply.includes('ngân sách') || res.reply.includes('mục đích'), 'Phải hỏi lại ngân sách hoặc mục đích');
  });

  // 4. Kịch bản nòng cốt: Khách hỏi "Điện thoại Panasonic KX-TSC11 có hàng không?"
  await asyncTest('Core Scenario: Khách hỏi "Điện thoại Panasonic KX-TSC11 có hàng không?"', async () => {
    await db.run('DELETE FROM learning_knowledge_entries WHERE standard_question LIKE ?', ['%KX-TSC11%']);
    const res = await CentralBrainService.processChat({
      message: 'Điện thoại Panasonic KX-TSC11 có hàng không?',
      history: []
    });

    console.log('\n--- Trí An Response for Panasonic KX-TSC11 ---');
    console.log(res.reply);
    console.log('-----------------------------------------------\n');

    assert.strictEqual(res.success, true);
    // 1. Phải thông báo chưa tìm thấy sản phẩm trong dữ liệu
    assert(
      res.reply.toLowerCase().includes('chưa tìm thấy') || res.reply.toLowerCase().includes('chưa có'),
      'Phải thông báo chưa tìm thấy sản phẩm'
    );
    assert(
      res.reply.includes('Panasonic') || res.reply.includes('KX-TSC11') || res.reply.toLowerCase().includes('điện thoại'),
      'Phải nhắc đến tên sản phẩm cần tìm'
    );
    // 2. Phải xin số điện thoại để nhân viên hỗ trợ kho và báo giá
    assert(
      res.reply.toLowerCase().includes('số điện thoại') || res.reply.toLowerCase().includes('sđt'),
      'Phải xin số điện thoại'
    );
    // 3. Phải giới thiệu danh mục Cột 2
    assert(res.reply.includes('Cột 2'), 'Phải gợi ý mở Cột 2');
    // 4. Tuyệt đối không được nhầm sang đồ gia dụng hoặc tủ lạnh
    assert(!res.reply.toLowerCase().includes('đồ gia dụng panasonic'), 'Không được nói là đồ gia dụng Panasonic');
    assert(!res.reply.toLowerCase().includes('tủ lạnh panasonic'), 'Không được nói là tủ lạnh Panasonic');
    // 5. Tuyệt đối không được có "của anh Quang Nhựt Trí" hay tài liệu ngân hàng
    assert(!res.reply.includes('Quang Nhựt Trí'), 'Không được dính tên Quang Nhựt Trí');
    assert(!res.reply.toLowerCase().includes('nam a bank'), 'Không được rò rỉ Nam A Bank');
  });

  // 5. Kịch bản nòng cốt 2: Khách hỏi "em bán điện thoại bàn panasonic không"
  await asyncTest('Core Scenario: Khách hỏi "em bán điện thoại bàn panasonic không"', async () => {
    const res = await CentralBrainService.processChat({
      message: 'em bán điện thoại bàn panasonic không',
      history: []
    });

    assert.strictEqual(res.success, true);
    assert(
      res.reply.toLowerCase().includes('chưa tìm thấy') || res.reply.toLowerCase().includes('chưa có'),
      'Phải thông báo chưa tìm thấy sản phẩm'
    );
    assert(
      res.reply.toLowerCase().includes('số điện thoại') || res.reply.toLowerCase().includes('sđt'),
      'Phải xin số điện thoại'
    );
    assert(!res.reply.toLowerCase().includes('đồ gia dụng panasonic'), 'Không được trả lời là Đồ gia dụng Panasonic');
  });

  // 6. Nhân cách thống nhất TRÍ AN trong câu chào
  await asyncTest('Unified Persona: Giới thiệu chuẩn TRÍ AN trong lời chào', async () => {
    const res = await CentralBrainService.processChat({
      message: 'Xin chào',
      history: []
    });
    assert.strictEqual(res.success, true);
    assert(res.reply.includes('TRÍ AN'), 'Phải xưng danh là TRÍ AN');
    assert(!res.reply.includes('Quang Nhựt Trí'), 'Không được có tên Quang Nhựt Trí');
  });

  // 7. Bảo toàn sản phẩm có sẵn: "MÁY TÍNH XÁCH TAY LENOVO ThinkPad E14"
  await asyncTest('Catalog Preservation: Hỏi sản phẩm có sẵn trong kho', async () => {
    const res = await CentralBrainService.processChat({
      message: 'Giá ThinkPad E14 là bao nhiêu',
      history: []
    });
    assert.strictEqual(res.success, true);
    assert(res.reply.includes('ThinkPad E14') || res.reply.includes('32.790.000'), 'Phải trả lời đúng giá và tên máy');
    assert(res.revealCatalog === true, 'Phải mở Cột 2');
  });

  // 8. Chống câu trả lời dở dang (Incomplete sentence guard)
  test('Incomplete Sentence Guard: Cắt tỉa câu bị cụt', () => {
    const incompleteText = 'Sản phẩm này mang lại nhiều tiện ích thông minh cho gia đình với';
    const cleaned = VerificationEngine.sanitizeAndVerifyResponse(incompleteText);
    assert(!cleaned.endsWith('với'), 'Không được kết thúc bằng từ nối bị cụt');
    assert(cleaned.endsWith('.'), 'Phải kết thúc bằng dấu chấm hoàn chỉnh');
  });

  console.log(`\n================================================================`);
  console.log(`🏁 KẾT QUẢ KIỂM THỬ: ${passedCount}/${totalTests} BÀI TEST THÀNH CÔNG (${Math.round((passedCount / totalTests) * 100)}%)`);
  console.log(`================================================================\n`);

  if (passedCount === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
