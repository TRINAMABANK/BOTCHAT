/**
 * TRÍ AI ONE SUPER BRAIN - VIETNAMESE SERVICE & PRODUCT INTENT ISOLATION TEST SUITE (100+ CASES)
 * 
 * Objectives:
 * 1. P0 Bug Fix: "Bạn biết sửa điện thoại không?" NEVER recommends "Cà Phê Đậm Vị - Sữa GUNAM" or food/goods
 * 2. Tone Mark Disambiguation (Strict Vietnamese Semantic Integrity):
 *    - sửa (repair/fix) ≠ sữa (milk/dairy)
 *    - mưa (rain) ≠ mua (buy)
 *    - bàn (table/discuss) ≠ bán (sell)
 *    - bảo (guarantee/tell) ≠ bão (storm)
 *    - nghỉ (rest) ≠ nghĩ (think)
 *    - cổ (ancient/neck/stock) ≠ cỗ (feast)
 *    - đá (ice/rock/kick) ≠ đã (already)
 *    - đường (road/sugar) ≠ đương (current/face)
 * 3. Intent Isolation:
 *    - REPAIR_SERVICE, MAINTENANCE_SERVICE, GENERAL_SERVICE, SALES_OF_GOODS, PRODUCT_PURCHASE,
 *      PRODUCT_INFORMATION, WEATHER_QUERY, GENERAL_CONVERSATION, MIXED_INTENT
 * 4. Response Relevance Quality Gate:
 *    - Blocks product recommendation if user asks for repair or outside shop catalog
 * 5. Courteous out-of-catalog response:
 *    - "Dạ, hiện tại bên em chưa cung cấp dịch vụ sửa chữa điện thoại. Anh/chị có thể cho em biết dòng điện thoại và tình trạng máy để em hỗ trợ tìm hướng xử lý hoặc địa điểm sửa chữa phù hợp nhé."
 */

import { IntentEngine, getIntentGroup, INTENT_GROUPS } from '../server/services/intelligence/intentEngine.js';
import { CentralBrainService } from '../server/services/centralBrainService.js';
import { SalesEngineAdapter } from '../server/adapters/salesEngineAdapter.js';
import { evaluateProductMatch, calculateProductSimilarity } from '../server/salesEngine.js';
import { SelfVerificationQualityGate } from '../server/services/intelligence/selfVerificationQualityGate.js';
import assert from 'assert';

const SALES_INTENTS = ['PRODUCT_PURCHASE', 'PRODUCT_INFORMATION', 'SALES_CONSULTATION', 'PRICE_INQUIRY', 'POLICY_INQUIRY', 'CATALOG_OVERVIEW', 'SPEC_SEARCH', 'FORMAL_QUOTATION'];

