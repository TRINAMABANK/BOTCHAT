/**
 * TRÍ AI ULTIMATE ROBOT – LEGAL & COMPLIANCE DOMAIN HANDLER
 * DOCTOR-LEVEL ALL-DOMAIN CAPABILITY – STAGE 5
 * 
 * Specializations:
 * 1. Enterprise Procurement Contracts & Warranty SLAs.
 * 2. Cybersecurity & Personal Data Protection (Nghị định 13/2023/NĐ-CP & Luật An ninh mạng).
 * 3. Trade Secrets & Intellectual Property Protection.
 * 4. Regulatory Compliance & IT Governance (ISO 27001, COBIT).
 */

export class LegalDomainHandler {
  static getDomainInfo() {
    return {
      code: 'LEGAL_COMPLIANCE',
      name: 'Pháp lý, Luật Doanh nghiệp & Quản trị Rủi ro Tuân thủ',
      doctorPersona: 'Chuyên gia Pháp lý Doanh nghiệp & Thẩm định Hợp đồng Công nghệ',
      epistemicAuthority: 'Luật Doanh nghiệp 2020 / Luật Sở hữu Trí tuệ / Nghị định 13/2023/NĐ-CP'
    };
  }

  static analyze(query = '', context = {}) {
    const q = query.toLowerCase();

    // 1. Data Protection & Cybersecurity
    if (q.includes('bảo mật') || q.includes('dữ liệu cá nhân') || q.includes('nghị định 13') || q.includes('an ninh mạng') || q.includes('lộ thông tin')) {
      return {
        specialization: 'CYBERSECURITY_DATA_COMPLIANCE',
        title: 'Tuân Thủ Pháp Luật Về An Toàn Thông Tin & Bảo Vệ Dữ Liệu Cá Nhân',
        legalStandards: [
          'Nghị định số 13/2023/NĐ-CP về Bảo vệ dữ liệu cá nhân (Bắt buộc lập Hồ sơ Đánh giá tác động xử lý dữ liệu - DPIA).',
          'Luật An ninh mạng 2018 (Yêu cầu lưu trữ dữ liệu tại Việt Nam và bảo vệ hệ thống thông tin quan trọng).',
          'Tiêu chuẩn quốc tế ISO/IEC 27001:2022 về Hệ thống quản lý an toàn thông tin (ISMS).'
        ],
        complianceActions: [
          'Tất cả thiết bị kết nối mạng (Laptop, Máy in, Server) phải được kích hoạt chế độ mã hóa lưu trữ (BitLocker/AES-256) và đổi thông tin quản trị mặc định.',
          'Đối với thiết bị in ấn, bắt buộc kích hoạt chức năng Secure Print / PIN Release để ngăn ngừa vi phạm để lộ hồ sơ khách hàng tại khay giấy.'
        ],
        suggestedNextStep: 'Rà soát quy chế bảo mật nội bộ hoặc lựa chọn thiết bị có chip bảo mật phần cứng TPM 2.0.'
      };
    }

    // 2. Procurement Contracts & Warranty SLAs
    return {
      specialization: 'COMMERCIAL_CONTRACT_SLA',
      title: 'Thẩm Định Điều Khoản Hợp Đồng Mua Sắm & Cam Kết Chất Lượng (SLA)',
      legalStandards: [
        'Luật Thương mại 2005 & Bộ luật Dân sự 2015 về trách nhiệm giao hàng đúng chất lượng, quy cách và xuất xứ (CO/CQ).',
        'Điều khoản phạt vi phạm và bồi thường thiệt hại (Giới hạn tối đa 8% giá trị phần nghĩa vụ hợp đồng bị vi phạm theo Điều 301 Luật Thương mại).'
      ],
      complianceActions: [
        'Quy định rõ thời hạn phản hồi sự cố (Response Time dưới 2 giờ) và thời gian khắc phục triệt để (Resolution Time dưới 24-48 giờ) trong phụ lục SLA.',
        'Yêu cầu cam kết cung cấp linh kiện thay thế chính hãng trong thời gian tối thiểu 3-5 năm kể từ ngày ngừng sản xuất.'
      ],
      suggestedNextStep: 'Soạn thảo điều khoản bảo hành cam kết SLA hoặc kiểm tra danh mục thiết bị đạt chứng nhận CO/CQ.'
    };
  }
}

export default LegalDomainHandler;
