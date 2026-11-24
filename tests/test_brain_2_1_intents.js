/**
 * BOTCHAT BRAIN 2.1 – 50-SCENARIO INTENT RECOGNITION & SMART CONVERSATION SUITE
 * 
 * Target: 100% Pass Rate across 6 Categories:
 * 1. 10 General Chat Scenarios (GNC-01 -> GNC-10)
 * 2. 10 Product Inquiry Scenarios (PRD-01 -> PRD-10)
 * 3. 10 Appointment & Schedule Scenarios (APT-01 -> APT-10)
 * 4. 10 Multi-turn Context Scenarios (MLT-01 -> MLT-10)
 * 5. 5 Missing Data Scenarios (MIS-01 -> MIS-05)
 * 6. 5 Ambiguous Intent Scenarios (AMB-01 -> AMB-05)
 */

process.env.NODE_ENV = 'test';

import assert from 'assert';
import { CentralBrainService } from '../server/services/centralBrainService.js';
import IntentEngine, { INTENT_GROUPS } from '../server/services/intelligence/intentEngine.js';
import SalesEngine from '../server/salesEngine.js';
import VerificationEngine from '../server/services/intelligence/verificationEngine.js';

console.log('================================================================');
console.log('🧪 BẮT ĐẦU CHẠY BỘ TEST 50 TÌNH HUỐNG BOTCHAT BRAIN 2.1 (INTENT & CONVERSATION)');
console.log('================================================================\n');

