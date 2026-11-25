/**
 * TRÍ AI ULTIMATE ROBOT – DOMAIN REGISTRY & ALL-DOMAIN ORCHESTRATOR
 * DOCTOR-LEVEL ALL-DOMAIN CAPABILITY – STAGE 5
 * 
 * Central registry that organizes and coordinates the 12 Specialized Domains:
 * 1. FINANCE_BANKING       - FinanceDomainHandler
 * 2. LEGAL_COMPLIANCE      - LegalDomainHandler
 * 3. ENGINEERING_TECH      - EngineeringDomainHandler
 * 4. CONSTRUCTION_SURVEY   - ConstructionDomainHandler
 * 5. HEALTHCARE_LIFE       - HealthcareDomainHandler
 * 6. BUSINESS_MANAGEMENT   - Strategic Management, Supply Chain, Operations
 * 7. SCIENCE_PHYSICS       - Fundamental Physics, Semiconductors, Material Science
 * 8. EDUCATION_TRAINING    - Corporate Training, Pedagogy, Skill Development
 * 9. LOGISTICS_SUPPLY      - Warehousing, Routing, Fleet Operations
 * 10. AGRICULTURE_ENV      - Sustainable ESG, Agritech, Carbon Credits
 * 11. HOSPITALITY_SERVICE  - Customer Experience, VIP Relations, Hospitality
 * 12. ARTS_COMMUNICATION   - Linguistics, Brand Communication, Aesthetic Design
 */

import FinanceDomainHandler from './financeDomainHandler.js';
import LegalDomainHandler from './legalDomainHandler.js';
import EngineeringDomainHandler from './engineeringDomainHandler.js';
import ConstructionDomainHandler from './constructionDomainHandler.js';
import HealthcareDomainHandler from './healthcareDomainHandler.js';

export const ALL_DOMAINS = {
  FINANCE_BANKING: 'FINANCE_BANKING',
  LEGAL_COMPLIANCE: 'LEGAL_COMPLIANCE',
  ENGINEERING_TECH: 'ENGINEERING_TECH',
  CONSTRUCTION_SURVEY: 'CONSTRUCTION_SURVEY',
  HEALTHCARE_LIFE: 'HEALTHCARE_LIFE',
  BUSINESS_MANAGEMENT: 'BUSINESS_MANAGEMENT',
  SCIENCE_PHYSICS: 'SCIENCE_PHYSICS',
  EDUCATION_TRAINING: 'EDUCATION_TRAINING',
  LOGISTICS_SUPPLY: 'LOGISTICS_SUPPLY',
  AGRICULTURE_ENV: 'AGRICULTURE_ENV',
  HOSPITALITY_SERVICE: 'HOSPITALITY_SERVICE',
  ARTS_COMMUNICATION: 'ARTS_COMMUNICATION'
};

