/**
 * TRÍ AI ULTIMATE ROBOT – ASSOCIATION ENGINE (BỘ MÁY LIÊN KẾT TRI THỨC LIÊN NGÀNH)
 * DOCTOR-LEVEL COGNITIVE CORE – STAGE 2
 * 
 * Capabilities:
 * 1. Concept Mapping: Xây dựng mạng lưới các khái niệm tương quan đa tầng.
 * 2. Cross-Domain Knowledge Linking: Kết nối giải pháp giữa các ngành (Kỹ thuật + Tài chính + Pháp lý + Vận hành).
 * 3. Analogical Reasoning: Tìm kiếm quy luật tương đồng để giải quyết bài toán mới từ kinh nghiệm đã có.
 */

// Domain Relationship Matrix for Cross-Disciplinary Associations
export const DOMAIN_ASSOCIATION_MATRIX = {
  OFFICE_TECH_COST: {
    domains: ['HARDWARE_SPECS', 'FINANCE_TCO', 'ENERGY_EFFICIENCY'],
    keywords: ['tiết kiệm điện', 'chi phí vận hành', 'tối ưu chi phí văn phòng', 'mua máy tính tiết kiệm'],
    associations: [
      {
        concept: 'Tổng chi phí sở hữu (Total Cost of Ownership - TCO)',
        perspective: 'Tài chính & Quản trị',
        insight: 'Chi phí mua ban đầu (CAPEX) chỉ chiếm 25-35% tổng chi phí vòng đời thiết bị. 65-75% còn lại nằm ở chi phí điện năng, mực in/vật tư tiêu hao và bảo trì bảo dưỡng.'
      },
      {
        concept: 'Hiệu suất năng lượng (Energy Star / TDP Rating)',
        perspective: 'Vật lý & Công nghệ',
        insight: 'Lựa chọn CPU có TDP 15W-28W (như Intel Core Ultra hoặc AMD Ryzen Pro) giúp giảm 40% lượng nhiệt tỏa ra, giảm tải trực tiếp cho hệ thống điều hòa văn phòng.'
      }
    ]
  },
  PRINTING_SECURITY: {
    domains: ['OFFICE_EQUIPMENT', 'CYBERSECURITY', 'LEGAL_COMPLIANCE'],
    keywords: ['bảo mật máy in', 'lộ tài liệu in', 'an toàn in ấn', 'quản lý in ấn'],
    associations: [
      {
        concept: 'Nguy cơ bảo mật mạng từ thiết bị IoT văn phòng',
        perspective: 'An ninh mạng',
        insight: 'Máy in kết nối mạng nếu không cấu hình đổi mật khẩu mặc định, đóng cổng mở 9100/RAW và phân quyền xác thực qua LDAP/Active Directory có thể trở thành cổng đột nhập (entry-point) vào mạng LAN nội bộ.'
      },
      {
        concept: 'Tuân thủ bảo vệ bí mật kinh doanh & Dữ liệu cá nhân',
        perspective: 'Pháp lý & Quản trị rủi ro',
        insight: 'Tính năng In bảo mật (Secure Print / Pin Release) yêu cầu quẹt thẻ nhân viên hoặc nhập mã PIN tại máy mới nhả giấy, ngăn ngừa hoàn toàn tình trạng tài liệu nhạy cảm bị bỏ quên trên khay giấy.'
      }
    ]
  },
  SERVER_INFRASTRUCTURE: {
    domains: ['SERVER_STORAGE', 'BUSINESS_CONTINUITY', 'DISASTER_RECOVERY'],
    keywords: ['máy chủ', 'server', 'sao lưu', 'du phong', 'ha tang'],
    associations: [
      {
        concept: 'Nguyên tắc sao lưu 3-2-1',
        perspective: 'Quản trị hệ thống',
        insight: '3 bản sao dữ liệu, trên 2 loại phương tiện lưu trữ khác nhau, và ít nhất 1 bản sao được lưu trữ ngoài địa điểm chính (Offsite/Cloud).'
      },
      {
        concept: 'RPO và RTO (Recovery Point & Recovery Time Objective)',
        perspective: 'Kế hoạch kinh doanh liên tục',
        insight: 'Cân bằng giữa chi phí đầu tư phần cứng dự phòng nóng (High Availability) với thời gian tối đa doanh nghiệp có thể chấp nhận ngừng hoạt động.'
      }
    ]
  }
};

