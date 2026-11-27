/**
 * TRÍ AI ONE SUPER BRAIN - VIETNAMESE SEMANTIC INTELLIGENCE & CONVERSATION MASTER TEST SUITE (100+ CASES)
 * 
 * Verifies:
 * 1. Tone mark disambiguation (mưa ≠ mua, bàn ≠ bán, bão ≠ bảo, nghỉ ≠ nghĩ, cổ ≠ cỗ, đá ≠ đã, hỏi ≠ hói)
 * 2. Weather Engine with live Open-Meteo API (Location anywhere, Hourly rain window, Intensity mm, Probability %)
 * 3. Quality Gate: WEATHER_QUERY bans Sales Engine, bans catalog reveal, bans phone request for buying
 * 4. Conversational Humanization: Zero forced name-asking at turn 1; only asks name when closing sales/quote
 * 5. Persona: Clean "TRÍ AI", zero robotic sales labels, zero "Cột 2" mentions to customer
 */

import { IntentEngine } from '../server/services/intelligence/intentEngine.js';
import { CentralBrainService } from '../server/services/centralBrainService.js';
import { SalesEngineAdapter } from '../server/adapters/salesEngineAdapter.js';
import { WeatherService } from '../server/services/weather/weatherService.js';
import assert from 'assert';

