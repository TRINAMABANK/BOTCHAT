/**
 * SMART REMINDER ENGINE – BỘ MÁY QUẢN LÝ LỊCH NHẮC VIỆC THÔNG MINH
 * (MASTER PROMPT 03: TRÍ AI PERSONAL ASSISTANT)
 * 
 * Nâng cấp ReminderEngine sẵn có từ `server/services/secretary/reminderEngine.js`,
 * bổ sung:
 * - Nhắc trước sự kiện/công việc theo độ lệch tương đối (ví dụ: trước 15 phút, trước 1 tiếng, trước 1 ngày).
 * - Liên kết chu kỳ lặp định kỳ (schedule_id).
 * - Liên kết quy tắc theo dõi có điều kiện (condition_rule_id).
 * - Đa kênh thông báo khi phát cảnh báo (In-App, Push, Email, Telegram).
 */

import { ReminderEngine } from '../secretary/reminderEngine.js';
import { MultiChannelNotificationEngine } from './multiChannelNotificationEngine.js';
import { db } from '../../db.js';
import crypto from 'crypto';

export class SmartReminderEngine {
  /**
   * Tạo lịch nhắc thông minh
   */
  static async createReminder({
    taskId = null,
    ownerId = 'owner_tri',
    userId = 'owner_tri',
    remindAt,
    advanceMinutes = 0,
    baseTargetTime = null,
    scheduleId = null,
    conditionRuleId = null,
    channel = 'ALL',
    ipAddress = '127.0.0.1'
  }) {
    let finalRemindAt = remindAt;

    // Tính thời gian nhắc trước tương đối nếu có baseTargetTime và advanceMinutes
    if (baseTargetTime && advanceMinutes > 0) {
      const targetTime = new Date(baseTargetTime).getTime();
      const computedRemindTime = new Date(targetTime - advanceMinutes * 60 * 1000);
      finalRemindAt = computedRemindTime.toISOString();
    }

    if (!finalRemindAt) {
      throw new Error('Thời gian nhắc việc (remindAt) không được để trống.');
    }

    const reminderId = `rem_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const nowIso = new Date().toISOString();

    const initialHistory = JSON.stringify([
      {
        action: 'CREATED',
        remindAt: finalRemindAt,
        advanceMinutes,
        timestamp: nowIso
      }
    ]);

    await db.run(
      `INSERT INTO owner_reminders (
        reminder_id, task_id, owner_id, remind_at, acknowledged_at, acknowledged_by,
        status, previous_due_at, new_due_at, action_history, schedule_id, condition_rule_id,
        channel, created_at, updated_at
      ) VALUES (?, ?, ?, ?, NULL, NULL, 'PENDING', NULL, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reminderId,
        taskId,
        userId || ownerId,
        finalRemindAt,
        finalRemindAt,
        initialHistory,
        scheduleId,
        conditionRuleId,
        channel,
        nowIso,
        nowIso
      ]
    );

    return await this.getReminderById(reminderId, userId || ownerId);
  }

  /**
   * Lấy chi tiết lịch nhắc theo ID
   */
  static async getReminderById(reminderId, userId = 'owner_tri') {
    const row = await db.get(
      `SELECT r.*, t.title as task_title, t.due_at as task_due_at, t.priority as task_priority
       FROM owner_reminders r
       LEFT JOIN owner_tasks t ON r.task_id = t.task_id
       WHERE r.reminder_id = ? AND r.owner_id = ?`,
      [reminderId, userId]
    );
    if (!row) return null;
    return SmartReminderEngine._formatReminderRow(row);
  }

  /**
   * Dời lịch nhắc việc
   */
  static async rescheduleReminder({
    reminderId,
    newRemindAt,
    ownerId = 'owner_tri',
    ipAddress = '127.0.0.1'
  }) {
    return await ReminderEngine.rescheduleReminder({
      reminderId,
      newRemindAt,
      ownerId,
      ipAddress
    });
  }

  /**
   * Xác nhận đã xem lịch nhắc (Acknowledge / Snooze)
   */
  static async acknowledgeReminder({
    reminderId,
    ownerId = 'owner_tri',
    ipAddress = '127.0.0.1'
  }) {
    return await ReminderEngine.acknowledgeReminder({
      reminderId,
      ownerId,
      ipAddress
    });
  }

  /**
   * Hủy lịch nhắc
   */
  static async cancelReminder({
    reminderId,
    ownerId = 'owner_tri',
    ipAddress = '127.0.0.1'
  }) {
    return await ReminderEngine.cancelReminder({
      reminderId,
      ownerId,
      ipAddress
    });
  }

  /**
   * Lấy danh sách lịch nhắc chờ kích hoạt
   */
  static async getPendingReminders(beforeIso = new Date().toISOString()) {
    const rows = await db.all(
      `SELECT r.*, t.title as task_title, t.due_at as task_due_at, t.priority as task_priority
       FROM owner_reminders r
       LEFT JOIN owner_tasks t ON r.task_id = t.task_id
       WHERE r.status = 'PENDING' AND r.remind_at <= ?
       ORDER BY r.remind_at ASC`,
      [beforeIso]
    );
    return rows.map(r => SmartReminderEngine._formatReminderRow(r));
  }

  static _formatReminderRow(row) {
    if (!row) return null;
    return {
      reminderId: row.reminder_id,
      taskId: row.task_id,
      taskTitle: row.task_title || row.title,
      ownerId: row.owner_id,
      remindAt: row.remind_at,
      status: row.status,
      createdAt: row.created_at,
      taskDueAt: row.task_due_at,
      taskPriority: row.task_priority
    };
  }

  /**
   * Phát thông báo đa kênh khi lịch nhắc đến hạn
   */
  static async fireReminder(reminder) {
    const nowIso = new Date().toISOString();

    // 1. Chuyển trạng thái sang FIRED (Idempotent)
    await ReminderEngine.markReminderFired(reminder.reminderId, nowIso);

    // 2. Gửi thông báo đa kênh
    const title = reminder.taskTitle ? `[Nhắc việc] ${reminder.taskTitle}` : `[Nhắc việc] Lịch hẹn đến giờ`;
    const content = `Anh Trí ơi, đã đến giờ thực hiện: ${reminder.taskTitle || 'công việc của anh'}.`;

    const channels = ['IN_APP', 'PUSH'];
    if (reminder.taskPriority === 'URGENT' || reminder.taskPriority === 'HIGH') {
      channels.push('TELEGRAM');
    }

    await MultiChannelNotificationEngine.sendNotification({
      userId: reminder.ownerId || 'owner_tri',
      taskId: reminder.taskId,
      reminderId: reminder.reminderId,
      title,
      content,
      priority: reminder.taskPriority || 'NORMAL',
      channels
    });

    return { reminderId: reminder.reminderId, firedAt: nowIso };
  }
}
