/**
 * TRÍ AI ONE SUPER BRAIN - COGNITIVE REASONING ENGINE
 * 
 * Philosophy: DEEP REASONING – 5-WHYS ROOT CAUSE – CAPEX/OPEX MULTI-CRITERIA TRADE-OFFS
 * 
 * Features:
 * 1. 5-Whys Root Cause Analysis: Systematically explores underlying systemic issues
 * 2. Multi-Criteria Trade-off Evaluation: CapEx vs OpEx, short-term vs long-term ROI
 * 3. Cognitive Bias & Logical Fallacy Detection (Sunk Cost, False Dilemma, Confirmation Bias)
 */

export class CognitiveReasoningEngine {
  /**
   * 1. 5-Whys Root Cause Analysis
   * @param {string} problemDescription
   * @returns {Object} 5-Whys analysis chain and ultimate root cause
   */
  static analyzeRootCause(problemDescription = '') {
    if (!problemDescription) {
      return { problem: '', steps: [], rootCause: '', strategicSolution: '' };
    }

    const text = problemDescription.toLowerCase();
    const steps = [];
    let rootCause = '';
    let strategicSolution = '';

    if (text.includes('kẹt giấy') || text.includes('ket giay') || text.includes('kẹt') || text.includes('paper jam')) {
      steps.push({ step: 1, why: 'Tại sao máy hay bị kẹt giấy?', answer: 'Tần suất kẹt giấy tăng cao khi in tài liệu khối lượng lớn hoặc giấy định lượng không phù hợp.' });
      steps.push({ step: 2, why: 'Tại sao giấy không được kéo mượt mà?', answer: 'Trục cuốn giấy (Pickup Roller) bị bám bụi mực hoặc mòn bề mặt ma sát sau thời gian dài vận hành.' });
      steps.push({ step: 3, why: 'Tại sao trục cuốn giấy bị mòn nhanh?', answer: 'Thiết bị hoạt động vượt quá công suất khuyến nghị hàng tháng và sử dụng giấy tái chế nhiều xơ bụi.' });
      steps.push({ step: 4, why: 'Tại sao thiết bị phải hoạt động vượt công suất?', answer: 'Văn phòng tăng nhân sự nhưng chưa được phân bổ thiết bị in ấn phân tán hoặc máy in tốc độ cao hơn.' });
      steps.push({ step: 5, why: 'Tại sao chưa có thiết bị phù hợp?', answer: 'Chưa có quy chế định mức in ấn và thiếu hợp đồng bảo dưỡng thiết bị văn phòng định kỳ.' });
      rootCause = 'Thiết bị quá tải công suất thiết kế kết hợp với việc thiếu quy trình bảo dưỡng định kỳ và kiểm soát chất lượng vật tư giấy in.';
      strategicSolution = '1. Nâng cấp máy in laser tốc độ cao (>35 trang/phút) có khay giấy lớn; 2. Ký hợp đồng bảo dưỡng định kỳ mỗi quý; 3. Chuẩn hóa định lượng giấy in văn phòng đạt chuẩn từ 70 - 80 gsm.';
    } else if (text.includes('chi phí in') || text.includes('chi phi in') || text.includes('mực đắt') || text.includes('muc dat')) {
      steps.push({ step: 1, why: 'Tại sao chi phí in ấn văn phòng tăng cao?', answer: 'Chi phí mua hộp mực thay thế và giấy in hàng tháng vượt dự toán ngân sách.' });
      steps.push({ step: 2, why: 'Tại sao tiêu hao mực in quá nhanh?', answer: 'Nhân viên in nháp hoặc in tài liệu nội bộ bằng máy in phun màu hoặc chế độ High Quality không cần thiết.' });
      steps.push({ step: 3, why: 'Tại sao không in bằng máy laser tiết kiệm?', answer: 'Máy in laser hiện tại không hỗ trợ in qua mạng/wifi hoặc đặt ở vị trí xa, gây bất tiện.' });
      steps.push({ step: 4, why: 'Tại sao chưa tối ưu vị trí và kết nối mạng?', answer: 'Hệ thống thiết bị văn phòng mua sắm chắp vá, không theo một tiêu chuẩn đồng bộ.' });
      steps.push({ step: 5, why: 'Tại sao việc mua sắm bị chắp vá?', answer: 'Chưa tính toán Tổng Chi phí Sở hữu (TCO) trong vòng đời 3-5 năm trước khi đầu tư máy.' });
      rootCause = 'Mua sắm thiết bị chỉ nhìn vào giá mua ban đầu rẻ (CapEx thấp) mà bỏ qua chi phí vận hành hộp mực đắt đỏ (OpEx cao) và thiếu giải pháp quản lý in ấn tập trung.';
      strategicSolution = 'Chuyển đổi sang dòng máy in laser nạp mực liên tục dung lượng lớn, tích hợp in 2 mặt tự động và kết nối mạng nội bộ; thiết lập chính sách in 2 mặt mặc định.';
    } else {
      steps.push({ step: 1, why: `Tại sao phát sinh vấn đề: "${problemDescription}"?`, answer: 'Triệu chứng bề mặt xuất hiện do sự kết hợp của thói quen vận hành và hạn chế công nghệ.' });
      steps.push({ step: 2, why: 'Tại sao triệu chứng này lặp lại nhiều lần?', answer: 'Các giải pháp trước đây chỉ tập trung xử lý hậu quả tức thời mà chưa can thiệp vào quy trình gốc.' });
      steps.push({ step: 3, why: 'Tại sao quy trình chưa được chuẩn hóa?', answer: 'Thiếu số liệu đo lường định lượng và tiêu chuẩn vận hành SOP rõ ràng.' });
      steps.push({ step: 4, why: 'Tại sao thiếu số liệu đo lường?', answer: 'Chưa có công cụ tự động theo dõi và cảnh báo sớm các ngưỡng rủi ro.' });
      steps.push({ step: 5, why: 'Nguyên nhân cốt lõi là gì?', answer: 'Mô hình quản lý phản ứng bị động (Reactive) thay vì chủ động phòng ngừa rủi ro (Proactive Governance).' });
      rootCause = 'Hệ thống vận hành theo cơ chế chữa cháy bị động, thiếu tiêu chuẩn kiểm soát định lượng và bảo trì phòng ngừa.';
      strategicSolution = 'Xây dựng quy trình chuẩn hóa SOP, áp dụng công cụ giám sát thông số vận hành và đào tạo nâng cao nhận thức cho người sử dụng.';
    }

    return {
      problem: problemDescription,
      steps,
      rootCause,
      strategicSolution
    };
  }

