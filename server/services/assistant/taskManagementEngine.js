/**
 * TASK MANAGEMENT ENGINE – BỘ MÁY QUẢN LÝ CÔNG VIỆC NÂNG CAO
 * (MASTER PROMPT 03: TRÍ AI PERSONAL ASSISTANT)
 * 
 * Nâng cấp và bao gói TaskEngine sẵn có từ `server/services/secretary/taskEngine.js`,
 * bổ sung tích hợp:
 * - Recurrence linking (`recurrence_id`)
 * - Smart Urgency & Priority ranking qua `PriorityEngine`
 * - Gán người phụ trách (`assigned_to`)
 * - Tự động liên kết lịch nhắc việc
 */

import { TaskEngine, TASK_STATUSES, TASK_STATUS_LABELS } from '../secretary/taskEngine.js';
import { PriorityEngine } from './priorityEngine.js';
import { db } from '../../db.js';

export class TaskManagementEngine {
  /**
   * Tạo công việc mới với đánh giá độ ưu tiên thông minh
   */
  static async createTask({
    ownerId = 'owner_tri',
    userId = 'owner_tri',
    title,
    description = null,
    startAt = null,
    dueAt = null,
    priority = null,
    remindAt = null,
    recurrenceId = null,
    assignedTo = 'owner_tri',
    ipAddress = '127.0.0.1'
  }) {
    // Nếu chưa chỉ định priority rõ ràng, tự động phân tích từ tiêu đề và deadline
    let determinedPriority = priority;
    if (!determinedPriority) {
      const textPriority = PriorityEngine.detectPriorityFromText(title + ' ' + (description || ''));
      if (textPriority !== 'NORMAL') {
        determinedPriority = textPriority;
      } else if (dueAt) {
        const score = PriorityEngine.calculateUrgencyScore({ dueAt, priority: 'NORMAL' });
        determinedPriority = PriorityEngine.classifyPriority(score);
      } else {
        determinedPriority = 'NORMAL';
      }
    }

    const task = await TaskEngine.createTask({
      ownerId: userId || ownerId,
      title,
      description,
      startAt,
      dueAt,
      priority: determinedPriority,
      status: 'PENDING',
      ipAddress
    });

    // Cập nhật các trường mở rộng nếu có
    if (recurrenceId || assignedTo || remindAt) {
      await db.run(
        `UPDATE owner_tasks 
         SET recurrence_id = ?, assigned_to = ?, remind_at = ? 
         WHERE task_id = ?`,
        [recurrenceId, assignedTo, remindAt, task.taskId]
      );
    }

    return await this.getTaskById(task.taskId, userId || ownerId);
  }

  /**
   * Lấy chi tiết công việc theo ID
   */
  static async getTaskById(taskId, userId = 'owner_tri') {
    const task = await TaskEngine.getTaskById(taskId, userId);
    if (!task) return null;

    // Tính điểm khẩn cấp thời gian thực
    const urgencyScore = PriorityEngine.calculateUrgencyScore({
      dueAt: task.dueAt,
      priority: task.priority,
      createdAt: task.createdAt
    });

    return {
      ...task,
      urgencyScore,
      urgencyLabel: PriorityEngine.classifyPriority(urgencyScore)
    };
  }

  /**
   * Cập nhật công việc
   */
  static async updateTask(taskId, updates = {}, userId = 'owner_tri', ipAddress = '127.0.0.1') {
    return await TaskEngine.updateTask(taskId, updates, userId, ipAddress);
  }

  /**
   * Hoàn thành công việc
   */
  static async completeTask(taskId, userId = 'owner_tri', ipAddress = '127.0.0.1') {
    return await TaskEngine.completeTask(taskId, userId, ipAddress);
  }

  /**
   * Hủy công việc
   */
  static async cancelTask(taskId, reason = null, userId = 'owner_tri', ipAddress = '127.0.0.1') {
    return await TaskEngine.cancelTask(taskId, reason, userId, ipAddress);
  }

  /**
   * Tra cứu danh sách công việc với bộ lọc nâng cao
   */
  static async getTasks({
    userId = 'owner_tri',
    status = null,
    priority = null,
    dueBefore = null,
    dueAfter = null,
    search = null,
    sortBy = 'urgency', // 'urgency', 'due_at', 'created_at'
    limit = 50,
    offset = 0
  } = {}) {
    let sql = `SELECT * FROM owner_tasks WHERE (owner_id = ? OR user_id = ?)`;
    const params = [userId, userId];

    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }
    if (priority) {
      sql += ` AND priority = ?`;
      params.push(priority);
    }
    if (dueBefore) {
      sql += ` AND due_at <= ?`;
      params.push(new Date(dueBefore).toISOString());
    }
    if (dueAfter) {
      sql += ` AND due_at >= ?`;
      params.push(new Date(dueAfter).toISOString());
    }
    if (search) {
      sql += ` AND (title LIKE ? OR description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY due_at ASC NULLS LAST, created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const rows = await db.all(sql, params);
    const tasks = rows.map(r => TaskEngine._formatTaskRow(r));

    // Thêm điểm khẩn cấp
    const enriched = tasks.map(t => {
      const urgencyScore = PriorityEngine.calculateUrgencyScore({
        dueAt: t.dueAt,
        priority: t.priority,
        createdAt: t.createdAt
      });
      return {
        ...t,
        urgencyScore,
        urgencyLabel: PriorityEngine.classifyPriority(urgencyScore)
      };
    });

    if (sortBy === 'urgency') {
      enriched.sort((a, b) => b.urgencyScore - a.urgencyScore);
    }

    return enriched;
  }

  /**
   * Lấy danh sách công việc quá hạn
   */
  static async getOverdueTasks(userId = 'owner_tri') {
    return await TaskEngine.getOverdueTasks(userId);
  }

  /**
   * Thống kê tóm tắt công việc trong tuần
   */
  static async getWeeklySummary(userId = 'owner_tri') {
    return await TaskEngine.getWeeklySummary(userId);
  }
}
