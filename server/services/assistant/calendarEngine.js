/**
 * CALENDAR ENGINE – BỘ MÁY QUẢN LÝ LỊCH TRÌNH VÀ SỰ KIỆN
 * (MASTER PROMPT 03: TRÍ AI PERSONAL ASSISTANT)
 * 
 * Supports:
 * - Tạo, cập nhật, hủy sự kiện / cuộc họp.
 * - Kiểm tra xung đột lịch trình (conflict detection).
 * - Tra cứu sự kiện theo ngày, tuần, tháng.
 */

import { db } from '../../db.js';
import crypto from 'crypto';

export class CalendarEngine {
  /**
   * Tạo sự kiện lịch mới
   */
  static async createEvent({
    userId = 'owner_tri',
    tenantId = 'default',
    title,
    description = null,
    location = null,
    startTime,
    endTime,
    allDay = 0,
    status = 'CONFIRMED',
    priority = 'MEDIUM',
    participants = [],
    recurrenceId = null
  }) {
    if (!title || !title.trim()) {
      throw new Error('Tiêu đề sự kiện không được để trống.');
    }
    if (!startTime || !endTime) {
      throw new Error('Thời gian bắt đầu và kết thúc không được để trống.');
    }

    const startObj = new Date(startTime);
    const endObj = new Date(endTime);
    if (isNaN(startObj.getTime()) || isNaN(endObj.getTime())) {
      throw new Error('Thời gian sự kiện không hợp lệ.');
    }
    if (endObj <= startObj) {
      throw new Error('Thời gian kết thúc phải diễn ra sau thời gian bắt đầu.');
    }

    const eventId = `evt_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const nowIso = new Date().toISOString();
    const participantsJson = typeof participants === 'string' ? participants : JSON.stringify(participants || []);

    await db.run(
      `INSERT INTO calendar_events (
        event_id, user_id, tenant_id, title, description, location,
        start_time, end_time, all_day, status, priority, participants, recurrence_id,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        eventId,
        userId,
        tenantId,
        title.trim(),
        description ? description.trim() : null,
        location ? location.trim() : null,
        startObj.toISOString(),
        endObj.toISOString(),
        allDay ? 1 : 0,
        status,
        priority,
        participantsJson,
        recurrenceId,
        nowIso,
        nowIso
      ]
    );

    return await this.getEventById(eventId, userId);
  }

  /**
   * Lấy sự kiện theo ID
   */
  static async getEventById(eventId, userId = 'owner_tri') {
    const row = await db.get(
      `SELECT * FROM calendar_events WHERE event_id = ? AND user_id = ?`,
      [eventId, userId]
    );
    if (!row) return null;
    return this._formatEventRow(row);
  }

  /**
   * Cập nhật sự kiện
   */
  static async updateEvent(eventId, updates = {}, userId = 'owner_tri') {
    const existing = await this.getEventById(eventId, userId);
    if (!existing) {
      throw new Error(`Không tìm thấy sự kiện ${eventId}`);
    }

    const allowedFields = [
      'title', 'description', 'location', 'start_time', 'end_time',
      'all_day', 'status', 'priority', 'participants'
    ];

    const sets = [];
    const params = [];
    const nowIso = new Date().toISOString();

    for (const [key, val] of Object.entries(updates)) {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(snakeKey)) {
        sets.push(`${snakeKey} = ?`);
        if (snakeKey === 'participants') {
          params.push(typeof val === 'string' ? val : JSON.stringify(val || []));
        } else {
          params.push(val);
        }
      }
    }

    if (sets.length === 0) return existing;

    sets.push('updated_at = ?');
    params.push(nowIso);

    params.push(eventId);
    params.push(userId);

    await db.run(
      `UPDATE calendar_events SET ${sets.join(', ')} WHERE event_id = ? AND user_id = ?`,
      params
    );

    return await this.getEventById(eventId, userId);
  }

  /**
   * Hủy hoặc xóa sự kiện
   */
  static async deleteEvent(eventId, userId = 'owner_tri') {
    const existing = await this.getEventById(eventId, userId);
    if (!existing) return false;

    await db.run(
      `UPDATE calendar_events SET status = 'CANCELLED', updated_at = ? WHERE event_id = ? AND user_id = ?`,
      [new Date().toISOString(), eventId, userId]
    );
    return true;
  }

  /**
   * Tra cứu danh sách sự kiện theo khoảng thời gian
   */
  static async getEvents({
    userId = 'owner_tri',
    startDate = null,
    endDate = null,
    status = null,
    limit = 50
  } = {}) {
    let sql = `SELECT * FROM calendar_events WHERE user_id = ?`;
    const params = [userId];

    if (startDate) {
      sql += ` AND end_time >= ?`;
      params.push(new Date(startDate).toISOString());
    }
    if (endDate) {
      sql += ` AND start_time <= ?`;
      params.push(new Date(endDate).toISOString());
    }
    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    } else {
      sql += ` AND status != 'CANCELLED'`;
    }

    sql += ` ORDER BY start_time ASC LIMIT ?`;
    params.push(limit);

    const rows = await db.all(sql, params);
    return rows.map(r => this._formatEventRow(r));
  }

  /**
   * Kiểm tra xung đột lịch trình (Conflict Detection)
   */
  static async checkConflicts({
    userId = 'owner_tri',
    startTime,
    endTime,
    excludeEventId = null
  }) {
    const startIso = new Date(startTime).toISOString();
    const endIso = new Date(endTime).toISOString();

    let sql = `
      SELECT * FROM calendar_events 
      WHERE user_id = ? 
        AND status = 'CONFIRMED'
        AND start_time < ? 
        AND end_time > ?
    `;
    const params = [userId, endIso, startIso];

    if (excludeEventId) {
      sql += ` AND event_id != ?`;
      params.push(excludeEventId);
    }

    const rows = await db.all(sql, params);
    return rows.map(r => this._formatEventRow(r));
  }

  static _formatEventRow(row) {
    let participants = [];
    try {
      participants = JSON.parse(row.participants || '[]');
    } catch (e) {
      participants = [];
    }
    return {
      eventId: row.event_id,
      userId: row.user_id,
      tenantId: row.tenant_id,
      title: row.title,
      description: row.description,
      location: row.location,
      startTime: row.start_time,
      endTime: row.end_time,
      allDay: Boolean(row.all_day),
      status: row.status,
      priority: row.priority,
      participants,
      recurrenceId: row.recurrence_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