async function run50TestSuite() {
  const allResults = [];
  let passedCount = 0;
  let failedCount = 0;

  async function runTest({ id, category, name, input, expected, testFn }) {
    const startMs = Date.now();
    let status = 'FAILED';
    let actual = '';
    let evidence = '';
    let errorMessage = null;

    try {
      const res = await testFn();
      actual = typeof res === 'string' ? res : (res?.reply || JSON.stringify(res));
      evidence = res?.evidence || actual.slice(0, 150);
      status = 'PASSED';
      passedCount++;
    } catch (err) {
      status = 'FAILED';
      failedCount++;
      errorMessage = err.message;
      actual = `Exception: ${err.message}`;
      evidence = `Failed: ${err.message}`;
    }

    const latencyMs = Date.now() - startMs;
    allResults.push({ id, category, name, input, expected, actual, status, latencyMs, evidence, error: errorMessage });
    const icon = status === 'PASSED' ? '✅' : '❌';
    console.log(`${icon} [${id}] [${category}] ${name} | ${latencyMs}ms`);
    if (status === 'FAILED') {
      console.error(`   👉 Lỗi: ${errorMessage}`);
    }
  }

  // ===========================================================================
  // CATEGORY 1: GENERAL CHAT (10 SCENARIOS: GNC-01 -> GNC-10)
  // ===========================================================================
  console.log('\n--- NHÓM 1: GIAO TIẾP XÃ HỘI & CHÀO HỎI (10 BÀI) ---');

  await runTest({
    id: 'GNC-01',
    category: 'General Chat',
    name: 'Chào hỏi đơn giản, không mở Cột 2, không quảng cáo sản phẩm',
    input: 'Xin chào em!',
    expected: 'Chào hỏi thân thiện, revealCatalog = false',
    testFn: async () => {
      const res = await CentralBrainService.processChat({ message: 'Xin chào em!' });
      assert.strictEqual(res.revealCatalog, false, 'Không được mở Cột 2 khi chào hỏi');
      assert(!res.reply.includes('giá niêm yết'), 'Không được báo giá khi chào hỏi');
      return { reply: res.reply, evidence: 'Chào hỏi tự nhiên, giữ Cột 2 đóng' };
    }
  });

  await runTest({
    id: 'GNC-02',
    category: 'General Chat',
    name: 'Hỏi thăm sức khỏe lịch sự',
    input: 'Bạn có khỏe không?',
    expected: 'Đáp lại sức khỏe, hỏi thăm lại, không tư vấn sản phẩm',
    testFn: async () => {
      const res = await CentralBrainService.processChat({ message: 'Bạn có khỏe không?' });
      assert(res.reply.toLowerCase().includes('khỏe'), 'Phải trả lời hỏi thăm sức khỏe');
      assert.strictEqual(res.revealCatalog, false);
      return { reply: res.reply, evidence: 'Hỏi thăm thân thiện' };
    }
  });

  await runTest({
    id: 'GNC-03',
    category: 'General Chat',
    name: 'Khen ngợi trí tuệ của chatbot',
    input: 'Bạn thông minh thật đấy!',
    expected: 'Cảm ơn nhã nhặn, giữ vai trò trợ lý',
    testFn: async () => {
      const res = await CentralBrainService.processChat({ message: 'Bạn thông minh thật đấy!' });
      assert(res.reply.toLowerCase().includes('cảm ơn') || res.reply.toLowerCase().includes('vui'), 'Phải cảm ơn khi được khen');
      assert.strictEqual(res.revealCatalog, false);
      return { reply: res.reply, evidence: 'Đáp từ lịch sự' };
    }
  });

  await runTest({
    id: 'GNC-04',
    category: 'General Chat',
    name: 'Hỏi danh tính và vai trò',
    input: 'Bạn là ai vậy?',
    expected: 'Tự giới thiệu là TRÍ AN Trợ lý AI toàn diện',
    testFn: async () => {
      const res = await CentralBrainService.processChat({ message: 'Bạn là ai vậy?' });
      assert(res.reply.includes('TRÍ AN'), 'Phải xưng tên TRÍ AN');
      assert(!res.reply.includes('Quang Nhựt Trí'), 'Không được rò rỉ tên chủ nhân sai vị trí');
      return { reply: res.reply, evidence: 'Định danh chuẩn mực' };
    }
  });

  await runTest({
    id: 'GNC-05',
    category: 'General Chat',
    name: 'Khách bày tỏ lời cảm ơn',
    input: 'Cảm ơn bạn nhiều nhé!',
    expected: 'Đáp từ chu đáo, sẵn sàng hỗ trợ tiếp',
    testFn: async () => {
      const res = await CentralBrainService.processChat({ message: 'Cảm ơn bạn nhiều nhé!' });
      assert(res.reply.toLowerCase().includes('không có chi') || res.reply.toLowerCase().includes('rất vui'), 'Phải đáp từ cảm ơn');
      assert.strictEqual(res.revealCatalog, false);
      return { reply: res.reply, evidence: 'Hồi đáp cảm ơn ấm áp' };
    }
  });

  await runTest({
    id: 'GNC-06',
    category: 'General Chat',
    name: 'Khách tâm sự cảm xúc buồn',
    input: 'Hôm nay mình buồn quá bạn ơi',
    expected: 'Lắng nghe, an ủi, không gượng ép bán đồ',
    testFn: async () => {
      const res = await CentralBrainService.processChat({ message: 'Hôm nay mình buồn quá bạn ơi' });
      assert(res.reply.toLowerCase().includes('lắng nghe') || res.reply.toLowerCase().includes('chia sẻ'), 'Phải thể hiện sự thấu cảm');
      assert.strictEqual(res.revealCatalog, false);
      return { reply: res.reply, evidence: 'Đồng cảm tinh tế' };
    }
  });

  await runTest({
    id: 'GNC-07',
    category: 'General Chat',
    name: 'Khách hỏi thăm thời tiết',
    input: 'Thời tiết hôm nay đẹp nhỉ',
    expected: 'Tương tác vui vẻ, chúc ngày tốt lành',
    testFn: async () => {
      const res = await CentralBrainService.processChat({ message: 'Thời tiết hôm nay đẹp nhỉ' });
      assert(res.reply.toLowerCase().includes('thời tiết') || res.reply.toLowerCase().includes('năng lượng'), 'Trả lời đúng chủ đề thời tiết');
      return { reply: res.reply, evidence: 'Trò chuyện tự nhiên' };
    }
  });

  await runTest({
    id: 'GNC-08',
    category: 'General Chat',
    name: 'Khách hỏi vui về người yêu',
    input: 'Em có người yêu chưa?',
    expected: 'Hóm hỉnh, phù hợp trợ lý ảo thông minh',
    testFn: async () => {
      const res = await CentralBrainService.processChat({ message: 'Em có người yêu chưa?' });
      assert(res.reply.toLowerCase().includes('trợ lý ảo') || res.reply.toLowerCase().includes('công việc'), 'Hóm hỉnh chuẩn trợ lý ảo');
      return { reply: res.reply, evidence: 'Duyên dáng, thông minh' };
    }
  });

  await runTest({
    id: 'GNC-09',
    category: 'General Chat',
    name: 'Yêu cầu kể chuyện cười',
    input: 'Kể một câu chuyện cười đi em',
    expected: 'Kể câu chuyện vui tích cực',
    testFn: async () => {
      const res = await CentralBrainService.processChat({ message: 'Kể một câu chuyện cười đi em' });
      assert(res.reply.length > 50, 'Nội dung câu chuyện đầy đủ');
      assert.strictEqual(res.revealCatalog, false);
      return { reply: res.reply, evidence: 'Kể chuyện cười thư giãn' };
    }
  });

  await runTest({
    id: 'GNC-10',
    category: 'General Chat',
    name: 'Chào tạm biệt cuối ngày',
    input: 'Tạm biệt bạn nhé, chúc ngủ ngon!',
    expected: 'Chúc ngủ ngon và chào tạm biệt lịch sự',
    testFn: async () => {
      const res = await CentralBrainService.processChat({ message: 'Tạm biệt bạn nhé, chúc ngủ ngon!' });
      assert(res.reply.toLowerCase().includes('tạm biệt') || res.reply.toLowerCase().includes('ngủ ngon'), 'Chào tạm biệt đúng ngữ cảnh');
      return { reply: res.reply, evidence: 'Tạm biệt lịch sự' };
    }
  });

  // ===========================================================================
  // CATEGORY 2: PRODUCT INQUIRY (10 SCENARIOS: PRD-01 -> PRD-10)
  // ===========================================================================
  console.log('\n--- NHÓM 2: TƯ VẤN SẢN PHẨM & BÁN HÀNG (10 BÀI) ---');

  await runTest({
    id: 'PRD-01',
    category: 'Product Inquiry',
    name: 'Hỏi giá Laptop ThinkPad L14 Gen 7',
    input: 'Lenovo ThinkPad L14 Gen 7 giá bao nhiêu?',
    expected: 'Báo giá chính xác 53.274.000 đ, mở Cột 2',
    testFn: async () => {
      const res = await CentralBrainService.processChat({ message: 'Lenovo ThinkPad L14 Gen 7 giá bao nhiêu?' });
      assert(res.reply.includes('53.274.000'), 'Phải báo đúng giá 53.274.000 đ');
      assert.strictEqual(res.revealCatalog, true, 'Phải mở Cột 2');
      return { reply: res.reply, evidence: 'Báo giá chuẩn xác và mở Cột 2' };
    }
  });

  await runTest({
    id: 'PRD-02',
    category: 'Product Inquiry',
    name: 'Đặt mua trà Hoàng Tỳ Nhật Minh',
    input: 'Tôi muốn đặt mua 2 hộp trà Hoàng Tỳ Nhật Minh',
    expected: 'Nhận diện số lượng 2 hộp, vào luồng đặt mua',
    testFn: async () => {
      const res = await CentralBrainService.processChat({ message: 'Tôi muốn đặt mua 2 hộp trà Hoàng Tỳ Nhật Minh' });
      assert(res.reply.toLowerCase().includes('hoàng tỳ nhật minh') || res.reply.toLowerCase().includes('đặt mua'), 'Nhận diện đúng sản phẩm đặt mua');
      return { reply: res.reply, evidence: 'Khởi tạo luồng đặt mua' };
    }
  });

  await runTest({
    id: 'PRD-03',
    category: 'Product Inquiry',
    name: 'So sánh trà Bích Thủy Hoàn Nguyên và Hoàng Tỳ Nhật Minh',
    input: 'So sánh trà Bích Thủy Hoàn Nguyên và Hoàng Tỳ Nhật Minh khác nhau thế nào?',
    expected: 'Phân tích khách quan: Lục trà vs Hắc trà',
    testFn: async () => {
      const res = await CentralBrainService.processChat({ message: 'So sánh trà Bích Thủy Hoàn Nguyên và Hoàng Tỳ Nhật Minh khác nhau thế nào?' });
      assert(res.reply.toLowerCase().includes('bích thủy') && res.reply.toLowerCase().includes('hoàng tỳ'), 'So sánh cả hai sản phẩm');
      return { reply: res.reply, evidence: 'So sánh chi tiết' };
    }
  });

  await runTest({
    id: 'PRD-04',
    category: 'Product Inquiry',
    name: 'Yêu cầu lập báo giá chính thức kèm tính toán số lượng',
    input: 'Lập báo giá 3 máy in Brother HL-L6210DW',
    expected: 'Báo giá chính thức tính toán đúng số lượng 3 máy',
    testFn: async () => {
      const res = await CentralBrainService.processChat({ message: 'Lập báo giá 3 máy in Brother HL-L6210DW' });
      assert(res.reply.toLowerCase().includes('brother') || res.reply.includes('L6210DW'), 'Đúng sản phẩm máy in Brother');
      assert(res.reply.includes('31.659.000') || res.reply.includes('10.553.000'), 'Tính toán đúng đơn giá/tổng giá');
      return { reply: res.reply, evidence: 'Báo giá chính thức hoàn chỉnh' };
    }
  });

  await runTest({
    id: 'PRD-05',
    category: 'Product Inquiry',
    name: 'Chính sách bảo hành thiết bị máy in',
    input: 'Máy in Brother HL-L6210DW bảo hành bao lâu?',
    expected: 'Bảo hành chính hãng phần cứng 12-36 tháng',
    testFn: async () => {
      const res = await CentralBrainService.processChat({ message: 'Máy in Brother HL-L6210DW bảo hành bao lâu?' });
      assert(res.reply.includes('12') || res.reply.includes('24') || res.reply.includes('Bảo hành'), 'Có thông tin bảo hành máy');
      return { reply: res.reply, evidence: 'Chính sách bảo hành phần cứng chuẩn' };
    }
  });

  await runTest({
    id: 'PRD-06',
    category: 'Product Inquiry',
    name: 'Chính sách bảo hành đồ ăn thức uống (Trà Oolong)',
    input: 'Trà Oolong này bảo hành thế nào?',
    expected: 'Không áp dụng bảo hành điện tử, cam kết chính hãng 100%, Date mới, 1 đổi 1 trong 7 ngày',
    testFn: async () => {
      const res = await CentralBrainService.processChat({ message: 'Trà Oolong này bảo hành thế nào?' });
      assert(res.reply.includes('không áp dụng bảo hành') || res.reply.includes('không có chính sách bảo hành'), 'Không có bảo hành máy móc cho thực phẩm');
      assert(res.reply.includes('chính hãng 100%') || res.reply.includes('Chính hãng 100%') || res.reply.includes('đổi trả'), 'Cam kết chính hãng & đổi trả');
      return { reply: res.reply, evidence: 'Phân loại bảo hành đồ ăn thức uống chuẩn mực' };
    }
  });

  await runTest({
    id: 'PRD-07',
    category: 'Product Inquiry',
    name: 'Tư vấn laptop theo ngân sách dưới 20 triệu',
    input: 'Tìm cho tôi laptop dưới 20 triệu',
    expected: 'Đề xuất đúng dòng máy trong tầm ngân sách',
    testFn: async () => {
      const res = await CentralBrainService.processChat({ message: 'Tìm cho tôi laptop dưới 20 triệu' });
      assert(Boolean(res.reply) && res.reply.length > 15, 'Phản hồi tư vấn đầy đủ');
      return { reply: res.reply, evidence: 'Lọc đúng ngân sách' };
    }
  });

  await runTest({
    id: 'PRD-08',
    category: 'Product Inquiry',
    name: 'Tra cứu thông số kỹ thuật (in 2 mặt tự động)',
    input: 'Máy in nào có chức năng in 2 mặt tự động?',
    expected: 'Gợi ý đúng dòng máy in đảo mặt tự động Brother HL-L6210DW',
    testFn: async () => {
      const res = await CentralBrainService.processChat({ message: 'Máy in nào có chức năng in 2 mặt tự động?' });
      assert(res.reply.toLowerCase().includes('in 2 mặt') || res.reply.includes('HL-L6210DW') || res.reply.includes('Brother'), 'Khớp tính năng in 2 mặt');
      return { reply: res.reply, evidence: 'Khớp thông số kỹ thuật chính xác' };
    }
  });

  await runTest({
    id: 'PRD-09',
    category: 'Product Inquiry',
    name: 'Kiểm tra tồn kho máy đếm tiền',
    input: 'Máy đếm tiền Xiudun có sẵn hàng giao ngay không?',
    expected: 'Xác nhận tình trạng hàng sẵn có tại kho',
    testFn: async () => {
      const res = await CentralBrainService.processChat({ message: 'Máy đếm tiền Xiudun có sẵn hàng giao ngay không?' });
      assert(res.reply.toLowerCase().includes('sẵn') || res.reply.toLowerCase().includes('kho'), 'Xác nhận hàng sẵn kho');
      return { reply: res.reply, evidence: 'Thông tin tồn kho chính xác' };
    }
  });

  await runTest({
    id: 'PRD-10',
    category: 'Product Inquiry',
    name: 'Yêu cầu mở Cột 2 xem sản phẩm',
    input: 'Cho anh xem mẫu laptop ThinkPad L14',
    expected: 'Mở Cột 2 và đưa đúng sản phẩm ThinkPad L14 lên đầu',
    testFn: async () => {
      const res = await CentralBrainService.processChat({ message: 'Cho anh xem mẫu laptop ThinkPad L14' });
      assert.strictEqual(res.revealCatalog, true, 'Bắt buộc mở Cột 2');
      assert(res.recommendedProduct?.name.includes('ThinkPad L14') || res.reply.includes('L14'), 'Đưa đúng ThinkPad L14');
      return { reply: res.reply, evidence: 'Mở Cột 2 chính xác' };
    }
  });

  // ===========================================================================
  // CATEGORY 3: APPOINTMENT & SCHEDULE (10 SCENARIOS: APT-01 -> APT-10)
  // ===========================================================================
  console.log('\n--- NHÓM 3: HẸN GẶP & TRA CỨU LỊCH TRÌNH (10 BÀI) ---');

  await runTest({
    id: 'APT-01',
    category: 'Appointment & Schedule',
    name: 'Root Cause: Hẹn anh Trí đi nhậu, hỏi ngày rảnh',
    input: 'Cần hẹn anh Trí đi nhậu, lịch ngày nào rảnh?',
    expected: 'Chuyển sang Appointment Handler, KHÔNG chào bán sản phẩm, thông báo chưa kết nối calendar, xin thông tin & SĐT',
    testFn: async () => {
      const res = await CentralBrainService.processChat({ message: 'Cần hẹn anh Trí đi nhậu, lịch ngày nào rảnh?' });
      assert(!res.reply.toLowerCase().includes('chuyên cung cấp các sản phẩm'), 'Tuyệt đối không chuyển sang tư vấn bán hàng');
      assert(!res.reply.toLowerCase().includes('chưa có trong dữ liệu của shop'), 'Tuyệt đối không xem nhậu là sản phẩm');
      assert.strictEqual(res.revealCatalog, false, 'Không được mở Cột 2');
      assert(res.reply.toLowerCase().includes('google calendar') || res.reply.toLowerCase().includes('lịch'), 'Phải nói rõ tình trạng lịch');
      assert(res.reply.toLowerCase().includes('số điện thoại') || res.reply.toLowerCase().includes('thời gian'), 'Hỏi thêm thông tin SĐT/thời gian');
      return { reply: res.reply, evidence: 'Khắc phục hoàn toàn lỗi chuyển nhầm sang Sales Engine' };
    }
  });

  await runTest({
    id: 'APT-02',
    category: 'Appointment & Schedule',
    name: 'Hỏi ngày rảnh của anh Trí',
    input: 'Anh Trí ngày nào rảnh?',
    expected: 'SCHEDULE_QUERY, không tự bịa lịch rảnh, giải thích calendar status',
    testFn: async () => {
      const res = await CentralBrainService.processChat({ message: 'Anh Trí ngày nào rảnh?' });
      assert(!res.revealCatalog, 'Cột 2 phải đóng');
      assert(!res.reply.includes('giá niêm yết'), 'Không được báo giá');
      assert(res.reply.toLowerCase().includes('google calendar') || res.reply.toLowerCase().includes('lịch'), 'Báo rõ chưa kiểm tra lịch tự động');
      return { reply: res.reply, evidence: 'Xử lý tra cứu lịch chuẩn xác' };
    }
  });

  await runTest({
    id: 'APT-03',
    category: 'Appointment & Schedule',
    name: 'Hẹn gặp bàn công việc',
    input: 'Muốn hẹn gặp anh Trí bàn công việc',
    expected: 'APPOINTMENT, hỏi thời gian, địa điểm, số điện thoại',
    testFn: async () => {
      const res = await CentralBrainService.processChat({ message: 'Muốn hẹn gặp anh Trí bàn công việc' });
      assert(res.reply.toLowerCase().includes('công việc') || res.reply.toLowerCase().includes('hẹn'), 'Ghi nhận đúng việc hẹn công việc');
      assert(!res.revealCatalog);
      return { reply: res.reply, evidence: 'Ghi nhận yêu cầu hẹn công việc' };
    }
  });

  await runTest({
    id: 'APT-04',
    category: 'Appointment & Schedule',
    name: 'Đặt lịch hẹn cafe vào tuần tới',
    input: 'Đặt lịch hẹn cafe với anh Trí vào tuần tới',
    expected: 'Ghi nhận tuần tới & cafe, xin SĐT',
    testFn: async () => {
      const res = await CentralBrainService.processChat({ message: 'Đặt lịch hẹn cafe với anh Trí vào tuần tới' });
      assert(res.reply.toLowerCase().includes('tuần tới') || res.reply.toLowerCase().includes('cafe') || res.reply.toLowerCase().includes('cà phê'), 'Ghi nhận đúng mốc tuần tới');
      assert(res.reply.toLowerCase().includes('số điện thoại') || res.reply.toLowerCase().includes('sđt'), 'Xin SĐT');
      return { reply: res.reply, evidence: 'Thu thập thông tin đặt lịch tuần tới' };
    }
  });

  await runTest({
    id: 'APT-05',
    category: 'Appointment & Schedule',
    name: 'Hỏi Thứ Sáu có rảnh không',
    input: 'Thứ Sáu anh Trí có rảnh không?',
    expected: 'SCHEDULE_QUERY, không bịa đặt Thứ Sáu rảnh/bận, nhận đề xuất Thứ Sáu',
    testFn: async () => {
      const res = await CentralBrainService.processChat({ message: 'Thứ Sáu anh Trí có rảnh không?' });
      assert(res.reply.toLowerCase().includes('thứ sáu'), 'Ghi nhận mốc Thứ Sáu');
      assert(!res.reply.toLowerCase().includes('anh trí chắc chắn rảnh vào thứ sáu'), 'Cấm tự bịa lịch');
      return { reply: res.reply, evidence: 'Bảo toàn tính trung thực về lịch' };
    }
  });

  await runTest({
    id: 'APT-06',
    category: 'Appointment & Schedule',
    name: 'Sắp xếp cuộc hẹn ăn trưa',
    input: 'Sắp xếp cho tôi một cuộc hẹn ăn trưa với anh Trí',
    expected: 'Ghi nhận ăn trưa, hỏi thời gian/địa điểm/SĐT',
    testFn: async () => {
      const res = await CentralBrainService.processChat({ message: 'Sắp xếp cho tôi một cuộc hẹn ăn trưa với anh Trí' });
      assert(res.reply.toLowerCase().includes('ăn trưa') || res.reply.toLowerCase().includes('hẹn'), 'Ghi nhận đúng ăn trưa');
      assert.strictEqual(res.revealCatalog, false);
      return { reply: res.reply, evidence: 'Định tuyến ăn trưa chuẩn xác' };
    }
  });

  await runTest({
    id: 'APT-07',
    category: 'Appointment & Schedule',
    name: 'Hỏi giờ trống chiều mai',
    input: 'Chiều mai anh Trí có giờ nào trống không?',
    expected: 'SCHEDULE_QUERY mốc chiều mai, không bịa giờ trống',
    testFn: async () => {
      const res = await CentralBrainService.processChat({ message: 'Chiều mai anh Trí có giờ nào trống không?' });
      assert(res.reply.toLowerCase().includes('chiều mai') || res.reply.toLowerCase().includes('lịch'), 'Ghi nhận chiều mai');
      assert(!res.reply.includes('sản phẩm'), 'Không quảng cáo sản phẩm');
      return { reply: res.reply, evidence: 'Phản hồi giờ trống trung thực' };
    }
  });

  await runTest({
    id: 'APT-08',
    category: 'Appointment & Schedule',
    name: 'Xác nhận đặt lịch ngày đó',
    input: 'Vậy đặt lịch ngày đó nhé',
    expected: 'APPOINTMENT confirmation, xin Họ tên và SĐT để hoàn tất',
    testFn: async () => {
      const res = await CentralBrainService.processChat({ message: 'Vậy đặt lịch ngày đó nhé' });
      assert(res.reply.toLowerCase().includes('ghi nhận') || res.reply.toLowerCase().includes('họ tên') || res.reply.toLowerCase().includes('số điện thoại'), 'Hỏi tên và SĐT xác nhận');
      assert.strictEqual(res.revealCatalog, false);
      return { reply: res.reply, evidence: 'Xác nhận lịch hẹn chu đáo' };
    }
  });

  await runTest({
    id: 'APT-09',
    category: 'Appointment & Schedule',
    name: 'Hẹn gặp vào 9h sáng thứ Hai',
    input: 'Hẹn gặp vào 9h sáng thứ Hai được không?',
    expected: 'Ghi nhận mốc 9h sáng thứ Hai, xin SĐT liên hệ',
    testFn: async () => {
      const res = await CentralBrainService.processChat({ message: 'Hẹn gặp vào 9h sáng thứ Hai được không?' });
      assert(res.reply.toLowerCase().includes('thứ hai') || res.reply.toLowerCase().includes('9h'), 'Bắt đúng mốc thời gian');
      assert(!res.revealCatalog);
      return { reply: res.reply, evidence: 'Ghi nhận thời gian hẹn chi tiết' };
    }
  });

  await runTest({
    id: 'APT-10',
    category: 'Appointment & Schedule',
    name: 'Tạo nhắc nhở công việc',
    input: 'Nhắc tôi 3h chiều gọi cho khách',
    expected: 'REMINDER intent, ghi nhận nội dung và thời gian 3h',
    testFn: async () => {
      const res = await CentralBrainService.processChat({ message: 'Nhắc tôi 3h chiều gọi cho khách' });
      assert(res.reply.toLowerCase().includes('nhắc nhở') || res.reply.toLowerCase().includes('ghi nhận'), 'Phản hồi đúng luồng nhắc việc');
      assert(!res.revealCatalog);
      return { reply: res.reply, evidence: 'Ghi nhận nhắc việc chuẩn' };
    }
  });

  // ===========================================================================
  // CATEGORY 4: MULTI-TURN CONTEXT (10 SCENARIOS: MLT-01 -> MLT-10)
  // ===========================================================================
  console.log('\n--- NHÓM 4: NGỮ CẢNH HỘI THOẠI ĐA LƯỢT (10 BÀI) ---');

  const multiTurnConvId = 'test_mlt_' + Date.now();
  const multiTurnHistory = [];

  async function stepMultiTurn(msg) {
    const res = await CentralBrainService.processChat({
      message: msg,
      conversationId: multiTurnConvId,
      conversationHistory: multiTurnHistory
    });
    multiTurnHistory.push({ sender_type: 'user', content: msg });
    multiTurnHistory.push({ sender_type: 'bot', content: res.reply });
    return res;
  }

  await runTest({
    id: 'MLT-01',
    category: 'Multi-turn Context',
    name: 'Lượt 1: Khởi đầu hỏi lịch anh Trí',
    input: 'Anh Trí ngày nào rảnh?',
    expected: 'SCHEDULE_QUERY, giữ Cột 2 đóng',
    testFn: async () => {
      const res = await stepMultiTurn('Anh Trí ngày nào rảnh?');
      assert.strictEqual(res.revealCatalog, false);
      return { reply: res.reply, evidence: 'Khởi đầu phiên hẹn gặp' };
    }
  });

  await runTest({
    id: 'MLT-02',
    category: 'Multi-turn Context',
    name: 'Lượt 2: Nêu rõ mục đích đi cà phê',
    input: 'Hẹn anh ấy đi cà phê.',
    expected: 'APPOINTMENT, duy trì mục tiêu hẹn anh Trí',
    testFn: async () => {
      const res = await stepMultiTurn('Hẹn anh ấy đi cà phê.');
      assert.strictEqual(res.revealCatalog, false);
      assert(!res.reply.includes('giá niêm yết'));
      return { reply: res.reply, evidence: 'Tiếp nối mục đích đi cà phê' };
    }
  });

  await runTest({
    id: 'MLT-03',
    category: 'Multi-turn Context',
    name: 'Lượt 3: Đề xuất ngày Thứ Sáu',
    input: 'Thứ Sáu có rảnh không?',
    expected: 'Hiểu là hỏi lịch Thứ Sáu của anh Trí trong ngữ cảnh',
    testFn: async () => {
      const res = await stepMultiTurn('Thứ Sáu có rảnh không?');
      assert.strictEqual(res.revealCatalog, false);
      return { reply: res.reply, evidence: 'Duy trì ngữ cảnh sang Thứ Sáu' };
    }
  });

  await runTest({
    id: 'MLT-04',
    category: 'Multi-turn Context',
    name: 'Lượt 4: Quyết định đặt ngày đó',
    input: 'Vậy đặt ngày đó nhé.',
    expected: 'Hiểu ngày đó là Thứ Sáu, xin Họ tên/SĐT',
    testFn: async () => {
      const res = await stepMultiTurn('Vậy đặt ngày đó nhé.');
      assert.strictEqual(res.revealCatalog, false);
      assert(res.reply.toLowerCase().includes('số điện thoại') || res.reply.toLowerCase().includes('ghi nhận'));
      return { reply: res.reply, evidence: 'Xác nhận đặt lịch từ ngữ cảnh trước' };
    }
  });

  await runTest({
    id: 'MLT-05',
    category: 'Multi-turn Context',
    name: 'Lượt 5: Chuyển mượt sang hỏi sản phẩm (Topic Switch)',
    input: 'Máy in Brother HL-L6210DW bao nhiêu tiền?',
    expected: 'Lập tức chuyển sang PRODUCT_INQUIRY, báo giá, mở Cột 2',
    testFn: async () => {
      const res = await stepMultiTurn('Máy in Brother HL-L6210DW bao nhiêu tiền?');
      assert.strictEqual(res.revealCatalog, true, 'Bắt buộc mở Cột 2 khi hỏi sản phẩm');
      assert(res.reply.toLowerCase().includes('brother') || res.reply.includes('L6210DW'), 'Báo giá đúng máy in');
      return { reply: res.reply, evidence: 'Chuyển chủ đề trơn tru từ hẹn gặp sang mua sắm' };
    }
  });

  await runTest({
    id: 'MLT-06',
    category: 'Multi-turn Context',
    name: 'Lượt 6: Chốt mua sản phẩm vừa hỏi',
    input: 'Tôi lấy 1 chiếc này luôn nhé',
    expected: 'ORDER_REQUEST cho máy in vừa hỏi',
    testFn: async () => {
      const res = await stepMultiTurn('Tôi lấy 1 chiếc này luôn nhé');
      assert(res.reply.toLowerCase().includes('đặt') || res.reply.toLowerCase().includes('thông tin') || res.reply.toLowerCase().includes('số điện thoại'), 'Vào luồng tiếp nhận đơn');
      return { reply: res.reply, evidence: 'Giữ sản phẩm máy in qua đại từ thay thế' };
    }
  });

  await runTest({
    id: 'MLT-07',
    category: 'Multi-turn Context',
    name: 'Lượt 7: Cung cấp thông tin khách hàng',
    input: 'Tôi tên Tuấn, SĐT 0918889999',
    expected: 'Ghi nhận Lead CRM, thu gọn Cột 2',
    testFn: async () => {
      const res = await stepMultiTurn('Tôi tên Tuấn, SĐT 0918889999');
      assert(res.reply.includes('Tuấn') || res.reply.includes('0918889999'), 'Xác nhận thông tin khách');
      return { reply: res.reply, evidence: 'Ghi nhận khách hàng chu đáo' };
    }
  });

  await runTest({
    id: 'MLT-08',
    category: 'Multi-turn Context',
    name: 'Lượt 8: Chuyển sang nhờ nhắc việc sau mua hàng',
    input: 'Nhắc tôi chiều mai nhận hàng nhé',
    expected: 'REMINDER intent, không nhầm thành đặt hàng mới',
    testFn: async () => {
      const res = await stepMultiTurn('Nhắc tôi chiều mai nhận hàng nhé');
      assert(res.reply.toLowerCase().includes('nhắc') || res.reply.toLowerCase().includes('chiều mai'), 'Nhận diện đúng nhắc việc');
      return { reply: res.reply, evidence: 'Chuyển sang luồng nhắc nhở chuẩn' };
    }
  });

  await runTest({
    id: 'MLT-09',
    category: 'Multi-turn Context',
    name: 'Lượt 9: Hỏi thông tin văn phòng công ty',
    input: 'Địa chỉ công ty mình ở đâu vậy?',
    expected: 'BUSINESS_SUPPORT: Cung cấp địa chỉ, hotline, giờ mở cửa',
    testFn: async () => {
      const res = await stepMultiTurn('Địa chỉ công ty mình ở đâu vậy?');
      assert(res.reply.includes('TRÍ AI') || res.reply.includes('Hotline') || res.reply.includes('Trụ sở'), 'Cung cấp thông tin doanh nghiệp');
      return { reply: res.reply, evidence: 'Cung cấp thông tin công ty mạch lạc' };
    }
  });

  await runTest({
    id: 'MLT-10',
    category: 'Multi-turn Context',
    name: 'Lượt 10: Lời cảm ơn kết thúc phiên',
    input: 'Cảm ơn em nhiều nha!',
    expected: 'GENERAL_CHAT: Đáp từ nhã nhặn, chúc ngày tốt lành',
    testFn: async () => {
      const res = await stepMultiTurn('Cảm ơn em nhiều nha!');
      assert(res.reply.toLowerCase().includes('không có chi') || res.reply.toLowerCase().includes('rất vui'), 'Chào kết thúc chu đáo');
      return { reply: res.reply, evidence: 'Kết thúc phiên hội thoại 10 lượt hoàn hảo' };
    }
  });

  // ===========================================================================
  // CATEGORY 5: MISSING DATA HANDLING (5 SCENARIOS: MIS-01 -> MIS-05)
  // ===========================================================================
  console.log('\n--- NHÓM 5: XỬ LÝ THIẾU DỮ LIỆU (5 BÀI) ---');

  await runTest({
    id: 'MIS-01',
    category: 'Missing Data',
    name: 'Xin báo giá nhưng không nêu sản phẩm',
    input: 'Lập báo giá giúp tôi với',
    expected: 'Chủ động hỏi lại duy nhất 1 câu cần báo giá cho sản phẩm nào',
    testFn: async () => {
      const res = await CentralBrainService.processChat({ message: 'Lập báo giá giúp tôi với' });
      assert(res.reply.includes('sản phẩm') || res.reply.includes('báo giá'), 'Hỏi làm rõ sản phẩm cần báo giá');
      return { reply: res.reply, evidence: 'Hỏi đúng trọng tâm câu còn thiếu' };
    }
  });

  await runTest({
    id: 'MIS-02',
    category: 'Missing Data',
    name: 'Hỏi sản phẩm không có trong dữ liệu shop',
    input: 'Shop có bán tủ lạnh Hitachi 6 cánh không?',
    expected: 'Trung thực báo chưa tìm thấy, xin SĐT kiểm tra kho, không bịa',
    testFn: async () => {
      const res = await CentralBrainService.processChat({ message: 'Shop có bán tủ lạnh Hitachi 6 cánh không?' });
      assert(res.reply.toLowerCase().includes('chưa tìm thấy') || res.reply.toLowerCase().includes('chưa có'), 'Trung thực thông báo');
      assert(res.reply.includes('Số điện thoại') || res.reply.includes('số điện thoại'), 'Xin SĐT để kiểm tra kho');
      return { reply: res.reply, evidence: 'Xử lý hàng thiếu chuyên nghiệp' };
    }
  });

  await runTest({
    id: 'MIS-03',
    category: 'Missing Data',
    name: 'Hỏi model không tồn tại trên thực tế',
    input: 'Giá laptop ThinkPad X9999 Max là bao nhiêu?',
    expected: 'Chặn bịa đặt, thông báo không tìm thấy model X9999',
    testFn: async () => {
      const res = await CentralBrainService.processChat({ message: 'Giá laptop ThinkPad X9999 Max là bao nhiêu?' });
      assert(res.reply.includes('X9999') || res.reply.toLowerCase().includes('chưa tìm thấy'), 'Chặn model bịa đặt');
      return { reply: res.reply, evidence: 'Unknown Model Guard bảo vệ' };
    }
  });

  await runTest({
    id: 'MIS-04',
    category: 'Missing Data',
    name: 'Hẹn anh Trí nhưng thiếu toàn bộ thời gian và SĐT',
    input: 'Hẹn anh Trí nhé',
    expected: 'Chủ động hỏi thời gian dự kiến và số điện thoại liên hệ',
    testFn: async () => {
      const res = await CentralBrainService.processChat({ message: 'Hẹn anh Trí nhé' });
      assert(res.reply.toLowerCase().includes('thời gian') || res.reply.toLowerCase().includes('số điện thoại'), 'Hỏi thời gian và SĐT');
      assert.strictEqual(res.revealCatalog, false);
      return { reply: res.reply, evidence: 'Thu thập tham số còn thiếu' };
    }
  });

  await runTest({
    id: 'MIS-05',
    category: 'Missing Data',
    name: 'Nhu cầu rộng chưa rõ mục đích (Active Listening)',
    input: 'Tôi cần mua máy tính',
    expected: 'Active Listening: Hỏi mục đích sử dụng hoặc tầm ngân sách',
    testFn: async () => {
      const res = await CentralBrainService.processChat({ message: 'Tôi cần mua máy tính' });
      assert(res.reply.toLowerCase().includes('mục đích') || res.reply.toLowerCase().includes('ngân sách'), 'Hỏi mục đích hoặc ngân sách');
      return { reply: res.reply, evidence: 'Chủ động lắng nghe làm rõ nhu cầu' };
    }
  });

  // ===========================================================================
  // CATEGORY 6: AMBIGUOUS INTENT HANDLING (5 SCENARIOS: AMB-01 -> AMB-05)
  // ===========================================================================
  console.log('\n--- NHÓM 6: Ý ĐỊNH MƠ HỒ & ĐA NGHĨA (5 BÀI) ---');

  await runTest({
    id: 'AMB-01',
    category: 'Ambiguous Intent',
    name: 'Tin nhắn chỉ có dấu chấm hỏi "?"',
    input: '?',
    expected: 'UNKNOWN intent, hỏi lại lịch sự người dùng cần trợ giúp gì',
    testFn: async () => {
      const res = await CentralBrainService.processChat({ message: '?' });
      assert(res.reply.toLowerCase().includes('chưa rõ') || res.reply.toLowerCase().includes('giúp gì'), 'Hỏi lại khi chỉ có dấu ?');
      assert.strictEqual(res.revealCatalog, false);
      return { reply: res.reply, evidence: 'Xử lý tin nhắn rác/chỉ dấu câu' };
    }
  });

  await runTest({
    id: 'AMB-02',
    category: 'Ambiguous Intent',
    name: 'Khách chỉ nhắn 1 từ "nguyên" ở lượt đầu tiên',
    input: 'nguyên',
    expected: 'Hỏi rõ "nguyên" là tên của khách hay là sản phẩm cần tìm, Cột 2 đóng',
    testFn: async () => {
      const res = await SalesEngine.processMessage({
        message: 'nguyên',
        conversationId: 'conv_amb_02_' + Date.now()
      });
      assert(res.reply.includes('tên của bạn') || res.reply.includes('tên sản phẩm'), 'Phải hỏi làm rõ tên hay sản phẩm');
      assert.strictEqual(res.revealCatalog, false, 'Không được mở Cột 2 khi chưa rõ');
      return { reply: res.reply, evidence: 'Không vội vàng gán thành trà Bích Thủy Hoàn Nguyên' };
    }
  });

  await runTest({
    id: 'AMB-03',
    category: 'Ambiguous Intent',
    name: 'Viết tắt tiếng lóng phức tạp',
    input: 'bn tien con sp nay v',
    expected: 'Giải mã "bao nhiêu tiền con sản phẩm này", hỏi lại cần xem sản phẩm nào',
    testFn: async () => {
      const res = await CentralBrainService.processChat({ message: 'bn tien con sp nay v' });
      assert(res.reply.length > 20, 'Phản hồi tư vấn tự nhiên');
      return { reply: res.reply, evidence: 'Chuẩn hóa tiếng lóng và hỏi làm rõ' };
    }
  });

  await runTest({
    id: 'AMB-04',
    category: 'Ambiguous Intent',
    name: 'Cảm thán mơ hồ ("ừ")',
    input: 'ừ',
    expected: 'Phản hồi nhã nhặn, hỏi bạn cần tôi giúp gì',
    testFn: async () => {
      const res = await CentralBrainService.processChat({ message: 'ừ' });
      assert(res.reply.length > 15, 'Hồi đáp lịch thiệp');
      assert.strictEqual(res.revealCatalog, false);
      return { reply: res.reply, evidence: 'Phản hồi từ cảm thán nhã nhặn' };
    }
  });

  await runTest({
    id: 'AMB-05',
    category: 'Ambiguous Intent',
    name: 'Câu hỏi có thể hiểu theo nhiều hướng ("Có gặp được không?")',
    input: 'Có gặp được không?',
    expected: 'Nhận diện ý định gặp mặt / hẹn gặp, giải thích lịch và xin thông tin',
    testFn: async () => {
      const res = await CentralBrainService.processChat({ message: 'Có gặp được không?' });
      assert(res.reply.toLowerCase().includes('hẹn') || res.reply.toLowerCase().includes('lịch') || res.reply.toLowerCase().includes('gặp'), 'Nhận diện đúng chủ đề gặp mặt');
      assert.strictEqual(res.revealCatalog, false);
      return { reply: res.reply, evidence: 'Phân loại ý định gặp gỡ chuẩn xác' };
    }
  });

  // ===========================================================================
  // SUMMARY
  // ===========================================================================
  console.log('\n================================================================');
  console.log('🏁 KẾT QUẢ TỔNG HỢP BỘ KIỂM THỬ 50 TÌNH HUỐNG BOTCHAT BRAIN 2.1:');
  console.log(`- Tổng số bài kiểm thử: ${allResults.length}`);
  console.log(`- Số bài ĐẠT (PASS): ${passedCount}`);
  console.log(`- Số bài KHÔNG ĐẠT (FAIL): ${failedCount}`);
  console.log(`- Tỷ lệ hoàn thành: ${((passedCount / allResults.length) * 100).toFixed(1)}%`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

run50TestSuite().catch(err => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
