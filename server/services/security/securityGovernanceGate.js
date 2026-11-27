/**
 * TRÍ AI ONE SUPER BRAIN - SECURITY & GOVERNANCE GATE
 * 
 * Philosophy: SAFETY-FIRST – L1-L4 AUTHORIZATION MATRIX – STRICT TIER 3 PAYMENT BLOCK – TENANT ISOLATION
 * 
 * 4-Level Authorization Levels:
 *  - L1: Public & Read-Only (Open catalog, general FAQs, technical specs)
 *  - L2: Personal Low Stakes (Personal tasks, reminders, self preferences)
 *  - L3: Business Medium Stakes (Sending customer emails, formal quotes, scheduling team events) -> Verbal Approval
 *  - L4: Financial & Irreversible (Bank transfers, payments, DB wiping) -> STRICTLY BLOCKED FROM AI
 */

import db from '../../db.js';

export const AUTHORIZATION_LEVELS = {
  L1_PUBLIC: 'L1_PUBLIC',
  L2_PERSONAL: 'L2_PERSONAL',
  L3_BUSINESS: 'L3_BUSINESS',
  L4_IRREVERSIBLE: 'L4_IRREVERSIBLE'
};

export class SecurityGovernanceGate {
  /**
   * Evaluates input action against the 4-level authorization matrix
   * @param {Object} params
   * @returns {Object} Evaluation outcome
   */
  static evaluateAuthorization(params = {}) {
    const {
      message = '',
      actionType = '',
      userContext = {},
      tenantId = 'org_default'
    } = params;

    const lower = (message || '').toLowerCase();

    // 1. TIER 3 / L4 FINANCIAL & IRREVERSIBLE ACTION BLOCK
    const isFinancialAction = /(chuyển tiền|chuyen tien|chuyển khoản|chuyen khoan|chuyển\s+(?:\d+|ngay|cho|tiền|khoản)|thanh toán|thanh toan|quẹt thẻ|nạp tiền|bắn tiền|rút tiền|rut tien|trừ tiền|tru tien)/i.test(lower) ||
      /(xóa database|xoa database|drop table|xóa toàn bộ hợp đồng|xoa toan bo|xóa cơ sở dữ liệu|xoa co so du lieu|xóa sạch|xoa sach)/i.test(lower);

    if (isFinancialAction || actionType === 'FINANCIAL_TRANSFER' || actionType === 'SYSTEM_WIPE') {
      return {
        level: AUTHORIZATION_LEVELS.L4_IRREVERSIBLE,
        allowed: false,
        blocked: true,
        reason: 'Hành động tài chính / chuyển tiền hoặc xóa dữ liệu thuộc Cấp độ L4 (Tier 3) – Bị cấm tuyệt đối khỏi quyền tự chủ của AI nhằm bảo vệ tài sản doanh nghiệp.',
        replyText: 'Dạ, theo chính sách an toàn bảo mật nghiêm ngặt của hệ thống, TRÍ AI không được cấp quyền tự động thực hiện các giao dịch chuyển tiền hoặc thanh toán tài chính trực tiếp. Anh/chị vui lòng mở ứng dụng ngân hàng chính thức để tự tay kiểm tra và xác thực giao dịch an toàn nhé ạ.'
      };
    }

    // 2. L3 BUSINESS MEDIUM STAKES (Requires verbal approval)
    const isBusinessStakes = /(gửi email|gui email|gửi báo giá cho sếp|ký duyệt|chốt hợp đồng tự động)/i.test(lower);
    if (isBusinessStakes || actionType === 'SEND_EMAIL_EXTERNAL') {
      return {
        level: AUTHORIZATION_LEVELS.L3_BUSINESS,
        allowed: false,
        requiresApproval: true,
        reason: 'Hành động cấp độ L3 yêu cầu sự phê duyệt bằng lời nói trực tiếp từ người có thẩm quyền.',
        replyText: 'Em đã chuẩn bị xong nội dung. Anh/chị có xác nhận đồng ý gửi đi không ạ?'
      };
    }

    // 3. L2 PERSONAL LOW STAKES (Safe autonomous execution)
    const isPersonalTask = /(nhắc tôi|lên lịch|ghi nhớ|quên đi)/i.test(lower);
    if (isPersonalTask) {
      return {
        level: AUTHORIZATION_LEVELS.L2_PERSONAL,
        allowed: true,
        requiresApproval: false
      };
    }

    // 4. L1 PUBLIC READ-ONLY
    return {
      level: AUTHORIZATION_LEVELS.L1_PUBLIC,
      allowed: true,
      requiresApproval: false
    };
  }

  /**
   * Enforces strict multi-tenant boundary on database queries
   * @param {string} tenantId
   * @param {string} userId
   * @returns {Object} SQL condition and parameter array
   */
  static getTenantBoundaryClause(tenantId = 'org_default', userId = 'usr_anonymous') {
    if (!tenantId) {
      throw new Error('[SECURITY GATE] Violation: tenantId cannot be null or empty.');
    }
    return {
      clause: 'WHERE tenant_id = ? AND (is_private = 0 OR user_id = ?)',
      params: [tenantId, userId]
    };
  }
}