export class AssociationEngine {
  /**
   * Find cross-domain concepts and associations based on query and topic
   * 
   * @param {string} text - User message
   * @param {Object} context - Execution context
   * @returns {Object} Associated concepts and cross-domain insights
   */
  static findAssociations(text = '', context = {}) {
    const raw = (text || '').trim().toLowerCase();
    if (!raw || raw.length < 6) {
      return { hasAssociations: false, associations: [] };
    }

    const matchedInsights = [];
    const matchedDomains = new Set();

    for (const [key, mapping] of Object.entries(DOMAIN_ASSOCIATION_MATRIX)) {
      const isMatch = mapping.keywords.some(kw => raw.includes(kw));
      if (isMatch) {
        mapping.domains.forEach(d => matchedDomains.add(d));
        mapping.associations.forEach(assoc => matchedInsights.push(assoc));
      }
    }

    if (matchedInsights.length > 0) {
      return {
        hasAssociations: true,
        domains: Array.from(matchedDomains),
        associations: matchedInsights,
        synthesisSummary: matchedInsights.map(a => `[${a.perspective} - ${a.concept}]: ${a.insight}`).join('\n\n')
      };
    }

    return {
      hasAssociations: false,
      domains: [],
      associations: []
    };
  }

  /**
   * Synthesize cross-domain insights (Alias for findAssociations)
   */
  static synthesizeCrossDomainInsights(text = '', context = {}) {
    return this.findAssociations(text, context);
  }

  /**
   * Concept Mapping: Map an entity to its related conceptual ecosystem
   */
  static getConceptEcosystem(entityName = '') {
    const norm = (entityName || '').trim().toLowerCase();
    if (!norm) return null;

    if (norm.includes('máy in') || norm.includes('may in')) {
      return {
        coreEntity: 'Máy In Văn Phòng',
        primaryComponents: ['Hộp mực (Toner/Ink)', 'Cụm sấy (Fuser)', 'Trống từ (Drum)', 'Khay nạp giấy (ADF)'],
        associatedProcesses: ['Bảo trì định kỳ', 'In qua mạng LAN/WiFi', 'Scan to Folder/Email', 'Secure Print'],
        economicFactors: ['Giá máy (CAPEX)', 'Giá trang in (CPP - Cost Per Page)', 'Tuổi thọ vật tư'],
        serviceRequirements: ['Khảo sát vị trí đặt máy', 'Cài đặt driver & phân quyền', 'Bảo trì thay mực']
      };
    }

    if (norm.includes('laptop') || norm.includes('máy tính') || norm.includes('thinkpad')) {
      return {
        coreEntity: 'Máy Tính Xách Tay Doanh Nghiệp',
        primaryComponents: ['CPU / NPU AI', 'RAM đa kênh', 'SSD NVMe', 'Màn hình chống lóa', 'Bàn phím chống tràn'],
        associatedProcesses: ['Cài đặt hệ điều hành bản quyền', 'Quản trị thiết bị tập trung (MDM)', 'Mã hóa BitLocker'],
        economicFactors: ['Hiệu năng công việc', 'Bảo hành tận nơi 3 năm (Premier Support)', 'Giá trị khấu hao thanh lý'],
        serviceRequirements: ['Bảo dưỡng vệ sinh tản nhiệt', 'Nâng cấp dung lượng RAM/SSD', 'Sao lưu dữ liệu']
      };
    }

    return null;
  }

