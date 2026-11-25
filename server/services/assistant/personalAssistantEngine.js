/**
 * PERSONAL ASSISTANT ENGINE – BỘ NÃO ĐIỀU PHỐI TRỢ LÝ THƯ KÝ THÔNG MINH
 * (MASTER PROMPT 03: TRÍ AI PERSONAL ASSISTANT & SMART REMINDER)
 * 
 * Triết lý: ONE BRAIN – MANY CAPABILITIES – ONE ROBOT
 * 
 * Vai trò:
 * - Tiếp nhận mọi câu lệnh tự nhiên của chủ tài khoản tại một ô chat duy nhất.
 * - Phân loại ý định, trích xuất thời gian, chu kỳ lặp, điều kiện nghiệp vụ.
 * - Điều phối tới các engine chuyên trách (Calendar, Task, Reminder, Recurring, FollowUp, Briefing, Scheduler).
 * - Phản hồi tự nhiên, chuẩn mực, lịch sự, đúng phong thái thư ký riêng.
 */

import { TaskManagementEngine } from './taskManagementEngine.js';
import { SmartReminderEngine } from './smartReminderEngine.js';
import { CalendarEngine } from './calendarEngine.js';
import { RecurringScheduleEngine } from './recurringScheduleEngine.js';
import { FollowUpEngine } from './followUpEngine.js';
import { DailyBriefingEngine } from './dailyBriefingEngine.js';
import { SmartSchedulerEngine } from './smartSchedulerEngine.js';
import { PriorityEngine } from './priorityEngine.js';

