/**
 * NOTIFICATION ENGINE – BỘ MÁY QUẢN LÝ THÔNG BÁO NHẮC VIỆC
 * (BOTCHAT BRAIN 2.1 – THƯ KÝ RIÊNG CỦA ANH)
 * 
 * Fields:
 * - notification_id, owner_id, task_id, reminder_id, title, content,
 *   remind_at, due_at, priority, status, is_read, read_at, created_at
 * 
 * Rules:
 * - Đã xem = is_read: 1, read_at: timestamp (Ẩn khỏi unread, KHÔNG xóa công việc, KHÔNG hoàn thành công việc).
 * - Nhắc lại = Mở ô chat với ngữ cảnh công việc để dời lịch.
 */

import { db } from '../../db.js';
import crypto from 'crypto';
import { AuditLogService } from './auditLogService.js';

export class NotificationEngine {
  /**
   * Tạo thông báo mới khi lịch nhắc đến hạn
   */
  static async createNotification({
    ownerId = 'owner_tri',
    taskId = null,
    reminderId = null,
    title,
    content,
    remindAt = null,
    dueAt = null,
    priority = 'NORMAL'
  }) {
    if (!title || !content) {
      throw new Error('Tiêu đề và nội dung thông báo không được để trống.');
    }

    const notificationId = `notif_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const nowIso = new Date().toISOString();

    await db.run(
      `INSERT INTO owner_notifications (notification_id, owner_id, task_id, reminder_id, title, content, remind_at, due_at, priority, status, is_read, read_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 0, NULL, ?)`,
      [
        notificationId,
        ownerId,
        taskId,
        reminderId,
        title.trim(),
        content.trim(),
        remindAt || nowIso,
        dueAt,
        priority,
        nowIso
      ]
    );

    await AuditLogService.logAction({
      ownerId,
      actionType: 'CREATE_NOTIFICATION',
      targetType: 'NOTIFICATION',
      targetId: notificationId,
      details: { taskId, reminderId, title }
    });

    return await this.getNotificationById(notificationId, ownerId);
  }

  /**
   * Lấy chi tiết thông báo theo ID
   */
  static async getNotificationById(notificationId, ownerId = 'owner_tri') {
    return await db.get(
      `SELECT n.*, t.status as task_status, t.description as task_description
       FROM owner_notifications n
       LEFT JOIN owner_tasks t ON n.task_id = t.task_id
       WHERE n.notification_id = ? AND n.owner_id = ?`,
      [notificationId, ownerId]
    );
  }

  /**
   * Lấy số lượng thông báo chưa xem để hiển thị Badge trên nút "Nhắc việc"
   */
  static async getUnreadCount(ownerId = 'owner_tri') {
    const row = await db.get(
      `SELECT COUNT(*) as count FROM owner_notifications WHERE owner_id = ? AND is_read = 0`,
      [ownerId]
    );
    return row ? row.count : 0;
  }

  /**
   * Lấy danh sách thông báo chưa xem (Unread)
   */
  static async getUnreadNotifications(ownerId = 'owner_tri') {
    return await db.all(
      `SELECT n.*, t.status as task_status, t.description as task_description
       FROM owner_notifications n
       LEFT JOIN owner_tasks t ON n.task_id = t.task_id
       WHERE n.owner_id = ? AND n.is_read = 0
       ORDER BY n.created_at DESC`,
      [ownerId]
    );
  }

  /**
   * Lấy toàn bộ danh sách thông báo (đã xem và chưa xem)
   */
  static async getAllNotifications(ownerId = 'owner_tri', limit = 30) {
    return await db.all(
      `SELECT n.*, t.status as task_status, t.description as task_description
       FROM owner_notifications n
       LEFT JOIN owner_tasks t ON n.task_id = t.task_id
       WHERE n.owner_id = ?
       ORDER BY n.created_at DESC LIMIT ?`,
      [ownerId, limit]
    );
  }

  /**
   * Đánh dấu "ĐÃ XEM"
   * TUYỆT ĐỐI:
   * - Ẩn thông báo khỏi danh sách chưa xem.
   * - Ghi nhận thời điểm đã xem.
   * - Lưu lịch sử thao tác.
   * - KHÔNG đánh dấu công việc hoàn thành.
   * - KHÔNG xóa công việc.
   * - KHÔNG xóa lịch sử nhắc việc.
   */
  static async markAsRead(notificationId, ownerId = 'owner_tri', ipAddress = '127.0.0.1') {
    const existing = await this.getNotificationById(notificationId, ownerId);
    if (!existing) {
      throw new Error(`Không tìm thấy thông báo với ID: ${notificationId}`);
    }

    const nowIso = new Date().toISOString();
    await db.run(
      `UPDATE owner_notifications
       SET is_read = 1, read_at = ?, status = 'READ'
       WHERE notification_id = ? AND owner_id = ?`,
      [nowIso, notificationId, ownerId]
    );

    await AuditLogService.logAction({
      ownerId,
      actionType: 'READ_NOTIFICATION',
      targetType: 'NOTIFICATION',
      targetId: notificationId,
      details: { title: existing.title, readAt: nowIso },
      ipAddress
    });

    const unreadCount = await this.getUnreadCount(ownerId);
    return {
      success: true,
      notificationId,
      readAt: nowIso,
      unreadCount
    };
  }
}

export default NotificationEngine;
