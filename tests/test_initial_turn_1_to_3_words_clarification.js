import assert from 'assert';
import db from '../server/db.js';
import SalesEngine from '../server/salesEngine.js';

async function runTests() {
  console.log('--- STARTING INITIAL TURN 1-3 WORDS CLARIFICATION TESTS ---');

  // Test 1: Khách vào chat nhắn "tủ lạnh" (1-3 từ, không có trong catalog) ngay sau câu chào ban đầu
  const convId1 = 'test_clarify_turn1_' + Date.now();
  const res1 = await SalesEngine.processMessage({
    conversationId: convId1,
    message: 'tủ lạnh',
    customerInfo: {},
    actionType: null
  });

  console.log('\n[Test 1 - Khách nhắn "tủ lạnh" lần đầu]:\n', res1.reply);
  console.log('Suggested Actions:', res1.suggestedActions);

  assert(
    res1.reply.includes('Tủ Lạnh') && (res1.reply.includes('tên của bạn') || res1.reply.includes('tên sản phẩm')),
    'Phải hỏi lại từ "Tủ Lạnh" là tên của khách hay là tên sản phẩm cần tìm'
  );
  assert(
    res1.suggestedActions && res1.suggestedActions.some(a => a.action === 'confirm_name') && res1.suggestedActions.some(a => a.action === 'confirm_product'),
    'Phải có 2 nút xác nhận tên và xác nhận sản phẩm'
  );
  assert(
    !res1.reply.toLowerCase().includes('chào bạn tủ lạnh') && !res1.reply.toLowerCase().includes('bạn tủ lạnh ơi'),
    'Tuyệt đối không được gọi khách là "bạn Tủ Lạnh"'
  );
  console.log('✅ Test 1 Passed: Nhận diện chính xác 1-3 từ lần đầu và hỏi lại khách hàng.');

  // Test 2: Khách xác nhận "🔍 'Tủ Lạnh' là sản phẩm cần tìm" (hoặc nhắn "sản phẩm")
  const res2 = await SalesEngine.processMessage({
    conversationId: convId1,
    message: '🔍 "Tủ Lạnh" là sản phẩm cần tìm',
    customerInfo: {},
    actionType: 'confirm_product'
  });

  console.log('\n[Test 2 - Khách xác nhận là sản phẩm]:\n', res2.reply);
  assert(
    res2.reply.includes('Tủ Lạnh') && res2.reply.includes('Số điện thoại') && res2.reply.includes('Cột 2'),
    'Phải xử lý theo luồng sản phẩm chưa có trong dữ liệu (3 bước chuẩn kịch bản)'
  );
  assert(
    !res2.reply.toLowerCase().includes('chào bạn tủ lạnh') && !res2.reply.toLowerCase().includes('mời bạn tủ lạnh'),
    'Không được gán tên khách là Tủ Lạnh'
  );
  console.log('✅ Test 2 Passed: Xác nhận là sản phẩm và xử lý chuẩn theo kịch bản thiếu hàng.');

  // Test 3: Khách nhắn tên "Quang Trí" ở Turn 1, sau đó xác nhận là tên ở Turn 2
  const convId3 = 'test_clarify_name_' + Date.now();
  const res3_1 = await SalesEngine.processMessage({
    conversationId: convId3,
    message: 'Quang Trí',
    customerInfo: {},
    actionType: null
  });

  console.log('\n[Test 3 - Turn 1 khách nhắn "Quang Trí"]:\n', res3_1.reply);
  assert(
    res3_1.reply.includes('Quang Trí') && res3_1.reply.includes('tên của bạn'),
    'Turn 1 phải hỏi lại Quang Trí là tên hay sản phẩm'
  );

  const res3_2 = await SalesEngine.processMessage({
    conversationId: convId3,
    message: '👤 "Quang Trí" là tên của tôi',
    customerInfo: {},
    actionType: 'confirm_name'
  });

  console.log('\n[Test 3 - Turn 2 khách xác nhận là tên]:\n', res3_2.reply);
  assert(
    res3_2.reply.includes('Quang Trí') && (res3_2.reply.includes('hân hạnh') || res3_2.reply.includes('ghi nhận tên')),
    'Turn 2 phải ghi nhận và chào bạn Quang Trí chu đáo'
  );
  console.log('✅ Test 3 Passed: Xác nhận tên của khách chuẩn xác.');

  // Test 4: Khách khai báo tên trực tiếp "Tôi tên Nam" ngay Turn 1
  const convId4 = 'test_direct_name_' + Date.now();
  const res4 = await SalesEngine.processMessage({
    conversationId: convId4,
    message: 'Tôi tên Nam',
    customerInfo: {},
    actionType: null
  });

  console.log('\n[Test 4 - Khách nhắn "Tôi tên Nam"]:\n', res4.reply);
  assert(
    res4.reply.includes('Nam') && (res4.reply.includes('ghi nhận') || res4.reply.includes('gọi')),
    'Phải lập tức nhận diện tên Nam mà không cần hỏi lại'
  );
  console.log('✅ Test 4 Passed: Nhận diện trực tiếp câu giới thiệu tên chuẩn xác.');

  // Test 5: Khách nhắn "tủ lạnh" ở Turn 1, nhưng Turn 2 hỏi thẳng "có bao nhiêu loại trà"
  const convId5 = 'test_switch_topic_' + Date.now();
  await SalesEngine.processMessage({
    conversationId: convId5,
    message: 'tủ lạnh',
    customerInfo: {},
    actionType: null
  });

  const res5 = await SalesEngine.processMessage({
    conversationId: convId5,
    message: 'có bao nhiêu loại trà',
    customerInfo: {},
    actionType: null
  });

  console.log('\n[Test 5 - Khách hỏi "có bao nhiêu loại trà" sau khi hỏi tủ lạnh]:\n', res5.reply);
  assert(
    !res5.reply.toLowerCase().includes('bạn tủ lạnh') && !res5.reply.toLowerCase().includes('mời bạn tủ lạnh'),
    'Tuyệt đối không được gọi là "bạn Tủ Lạnh" khi khách hỏi về trà!'
  );
  assert(
    res5.reply.toLowerCase().includes('trà') || res5.reply.toLowerCase().includes('oolong'),
    'Phải tư vấn các dòng trà cho khách'
  );
  console.log('✅ Test 5 Passed: Không bị gán tên khách nhầm lẫn khi khách chuyển chủ đề.');

  // Test 6: Khách tên "nguyên" nhắn "nguyên" ở Turn 1 (dù "nguyên" có trong Bích Thủy Hoàn Nguyên)
  // BẮT BUỘC phải hỏi lại là tên hay sản phẩm, TUYỆT ĐỐI KHÔNG giới thiệu Bích Thủy Hoàn Nguyên!
  const convId6 = 'test_name_nguyen_' + Date.now();
  const res6_1 = await SalesEngine.processMessage({
    conversationId: convId6,
    message: 'nguyên',
    customerInfo: {},
    actionType: null
  });

  console.log('\n[Test 6 - Turn 1 khách nhắn "nguyên"]:\n', res6_1.reply);
  assert(
    res6_1.reply.includes('Nguyên') && res6_1.reply.includes('tên của bạn/anh/chị'),
    'Phải hỏi lại từ "Nguyên" là tên của bạn hay sản phẩm cần tìm'
  );
  assert(
    !res6_1.reply.toLowerCase().includes('bích thủy hoàn nguyên'),
    'Tuyệt đối không được tự ý giới thiệu sản phẩm Bích Thủy Hoàn Nguyên khi khách mới chỉ nhắn "nguyên"'
  );
  assert(
    res6_1.suggestedActions && res6_1.suggestedActions.some(a => a.action === 'confirm_name'),
    'Phải có nút [👤 "Nguyên" là tên của tôi]'
  );

  // Turn 2: Khách xác nhận là tên
  const res6_2 = await SalesEngine.processMessage({
    conversationId: convId6,
    message: '👤 "Nguyên" là tên của tôi',
    customerInfo: {},
    actionType: 'confirm_name'
  });

  console.log('\n[Test 6 - Turn 2 khách xác nhận là tên Nguyên]:\n', res6_2.reply);
  assert(
    res6_2.reply.includes('bạn Nguyên') || res6_2.reply.includes('Nguyên'),
    'Phải chào và ghi nhận bạn Nguyên'
  );

  // Turn 3: Khách hỏi "có bao nhiêu loại trà" -> Phải xưng hô đúng "bạn Nguyên"
  const res6_3 = await SalesEngine.processMessage({
    conversationId: convId6,
    message: 'có bao nhiêu loại trà',
    customerInfo: {},
    actionType: null
  });

  console.log('\n[Test 6 - Turn 3 bạn Nguyên hỏi về trà]:\n', res6_3.reply);
  assert(
    res6_3.reply.includes('bạn Nguyên'),
    'Phải xưng hô đúng "bạn Nguyên", không được gọi sai'
  );
  console.log('✅ Test 6 Passed: Khách tên "nguyên" được hỏi làm rõ, xác nhận tên và xưng hô chuẩn xác.');

  // Test 7: Khách nhắn "nguyên" ở Turn 1, nhưng Turn 2 chọn "🔍 'Nguyên' là sản phẩm cần tìm"
  const convId7 = 'test_prod_nguyen_' + Date.now();
  await SalesEngine.processMessage({
    conversationId: convId7,
    message: 'nguyên',
    customerInfo: {},
    actionType: null
  });

  const res7 = await SalesEngine.processMessage({
    conversationId: convId7,
    message: '🔍 "Nguyên" là sản phẩm cần tìm',
    customerInfo: {},
    actionType: 'confirm_product'
  });

  console.log('\n[Test 7 - Turn 2 xác nhận "Nguyên" là sản phẩm]:\n', res7.reply);
  assert(
    res7.reply.includes('Bích Thủy Hoàn Nguyên 182Gr'),
    'Phải tìm thấy và giới thiệu Bích Thủy Hoàn Nguyên khi khách xác nhận là sản phẩm'
  );
  console.log('✅ Test 7 Passed: Xác nhận là sản phẩm tìm kiếm thì giới thiệu đúng Bích Thủy Hoàn Nguyên.');

  console.log('\n🎉 ALL 7 INITIAL TURN 1-3 WORDS CLARIFICATION TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
