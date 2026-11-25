/**
 * SMART SCHEDULER DAEMON – BỘ LẬP LỊCH CHẠY NGẦM 24/7 TOÀN DIỆN
 * (MASTER PROMPT 03: TRÍ AI PERSONAL ASSISTANT & SMART REMINDER)
 * 
 * Vận hành độc lập tại Server (Node.js background interval 15s):
 * 1. Quét và phát các thông báo lịch nhắc việc đến hạn (PENDING -> FIRED).
 * 2. Quét các chu kỳ lặp định kỳ (recurring_schedules) đến hạn, sinh nhắc việc mới và tính toán next_run_at.
 * 3. Đánh giá các quy tắc theo dõi có điều kiện (follow_up_rules) xem đã vượt thời hạn hay chưa.
 * 4. Tự động phát Bản tin đầu ngày (08:00) và Bản tin tổng kết cuối ngày (17:30) cho chủ tài khoản.
 * 5. Idempotent và an toàn trước crash/reboot.
 */

import { SmartReminderEngine } from './smartReminderEngine.js';
import { RecurringScheduleEngine } from './recurringScheduleEngine.js';
import { FollowUpEngine } from './followUpEngine.js';
import { DailyBriefingEngine } from './dailyBriefingEngine.js';
import { MultiChannelNotificationEngine } from './multiChannelNotificationEngine.js';
import { db } from '../../db.js';

let daemonInterval = null;
let isProcessing = false;
let lastMorningBriefingDate = null;
let lastEveningRecapDate = null;

export class SmartSchedulerDaemon {
  /**
   * Khởi động background daemon
   */
  static start(intervalMs = 15000) {
    if (daemonInterval) {
      console.log('[SMART SCHEDULER DAEMON] Already active.');
      return;
    }

    console.log(`[SMART SCHEDULER DAEMON] Starting 24/7 background daemon (Interval: ${intervalMs}ms)...`);
    daemonInterval = setInterval(async () => {
      await this.runCycle();
    }, intervalMs);

    // Kích hoạt ngay chu kỳ đầu tiên
    this.runCycle().catch(err => {
      console.error('[SMART SCHEDULER DAEMON] Initial cycle warning:', err.message);
    });
  }

  /**
   * Dừng background daemon
   */
  static stop() {
    if (daemonInterval) {
      clearInterval(daemonInterval);
      daemonInterval = null;
      console.log('[SMART SCHEDULER DAEMON] Daemon stopped.');
    }
  }

  /**
   * Thực hiện một chu kỳ quét toàn diện
   */
  static async runCycle() {
    if (isProcessing) return;
    isProcessing = true;

    try {
      const nowIso = new Date().toISOString();

      // 1. Quét và phát các lịch nhắc việc đến hạn
      await this._processPendingReminders(nowIso);

      // 2. Quét và xử lý các chu kỳ lặp định kỳ
      await this._processRecurringSchedules(nowIso);

      // 3. Đánh giá các quy tắc theo dõi có điều kiện
      await this._processFollowUpRules();

      // 4. Kiểm tra lịch kích hoạt Bản tin hàng ngày
      await this._checkDailyBriefings();

    } catch (cycleErr) {
      console.error('[SMART SCHEDULER DAEMON] Cycle error:', cycleErr.message);
    } finally {
      isProcessing = false;
    }
  }

  /**
   * 1. Xử lý các lịch nhắc việc PENDING đến hạn
   */
  static async _processPendingReminders(nowIso) {
    const pending = await SmartReminderEngine.getPendingReminders(nowIso);
    for (const reminder of pending) {
      try {
        console.log(`[SMART SCHEDULER DAEMON] Firing reminder ${reminder.reminderId}: ${reminder.taskTitle || 'Lịch nhắc việc'}`);
        await SmartReminderEngine.fireReminder(reminder);
      } catch (err) {
        console.error(`[SMART SCHEDULER DAEMON] Error firing reminder ${reminder.reminderId}:`, err.message);
      }
    }
  }

  /**
   * 2. Xử lý các chu kỳ lặp định kỳ đến hạn
   */
  static async _processRecurringSchedules(nowIso) {
    const dueSchedules = await RecurringScheduleEngine.getDueSchedules(nowIso);
    for (const schedule of dueSchedules) {
      try {
        console.log(`[SMART SCHEDULER DAEMON] Triggering recurring schedule ${schedule.scheduleId}: ${schedule.title}`);

        // Gửi thông báo nhắc việc định kỳ
        await MultiChannelNotificationEngine.sendNotification({
          userId: schedule.userId,
          title: `[Lịch Định Kỳ] ${schedule.title}`,
          content: `Anh Trí ơi, đã đến lịch định kỳ của anh: ${schedule.title}.`,
          priority: 'NORMAL',
          channels: ['IN_APP', 'PUSH']
        });

        // Cập nhật bước chạy tiếp theo
        await RecurringScheduleEngine.advanceSchedule(schedule.scheduleId);
      } catch (err) {
        console.error(`[SMART SCHEDULER DAEMON] Error processing schedule ${schedule.scheduleId}:`, err.message);
      }
    }
  }

  /**
   * 3. Đánh giá các quy tắc theo dõi có điều kiện
   */
  static async _processFollowUpRules() {
    try {
      const triggered = await FollowUpEngine.evaluateRules();
      if (triggered.length > 0) {
        console.log(`[SMART SCHEDULER DAEMON] Evaluated and triggered ${triggered.length} follow-up alerts.`);
      }
    } catch (err) {
      console.error('[SMART SCHEDULER DAEMON] Follow-up evaluation error:', err.message);
    }
  }

  /**
   * 4. Kiểm tra giờ phát Bản tin sáng (08:00) và Tối (17:30)
   */
  static async _checkDailyBriefings() {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const hour = now.getHours();
    const minute = now.getMinutes();

    // 08:00 AM Morning Briefing
    if (hour === 8 && minute < 15 && lastMorningBriefingDate !== todayStr) {
      lastMorningBriefingDate = todayStr;
      console.log(`[SMART SCHEDULER DAEMON] Triggering morning briefing for ${todayStr}...`);
      const briefing = await DailyBriefingEngine.generateMorningBriefing('owner_tri');
      await MultiChannelNotificationEngine.sendNotification({
        userId: 'owner_tri',
        title: '☀️ Bản tin công việc đầu ngày',
        content: briefing.content,
        priority: 'NORMAL',
        channels: ['IN_APP', 'PUSH']
      });
    }

    // 17:30 PM Evening Recap
    if (hour === 17 && minute >= 30 && minute < 45 && lastEveningRecapDate !== todayStr) {
      lastEveningRecapDate = todayStr;
      console.log(`[SMART SCHEDULER DAEMON] Triggering evening recap for ${todayStr}...`);
      const recap = await DailyBriefingEngine.generateEveningRecap('owner_tri');
      await MultiChannelNotificationEngine.sendNotification({
        userId: 'owner_tri',
        title: '🌙 Bản tin tổng kết công việc cuối ngày',
        content: recap.content,
        priority: 'NORMAL',
        channels: ['IN_APP', 'PUSH']
      });
    }
  }
}
