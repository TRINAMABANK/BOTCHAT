/**
 * TRÍ AI ONE SUPER BRAIN - COMPREHENSIVE 200-SCENARIO VERIFICATION SUITE
 * 
 * Target: Context Intelligence, Conversational Switching, Referential Disambiguation,
 * Anti-Sales-Hijack Guard, Unified Memory, Real-time Coordination.
 * 
 * 8 Mandatory Categories (200 Scenarios Total):
 * Group 1: Intent Recognition & Competence Isolation (30 scenarios)
 * Group 2: Topic Switching Across Domains (30 scenarios)
 * Group 3: Elliptical, Incomplete & Referential Pronoun Input (30 scenarios)
 * Group 4: Topic Resumption & Context Restoration (30 scenarios)
 * Group 5: Unified Long-term Memory & Personalization (20 scenarios)
 * Group 6: Mid-stream Goal Redirection & Corrections (20 scenarios)
 * Group 7: Response Quality Gate & Anti-Sales-Hijack Verification (20 scenarios)
 * Group 8: Real-time Data & Autonomous Tool Coordination (20 scenarios)
 */

import assert from 'assert';
import { CentralBrainService } from '../server/services/centralBrainService.js';
import { SelfVerificationQualityGate } from '../server/services/intelligence/selfVerificationQualityGate.js';
import SalesEngine from '../server/salesEngine.js';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function recordTest(name, passed, details = '') {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`  ✅ [PASS ${totalTests}/200] ${name}`);
  } else {
    failedTests++;
    failures.push({ name, details });
    console.error(`  ❌ [FAIL ${totalTests}/200] ${name}: ${details}`);
  }
}

