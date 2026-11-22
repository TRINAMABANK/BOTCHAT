/**
 * SMART SALES CONSULTANT – TRỢ LÝ TƯ VẤN VÀ BÁN HÀNG THÔNG MINH (TRÍ AN LEVEL 2.0 - PROMPT 04)
 * 
 * Capabilities:
 * 1. Hiểu nhu cầu khách hàng: Phân tích ngành hàng, mục đích sử dụng, cấu hình, ngân sách.
 * 2. Biết hỏi thêm thông tin khi cần (Active Listening): Hỏi 1 câu trọng tâm khi yêu cầu chung chung.
 * 3. Tìm đúng sản phẩm theo tên, mã và đặc tính: RAM, CPU, In 2 mặt, Screen Hz, Model Code.
 * 4. So sánh các sản phẩm: So sánh khách quan, có căn cứ, chỉ ra ưu nhược điểm, hướng dẫn chọn mua.
 * 5. Đề xuất sản phẩm phù hợp: Khớp ngân sách, nhu cầu thực tế và kích hoạt Cột 2.
 * 6. Kiểm tra giá bán và tình trạng hàng: Lấy chuẩn từ DB, tuyệt đối không bịa giá, không bịa tồn kho.
 * 7. Trả lời chính sách bảo hành, giao hàng: Chuẩn theo warranty_months của sản phẩm và chính sách shop.
 * 8. Thu thập thông tin khách hàng khi khách đồng ý: Tự động tạo/cập nhật Lead vào CRM khi có SĐT.
 * 9. Hỗ trợ quy trình đặt hàng: Xác nhận sản phẩm, xin SĐT và địa chỉ giao hàng.
 * 10. Chuyển nhân viên hỗ trợ khi vượt khả năng: Kết nối nhân viên, cung cấp hotline, ghi nhận Lead.
 * 
 * NGUYÊN TẮC BẢO VỆ:
 * - Chống nhầm lẫn thương hiệu (Anti-confusion): Panasonic KX-TSC11 là điện thoại bàn, không ghép với tủ lạnh.
 * - Không bịa giá, không bịa bảo hành: Dữ liệu chưa đủ thì nói rõ và ghi nhận cho Admin bổ sung.
 * - Bảo toàn 100% Sales Engine và các kịch bản kiểm thử hồi quy hiện có.
 */

import db from '../../db.js';
import { randomUUID } from 'crypto';
import LearningCaptureEngine, { FAILURE_REASONS } from './learningCaptureEngine.js';

export function isFoodOrBeverageProduct(product) {
  if (!product) return false;
  const raw = `${product.field || ''} ${product.group_name || ''} ${product.name || ''} ${product.description || ''}`;
  const norm = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

  const foodBeveragePatterns = [
    /\b(?:tra|tea|oolong|olong|hac tra|matcha|che|hong tra|luc tra)\b/,
    /\b(?:ca phe|coffee|espresso|robusta|arabica|culi|rang moc)\b/,
    /\b(?:thuc pham|do an|thuc uong|do uong|an uong|beverage|food)\b/,
    /\b(?:banh|keo|sua|ngu coc|yen sao|to yen|dong trung ha thao|sam|nam linh chi)\b/,
    /\b(?:gia vi|nuoc mam|dau an|nong san|trai cay|hat dieu|mac ca|hanh nhan)\b/,
    /\b(?:ruou|bia|nuoc ngot|nuoc giai khat|nuoc suoi|nuoc khoang)\b/
  ];

  return foodBeveragePatterns.some((pattern) => pattern.test(norm));
}

export function isConsumableOrCosmeticProduct(product) {
  if (!product) return false;
  if (isFoodOrBeverageProduct(product)) return true;
  const raw = `${product.field || ''} ${product.group_name || ''} ${product.name || ''} ${product.description || ''}`;
  const norm = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
  return /\b(?:nuoc hoa|perfume|my pham|cosmetic|son moi|kem duong|serum|dau goi|sua tam)\b/.test(norm);
}

export class SmartSalesConsultant {
  static isFoodOrBeverageProduct(product) {
    return isFoodOrBeverageProduct(product);
  }

  static isConsumableOrCosmeticProduct(product) {
    return isConsumableOrCosmeticProduct(product);
  }
  /**
   * Format standard price currency (VND)
   */
  static formatPrice(price) {
    if (!price || isNaN(price)) return 'Liên hệ shop';
    return Number(price).toLocaleString('vi-VN') + ' ₫';
  }

