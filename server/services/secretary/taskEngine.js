/**
 * TASK ENGINE – BỘ MÁY QUẢN LÝ CÔNG VIỆC CỦA CHỦ NHÂN (ANH TRÍ)
 * (BOTCHAT BRAIN 2.1 – THƯ KÝ RIÊNG CỦA ANH)
 * 
 * Fields:
 * - task_id, owner_id, title, description, created_at, start_at, due_at, priority, status, completed_at, updated_at
 * 
 * Statuses:
 * - PENDING: Chưa thực hiện
 * - IN_PROGRESS: Đang thực hiện
 * - WAITING: Đang chờ
 * - COMPLETED: Hoàn thành
 * - OVERDUE: Quá hạn
 * - CANCELLED: Đã hủy
 */

import { db } from '../../db.js';
import crypto from 'crypto';
import { AuditLogService } from './auditLogService.js';

export const TASK_STATUSES = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  WAITING: 'WAITING',
  COMPLETED: 'COMPLETED',
  OVERDUE: 'OVERDUE',
  CANCELLED: 'CANCELLED'
};

export const TASK_STATUS_LABELS = {
  PENDING: 'Chưa thực hiện',
  IN_PROGRESS: 'Đang thực hiện',
  WAITING: 'Đang chờ',
  COMPLETED: 'Hoàn thành',
  OVERDUE: 'Quá hạn',
  CANCELLED: 'Đã hủy'
};

export class TaskEngine {
  /**
   * Tạo công việc mới
   */
  static async createTask({
    ownerId = 'owner_tri',
    title,
    description = null,
    startAt = null,
    dueAt = null,
    priority = 'NORMAL',
    status = 'PENDING',
    ipAddress = '127.0.0.1'
  }) {
    if (!title || !title.trim()) {
      throw new Error('Tiêu đề công việc không được để trống.');
    }

    const taskId = `task_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const nowIso = new Date().toISOString();

    const cleanTitle = title.trim();
    const cleanPriority = ['LOW', 'NORMAL', 'HIGH', 'URGENT'].includes(priority) ? priority : 'NORMAL';
    const cleanStatus = TASK_STATUSES[status] || 'PENDING';

    await db.run(
      `INSERT INTO owner_tasks (task_id, id, owner_id, user_id, title, description, created_at, start_at, due_at, priority, status, completed_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
      [
        taskId,
        taskId,
        ownerId,
        ownerId,
        cleanTitle,
        description,
        nowIso,
        startAt,
        dueAt,
        cleanPriority,
        cleanStatus,
        nowIso
      ]
    );

    await AuditLogService.logAction({
      ownerId,
      actionType: 'CREATE_TASK',
      targetType: 'TASK',
      targetId: taskId,
      details: { title: cleanTitle, dueAt, priority: cleanPriority },
      ipAddress
    });

    return await this.getTaskById(taskId, ownerId);
  }

  /**
   * Lấy chi tiết công việc theo ID
   */
  static async getTaskById(taskId, ownerId = 'owner_tri') {
    const row = await db.get(
      `SELECT * FROM owner_tasks WHERE (task_id = ? OR id = ?) AND (owner_id = ? OR user_id = ?)`,
      [taskId, taskId, ownerId, ownerId]
    );
    if (!row) return null;
    return {
      ...row,
      task_id: row.task_id || row.id,
      owner_id: row.owner_id || row.user_id,
      due_at: row.due_at || row.time_spec
    };
  }

  /**
   * Cập nhật công việc
   */
  static async updateTask(taskId, updates = {}, ownerId = 'owner_tri', ipAddress = '127.0.0.1') {
    const existing = await this.getTaskById(taskId, ownerId);
    if (!existing) {
      throw new Error(`Không tìm thấy công việc với ID: ${taskId}`);
    }

    const nowIso = new Date().toISOString();
    const newTitle = updates.title !== undefined ? updates.title.trim() : existing.title;
    const newDesc = updates.description !== undefined ? updates.description : existing.description;
    const newDue = updates.dueAt !== undefined ? updates.dueAt : existing.due_at;
    const newStart = updates.startAt !== undefined ? updates.startAt : existing.start_at;
    const newPriority = updates.priority !== undefined ? updates.priority : existing.priority;
    const newStatus = updates.status !== undefined ? updates.status : existing.status;
    const completedAt = (newStatus === 'COMPLETED' && !existing.completed_at)
      ? nowIso
      : (newStatus !== 'COMPLETED' ? null : existing.completed_at);

    await db.run(
      `UPDATE owner_tasks
       SET title = ?, description = ?, start_at = ?, due_at = ?, priority = ?, status = ?, completed_at = ?, updated_at = ?
       WHERE task_id = ? AND owner_id = ?`,
      [
        newTitle,
        newDesc,
        newStart,
        newDue,
        newPriority,
        newStatus,
        completedAt,
        nowIso,
        taskId,
        ownerId
      ]
    );

    await AuditLogService.logAction({
      ownerId,
      actionType: 'UPDATE_TASK',
      targetType: 'TASK',
      targetId: taskId,
      details: updates,
      ipAddress
    });

    return await this.getTaskById(taskId, ownerId);
  }

