/**
 * TRÍ AI ULTIMATE ROBOT – AUTONOMY & APPROVAL ENGINE
 * Cơ chế Tự chủ & Phê duyệt Phân tầng theo Chính sách Hội thoại
 * 
 * 4 CẤP ĐỘ THẨM QUYỀN (AUTONOMY TIERS):
 * - Tier 0: Hoàn toàn Tự chủ (Read-only, giải thích khoa học, tra cứu giá/thông số) -> 100% tự động.
 * - Tier 1: Tự chủ có Thông báo (Lưu nháp, tạo lịch nhắc cá nhân, ghi chú) -> Tự động + thông báo nhẹ.
 * - Tier 2: Bắt buộc Phê duyệt bằng Hội thoại (Phát hành báo giá, tạo đơn hàng, kích hoạt khảo sát) -> Soạn nháp + Hỏi duyệt.
 * - Tier 3: Chặn Tuyệt đối & Yêu cầu Thẩm quyền Cao (Thanh toán, hoàn tiền, ký hợp đồng, sửa giá gốc) -> Chặn và giải thích.
 * 
 * NĂNG LỰC HỦY TÁC VỤ BẰNG LỜI NÓI (VERBAL CANCELLATION):
 * - Nhận diện "Thôi, đừng gửi báo giá nữa", "Dừng lại đi", "Hủy đơn nháp" -> Hủy pending action & xác nhận.
 */

import { randomUUID } from 'crypto';
import { db } from '../../db.js';

export const AUTONOMY_TIERS = {
  TIER_0: {
    level: 0,
    name: 'AUTONOMOUS_READ_ONLY',
    description: 'Tra cứu thông tin, giải thích kiến thức, xem thông số kỹ thuật.'
  },
  TIER_1: {
    level: 1,
    name: 'AUTONOMOUS_DRAFT_WITH_NOTICE',
    description: 'Tạo bản nháp nội bộ, ghi nhớ tạm thời, lên lịch nhắc việc cá nhân.'
  },
  TIER_2: {
    level: 2,
    name: 'CONVERSATIONAL_APPROVAL_REQUIRED',
    description: 'Gửi báo giá chính thức, tạo đơn hàng, kích hoạt dịch vụ khảo sát.'
  },
  TIER_3: {
    level: 3,
    name: 'STRICT_HUMAN_AUTHORITY_REQUIRED',
    description: 'Thanh toán tiền, hoàn tiền, ký kết hợp đồng, can thiệp cấu hình hệ thống.'
  }
};

export class AutonomyApprovalEngine {
  /**
   * Pending Action Store theo Session ID
   */
  static pendingActionStore = new Map(); // sessionId -> PendingAction

  /**
   * 1. Đánh giá Cấp độ Tự chủ của một Tác vụ
   */
  static evaluateActionTier(actionType = '', payload = {}) {
    const act = (actionType || '').toUpperCase();

    // Tier 3: Tài chính, thanh toán, pháp lý, hủy dữ liệu lớn
    const tier3Actions = [
      'EXECUTE_PAYMENT', 'PROCESS_PAYMENT', 'REFUND_MONEY',
      'TRANSFER_FUNDS', 'SIGN_CONTRACT', 'DELETE_DATABASE',
      'MODIFY_CORE_PRICING', 'ELEVATE_ROLE'
    ];
    if (tier3Actions.includes(act) || /(thanh\s+toán|chuyển\s+tiền|hoàn\s+tiền|rút\s+tiền|trừ\s+tiền)/i.test(act)) {
      return 3;
    }

    // Tier 2: Gửi báo giá chính thức, tạo đơn hàng, phân công khảo sát
    const tier2Actions = [
      'SEND_FORMAL_QUOTATION', 'CREATE_ORDER', 'DISPATCH_SERVICE_SURVEY',
      'CONFIRM_BOOKING', 'SEND_CUSTOMER_EMAIL'
    ];
    if (tier2Actions.includes(act) || /(gửi\s+báo\s+giá|chốt\s+đơn|tạo\s+đơn|khảo\s+sát)/i.test(act)) {
      return 2;
    }

    // Tier 1: Nháp, ghi nhớ, nhắc việc
    const tier1Actions = [
      'DRAFT_QUOTATION', 'CREATE_TASK', 'SCHEDULE_REMINDER',
      'UPDATE_NOTE', 'SAVE_CUSTOMER_PREFERENCE'
    ];
    if (tier1Actions.includes(act)) {
      return 1;
    }

    // Tier 0: Mặc định tra cứu, tư vấn
    return 0;
  }

  /**
   * 2. Đăng ký Hành động Chờ Phê duyệt (Tier 2)
   */
  static registerPendingAction(sessionId, actionData = {}) {
    if (!sessionId) return null;

    const actionId = actionData.actionId || `act_${randomUUID().slice(0, 8)}`;
    const pendingAction = {
      actionId,
      actionType: actionData.actionType || 'SEND_FORMAL_QUOTATION',
      tier: actionData.tier !== undefined ? actionData.tier : 2,
      payload: actionData.payload || {},
      status: 'PENDING_CONFIRMATION',
      createdAt: Date.now(),
      expiresAt: Date.now() + 15 * 60 * 1000 // Hết hạn sau 15 phút
    };

    this.pendingActionStore.set(sessionId, pendingAction);
    return pendingAction;
  }

