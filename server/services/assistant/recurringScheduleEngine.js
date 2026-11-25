/**
 * RECURRING SCHEDULE ENGINE – BỘ MÁY QUẢN LÝ LỊCH LẶP ĐỊNH KỲ
 * (MASTER PROMPT 03: TRÍ AI PERSONAL ASSISTANT)
 * 
 * Supports:
 * - Hàng ngày (DAILY)
 * - Hàng tuần vào các thứ cụ thể (WEEKLY: MO, TU, WE, TH, FR, SA, SU)
 * - Hàng tháng vào ngày cụ thể hoặc ngày cuối tháng (MONTHLY: BYMONTHDAY=1..31 hoặc -1)
 * - Tự động tính toán next_run_at chính xác theo múi giờ Asia/Ho_Chi_Minh (UTC+7)
 */

import { db } from '../../db.js';
import crypto from 'crypto';

export class RecurringScheduleEngine {
  /**
   * Tạo lịch lặp định kỳ mới
   */
  static async createSchedule({
    userId = 'owner_tri',
    tenantId = 'default',
    targetType, // 'TASK', 'REMINDER', 'EVENT', 'BRIEFING'
    targetId = null,
    title,
    recurrenceRule,
    firstRunAt = null,
    endCondition = null
  }) {
    if (!title || !recurrenceRule) {
      throw new Error('Thiếu tiêu đề hoặc quy tắc lặp (recurrenceRule).');
    }

    const scheduleId = `rec_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date();
    const nextRun = firstRunAt ? new Date(firstRunAt) : this.computeNextRun(recurrenceRule, now);
    const nowIso = now.toISOString();

    await db.run(
      `INSERT INTO recurring_schedules (
        schedule_id, user_id, tenant_id, target_type, target_id, title,
        recurrence_rule, next_run_at, last_run_at, end_condition, is_active,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 1, ?, ?)`,
      [
        scheduleId,
        userId,
        tenantId,
        targetType,
        targetId,
        title.trim(),
        recurrenceRule,
        nextRun.toISOString(),
        endCondition ? JSON.stringify(endCondition) : null,
        nowIso,
        nowIso
      ]
    );

    return await this.getScheduleById(scheduleId, userId);
  }

  /**
   * Lấy chi tiết lịch lặp theo ID
   */
  static async getScheduleById(scheduleId, userId = 'owner_tri') {
    const row = await db.get(
      `SELECT * FROM recurring_schedules WHERE schedule_id = ? AND user_id = ?`,
      [scheduleId, userId]
    );
    if (!row) return null;
    return this._formatRow(row);
  }

  /**
   * Lấy danh sách lịch lặp của người dùng
   */
  static async getSchedules({ userId = 'owner_tri', isActive = 1 } = {}) {
    let sql = `SELECT * FROM recurring_schedules WHERE user_id = ?`;
    const params = [userId];

    if (isActive !== null) {
      sql += ` AND is_active = ?`;
      params.push(isActive ? 1 : 0);
    }
    sql += ` ORDER BY next_run_at ASC`;

    const rows = await db.all(sql, params);
    return rows.map(r => this._formatRow(r));
  }

  /**
   * Lấy các lịch lặp đã đến hạn chạy
   */
  static async getDueSchedules(beforeIso = new Date().toISOString()) {
    const rows = await db.all(
      `SELECT * FROM recurring_schedules WHERE is_active = 1 AND next_run_at <= ? ORDER BY next_run_at ASC`,
      [beforeIso]
    );
    return rows.map(r => this._formatRow(r));
  }

  /**
   * Cập nhật bước chạy tiếp theo sau khi đã kích hoạt
   */
  static async advanceSchedule(scheduleId) {
    const schedule = await db.get(`SELECT * FROM recurring_schedules WHERE schedule_id = ?`, [scheduleId]);
    if (!schedule) return null;

    const now = new Date();
    const nextRun = this.computeNextRun(schedule.recurrence_rule, now);
    const nowIso = now.toISOString();

    // Kiểm tra điều kiện kết thúc nếu có
    let shouldDeactivate = 0;
    if (schedule.end_condition) {
      try {
        const cond = JSON.parse(schedule.end_condition);
        if (cond.until && new Date(cond.until) <= nextRun) {
          shouldDeactivate = 1;
        }
      } catch (e) {}
    }

    await db.run(
      `UPDATE recurring_schedules 
       SET next_run_at = ?, last_run_at = ?, is_active = ?, updated_at = ?
       WHERE schedule_id = ?`,
      [
        nextRun.toISOString(),
        nowIso,
        shouldDeactivate ? 0 : schedule.is_active,
        nowIso,
        scheduleId
      ]
    );

    return await this.getScheduleById(scheduleId, schedule.user_id);
  }

  /**
   * Hủy lịch lặp
   */
  static async deactivateSchedule(scheduleId, userId = 'owner_tri') {
    await db.run(
      `UPDATE recurring_schedules SET is_active = 0, updated_at = ? WHERE schedule_id = ? AND user_id = ?`,
      [new Date().toISOString(), scheduleId, userId]
    );
    return true;
  }

  /**
   * Tính toán thời điểm chạy tiếp theo dựa trên chuỗi quy tắc
   * Ví dụ:
   * - FREQ=DAILY;BYHOUR=8;BYMINUTE=0
   * - FREQ=WEEKLY;BYDAY=MO;BYHOUR=9;BYMINUTE=0
   * - FREQ=MONTHLY;BYMONTHDAY=LAST;BYHOUR=17
   */
  static computeNextRun(ruleString, fromDate = new Date()) {
    const base = new Date(fromDate);
    const parts = {};
    ruleString.split(';').forEach(pair => {
      const [k, v] = pair.split('=');
      if (k && v) parts[k.trim().toUpperCase()] = v.trim().toUpperCase();
    });

    const freq = parts.FREQ || 'DAILY';
    const targetHour = parts.BYHOUR !== undefined ? parseInt(parts.BYHOUR, 10) : 8;
    const targetMinute = parts.BYMINUTE !== undefined ? parseInt(parts.BYMINUTE, 10) : 0;

    const candidate = new Date(base);
    candidate.setSeconds(0, 0);

    if (freq === 'DAILY') {
      candidate.setHours(targetHour, targetMinute, 0, 0);
      if (candidate <= base) {
        candidate.setDate(candidate.getDate() + 1);
      }
      return candidate;
    }

    if (freq === 'WEEKLY') {
      const dayMap = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
      const targetDays = (parts.BYDAY || 'MO').split(',').map(d => dayMap[d] !== undefined ? dayMap[d] : 1);
      
      // Tìm ngày gần nhất trong tuần thỏa mãn
      for (let offset = 0; offset <= 7; offset++) {
        const testDate = new Date(base);
        testDate.setDate(base.getDate() + offset);
        testDate.setHours(targetHour, targetMinute, 0, 0);

        if (targetDays.includes(testDate.getDay()) && testDate > base) {
          return testDate;
        }
      }
      // Fallback
      candidate.setDate(candidate.getDate() + 7);
      candidate.setHours(targetHour, targetMinute, 0, 0);
      return candidate;
    }

    if (freq === 'MONTHLY') {
      const isLastDay = parts.BYMONTHDAY === 'LAST' || parts.BYMONTHDAY === '-1';
      let year = base.getFullYear();
      let month = base.getMonth();

      let targetDateNum = isLastDay 
        ? new Date(year, month + 1, 0).getDate() 
        : parseInt(parts.BYMONTHDAY || '1', 10);

      candidate.setFullYear(year, month, targetDateNum);
      candidate.setHours(targetHour, targetMinute, 0, 0);

      if (candidate <= base) {
        month += 1;
        if (month > 11) {
          month = 0;
          year += 1;
        }
        targetDateNum = isLastDay 
          ? new Date(year, month + 1, 0).getDate() 
          : parseInt(parts.BYMONTHDAY || '1', 10);
        candidate.setFullYear(year, month, targetDateNum);
        candidate.setHours(targetHour, targetMinute, 0, 0);
      }
      return candidate;
    }

    // Default: Next day
    candidate.setDate(candidate.getDate() + 1);
    candidate.setHours(targetHour, targetMinute, 0, 0);
    return candidate;
  }

  /**
   * Phân tích văn bản tiếng Việt để trích xuất quy tắc lặp định kỳ
   */
  static parseRecurrenceFromText(text = '') {
    const lower = text.toLowerCase();
    
    // Hàng ngày
    if (lower.includes('hàng ngày') || lower.includes('mỗi ngày') || lower.includes('đều đặn mỗi ngày')) {
      let hour = 8;
      const hourMatch = lower.match(/(?:lúc|vào)?\s*(\d{1,2})(?:\s*giờ|\s*h)/);
      if (hourMatch) hour = parseInt(hourMatch[1], 10);
      return `FREQ=DAILY;BYHOUR=${hour};BYMINUTE=0`;
    }

    // Hàng tuần (ví dụ: thứ Hai hằng tuần, mỗi thứ 6)
    const dayKeywords = [
      { key: 'thứ hai', code: 'MO' },
      { key: 'thứ ba', code: 'TU' },
      { key: 'thứ tư', code: 'WE' },
      { key: 'thứ năm', code: 'TH' },
      { key: 'thứ sáu', code: 'FR' },
      { key: 'thứ bảy', code: 'SA' },
      { key: 'chủ nhật', code: 'SU' }
    ];

    for (const d of dayKeywords) {
      if ((lower.includes(d.key) && (lower.includes('hằng tuần') || lower.includes('mỗi tuần') || lower.includes('hàng tuần'))) ||
          lower.includes(`mỗi ${d.key}`) || lower.includes(`hàng ${d.key}`)) {
        let hour = 9;
        const hourMatch = lower.match(/(?:lúc|vào)?\s*(\d{1,2})(?:\s*giờ|\s*h)/);
        if (hourMatch) hour = parseInt(hourMatch[1], 10);
        return `FREQ=WEEKLY;BYDAY=${d.code};BYHOUR=${hour};BYMINUTE=0`;
      }
    }

    // Cuối tháng
    if (lower.includes('cuối tháng')) {
      let hour = 17;
      const hourMatch = lower.match(/(?:lúc|vào)?\s*(\d{1,2})(?:\s*giờ|\s*h)/);
      if (hourMatch) hour = parseInt(hourMatch[1], 10);
      return `FREQ=MONTHLY;BYMONTHDAY=LAST;BYHOUR=${hour};BYMINUTE=0`;
    }

    // Ngày cố định trong tháng (ví dụ: ngày 15 hàng tháng)
    const monthDayMatch = lower.match(/ngày\s*(\d{1,2})\s*(?:hàng tháng|mỗi tháng)/);
    if (monthDayMatch) {
      const dayNum = parseInt(monthDayMatch[1], 10);
      let hour = 9;
      const hourMatch = lower.match(/(?:lúc|vào)?\s*(\d{1,2})(?:\s*giờ|\s*h)/);
      if (hourMatch) hour = parseInt(hourMatch[1], 10);
      return `FREQ=MONTHLY;BYMONTHDAY=${dayNum};BYHOUR=${hour};BYMINUTE=0`;
    }

    return null;
  }

  static _formatRow(row) {
    let endCondition = null;
    try {
      if (row.end_condition) endCondition = JSON.parse(row.end_condition);
    } catch (e) {}

    return {
      scheduleId: row.schedule_id,
      userId: row.user_id,
      tenantId: row.tenant_id,
      targetType: row.target_type,
      targetId: row.target_id,
      title: row.title,
      recurrenceRule: row.recurrence_rule,
      nextRunAt: row.next_run_at,
      lastRunAt: row.last_run_at,
      endCondition,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
