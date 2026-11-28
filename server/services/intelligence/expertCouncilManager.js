/**
 * TRÍ AI ONE SUPER BRAIN – EXPERT COUNCIL MANAGER
 * STANDALONE MULTI-AGENT SPECIALIST COORDINATION ENGINE (STAGE G4)
 * 
 * Manages the Council of 10 Domain Specialists:
 * 1. Technical Specialist (Viễn thông, thiết bị phần cứng, VoIP)
 * 2. Financial Specialist (Chi phí TCO, khấu hao, thuế GTGT 10%)
 * 3. Legal & Compliance Specialist (Tiêu chuẩn viễn thông, hợp đồng)
 * 4. Cybersecurity Specialist (Bảo mật mạng, SIP, chống rò rỉ)
 * 5. Enterprise Architecture Specialist (Mở rộng hạ tầng, chi nhánh)
 * 6. Customer Experience Specialist (Tối ưu đàm thoại, thấu cảm)
 * 7. Quality Assurance Specialist (Đối chiếu ground truth, không ảo giác)
 * 8. Data Governance Specialist (Phân lập tenant, quyền riêng tư)
 * 9. Multimodal Specialist (Chất lượng âm thanh thoại, phân tích tài liệu)
 * 10. Business Strategy Specialist (Tối ưu ROI, giải pháp doanh nghiệp)
 */

export class ExpertCouncilManager {
  constructor() {
    this.specialists = {
      technical: {
        id: 'SPEC_TECH_01',
        name: 'Technical Specialist',
        role: 'Chuyên gia Kỹ thuật Viễn thông & Thiết bị',
        domains: ['hardware', 'telecom', 'voip', 'network', 'cabling', 'specification'],
        focus: 'Độ tương thích, thông số kỹ thuật, khả năng mở rộng phần cứng, cổng FXS/FXO'
      },
      financial: {
        id: 'SPEC_FIN_02',
        name: 'Financial Specialist',
        role: 'Chuyên gia Phân tích Tài chính & TCO',
        domains: ['pricing', 'quotation', 'vat', 'tco', 'roi', 'discount', 'payment'],
        focus: 'Chuẩn thuế GTGT 10%, phân tích tổng chi phí sở hữu 5 năm (TCO), chi phí bảo trì'
      },
      legal: {
        id: 'SPEC_LEG_03',
        name: 'Legal & Compliance Specialist',
        role: 'Chuyên gia Pháp lý & Tiêu chuẩn Tuân thủ',
        domains: ['warranty', 'contract', 'regulation', 'disclaimer', 'terms'],
        focus: 'Quy chuẩn viễn thông Việt Nam, cam kết bảo hành chính hãng, điều khoản hợp đồng'
      },
      security: {
        id: 'SPEC_SEC_04',
        name: 'Cybersecurity Specialist',
        role: 'Chuyên gia An ninh Thông tin & Bảo mật Mạng',
        domains: ['firewall', 'sip_security', 'auth', 'encryption', 'permission'],
        focus: 'Phân quyền L1-L4, chặn truy cập vượt quyền, bảo vệ đường truyền thoại SIP'
      },
      architecture: {
        id: 'SPEC_ARCH_05',
        name: 'Enterprise Architecture Specialist',
        role: 'Chuyên gia Kiến trúc Hệ thống Doanh nghiệp',
        domains: ['scalability', 'multi_site', 'high_availability', 'integration'],
        focus: 'Kết nối liên chi nhánh, khả năng chịu tải, dự phòng thảm họa (Failover)'
      },
      customer_success: {
        id: 'SPEC_CS_06',
        name: 'Customer Success Specialist',
        role: 'Chuyên gia Trải nghiệm Khách hàng',
        domains: ['consultation', 'tone', 'empathy', 'onboarding'],
        focus: 'Văn phong tư vấn nhã nhặn tiếng Việt, đặt câu hỏi gợi mở, lắng nghe nhu cầu'
      },
      qa: {
        id: 'SPEC_QA_07',
        name: 'QA & Verification Specialist',
        role: 'Chuyên gia Kiểm định Chất lượng & Chống Ảo giác',
        domains: ['fact_check', 'verification', 'hallucination_prevention'],
        focus: 'Đối chiếu nguồn tài liệu Zone A, loại bỏ nhận định thiếu căn cứ thực tế'
      },
      data_governance: {
        id: 'SPEC_DATA_08',
        name: 'Data Governance Specialist',
        role: 'Chuyên gia Quản trị Dữ liệu & Phân lập Đa thuê bao',
        domains: ['tenant_isolation', 'privacy', 'audit_trail'],
        focus: 'Bảo vệ ranh giới dữ liệu giữa các tenant, ngăn ngừa rò rỉ dữ liệu chéo'
      },
      multimodal: {
        id: 'SPEC_MM_09',
        name: 'Multimodal Specialist',
        role: 'Chuyên gia Đa phương thức (Thoại & Tài liệu)',
        domains: ['voice_recognition', 'speech_synthesis', 'pdf_excel_parsing'],
        focus: 'Độ rõ nét giọng nói vi-VN, chuẩn hóa bảng biểu báo giá từ file Excel/PDF'
      },
      business: {
        id: 'SPEC_BIZ_10',
        name: 'Business Strategy Specialist',
        role: 'Chuyên gia Chiến lược Giải pháp Doanh nghiệp',
        domains: ['solution_package', 'customer_segmentation', 'value_proposition'],
        focus: 'Tối ưu giá trị giải pháp cho từng quy mô doanh nghiệp từ SME đến Enterprise'
      }
    };
  }