const TEST_CASES = [
  // ==========================================
  // SECTION 1: 10 MANDATORY USER CORE CASES
  // ==========================================
  { id: 'CORE_1', text: 'Bạn biết sửa điện thoại không?', expectedIntents: ['REPAIR_SERVICE'], expectSales: false, noDairy: true },
  { id: 'CORE_2', text: 'Điện thoại bị hỏng màn hình', expectedIntents: ['REPAIR_SERVICE'], expectSales: false, noDairy: true },
  { id: 'CORE_3', text: 'Anh muốn mua sữa', expectedIntents: ['PRODUCT_PURCHASE'], expectSales: true },
  { id: 'CORE_4', text: 'Cà phê sữa có ngon không?', expectedIntents: ['PRODUCT_INFORMATION', 'SALES_CONSULTATION'], expectSales: true },
  { id: 'CORE_5', text: 'Hôm nay có mưa không?', expectedIntents: ['WEATHER_QUERY'], expectSales: false },
  { id: 'CORE_6', text: 'Anh muốn mua điện thoại', expectedIntents: ['PRODUCT_PURCHASE'], expectSales: true },
  { id: 'CORE_7', text: 'Sửa máy tính ở đâu?', expectedIntents: ['REPAIR_SERVICE'], expectSales: false, noDairy: true },
  { id: 'CORE_8', text: 'Bàn làm việc giá bao nhiêu?', expectedIntents: ['PRICE_INQUIRY', 'SALES_CONSULTATION'], expectSales: true },
  { id: 'CORE_9', text: 'Anh muốn bán bàn cũ', expectedIntents: ['SALES_OF_GOODS'], expectSales: false },
  { id: 'CORE_10', text: 'Trời mưa có nên mua áo mưa không?', expectedIntents: ['GENERAL_CONVERSATION', 'MIXED_INTENT', 'WEATHER_QUERY'], expectSales: false },

  // ==========================================
  // SECTION 2: 20 SỬA (REPAIR) vs SỮA (MILK) CASES
  // ==========================================
  { id: 'SUA_REP_1', text: 'Có nhận sửa máy in không?', expectedIntents: ['REPAIR_SERVICE'], expectSales: false, noDairy: true },
  { id: 'SUA_REP_2', text: 'Tiệm sửa máy tính ở đâu?', expectedIntents: ['REPAIR_SERVICE'], expectSales: false, noDairy: true },
  { id: 'SUA_REP_3', text: 'Sửa màn hình bị vỡ bao nhiêu tiền?', expectedIntents: ['REPAIR_SERVICE'], expectSales: false, noDairy: true },
  { id: 'SUA_REP_4', text: 'Máy scan bị kẹt giấy sửa thế nào?', expectedIntents: ['REPAIR_SERVICE'], expectSales: false, noDairy: true },
  { id: 'SUA_REP_5', text: 'Điện thoại hỏng sửa ở đâu uy tín?', expectedIntents: ['REPAIR_SERVICE'], expectSales: false, noDairy: true },
  { id: 'SUA_REP_6', text: 'Em có biết sửa lỗi này không?', expectedIntents: ['REPAIR_SERVICE'], expectSales: false, noDairy: true },
  { id: 'SUA_REP_7', text: 'Bên mình có sửa máy tính bàn không?', expectedIntents: ['REPAIR_SERVICE'], expectSales: false, noDairy: true },
  { id: 'SUA_REP_8', text: 'Sửa nguồn laptop hết bao nhiêu?', expectedIntents: ['REPAIR_SERVICE'], expectSales: false, noDairy: true },
  { id: 'SUA_REP_9', text: 'Bàn phím bị liệt nút có sửa được không?', expectedIntents: ['REPAIR_SERVICE'], expectSales: false, noDairy: true },
  { id: 'SUA_REP_10', text: 'Chỗ nào nhận sửa tai nghe bluetooth?', expectedIntents: ['REPAIR_SERVICE'], expectSales: false, noDairy: true },

  { id: 'SUA_DAIRY_1', text: 'Cà Phê Đậm Vị - Sữa GUNAM', expectedIntents: SALES_INTENTS, expectSales: true },
  { id: 'SUA_DAIRY_2', text: 'Anh muốn mua sữa tươi thanh trùng', expectedIntents: ['PRODUCT_PURCHASE'], expectSales: true },
  { id: 'SUA_DAIRY_3', text: 'Sữa đặc hộp này giá bao nhiêu?', expectedIntents: ['PRICE_INQUIRY', 'SALES_CONSULTATION'], expectSales: true },
  { id: 'SUA_DAIRY_4', text: 'Shop có bán sữa bắp không?', expectedIntents: SALES_INTENTS, expectSales: true },
  { id: 'SUA_DAIRY_5', text: 'Pha một ly trà sữa matcha ngon', expectedIntents: [...SALES_INTENTS, 'GENERAL_CONVERSATION'], expectSales: true },
  { id: 'SUA_DAIRY_6', text: 'Sữa hạt dinh dưỡng loại nào tốt?', expectedIntents: [...SALES_INTENTS, 'GENERAL_CONVERSATION'], expectSales: true },
  { id: 'SUA_DAIRY_7', text: 'Bột sữa pha trà giá bao nhiêu?', expectedIntents: ['PRICE_INQUIRY', 'SALES_CONSULTATION'], expectSales: true },
  { id: 'SUA_DAIRY_8', text: 'Mua 2 lon sữa bột cho bé', expectedIntents: ['PRODUCT_PURCHASE'], expectSales: true },
  { id: 'SUA_DAIRY_9', text: 'Cà phê sữa đá pha phin ngon đậm vị', expectedIntents: SALES_INTENTS, expectSales: true },
  { id: 'SUA_DAIRY_10', text: 'Sữa chua nếp cẩm có sẵn không?', expectedIntents: [...SALES_INTENTS, 'SERVICE_SURVEY_REQUEST'], expectSales: true },

  // ==========================================
  // SECTION 3: 15 MƯA (RAIN) vs MUA (BUY) CASES
  // ==========================================
  { id: 'MUA_RAIN_1', text: 'Chiều nay có mưa to không?', expectedIntents: ['WEATHER_QUERY'], expectSales: false },
  { id: 'MUA_RAIN_2', text: 'Trời sắp mưa rồi', expectedIntents: ['WEATHER_QUERY'], expectSales: false },
  { id: 'MUA_RAIN_3', text: 'Cơn mưa này kéo dài bao lâu?', expectedIntents: ['WEATHER_QUERY'], expectSales: false },
  { id: 'MUA_RAIN_4', text: 'Dự báo trời mưa dầm cả tuần', expectedIntents: ['WEATHER_QUERY'], expectSales: false },
  { id: 'MUA_RAIN_5', text: 'Mưa rào hay mưa nhỏ?', expectedIntents: ['WEATHER_QUERY'], expectSales: false },
  { id: 'MUA_RAIN_6', text: 'Đường ngập do mưa lớn', expectedIntents: ['WEATHER_QUERY'], expectSales: false },
  { id: 'MUA_RAIN_7', text: 'Mai Sài Gòn mưa lúc mấy giờ?', expectedIntents: ['WEATHER_QUERY'], expectSales: false },
  { id: 'MUA_RAIN_8', text: 'Lượng mưa hôm nay đo được bao nhiêu?', expectedIntents: ['WEATHER_QUERY'], expectSales: false },

  { id: 'MUA_BUY_1', text: 'Tôi muốn mua máy in Canon', expectedIntents: ['PRODUCT_PURCHASE'], expectSales: true },
  { id: 'MUA_BUY_2', text: 'Cần mua laptop Lenovo Thinkpad', expectedIntents: ['PRODUCT_PURCHASE'], expectSales: true },
  { id: 'MUA_BUY_3', text: 'Mua 3 hộp trà Oolong biếu tết', expectedIntents: ['PRODUCT_PURCHASE'], expectSales: true },
  { id: 'MUA_BUY_4', text: 'Đặt mua máy đếm tiền giao ngay', expectedIntents: ['PRODUCT_PURCHASE', 'ORDER_REQUEST'], expectSales: true },
  { id: 'MUA_BUY_5', text: 'Chọn mua màn hình 24 inch', expectedIntents: ['PRODUCT_PURCHASE'], expectSales: true },
  { id: 'MUA_BUY_6', text: 'Có nên mua mẫu này không?', expectedIntents: SALES_INTENTS, expectSales: true },
  { id: 'MUA_BUY_7', text: 'Tìm mua linh kiện máy tính', expectedIntents: ['PRODUCT_PURCHASE'], expectSales: true },

  // ==========================================
  // SECTION 4: 15 BÀN (TABLE/DISCUSS) vs BÁN (SELL) CASES
  // ==========================================
  { id: 'BAN_DISC_1', text: 'Chúng ta bàn bạc về kế hoạch quý tới', expectedIntents: ['GENERAL_CONVERSATION'], expectSales: false },
  { id: 'BAN_DISC_2', text: 'Để anh bàn lại với gia đình', expectedIntents: ['GENERAL_CONVERSATION'], expectSales: false },
  { id: 'BAN_DISC_3', text: 'Họ đang bàn chuyện công việc', expectedIntents: ['GENERAL_CONVERSATION'], expectSales: false },
  { id: 'BAN_DISC_4', text: 'Mời anh ngồi vào bàn uống nước', expectedIntents: ['GENERAL_CONVERSATION'], expectSales: false },
  { id: 'BAN_DISC_5', text: 'Dọn dẹp bàn làm việc cho gọn', expectedIntents: ['GENERAL_CONVERSATION'], expectSales: false },
  { id: 'BAN_DISC_6', text: 'Tôi muốn bán chiếc xe cũ', expectedIntents: ['SALES_OF_GOODS'], expectSales: false },
  { id: 'BAN_DISC_7', text: 'Anh đang muốn bán lại điện thoại này', expectedIntents: ['SALES_OF_GOODS'], expectSales: false },

  { id: 'BAN_SELL_1', text: 'Shop bán những mặt hàng gì?', expectedIntents: SALES_INTENTS, expectSales: true },
  { id: 'BAN_SELL_2', text: 'Bên em có bán máy scan không?', expectedIntents: SALES_INTENTS, expectSales: true },
  { id: 'BAN_SELL_3', text: 'Giá bán của máy in Brother này bao nhiêu?', expectedIntents: ['PRICE_INQUIRY', 'SALES_CONSULTATION'], expectSales: true },
  { id: 'BAN_SELL_4', text: 'Bán cho tôi 1 hộp trà', expectedIntents: ['PRODUCT_PURCHASE', 'SALES_CONSULTATION'], expectSales: true },
  { id: 'BAN_SELL_5', text: 'Có bán trả góp không shop?', expectedIntents: ['SERVICE_QUERY', 'POLICY_INQUIRY', 'GENERAL_CONVERSATION', 'SALES_CONSULTATION'], expectSales: true },
  { id: 'BAN_SELL_6', text: 'Mẫu bàn làm việc chữ L bán chạy nhất', expectedIntents: [...SALES_INTENTS, 'GENERAL_CONVERSATION'], expectSales: true },
  { id: 'BAN_SELL_7', text: 'Bán hàng chính hãng có tem không?', expectedIntents: ['SERVICE_QUERY', 'POLICY_INQUIRY', 'SALES_CONSULTATION'], expectSales: true },
  { id: 'BAN_SELL_8', text: 'Chính sách bán sỉ số lượng lớn', expectedIntents: ['SERVICE_QUERY', 'POLICY_INQUIRY', 'SALES_CONSULTATION', 'INTERNAL_DOCUMENT_RAG'], expectSales: true },

  // ==========================================
  // SECTION 5: 10 BẢO (WARRANTY/TELL) vs BÃO (STORM) CASES
  // ==========================================
  { id: 'BAO_STORM_1', text: 'Cơn bão số 4 đang áp sát bờ biển', expectedIntents: ['WEATHER_QUERY'], expectSales: false },
  { id: 'BAO_STORM_2', text: 'Dự báo bão mạnh cấp mấy?', expectedIntents: ['WEATHER_QUERY'], expectSales: false },
  { id: 'BAO_STORM_3', text: 'Tình hình áp thấp và mưa bão miền Trung', expectedIntents: ['WEATHER_QUERY'], expectSales: false },
  { id: 'BAO_STORM_4', text: 'Bão đổ bộ vào tỉnh nào?', expectedIntents: ['WEATHER_QUERY'], expectSales: false },
  { id: 'BAO_STORM_5', text: 'Trời giông bão có nguy hiểm không?', expectedIntents: ['WEATHER_QUERY'], expectSales: false },

  { id: 'BAO_WARR_1', text: 'Thời gian bảo hành máy là bao lâu?', expectedIntents: ['POLICY_INQUIRY', 'SERVICE_QUERY'], expectSales: true },
  { id: 'BAO_WARR_2', text: 'Chính sách bảo hành 1 đổi 1 như thế nào?', expectedIntents: ['POLICY_INQUIRY', 'SERVICE_QUERY'], expectSales: true },
  { id: 'BAO_WARR_3', text: 'Sếp bảo gửi báo giá sớm', expectedIntents: ['GENERAL_CONVERSATION', 'FORMAL_QUOTATION'], expectSales: false },
  { id: 'BAO_WARR_4', text: 'Bảo hiểm thiết bị có kèm theo không?', expectedIntents: ['POLICY_INQUIRY', 'SERVICE_QUERY'], expectSales: true },
  { id: 'BAO_WARR_5', text: 'Máy này được bảo trì định kỳ không?', expectedIntents: ['MAINTENANCE_SERVICE', 'POLICY_INQUIRY', 'SERVICE_SURVEY_REQUEST'], expectSales: false },

  // ==========================================
  // SECTION 6: 10 NGHỈ (REST) vs NGHĨ (THINK) CASES
  // ==========================================
  { id: 'NGHI_REST_1', text: 'Hôm nay công ty nghỉ lễ', expectedIntents: ['GENERAL_CONVERSATION'], expectSales: false },
  { id: 'NGHI_REST_2', text: 'Cuối tuần tôi đi nghỉ dưỡng', expectedIntents: ['GENERAL_CONVERSATION'], expectSales: false },
  { id: 'NGHI_REST_3', text: 'Shop có làm việc ngày nghỉ không?', expectedIntents: ['SERVICE_QUERY', 'COMPANY_INFO', 'GENERAL_CONVERSATION'], expectSales: true },
  { id: 'NGHI_REST_4', text: 'Cho em xin nghỉ phép 2 ngày', expectedIntents: ['GENERAL_CONVERSATION'], expectSales: false },
  { id: 'NGHI_REST_5', text: 'Nghỉ trưa xong rồi làm việc tiếp', expectedIntents: ['GENERAL_CONVERSATION'], expectSales: false },

  { id: 'NGHI_THINK_1', text: 'Tôi nghĩ mẫu này rất đáng mua', expectedIntents: SALES_INTENTS, expectSales: true },
  { id: 'NGHI_THINK_2', text: 'Em nghĩ phương án nào tối ưu hơn?', expectedIntents: [...SALES_INTENTS, 'GENERAL_CONVERSATION'], expectSales: false },
  { id: 'NGHI_THINK_3', text: 'Nghĩ ngợi nhiều mệt đầu quá', expectedIntents: ['GENERAL_CONVERSATION'], expectSales: false },
  { id: 'NGHI_THINK_4', text: 'Để tôi suy nghĩ thêm về giá này', expectedIntents: ['GENERAL_CONVERSATION'], expectSales: false },
  { id: 'NGHI_THINK_5', text: 'Nghĩ lại thì chiếc laptop này hợp hơn', expectedIntents: SALES_INTENTS, expectSales: true },

  // ==========================================
  // SECTION 7: 10 CỔ (NECK/STOCK) vs CỖ (FEAST) CASES
  // ==========================================
  { id: 'CO_FEAST_1', text: 'Hôm nay nhà tôi có cỗ', expectedIntents: ['GENERAL_CONVERSATION'], expectSales: false },
  { id: 'CO_FEAST_2', text: 'Đi ăn cỗ cưới ở quê', expectedIntents: ['GENERAL_CONVERSATION', 'APPOINTMENT'], expectSales: false },
  { id: 'CO_FEAST_3', text: 'Đặt 5 mâm cỗ tiệc', expectedIntents: ['GENERAL_CONVERSATION', 'KNOWLEDGE_QUERY'], expectSales: false },
  { id: 'CO_FEAST_4', text: 'Nấu cỗ giỗ đầu', expectedIntents: ['GENERAL_CONVERSATION'], expectSales: false },
  { id: 'CO_FEAST_5', text: 'Chuẩn bị mâm cỗ tất niên', expectedIntents: ['GENERAL_CONVERSATION', 'KNOWLEDGE_QUERY'], expectSales: false },

  { id: 'CO_STOCK_1', text: 'Cổ phiếu FPT hôm nay tăng bao nhiêu?', expectedIntents: ['FINANCE_QUERY'], expectSales: false },
  { id: 'CO_STOCK_2', text: 'Tư vấn cổ phiếu chứng khoán tiềm năng', expectedIntents: ['FINANCE_QUERY'], expectSales: false },
  { id: 'CO_STOCK_3', text: 'Máy in cổ này còn phụ tùng không?', expectedIntents: SALES_INTENTS, expectSales: true },
  { id: 'CO_STOCK_4', text: 'Đau mỏi vai cổ khi ngồi văn phòng', expectedIntents: ['GENERAL_CONVERSATION'], expectSales: false },
  { id: 'CO_STOCK_5', text: 'Cổ đông biểu quyết thông qua nghị quyết', expectedIntents: ['FINANCE_QUERY'], expectSales: false },

  // ==========================================
  // SECTION 8: 10 ĐÁ (ICE/ROCK/KICK) vs ĐÃ (ALREADY) CASES
  // ==========================================
  { id: 'DA_ICE_1', text: 'Đá một cốc cà phê cho tỉnh táo', expectedIntents: ['GENERAL_CONVERSATION'], expectSales: false },
  { id: 'DA_ICE_2', text: 'Uống trà sữa thêm đá', expectedIntents: [...SALES_INTENTS, 'GENERAL_CONVERSATION'], expectSales: true },
  { id: 'DA_ICE_3', text: 'Đi đá bóng cùng đồng nghiệp', expectedIntents: ['GENERAL_CONVERSATION'], expectSales: false },
  { id: 'DA_ICE_4', text: 'Hòn đá phong thủy đặt bàn', expectedIntents: ['GENERAL_CONVERSATION', 'KNOWLEDGE_QUERY'], expectSales: false },
  { id: 'DA_ICE_5', text: 'Cà phê đen đá không đường', expectedIntents: SALES_INTENTS, expectSales: true },

  { id: 'DA_ALREADY_1', text: 'Tôi đã chuyển khoản thanh toán rồi', expectedIntents: ['SERVICE_QUERY', 'GENERAL_CONVERSATION'], expectSales: true },
  { id: 'DA_ALREADY_2', text: 'Đơn hàng đã được duyệt chưa?', expectedIntents: ['SERVICE_QUERY', 'GENERAL_CONVERSATION'], expectSales: true },
  { id: 'DA_ALREADY_3', text: 'Anh đã nhận được máy in rồi', expectedIntents: ['SERVICE_QUERY', 'SALES_CONSULTATION'], expectSales: true },
  { id: 'DA_ALREADY_4', text: 'Khách đã cung cấp số điện thoại', expectedIntents: ['GENERAL_CONVERSATION'], expectSales: true },
  { id: 'DA_ALREADY_5', text: 'Tôi đã xem thông số ở Cột 2', expectedIntents: SALES_INTENTS, expectSales: true },

  // ==========================================
  // SECTION 9: 10 ĐƯỜNG (ROAD/SUGAR) vs ĐƯƠNG (CURRENT/FACE) CASES
  // ==========================================
  { id: 'DUONG_ROAD_1', text: 'Chỉ đường đến cửa hàng gần nhất', expectedIntents: ['COMPANY_INFO', 'GENERAL_CONVERSATION'], expectSales: true },
  { id: 'DUONG_ROAD_2', text: 'Đoạn đường này đang ngập nước', expectedIntents: ['WEATHER_QUERY', 'GENERAL_CONVERSATION'], expectSales: false },
  { id: 'DUONG_ROAD_3', text: 'Trà Oolong này có vị ngọt của đường phèn', expectedIntents: SALES_INTENTS, expectSales: true },
  { id: 'DUONG_ROAD_4', text: 'Cà phê rang mộc không thêm đường', expectedIntents: SALES_INTENTS, expectSales: true },
  { id: 'DUONG_ROAD_5', text: 'Địa chỉ shop ở số mấy đường Lê Lợi?', expectedIntents: ['COMPANY_INFO', 'GENERAL_CONVERSATION'], expectSales: true },

  { id: 'DUONG_CURR_1', text: 'Đương kim vô địch giải đấu', expectedIntents: ['GENERAL_CONVERSATION'], expectSales: false },
  { id: 'DUONG_CURR_2', text: 'Đối đương với khó khăn thử thách', expectedIntents: ['GENERAL_CONVERSATION'], expectSales: false },
  { id: 'DUONG_CURR_3', text: 'Đương thời ông ấy rất nổi tiếng', expectedIntents: ['GENERAL_CONVERSATION'], expectSales: false },
  { id: 'DUONG_CURR_4', text: 'Đảm đương trọng trách quản lý dự án', expectedIntents: ['GENERAL_CONVERSATION'], expectSales: false },
  { id: 'DUONG_CURR_5', text: 'Tương đương với giá trị 5 triệu đồng', expectedIntents: ['GENERAL_CONVERSATION', 'PRICE_INQUIRY'], expectSales: false }
];