  /**
   * Đánh dấu hoàn thành công việc
   */
  static async completeTask(taskIdOrKeyword, ownerId = 'owner_tri', ipAddress = '127.0.0.1') {
    let task = null;
    if (taskIdOrKeyword.startsWith('task_')) {
      task = await this.getTaskById(taskIdOrKeyword, ownerId);
    }
    if (!task) {
      task = await this.findTaskByKeyword(ownerId, taskIdOrKeyword);
    }

    if (!task) {
      return { success: false, message: `Không tìm thấy công việc phù hợp với "${taskIdOrKeyword}" để hoàn thành.` };
    }

    const nowIso = new Date().toISOString();
    await db.run(
      `UPDATE owner_tasks
       SET status = 'COMPLETED', completed_at = ?, updated_at = ?
       WHERE task_id = ? AND owner_id = ?`,
      [nowIso, nowIso, task.task_id, ownerId]
    );

    await AuditLogService.logAction({
      ownerId,
      actionType: 'COMPLETE_TASK',
      targetType: 'TASK',
      targetId: task.task_id,
      details: { title: task.title, completedAt: nowIso },
      ipAddress
    });

    const updated = await this.getTaskById(task.task_id, ownerId);
    return { success: true, task: updated };
  }

  /**
   * Hủy công việc
   */
  static async cancelTask(taskIdOrKeyword, ownerId = 'owner_tri', ipAddress = '127.0.0.1') {
    let task = null;
    if (taskIdOrKeyword.startsWith('task_')) {
      task = await this.getTaskById(taskIdOrKeyword, ownerId);
    }
    if (!task) {
      task = await this.findTaskByKeyword(ownerId, taskIdOrKeyword);
    }

    if (!task) {
      return { success: false, message: `Không tìm thấy công việc phù hợp với "${taskIdOrKeyword}" để hủy.` };
    }

    const nowIso = new Date().toISOString();
    await db.run(
      `UPDATE owner_tasks
       SET status = 'CANCELLED', updated_at = ?
       WHERE task_id = ? AND owner_id = ?`,
      [nowIso, task.task_id, ownerId]
    );

    await AuditLogService.logAction({
      ownerId,
      actionType: 'CANCEL_TASK',
      targetType: 'TASK',
      targetId: task.task_id,
      details: { title: task.title },
      ipAddress
    });

    const updated = await this.getTaskById(task.task_id, ownerId);
    return { success: true, task: updated };
  }

  /**
   * Tìm công việc theo từ khóa hoặc số thứ tự gần nhất
   */
  static async findTaskByKeyword(ownerId = 'owner_tri', keyword = '') {
    if (!keyword) return null;
    const cleanKw = keyword.trim().toLowerCase();

    // Nếu người dùng nói "việc số 1", "việc số 2", "số 3"
    const ordinalMatch = cleanKw.match(/(?:việc\s+|nhiệm vụ\s+)?(?:số\s+|thứ\s+)?(\d+)/i);
    if (ordinalMatch) {
      const idx = parseInt(ordinalMatch[1], 10) - 1;
      const recent = await db.all(
        `SELECT * FROM owner_tasks
         WHERE owner_id = ? AND status IN ('PENDING', 'IN_PROGRESS', 'WAITING')
         ORDER BY created_at DESC LIMIT 10`,
        [ownerId]
      );
      if (recent[idx]) return recent[idx];
    }

    // Tìm kiếm fuzzy theo từ khóa tiêu đề
    const tokens = cleanKw
      .replace(/(?:việc|nhiệm vụ|công việc|hoàn thành|xong|dời|nhắc|đã|giúp anh|giúp tôi)/gi, '')
      .trim()
      .split(/\s+/)
      .filter(t => t.length >= 2);

    if (tokens.length === 0) {
      // Lấy công việc mới nhất đang chờ
      return await db.get(
        `SELECT * FROM owner_tasks
         WHERE owner_id = ? AND status IN ('PENDING', 'IN_PROGRESS')
         ORDER BY updated_at DESC LIMIT 1`,
        [ownerId]
      );
    }

    const tasks = await db.all(
      `SELECT * FROM owner_tasks
       WHERE owner_id = ? AND status IN ('PENDING', 'IN_PROGRESS', 'WAITING', 'OVERDUE')
       ORDER BY updated_at DESC`,
      [ownerId]
    );

    let bestTask = null;
    let highestScore = 0;

    for (const t of tasks) {
      const tNorm = (t.title + ' ' + (t.description || '')).toLowerCase();
      let matchCount = 0;
      for (const tok of tokens) {
        if (tNorm.includes(tok)) matchCount++;
      }
      if (matchCount > highestScore) {
        highestScore = matchCount;
        bestTask = t;
      }
    }

    return bestTask;
  }

