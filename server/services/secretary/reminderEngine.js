/**
 * REMINDER ENGINE – BỘ MÁY QUẢN LÝ LỊCH NHẮC VIỆC
 * (BOTCHAT BRAIN 2.1 – THƯ KÝ RIÊNG CỦA ANH)
 * 
 * Fields:
 * - reminder_id, task_id, owner_id, remind_at, acknowledged_at, acknowledged_by,
 *   status, previous_due_at, new_due_at, action_history, created_at, updated_at
 * 
 * Statuses:
 * - PENDING: Chờ đến giờ nhắc
 * - FIRED: Đã phát thông báo nhắc
 * - ACKNOWLEDGED: Chủ nhân đã xác nhận
 * - RESCHEDULED: Đã dời lịch
 * - CANCELLED: Đã hủy
 */

import { db } from '../../db.js';
import crypto from 'crypto';
import { AuditLogService } from './auditLogService.js';

export class ReminderEngine {
  /**
   * Tạo lịch nhắc mới
   */
  static async createReminder({
    taskId,
    ownerId = 'owner_tri',
    remindAt,
    previousDueAt = null,
    ipAddress = '127.0.0.1'
  }) {
    if (!taskId || !remindAt) {
      throw new Error('Thiếu taskId hoặc thời điểm remindAt.');
    }

    const reminderId = `rem_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const nowIso = new Date().toISOString();

    const initialHistory = JSON.stringify([
      {
        action: 'CREATED',
        remindAt,
        previousDueAt,
        timestamp: nowIso
      }
    ]);

    await db.run(
      `INSERT INTO owner_reminders (reminder_id, task_id, owner_id, remind_at, acknowledged_at, acknowledged_by, status, previous_due_at, new_due_at, action_history, created_at, updated_at)
       VALUES (?, ?, ?, ?, NULL, NULL, 'PENDING', ?, ?, ?, ?, ?)`,
      [
        reminderId,
        taskId,
        ownerId,
        remindAt,
        previousDueAt,
        remindAt,
        initialHistory,
        nowIso,
        nowIso
      ]
    );

    await AuditLogService.logAction({
      ownerId,
      actionType: 'CREATE_REMINDER',
      targetType: 'REMINDER',
      targetId: reminderId,
      details: { taskId, remindAt, previousDueAt },
      ipAddress
    });

    return await this.getReminderById(reminderId, ownerId);
  }

  /**
   * Lấy chi tiết lịch nhắc theo ID
   */
  static async getReminderById(reminderId, ownerId = 'owner_tri') {
    return await db.get(
      `SELECT r.*, t.title as task_title, t.priority as task_priority, t.status as task_status
       FROM owner_reminders r
       LEFT JOIN owner_tasks t ON r.task_id = t.task_id
       WHERE r.reminder_id = ? AND r.owner_id = ?`,
      [reminderId, ownerId]
    );
  }

  /**
   * Lấy lịch nhắc đang chờ gần nhất của một công việc
   */
  static async getActiveReminderForTask(taskId, ownerId = 'owner_tri') {
    return await db.get(
      `SELECT * FROM owner_reminders
       WHERE task_id = ? AND owner_id = ? AND status IN ('PENDING', 'FIRED')
       ORDER BY updated_at DESC LIMIT 1`,
      [taskId, ownerId]
    );
  }

  /**
   * Dời lịch nhắc công việc (Reschedule Reminder)
   * Không tạo công việc trùng lặp, lưu lịch sử cũ và mới
   */
  static async rescheduleReminder({
    reminderId = null,
    taskId = null,
    newRemindAt,
    ownerId = 'owner_tri',
    ipAddress = '127.0.0.1'
  }) {
    if (!newRemindAt) {
      throw new Error('Thời gian nhắc mới không được để trống.');
    }

    let existing = null;
    if (reminderId) {
      existing = await this.getReminderById(reminderId, ownerId);
    } else if (taskId) {
      existing = await this.getActiveReminderForTask(taskId, ownerId);
    }

    const nowIso = new Date().toISOString();

    if (!existing) {
      // Nếu chưa có reminder thì tạo mới cho task
      if (!taskId) {
        throw new Error('Không tìm thấy lịch nhắc hoặc mã công việc để dời lịch.');
      }
      return await this.createReminder({
        taskId,
        ownerId,
        remindAt: newRemindAt,
        ipAddress
      });
    }

    // Đọc lịch sử cũ
    let history = [];
    try {
      history = JSON.parse(existing.action_history || '[]');
    } catch (_) {
      history = [];
    }

    history.push({
      action: 'RESCHEDULED',
      oldRemindAt: existing.remind_at,
      newRemindAt,
      timestamp: nowIso
    });

    await db.run(
      `UPDATE owner_reminders
       SET remind_at = ?, previous_due_at = ?, new_due_at = ?, status = 'PENDING', action_history = ?, updated_at = ?
       WHERE reminder_id = ? AND owner_id = ?`,
      [
        newRemindAt,
        existing.remind_at,
        newRemindAt,
        JSON.stringify(history),
        nowIso,
        existing.reminder_id,
        ownerId
      ]
    );

    // Cập nhật due_at của công việc tương ứng
    await db.run(
      `UPDATE owner_tasks SET due_at = ?, updated_at = ? WHERE task_id = ? AND owner_id = ?`,
      [newRemindAt, nowIso, existing.task_id, ownerId]
    );

    await AuditLogService.logAction({
      ownerId,
      actionType: 'RESCHEDULE_REMINDER',
      targetType: 'REMINDER',
      targetId: existing.reminder_id,
      details: {
        taskId: existing.task_id,
        oldRemindAt: existing.remind_at,
        newRemindAt
      },
      ipAddress
    });

    return await this.getReminderById(existing.reminder_id, ownerId);
  }

  /**
   * Lấy danh sách lịch nhắc đến hạn cần phát thông báo (dành cho Backend Scheduler)
   */
  static async getPendingReminders(dueBeforeIso) {
    return await db.all(
      `SELECT r.*, t.title as task_title, t.priority as task_priority, t.description as task_description
       FROM owner_reminders r
       JOIN owner_tasks t ON r.task_id = t.task_id
       WHERE r.status = 'PENDING'
         AND r.remind_at <= ?
         AND t.status IN ('PENDING', 'IN_PROGRESS', 'WAITING')
       ORDER BY r.remind_at ASC`,
      [dueBeforeIso]
    );
  }

  /**
   * Đánh dấu reminder đã được phát thông báo (FIRED) để chống gửi trùng lặp
   */
  static async markReminderFired(reminderId) {
    const nowIso = new Date().toISOString();
    await db.run(
      `UPDATE owner_reminders
       SET status = 'FIRED', updated_at = ?
       WHERE reminder_id = ?`,
      [nowIso, reminderId]
    );
  }
}

export default ReminderEngine;