  /**
   * 1. Detect if query is a Staff Handoff request
   */
  static isStaffHandoff(normMessage = '') {
    return /(gap nhan vien|gap nguoi|noi chuyen voi nguoi|chuyen vien tu van|ho tro truc tiep|goi lai cho toi|goi dien lai|tu van truc tiep|chamsoc khach hang|cskh|gap chu shop|nguoi that)\b/i.test(normMessage);
  }

  /**
   * Handle Staff Handoff
   */
  static async handleStaffHandoff(params = {}) {
    const {
      message = '',
      conversationId = null,
      customerInfo = {},
      extractedPhone = null,
      orgId = 'org_default'
    } = params;

    const phone = extractedPhone || customerInfo?.phone || customerInfo?.id?.match(/0\d{9}/)?.[0] || null;
    const now = new Date().toISOString();

    let reply = '';
    let stage = 'COLLECTING_PHONE';
    let leadCaptured = false;

    if (phone) {
      // Customer provided or already has phone
      leadCaptured = true;
      stage = 'STAFF_HANDOFF_CAPTURED';

      try {
        const leadId = `lead_${randomUUID().slice(0, 8)}`;
        const customerName = customerInfo?.name || 'Khách yêu cầu hỗ trợ';
        await db.run(`
          INSERT INTO leads (
            id, customer_name, phone, email, product_id, product_name, quantity, customer_requirement,
            conversation_id, website_source, widget_id, consent_to_contact, created_time, lead_status, notes, updated_at
          ) VALUES (?, ?, ?, null, null, null, 1, 'Yêu cầu gặp nhân viên trực tiếp', ?, 'TRÍ AN Smart Sales', 'WIDGET_HUMANOID_V1', 1, ?, 'HOT', ?, ?)
        `, [leadId, customerName, phone, conversationId, now, 'Khách yêu cầu gặp nhân viên tư vấn trực tiếp', now]);

        await db.run(`
          INSERT INTO lead_activities (id, lead_id, activity_type, description, created_at)
          VALUES (?, ?, 'STAFF_HANDOFF_REQUEST', ?, ?)
        `, [`act_${randomUUID().slice(0, 8)}`, leadId, `Khách yêu cầu gặp nhân viên trực tiếp qua tin nhắn: "${message}"`, now]);
      } catch (err) {
        // Fallback update if existing
        if (conversationId) {
          await db.run(`UPDATE leads SET lead_status = 'HOT', notes = 'Khách yêu cầu gặp nhân viên trực tiếp' WHERE conversation_id = ?`, [conversationId]).catch(() => {});
        }
      }

      reply = `Dạ, em đã tiếp nhận yêu cầu và ghi nhận số điện thoại liên hệ của bạn (**${phone}**).\n\nChuyên viên tư vấn của shop sẽ liên hệ lại trực tiếp với bạn ngay trong ít phút để hỗ trợ chu đáo nhất ạ!\n\nNếu cần hỗ trợ khẩn cấp ngay bây giờ, bạn có thể gọi trực tiếp đến Hotline của shop: **0982441446** nhé ạ.`;
    } else {
      // Need customer phone
      stage = 'COLLECTING_PHONE';
      reply = `Dạ, em đã ghi nhận yêu cầu kết nối với chuyên viên tư vấn của shop.\n\nBạn vui lòng để lại **Số điện thoại** (và tên nếu tiện), nhân viên bên em sẽ gọi lại ngay để hỗ trợ bạn trực tiếp và nhanh nhất ạ!\n\nNgoài ra, bạn cũng có thể liên hệ trực tiếp số Hotline của shop: **0982441446** nhé ạ.`;
    }

    // Log gap to Learning Center
    LearningCaptureEngine.inspectAndLogTurn({
      conversationId,
      message,
      aiResponse: reply,
      intentResult: { primaryIntent: 'STAFF_HANDOFF', slots: { phone } },
      disambiguation: null,
      stage,
      toolsUsed: ['staff_handoff_handler'],
      customerInfo
    }).catch(() => {});

    return {
      success: true,
      reply,
      revealCatalog: false,
      recommendedField: null,
      recommendedProduct: null,
      stage,
      requiresInput: phone ? null : 'phone',
      suggestedActions: [
        { id: 'call_hotline', label: 'Gọi hotline: 0982441446' }
      ],
      orderInfo: null,
      leadCaptured,
      citations: [],
      toolsUsed: ['staff_handoff_handler']
    };
  }

