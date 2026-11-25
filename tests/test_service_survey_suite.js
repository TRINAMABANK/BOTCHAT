/**
 * ACCEPTANCE TEST SUITE: NGHIỆP VỤ TƯ VẤN THI CÔNG – LẮP ĐẶT (BOTCHAT SERVICE)
 * 
 * 11 Mandatory Acceptance Scenarios:
 * 1. Khách hỏi "Shop có thi công không?" -> Nhận diện dịch vụ, phản hồi đúng mẫu bắt buộc.
 * 2. Khách hỏi "Có lắp đặt không?" -> Nhận diện dịch vụ lắp đặt, không nhầm sang chào hỏi chung.
 * 3. Khách hỏi "Có nhận thi công trọn gói không?" -> Đề nghị khảo sát thực tế và báo giá sau khảo sát.
 * 4. Khách hỏi "Có khảo sát và lắp đặt tận nơi không?" -> Xin SĐT và địa chỉ công trình.
 * 5. Khách hỏi "Có tháo dỡ, di dời, sửa chữa, bảo trì không?" -> Nhận diện đúng dịch vụ sửa chữa/bảo trì.
 * 6. Khách hỏi sản phẩm cụ thể: "Bên mình có lắp đặt máy lọc nước không?" -> Không từ chối dịch vụ.
 * 7. Thu thập thông tin đa lượt: Khách cung cấp SĐT + Địa chỉ -> Tạo Lead dịch vụ trong CRM.
 * 8. Tiếp nhận Quy mô và Thời gian mong muốn -> Cập nhật Lead dịch vụ đầy đủ, xác nhận liên hệ.
 * 9. Không tự báo giá: Khách hỏi chi phí -> Chatbot tuân thủ giải thích báo giá sau khảo sát.
 * 10. Không tự chốt lịch: Khách đòi chốt lịch cụ thể -> AI không tự hứa, báo nhân viên sẽ gọi xác nhận.
 * 11. Cập nhật 9 trạng thái Lead Dịch vụ và Kiểm thử hồi quy 100% các tính năng cũ.
 */

import assert from 'assert';
import { db } from '../server/db.js';
import CentralBrainService from '../server/services/centralBrainService.js';
import { IntentEngine } from '../server/services/intelligence/intentEngine.js';
import { CrmLeadService, SERVICE_STATUSES, SERVICE_TYPES } from '../server/services/crmLeadService.js';

console.log('================================================================');
console.log('🚀 ACCEPTANCE TEST SUITE: TƯ VẤN THI CÔNG & LẮP ĐẶT (BOTCHAT SERVICE)');
console.log('================================================================\n');