// Mock catalog representation
const MOCK_PRODUCTS = [
  { id: 1, name: 'Cà Phê Đậm Vị - Sữa GUNAM', field: 'Trà & Cà phê', price: 120000, description: 'Cà phê hòa tan sữa đậm vị thơm ngon' },
  { id: 2, name: 'Máy in Laser Brother HL-L2321D', field: 'Máy in & Thiết bị văn phòng', price: 2950000, description: 'Máy in laser đơn năng đảo mặt tự động' },
  { id: 3, name: 'Laptop Lenovo ThinkPad E14 Gen 5', field: 'Laptop & Công nghệ', price: 16500000, description: 'Laptop văn phòng bền bỉ mỏng nhẹ' },
  { id: 4, name: 'Bột Matcha Nguyên Chất Nhật Bản', field: 'Trà & Cà phê', price: 250000, description: 'Matcha Uji thơm mịn' },
  { id: 5, name: 'Bàn làm việc Giám Đốc Royal Wood', field: 'Nội thất văn phòng', price: 4500000, description: 'Bàn gỗ sồi cao cấp sang trọng' }
];

async function runTestSuite() {
  console.log('========================================================================');
  console.log('TRÍ AI - VIETNAMESE SERVICE & PRODUCT ISOLATION MASTER SUITE (100+ CASES)');
  console.log('Target: Sửa ≠ Sữa, Mưa ≠ Mua, Bàn ≠ Bán, Bão ≠ Bảo, Nghiệp vụ Dịch Vụ cách ly');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  for (const tc of TEST_CASES) {
    const analysis = IntentEngine.analyzeIntent(tc.text);
    const isSales = SalesEngineAdapter.isSalesInquiry(tc.text);

    let ok = true;
    const errors = [];

    // Check Expected Intent
    if (tc.expectedIntents && !tc.expectedIntents.includes(analysis.primaryIntent)) {
      ok = false;
      errors.push(`Intent mismatch: got ${analysis.primaryIntent}, expected one of [${tc.expectedIntents.join(', ')}]`);
    }

    // Check Sales Engine activation match
    if (tc.expectSales !== undefined && isSales !== tc.expectSales) {
      ok = false;
      errors.push(`SalesEngineAdapter mismatch: got isSales=${isSales}, expected ${tc.expectSales}`);
    }

    // Check Dairy Isolation (Repair must NEVER match dairy products)
    if (tc.noDairy) {
      const match = evaluateProductMatch(tc.text, tc.text.toLowerCase(), MOCK_PRODUCTS);
      if (match.topProduct && /(sữa|cà phê|matcha)/i.test(match.topProduct.name)) {
        ok = false;
        errors.push(`CRITICAL BUG: Repair query matched food/dairy product "${match.topProduct.name}"!`);
      }
      if (match.isRepairService !== true && analysis.primaryIntent !== 'REPAIR_SERVICE') {
        ok = false;
        errors.push(`Repair service flag missing on repair query`);
      }
    }

    if (ok) {
      passed++;
      console.log(`  ✅ [PASS] ${tc.id.padEnd(14)} | ${analysis.primaryIntent.padEnd(20)} | Sales: ${String(isSales).padEnd(5)} | "${tc.text}"`);
    } else {
      failed++;
      console.error(`  ❌ [FAIL] ${tc.id.padEnd(14)} | "${tc.text}"`);
      errors.forEach(e => console.error(`       -> ${e}`));
    }
  }

  // ==========================================
  // SECTION 10: HOMOPHONE SIMILARITY ZERO-GUARD TESTS
  // ==========================================
  console.log('\n--- HOMOPHONE SIMILARITY ZERO-GUARD DIRECT VERIFICATION ---');
  const simTests = [
    { q: 'Bạn biết sửa điện thoại không?', p: MOCK_PRODUCTS[0], expected: 0, reason: 'sửa (repair) vs sữa (milk)' },
    { q: 'Có nhận sửa máy in không?', p: MOCK_PRODUCTS[0], expected: 0, reason: 'sửa (repair) vs sữa (milk)' },
    { q: 'Chiều nay có mưa to không?', p: MOCK_PRODUCTS[1], expected: 0, reason: 'mưa (rain) vs mua (buy)' },
    { q: 'Bàn bạc về kế hoạch quý tới', p: MOCK_PRODUCTS[4], expected: 0, reason: 'bàn bạc (discuss) vs bàn (desk)' },
    { q: 'Cơn bão số 4 đang áp sát bờ biển', p: MOCK_PRODUCTS[1], expected: 0, reason: 'bão (storm) vs bảo hành' },
    { q: 'Tôi muốn bán chiếc xe cũ', p: MOCK_PRODUCTS[4], expected: 0, reason: 'bán đồ cũ (customer selling) vs store product' }
  ];

  for (const st of simTests) {
    const cleanNorm = st.q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const sim = calculateProductSimilarity(cleanNorm, st.p, '', null, st.q);
    assert.strictEqual(sim, st.expected, `Expected similarity 0 for "${st.q}" against "${st.p.name}" (${st.reason})`);
    console.log(`  ✅ [PASS] Zero-similarity verified (sim=${sim}): "${st.q}" -> "${st.p.name}" [${st.reason}]`);
  }

  // ==========================================
  // SECTION 11: END-TO-END CRITICAL BUG VERIFICATION
  // ==========================================
  console.log('\n--- LIVE CENTRAL BRAIN END-TO-END VERIFICATION: "Bạn biết sửa điện thoại không?" ---');
  
  const testMsg = "Bạn biết sửa điện thoại không?";
  const centralBrainRes = await CentralBrainService.processChat({
    message: testMsg,
    conversationId: `test_repair_${Date.now()}`
  });

  console.log('User Question:', testMsg);
  console.log('AI Response:', centralBrainRes.reply);
  console.log('revealCatalog:', centralBrainRes.revealCatalog);
  console.log('recommendedProduct:', centralBrainRes.recommendedProduct);

  const lowerReply = centralBrainRes.reply.toLowerCase();

  // Verification 1: NEVER mention Gunam, Milk, Coffee or store sales
  assert.strictEqual(/gunam|cà phê|cà phê đậm vị|sữa gunam|matcha/i.test(lowerReply), false, 'Response MUST NOT mention Coffee, Milk, or Gunam!');
  console.log('  ✅ [PASS] No dairy/coffee product recommended');

  // Verification 2: Politely states phone repair is not provided & asks for phone model/status
  assert.ok(
    lowerReply.includes('chưa cung cấp dịch vụ sửa chữa điện thoại') || lowerReply.includes('chưa cung cấp dịch vụ sửa chữa'),
    'Response MUST contain polite out-of-catalog repair disclaimer'
  );
  console.log('  ✅ [PASS] Polite out-of-catalog phone repair disclaimer returned');

  // Verification 3: Catalog Col 2 remains closed
  assert.strictEqual(Boolean(centralBrainRes.revealCatalog), false, 'Column 2 MUST remain closed for repair inquiries');
  console.log('  ✅ [PASS] Column 2 Catalog remains closed (revealCatalog = false)');

  // Verification 4: Quality Gate verification
  const qualityGateCheck = SelfVerificationQualityGate.verifyDomainRelevance({
    userQuery: testMsg,
    draftReply: centralBrainRes.reply
  });
  assert.strictEqual(qualityGateCheck.isDomainRelevant, true, 'Quality Gate must approve phone repair response');
  console.log('  ✅ [PASS] Quality Gate approved domain relevance');

  // Verification 5: Negative check - what if someone tried to recommend Gunam for phone repair?
  const fakeBadReply = "Dạ chào bạn, bên em có Cà Phê Đậm Vị - Sữa GUNAM giá 120.000đ rất ngon bạn nhé!";
  const qualityGateBlocked = SelfVerificationQualityGate.verifyDomainRelevance({
    userQuery: testMsg,
    draftReply: fakeBadReply
  });
  assert.strictEqual(qualityGateBlocked.isDomainRelevant, false, 'Quality Gate MUST reject Coffee/Milk recommendation for repair query!');
  console.log('  ✅ [PASS] Quality Gate successfully intercepted and blocked fake bad coffee response');

  console.log('\n========================================================================');
  console.log(`TOTAL TEST RESULT: ${passed}/${TEST_CASES.length} PASSED (${((passed / TEST_CASES.length) * 100).toFixed(1)}%)`);
  console.log(`ALL 6 HOMOPHONE SIMILARITY ZERO-GUARD TESTS: PASSED (100.0%)`);
  console.log(`ALL 5 END-TO-END CENTRAL BRAIN VERIFICATIONS: PASSED (100.0%)`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal error running test suite:', err);
  process.exit(1);
});