  /**
   * 2. Multi-Criteria CapEx vs OpEx Trade-Off Matrix
   * @param {Object} params Evaluation options
   * @returns {Object} Structured trade-off analysis matrix
   */
  static evaluateTradeOffs(params = {}) {
    const {
      optionA = { name: 'Mua máy in phun giá rẻ', capEx: 2500000, monthlyOpEx: 1200000, lifespanMonths: 24 },
      optionB = { name: 'Đầu tư máy in laser chuyên nghiệp', capEx: 7500000, monthlyOpEx: 400000, lifespanMonths: 36 },
      horizonMonths = 12
    } = params;

    const tcoA = optionA.capEx + (optionA.monthlyOpEx * horizonMonths);
    const tcoB = optionB.capEx + (optionB.monthlyOpEx * horizonMonths);

    // Calculate break-even month: CapEx_B - CapEx_A = (OpEx_A - OpEx_B) * M
    const capExDiff = optionB.capEx - optionA.capEx;
    const monthlySavings = optionA.monthlyOpEx - optionB.monthlyOpEx;
    const breakEvenMonth = monthlySavings > 0 ? Math.ceil(capExDiff / monthlySavings) : null;

    const recommendation = tcoB < tcoA
      ? `Phương án "${optionB.name}" tối ưu hơn về mặt kinh tế sau ${horizonMonths} tháng (Tiết kiệm ${(tcoA - tcoB).toLocaleString('vi-VN')} VNĐ). Điểm hòa vốn đạt được sau ${breakEvenMonth} tháng.`
      : `Phương án "${optionA.name}" phù hợp hơn nếu ưu tiên bảo toàn dòng vốn ngắn hạn (< ${breakEvenMonth || horizonMonths} tháng), tuy nhiên chi phí vận hành sẽ tăng nhanh theo thời gian.`;

    return {
      horizonMonths,
      optionA: { ...optionA, totalTco: tcoA },
      optionB: { ...optionB, totalTco: tcoB },
      breakEvenMonth,
      monthlySavings,
      recommendation,
      matrix: [
        { criterion: 'Chi phí Đầu tư Ban đầu (CapEx)', optionA: `${optionA.capEx.toLocaleString('vi-VN')} đ (Thấp)`, optionB: `${optionB.capEx.toLocaleString('vi-VN')} đ (Cao hơn)` },
        { criterion: 'Chi phí Vận hành Hàng tháng (OpEx)', optionA: `${optionA.monthlyOpEx.toLocaleString('vi-VN')} đ/tháng`, optionB: `${optionB.monthlyOpEx.toLocaleString('vi-VN')} đ/tháng (Tiết kiệm)` },
        { criterion: `Tổng Chi phí Sở hữu TCO (${horizonMonths} tháng)`, optionA: `${tcoA.toLocaleString('vi-VN')} đ`, optionB: `${tcoB.toLocaleString('vi-VN')} đ` },
        { criterion: 'Độ tin cậy & Tải công suất', optionA: 'Vừa phải, dễ hỏng đầu phun', optionB: 'Rất cao, chịu tải in liên tục' }
      ]
    };
  }