  /**
   * Danh sách công việc theo điều kiện lọc
   */
  static async getTasks({
    ownerId = 'owner_tri',
    status = null,
    date = null,
    limit = 20
  } = {}) {
    let sql = `SELECT * FROM owner_tasks WHERE (owner_id = ? OR user_id = ?)`;
    const params = [ownerId, ownerId];

    if (status) {
      if (Array.isArray(status)) {
        sql += ` AND status IN (${status.map(() => '?').join(', ')})`;
        params.push(...status);
      } else {
        sql += ` AND status = ?`;
        params.push(status);
      }
    }

    if (date) {
      // Lọc theo ngày (YYYY-MM-DD)
      sql += ` AND (due_at LIKE ? OR start_at LIKE ? OR created_at LIKE ? OR time_spec LIKE ?)`;
      params.push(`${date}%`, `${date}%`, `${date}%`, `${date}%`);
    }

    sql += ` ORDER BY CASE priority WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'NORMAL' THEN 3 ELSE 4 END, created_at DESC LIMIT ?`;
    params.push(limit);

    const rows = await db.all(sql, params);
    return rows.map(r => ({
      ...r,
      task_id: r.task_id || r.id,
      owner_id: r.owner_id || r.user_id,
      due_at: r.due_at || r.time_spec
    }));
  }

  /**
   * Lấy danh sách công việc quá hạn
   */
  static async getOverdueTasks(ownerId = 'owner_tri') {
    const nowIso = new Date().toISOString();
    return await db.all(
      `SELECT * FROM owner_tasks
       WHERE owner_id = ?
         AND status IN ('PENDING', 'IN_PROGRESS', 'WAITING')
         AND due_at IS NOT NULL
         AND due_at < ?
       ORDER BY due_at ASC`,
      [ownerId, nowIso]
    );
  }

  /**
   * Tổng hợp công việc trong tuần (Đã hoàn thành, đang thực hiện, đang chờ, quá hạn)
   */
  static async getWeeklySummary(ownerId = 'owner_tri') {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const mondayIso = monday.toISOString();
    const sundayIso = sunday.toISOString();
    const nowIso = now.toISOString();

    const allTasks = await db.all(
      `SELECT * FROM owner_tasks
       WHERE owner_id = ?
         AND (
           (created_at >= ? AND created_at <= ?)
           OR (due_at >= ? AND due_at <= ?)
           OR (completed_at >= ? AND completed_at <= ?)
           OR status IN ('PENDING', 'IN_PROGRESS', 'WAITING')
         )
       ORDER BY created_at DESC`,
      [ownerId, mondayIso, sundayIso, mondayIso, sundayIso, mondayIso, sundayIso]
    );

    const completed = [];
    const inProgress = [];
    const waiting = [];
    const overdue = [];
    const pending = [];

    for (const t of allTasks) {
      if (t.status === 'COMPLETED') {
        completed.push(t);
      } else if (t.due_at && t.due_at < nowIso) {
        overdue.push(t);
      } else if (t.status === 'IN_PROGRESS') {
        inProgress.push(t);
      } else if (t.status === 'WAITING') {
        waiting.push(t);
      } else {
        pending.push(t);
      }
    }

    return {
      total: allTasks.length,
      completed,
      inProgress,
      waiting,
      overdue,
      pending,
      range: {
        from: monday.toLocaleDateString('vi-VN'),
        to: sunday.toLocaleDateString('vi-VN')
      }
    };
  }
}

export default TaskEngine;
