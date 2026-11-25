/**
 * DAILY BRIEFING ENGINE – BỘ MÁY TỔNG HỢP VÀ BÁO CÁO CÔNG VIỆC HÀNG NGÀY
 * (MASTER PROMPT 03: TRÍ AI PERSONAL ASSISTANT)
 * 
 * Supports:
 * 1. Morning Briefing (Bản tin đầu ngày lúc 8:00):
 *    - Các cuộc họp / sự kiện trong ngày.
 *    - Công việc đến hạn hôm nay và công việc quan trọng.
 *    - Cảnh báo các công việc quá hạn cần giải quyết ngay.
 *    - Các trường hợp theo dõi (follow-up) cần chú ý.
 * 2. Evening Recap (Bản tin tổng kết cuối ngày lúc 17:30):
 *    - Các công việc đã hoàn thành trong ngày.
 *    - Các việc còn tồn đọng cần dời lịch.
 *    - Xem trước lịch trình ngày mai.
 */

import { db } from '../../db.js';
import { CalendarEngine } from './calendarEngine.js';

export class DailyBriefingEngine {
  /**
   * Tạo bản tin chào buổi sáng (Morning Briefing)
   */
  static async generateMorningBriefing(userId = 'owner_tri', targetDate = new Date()) {
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const startIso = startOfDay.toISOString();
    const endIso = endOfDay.toISOString();

    // 1. Lấy sự kiện trong ngày
    const eventsToday = await CalendarEngine.getEvents({
      userId,
      startDate: startIso,
      endDate: endIso
    });

    // 2. Lấy công việc đến hạn hôm nay
    const tasksDueToday = await db.all(
      `SELECT * FROM owner_tasks 
       WHERE owner_id = ? AND status NOT IN ('COMPLETED', 'CANCELLED')
         AND due_at >= ? AND due_at <= ?
       ORDER BY priority DESC, due_at ASC`,
      [userId, startIso, endIso]
    );

    // 3. Lấy công việc quá hạn
    const overdueTasks = await db.all(
      `SELECT * FROM owner_tasks 
       WHERE owner_id = ? AND status NOT IN ('COMPLETED', 'CANCELLED')
         AND due_at < ?
       ORDER BY due_at ASC LIMIT 5`,
      [userId, startIso]
    );

    // 4. Lấy quy tắc theo dõi đang kích hoạt
    const activeFollowUps = await db.all(
      `SELECT * FROM follow_up_rules 
       WHERE user_id = ? AND status = 'ACTIVE' LIMIT 5`,
      [userId]
    );

    // Tổng hợp văn bản Markdown tiếng Việt
    const dateFormatted = startOfDay.toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    let message = `☀️ **BẢN TIN CÔNG VIỆC ĐẦU NGÀY (${dateFormatted})**\n\n`;
    message += `Dạ em chào anh Trí! Em xin gửi anh lịch trình và các đầu việc cần lưu ý hôm nay:\n\n`;

    if (eventsToday.length > 0) {
      message += `📅 **Lịch hẹn & Cuộc họp hôm nay (${eventsToday.length}):**\n`;
      eventsToday.forEach((e, idx) => {
        const timeStr = new Date(e.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        message += `  ${idx + 1}. **${timeStr}**: ${e.title}${e.location ? ` (Địa điểm: ${e.location})` : ''}\n`;
      });
      message += `\n`;
    } else {
      message += `📅 Hôm nay anh không có cuộc hẹn cố định nào trên lịch.\n\n`;
    }

    if (tasksDueToday.length > 0) {
      message += `🎯 **Công việc đến hạn hôm nay (${tasksDueToday.length}):**\n`;
      tasksDueToday.forEach((t, idx) => {
        message += `  ${idx + 1}. [${t.priority}] ${t.title}\n`;
      });
      message += `\n`;
    }

    if (overdueTasks.length > 0) {
      message += `⚠️ **Cảnh báo công việc quá hạn cần xử lý (${overdueTasks.length}):**\n`;
      overdueTasks.forEach((t, idx) => {
        message += `  - ${t.title} (Hạn chót: ${new Date(t.due_at).toLocaleDateString('vi-VN')})\n`;
      });
      message += `\n`;
    }

    if (activeFollowUps.length > 0) {
      message += `🔍 **Đang theo dõi tự động (${activeFollowUps.length}):**\n`;
      activeFollowUps.forEach((f, idx) => {
        message += `  - ${f.condition_type}: Đối tượng ${f.target_ref}\n`;
      });
      message += `\n`;
    }

    message += `Chúc anh một ngày làm việc tràn đầy năng lượng và hiệu quả ạ! ✨`;

    return {
      type: 'MORNING_BRIEFING',
      date: startOfDay.toISOString(),
      eventsCount: eventsToday.length,
      tasksCount: tasksDueToday.length,
      overdueCount: overdueTasks.length,
      followUpsCount: activeFollowUps.length,
      content: message
    };
  }

  /**
   * Tạo bản tin tổng kết cuối ngày (Evening Recap)
   */
  static async generateEveningRecap(userId = 'owner_tri', targetDate = new Date()) {
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const startIso = startOfDay.toISOString();
    const endIso = endOfDay.toISOString();

    // Công việc đã hoàn thành hôm nay
    const completedTasks = await db.all(
      `SELECT * FROM owner_tasks 
       WHERE owner_id = ? AND status = 'COMPLETED'
         AND updated_at >= ? AND updated_at <= ?`,
      [userId, startIso, endIso]
    );

    // Công việc còn tồn đọng chưa hoàn thành
    const pendingTasks = await db.all(
      `SELECT * FROM owner_tasks 
       WHERE owner_id = ? AND status IN ('PENDING', 'IN_PROGRESS', 'WAITING')
       ORDER BY priority DESC LIMIT 5`,
      [userId]
    );

    // Xem trước lịch ngày mai
    const tomorrow = new Date(targetDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startOfTomorrow = new Date(tomorrow);
    startOfTomorrow.setHours(0, 0, 0, 0);
    const endOfTomorrow = new Date(tomorrow);
    endOfTomorrow.setHours(23, 59, 59, 999);

    const tomorrowEvents = await CalendarEngine.getEvents({
      userId,
      startDate: startOfTomorrow.toISOString(),
      endDate: endOfTomorrow.toISOString()
    });

    let message = `🌙 **TỔNG KẾT CÔNG VIỆC CUỐI NGÀY**\n\n`;
    message += `Dạ em chào anh Trí! Em xin gửi anh bản tổng hợp kết quả công việc hôm nay:\n\n`;

    if (completedTasks.length > 0) {
      message += `✅ **Công việc đã hoàn thành (${completedTasks.length}):**\n`;
      completedTasks.forEach((t, idx) => {
        message += `  ${idx + 1}. ${t.title}\n`;
      });
      message += `\n`;
    } else {
      message += `ℹ️ Hôm nay chưa có công việc nào được đánh dấu hoàn thành.\n\n`;
    }

    if (pendingTasks.length > 0) {
      message += `⏳ **Đầu việc cần tiếp tục theo dõi (${pendingTasks.length}):**\n`;
      pendingTasks.forEach((t, idx) => {
        message += `  - [${t.priority}] ${t.title}\n`;
      });
      message += `\n`;
    }

    if (tomorrowEvents.length > 0) {
      message += `🔮 **Lịch trình ngày mai (${tomorrowEvents.length} cuộc hẹn):**\n`;
      tomorrowEvents.forEach((e, idx) => {
        const timeStr = new Date(e.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        message += `  ${idx + 1}. **${timeStr}**: ${e.title}\n`;
      });
      message += `\n`;
    }

    message += `Anh nghỉ ngơi tối thật ngon giấc nhé ạ! 🌟`;

    return {
      type: 'EVENING_RECAP',
      date: startOfDay.toISOString(),
      completedCount: completedTasks.length,
      pendingCount: pendingTasks.length,
      tomorrowEventsCount: tomorrowEvents.length,
      content: message
    };
  }
}
