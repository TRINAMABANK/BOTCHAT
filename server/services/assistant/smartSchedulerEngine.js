/**
 * SMART SCHEDULER ENGINE – BỘ MÁY GỢI Ý VÀ TỐI ƯU HÓA LỊCH TRÌNH THÔNG MINH
 * (MASTER PROMPT 03: TRÍ AI PERSONAL ASSISTANT)
 * 
 * Supports:
 * 1. Tìm các khung giờ rảnh (free time slots) không bị trùng với lịch hiện có.
 * 2. Gợi ý dời lịch thông minh khi phát hiện xung đột.
 * 3. Tối ưu thời gian nghỉ giữa các cuộc họp (buffer time: 15-30 phút).
 */

import { CalendarEngine } from './calendarEngine.js';

export class SmartSchedulerEngine {
  /**
   * Tìm các khung giờ trống phù hợp trong ngày
   */
  static async findFreeSlots({
    userId = 'owner_tri',
    date = new Date(),
    durationMinutes = 60,
    startHour = 8,
    endHour = 18,
    bufferMinutes = 15
  }) {
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(startHour, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(endHour, 0, 0, 0);

    // Lấy các sự kiện trong ngày
    const existingEvents = await CalendarEngine.getEvents({
      userId,
      startDate: startOfDay.toISOString(),
      endDate: endOfDay.toISOString()
    });

    const freeSlots = [];
    let currentCursor = new Date(startOfDay);

    // Sắp xếp các sự kiện theo thời gian bắt đầu
    existingEvents.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    for (const evt of existingEvents) {
      const evtStart = new Date(evt.startTime);
      const evtEnd = new Date(evt.endTime);

      // Khoảng trống từ currentCursor đến evtStart
      const availableMinutes = (evtStart.getTime() - currentCursor.getTime()) / (1000 * 60);

      if (availableMinutes >= durationMinutes) {
        const slotEnd = new Date(currentCursor.getTime() + durationMinutes * 60 * 1000);
        freeSlots.push({
          startTime: currentCursor.toISOString(),
          endTime: slotEnd.toISOString(),
          durationMinutes
        });
      }

      // Đẩy con trỏ qua kết thúc sự kiện + buffer
      const nextPossibleStart = new Date(evtEnd.getTime() + bufferMinutes * 60 * 1000);
      if (nextPossibleStart > currentCursor) {
        currentCursor = nextPossibleStart;
      }
    }

    // Kiểm tra khoảng trống còn lại từ sự kiện cuối cùng đến endOfDay
    const remainingMinutes = (endOfDay.getTime() - currentCursor.getTime()) / (1000 * 60);
    if (remainingMinutes >= durationMinutes) {
      const slotEnd = new Date(currentCursor.getTime() + durationMinutes * 60 * 1000);
      freeSlots.push({
        startTime: currentCursor.toISOString(),
        endTime: slotEnd.toISOString(),
        durationMinutes
      });
    }

    return freeSlots;
  }

  /**
   * Đề xuất phương án dời lịch khi có xung đột
   */
  static async suggestReschedule({
    userId = 'owner_tri',
    proposedStartTime,
    proposedEndTime
  }) {
    const conflicts = await CalendarEngine.checkConflicts({
      userId,
      startTime: proposedStartTime,
      endTime: proposedEndTime
    });

    if (conflicts.length === 0) {
      return { hasConflict: false, suggestions: [] };
    }

    const durationMinutes = (new Date(proposedEndTime).getTime() - new Date(proposedStartTime).getTime()) / (1000 * 60);
    const freeSlots = await this.findFreeSlots({
      userId,
      date: new Date(proposedStartTime),
      durationMinutes: Math.max(30, Math.round(durationMinutes))
    });

    return {
      hasConflict: true,
      conflicts,
      suggestions: freeSlots.slice(0, 3) // Trả về tối đa 3 khung giờ thay thế tốt nhất
    };
  }
}