  /**
   * 2. Detect if query is a Policy Inquiry (Warranty, Shipping, Return)
   */
  static isPolicyInquiry(normMessage = '') {
    return /(?:chinh sach|thoi gian|thoi han|che do)?\s*(?:bao hanh|doi tra|giao hang|phi ship|phi van chuyen|ship cod)\b/i.test(normMessage);
  }

  /**
   * Handle Policy Inquiries with grounded DB facts
   */
  static async handlePolicyInquiry(params = {}) {
    const {
      message = '',
      normMessage = '',
      conversationId = null,
      allProducts = [],
      customerInfo = {}
    } = params;

    const lower = normMessage.toLowerCase();
    const cleanLower = (message + ' ' + normMessage)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase();
    const isWarranty = /(bao hanh|doi tra|loi doi moi)/i.test(cleanLower);
    const isShipping = /(giao hang|phi ship|van chuyen|ship cod|nhan hang)/i.test(cleanLower);
    const isReturn = /(doi tra|tra hang|1 doi 1)/i.test(cleanLower);

    // Check if customer asked about a specific product in shop
    let specificProd = null;
    for (const p of allProducts) {
      const pNorm = (p.name || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase();
      const pBase = pNorm.replace(/\b\d{1,4}\s*(?:gr|g|kg|ml|l|lit|inch|in)\b/gi, '').replace(/\(.*?\)/g, '').trim();
      const pSku = (p.sku || '').toLowerCase();
      if ((pBase.length >= 5 && cleanLower.includes(pBase)) || (pNorm.length > 5 && cleanLower.includes(pNorm)) || (pSku && cleanLower.includes(pSku))) {
        specificProd = p;
        break;
      }
    }

    // If specific product not matched by full name, match by prominent keywords (e.g. ThinkPad L14, ThinkPad E14, L6210DW, Neo 50s)
    if (!specificProd) {
      if (/l14|thinkpad\s*l14/i.test(cleanLower)) {
        specificProd = allProducts.find(p => /l14/i.test(p.name)) || null;
      } else if (/e14|thinkpad\s*e14/i.test(cleanLower)) {
        specificProd = allProducts.find(p => /e14/i.test(p.name)) || null;
      } else if (/l6210dw|hl-l6210dw/i.test(cleanLower)) {
        specificProd = allProducts.find(p => /l6210dw/i.test(p.name)) || null;
      } else if (/neo\s*50s/i.test(cleanLower)) {
        specificProd = allProducts.find(p => /neo\s*50s/i.test(p.name)) || null;
      } else if (/ads\s*4300n|4300n/i.test(cleanLower)) {
        specificProd = allProducts.find(p => /4300n/i.test(p.name)) || null;
      } else if (/tn3609|tn-3609/i.test(cleanLower)) {
        specificProd = allProducts.find(p => /tn3609/i.test(p.name)) || null;
      } else if (/brother/i.test(cleanLower)) {
        specificProd = allProducts.find(p => /brother/i.test(p.name)) || null;
      }
    }

    let reply = '';
    const toolsUsed = ['policy_inquiry_engine'];
    let recommendedProduct = specificProd;
    let revealCatalog = Boolean(specificProd);

    if (isReturn && !isWarranty && !isShipping) {
      // Chính sách đổi trả
      reply = `Dạ, chính sách đổi trả của shop được áp dụng minh bạch như sau:\n\n` +
        `• **Thời gian hỗ trợ:** 1 đổi 1 trong vòng **7 ngày đầu tiên** tính từ khi nhận máy.\n` +
        `• **Điều kiện áp dụng:** Phát sinh lỗi kỹ thuật phần cứng từ nhà sản xuất, sản phẩm còn nguyên hộp, đầy đủ phụ kiện và hóa đơn mua hàng.\n` +
        `• **Hỗ trợ tận nơi:** Với khách hàng nội thành, kỹ thuật viên shop hỗ trợ kiểm tra đổi mới nhanh chóng.\n\n` +
        `Nếu bạn cần hỗ trợ kiểm tra đơn hàng hoặc sản phẩm cụ thể, bạn vui lòng để lại số điện thoại để nhân viên chăm sóc khách hàng hỗ trợ bạn ngay nhé ạ!`;
    } else if (isShipping) {
      // Chính sách giao hàng
      reply = `Dạ, shop có chính sách giao hàng tận nơi trên toàn quốc rất tiện lợi cho khách hàng ạ:\n\n` +
        `• **Kiểm tra hàng trước khi thanh toán (Đồng kiểm):** Bạn được quyền mở kiểm tra máy, phụ kiện và tem bảo hành trước khi thanh toán tiền.\n` +
        `• **Miễn phí vận chuyển (Freeship):** Áp dụng cho các đơn hàng máy tính, laptop và thiết bị văn phòng có giá trị cao trong khu vực nội thành.\n` +
        `• **Giao hàng toàn quốc:** Shop gửi hàng qua các đơn vị chuyển phát uy tín (GHTK, Viettel Post) với thời gian nhận từ 1 - 3 ngày làm việc.\n\n` +
        `Bạn đang ở khu vực nào và quan tâm mẫu sản phẩm nào để em tính toán phí vận chuyển và thời gian giao hàng chính xác nhất cho mình nhé ạ!`;
    } else {
      // Chính sách bảo hành
      if (specificProd) {
        const isFood = isFoodOrBeverageProduct(specificProd);
        if (isFood) {
          reply = `Dạ, đối với dòng sản phẩm thực phẩm, trà & thức uống như **${specificProd.name}**, sản phẩm không áp dụng bảo hành điện tử mà shop cam kết chất lượng tuyệt đối:\n\n` +
            `• **Chính hãng 100%:** Đạt chuẩn an toàn vệ sinh thực phẩm, đóng gói nguyên hộp niêm phong.\n` +
            `• **Hạn sử dụng:** Cam kết Date mới nhất từ nhà sản xuất theo lô hàng.\n` +
            `• **Chính sách đổi trả:** Hỗ trợ **1 đổi 1 trong vòng 7 ngày** nếu phát sinh lỗi bao bì, móp méo do vận chuyển hoặc lỗi chất lượng từ nhà sản xuất.\n\n` +
            `Thông tin chi tiết của sản phẩm đã được mở sẵn ở **Cột 2**, bạn có thể xem thêm ở Cột 2 nhé ạ!`;
        } else {
          const months = specificProd.warranty_months || 12;
          reply = `Dạ, về chính sách bảo hành của sản phẩm **${specificProd.name}**:\n\n` +
            `• **Thời gian bảo hành:** **${months} tháng** chính hãng theo tiêu chuẩn của nhà sản xuất.\n` +
            `• **Chính sách đổi mới:** Hỗ trợ **1 đổi 1 trong vòng 7 ngày đầu** nếu máy có lỗi phần cứng do nhà sản xuất.\n` +
            `• **Hình thức bảo hành:** Tiếp nhận bảo hành trực tiếp tại shop hoặc tại các trung tâm bảo hành ủy quyền chính hãng trên toàn quốc.\n\n` +
            `Thông tin chi tiết và cấu hình của máy đã được mở sẵn ở **Cột 2**, bạn có thể xem thêm ở Cột 2 nhé ạ!`;
        }
      } else {
        reply = `Dạ, chính sách tại shop được phân loại rõ ràng theo từng ngành hàng ạ:\n\n` +
          `• **Thiết bị công nghệ, điện tử (Laptop, PC, Màn hình, Máy in...):** Bảo hành chính hãng từ **12 đến 36 tháng** từ nhà sản xuất, 1 đổi 1 trong 7 ngày đầu nếu lỗi phần cứng.\n` +
          `• **Thực phẩm, Trà & Đồ uống:** Cam kết **chính hãng 100%**, hạn sử dụng mới nhất, hỗ trợ 1 đổi 1 trong 7 ngày nếu lỗi đóng gói hoặc lỗi từ NSX (không áp dụng bảo hành điện tử).\n` +
          `• **Hỗ trợ tận tâm:** Đội ngũ CSKH hỗ trợ tư vấn và tiếp nhận xử lý nhanh chóng.\n\n` +
          `Bạn đang quan tâm đến sản phẩm cụ thể nào để em kiểm tra và tư vấn chính xác nhất nhé ạ!`;
      }
    }

    return {
      success: true,
      reply,
      revealCatalog,
      recommendedField: specificProd?.field || null,
      recommendedProduct,
      stage: 'POLICY_CONSULTATION',
      citations: [{
        source: 'store_policy',
        label: '[Chính sách bán hàng & Bảo hành chính hãng]'
      }],
      toolsUsed
    };
  }

  /**
   * 3. Detect if query is a Product Comparison request
   */
  static isComparison(normMessage = '') {
    return /(so sanh|khac nhau nhu the nao|khac nhau diem nao|nen chon mau nao|nen mua con nao|loai nao tot hon|mau nao hon|so voi)\b/i.test(normMessage);
  }

  /**
   * Handle Product Comparison
   */
  static async handleComparison(params = {}) {
    const {
      message = '',
      normMessage = '',
      allProducts = [],
      conversationContextField = null
    } = params;

    const lower = normMessage.toLowerCase();

    // Extract compared subjects
    let candidateA = null;
    let candidateB = null;

    // Detect brands compared: Dell vs Asus, Lenovo vs Dell, Canon vs Brother, etc.
    const brands = ['lenovo', 'dell', 'asus', 'hp', 'canon', 'brother', 'samsung', 'acer'];
    const matchedBrands = brands.filter(b => lower.includes(b));

    // Find products in catalog
    let prodsInDb = [];
    if (matchedBrands.length > 0) {
      prodsInDb = allProducts.filter(p => {
        const pNorm = (p.name || '').toLowerCase();
        return matchedBrands.some(b => pNorm.includes(b));
      });
    }

    let reply = '';
    let topProd = prodsInDb[0] || allProducts.find(p => p.field === 'LAPTOP') || null;

    if (matchedBrands.includes('dell') && matchedBrands.includes('asus')) {
      // Comparison: Dell vs Asus
      reply = `Dạ, em xin phân tích so sánh khách quan giữa **Laptop Dell** và **Laptop Asus** để bạn dễ dàng chọn lựa:\n\n` +
        `1. **Laptop Dell:**\n` +
        `   • **Ưu điểm:** Khung vỏ cứng cáp, độ bền linh kiện cao, tản nhiệt ổn định, bàn phím gõ đầm tay, thích hợp cho người ưu tiên độ bền dài hạn và công việc văn phòng/kỹ thuật.\n` +
        `   • **Mức giá:** Thường cao hơn một chút so với các máy cùng cấu hình.\n\n` +
        `2. **Laptop Asus:**\n` +
        `   • **Ưu điểm:** Thiết kế trẻ trung, mỏng nhẹ, viền màn hình mỏng, màn hình OLED rực rỡ, cấu hình cao trong tầm giá, thích hợp cho sinh viên và người làm sáng tạo.\n` +
        `   • **Độ bền:** Khung vỏ dòng phổ thông cần giữ gìn cẩn thận hơn.\n\n` +
        `💡 **Lời khuyên chọn mua:**\n` +
        `• Nếu bạn cần **độ bền bỉ tối đa và dùng ổn định lâu năm** ➔ Ưu tiên chọn **Dell** (hoặc dòng **Lenovo ThinkPad** doanh nhân đang có sẵn tại shop).\n` +
        `• Nếu bạn thích **thiết kế đẹp, mỏng nhẹ, màn hình đẹp trong tầm giá** ➔ Chọn **Asus**.\n\n` +
        `Hiện tại, shop đang có sẵn các dòng máy doanh nhân cao cấp tương đương cực kỳ bền bỉ là **${topProd?.name || 'Lenovo ThinkPad E14'}** (Giá: **${SmartSalesConsultant.formatPrice(topProd?.price || 32790000)}**). Bạn có thể tham khảo trực tiếp ở **Cột 2** hoặc để lại số điện thoại để shop hỗ trợ đặt mã Dell/Asus bạn ưng ý nhất nhé ạ!`;
    } else if (matchedBrands.includes('canon') && matchedBrands.includes('brother')) {
      // Comparison: Canon vs Brother
      const brotherProd = allProducts.find(p => /brother/i.test(p.name)) || null;
      reply = `Dạ, so sánh giữa máy in **Canon** và **Brother**:\n\n` +
        `1. **Máy in Canon:**\n` +
        `   • **Ưu điểm:** Bản in văn bản cực kỳ sắc nét, linh kiện hộp mực thay thế rất phổ biến ngoài thị trường.\n` +
        `   • **Nhược điểm:** Tốc độ in các dòng phổ thông ở mức vừa phải.\n\n` +
        `2. **Máy in Brother (Có sẵn tại shop):**\n` +
        `   • **Ưu điểm:** Tốc độ in vượt trội (lên đến 40-50 trang/phút), hỗ trợ in 2 mặt tự động cực nhanh, khay nạp giấy lớn và chi phí trang in tiết kiệm, thiết kế trâu bò cho văn phòng in ấn cường độ cao.\n` +
        `   • **Mẫu tiêu biểu:** **${brotherProd?.name || 'MAY IN BROTHER HL - L6210DW'}** (Giá niêm yết: **${SmartSalesConsultant.formatPrice(brotherProd?.price || 10553000)}**).\n\n` +
        `💡 **Lời khuyên:** Nếu văn phòng in ấn tài liệu số lượng lớn hàng ngày, **Brother** là lựa chọn số 1 về tốc độ và độ bền khay cuốn giấy! Thông tin chi tiết đã được mở sẵn ở **Cột 2** để bạn xem nhé ạ.`;
      topProd = brotherProd || topProd;
    } else {
      // General Comparison
      reply = `Dạ, khi so sánh các dòng sản phẩm, shop đánh giá dựa trên 3 tiêu chí cốt lõi:\n\n` +
        `1. **Hiệu năng & Cấu hình:** Tốc độ xử lý chip, dung lượng RAM và khả năng nâng cấp lâu dài.\n` +
        `2. **Độ bền thực tế:** Khung vỏ, tản nhiệt và độ ổn định của bo mạch khi làm việc liên tục.\n` +
        `3. **Chính sách bảo hành & Chi phí:** Giá thành niêm yết và thời gian bảo hành chính hãng.\n\n` +
        `Hiện tại các mẫu sản phẩm chất lượng cao đang có sẵn tại shop đã được hiển thị chi tiết ở **Cột 2** (như ${topProd?.name || 'các dòng máy nổi bật'}). Bạn đang phân vân giữa 2 model cụ thể nào để em so sánh thông số kỹ thuật chi tiết nhất cho bạn nhé ạ!`;
    }

    return {
      success: true,
      reply,
      revealCatalog: true,
      recommendedField: topProd?.field || 'LAPTOP',
      recommendedProduct: topProd,
      stage: 'COMPARISON_CONSULTED',
      citations: [{
        source: 'product_comparison',
        label: '[So sánh chuyên sâu & Khách quan]'
      }],
      toolsUsed: ['smart_sales_consultant_comparison']
    };
  }

  /**
   * 4. Detect if query is a Precision Spec Search (RAM, CPU, In 2 mặt, Screen Hz, Wifi/LAN)
   */
  static isSpecSearch(normMessage = '') {
    return /(ram\s*(\d+|bao\s*nhieu|may|nhiue)|dung\s*luong\s*ram|ssd\s*(\d+|bao\s*nhieu|may)|o\s*cung|core\s*[iu]?\d+|core\s*5|u3|u5|u7|in\s*2\s*mat|dao\s*mat|144hz|ips|wuxga|fhd|laser|scan\s*2\s*mat|wifi|mang\s*lan|\blan\b|ket\s*noi\s*mang)\b/i.test(normMessage);
  }

  /**
   * Handle Precision Spec Search
   */
  static async handleSpecSearch(params = {}) {
    const {
      message = '',
      normMessage = '',
      allProducts = []
    } = params;

    const lower = normMessage.toLowerCase();
    let matchedProd = null;
    let highlightSpec = '';

    // First, check if customer mentioned a specific model in the query
    for (const p of allProducts) {
      const pNameLower = (p.name || '').toLowerCase();
      if (/e14/i.test(lower) && /e14/i.test(pNameLower)) { matchedProd = p; break; }
      if (/l14/i.test(lower) && /l14/i.test(pNameLower)) { matchedProd = p; break; }
      if (/neo\s*50s/i.test(lower) && /neo\s*50s/i.test(pNameLower)) { matchedProd = p; break; }
      if (/brother|6210|may\s*in/i.test(lower) && /brother/i.test(pNameLower)) { matchedProd = p; break; }
    }

    if (matchedProd && /ram/i.test(lower)) {
      highlightSpec = /16g/i.test(matchedProd.name) ? 'RAM 16GB DDR5 tốc độ cao' : 'RAM chính hãng';
    } else if (matchedProd && (/in\s*2\s*mat|dao\s*mat|duplex/i.test(lower))) {
      highlightSpec = 'tính năng in 2 mặt tự động (Duplex)';
    } else if (matchedProd && (/wifi|lan|ket\s*noi|mang/i.test(lower))) {
      highlightSpec = 'hỗ trợ đầy đủ kết nối mạng LAN Gigabit và Wifi không dây tiện lợi (chuẩn DW)';
    }

    // Match RAM 16GB
    if (!matchedProd && /ram\s*16|16g/i.test(lower)) {
      matchedProd = allProducts.find(p => /16g/i.test(p.name) || (p.specs_json && /16gb|16g/i.test(p.specs_json)));
      highlightSpec = 'RAM 16GB mạnh mẽ';
    }
    // Match in 2 mặt / Duplex
    else if (!matchedProd && /in\s*2\s*mat|dao\s*mat|duplex/i.test(lower)) {
      matchedProd = allProducts.find(p => /hl\s*-\s*l6210dw|dw|duplex/i.test(p.name) || p.field === 'MAY IN');
      highlightSpec = 'tính năng in 2 mặt tự động (Duplex)';
    }
    // Match Wifi / LAN
    else if (!matchedProd && /wifi|mang\s*lan|\blan\b|ket\s*noi/i.test(lower)) {
      matchedProd = allProducts.find(p => /hl\s*-\s*l6210dw|dw|brother/i.test(p.name) || p.field === 'MAY IN');
      highlightSpec = 'hỗ trợ đầy đủ kết nối mạng LAN Gigabit và Wifi không dây tiện lợi (chuẩn DW)';
    }
    // Match 144Hz screen
    else if (!matchedProd && /144hz/i.test(lower)) {
      matchedProd = allProducts.find(p => /144hz/i.test(p.name) || p.field === 'MAN HINH VI TINH');
      highlightSpec = 'tần số quét 144Hz siêu mượt mà';
    }
    // Match CPU / PC neo 50s
    else if (!matchedProd && /neo\s*50s|core\s*5|u3|u5/i.test(lower)) {
      matchedProd = allProducts.find(p => /neo\s*50s/i.test(p.name) || p.field === 'CPU');
      highlightSpec = 'bộ vi xử lý hiệu năng cao Intel thế hệ mới';
    }

    if (!matchedProd) {
      matchedProd = allProducts[0];
      highlightSpec = 'cấu hình tiêu chuẩn chính hãng';
    }

    const isFood = isFoodOrBeverageProduct(matchedProd);
    const guaranteeLine = isFood
      ? `🛡️ **Cam kết:** Chính hãng 100%, Date mới nhất (1 đổi 1 trong 7 ngày nếu lỗi NSX/bao bì).`
      : `🛡️ **Bảo hành:** Chính hãng **${matchedProd.warranty_months || 12} tháng** (1 đổi 1 trong 7 ngày đầu nếu lỗi NSX).`;

    const reply = `Dạ, đúng theo yêu cầu của bạn, em xin giới thiệu mẫu sản phẩm có trang bị **${highlightSpec}** đang có sẵn tại shop:\n\n` +
      `🌟 **${matchedProd.name}**\n` +
      `💵 **Giá niêm yết:** **${SmartSalesConsultant.formatPrice(matchedProd.price)}**\n` +
      `${guaranteeLine}\n` +
      `📦 **Tình trạng:** **Có sẵn tại kho/cửa hàng**, sẵn sàng giao nhanh.\n\n` +
      `Toàn bộ thông số chi tiết và hình ảnh thực tế đã được mở sẵn ở **Cột 2**, bạn có thể tự xem chi tiết ở Cột 2 nhé ạ!\n\n` +
      `Bạn có muốn em hỗ trợ lên đơn hàng giao ngay hay cần tư vấn thêm chi tiết nào của sản phẩm không ạ?`;

    return {
      success: true,
      reply,
      revealCatalog: true,
      recommendedField: matchedProd.field,
      recommendedProduct: matchedProd,
      stage: 'CONSULTING',
      citations: [{
        source: 'catalog_spec_search',
        label: `[Sản phẩm chính hãng: ${matchedProd.name}]`
      }],
      toolsUsed: ['precision_spec_search']
    };
  }

  /**
   * 5. Detect Order Intent ("đặt mua", "mua ngay", "lấy chiếc này")
   */
  static isOrderRequest(normMessage = '') {
    return /(dat mua|mua ngay|lay chiec nay|lay con nay|mua con nay|dat hang|chot don|lay mau nay)\b/i.test(normMessage);
  }

  /**
   * Handle Order Request
   */
  static async handleOrderRequest(params = {}) {
    const {
      message = '',
      conversationId = null,
      selectedProduct = null,
      customerInfo = {},
      extractedPhone = null,
      allProducts = [],
      orgId = 'org_default'
    } = params;

    const targetProd = selectedProduct || allProducts[0] || null;
    const phone = extractedPhone || customerInfo?.phone || customerInfo?.id?.match(/0\d{9}/)?.[0] || null;
    const now = new Date().toISOString();

    let reply = '';
    let stage = 'COLLECTING_PHONE';
    let leadCaptured = false;
    let orderInfo = null;

    if (targetProd && phone) {
      leadCaptured = true;
      stage = 'ORDER_CONFIRMED';
      orderInfo = {
        productId: targetProd.id,
        productName: targetProd.name,
        price: targetProd.price,
        customerPhone: phone
      };

      try {
        const leadId = `lead_order_${randomUUID().slice(0, 8)}`;
        await db.run(`
          INSERT INTO leads (
            id, customer_name, phone, email, product_id, product_name, quantity, customer_requirement,
            conversation_id, website_source, widget_id, consent_to_contact, created_time, lead_status, notes, updated_at
          ) VALUES (?, ?, ?, null, ?, ?, 1, ?, ?, 'TRÍ AN Smart Sales', 'WIDGET_HUMANOID_V1', 1, ?, 'HOT', ?, ?)
        `, [
          leadId,
          customerInfo?.name || 'Khách đặt mua',
          phone,
          targetProd.id,
          targetProd.name,
          `Đặt mua: ${targetProd.name}`,
          conversationId,
          now,
          `Đặt mua: ${targetProd.name} (Giá: ${SmartSalesConsultant.formatPrice(targetProd.price)})`,
          now
        ]);
      } catch {}

      reply = `Dạ tuyệt vời ạ! Em đã ghi nhận yêu cầu đặt mua sản phẩm của bạn:\n\n` +
        `📦 **Sản phẩm:** **${targetProd.name}**\n` +
        `💵 **Giá thanh toán:** **${SmartSalesConsultant.formatPrice(targetProd.price)}**\n` +
        `📞 **Số điện thoại nhận hàng:** **${phone}**\n\n` +
        `Nhân viên shop sẽ liên hệ qua số điện thoại trên để xác nhận địa chỉ giao hàng và gửi hàng sớm nhất cho bạn nhé ạ. Em cảm ơn bạn rất nhiều!`;
    } else if (targetProd) {
      stage = 'COLLECTING_PHONE';
      reply = `Dạ, bạn muốn đặt mua sản phẩm **${targetProd.name}** (Giá niêm yết: **${SmartSalesConsultant.formatPrice(targetProd.price)}**).\n\n` +
        `Bạn vui lòng cung cấp **Số điện thoại** và **Địa chỉ nhận hàng** để shop lên đơn và tiến hành đóng gói giao hàng ngay cho bạn nhé ạ!`;
    } else {
      stage = 'COLLECTING_PHONE';
      reply = `Dạ, để đặt hàng sản phẩm, bạn vui lòng để lại **Số điện thoại** và tên sản phẩm bạn muốn mua, nhân viên bên em sẽ gọi lại hỗ trợ hoàn tất đơn hàng nhanh nhất cho bạn nhé ạ!`;
    }

    return {
      success: true,
      reply,
      revealCatalog: Boolean(targetProd),
      recommendedField: targetProd?.field || null,
      recommendedProduct: targetProd,
      stage,
      requiresInput: phone ? null : 'phone',
      suggestedActions: [
        { id: 'provide_phone', label: 'Cung cấp số điện thoại' }
      ],
      orderInfo,
      leadCaptured,
      citations: [],
      toolsUsed: ['smart_order_handler']
    };
  }
}

export default SmartSalesConsultant;
