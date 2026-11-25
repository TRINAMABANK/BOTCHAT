/**
 * FOLLOW UP ENGINE – BỘ MÁY THEO DÕI CÓ ĐIỀU KIỆN THÔNG MINH
 * (MASTER PROMPT 03: TRÍ AI PERSONAL ASSISTANT)
 * 
 * Supports:
 * 1. SUPPLIER_PO_UNCONFIRMED: Đơn hàng / PO nhà cung cấp chưa xác nhận sau X ngày/giờ.
 * 2. QUOTATION_PENDING: Báo giá đã gửi khách nhưng chưa phản hồi.
 * 3. TASK_STAGNANT: Công việc quan trọng bị trì trệ không có cập nhật.
 * 4. CUSTOM: Điều kiện tùy biến.
 */

import { db } from '../../db.js';
import crypto from 'crypto';

export class FollowUpEngine {
  /**
   * Tạo quy tắc theo dõi có điều kiện mới
   */
  static async createFollowUpRule({
    userId = 'owner_tri',
    tenantId = 'default',
    conditionType, // 'SUPPLIER_PO_UNCONFIRMED', 'QUOTATION_PENDING', 'TASK_STAGNANT', 'CUSTOM'
    targetRef,     // PO Code, Quotation ID, Task ID, Customer Phone
    checkIntervalHours = 24,
    maxWaitHours = 72,
    triggerCondition = {},
    actionType = 'CREATE_REMINDER' // 'CREATE_REMINDER', 'ESCALATE_OWNER', 'NOTIFY_CHANNEL'
  }) {
    if (!conditionType || !targetRef) {
      throw new Error('Thiếu conditionType hoặc targetRef để thiết lập theo dõi.');
    }

    const ruleId = `fol_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const nowIso = new Date().toISOString();

    await db.run(
      `INSERT INTO follow_up_rules (
        rule_id, user_id, tenant_id, condition_type, target_ref,
        check_interval_hours, max_wait_hours, trigger_condition, action_type,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)`,
      [
        ruleId,
        userId,
        tenantId,
        conditionType,
        targetRef,
        checkIntervalHours,
        maxWaitHours,
        JSON.stringify(triggerCondition || {}),
        actionType,
        nowIso,
        nowIso
      ]
    );

    return await this.getRuleById(ruleId, userId);
  }

  /**
   * Lấy chi tiết quy tắc theo ID
   */
  static async getRuleById(ruleId, userId = 'owner_tri') {
    const row = await db.get(
      `SELECT * FROM follow_up_rules WHERE rule_id = ? AND user_id = ?`,
      [ruleId, userId]
    );
    if (!row) return null;
    return this._formatRow(row);
  }

  /**
   * Lấy tất cả các quy tắc đang hoạt động
   */
  static async getActiveRules({ userId = 'owner_tri' } = {}) {
    let sql = `SELECT * FROM follow_up_rules WHERE status = 'ACTIVE'`;
    const params = [];
    if (userId) {
      sql += ` AND user_id = ?`;
      params.push(userId);
    }
    const rows = await db.all(sql, params);
    return rows.map(r => this._formatRow(r));
  }

  /**
   * Đánh giá và kiểm tra trạng thái các quy tắc theo dõi
   */
  static async evaluateRules() {
    const activeRules = await this.getActiveRules({ userId: null });
    const triggered = [];
    const now = Date.now();

    for (const rule of activeRules) {
      const createdTime = new Date(rule.createdAt).getTime();
      const elapsedHours = (now - createdTime) / (1000 * 60 * 60);

      // Nếu đã vượt quá max_wait_hours
      if (elapsedHours >= rule.maxWaitHours) {
        const isConditionMet = await this._checkCondition(rule);
        if (isConditionMet) {
          await this.triggerRule(rule.ruleId, {
            reason: `Vượt quá thời hạn ${rule.maxWaitHours} giờ mà điều kiện vẫn chưa được hoàn thành.`,
            elapsedHours
          });
          triggered.push({ rule, status: 'TRIGGERED' });
        } else {
          // Điều kiện đã được đáp ứng bên ngoài -> Đóng quy tắc (EXPIRED)
          await db.run(
            `UPDATE follow_up_rules SET status = 'EXPIRED', updated_at = ? WHERE rule_id = ?`,
            [new Date().toISOString(), rule.ruleId]
          );
        }
      }
    }

    return triggered;
  }

  /**
   * Kiểm tra điều kiện thực tế
   */
  static async _checkCondition(rule) {
    // 1. Kiểm tra PO nhà cung cấp chưa xác nhận
    if (rule.conditionType === 'SUPPLIER_PO_UNCONFIRMED') {
      // Giả sử kiểm tra bảng leads hoặc crm_leads hoặc task có target_ref
      const lead = await db.get(
        `SELECT * FROM leads WHERE (phone = ? OR customer_name LIKE ?) LIMIT 1`,
        [rule.targetRef, `%${rule.targetRef}%`]
      );
      if (lead) {
        // Nếu lead chưa chuyển sang trạng thái CONFIRMED hoặc COMPLETED
        return !['CONFIRMED', 'COMPLETED', 'DEAL_WON'].includes(lead.status);
      }
      return true; // Mặc định kích hoạt cảnh báo nếu chưa tìm thấy xác nhận
    }

    // 2. Kiểm tra Báo giá chưa phản hồi
    if (rule.conditionType === 'QUOTATION_PENDING') {
      const task = await db.get(
        `SELECT * FROM owner_tasks WHERE task_id = ? OR title LIKE ? LIMIT 1`,
        [rule.targetRef, `%${rule.targetRef}%`]
      );
      if (task) {
        return task.status !== 'COMPLETED';
      }
      return true;
    }

    // 3. Mặc định kích hoạt nếu quá hạn
    return true;
  }

  /**
   * Kích hoạt hành động khi điều kiện thỏa mãn
   */
  static async triggerRule(ruleId, details = {}) {
    const nowIso = new Date().toISOString();
    await db.run(
      `UPDATE follow_up_rules SET status = 'TRIGGERED', updated_at = ? WHERE rule_id = ?`,
      [nowIso, ruleId]
    );

    const rule = await db.get(`SELECT * FROM follow_up_rules WHERE rule_id = ?`, [ruleId]);
    if (!rule) return null;

    // Tự động tạo nhắc việc khẩn cấp cho chủ sở hữu
    const alertTitle = `[Theo Dõi Cần Chú Ý] ${rule.condition_type} - ${rule.target_ref}`;
    const alertContent = details.reason || `Đã đến hạn theo dõi mà đối tác/công việc (${rule.target_ref}) chưa có xác nhận.`;

    // Nhập vào owner_notifications để hiển thị ngay
    const notifId = `notif_fol_${Date.now()}`;
    await db.run(
      `INSERT INTO owner_notifications (
        notification_id, owner_id, task_id, reminder_id, title, content,
        remind_at, due_at, priority, status, is_read, read_at, created_at
      ) VALUES (?, ?, NULL, NULL, ?, ?, ?, NULL, 'HIGH', 'ACTIVE', 0, NULL, ?)`,
      [notifId, rule.user_id, alertTitle, alertContent, nowIso, nowIso]
    );

    return { ruleId, triggered: true, notifId };
  }

  /**
   * Hủy quy tắc theo dõi
   */
  static async cancelRule(ruleId, userId = 'owner_tri') {
    await db.run(
      `UPDATE follow_up_rules SET status = 'CANCELLED', updated_at = ? WHERE rule_id = ? AND user_id = ?`,
      [new Date().toISOString(), ruleId, userId]
    );
    return true;
  }

  static _formatRow(row) {
    let triggerCondition = {};
    try {
      if (row.trigger_condition) triggerCondition = JSON.parse(row.trigger_condition);
    } catch (e) {}

    return {
      ruleId: row.rule_id,
      userId: row.user_id,
      tenantId: row.tenant_id,
      conditionType: row.condition_type,
      targetRef: row.target_ref,
      checkIntervalHours: row.check_interval_hours,
      maxWaitHours: row.max_wait_hours,
      triggerCondition,
      actionType: row.action_type,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
