/**
 * REMINDER SCHEDULER – BỘ LẬP LỊCH THÔNG BÁO CHẠY NGẦM BACKEND
 * (BOTCHAT BRAIN 2.1 – THƯ KÝ RIÊNG CỦA ANH)
 * 
 * Rules:
 * - Chạy ngầm 24/7 ở Server, không phụ thuộc trình duyệt hay client JS timer.
 * - Múi giờ Asia/Ho_Chi_Minh.
 * - Quét định kỳ mỗi 15 giây.
 * - Chống gửi thông báo trùng lặp (Idempotent: PENDING -> FIRED).
 * - Tự động tạo bản ghi trong `owner_notifications`.
 */

import { ReminderEngine } from './reminderEngine.js';
import { NotificationEngine } from './notificationEngine.js';
import { AuditLogService } from './auditLogService.js';

let schedulerInterval = null;
let isProcessing = false;

export class ReminderScheduler {
  /**
   * Khởi động scheduler
   */
  static start(intervalMs = 15000) {
    if (schedulerInterval) {
      console.log('[REMINDER SCHEDULER] Already running.');
      return;
    }

    console.log(`[REMINDER SCHEDULER] Starting background scheduler (interval: ${intervalMs}ms)...`);
    schedulerInterval = setInterval(async () => {
      await this.checkAndFireReminders();
    }, intervalMs);

    // Kích hoạt ngay lần đầu tiên
    this.checkAndFireReminders().catch(err => {
      console.error('[REMINDER SCHEDULER ERROR] Initial check error:', err.message);
    });
  }

  /**
   * Dừng scheduler (khi test hoặc restart)
   */
  static stop() {
    if (schedulerInterval) {
      clearInterval(schedulerInterval);
      schedulerInterval = null;
      console.log('[REMINDER SCHEDULER] Stopped.');
    }
  }

  /**
   * Quét và phát thông báo các lịch nhắc đến hạn
   */
  static async checkAndFireReminders() {
    if (isProcessing) return;
    isProcessing = true;

    try {
      const nowIso = new Date().toISOString();
      const dueReminders = await ReminderEngine.getPendingReminders(nowIso);

      if (dueReminders && dueReminders.length > 0) {
        console.log(`[REMINDER SCHEDULER] Found ${dueReminders.length} due reminders to fire.`);

        for (const rem of dueReminders) {
          try {
            // 1. Chuyển status = 'FIRED' trước để chống phát trùng (Idempotent)
            await ReminderEngine.markReminderFired(rem.reminder_id);

            // 2. Tạo thông báo trong owner_notifications
            const taskTitle = rem.task_title || 'Công việc đến hạn';
            const notifTitle = `⏰ Nhắc việc: ${taskTitle}`;
            const notifContent = rem.task_description || `Đã đến giờ thực hiện công việc "${taskTitle}". Hạn hoàn thành: ${rem.task_due_at ? new Date(rem.task_due_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Hôm nay'}.`;

            await NotificationEngine.createNotification({
              ownerId: rem.owner_id || 'owner_tri',
              taskId: rem.task_id,
              reminderId: rem.reminder_id,
              title: notifTitle,
              content: notifContent,
              remindAt: rem.remind_at,
              dueAt: rem.new_due_at || rem.remind_at,
              priority: rem.task_priority || 'NORMAL'
            });

            console.log(`[REMINDER SCHEDULER] Fired notification for task: "${taskTitle}" (ID: ${rem.task_id})`);
          } catch (itemErr) {
            console.error(`[REMINDER SCHEDULER ERROR] Failed to fire reminder ${rem.reminder_id}:`, itemErr.message);
          }
        }
      }
    } catch (err) {
      console.error('[REMINDER SCHEDULER ERROR] Scanning error:', err.message);
    } finally {
      isProcessing = false;
    }
  }
}

export default ReminderScheduler;