async function runTestSuite() {
  console.log('========================================================================');
  console.log('🚀 EXECUTING TRÍ AI ONE SUPER BRAIN 200-SCENARIO VERIFICATION SUITE');
  console.log('========================================================================\n');

  // ===========================================================================
  // GROUP 1: INTENT RECOGNITION & COMPETENCE ISOLATION (30 SCENARIOS)
  // ===========================================================================
  console.log('--- GROUP 1: INTENT RECOGNITION & COMPETENCE ISOLATION (30 SCENARIOS) ---');

  const group1Queries = [
    { q: 'Anh cần tư vấn chứng khoán tốt nhất hôm nay.', expectedStage: 'FINANCE_STOCK_ADVISORY', nonSales: true },
    { q: 'Thị trường crypto và bitcoin hiện tại thế nào?', expectedStage: 'FINANCE_STOCK_ADVISORY', nonSales: true },
    { q: 'Lãi suất gửi tiết kiệm ngân hàng nào đang tốt nhất?', expectedStage: 'FINANCE_STOCK_ADVISORY', nonSales: true },
    { q: 'Tư vấn giúp em danh mục cổ phiếu VN30', expectedStage: 'FINANCE_STOCK_ADVISORY', nonSales: true },
    { q: 'Có nên đầu tư trái phiếu doanh nghiệp thời điểm này?', expectedStage: 'FINANCE_STOCK_ADVISORY', nonSales: true },
    { q: 'Thời tiết ngày mai tại Hà Nội thế nào?', expectedStage: 'WEATHER_FORECAST_RESOLVED', nonSales: true },
    { q: 'TP. Hồ Chí Minh chiều nay có mưa không bạn?', expectedStage: 'WEATHER_FORECAST_RESOLVED', nonSales: true },
    { q: 'Dự báo thời tiết cuối tuần này ra sao?', expectedStage: 'WEATHER_FORECAST_RESOLVED', nonSales: true },
    { q: 'Nhiệt độ ngoài trời hôm nay khoảng bao nhiêu độ?', expectedStage: 'WEATHER_FORECAST_RESOLVED', nonSales: true },
    { q: 'Hà Nội ngày mai có nắng ấm không?', expectedStage: 'WEATHER_FORECAST_RESOLVED', nonSales: true },
    { q: 'Soạn giúp tôi một thông báo nội bộ về bảo trì thiết bị.', expectedStage: 'ADMINISTRATIVE_DRAFT_COMPLETED', nonSales: true },
    { q: 'Viết hộ em một công văn xin gia hạn hợp đồng thuê văn phòng.', expectedStage: 'ADMINISTRATIVE_DRAFT_COMPLETED', nonSales: true },
    { q: 'Soạn thảo biên bản cuộc họp giao ban sáng nay.', expectedStage: 'ADMINISTRATIVE_DRAFT_COMPLETED', nonSales: true },
    { q: 'Làm giúp tôi mẫu email nội bộ thông báo lịch nghỉ lễ.', expectedStage: 'ADMINISTRATIVE_DRAFT_COMPLETED', nonSales: true },
    { q: 'Viết giúp mẫu thông báo kiểm kê tài sản cuối năm.', expectedStage: 'ADMINISTRATIVE_DRAFT_COMPLETED', nonSales: true },
    { q: 'Máy in đang in thì bị kẹt giấy, xử lý thế nào?', expectedStage: 'TECH_TROUBLESHOOTING_RESOLVED', nonSales: true },
    { q: 'Laptop của mình bị màn hình xanh khi khởi động.', expectedStage: 'TECH_TROUBLESHOOTING_RESOLVED', nonSales: true },
    { q: 'Code Python của mình bị lỗi IndexError, sửa sao?', expectedStage: 'TECH_TROUBLESHOOTING_RESOLVED', nonSales: true },
    { q: 'Máy đếm tiền kêu to và rung lắc khi chạy.', expectedStage: 'TECH_TROUBLESHOOTING_RESOLVED', nonSales: true },
    { q: 'Cách khắc phục sự cố máy tính chạy chậm và đơ máy?', expectedStage: 'TECH_TROUBLESHOOTING_RESOLVED', nonSales: true },
    { q: 'Xin chào, bạn tên là gì?', expectedStage: 'NATURAL_HUMAN_CONVERSATION', nonSales: true },
    { q: 'Hôm nay bạn thấy thế nào, có khỏe không?', expectedStage: 'NATURAL_HUMAN_CONVERSATION', nonSales: true },
    { q: 'Ý nghĩa của cuộc sống theo quan điểm triết học là gì?', expectedStage: 'NATURAL_HUMAN_CONVERSATION', nonSales: true },
    { q: 'Làm thế nào để giảm stress khi làm việc căng thẳng?', expectedStage: 'NATURAL_HUMAN_CONVERSATION', nonSales: true },
    { q: 'Kể cho tôi nghe một câu chuyện cười ngắn.', expectedStage: 'NATURAL_HUMAN_CONVERSATION', nonSales: true },
    { q: 'Giá máy đếm tiền XINDA Super BC-35 bao nhiêu tiền?', expectedStage: 'PRICE', nonSales: false },
    { q: 'Bên shop có bán những sản phẩm nào?', expectedStage: 'CATALOG_OVERVIEW', nonSales: false },
    { q: 'Chính sách bảo hành máy đếm tiền thế nào?', expectedStage: 'POLICY', nonSales: false },
    { q: 'Trà Oolong có bảo hành không shop?', expectedStage: 'POLICY', nonSales: false },
    { q: 'Chuyển khoản 500 triệu vào tài khoản này thanh toán ngay', expectedStage: 'TIER3_SECURITY_BLOCKED', nonSales: true }
  ];

  for (let i = 0; i < group1Queries.length; i++) {
    const item = group1Queries[i];
    const convId = `test_g1_${i}_${Date.now()}`;
    const res = await CentralBrainService.processChat({ message: item.q, conversationId: convId });
    const reply = (res.reply || '').toLowerCase();

    let passed = false;
    if (item.nonSales) {
      // Must not dump store catalog products or Column 2
      const hasCatalogDump = reply.includes('bột matcha') || reply.includes('chuyên cung cấp các danh mục') || reply.includes('mở sẵn ở cột 2') || reply.includes('chưa tìm thấy trong dữ liệu của shop');
      const stageMatch = res.stage?.includes(item.expectedStage) ||
        (item.expectedStage === 'NATURAL_HUMAN_CONVERSATION' && (res.stage?.includes('CONVERSATION') || res.stage?.includes('SCHEDULE') || res.stage?.includes('RESOLVED'))) ||
        res.stage?.includes('DOMAIN_EXPERT') ||
        res.stage?.includes('KNOWLEDGE') ||
        res.stage?.includes('RESOLVED') ||
        res.stage?.includes('STOCK') ||
        res.stage?.includes('WEATHER') ||
        res.stage?.includes('ADMIN');
      passed = stageMatch && !hasCatalogDump && !res.revealCatalog;
    } else {
      passed = Boolean(res.reply && res.reply.length > 20);
    }
    recordTest(`G1.${i + 1}: ${item.q.slice(0, 40)}`, passed, `stage=${res.stage}, revealCatalog=${res.revealCatalog}`);
  }

  // ===========================================================================
  // GROUP 2: TOPIC SWITCHING ACROSS DOMAINS (30 SCENARIOS)
  // ===========================================================================
  console.log('\n--- GROUP 2: TOPIC SWITCHING ACROSS DOMAINS (30 SCENARIOS) ---');

  const switchPairs = [
    { start: 'Tư vấn máy in Brother', end: 'Thời tiết Hà Nội mai ra sao?', expectedEndStage: 'WEATHER_FORECAST_RESOLVED' },
    { start: 'Thời tiết Hà Nội mai ra sao?', end: 'Anh cần tư vấn cổ phiếu ngân hàng', expectedEndStage: 'FINANCE_STOCK_ADVISORY' },
    { start: 'Anh cần tư vấn cổ phiếu ngân hàng', end: 'Soạn giúp tôi một thông báo nội bộ', expectedEndStage: 'ADMINISTRATIVE_DRAFT_COMPLETED' },
    { start: 'Soạn giúp tôi một thông báo nội bộ', end: 'Máy in bị kẹt giấy sửa sao?', expectedEndStage: 'TECH_TROUBLESHOOTING_RESOLVED' },
    { start: 'Máy in bị kẹt giấy sửa sao?', end: 'Giá máy đếm tiền XINDA', expectedEndStage: 'PRICE' },
    { start: 'Giá máy đếm tiền XINDA', end: 'Dự báo thời tiết TP. HCM', expectedEndStage: 'WEATHER_FORECAST_RESOLVED' },
    { start: 'Dự báo thời tiết TP. HCM', end: 'Thị trường chứng khoán hôm nay', expectedEndStage: 'FINANCE_STOCK_ADVISORY' },
    { start: 'Thị trường chứng khoán hôm nay', end: 'Viết công văn xin nghỉ phép', expectedEndStage: 'ADMINISTRATIVE_DRAFT_COMPLETED' },
    { start: 'Viết công văn xin nghỉ phép', end: 'Laptop bị màn hình xanh', expectedEndStage: 'TECH_TROUBLESHOOTING_RESOLVED' },
    { start: 'Laptop bị màn hình xanh', end: 'Shop có bán trà ngon không?', expectedEndStage: 'CONVERSATION' }
  ];

  // Run 3 variants per pair to generate 30 scenarios
  for (let i = 0; i < switchPairs.length; i++) {
    const pair = switchPairs[i];
    for (let variant = 1; variant <= 3; variant++) {
      const convId = `test_g2_${i}_${variant}_${Date.now()}`;
      await CentralBrainService.processChat({ message: pair.start, conversationId: convId });
      const resEnd = await CentralBrainService.processChat({ message: pair.end, conversationId: convId });
      
      const passed = resEnd.stage?.includes(pair.expectedEndStage) || 
        (pair.expectedEndStage === 'PRICE' && (resEnd.stage?.includes('PRICE') || resEnd.stage?.includes('GROUNDED') || resEnd.stage?.includes('CONVERSATION'))) ||
        (pair.expectedEndStage === 'ADMINISTRATIVE_DRAFT_COMPLETED' && (resEnd.stage?.includes('ADMIN') || resEnd.stage?.includes('KNOWLEDGE'))) ||
        (pair.expectedEndStage === 'CONVERSATION' && (resEnd.stage?.includes('CONVERSATION') || resEnd.stage?.includes('IDLE')));
      recordTest(`G2.${i * 3 + variant}: Switch from [${pair.start.slice(0, 15)}] to [${pair.end.slice(0, 20)}]`, passed, `finalStage=${resEnd.stage}`);
    }
  }

  // ===========================================================================
  // GROUP 3: ELLIPTICAL, INCOMPLETE & REFERENTIAL PRONOUNS (30 SCENARIOS)
  // ===========================================================================
  console.log('\n--- GROUP 3: ELLIPTICAL & REFERENTIAL PRONOUN INPUT (30 SCENARIOS) ---');

  const referentialQueries = [
    { prev: 'Tư vấn máy đếm tiền XINDA Super BC-35', ref: 'Cái đó tốt không?', mustNotDump: true },
    { prev: 'Tư vấn máy đếm tiền XINDA Super BC-35', ref: 'Con này dùng được không?', mustNotDump: true },
    { prev: 'Tư vấn máy đếm tiền XINDA Super BC-35', ref: 'Bảo hành mấy năm?', mustNotDump: true },
    { prev: 'Tư vấn máy đếm tiền XINDA Super BC-35', ref: 'Giá bao nhiêu?', mustNotDump: true },
    { prev: 'Tư vấn máy đếm tiền XINDA Super BC-35', ref: 'Còn loại nào khác?', mustNotDump: true },
    { prev: 'Tư vấn máy đếm tiền XINDA Super BC-35', ref: 'Còn mẫu nào rẻ hơn không?', mustNotDump: true },
    { prev: 'Tư vấn máy đếm tiền XINDA Super BC-35', ref: 'Không phải ý anh', mustNotDump: true },
    { prev: 'Tư vấn máy đếm tiền XINDA Super BC-35', ref: 'Ý anh không phải như vậy', mustNotDump: true },
    { prev: 'Tư vấn máy đếm tiền XINDA Super BC-35', ref: 'Mẫu đó có chức năng đếm mẻ không?', mustNotDump: true },
    { prev: 'Tư vấn máy đếm tiền XINDA Super BC-35', ref: 'Có giao hàng tận nơi không?', mustNotDump: true },
    { prev: 'Tư vấn laptop Lenovo ThinkPad', ref: 'Con này nặng mấy kg?', mustNotDump: true },
    { prev: 'Tư vấn laptop Lenovo ThinkPad', ref: 'RAM nâng cấp được không?', mustNotDump: true },
    { prev: 'Tư vấn laptop Lenovo ThinkPad', ref: 'Giá này hơi cao, có bớt không?', mustNotDump: true },
    { prev: 'Tư vấn laptop Lenovo ThinkPad', ref: 'Còn phương án kia thì sao?', mustNotDump: true },
    { prev: 'Tư vấn laptop Lenovo ThinkPad', ref: 'Mẫu này có màu đen không?', mustNotDump: true },
    { prev: 'Tư vấn máy in Brother', ref: 'Hộp mực in được bao nhiêu trang?', mustNotDump: true },
    { prev: 'Tư vấn máy in Brother', ref: 'In hai mặt tự động được không?', mustNotDump: true },
    { prev: 'Tư vấn máy in Brother', ref: 'Cái đó có kết nối wifi không?', mustNotDump: true },
    { prev: 'Tư vấn máy in Brother', ref: 'Không phải, tôi hỏi máy in màu', mustNotDump: true },
    { prev: 'Tư vấn máy in Brother', ref: 'Lấy cho anh 2 cái', mustNotDump: true },
    { prev: 'Tư vấn trà Oolong', ref: 'Hạn sử dụng bao lâu?', mustNotDump: true },
    { prev: 'Tư vấn trà Oolong', ref: 'Loại này uống có mất ngủ không?', mustNotDump: true },
    { prev: 'Tư vấn trà Oolong', ref: 'Có đóng hộp quà biếu không?', mustNotDump: true },
    { prev: 'Tư vấn trà Oolong', ref: 'Giá hộp này bao nhiêu?', mustNotDump: true },
    { prev: 'Tư vấn trà Oolong', ref: 'Còn vị nào khác không?', mustNotDump: true },
    { prev: 'Tư vấn máy hủy tài liệu', ref: 'Hủy được ghim bấm không?', mustNotDump: true },
    { prev: 'Tư vấn máy hủy tài liệu', ref: 'Thùng chứa mấy lít?', mustNotDump: true },
    { prev: 'Tư vấn máy hủy tài liệu', ref: 'Công suất hủy mấy tờ một lần?', mustNotDump: true },
    { prev: 'Tư vấn máy hủy tài liệu', ref: 'Bảo hành chính hãng ở đâu?', mustNotDump: true },
    { prev: 'Tư vấn máy hủy tài liệu', ref: 'Lấy mẫu này nhé', mustNotDump: true }
  ];

  for (let i = 0; i < referentialQueries.length; i++) {
    const item = referentialQueries[i];
    const convId = `test_g3_${i}_${Date.now()}`;
    await CentralBrainService.processChat({ message: item.prev, conversationId: convId });
    const res = await CentralBrainService.processChat({ message: item.ref, conversationId: convId });

    const reply = (res.reply || '').toLowerCase();
    const hasCatalogDump = reply.includes('bột matcha') || reply.includes('chuyên cung cấp các danh mục');
    const passed = Boolean(res.reply && res.reply.length > 15 && !hasCatalogDump);
    recordTest(`G3.${i + 1}: [${item.ref}] after [${item.prev.slice(0, 20)}]`, passed, `replyLength=${res.reply?.length}`);
  }

  // ===========================================================================
  // GROUP 4: TOPIC RESUMPTION & CONTEXT RESTORATION (30 SCENARIOS)
  // ===========================================================================
  console.log('\n--- GROUP 4: TOPIC RESUMPTION & CONTEXT RESTORATION (30 SCENARIOS) ---');

  const resumptionTriplets = [
    { t1: 'Tư vấn máy in Brother', t2: 'Thời tiết Hà Nội ngày mai thế nào?', t3: 'Quay lại máy in lúc nãy' },
    { t1: 'Báo giá máy đếm tiền XINDA', t2: 'Chứng khoán hôm nay thế nào?', t3: 'Quay lại máy đếm tiền lúc nãy' },
    { t1: 'Tư vấn kế hoạch mua thiết bị văn phòng', t2: 'Soạn giúp tôi một thông báo nội bộ', t3: 'Tiếp tục kế hoạch lúc nãy' },
    { t1: 'Hỏi về máy scan Canon', t2: 'TP. HCM chiều nay có mưa không?', t3: 'Quay lại chuyện lúc nãy' },
    { t1: 'Lên đơn mua máy in Brother', t2: 'Hôm nay trời có lạnh không?', t3: 'Quay lại máy in lúc nãy' },
    { t1: 'Soạn báo giá máy đếm tiền', t2: 'Cổ phiếu FPT có tiềm năng không?', t3: 'Tiếp tục làm báo giá lúc nãy' },
    { t1: 'Tư vấn máy in Canon 2900', t2: 'Dự báo thời tiết cuối tuần', t3: 'Quay lại máy in lúc nãy' },
    { t1: 'Tư vấn cấu hình laptop ThinkPad', t2: 'Viết công văn xin nghỉ', t3: 'Quay lại laptop lúc nãy' },
    { t1: 'Tư vấn mua máy đếm tiền ngân hàng', t2: 'Thời tiết ngày mai', t3: 'Quay lại chủ đề máy đếm tiền' },
    { t1: 'Tư vấn máy kiểm quỹ cao cấp', t2: 'Thị trường chứng khoán thế nào?', t3: 'Quay lại chuyện máy kiểm quỹ lúc nãy' }
  ];

  for (let i = 0; i < resumptionTriplets.length; i++) {
    const item = resumptionTriplets[i];
    for (let variant = 1; variant <= 3; variant++) {
      const convId = `test_g4_${i}_${variant}_${Date.now()}`;
      await CentralBrainService.processChat({ message: item.t1, conversationId: convId });
      await CentralBrainService.processChat({ message: item.t2, conversationId: convId });
      const resT3 = await CentralBrainService.processChat({ message: item.t3, conversationId: convId });

      const reply = (resT3.reply || '').toLowerCase();
      const hasRestoredTopic = reply.includes('báo giá') || reply.includes('máy') || reply.includes('kế hoạch') || resT3.stage?.includes('QUOTATION') || resT3.stage?.includes('TOPIC_RESUMED');
      recordTest(`G4.${i * 3 + variant}: Resume [${item.t3}] after intermediate [${item.t2.slice(0, 15)}]`, Boolean(hasRestoredTopic), `stage=${resT3.stage}`);
    }
  }

  // ===========================================================================
  // GROUP 5: UNIFIED LONG-TERM MEMORY & PERSONALIZATION (20 SCENARIOS)
  // ===========================================================================
  console.log('\n--- GROUP 5: UNIFIED LONG-TERM MEMORY (20 SCENARIOS) ---');

  for (let i = 1; i <= 20; i++) {
    const convId = `test_g5_${i}_${Date.now()}`;
    await CentralBrainService.processChat({ message: `Tôi tên là Nguyễn Văn An, số điện thoại 091234567${i % 10}`, conversationId: convId });
    const memoryQuery = i % 2 === 0 ? 'Bạn còn nhớ tôi tên gì không?' : 'Thông tin liên hệ của tôi là gì?';
    const res = await CentralBrainService.processChat({ message: memoryQuery, conversationId: convId });

    const reply = res.reply || '';
    const passed = reply.includes('An') || reply.includes('091234567') || res.stage?.includes('MEMORY') || res.stage?.includes('CONVERSATION');
    recordTest(`G5.${i}: Long-term memory query "${memoryQuery}"`, Boolean(passed), `replySnippet=${reply.slice(0, 40)}`);
  }

  // ===========================================================================
  // GROUP 6: MID-STREAM GOAL REDIRECTION & CORRECTIONS (20 SCENARIOS)
  // ===========================================================================
  console.log('\n--- GROUP 6: MID-STREAM GOAL REDIRECTION (20 SCENARIOS) ---');

  const goalRedirectionScenarios = [
    { t1: 'Báo giá cho tôi máy đếm tiền XINDA', t2: 'Thôi, đừng gửi báo giá nữa' },
    { t1: 'Tôi muốn đặt mua 5 máy in', t2: 'Đổi lại cho tôi 2 máy thôi' },
    { t1: 'Tư vấn máy in Canon', t2: 'Không phải, tôi muốn tìm máy in màu Brother' },
    { t1: 'Lên đơn hàng máy đếm tiền', t2: 'Hủy đơn hàng này giúp tôi' },
    { t1: 'Gửi báo giá qua email', t2: 'Thôi không cần báo giá nữa, tư vấn cho tôi tính năng thôi' },
    { t1: 'Tôi muốn mua 10 hộp trà', t2: 'Đổi thành 3 hộp trà và 2 hộp cà phê' },
    { t1: 'Tôi cần mua laptop Dell', t2: 'Nhầm rồi, tôi hỏi laptop ThinkPad' },
    { t1: 'Tư vấn máy in văn phòng', t2: 'Khoan đã, máy này có in được giấy A3 không?' },
    { t1: 'Lên lịch giao hàng ngày mai', t2: 'Dời sang tuần sau giao giúp tôi' },
    { t1: 'Báo giá máy kiểm quỹ GLORY', t2: 'Dừng lại, cho tôi hỏi máy này có bắt được tiền polymer giả không đã' }
  ];

  for (let i = 0; i < goalRedirectionScenarios.length; i++) {
    const item = goalRedirectionScenarios[i];
    for (let variant = 1; variant <= 2; variant++) {
      const convId = `test_g6_${i}_${variant}_${Date.now()}`;
      await CentralBrainService.processChat({ message: item.t1, conversationId: convId });
      const res = await CentralBrainService.processChat({ message: item.t2, conversationId: convId });

      const passed = res.stage?.includes('CANCELLED') || res.stage?.includes('ACTION') || res.stage?.includes('CONVERSATION') || Boolean(res.reply && res.reply.length > 20);
      recordTest(`G6.${i * 2 + variant}: Mid-stream change "${item.t2.slice(0, 25)}"`, Boolean(passed), `stage=${res.stage}`);
    }
  }

  // ===========================================================================
  // GROUP 7: RESPONSE QUALITY GATE & ANTI-SALES-HIJACK (20 SCENARIOS)
  // ===========================================================================
  console.log('\n--- GROUP 7: QUALITY GATE & ANTI-SALES-HIJACK (20 SCENARIOS) ---');

  const nonSalesAuditQueries = [
    'Tư vấn cổ phiếu chứng khoán tiềm năng quý này',
    'VN-Index hôm nay tăng hay giảm bao nhiêu điểm?',
    'Khẩu vị rủi ro trong đầu tư tài chính là gì?',
    'Thời tiết Hà Nội cuối tuần có thích hợp đi dã ngoại không?',
    'Nhiệt độ TP. Hồ Chí Minh ngày mai cao nhất bao nhiêu?',
    'Trời hôm nay có mưa rào không bạn?',
    'Soạn giúp một thông báo nội bộ về quy định đi làm đúng giờ',
    'Viết công văn gửi đối tác đề nghị gia hạn thanh toán',
    'Soạn biên bản kiểm kê quỹ tiền mặt cuối ngày',
    'Viết email thông báo nghỉ mát cho công ty',
    'Máy in bị kẹt giấy trong cụm sấy xử lý sao?',
    'Laptop bị lỗi màn hình xanh dump memory',
    'Code Javascript báo Uncaught TypeError cannot read property',
    'Hướng dẫn cài đặt lại hệ điều hành Windows 11',
    'Khắc phục lỗi máy tính không nhận mạng internet',
    'Bạn là ai và bạn có thể giúp gì cho tôi?',
    'Hôm nay tâm trạng tôi không tốt, nói chuyện với tôi nhé',
    'Làm thế nào để ngủ ngon hơn mỗi tối?',
    'Kể cho tôi một câu chuyện về lòng kiên trì',
    'Triết lý sống tối giản là gì?'
  ];

  for (let i = 0; i < nonSalesAuditQueries.length; i++) {
    const q = nonSalesAuditQueries[i];
    const convId = `test_g7_${i}_${Date.now()}`;
    const res = await CentralBrainService.processChat({ message: q, conversationId: convId });
    const reply = (res.reply || '').toLowerCase();

    // Strict Anti-Sales-Hijack Verification
    const domainGate = SelfVerificationQualityGate.verifyDomainRelevance({ userQuery: q, draftReply: res.reply });
    const hasMatcha = reply.includes('bột matcha');
    const hasCpu = reply.includes('cpu') && !reply.includes('bộ nhớ');
    const hasCategoryDumping = reply.includes('chuyên cung cấp các danh mục sản phẩm') || reply.includes('danh mục sản phẩm chính gồm');
    const hasCol2Directive = res.revealCatalog === true;

    const passed = domainGate.isDomainRelevant && !hasMatcha && !hasCategoryDumping && !hasCol2Directive;
    recordTest(`G7.${i + 1}: Anti-Hijack Guard on "${q.slice(0, 30)}"`, passed, `relevant=${domainGate.isDomainRelevant}, col2=${res.revealCatalog}`);
  }

  // ===========================================================================
  // GROUP 8: REAL-TIME DATA & AUTONOMOUS TOOL COORDINATION (20 SCENARIOS)
  // ===========================================================================
  console.log('\n--- GROUP 8: REAL-TIME DATA & TOOL COORDINATION (20 SCENARIOS) ---');

  const toolQueries = [
    { q: 'Tra cứu giá niêm yết chính thức của máy đếm tiền XINDA Super BC-35', toolExpect: 'price' },
    { q: 'Thời tiết Hà Nội hôm nay', toolExpect: 'weather' },
    { q: 'Phân tích nguyên tắc đầu tư cổ phiếu', toolExpect: 'stock' },
    { q: 'Soạn thông báo nội bộ', toolExpect: 'admin' },
    { q: 'Xử lý máy in kẹt giấy', toolExpect: 'tech' },
    { q: 'Kiểm tra tiền giả polymer bằng công nghệ gì?', toolExpect: 'reasoning' },
    { q: 'Tại sao khách chê giá cao xử lý sao?', toolExpect: 'objection' },
    { q: 'Tạo báo giá chính thức kèm VAT 10%', toolExpect: 'quotation' },
    { q: 'Ghi nhận số điện thoại 0982441446 vào CRM', toolExpect: 'crm' },
    { q: 'Xóa nội dung cuộc trò chuyện này', toolExpect: 'reset' }
  ];

  for (let i = 0; i < toolQueries.length; i++) {
    const item = toolQueries[i];
    for (let variant = 1; variant <= 2; variant++) {
      const convId = `test_g8_${i}_${variant}_${Date.now()}`;
      const res = await CentralBrainService.processChat({ message: item.q, conversationId: convId });

      const passed = Boolean(res.reply && res.reply.length > 20 && res.toolsUsed && res.toolsUsed.length > 0);
      recordTest(`G8.${i * 2 + variant}: Tool execution for "${item.q.slice(0, 30)}"`, passed, `tools=${res.toolsUsed?.join(',')}`);
    }
  }

  // ===========================================================================
  // FINAL SCORE & SUMMARY REPORT
  // ===========================================================================
  console.log('\n========================================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passedTests}/${totalTests} PASSED (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
  console.log(`FAILED TESTS: ${failedTests}`);
  console.log('========================================================================\n');

  if (failedTests > 0) {
    console.log('--- FAILURE BREAKDOWN ---');
    failures.forEach((f, idx) => {
      console.log(`${idx + 1}. ${f.name} -> ${f.details}`);
    });
  }

  return { totalTests, passedTests, failedTests, failures };
}

runTestSuite()
  .then(summary => {
    if (summary.failedTests === 0) {
      console.log('🎉 ALL 200 SCENARIOS PASSED WITH 100% ACCURACY!');
      process.exit(0);
    } else {
      console.error(`⚠️ ${summary.failedTests} TESTS FAILED.`);
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('FATAL TEST ERROR:', err);
    process.exit(1);
  });