export class DomainRegistry {
  /**
   * 1. Identify which of the 12 Domains applies to user query
   */
  static identifyDomain(query = '', context = {}) {
    const q = (query || '').toLowerCase().trim();
    if (!q || q.length < 5) return null;

    // Finance & Banking
    if (/(?:tco|chi phí sở hữu|chi phí vận hành|tài chính|ngân hàng|đầu tư vốn|dòng tiền|roi|npv|khấu hao|lợi nhuận|dự toán ngân sách)/i.test(q)) {
      return ALL_DOMAINS.FINANCE_BANKING;
    }

    // Legal & Compliance
    if (/(?:pháp lý|hợp đồng|điều khoản|bảo mật thông tin|nghị định 13|an ninh mạng|dữ liệu cá nhân|sla|tranh chấp|sở hữu trí tuệ|co\/cq)/i.test(q)) {
      return ALL_DOMAINS.LEGAL_COMPLIANCE;
    }

    // Engineering & Technology
    if (/(?:phần cứng|kiến trúc máy tính|cpu|ram|ssd|npu|vlan|ldap|active directory|chuẩn quân đội|mil-std|usb-c|gan|tdp|băng thông|chipset)/i.test(q)) {
      return ALL_DOMAINS.ENGINEERING_TECH;
    }

    // Construction & Survey
    if (/(?:khảo sát mặt bằng|khảo sát công trình|thi công|lắp đặt|đi dây mạng|chịu tải|tiếp địa|tủ rack|thiết kế hiện trường)/i.test(q)) {
      return ALL_DOMAINS.CONSTRUCTION_SURVEY;
    }

    // Healthcare & Ergonomics
    if (/(?:công thái học|ergonomics|mỏi mắt|ánh sáng xanh|tüv|tư thế ngồi|bảo vệ cột sống|sức khỏe văn phòng|lọc nước|chất lượng nước|không khí)/i.test(q)) {
      return ALL_DOMAINS.HEALTHCARE_LIFE;
    }

    // Business Management
    if (/(?:chiến lược|chuỗi giá trị|tái cấu trúc|quản trị vận hành|kpi|okr|chuỗi cung ứng|mô hình kinh doanh)/i.test(q)) {
      return ALL_DOMAINS.BUSINESS_MANAGEMENT;
    }

    // Science & Physics
    if (/(?:vật lý|nhiệt động học|bán dẫn|quang học|hạt nhân|bảo toàn năng lượng|vật liệu mới)/i.test(q)) {
      return ALL_DOMAINS.SCIENCE_PHYSICS;
    }

    // Education & Training
    if (/(?:đào tạo|giáo dục|năng lực nhân sự|phương pháp sư phạm|giáo trình|kỹ năng)/i.test(q)) {
      return ALL_DOMAINS.EDUCATION_TRAINING;
    }

    // Logistics & Supply Chain
    if (/(?:kho bãi|vận tải|giao nhận|logistics|tối ưu lộ trình|chuỗi cung ứng|fleet)/i.test(q)) {
      return ALL_DOMAINS.LOGISTICS_SUPPLY;
    }

    // Agriculture & Environment
    if (/(?:nông nghiệp|môi trường|esg|tín chỉ carbon|phát triển bền vững|xử lý rác thải)/i.test(q)) {
      return ALL_DOMAINS.AGRICULTURE_ENV;
    }

    // Hospitality & Customer Experience
    if (/(?:khách sạn|du lịch|trải nghiệm khách hàng|dịch vụ khách hàng|tiếp tân|nghỉ dưỡng)/i.test(q)) {
      return ALL_DOMAINS.HOSPITALITY_SERVICE;
    }

    // Arts & Communication
    if (/(?:nghệ thuật|truyền thông|thương hiệu|thiết kế đồ họa|ngôn ngữ học|sáng tạo)/i.test(q)) {
      return ALL_DOMAINS.ARTS_COMMUNICATION;
    }

    return null;
  }

