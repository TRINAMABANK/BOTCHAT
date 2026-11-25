/**
 * TRÍ AI ULTIMATE ROBOT – CONSTRUCTION & FACILITY DOMAIN HANDLER
 * DOCTOR-LEVEL ALL-DOMAIN CAPABILITY – STAGE 5
 * 
 * Specializations:
 * 1. On-site Field Survey & Facility Assessment (Khảo sát hiện trường & Điều kiện công trình).
 * 2. Electrical, Network Cabling & Spatial Integration (Đi dây mạng, nguồn điện, vị trí lắp đặt).
 * 3. Safety, Load Bearing & Ventilation Standards (An toàn chịu tải, thông gió, chống ẩm).
 * 4. Turnkey Implementation & Handover Governance (Thi công trọn gói, nghiệm thu).
 */

export class ConstructionDomainHandler {
  static getDomainInfo() {
    return {
      code: 'CONSTRUCTION_SURVEY',
      name: 'Kiến trúc, Thi công Lắp đặt & Khảo sát Hiện trường',
      doctorPersona: 'Chuyên gia Kỹ thuật Xây dựng & Giám sát Công trình Văn phòng',
      epistemicAuthority: 'Quy chuẩn Kỹ thuật Quốc gia TCVN / Tiêu chuẩn Xây dựng Việt Nam'
    };
  }

  static analyze(query = '', context = {}) {
    return {
      specialization: 'SITE_SURVEY_AND_INSTALLATION',
      title: 'Quy Chuẩn Kỹ Thuật Khảo Sát Hiện Trường & Thi Công Lắp Đặt',
      surveyParameters: [
        'Độ ổn định của hệ thống nguồn điện (Điện áp 220V ± 5%, có tiếp địa chống giật và chống sét lan truyền).',
        'Khoảng cách đường truyền cáp mạng Cat6/Cat6A từ tủ Rack/Switch trung tâm đến vị trí đặt thiết bị (dưới 90m).',
        'Môi trường vận hành: Độ ẩm 20-80%, nhiệt độ phòng 18-28°C, thông thoáng tản nhiệt tối thiểu 15cm quanh thiết bị.'
      ],
      governanceProcess: [
        'Bước 1: Tiếp nhận thông tin công trình, địa chỉ và thông số quy mô mặt bằng.',
        'Bước 2: Cử kỹ thuật viên chuyên trách đến khảo sát thực tế và lập bản vẽ phương án bố trí.',
        'Bước 3: Lập bảng dự toán chi tiết nhân công, vật tư phụ và gửi báo giá chính thức.',
        'Bước 4: Triển khai thi công, kiểm tra tải và ký biên bản nghiệm thu bàn giao.'
      ],
      strictRule: 'Tuyệt đối không tự ý báo giá thi công hoặc cam kết lịch hẹn trước khi có xác nhận khảo sát thực tế.',
      requiresServiceHandover: true,
      suggestedNextStep: 'Thu thập số điện thoại và địa chỉ công trình để chuyển giao sang chuyên gia dịch vụ khảo sát.'
    };
  }
}

export default ConstructionDomainHandler;