export class PersonalAssistantEngine {
  /**
   * Xử lý tin nhắn người dùng dành cho Trợ lý / Thư ký riêng
   */
  static async handleMessage({
    userId = 'owner_tri',
    tenantId = 'default',
    text = '',
    role = 'OWNER',
    ipAddress = '127.0.0.1'
  }) {
    if (!text || !text.trim()) {
      return { handled: false };
    }

    const cleanText = text.trim();
    const lower = cleanText.toLowerCase();

    // 1. Kích hoạt chế độ thư ký riêng
    if (this.isActivationPhrase(lower)) {
      return {
        handled: true,
        action: 'ACTIVATE_SECRETARY',
        message: 'Dạ, em đây anh Trí! Từ bây giờ em sẽ hỗ trợ anh quản lý công việc, ghi nhớ thông tin, lập lịch nhắc và theo dõi tiến độ. Anh cứ giao việc trực tiếp trong ô chat này nhé.'
      };
    }

    // 2. Yêu cầu Bản tin / Tổng kết ngày
    if (lower.includes('bản tin') || lower.includes('tóm tắt công việc') || lower.includes('đầu ngày') || lower.includes('sáng nay có việc gì')) {
      const briefing = await DailyBriefingEngine.generateMorningBriefing(userId);
      return {
        handled: true,
        action: 'DAILY_BRIEFING',
        data: briefing,
        message: briefing.content
      };
    }

    if (lower.includes('tổng kết ngày') || lower.includes('cuối ngày') || lower.includes('hôm nay xong việc gì')) {
      const recap = await DailyBriefingEngine.generateEveningRecap(userId);
      return {
        handled: true,
        action: 'EVENING_RECAP',
        data: recap,
        message: recap.content
      };
    }

    // 3. Yêu cầu thiết lập theo dõi có điều kiện (Conditional Follow-Up)
    // Ví dụ: "Nhắc tôi sau 3 ngày nếu nhà cung cấp chưa xác nhận"
    if (lower.includes('nếu nhà cung cấp chưa') || lower.includes('nếu chưa xác nhận') || (lower.includes('nếu') && lower.includes('chưa'))) {
      return await this._handleConditionalFollowUp({ userId, cleanText, lower });
    }

    // 4. Nhắc việc định kỳ / Lặp lại
    // Ví dụ: "Thứ Hai hằng tuần lúc 9 giờ nhắc tôi kiểm tra PO", "Cuối tháng nhắc tôi tổng hợp báo cáo"
    const recurrenceRule = RecurringScheduleEngine.parseRecurrenceFromText(cleanText);
    if (recurrenceRule) {
      return await this._handleRecurringReminder({ userId, cleanText, recurrenceRule });
    }

    // 5. Tra cứu Lịch trình / Cuộc hẹn
    if (lower.includes('lịch hẹn') || lower.includes('lịch họp') || lower.includes('lịch trình')) {
      return await this._handleCalendarQuery({ userId, lower });
    }

    // 6. Gợi ý giờ rảnh / Xếp lịch thông minh
    if (lower.includes('giờ rảnh') || lower.includes('khung giờ trống') || lower.includes('khi nào rảnh')) {
      const freeSlots = await SmartSchedulerEngine.findFreeSlots({ userId });
      if (freeSlots.length === 0) {
        return {
          handled: true,
          action: 'FIND_FREE_SLOTS',
          message: 'Dạ anh Trí ơi, hôm nay lịch làm việc của anh khá dày, không còn khoảng trống nào từ 30 phút trở lên ạ.'
        };
      }
      let msg = 'Dạ em kiểm tra thấy hôm nay anh có các khung giờ rảnh sau ạ:\n';
      freeSlots.slice(0, 4).forEach((s, i) => {
        const startStr = new Date(s.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const endStr = new Date(s.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        msg += `  ${i + 1}. Từ **${startStr}** đến **${endStr}** (${s.durationMinutes} phút)\n`;
      });
      return { handled: true, action: 'FIND_FREE_SLOTS', message: msg };
    }

    // Nếu không khớp với các tác vụ trợ lý chuyên biệt (recurring, follow-up, briefing, calendar)
    // Chuyển tiếp về cho SecretaryAgent xử lý công việc / nhắc việc tiêu chuẩn
    return { handled: false };
  }

  /**
   * Nhận diện cụm từ kích hoạt thư ký riêng
   */
  static isActivationPhrase(lowerText) {
    const triggers = [
      'thư ký của anh',
      'thư ký riêng của anh',
      'thư ký ơi',
      'em thư ký',
      'bật thư ký'
    ];
    return triggers.some(t => lowerText.includes(t));
  }

  /**
   * Xử lý theo dõi có điều kiện (Conditional Follow-Up)
   */
  static async _handleConditionalFollowUp({ userId, cleanText, lower }) {
    // Trích xuất số ngày hoặc giờ (ví dụ: sau 3 ngày)
    let waitHours = 72;
    const daysMatch = lower.match(/sau\s*(\d+)\s*ngày/);
    if (daysMatch) {
      waitHours = parseInt(daysMatch[1], 10) * 24;
    } else {
      const hoursMatch = lower.match(/sau\s*(\d+)\s*(?:tiếng|giờ)/);
      if (hoursMatch) waitHours = parseInt(hoursMatch[1], 10);
    }

    // Trích xuất đối tượng cần theo dõi (PO, nhà cung cấp, đối tác)
    let targetRef = 'Nhà cung cấp';
    if (lower.includes('nhà cung cấp')) {
      targetRef = 'Nhà cung cấp';
      const poCodeMatch = cleanText.match(/(?:po|đơn hàng)\s*([a-zA-Z0-9_\-]+)/i);
      if (poCodeMatch) {
        targetRef = `Nhà cung cấp (PO: ${poCodeMatch[1]})`;
      }
    } else {
      const poMatch = cleanText.match(/(?:po|đơn hàng|báo giá|khách hàng)\s*([a-zA-Z0-9_\-\s]+?)(?:\s+chưa|\s+sau|$)/i);
      if (poMatch && poMatch[1].trim()) {
        targetRef = poMatch[1].trim();
      }
    }

    const rule = await FollowUpEngine.createFollowUpRule({
      userId,
      conditionType: 'SUPPLIER_PO_UNCONFIRMED',
      targetRef,
      maxWaitHours: waitHours,
      triggerCondition: { rawPrompt: cleanText },
      actionType: 'CREATE_REMINDER'
    });

    const waitDaysStr = Math.round(waitHours / 24);
    return {
      handled: true,
      action: 'CREATE_FOLLOW_UP',
      data: rule,
      message: `Dạ em đã ghi nhận thiết lập theo dõi điều kiện: Em sẽ tự động kiểm tra đối tượng "${targetRef}". Nếu sau ${waitDaysStr} ngày (${waitHours} giờ) vẫn chưa có xác nhận, em sẽ lập tức gửi thông báo nhắc anh xử lý ngay ạ!`
    };
  }

  /**
   * Xử lý nhắc việc lặp định kỳ
   */
  static async _handleRecurringReminder({ userId, cleanText, recurrenceRule }) {
    // Tách nội dung công việc
    let title = cleanText;
    const remindIndex = cleanText.toLowerCase().indexOf('nhắc');
    if (remindIndex !== -1) {
      title = cleanText.substring(remindIndex).replace(/^nhắc\s*(?:tôi|anh|em)?\s*/i, '').trim();
    }
    if (!title || title.length < 3) title = cleanText;

    const schedule = await RecurringScheduleEngine.createSchedule({
      userId,
      targetType: 'REMINDER',
      title,
      recurrenceRule
    });

    const nextRunFormatted = new Date(schedule.nextRunAt).toLocaleString('vi-VN', {
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit'
    });

    return {
      handled: true,
      action: 'CREATE_RECURRING_REMINDER',
      data: schedule,
      message: `Dạ em đã lên lịch nhắc định kỳ cho anh: **"${title}"**.\nLần nhắc tiếp theo sẽ diễn ra vào: **${nextRunFormatted}**. Em sẽ chủ động thông báo cho anh đúng giờ ạ!`
    };
  }

  /**
   * Tra cứu lịch trình / sự kiện
   */
  static async _handleCalendarQuery({ userId, lower }) {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    if (lower.includes('tuần này')) {
      startDate.setDate(now.getDate() - now.getDay() + 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Mặc định hôm nay
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    }

    const events = await CalendarEngine.getEvents({
      userId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    if (events.length === 0) {
      return {
        handled: true,
        action: 'QUERY_CALENDAR',
        message: 'Dạ em kiểm tra thấy trong khoảng thời gian này anh không có sự kiện hoặc cuộc họp nào trên lịch ạ.'
      };
    }

    let msg = `📅 **Danh sách lịch trình của anh (${events.length} sự kiện):**\n\n`;
    events.forEach((e, idx) => {
      const timeStr = new Date(e.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const dateStr = new Date(e.startTime).toLocaleDateString('vi-VN');
      msg += `  ${idx + 1}. **${timeStr} (${dateStr})**: ${e.title}${e.location ? ` - Địa điểm: ${e.location}` : ''}\n`;
    });

    return {
      handled: true,
      action: 'QUERY_CALENDAR',
      data: events,
      message: msg
    };
  }
}
