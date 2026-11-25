/**
 * TRÍ AI ULTIMATE ROBOT – HEALTHCARE & LIFE SCIENCES DOMAIN HANDLER
 * DOCTOR-LEVEL ALL-DOMAIN CAPABILITY – STAGE 5
 * 
 * Specializations:
 * 1. Workplace Ergonomics & Musculoskeletal Health (Công thái học, cột sống, thị lực).
 * 2. Visual Ergonomics & Blue Light Protection (TÜV Rheinland Low Blue Light, Flicker-Free).
 * 3. Indoor Air Quality & Water Hygiene (Chất lượng không khí, lọc nước RO/Nano).
 * 4. Occupational Safety and Health Standards (An toàn vệ sinh lao động).
 */

export class HealthcareDomainHandler {
  static getDomainInfo() {
    return {
      code: 'HEALTHCARE_LIFE',
      name: 'Y tế, Sức khỏe Lao động & Công Thái Học Văn Phòng (Ergonomics)',
      doctorPersona: 'Chuyên gia Y học Lao động & Thiết kế Môi trường Công thái học',
      epistemicAuthority: 'OSHA / WHO / Tiêu chuẩn Công thái học ISO 9241'
    };
  }

  static analyze(query = '', context = {}) {
    const q = query.toLowerCase();

    // Visual & Screen Ergonomics
    if (q.includes('màn hình') || q.includes('mắt') || q.includes('ánh sáng xanh') || q.includes('thị lực')) {
      return {
        specialization: 'VISUAL_ERGONOMICS_HEALTH',
        title: 'Tiêu Chuẩn Công Thái Học Bảo Vệ Thị Lực Cho Nhân Viên Văn Phòng',
        healthStandards: [
          'Quy tắc 20-20-20 (Sau mỗi 20 phút nhìn màn hình, nhìn xa 20 feet / 6 mét trong ít nhất 20 giây).',
          'Màn hình đạt chứng chỉ TÜV Rheinland Eyesafe / Low Blue Light giúp giảm 50% bước sóng ánh sáng xanh có hại (415-455nm) mà không làm biến đổi dải màu chuẩn.',
          'Công nghệ chống nhấp nháy (Flicker-Free) bằng điều chế điện áp DC thay vì xung PWM, loại bỏ căng thẳng điều tiết của cơ thể mi.'
        ],
        medicalRecommendations: [
          'Khoảng cách từ mắt đến màn hình từ 50 - 70 cm, cạnh trên của màn hình ngang tầm mắt khi ngồi thẳng lưng.',
          'Độ sáng màn hình điều chỉnh tương thích với ánh sáng môi trường (300 - 500 Lux).'
        ],
        suggestedNextStep: 'Xem xét trang bị màn hình chuyên dụng có chân đế nâng hạ đa hướng (Ergonomic Stand).'
      };
    }

    // General Office Ergonomics & Posture
    return {
      specialization: 'WORKPLACE_ERGONOMICS_WELLNESS',
      title: 'Đánh Giá Nguy Cơ Cơ Xương Khớp & Tối Ưu Môi Trường Làm Việc',
      healthStandards: [
        'Tiêu chuẩn ISO 9241-5 về tư thế ngồi làm việc công thái học: Góc khuỷu tay và khớp gối duy trì ở mức 90 - 100 độ.',
        'Hạn chế hội chứng ống cổ tay (Carpal Tunnel Syndrome) bằng chuột công thái học dọc và bàn phím có đệm cổ tay.',
        'Môi trường nước uống sạch đạt chuẩn QCVN 6-1:2010/BYT và hệ thống lọc bổ sung khoáng chất tự nhiên.'
      ],
      medicalRecommendations: [
        'Khuyến khích luân chuyển giữa tư thế đứng và ngồi (Sit-Stand Desk) mỗi 60-90 phút.',
        'Duy trì độ ẩm phòng làm việc từ 45 - 60% để hạn chế khô giác mạc và kích ứng đường hô hấp.'
      ],
      suggestedNextStep: 'Tối ưu hóa thiết bị công thái học cá nhân hoặc nâng cấp nguồn nước/không khí văn phòng.'
    };
  }
}

export default HealthcareDomainHandler;