  static getPendingAction(sessionId) {
    if (!sessionId) return null;
    const action = this.pendingActionStore.get(sessionId);
    if (!action) return null;

    // Check expiration
    if (Date.now() > action.expiresAt) {
      this.pendingActionStore.delete(sessionId);
      return null;
    }
    return action;
  }

  static listPendingActions(sessionId) {
    const act = this.getPendingAction(sessionId);
    return act ? [act] : [];
  }

  static clearPendingAction(sessionId) {
    if (!sessionId) return;
    this.pendingActionStore.delete(sessionId);
  }

  /**
   * 3. Đánh giá Phản hồi Hội thoại: Phê duyệt, Hủy bỏ hay Chỉnh sửa
   */
  static evaluateConversationalResponse(message = '', sessionId = null) {
    const raw = (message || '').trim().toLowerCase();
    const unaccented = raw
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd');

    const pending = sessionId ? this.getPendingAction(sessionId) : null;

    // A. NHẬN DIỆN LỆNH HỦY HÀNH ĐỘNG (Kịch bản 7: "Thôi, đừng gửi báo giá nữa", "Hủy đi", "Dừng lại đi")
    const isCancellation = (
      /(thoi|dung|huy|stop|cancel|khoan).*(dung\s+gui|dung\s+lam|khong\s+gui|khong\s+can|huy\s+bao\s+gia|huy\s+don|dung\s+lai|thoi\s+khong\s+can)/i.test(unaccented) ||
      /^(thoi|huy|dung\s+lai|khong\s+gui\s+nua|thoi\s+dung\s+gui|huy\s+di)$/i.test(unaccented)
    );

    if (isCancellation) {
      if (pending) {
        pending.status = 'CANCELLED';
        if (sessionId) this.clearPendingAction(sessionId);
      }

      let cancelSubject = 'gửi báo giá';
      if (pending?.actionType === 'CREATE_ORDER') cancelSubject = 'tạo đơn hàng';
      else if (pending?.actionType === 'DISPATCH_SERVICE_SURVEY') cancelSubject = 'sắp xếp khảo sát';

      return {
        isCancellation: true,
        isApproval: false,
        pendingAction: pending,
        replyText: `Dạ vâng, em đã hủy lệnh ${cancelSubject} theo yêu cầu của bạn rồi ạ. Em giữ nguyên bản thông tin nháp trong hệ thống để bạn tiện tham khảo lại khi cần nhé!`
      };
    }

    // B. NHẬN DIỆN LỆNH ĐỒNG Ý / XÁC NHẬN ("Đồng ý", "Gửi đi", "Ok em", "Tiến hành đi")
    const isApproval = (
      /^(dong\s+y|ok|oke|duoc\s+day|gui\s+di|tien\s+hanh|xac\s+nhan|lam\s+di|chot\s+nhe|duyet|gui\s+cho\s+khach|trien\s+khai\s+di)$/i.test(unaccented) ||
      /(dong\s+y\s+gui|xac\s+nhan\s+gui|gui\s+luon\s+di|cu\s+gui\s+di)/i.test(unaccented)
    );

    if (isApproval && pending) {
      pending.status = 'CONFIRMED';
      if (sessionId) this.clearPendingAction(sessionId);

      let confirmReply = `Dạ em đã chính thức ghi nhận và gửi bảng báo giá đến khách hàng thành công rồi ạ! Em sẽ theo dõi phản hồi để cập nhật cho bạn ngay nhé.`;
      if (pending.actionType === 'CREATE_ORDER') {
        confirmReply = `Dạ đơn hàng đã được xác nhận thành công và chuyển sang bộ phận kho để chuẩn bị đóng gói giao hàng ạ!`;
      }

      return {
        isApproval: true,
        isCancellation: false,
        pendingAction: pending,
        replyText: confirmReply
      };
    }

    return {
      isApproval: false,
      isCancellation: false,
      pendingAction: pending,
      replyText: null
    };
  }

  /**
   * 4. Rào chắn Chặn Thao tác Tài chính Vượt quyền (Tier 3 Block)
   */
  static evaluateTier3Security(message = '', actionType = '') {
    const raw = (message || '').toLowerCase();
    const tier = this.evaluateActionTier(actionType, { rawMessage: message });

    if (tier === 3 || /(?:chuyển|chuyen).*(?:tiền|tien|khoản|khoan|cọc|coc)|(?:thanh\s+toán|thanh\s+toan)|(?:hoàn|hoan).*(?:tiền|tien)|(?:rút|rut)\s+(?:tiền|tien)/i.test(raw)) {
      return {
        blocked: true,
        tier: 3,
        replyText: `Dạ, thao tác này liên quan đến giao dịch thanh toán và tài chính trực tiếp. Hệ thống không thể tự động thực hiện giao dịch tài chính vì yêu cầu sự phê duyệt trực tiếp của con người (người có thẩm quyền). Em xin phép giữ nguyên trạng thái an toàn để bảo vệ tài khoản của bạn nhé!`
      };
    }

    return { blocked: false, tier };
  }
}

export default AutonomyApprovalEngine;
