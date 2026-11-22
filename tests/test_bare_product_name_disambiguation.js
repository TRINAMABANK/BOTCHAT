import assert from 'assert';
import { SalesEngine, isProductOrDeviceTerm, hasBlockedNameTokens } from '../server/salesEngine.js';
import { db } from '../server/db.js';

async function runTests() {
  console.log('================================================================');
  console.log('🧪 KIỂM THỬ: PHÂN BIỆT SẢN PHẨM KHÔNG CÓ TRONG HỆ THỐNG VÀ TÊN KHÁCH HÀNG');
  console.log('================================================================\n');

  // TEST 1: Kiểm tra hàm chặn từ khoá thiết bị và sản phẩm làm tên khách hàng
  console.log('TEST 1: Kiểm tra chặn từ khoá sản phẩm & thiết bị...');
  assert.strictEqual(isProductOrDeviceTerm('tủ lạnh'), true, 'tủ lạnh phải là product/device term');
  assert.strictEqual(isProductOrDeviceTerm('máy giặt'), true, 'máy giặt phải là product/device term');
  assert.strictEqual(isProductOrDeviceTerm('tai nghe'), true, 'tai nghe phải là product/device term');
  assert.strictEqual(isProductOrDeviceTerm('laptop'), true, 'laptop phải là product/device term');
  assert.strictEqual(hasBlockedNameTokens('Tủ Lạnh'), true, 'Tủ Lạnh phải bị chặn không được làm tên');
  assert.strictEqual(hasBlockedNameTokens('Máy Giặt'), true, 'Máy Giặt phải bị chặn không được làm tên');
  assert.strictEqual(hasBlockedNameTokens('Nguyễn Văn Nam'), false, 'Tên người thật không được bị chặn');
  console.log('  ✅ [PASS] Chặn hoàn toàn các từ khoá thiết bị, gia dụng, sản phẩm làm tên');

  // TEST 2: Khi mới vào ô chat, khách gõ "tủ lạnh" (đi thẳng vào sản phẩm, không hỏi giá/tính năng)
  console.log('\nTEST 2: Khách mới vào ô chat gõ "tủ lạnh"...');
  const convId1 = 'test_disambig_conv_' + Date.now();
  const res1 = await SalesEngine.processMessage({
    conversationId: convId1,
    message: 'tủ lạnh'
  });

  console.log('  Reply Turn 1:\n', res1.reply);
  assert.ok(res1.reply.includes('chưa tìm thấy sản phẩm') || res1.reply.includes('tủ lạnh'), 'Phải báo chưa tìm thấy sản phẩm tủ lạnh');
  assert.ok(res1.reply.includes('sản phẩm bạn/anh/chị đang tìm kiếm hay là tên của mình'), 'Phải hỏi lại khách để chốt lại là sản phẩm hay tên');
  
  // Kiểm tra metadata turn 1
  const lastMsg1 = await db.get(
    "SELECT metadata_json FROM messages WHERE conversation_id = ? AND sender_type = 'assistant' ORDER BY created_at DESC LIMIT 1",
    [convId1]
  );
  const meta1 = JSON.parse(lastMsg1.metadata_json);
  assert.strictEqual(meta1.customerProfile.name, null, 'TUYỆT ĐỐI KHÔNG ĐƯỢC lấy "Tủ Lạnh" làm tên khách');
  assert.strictEqual(meta1.customerProfile.pendingClarification?.type, 'NAME_OR_PRODUCT', 'Phải ghi nhận pendingClarification');
  console.log('  ✅ [PASS] AI phát hiện không có trong hệ thống và hỏi lại khách để chốt sản phẩm hay tên; tên khách vẫn là null');

  // TEST 3: Tình huống như trong ảnh chụp của khách - Lượt tiếp theo khách hỏi "có bao nhiêu loại trà"
  console.log('\nTEST 3: Khách hỏi tiếp "có bao nhiêu loại trà" (như ảnh thực tế của người dùng)...');
  const res2 = await SalesEngine.processMessage({
    conversationId: convId1,
    message: 'có bao nhiêu loại trà'
  });

  console.log('  Reply Turn 2:\n', res2.reply);
  assert.strictEqual(res2.reply.includes('Tủ Lạnh'), false, 'TUYỆT ĐỐI KHÔNG ĐƯỢC gọi khách là "bạn Tủ Lạnh"');
  assert.strictEqual(res2.reply.includes('bạn Tủ Lạnh'), false, 'TUYỆT ĐỐI KHÔNG ĐƯỢC chứa cụm "bạn Tủ Lạnh"');
  assert.ok(res2.reply.includes('trà') || res2.reply.includes('Oolong'), 'Phải tư vấn về danh mục trà');

  const lastMsg2 = await db.get(
    "SELECT metadata_json FROM messages WHERE conversation_id = ? AND sender_type = 'assistant' ORDER BY created_at DESC LIMIT 1",
    [convId1]
  );
  const meta2 = JSON.parse(lastMsg2.metadata_json);
  assert.strictEqual(meta2.customerProfile.name, null, 'Tên khách hàng vẫn là null, không bị nhiễm "Tủ Lạnh"');
  console.log('  ✅ [PASS] AI trả lời về trà tự nhiên, gọi "bạn", hoàn toàn KHÔNG CÒN nhầm thành "bạn Tủ Lạnh"');

  // TEST 4: Khách xác nhận "đó là sản phẩm tìm kiếm"
  console.log('\nTEST 4: Khách vào ô chat nhắn "tủ lạnh", sau đó xác nhận "sản phẩm"...');
  const convId2 = 'test_disambig_prod_' + Date.now();
  await SalesEngine.processMessage({ conversationId: convId2, message: 'tủ lạnh' });
  const resConfirmProd = await SalesEngine.processMessage({
    conversationId: convId2,
    message: 'sản phẩm bạn ơi'
  });

  console.log('  Reply Confirm Product:\n', resConfirmProd.reply);
  assert.ok(resConfirmProd.reply.includes('đang tìm kiếm sản phẩm **tủ lạnh**'), 'Phải xác nhận khách đang tìm sản phẩm tủ lạnh');
  assert.ok(resConfirmProd.reply.includes('Số điện thoại'), 'Phải hướng dẫn để lại số điện thoại');
  console.log('  ✅ [PASS] Nhận diện đúng khách xác nhận là sản phẩm tìm kiếm');

  // TEST 5: Khách xác nhận "đó là tên của tôi"
  console.log('\nTEST 5: Khách vào ô chat nhắn "Bình An", sau đó xác nhận "đây là tên tôi"...');
  const convId3 = 'test_disambig_name_' + Date.now();
  await SalesEngine.processMessage({ conversationId: convId3, message: 'Bình An' });
  const resConfirmName = await SalesEngine.processMessage({
    conversationId: convId3,
    message: 'đây là tên tôi'
  });

  console.log('  Reply Confirm Name:\n', resConfirmName.reply);
  assert.ok(resConfirmName.reply.includes('Bình An'), 'Phải xưng hô đúng tên Bình An khi khách xác nhận tên');
  console.log('  ✅ [PASS] Nhận diện đúng khi khách xác nhận là tên của mình');

  // TEST 6: Khách hỏi kèm giá trực tiếp "tủ lạnh giá bao nhiêu" -> Không hỏi lại tên, đi thẳng vào báo thiếu
  console.log('\nTEST 6: Khách hỏi kèm giá "tủ lạnh giá bao nhiêu"...');
  const convId4 = 'test_disambig_price_' + Date.now();
  const resPrice = await SalesEngine.processMessage({
    conversationId: convId4,
    message: 'tủ lạnh giá bao nhiêu'
  });

  console.log('  Reply Direct Price Query:\n', resPrice.reply);
  assert.ok(resPrice.reply.includes('chưa tìm thấy trong dữ liệu của shop'), 'Phải báo thiếu sản phẩm');
  assert.strictEqual(resPrice.reply.includes('hay là tên của mình'), false, 'Không hỏi lại tên vì đã có chữ "giá bao nhiêu"');
  console.log('  ✅ [PASS] Có từ hỏi giá thì xử lý chuẩn luồng thiếu sản phẩm');

  // TEST 7: Khách gõ thương hiệu "Kangaru" hoặc "Kangaroo" -> KHÔNG ĐƯỢC gán làm tên khách
  console.log('\nTEST 7: Khách gõ "Kangaru" vào ô chat...');
  assert.strictEqual(hasBlockedNameTokens('Kangaru'), true, 'Kangaru phải bị chặn không được làm tên');
  assert.strictEqual(hasBlockedNameTokens('Kangaroo'), true, 'Kangaroo phải bị chặn không được làm tên');
  assert.strictEqual(isProductOrDeviceTerm('Kangaru'), true, 'Kangaru phải là brand/device term');
  assert.strictEqual(isProductOrDeviceTerm('Kangaroo'), true, 'Kangaroo phải là brand/device term');

  const convIdKangaru = 'test_disambig_kangaru_' + Date.now();
  const resKangaru = await SalesEngine.processMessage({
    conversationId: convIdKangaru,
    message: 'Kangaru'
  });
  console.log('  Reply Kangaru Turn 1:\n', resKangaru.reply);
  assert.strictEqual(resKangaru.reply.includes('bạn Kangaru'), false, 'TUYỆT ĐỐI KHÔNG ĐƯỢC chứa cụm "bạn Kangaru"');

  const lastMsgKangaru = await db.get(
    "SELECT metadata_json FROM messages WHERE conversation_id = ? AND sender_type = 'assistant' ORDER BY created_at DESC LIMIT 1",
    [convIdKangaru]
  );
  const metaKangaru = JSON.parse(lastMsgKangaru.metadata_json);
  assert.strictEqual(metaKangaru.customerProfile.name, null, 'Tên khách hàng phải là null, KHÔNG ĐƯỢC là Kangaru');
  console.log('  ✅ [PASS] "Kangaru" không bao giờ bị nhận nhầm làm tên khách hàng!');

  // TEST 8: Khách gõ "dung chat" hoặc "nội dung chat" -> KHÔNG ĐƯỢC coi là sản phẩm
  console.log('\nTEST 8: Khách gõ "dung chat" hoặc "nội dung chat"...');
  const convIdDungChat = 'test_disambig_dungchat_' + Date.now();
  const resDungChat = await SalesEngine.processMessage({
    conversationId: convIdDungChat,
    message: 'dung chat'
  });
  console.log('  Reply Dung Chat:\n', resDungChat.reply);
  assert.strictEqual(resDungChat.reply.includes('sản phẩm dung chat'), false, 'TUYỆT ĐỐI KHÔNG ĐƯỢC nói "sản phẩm dung chat"');
  assert.strictEqual(resDungChat.reply.includes('chưa có sẵn sản phẩm dung chat'), false, 'KHÔNG ĐƯỢC coi "dung chat" là sản phẩm');
  assert.ok(resDungChat.reply.includes('Làm mới') || resDungChat.reply.includes('làm mới'), 'Phải nhận diện yêu cầu làm mới cuộc trò chuyện');
  assert.strictEqual(resDungChat.isResetPrompt, true, 'isResetPrompt phải bằng true');
  console.log('  ✅ [PASS] "dung chat" không bị nhận nhầm làm sản phẩm, được xử lý đúng là lệnh làm mới chat!');
  console.log('  ✅ [PASS] Có từ hỏi giá thì xử lý chuẩn luồng thiếu sản phẩm');

  console.log('\n================================================================');
  console.log('🏁 TẤT CẢ 6/6 TEST CASES ĐỀU ĐẠT CHUẨN (100% PASSED)');
  console.log('================================================================\n');
}

runTests().catch(err => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