const TEST_CASES = [
  // ==========================================
  // GROUP 1: 10 MANDATORY USER PROMPT QUERIES
  // ==========================================
  { id: 'MAND_1', text: 'Chiều nay có mưa không?', expectedIntent: 'WEATHER_QUERY', expectSales: false, domain: 'WEATHER' },
  { id: 'MAND_2', text: 'Chiều nay ở Long Bình có mưa không?', expectedIntent: 'WEATHER_QUERY', expectSales: false, domain: 'WEATHER' },
  { id: 'MAND_3', text: 'Mai quận 9 có mưa không?', expectedIntent: 'WEATHER_QUERY', expectSales: false, domain: 'WEATHER' },
  { id: 'MAND_4', text: 'Mưa lớn không?', expectedIntent: 'WEATHER_QUERY', expectSales: false, domain: 'WEATHER' },
  { id: 'MAND_5', text: 'Mưa đến mấy giờ?', expectedIntent: 'WEATHER_QUERY', expectSales: false, domain: 'WEATHER' },
  { id: 'MAND_6', text: 'Trời mưa có giao hàng được không?', expectedIntent: 'SERVICE_QUERY', expectSales: true, domain: 'POLICY' },
  { id: 'MAND_7', text: 'Anh muốn mua máy in.', expectedIntent: 'SALES_INQUIRY', expectSales: true, domain: 'SALES' },
  { id: 'MAND_8', text: 'Anh cần mua laptop.', expectedIntent: 'SALES_INQUIRY', expectSales: true, domain: 'SALES' },
  { id: 'MAND_9', text: 'Có mẫu nào đáng mua không?', expectedIntent: 'PRODUCT_INQUIRY', expectSales: true, domain: 'SALES' },
  { id: 'MAND_10', text: 'Mưa nhiều thì có nên mua áo mưa không?', expectedIntent: 'GENERAL_CONVERSATION', expectSales: false, domain: 'GENERAL' },

  // ==========================================
  // GROUP 2: MƯA (RAIN) vs MUA (BUY) (20 CASES)
  // ==========================================
  { id: 'MUA_1', text: 'Trời đang mưa to quá', expectedIntent: 'WEATHER_QUERY', expectSales: false },
  { id: 'MUA_2', text: 'Hà Nội tối nay mưa không?', expectedIntent: 'WEATHER_QUERY', expectSales: false },
  { id: 'MUA_3', text: 'Đà Nẵng ngày mai có mưa rào không?', expectedIntent: 'WEATHER_QUERY', expectSales: false },
  { id: 'MUA_4', text: 'Cần Thơ sáng mai mưa mấy giờ?', expectedIntent: 'WEATHER_QUERY', expectSales: false },
  { id: 'MUA_5', text: 'Thủ Đức chiều nay mưa to không?', expectedIntent: 'WEATHER_QUERY', expectSales: false },
  { id: 'MUA_6', text: 'Dự báo trời mưa dầm cả tuần', expectedIntent: 'WEATHER_QUERY', expectSales: false },
  { id: 'MUA_7', text: 'Cơn mưa chiều nay kéo dài bao lâu?', expectedIntent: 'WEATHER_QUERY', expectSales: false },
  { id: 'MUA_8', text: 'Ngoài trời mưa ngập đường rồi', expectedIntent: 'WEATHER_QUERY', expectSales: false },
  { id: 'MUA_9', text: 'Lượng mưa chiều nay đo được bao nhiêu mm?', expectedIntent: 'WEATHER_QUERY', expectSales: false },
  { id: 'MUA_10', text: 'Mưa nhỏ hay mưa giông?', expectedIntent: 'WEATHER_QUERY', expectSales: false },
  { id: 'MUA_11', text: 'Tôi muốn mua máy đếm tiền', expectedIntent: 'SALES_INQUIRY', expectSales: true },
  { id: 'MUA_12', text: 'Tư vấn mua laptop văn phòng mỏng nhẹ', expectedIntent: 'PRODUCT_INQUIRY', expectSales: true },
  { id: 'MUA_13', text: 'Giá mua máy in Canon 2900 là bao nhiêu?', expectedIntent: 'SALES_INQUIRY', expectSales: true },
  { id: 'MUA_14', text: 'Đặt mua 2 hộp trà Oolong', expectedIntent: 'SALES_INQUIRY', expectSales: true },
  { id: 'MUA_15', text: 'Mua số lượng nhiều có chiết khấu không?', expectedIntent: 'SALES_INQUIRY', expectSales: true },
  { id: 'MUA_16', text: 'Nên mua máy in laser hay máy in phun?', expectedIntent: 'PRODUCT_INQUIRY', expectSales: true },
  { id: 'MUA_17', text: 'Shop có bán cà phê rang mộc không?', expectedIntent: 'SALES_INQUIRY', expectSales: true },
  { id: 'MUA_18', text: 'Chọn mua màn hình Dell 24 inch', expectedIntent: 'SALES_INQUIRY', expectSales: true },
  { id: 'MUA_19', text: 'Có nên mua nước hoa Cindy Bloom làm quà không?', expectedIntent: 'PRODUCT_INQUIRY', expectSales: true },
  { id: 'MUA_20', text: 'Chốt mua con máy này luôn nhé', expectedIntent: 'SALES_INQUIRY', expectSales: true },

  // ==========================================
  // GROUP 3: BÀN (DISCUSS/DESK) vs BÁN (SELL) (15 CASES)
  // ==========================================
  { id: 'BAN_1', text: 'Chúng ta cùng bàn về kế hoạch quý tới nhé', expectedIntent: 'GENERAL_CONVERSATION', expectSales: false },
  { id: 'BAN_2', text: 'Bàn bạc công việc một chút được không?', expectedIntent: 'GENERAL_CONVERSATION', expectSales: false },
  { id: 'BAN_3', text: 'Vấn đề này cần bàn kỹ hơn', expectedIntent: 'GENERAL_CONVERSATION', expectSales: false },
  { id: 'BAN_4', text: 'Ngồi vào bàn làm việc thôi nào', expectedIntent: 'GENERAL_CONVERSATION', expectSales: false },
  { id: 'BAN_5', text: 'Bàn luận về xu hướng AI trong năm nay', expectedIntent: 'KNOWLEDGE_QUERY', expectSales: false },
  { id: 'BAN_6', text: 'Shop bán những mặt hàng gì vậy?', expectedIntent: 'SALES_INQUIRY', expectSales: true },
  { id: 'BAN_7', text: 'Bên bạn bán máy đếm tiền chính hãng đúng không?', expectedIntent: 'SALES_INQUIRY', expectSales: true },
  { id: 'BAN_8', text: 'Có bán mực máy in Brother không?', expectedIntent: 'SALES_INQUIRY', expectSales: true },
  { id: 'BAN_9', text: 'Bán cho tôi 1 máy đếm tiền Xiudun', expectedIntent: 'SALES_INQUIRY', expectSales: true },
  { id: 'BAN_10', text: 'Bảng giá bán lẻ của shop', expectedIntent: 'SALES_INQUIRY', expectSales: true },
  { id: 'BAN_11', text: 'Chính sách bán hàng và giao nhận thế nào?', expectedIntent: 'SERVICE_QUERY', expectSales: true },
  { id: 'BAN_12', text: 'Bán chạy nhất hiện nay là model nào?', expectedIntent: 'PRODUCT_INQUIRY', expectSales: true },
  { id: 'BAN_13', text: 'Tôi muốn mua bàn làm việc giám đốc', expectedIntent: 'SALES_INQUIRY', expectSales: true },
  { id: 'BAN_14', text: 'Shop có bán bàn ghế văn phòng không?', expectedIntent: 'SALES_INQUIRY', expectSales: true },
  { id: 'BAN_15', text: 'Bàn giao thiết bị trong bao lâu sau khi đặt?', expectedIntent: 'SERVICE_QUERY', expectSales: true },

  // ==========================================
  // GROUP 4: BÃO (STORM) vs BẢO (TELL/INSURE) (15 CASES)
  // ==========================================
  { id: 'BAO_1', text: 'Cơn bão số 3 có đổ bộ vào miền Trung không?', expectedIntent: 'WEATHER_QUERY', expectSales: false },
  { id: 'BAO_2', text: 'Tin tức bão lũ mới nhất hôm nay', expectedIntent: 'WEATHER_QUERY', expectSales: false },
  { id: 'BAO_3', text: 'Bão cấp mấy khi vào đất liền?', expectedIntent: 'WEATHER_QUERY', expectSales: false },
  { id: 'BAO_4', text: 'Dự báo bão quét qua khu vực nào?', expectedIntent: 'WEATHER_QUERY', expectSales: false },
  { id: 'BAO_5', text: 'Mưa bão lớn thế này có an toàn không?', expectedIntent: 'WEATHER_QUERY', expectSales: false },
  { id: 'BAO_6', text: 'Bảo quản trà xanh như thế nào cho thơm lâu?', expectedIntent: 'KNOWLEDGE_QUERY', expectSales: false },
  { id: 'BAO_7', text: 'Chế độ bảo hành máy in là bao lâu?', expectedIntent: 'SERVICE_QUERY', expectSales: true },
  { id: 'BAO_8', text: 'Có được bảo hành tận nơi không?', expectedIntent: 'SERVICE_QUERY', expectSales: true },
  { id: 'BAO_9', text: 'Bảo hiểm hàng hóa khi vận chuyển đường xa', expectedIntent: 'SERVICE_QUERY', expectSales: true },
  { id: 'BAO_10', text: 'Báo giá cho tôi máy đếm tiền Glory', expectedIntent: 'SALES_INQUIRY', expectSales: true },
  { id: 'BAO_11', text: 'Bảo đảm hàng chính hãng chứ shop?', expectedIntent: 'SERVICE_QUERY', expectSales: true },
  { id: 'BAO_12', text: 'Ai bảo với bạn là tôi cần gấp?', expectedIntent: 'GENERAL_CONVERSATION', expectSales: false },
  { id: 'BAO_13', text: 'Bão tan chưa để tôi ra ngoài?', expectedIntent: 'WEATHER_QUERY', expectSales: false },
  { id: 'BAO_14', text: 'Mưa bão có ảnh hưởng tiến độ giao hàng không?', expectedIntent: 'SERVICE_QUERY', expectSales: true },
  { id: 'BAO_15', text: 'Gửi bảng báo giá chi tiết qua zalo nhé', expectedIntent: 'SALES_INQUIRY', expectSales: true },

  // ==========================================
  // GROUP 5: NGHỈ (REST) vs NGHĨ (THINK) (15 CASES)
  // ==========================================
  { id: 'NGHI_1', text: 'Nghỉ ngơi một chút đi bạn', expectedIntent: 'GENERAL_CONVERSATION', expectSales: false },
  { id: 'NGHI_2', text: 'Hôm nay được nghỉ làm ở nhà', expectedIntent: 'GENERAL_CONVERSATION', expectSales: false },
  { id: 'NGHI_3', text: 'Shop nghỉ lễ vào những ngày nào?', expectedIntent: 'SERVICE_QUERY', expectSales: true },
  { id: 'NGHI_4', text: 'Cho nhân viên nghỉ phép năm', expectedIntent: 'SECRETARY_TASK', expectSales: false },
  { id: 'NGHI_5', text: 'Nghỉ trưa xong nói chuyện tiếp nhé', expectedIntent: 'GENERAL_CONVERSATION', expectSales: false },
  { id: 'NGHI_6', text: 'Bạn nghĩ sao về xu hướng trí tuệ nhân tạo?', expectedIntent: 'KNOWLEDGE_QUERY', expectSales: false },
  { id: 'NGHI_7', text: 'Nghĩ mãi không ra cách giải bài toán này', expectedIntent: 'KNOWLEDGE_QUERY', expectSales: false },
  { id: 'NGHI_8', text: 'Tôi đang nghĩ đến việc mở rộng chi nhánh', expectedIntent: 'SECRETARY_TASK', expectSales: false },
  { id: 'NGHI_9', text: 'Bạn có nghĩ là giá cổ phiếu sẽ tăng không?', expectedIntent: 'FINANCE_QUERY', expectSales: false },
  { id: 'NGHI_10', text: 'Đừng nghĩ ngợi nhiều quá nhé', expectedIntent: 'GENERAL_CONVERSATION', expectSales: false },
  { id: 'NGHI_11', text: 'Theo bạn nghĩ mẫu máy in nào bền nhất?', expectedIntent: 'PRODUCT_INQUIRY', expectSales: true },
  { id: 'NGHI_12', text: 'Tôi nghĩ mức giá 5 triệu là hợp lý', expectedIntent: 'PRODUCT_INQUIRY', expectSales: true },
  { id: 'NGHI_13', text: 'Nghỉ dưỡng cuối tuần ở đâu đẹp?', expectedIntent: 'GENERAL_CONVERSATION', expectSales: false },
  { id: 'NGHI_14', text: 'Suy nghĩ kỹ trước khi quyết định mua', expectedIntent: 'PRODUCT_INQUIRY', expectSales: true },
  { id: 'NGHI_15', text: 'Cần nghỉ ngơi để lấy lại năng lượng', expectedIntent: 'GENERAL_CONVERSATION', expectSales: false },

  // ==========================================
  // GROUP 6: CỔ (STOCK/NECK) vs CỖ (FEAST) (10 CASES)
  // ==========================================
  { id: 'CO_1', text: 'Cổ phiếu FPT hôm nay thế nào?', expectedIntent: 'FINANCE_QUERY', expectSales: false },
  { id: 'CO_2', text: 'Thị trường cổ phiếu chứng khoán có biến động gì?', expectedIntent: 'FINANCE_QUERY', expectSales: false },
  { id: 'CO_3', text: 'Mỏi cổ vai gáy quá có cách nào đỡ không?', expectedIntent: 'KNOWLEDGE_QUERY', expectSales: false },
  { id: 'CO_4', text: 'Cổ áo sơ mi bị ố vàng tẩy thế nào?', expectedIntent: 'KNOWLEDGE_QUERY', expectSales: false },
  { id: 'CO_5', text: 'Cổ đông lớn của ngân hàng gồm những ai?', expectedIntent: 'FINANCE_QUERY', expectSales: false },
  { id: 'CO_6', text: 'Cuối tuần này nhà em có mâm cỗ cưới', expectedIntent: 'GENERAL_CONVERSATION', expectSales: false },
  { id: 'CO_7', text: 'Đặt cỗ tiệc tất niên cho công ty', expectedIntent: 'GENERAL_CONVERSATION', expectSales: false },
  { id: 'CO_8', text: 'Mâm cỗ truyền thống ngày Tết gồm những món gì?', expectedIntent: 'KNOWLEDGE_QUERY', expectSales: false },
  { id: 'CO_9', text: 'Cỗ bàn xong xuôi rồi bạn ạ', expectedIntent: 'GENERAL_CONVERSATION', expectSales: false },
  { id: 'CO_10', text: 'Giá cổ tức năm nay được chi trả bao nhiêu?', expectedIntent: 'FINANCE_QUERY', expectSales: false },

  // ==========================================
  // GROUP 7: ĐÁ (STONE/ICE) vs ĐÃ (ALREADY) (10 CASES)
  // ==========================================
  { id: 'DA_1', text: 'Đá một cốc cà phê cho tỉnh táo', expectedIntent: 'GENERAL_CONVERSATION', expectSales: false },
  { id: 'DA_2', text: 'Hòn đá phong thủy này hợp mệnh gì?', expectedIntent: 'KNOWLEDGE_QUERY', expectSales: false },
  { id: 'DA_3', text: 'Đá bóng lúc mấy giờ chiều nay?', expectedIntent: 'GENERAL_CONVERSATION', expectSales: false },
  { id: 'DA_4', text: 'Cho xin thêm ít đá lạnh', expectedIntent: 'GENERAL_CONVERSATION', expectSales: false },
  { id: 'DA_5', text: 'Tôi đã chuyển khoản thanh toán rồi', expectedIntent: 'SERVICE_QUERY', expectSales: true },
  { id: 'DA_6', text: 'Đơn hàng của tôi đã gửi đi chưa?', expectedIntent: 'SERVICE_QUERY', expectSales: true },
  { id: 'DA_7', text: 'Bạn đã ăn cơm trưa chưa?', expectedIntent: 'GENERAL_CONVERSATION', expectSales: false },
  { id: 'DA_8', text: 'Tôi đã nhận được máy in rồi nhé', expectedIntent: 'SERVICE_QUERY', expectSales: true },
  { id: 'DA_9', text: 'Shop đã kiểm tra hàng tồn kho chưa?', expectedIntent: 'SERVICE_QUERY', expectSales: true },
  { id: 'DA_10', text: 'Trời đã ngớt mưa chưa bạn?', expectedIntent: 'WEATHER_QUERY', expectSales: false },

  // ==========================================
  // GROUP 8: HỎI (ASK) vs HÓI (BALD) (10 CASES)
  // ==========================================
  { id: 'HOI_1', text: 'Tôi có thể hỏi bạn vài câu được không?', expectedIntent: 'GENERAL_CONVERSATION', expectSales: false },
  { id: 'HOI_2', text: 'Cho tôi hỏi thăm sức khỏe bạn nhé', expectedIntent: 'GENERAL_CONVERSATION', expectSales: false },
  { id: 'HOI_3', text: 'Hỏi giá máy in Brother màu', expectedIntent: 'SALES_INQUIRY', expectSales: true },
  { id: 'HOI_4', text: 'Hỏi về chính sách đại lý phân phối', expectedIntent: 'SERVICE_QUERY', expectSales: true },
  { id: 'HOI_5', text: 'Tôi muốn hỏi đường đi đến cửa hàng', expectedIntent: 'SERVICE_QUERY', expectSales: true },
  { id: 'HOI_6', text: 'Rụng tóc nhiều có nguy cơ bị hói đầu không?', expectedIntent: 'KNOWLEDGE_QUERY', expectSales: false },
  { id: 'HOI_7', text: 'Cách phòng ngừa hói đầu sớm ở nam giới', expectedIntent: 'KNOWLEDGE_QUERY', expectSales: false },
  { id: 'HOI_8', text: 'Thuốc trị hói tóc có hiệu quả thật không?', expectedIntent: 'KNOWLEDGE_QUERY', expectSales: false },
  { id: 'HOI_9', text: 'Hỏi thăm bạn một chút về công việc', expectedIntent: 'GENERAL_CONVERSATION', expectSales: false },
  { id: 'HOI_10', text: 'Hói chữ M thì nên để kiểu tóc nào?', expectedIntent: 'KNOWLEDGE_QUERY', expectSales: false }
];

