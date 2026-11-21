import assert from 'assert';
import db from '../server/db.js';
import CentralBrainService from '../server/services/centralBrainService.js';
import IntentEngine from '../server/services/intelligence/intentEngine.js';
import SmartSalesConsultant from '../server/services/intelligence/smartSalesConsultant.js';

console.log('================================================================');
console.log('🚀 TEST SUITE: TRÍ AN LEVEL 2.0 – PROMPT 04: TRỢ LÝ TƯ VẤN & BÁN HÀNG THÔNG MINH');
console.log('================================================================\n');

async function runPrompt04Tests() {
  let passedCount = 0;
  let totalTests = 0;

  async function testStep(name, fn) {
    totalTests++;
    try {
      await fn();
      console.log(`✅ [PASS] Requirement ${totalTests}: ${name}`);
      passedCount++;
    } catch (err) {
      console.error(`❌ [FAIL] Requirement ${totalTests}: ${name}`);
      console.error('   Error:', err.message);
    }
  }

  // 1. Hiểu nhu cầu khách hàng (Intent, Category, Brand, Model code, Specs, Budget)
  await testStep('1. Hiểu nhu cầu khách hàng: Trích xuất đúng nhu cầu, mã máy và ngân sách', async () => {
    const intent = IntentEngine.analyzeIntent('Tôi cần mua laptop Lenovo ThinkPad dưới 35 triệu để làm đồ họa');
    assert.strictEqual(intent.slots.brand, 'lenovo', 'Brand phải là lenovo');
    assert(intent.slots.budget <= 35000000, 'Ngân sách phải <= 35 triệu');
    assert.strictEqual(intent.slots.categoryDomain, 'LAPTOP_PC', 'Domain phải là LAPTOP_PC');
  });

  // 2. Biết hỏi thêm thông tin khi cần (Active Listening - Làm rõ 1 câu trọng tâm)
  await testStep('2. Biết hỏi thêm thông tin khi cần: Hỏi lại 1 câu làm rõ nhu cầu và ngân sách', async () => {
    const res = await CentralBrainService.processChat({
      message: 'Tư vấn máy tính',
      history: []
    });
    assert.strictEqual(res.stage, 'CLARIFYING', 'Stage phải là CLARIFYING');
    assert(res.reply.includes('máy tính') || res.reply.includes('Máy tính'), 'Phải đề cập máy tính');
    assert(res.reply.includes('ngân sách') || res.reply.includes('mục đích'), 'Phải hỏi lại ngân sách hoặc mục đích sử dụng');
  });

  // 3. Tìm đúng sản phẩm theo tên, mã và đặc tính (RAM 16GB, In 2 mặt)
  await testStep('3. Tìm đúng sản phẩm theo đặc tính kỹ thuật: RAM 16GB & In 2 mặt', async () => {
    const resRam = await CentralBrainService.processChat({
      message: 'Tìm cho tôi laptop RAM 16GB',
      history: []
    });
    assert(resRam.reply.includes('RAM 16GB') || resRam.reply.includes('16GB') || resRam.reply.includes('16GD5'), 'Phải tìm thấy RAM 16GB');
    assert(resRam.recommendedProduct, 'Phải có sản phẩm đề xuất');

    const resDuplex = await CentralBrainService.processChat({
      message: 'Shop có máy in nào in 2 mặt tự động không?',
      history: []
    });
    assert(resDuplex.reply.includes('in 2 mặt') || resDuplex.reply.includes('L6210DW') || resDuplex.reply.includes('MAY IN'), 'Phải tìm đúng máy in 2 mặt');
  });

  // 4. So sánh các sản phẩm khách quan (Product Comparison)
  await testStep('4. So sánh sản phẩm khách quan: Phân tích ưu nhược điểm Dell vs Asus', async () => {
    const resComp = await CentralBrainService.processChat({
      message: 'So sánh laptop Dell và Asus',
      history: []
    });
    assert.strictEqual(resComp.stage, 'COMPARISON_CONSULTED', 'Stage phải là COMPARISON_CONSULTED');
    assert(resComp.reply.includes('Dell'), 'Phải nhắc đến Dell');
    assert(resComp.reply.includes('Asus'), 'Phải nhắc đến Asus');
    assert(resComp.reply.includes('Ưu điểm') || resComp.reply.includes('Lời khuyên'), 'Phải có ưu điểm và lời khuyên');
    assert(!resComp.reply.toLowerCase().includes('sản phẩm so sánh laptop dell'), 'Tuyệt đối không ép so sánh thành tên sản phẩm thiếu');
    assert(resComp.revealCatalog, 'Phải mở Cột 2');
  });

  // 5. Đề xuất sản phẩm phù hợp và mở Cột 2
  await testStep('5. Đề xuất sản phẩm phù hợp: Khớp ngân sách và mở Cột 2', async () => {
    const resRec = await CentralBrainService.processChat({
      message: 'Tôi có khoảng 33 triệu, muốn mua laptop ThinkPad',
      history: []
    });
    assert(resRec.reply.includes('ThinkPad') || resRec.reply.includes('32.790.000'), 'Phải khớp đúng dòng ThinkPad 32tr790');
    assert(resRec.revealCatalog, 'Phải mở Cột 2');
  });

  // 6. Kiểm tra giá bán và tình trạng hàng (Grounding DB)
  await testStep('6. Kiểm tra giá bán & Tình trạng hàng: Giá niêm yết chính xác, không tự bịa', async () => {
    const resPrice = await CentralBrainService.processChat({
      message: 'Màn hình Lenovo L24-4C giá bao nhiêu tiền?',
      history: []
    });
    assert(resPrice.reply.includes('2.560.000') || resPrice.reply.includes('2,560,000'), 'Phải báo đúng giá niêm yết 2.560.000 đ');
    assert(!resPrice.reply.includes('Quang Nhựt Trí'), 'Không dính tên chủ shop trong văn cảnh tư vấn');
  });

  // 7. Trả lời chính sách bảo hành, giao hàng có căn cứ
  await testStep('7. Trả lời chính sách bảo hành, giao hàng: Lấy đúng warranty_months từ DB', async () => {
    // 7A: Bảo hành chung
    const resWarGeneral = await CentralBrainService.processChat({
      message: 'Chính sách bảo hành của shop như thế nào?',
      history: []
    });
    assert(resWarGeneral.reply.includes('bảo hành chính hãng'), 'Phải có bảo hành chính hãng');
    assert(resWarGeneral.reply.includes('1 đổi 1'), 'Phải có chính sách 1 đổi 1');
    assert(!resWarGeneral.reply.toLowerCase().includes('chưa tìm thấy trong dữ liệu'), 'Không được coi chính sách bảo hành là sản phẩm thiếu');

    // 7B: Giao hàng
    const resShip = await CentralBrainService.processChat({
      message: 'Shop có giao hàng tận nơi không và phí ship thế nào?',
      history: []
    });
    assert(resShip.reply.includes('giao hàng tận nơi') || resShip.reply.includes('Đồng kiểm'), 'Phải có thông tin giao hàng đồng kiểm');
  });

  // 8. Thu thập thông tin khách hàng khi khách đồng ý (Lead Capture)
  await testStep('8. Thu thập thông tin khách hàng: Tự động lưu SĐT vào CRM Lead khi khách cung cấp', async () => {
    const testPhone = '0988776655';
    const resLead = await CentralBrainService.processChat({
      message: `Tôi tên Hùng, số điện thoại của tôi là ${testPhone}, tư vấn giúp tôi laptop nhé`,
      history: []
    });
    assert(resLead.reply.includes('0988776655') || resLead.leadCaptured, 'Phải xác nhận số điện thoại');
    
    // Check DB
    const leadRow = await db.get(`SELECT * FROM leads WHERE phone = ? ORDER BY created_time DESC LIMIT 1`, [testPhone]);
    assert(leadRow, 'Phải tạo bản ghi trong bảng leads');
    console.log(`   Captured Lead ID: ${leadRow.id} | Phone: ${leadRow.phone}`);
  });

  // 9. Hỗ trợ quy trình đặt hàng hiện tại (Order Intent)
  await testStep('9. Hỗ trợ quy trình đặt hàng: Xác nhận sản phẩm và chuyển sang chốt đơn', async () => {
    const prod = { id: 'prod_1794790873926', name: 'MÁY TÍNH XÁCH TAY LAPTOP LENOVO ThinkPad E14', price: 32790000 };
    const resOrder = await CentralBrainService.processChat({
      message: 'Tôi muốn đặt mua mẫu này, số điện thoại của tôi là 0933221100',
      selectedProduct: prod
    });
    assert.strictEqual(resOrder.stage, 'ORDER_CONFIRMED', 'Stage phải là ORDER_CONFIRMED');
    assert.strictEqual(resOrder.leadCaptured, true, 'leadCaptured phải là true');
    assert(resOrder.orderInfo, 'Phải có thông tin orderInfo');
    assert.strictEqual(resOrder.orderInfo.customerPhone, '0933221100');
  });

  // 10. Chuyển nhân viên hỗ trợ khi vượt khả năng hoặc khách yêu cầu
  await testStep('10. Chuyển nhân viên hỗ trợ: Cung cấp hotline, xin SĐT và tạo Lead HOT', async () => {
    const resHandoff = await CentralBrainService.processChat({
      message: 'Tôi muốn gặp nhân viên hỗ trợ trực tiếp',
      history: []
    });
    assert.strictEqual(resHandoff.stage, 'COLLECTING_PHONE', 'Stage phải là COLLECTING_PHONE');
    assert(resHandoff.reply.includes('chuyên viên tư vấn') || resHandoff.reply.includes('nhân viên'), 'Phải nhắc đến nhân viên hỗ trợ');
    assert(resHandoff.reply.includes('0982441446'), 'Phải cung cấp số hotline');
    assert(!resHandoff.reply.toLowerCase().includes('sản phẩm gặp nhân viên'), 'Tuyệt đối không nhầm thành tên sản phẩm');
  });

  // 11. ĐẶC BIỆT: Chống nhầm lẫn thương hiệu (Panasonic KX-TSC11 không ghép với tủ lạnh)
  await testStep('11. [ĐẶC BIỆT] Chống nhầm lẫn thương hiệu: Panasonic KX-TSC11 không nhầm với tủ lạnh', async () => {
    // Xóa tri thức đã duyệt tạm thời để kiểm tra luồng cốt lõi
    await db.run('DELETE FROM learning_knowledge_entries WHERE standard_question LIKE ?', ['%KX-TSC11%']);

    const resAntiConfusion = await CentralBrainService.processChat({
      message: 'Điện thoại Panasonic KX-TSC11 có hàng không?',
      history: []
    });
    assert(
      resAntiConfusion.reply.toLowerCase().includes('chưa có trong dữ liệu') ||
      resAntiConfusion.reply.toLowerCase().includes('chưa tìm thấy') ||
      resAntiConfusion.reply.toLowerCase().includes('không phân phối'),
      'Phải thông báo rõ chưa tìm thấy sản phẩm trong dữ liệu'
    );
    assert(
      resAntiConfusion.reply.toLowerCase().includes('số điện thoại') || resAntiConfusion.reply.toLowerCase().includes('sđt'),
      'Phải lịch sự xin số điện thoại để nhân viên kiểm tra kho'
    );
    assert(!resAntiConfusion.reply.toLowerCase().includes('tủ lạnh panasonic'), 'Tuyệt đối không nhầm sang tủ lạnh Panasonic');
    assert(!resAntiConfusion.reply.toLowerCase().includes('đồ gia dụng panasonic'), 'Tuyệt đối không nhầm sang đồ gia dụng Panasonic');
  });

  console.log(`\n================================================================`);
  console.log(`🏁 KẾT QUẢ KIỂM THỬ PROMPT 04: ${passedCount}/${totalTests} BÀI KIỂM THỬ THÀNH CÔNG (${Math.round((passedCount / totalTests) * 100)}%)`);
  console.log(`================================================================\n`);

  if (passedCount === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runPrompt04Tests();