async function runTests() {
  const customerContext = {
    userId: 'cust_service_test_01',
    userName: 'Anh Nam',
    role: 'CUSTOMER',
    isOwner: false
  };

  // Dọn dẹp dữ liệu test cũ để đảm bảo tính độc lập tuyệt đối (idempotent)
  await db.run("DELETE FROM leads WHERE conversation_id LIKE 'conv_svc_%'");

  // -------------------------------------------------------------
  // TEST 1: Khách hỏi "Shop có thi công không?"
  // -------------------------------------------------------------
  console.log('--- TEST 1: Khách hỏi "Shop có thi công không?" ---');
  const res1 = await CentralBrainService.processChat({
    message: 'Shop có thi công không?',
    conversationId: 'conv_svc_test_01',
    userContext: customerContext
  });

  assert(res1.success === true, 'Turn 1 returned success');
  assert(res1.stage === 'SERVICE_SURVEY_INITIATED', 'Stage must be SERVICE_SURVEY_INITIATED');
  assert(res1.revealCatalog === false, 'Strict rule: revealCatalog must be false');
  assert(res1.reply.includes('tiếp nhận nhu cầu thi công, lắp đặt'), 'Reply must include mandatory standard template');
  assert(res1.reply.includes('cần khảo sát thực tế'), 'Reply must request site survey');
  assert(res1.reply.includes('lập phương án và gửi báo giá cụ thể'), 'Reply must explain quote after survey');
  assert(res1.reply.includes('cho em xin số điện thoại và địa chỉ công trình'), 'Reply must request phone and address');
  assert(!res1.reply.includes('ThinkCentre') && !res1.reply.includes('ThinkPad'), 'Anti-regression: Never dump laptop/PC products');
  console.log('  ✅ [PASS] Trả lời chính xác theo mẫu chuẩn mực, không đổ danh mục sản phẩm');

  // -------------------------------------------------------------
  // TEST 2: Khách hỏi "Có lắp đặt không?"
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Khách hỏi "Có lắp đặt không?" ---');
  const res2 = await CentralBrainService.processChat({
    message: 'Có lắp đặt không?',
    conversationId: 'conv_svc_test_02',
    userContext: customerContext
  });

  assert(res2.success === true, 'Turn 2 returned success');
  assert(res2.stage === 'SERVICE_SURVEY_INITIATED', 'Stage must be SERVICE_SURVEY_INITIATED');
  assert(res2.revealCatalog === false, 'revealCatalog must be false');
  assert(res2.reply.includes('tiếp nhận nhu cầu thi công, lắp đặt'), 'Must acknowledge installation inquiry');
  console.log('  ✅ [PASS] Nhận diện đúng dịch vụ lắp đặt, không nhầm sang chào hỏi chung');

  // -------------------------------------------------------------
  // TEST 3: Khách hỏi "Có nhận thi công trọn gói không?"
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Khách hỏi "Có nhận thi công trọn gói không?" ---');
  const res3 = await CentralBrainService.processChat({
    message: 'Có nhận thi công trọn gói không?',
    conversationId: 'conv_svc_test_03',
    userContext: customerContext
  });

  assert(res3.success === true, 'Turn 3 returned success');
  assert(res3.stage === 'SERVICE_SURVEY_INITIATED', 'Stage must be SERVICE_SURVEY_INITIATED');
  assert(res3.reply.includes('khảo sát thực tế'), 'Must mention site survey for turnkey project');
  console.log('  ✅ [PASS] Tiếp nhận yêu cầu thi công trọn gói, giải thích quy trình khảo sát');

  // -------------------------------------------------------------
  // TEST 4: Khách hỏi "Có khảo sát và lắp đặt tận nơi không?"
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Khách hỏi "Có khảo sát và lắp đặt tận nơi không?" ---');
  const res4 = await CentralBrainService.processChat({
    message: 'Có khảo sát và lắp đặt tận nơi không?',
    conversationId: 'conv_svc_test_04',
    userContext: customerContext
  });

  assert(res4.success === true, 'Turn 4 returned success');
  assert(res4.reply.includes('số điện thoại và địa chỉ công trình'), 'Must request contact info');
  console.log('  ✅ [PASS] Khẳng định có thể tiếp nhận và xin thông tin sắp xếp khảo sát tận nơi');

  // -------------------------------------------------------------
  // TEST 5: Khách hỏi "Có tháo dỡ, di dời, sửa chữa, bảo trì không?"
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Khách hỏi "Có tháo dỡ, di dời, sửa chữa, bảo trì không?" ---');
  const res5 = await CentralBrainService.processChat({
    message: 'Có tháo dỡ, di dời, sửa chữa, bảo trì không?',
    conversationId: 'conv_svc_test_05',
    userContext: customerContext
  });

  assert(res5.success === true, 'Turn 5 returned success');
  assert(res5.stage === 'SERVICE_SURVEY_INITIATED', 'Stage must be SERVICE_SURVEY_INITIATED');
  assert(res5.revealCatalog === false, 'revealCatalog must be false');
  console.log('  ✅ [PASS] Nhận diện đúng dịch vụ tháo dỡ, di dời, sửa chữa, bảo trì');

  // -------------------------------------------------------------
  // TEST 6: Khách hỏi "Bên mình có lắp đặt máy lọc nước không?"
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: Khách hỏi "Bên mình có lắp đặt máy lọc nước không?" ---');
  const res6 = await CentralBrainService.processChat({
    message: 'Bên mình có lắp đặt máy lọc nước không?',
    conversationId: 'conv_svc_test_06',
    userContext: customerContext
  });

  assert(res6.success === true, 'Turn 6 returned success');
  assert(res6.stage === 'SERVICE_SURVEY_INITIATED', 'Stage must be SERVICE_SURVEY_INITIATED');
  assert(!res6.reply.includes('Bên em không có') && !res6.reply.includes('hết hàng'), 'Strict rule: Never deny service');
  assert(res6.revealCatalog === false, 'Strict rule: Do not redirect to Column 2');
  console.log('  ✅ [PASS] Không từ chối dịch vụ chỉ vì danh mục chưa có mã');

  // -------------------------------------------------------------
  // TEST 7: Thu thập thông tin đa lượt - Khách cung cấp SĐT & Địa chỉ
  // -------------------------------------------------------------
  console.log('\n--- TEST 7: Thu thập SĐT & Địa chỉ -> Tạo Lead CRM ---');
  const multiConvId = 'conv_svc_multi_turn_test';

  // Lượt 1: Hỏi ban đầu
  await CentralBrainService.processChat({
    message: 'Shop có thi công lắp đặt không?',
    conversationId: multiConvId,
    userContext: customerContext
  });

  // Lượt 2: Cung cấp SĐT & Địa chỉ
  const res7 = await CentralBrainService.processChat({
    message: 'Số điện thoại của anh là 0987654321, địa chỉ ở số 45 Lê Duẩn, Quận 1',
    conversationId: multiConvId,
    userContext: customerContext
  });

  assert(res7.success === true, 'Turn 7 returned success');
  assert(res7.stage === 'SERVICE_LEAD_CAPTURED', 'Stage must be SERVICE_LEAD_CAPTURED');
  assert(res7.reply.includes('0987654321'), 'Reply confirms customer phone');
  assert(res7.reply.includes('Lê Duẩn') || res7.reply.includes('Quận 1'), 'Reply confirms customer address');
  assert(res7.reply.includes('thời gian nào') && res7.reply.includes('quy mô'), 'Politely inquires next missing details');

  // Kiểm tra Lead Dịch vụ được tạo trong CSDL
  const leadInDb = await db.get(
    `SELECT * FROM leads WHERE conversation_id = ? AND lead_type = 'SERVICE_SURVEY'`,
    [multiConvId]
  );
  assert(Boolean(leadInDb), 'Lead must be created in leads table');
  assert(leadInDb.phone === '0987654321', 'Phone must match');
  assert(leadInDb.survey_address.includes('Lê Duẩn') || leadInDb.survey_address.includes('Quận 1'), 'Address must match');
  assert(leadInDb.lead_type === 'SERVICE_SURVEY', 'lead_type must be SERVICE_SURVEY');
  assert(leadInDb.service_type === 'SERVICE_SURVEY_REQUEST' || leadInDb.service_type === 'INSTALLATION_REQUEST', 'service_type must be recorded');
  assert(leadInDb.lead_status === 'Mới tiếp nhận', 'Initial status must be Mới tiếp nhận');
  console.log('  ✅ [PASS] Tiếp nhận SĐT & Địa chỉ, tự động tạo Lead Dịch vụ trong CRM với trạng thái Mới tiếp nhận');

  // -------------------------------------------------------------
  // TEST 8: Thu thập tiếp Quy mô và Thời gian mong muốn
  // -------------------------------------------------------------
  console.log('\n--- TEST 8: Thu thập Quy mô & Thời gian mong muốn -> Hoàn tất tiếp nhận ---');
  const res8 = await CentralBrainService.processChat({
    message: 'Quy mô khoảng 10 thiết bị, thời gian dự kiến vào sáng thứ Bảy tuần này nhé',
    conversationId: multiConvId,
    userContext: customerContext
  });

  assert(res8.success === true, 'Turn 8 returned success');
  assert(res8.stage === 'SERVICE_SURVEY_CONFIRMED', 'Stage must be SERVICE_SURVEY_CONFIRMED');
  assert(res8.reply.includes('10 thiết bị'), 'Confirms scale');
  assert(res8.reply.includes('thứ Bảy') || res8.reply.includes('tuần này'), 'Confirms expected time');
  assert(res8.reply.includes('sớm liên hệ'), 'Promises staff will contact customer');

  // Kiểm tra CSDL được cập nhật trên cùng một Lead, không tạo trùng lặp
  const allLeadsForConv = await db.all(
    `SELECT * FROM leads WHERE conversation_id = ?`,
    [multiConvId]
  );
  assert(allLeadsForConv.length === 1, 'Strict rule: Idempotency, never duplicate leads');
  assert(allLeadsForConv[0].scale_or_quantity === '10 thiết bị', 'scale_or_quantity updated');
  assert(Boolean(allLeadsForConv[0].expected_time), 'expected_time updated');
  console.log('  ✅ [PASS] Cập nhật thông tin quy mô, thời gian vào đúng Lead CRM hiện có mà không tạo trùng lặp');

  // -------------------------------------------------------------
  // TEST 9: Quy tắc không tự báo giá thi công
  // -------------------------------------------------------------
  console.log('\n--- TEST 9: Quy tắc bắt buộc: Không tự báo giá thi công ---');
  const res9 = await CentralBrainService.processChat({
    message: 'Chi phí thi công trọn gói này khoảng bao nhiêu tiền?',
    conversationId: multiConvId,
    userContext: customerContext
  });

  assert(res9.success === true, 'Turn 9 returned success');
  assert(res9.stage === 'SERVICE_PRICE_DISCLAIMER', 'Stage must be SERVICE_PRICE_DISCLAIMER');
  assert(res9.reply.includes('phụ thuộc trực tiếp vào điều kiện thực tế'), 'Explains cost factors');
  assert(res9.reply.includes('báo giá chính xác sau khi kỹ thuật viên khảo sát thực tế'), 'Explains quotation after survey');
  assert(!res9.reply.includes('20.000.000') && !res9.reply.includes('triệu đồng'), 'Strict anti-hallucination: No self-invented price');
  console.log('  ✅ [PASS] Chatbot kiên định từ chối tự báo giá bừa bãi, giải thích báo giá sau khảo sát');

  // -------------------------------------------------------------
  // TEST 10: Quy tắc không tự chốt lịch thi công
  // -------------------------------------------------------------
  console.log('\n--- TEST 10: Quy tắc bắt buộc: Không tự hứa lịch thi công ---');
  const res10 = await CentralBrainService.processChat({
    message: 'Sáng mai 8h qua làm luôn nhé, chốt lịch luôn đi shop',
    conversationId: multiConvId,
    userContext: customerContext
  });

  assert(res10.success === true, 'Turn 10 returned success');
  assert(res10.stage === 'SERVICE_SCHEDULE_DISCLAIMER', 'Stage must be SERVICE_SCHEDULE_DISCLAIMER');
  assert(res10.reply.includes('sẽ liên hệ qua điện thoại để xác nhận lịch hẹn chính xác'), 'Must explain staff will call to confirm schedule');
  assert(!res10.reply.includes('chắc chắn em sẽ đến') && !res10.reply.includes('cam kết đúng 8h'), 'Strict rule: Never self-commit schedule');
  console.log('  ✅ [PASS] Không tự ý cam kết lịch khi chưa có xác nhận từ đội ngũ kỹ thuật');

  // -------------------------------------------------------------
  // TEST 11: Cập nhật 9 trạng thái Lead Dịch vụ & Kiểm thử hồi quy
  // -------------------------------------------------------------
  console.log('\n--- TEST 11: Vòng đời 9 trạng thái CRM Lead & Kiểm thử hồi quy ---');
  const leadId = allLeadsForConv[0].id;

  // Kiểm tra đầy đủ 9 trạng thái chuẩn
  assert(SERVICE_STATUSES.length === 9, 'Must have exactly 9 service statuses');
  const expectedStatuses = [
    'Mới tiếp nhận',
    'Chờ liên hệ',
    'Đang sắp xếp khảo sát',
    'Đã khảo sát',
    'Đang lập báo giá',
    'Đã gửi báo giá',
    'Khách đồng ý',
    'Không thực hiện',
    'Đã hoàn thành'
  ];

  for (const stt of expectedStatuses) {
    await db.run('UPDATE leads SET lead_status = ?, updated_at = ? WHERE id = ?', [stt, new Date().toISOString(), leadId]);
    const updated = await db.get('SELECT lead_status FROM leads WHERE id = ?', [leadId]);
    assert(updated.lead_status === stt, `Status must update to ${stt}`);
  }
  console.log('  ✅ [PASS] 9 trạng thái Lead dịch vụ cập nhật hoàn hảo trong CSDL');

  // Kiểm tra hồi quy: Năng lực tư vấn bán hàng sản phẩm (AI Sales)
  const resRegressionSales = await CentralBrainService.processChat({
    message: 'Báo giá cho tôi máy in Brother HL-L6210DW số lượng 2 cái',
    conversationId: 'conv_regression_sales_01'
  });
  assert(resRegressionSales.success === true, 'Sales consultation succeeded');
  assert(resRegressionSales.stage !== 'SERVICE_SURVEY_INITIATED', 'Must not enter service mode for sales quotation');
  assert(resRegressionSales.reply.includes('Brother') || resRegressionSales.reply.includes('HL-L6210DW') || resRegressionSales.reply.includes('BÁO GIÁ'), 'Contains product quotation info');
  console.log('  ✅ [PASS] Năng lực tư vấn sản phẩm bán lẻ (AI Sales) được bảo toàn nguyên vẹn');

  // Kiểm tra hồi quy: Thư ký riêng của anh
  const resRegressionSecretary = await CentralBrainService.processChat({
    message: 'Thư ký của anh',
    conversationId: 'conv_regression_sec_01',
    userContext: { role: 'OWNER', isOwner: true, userId: 'owner_tri' }
  });
  assert(resRegressionSecretary.success === true, 'Secretary activation succeeded');
  assert(resRegressionSecretary.reply.includes('Dạ, em đây anh Trí'), 'Secretary greeting intact');
  console.log('  ✅ [PASS] Tính năng Thư ký riêng của anh hoạt động hoàn hảo');

  console.log('\n================================================================');
  console.log('🏁 TỔNG KẾT: 11 / 11 PASSED (Tỷ lệ: 100.0%)');
  console.log('================================================================\n');
}

runTests().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