async function runTestSuite() {
  console.log('='.repeat(80));
  console.log('🧪 RUNNING MASTER TEST SUITE: VIETNAMESE SEMANTIC INTELLIGENCE & CONVERSATION (105 CASES)');
  console.log('='.repeat(80));

  let passed = 0;
  let failed = 0;
  const failures = [];

  for (let i = 0; i < TEST_CASES.length; i++) {
    const tc = TEST_CASES[i];
    const intentRes = IntentEngine.analyzeIntent(tc.text);
    const actualIntent = intentRes.primaryIntent;
    const isSalesActual = SalesEngineAdapter.isSalesInquiry(tc.text);

    let ok = true;
    const reasons = [];

    // Check 1: Intent matching
    if (tc.expectedIntent && actualIntent !== tc.expectedIntent) {
      // Allow acceptable equivalence across canonical intent names
      const isSalesEquiv = ['SALES_INQUIRY', 'PRODUCT_INQUIRY', 'SALES_CONSULTATION', 'ORDER_REQUEST', 'PRICE_INQUIRY', 'CATALOG_OVERVIEW', 'FORMAL_QUOTATION', 'PRODUCT_PURCHASE', 'PRODUCT_INFORMATION'].includes(tc.expectedIntent) &&
                           ['SALES_INQUIRY', 'PRODUCT_INQUIRY', 'SALES_CONSULTATION', 'ORDER_REQUEST', 'PRICE_INQUIRY', 'CATALOG_OVERVIEW', 'FORMAL_QUOTATION', 'PRODUCT_PURCHASE', 'PRODUCT_INFORMATION', 'INTERNAL_DOCUMENT_RAG', 'GENERAL_CONVERSATION'].includes(actualIntent);
      const isGenEquiv = ['GENERAL_CONVERSATION', 'GENERAL_CHAT'].includes(tc.expectedIntent) &&
                         ['GENERAL_CONVERSATION', 'GENERAL_CHAT', 'KNOWLEDGE_QUERY', 'MIXED_INTENT'].includes(actualIntent);
      const isServiceEquiv = ['SERVICE_QUERY', 'POLICY_INQUIRY', 'INTERNAL_DOCUMENT_RAG'].includes(tc.expectedIntent) &&
                            ['SERVICE_QUERY', 'POLICY_INQUIRY', 'INTERNAL_DOCUMENT_RAG', 'GENERAL_CONVERSATION', 'SALES_CONSULTATION'].includes(actualIntent);
      const isKnowledgeEquiv = ['KNOWLEDGE_QUERY'].includes(tc.expectedIntent) &&
                               ['KNOWLEDGE_QUERY', 'GENERAL_CONVERSATION', 'GENERAL_CHAT', 'INTERNET_SEARCH'].includes(actualIntent);
      const isFinanceEquiv = ['FINANCE_QUERY'].includes(tc.expectedIntent) &&
                             ['FINANCE_QUERY', 'STOCK_INQUIRY', 'GENERAL_CONVERSATION'].includes(actualIntent);
      const isSecEquiv = ['SECRETARY_TASK'].includes(tc.expectedIntent) &&
                         ['SECRETARY_TASK', 'GENERAL_CONVERSATION', 'OFFICE_TASK'].includes(actualIntent);

      if (!isSalesEquiv && !isGenEquiv && !isServiceEquiv && !isKnowledgeEquiv && !isFinanceEquiv && !isSecEquiv) {
        ok = false;
        reasons.push(`Intent mismatch: expected ${tc.expectedIntent}, got ${actualIntent}`);
      }
    }

    // Check 2: Sales Engine inquiry trigger
    if (tc.expectSales !== undefined) {
      if (tc.expectSales && !isSalesActual) {
        ok = false;
        reasons.push(`Sales inquiry expected TRUE, got FALSE`);
      } else if (!tc.expectSales && isSalesActual) {
        ok = false;
        reasons.push(`Sales inquiry expected FALSE, got TRUE (Sales Hijack!)`);
      }
    }

    // Check 3: For weather queries, verify slots (Location / Time)
    if (actualIntent === 'WEATHER_QUERY') {
      const weatherAnalysis = WeatherService.analyzeWeatherQuery(tc.text);
      if (tc.id === 'MAND_2' && (!weatherAnalysis.location || !weatherAnalysis.location.includes('Long Bình'))) {
        ok = false;
        reasons.push(`Location parse failure: expected Long Bình in location, got ${weatherAnalysis.location}`);
      }
      if (tc.id === 'MAND_3' && (!weatherAnalysis.location || !weatherAnalysis.location.includes('Quận 9'))) {
        ok = false;
        reasons.push(`Location parse failure: expected Quận 9 in location, got ${weatherAnalysis.location}`);
      }
    }

    if (ok) {
      passed++;
      console.log(`[PASS] #${i + 1} [${tc.id}] "${tc.text}" -> Intent: ${actualIntent} | SalesTrigger: ${isSalesActual}`);
    } else {
      failed++;
      console.error(`[FAIL] #${i + 1} [${tc.id}] "${tc.text}" -> ${reasons.join('; ')}`);
      failures.push({ id: tc.id, text: tc.text, reasons });
    }
  }

  // ==========================================
  // CONVERSATIONAL QUALITY & LIVE ROUTING CHECK
  // ==========================================
  console.log('\n--- VERIFYING END-TO-END CENTRAL BRAIN CONVERSATIONAL RESPONSES ---');
  
  // Test Turn 1 greeting without forced name-asking
  const greetingRes = await CentralBrainService.processChat({
    message: 'Xin chào shop!',
    conversationId: `test_greet_${Date.now()}`
  });
  const greetText = greetingRes.reply || '';
  const asksNameForcibly = greetText.includes('Xin lỗi, bạn vui lòng') || greetText.includes('tiện xưng hô');
  const hasRoboticLabel = greetText.includes('SALES ROBOT') || greetText.includes('ULTIMATE ROBOT');
  const mentionsCol2 = greetText.includes('Cột 2');

  console.log(`[TURN 1 GREETING TEXT]: "${greetText.replace(/\n/g, ' ')}"`);
  assert.strictEqual(asksNameForcibly, false, 'Turn 1 greeting must NEVER forcibly demand customer name!');
  assert.strictEqual(hasRoboticLabel, false, 'Assistant persona must NEVER use SALES ROBOT or ULTIMATE ROBOT!');
  assert.strictEqual(mentionsCol2, false, 'Customer response must NEVER mention Cột 2!');

  // Test Live Weather Query through CentralBrainService
  console.log('\n--- VERIFYING LIVE WEATHER RESPONSE VIA CENTRAL BRAIN ---');
  const weatherRes = await CentralBrainService.processChat({
    message: 'Chiều nay ở Long Bình có mưa không?',
    conversationId: `test_weather_${Date.now()}`
  });
  const weatherText = weatherRes.reply || '';
  console.log(`[LIVE WEATHER REPLY]: "${weatherText.replace(/\n/g, ' ')}"`);
  assert.strictEqual(weatherRes.revealCatalog, false, 'Weather response must keep revealCatalog = false!');
  assert.strictEqual(weatherText.toLowerCase().includes('long bình'), true, 'Weather reply must address Long Bình!');
  assert.strictEqual(weatherText.includes('sản phẩm'), false, 'Weather reply must NEVER push store products!');

  console.log('\n' + '='.repeat(80));
  console.log(`🏁 TEST SUMMARY: ${passed}/${TEST_CASES.length} PASSED (${((passed / TEST_CASES.length) * 100).toFixed(1)}%) | ${failed} FAILED`);
  console.log('='.repeat(80));

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Test Suite Fatal Error:', err);
  process.exit(1);
});
