/**
 * TRÍ AI ONE SUPER BRAIN – PRODUCT CONFIGURATION ENGINE
 * MULTI-PRODUCT ISOLATION & DYNAMIC GOVERNANCE (STAGE G5)
 * 
 * Manages configuration, isolation boundaries and capabilities for the 6 Products:
 * 1. TRÍ AI SALES ROBOT
 * 2. TRÍ AI RECEPTIONIST
 * 3. TRÍ AI SECRETARY
 * 4. TRÍ AI TUTOR
 * 5. TRÍ AI VOICE & VISION
 * 6. TRÍ AI ENTERPRISE
 */

export class ProductConfigurationEngine {
  constructor() {
    this.products = {
      sales_robot: {
        id: 'PROD_SALES',
        name: 'TRÍ AI SALES ROBOT',
        code: 'sales',
        scope: 'Tư vấn bán hàng, báo giá thiết bị viễn thông, tính thuế GTGT 10%, quản lý giỏ hàng',
        defaultTone: 'Tư vấn chuyên nghiệp, lịch sự, nhiệt tình, định hướng giải pháp tối ưu',
        allowedActions: ['VIEW_CATALOG', 'SEARCH_PRODUCTS', 'GENERATE_QUOTATION', 'CALCULATE_VAT', 'REQUEST_CALLBACK'],
        blockedActions: ['AUTO_DEBIT', 'TRANSFER_FUNDS', 'DELETE_USER_DATA'],
        ragCategories: ['products', 'telecom_hardware', 'cabling', 'promotions', 'faq_sales']
      },
      receptionist: {
        id: 'PROD_RECEPTIONIST',
        name: 'TRÍ AI RECEPTIONIST',
        code: 'receptionist',
        scope: 'Tiếp đón khách hàng, check-in, chỉ dẫn phòng ban, đặt lịch hẹn với quản lý',
        defaultTone: 'Trang nhã, hiếu khách, rõ ràng, hướng dẫn chu đáo',
        allowedActions: ['CHECK_IN', 'BOOK_APPOINTMENT', 'VIEW_ROOM_SCHEDULE', 'NOTIFY_STAFF'],
        blockedActions: ['ACCESS_FINANCIAL_REPORTS', 'MODIFY_PRICING', 'TRANSFER_FUNDS'],
        ragCategories: ['company_directory', 'meeting_rooms', 'visiting_guidelines', 'schedules']
      },
      secretary: {
        id: 'PROD_SECRETARY',
        name: 'TRÍ AI SECRETARY',
        code: 'secretary',
        scope: 'Soạn thảo văn bản hành chính, tóm tắt biên bản cuộc họp, quản lý lịch làm việc',
        defaultTone: 'Chính xác, bảo mật, chuẩn mực văn phong hành chính, ngắn gọn',
        allowedActions: ['DRAFT_DOCUMENT', 'SUMMARIZE_MINUTES', 'SET_REMINDER', 'SCHEDULE_TASK'],
        blockedActions: ['SIGN_CONTRACT_AUTOMATICALLY', 'DISBURSE_PAYMENT'],
        ragCategories: ['document_templates', 'meeting_notes', 'internal_policies']
      },
      tutor: {
        id: 'PROD_TUTOR',
        name: 'TRÍ AI TUTOR',
        code: 'tutor',
        scope: 'Đào tạo nhân sự, giải đáp quy trình kỹ thuật, hướng dẫn cài đặt thiết bị viễn thông',
        defaultTone: 'Sư phạm, kiên nhẫn, phân tích từng bước, dễ hiểu',
        allowedActions: ['ANSWER_TECHNICAL_SOP', 'SEARCH_MANUALS', 'TEST_KNOWLEDGE', 'TRACK_LEARNING'],
        blockedActions: ['CHANGE_SYSTEM_PASSWORDS', 'EXPORT_CONFIDENTIAL_DATA'],
        ragCategories: ['user_manuals', 'technical_sop', 'troubleshooting_guides', 'training_materials']
      },
      voice_vision: {
        id: 'PROD_VOICE_VISION',
        name: 'TRÍ AI VOICE & VISION',
        code: 'voice_vision',
        scope: 'Giao tiếp thoại tiếng Việt rảnh tay (STT/TTS vi-VN), trích xuất tài liệu PDF/Excel',
        defaultTone: 'Tự nhiên, phản hồi âm thanh trong trẻo, thị giác trực quan',
        allowedActions: ['SPEECH_TO_TEXT', 'TEXT_TO_SPEECH', 'PARSE_DOCUMENT', 'EXTRACT_EXCEL_DATA'],
        blockedActions: ['STREAM_RESTRICTED_CAMERA', 'SAVE_UNAUTHORIZED_VOICE_SAMPLE'],
        ragCategories: ['multimodal_metadata', 'document_archives', 'voice_prompts']
      },
      enterprise: {
        id: 'PROD_ENTERPRISE',
        name: 'TRÍ AI ENTERPRISE',
        code: 'enterprise',
        scope: 'Báo cáo tổng hợp quản trị, phân tích KPI, giám sát bảo mật đa chi nhánh',
        defaultTone: 'Cấp cao, chiến lược, bảo mật nghiêm ngặt, số liệu trực quan',
        allowedActions: ['VIEW_ANALYTICS', 'AUDIT_LOG_REVIEW', 'MULTI_SITE_STATUS', 'EXPORT_REPORT'],
        blockedActions: ['DIRECT_DB_ALTER', 'BYPASS_SECURITY_GATE'],
        ragCategories: ['enterprise_kpi', 'branch_metrics', 'security_policies', 'audit_records']
      }
    };
  }

  /**
   * Lấy cấu hình sản phẩm theo mã định danh hoặc tên
   * @param {string} productCode - Mã sản phẩm (sales, receptionist, secretary, ...)
   * @returns {object} Cấu hình chi tiết của sản phẩm
   */
  getProductConfig(productCode = 'sales') {
    const code = productCode.toLowerCase().trim();
    for (const key of Object.keys(this.products)) {
      if (this.products[key].code === code || this.products[key].id === productCode) {
        return this.products[key];
      }
    }
    // Mặc định fallback là Sales Robot
    return this.products.sales_robot;
  }

  /**
   * Kiểm tra hành động có được phép trong phạm vi sản phẩm hay không
   * @param {string} productCode - Mã sản phẩm
   * @param {string} action - Tên hành động cần kiểm tra
   * @returns {boolean} true nếu được phép, false nếu bị chặn
   */
  isActionAllowed(productCode, action) {
    const config = this.getProductConfig(productCode);
    if (config.blockedActions.includes(action)) {
      return false;
    }
    return config.allowedActions.includes(action);
  }

  /**
   * Tạo bộ lọc truy vấn RAG theo phạm vi sản phẩm và tenant
   * @param {string} productCode - Mã sản phẩm
   * @param {string} tenantId - Mã định danh tổ chức / khách hàng
   * @returns {object} Filter query chuẩn
   */
  createScopeFilter(productCode, tenantId = 'default_tenant') {
    const config = this.getProductConfig(productCode);
    return {
      tenant_id: tenantId,
      allowedCategories: config.ragCategories,
      isolation_boundary: 'TENANT_' + tenantId + '::PROD_' + config.code.toUpperCase()
    };
  }
}

export default new ProductConfigurationEngine();