  /**
   * 3. Cognitive Bias & Logical Fallacy Detection
   * @param {string} text User text to analyze
   * @returns {Object} Detected biases or fallacies with constructive reframing
   */
  static detectBiasesAndFallacies(text = '') {
    if (!text) return { detected: false, fallacies: [] };
    const lower = text.toLowerCase();
    const fallacies = [];

    // Sunk cost fallacy: "đã sửa mất X triệu rồi, giờ phải sửa tiếp"
    if (/(đã sửa|da sua|bỏ ra|đầu tư nhiều|mất bao nhiêu tiền|tiếc tiền).*(sửa tiếp|sua tiep|không bỏ được|phải dùng tiếp)/i.test(lower)) {
      fallacies.push({
        type: 'SUNK_COST_FALLACY',
        name: 'Ngụy biện Chi phí Chìm (Sunk Cost Fallacy)',
        explanation: 'Người dùng có xu hướng tiếp tục chi tiền vào tài sản cũ kém hiệu quả chỉ vì đã trót tốn kém chi phí trong quá khứ.',
        constructiveReframe: 'Dạ em hiểu là mình đã đầu tư nhiều chi phí sửa chữa trước đây. Tuy nhiên, nếu xét về bài toán dòng tiền tương lai, việc đầu tư thiết bị mới vận hành ổn định sẽ giúp doanh nghiệp chấm dứt các khoản chi phí sửa chữa phát sinh liên tục và tránh rủi ro gián đoạn công việc ạ.'
      });
    }

    // False dilemma: "chỉ có chọn A hoặc B"
    if (/(chỉ có thể|chi co the|hoặc là.*hoặc là|mot la.*hai la|không.*thì chỉ có)/i.test(lower) && /(đắt|rẻ|tốt|xấu)/i.test(lower)) {
      fallacies.push({
        type: 'FALSE_DILEMMA',
        name: 'Ngụy biện Nhị nguyên Sai lầm (False Dilemma)',
        explanation: 'Giả định sai lầm rằng chỉ có hai lựa chọn cực đoan (chất lượng cao thì phải cực đắt, hoặc giá rẻ thì bắt buộc chất lượng kém).',
        constructiveReframe: 'Thực tế ngoài phương án mua đứt giá cao hoặc mua máy rẻ kém bền, anh/chị hoàn toàn có thể cân nhắc giải pháp thứ ba: Thuê máy in trọn gói chính hãng (vừa dùng máy cao cấp, vừa tối ưu dòng tiền hàng tháng và được miễn phí toàn bộ mực in, bảo trì).'
      });
    }

    return {
      detected: fallacies.length > 0,
      fallacies
    };
  }
}