  /**
   * 2. Execute Consultation for a Specialized Domain
   */
  static executeDomainConsultation(domainKey, query = '', context = {}) {
    let result = null;

    switch (domainKey) {
      case ALL_DOMAINS.FINANCE_BANKING:
        result = FinanceDomainHandler.analyze(query, context);
        result.domainInfo = FinanceDomainHandler.getDomainInfo();
        break;

      case ALL_DOMAINS.LEGAL_COMPLIANCE:
        result = LegalDomainHandler.analyze(query, context);
        result.domainInfo = LegalDomainHandler.getDomainInfo();
        break;

      case ALL_DOMAINS.ENGINEERING_TECH:
        result = EngineeringDomainHandler.analyze(query, context);
        result.domainInfo = EngineeringDomainHandler.getDomainInfo();
        break;

      case ALL_DOMAINS.CONSTRUCTION_SURVEY:
        result = ConstructionDomainHandler.analyze(query, context);
        result.domainInfo = ConstructionDomainHandler.getDomainInfo();
        break;

      case ALL_DOMAINS.HEALTHCARE_LIFE:
        result = HealthcareDomainHandler.analyze(query, context);
        result.domainInfo = HealthcareDomainHandler.getDomainInfo();
        break;

      default:
        result = {
          specialization: 'GENERAL_EXPERT_ADVISORY',
          title: `Tư Vấn Chuyên Sâu Lĩnh Vực ${domainKey}`,
          domainInfo: {
            code: domainKey,
            name: `Chuyên ngành ${domainKey}`,
            doctorPersona: 'Chuyên gia Cấp cao Đa lĩnh vực TRÍ AI ULTIMATE ROBOT'
          },
          advisoryNotes: [
            `Phân tích vấn đề "${query}" dựa trên quy chuẩn phương pháp luận khoa học hệ thống.`,
            'Đảm bảo cân bằng giữa hiệu quả thực thi, chi phí đầu tư và quản trị rủi ro.'
          ],
          suggestedNextStep: 'Tiếp tục hoàn thiện dữ liệu hoặc liên kết với kế hoạch hành động cụ thể.'
        };
        break;
    }

    // Format Structured Domain Expert Output
    const header = `### 🎓 [TRÍ AI CHUYÊN GIA]: ${result.domainInfo.name}\n` +
      `**Chuyên môn:** ${result.domainInfo.doctorPersona} | **Thẩm quyền:** ${result.domainInfo.epistemicAuthority || 'Chuẩn Mực Khoa Học Quốc Tế'}\n\n` +
      `#### 📌 **${result.title}**\n\n`;

    let body = '';
    if (result.keyMetrics) {
      body += `**Chỉ số Phân tích Cốt lõi:**\n` + result.keyMetrics.map(m => `- **${m.metric}:** ${m.allocation || m.benchmark || m.timeline}`).join('\n') + '\n\n';
    }
    if (result.technicalSpecifications) {
      body += `**Quy Chuẩn Kỹ Thuật Đạt Chuẩn:**\n` + result.technicalSpecifications.map(s => `- ${s}`).join('\n') + '\n\n';
    }
    if (result.legalStandards) {
      body += `**Cơ Sở Pháp Lý & Tiêu Chuẩn Bắt Buộc:**\n` + result.legalStandards.map(l => `- ${l}`).join('\n') + '\n\n';
    }
    if (result.healthStandards) {
      body += `**Tiêu Chuẩn Y Tế & Công Thái Học:**\n` + result.healthStandards.map(h => `- ${h}`).join('\n') + '\n\n';
    }
    if (result.surveyParameters) {
      body += `**Thông Số Khảo Sát Hiện Trường:**\n` + result.surveyParameters.map(p => `- ${p}`).join('\n') + '\n\n';
    }
    if (result.advisoryNotes) {
      body += `**Khuyến Nghị Chuyên Môn:**\n` + result.advisoryNotes.map(n => `- ${n}`).join('\n') + '\n\n';
    }
    if (result.complianceActions) {
      body += `**Hành Động Tuân Thủ Bắt Buộc:**\n` + result.complianceActions.map(a => `- ${a}`).join('\n') + '\n\n';
    }
    if (result.engineeringRecommendations) {
      body += `**Khuyến Nghị Kỹ Thuật Triển Khai:**\n` + result.engineeringRecommendations.map(e => `- ${e}`).join('\n') + '\n\n';
    }

    body += `👉 **Bước tiếp theo đề xuất:** ${result.suggestedNextStep}\n`;

    return {
      success: true,
      domain: domainKey,
      specialization: result.specialization,
      consultationText: (header + body).trim(),
      potentialProductNeed: result.potentialProductNeed || null,
      targetProductCategory: result.targetProductCategory || null,
      requiresServiceHandover: Boolean(result.requiresServiceHandover)
    };
  }
}

export default DomainRegistry;