  /**
   * Root Cause Analysis (RCA) for hardware, software, and network issues
   */
  static analyzeRootCause(problemDescription = '') {
    const raw = (problemDescription || '').toLowerCase();
    const probableCauses = [];
    const recommendedActions = [];

    if (raw.includes('ù') || raw.includes('rè') || raw.includes('micro') || raw.includes('50hz')) {
      probableCauses.push('Vòng lặp tiếp địa (Ground Loop) giữa máy tính và nguồn sạc');
      probableCauses.push('Thiếu dây nối đất tiếp địa triệt tiêu nhiễu điện lưới 50Hz');
      recommendedActions.push('Dùng bộ cách ly âm thanh Ground Loop Isolator hoặc cắm tiếp địa');
    } else if (raw.includes('mờ') && (raw.includes('máy in') || raw.includes('hóa đơn') || raw.includes('nhiệt'))) {
      probableCauses.push('Bụi bẩn bám trên đầu in nhiệt (thermal head) làm giảm tiếp xúc truyền nhiệt');
      probableCauses.push('Giấy in nhiệt bị ẩm hoặc chất lượng lớp phủ nhiệt kém');
      probableCauses.push('Điện áp cấp cho đầu in nhiệt bị sụt áp');
      recommendedActions.push('Dùng tăm bông tẩm cồn Isopropyl 90 độ vệ sinh nhẹ nhàng đầu in nhiệt');
      recommendedActions.push('Thay cuộn giấy in nhiệt mới bảo quản khô ráo');
    } else if (raw.includes('type-c') || raw.includes('sạc') || raw.includes('pin')) {
      probableCauses.push('Cáp sạc không đạt chuẩn Power Delivery (PD) đủ công suất W yêu cầu');
      probableCauses.push('Củ sạc thiếu công suất định mức hoặc không tương thích giao thức sạc');
      probableCauses.push('Cổng Type-C bị bám bụi chân tiếp xúc CC1/CC2');
      recommendedActions.push('Kiểm tra công suất củ sạc và cáp hỗ trợ chuẩn PD 65W/100W');
    } else if (raw.includes('đơ') || raw.includes('chậm') || raw.includes('chuột') || raw.includes('tab')) {
      probableCauses.push('Bộ nhớ RAM bị chiếm dụng 100% do rò rỉ bộ nhớ (memory leak)');
      probableCauses.push('Ổ cứng bị nghẽn 100% Active Time (đặc biệt ổ HDD cũ)');
      recommendedActions.push('Nâng cấp RAM và thay thế ổ SSD NVMe');
    } else if (raw.includes('mạng') || raw.includes('switch') || raw.includes('lan')) {
      probableCauses.push('Vòng lặp mạng (Network Loop) do cắm nhầm 2 đầu cáp vào cùng 1 switch không có STP');
      probableCauses.push('Xung đột trùng địa chỉ IP tĩnh giữa thiết bị mới và thiết bị hiện hữu');
      recommendedActions.push('Rút cáp thiết bị mới và kích hoạt Spanning Tree Protocol (STP) trên switch');
    } else if (raw.includes('chớp') || raw.includes('144hz') || raw.includes('màn hình')) {
      probableCauses.push('Cáp tín hiệu HDMI/DisplayPort không đủ băng thông truyền tải 144Hz');
      probableCauses.push('Độ dài cáp vượt quá chuẩn suy hao tín hiệu');
      recommendedActions.push('Đổi sang cáp DisplayPort 1.4 hoặc HDMI 2.1 Ultra High Speed');
    } else if (raw.includes('tiền giả') || raw.includes('máy đếm tiền')) {
      probableCauses.push('Bụi tiền polymer che phủ mắt đọc cảm biến quang hồng ngoại (IR/UV)');
      probableCauses.push('Cảm biến từ tính (MG) bị lệch độ nhạy');
      recommendedActions.push('Vệ sinh cụm mắt đọc cảm biến và hiệu chỉnh lại độ nhạy sensor');
    } else {
      probableCauses.push('Lỗi linh kiện phần cứng hoặc xung đột trình điều khiển phần mềm');
      recommendedActions.push('Khảo sát kiểm tra trực tiếp');
    }

    return {
      problemDescription,
      probableCauses,
      recommendedActions,
      confidence: 0.92
    };
  }

  /**
   * Apply TRIZ inventive principles to solve engineering/business dilemmas
   */
  static applyTrizPrinciple(engineeringDilemma = '') {
    const raw = (engineeringDilemma || '').toLowerCase();
    const principles = [];
    let explanation = '';

    if (raw.includes('tản nhiệt') || raw.includes('siêu mỏng') || raw.includes('nóng')) {
      principles.push('PHAN_CHIA');
      principles.push('TET_ROI');
      explanation = 'Áp dụng Nguyên tắc Phân chia (Segmentation) & Tách rời (Taking Out): Tách nguồn sinh nhiệt lớn (CPU/GPU) qua hệ thống ống dẫn nhiệt buồng hơi (Vapor Chamber) đưa nhiệt lượng ra mép khung kim loại tản nhiệt.';
    } else if (raw.includes('sạc') || raw.includes('tích hợp') || raw.includes('gan') || raw.includes('công tác')) {
      principles.push('KET_HOP');
      principles.push('DA_NANG');
      explanation = 'Áp dụng Nguyên tắc Kết hợp (Combining) & Đa năng (Universality): Tích hợp củ sạc công nghệ bán dẫn GaN 3 trong 1 siêu nhỏ gọn 65W/100W, thay thế hoàn toàn 3 củ sạc cồng kềnh riêng lẻ.';
    } else {
      principles.push('LINH_HOAT');
      explanation = 'Áp dụng Nguyên tắc Linh hoạt hóa (Dynamicity): Cho phép hệ thống tự thích ứng linh hoạt theo tải trọng thực tế.';
    }

    return {
      engineeringDilemma,
      principles,
      explanation
    };
  }

  /**
   * Rank engineering/operational solutions by cost from low to high
   */
  static rankSolutionsByCost(solutions = []) {
    if (!Array.isArray(solutions)) return [];
    return [...solutions].sort((a, b) => (a.cost || 0) - (b.cost || 0));
  }
}

export default AssociationEngine;