  /**
   * Chọn lựa các chuyên gia phù hợp dựa trên nội dung câu hỏi và ngữ cảnh
   * @param {string} query - Câu hỏi người dùng
   * @param {object} metadata - Thông tin bổ trợ (domain, intent, pricing requested)
   * @returns {Array} Danh sách specialist phù hợp
   */
  selectSpecialists(query = '', metadata = {}) {
    const q = query.toLowerCase();
    const selected = new Set();

    // Luôn có Customer Success và QA để đảm bảo giọng điệu và tính chính xác
    selected.add(this.specialists.customer_success);
    selected.add(this.specialists.qa);

    // Kỹ thuật thiết bị
    if (q.includes('panasonic') || q.includes('tổng đài') || q.includes('điện thoại') || 
        q.includes('cổng') || q.includes('máy nhánh') || q.includes('ip') || q.includes('voip') || 
        q.includes('sip') || q.includes('cài đặt') || q.includes('sửa')) {
      selected.add(this.specialists.technical);
    }

    // Tài chính, báo giá, TCO
    if (q.includes('giá') || q.includes('báo giá') || q.includes('chi phí') || 
        q.includes('tco') || q.includes('vat') || q.includes('triệu') || q.includes('đồng') || 
        q.includes('đắt') || q.includes('rẻ') || q.includes('ngân sách')) {
      selected.add(this.specialists.financial);
    }

    // Bảo mật mạng, quyền hạn
    if (q.includes('bảo mật') || q.includes('an ninh') || q.includes('tường lửa') || 
        q.includes('mật khẩu') || q.includes('hack') || q.includes('quyền') || q.includes('chuyển khoản')) {
      selected.add(this.specialists.security);
    }

    // Doanh nghiệp lớn, chi nhánh
    if (q.includes('chi nhánh') || q.includes('trụ sở') || q.includes('doanh nghiệp') || 
        q.includes('công ty lớn') || q.includes('200 điểm') || q.includes('hạ tầng')) {
      selected.add(this.specialists.architecture);
      selected.add(this.specialists.business);
    }

    // Pháp lý, bảo hành
    if (q.includes('bảo hành') || q.includes('chính hãng') || q.includes('hợp đồng') || 
        q.includes('chứng từ') || q.includes('cam kết')) {
      selected.add(this.specialists.legal);
    }

    return Array.from(selected);
  }

  /**
   * Tổng hợp ý kiến phân tích từ các chuyên gia được chọn
   * @param {object} params - { query, matchedProducts, memoryContext, ragFacts }
   * @returns {object} { councilSummary, recommendations, safeguards }
   */
  conductCouncilReview({ query = '', matchedProducts = [], memoryContext = {}, ragFacts = [] }) {
    const specialists = this.selectSpecialists(query, { matchedProducts });
    const reviews = [];
    const safeguards = [];

    specialists.forEach(spec => {
      let advice = '';
      switch (spec.id) {
        case 'SPEC_TECH_01':
          advice = matchedProducts.length > 0 
            ? `Thiết bị phù hợp: ${matchedProducts.map(p => p.name || p.title).join(', ')}. Đảm bảo tương thích hạ tầng mạng.`
            : 'Cần xác định rõ nhu cầu số lượng máy nhánh và loại đường truyền (Analog/SIP).';
          break;
        case 'SPEC_FIN_02':
          advice = 'Mọi báo giá phải tính thuế GTGT 10% rõ ràng, dự toán chi phí vật tư và công lắp đặt minh bạch.';
          break;
        case 'SPEC_SEC_04':
          advice = 'Phân quyền kiểm soát L1-L4. Tuyệt đối không cho phép thanh toán hoặc trích quỹ tự động.';
          safeguards.push('CHẶN_GIAO_DỊCH_TÀI_CHÍNH_TỰ_ĐỘNG');
          break;
        case 'SPEC_QA_07':
          advice = 'Chỉ cung cấp thông số kỹ thuật có trong tài liệu chính hãng đã phê duyệt Zone A.';
          safeguards.push('CHỐNG_ẢO_GIÁC_ZONE_A');
          break;
        case 'SPEC_CS_06':
          advice = 'Chào hỏi trang trọng, lắng nghe quy mô sử dụng và gợi mở tư vấn chi tiết.';
          break;
        default:
          advice = `Đảm bảo tuân thủ tiêu chuẩn chuyên môn thuộc phân hệ ${spec.name}.`;
      }
      reviews.push({ specialist: spec.name, role: spec.role, advice });
    });

    return {
      activeSpecialistsCount: specialists.length,
      specialistList: specialists.map(s => s.name),
      reviews,
      safeguards,
      consensusVerdict: 'APPROVED_FOR_SYNTHESIS'
    };
  }
}

export default new ExpertCouncilManager();
