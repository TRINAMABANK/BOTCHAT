/**
 * SECRETARY & NOTIFICATION ROUTES
 * (BOTCHAT BRAIN 2.1 – THƯ KÝ RIÊNG CỦA ANH)
 * 
 * Enforces:
 * - requireAdmin on all routes (Only verified OWNER can access).
 * - BOLA protection: user cannot view or alter another's tasks or notifications.
 */

import express from 'express';
import { requireAdmin, optionalAuth } from '../middleware/authMiddleware.js';
import { NotificationEngine } from '../services/secretary/notificationEngine.js';
import { TaskEngine } from '../services/secretary/taskEngine.js';
import { ReminderEngine } from '../services/secretary/reminderEngine.js';
import { SecretaryAgent } from '../services/secretary/secretaryAgent.js';

const router = express.Router();

// -----------------------------------------------------------------------------
// 1. NOTIFICATIONS API
// -----------------------------------------------------------------------------

// GET /api/notifications/unread (Lấy danh sách chưa đọc & số lượng badge)
router.get('/notifications/unread', optionalAuth, async (req, res) => {
  try {
    // If user is not authenticated as owner, return empty (never leak)
    if (!req.user || req.user.role !== 'admin') {
      return res.json({ success: true, count: 0, notifications: [] });
    }

    const ownerId = req.user.id || 'owner_tri';
    const notifications = await NotificationEngine.getUnreadNotifications(ownerId);
    const count = notifications.length;

    res.json({ success: true, count, notifications });
  } catch (err) {
    console.error('[API NOTIFICATIONS UNREAD ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/notifications (Toàn bộ thông báo)
router.get('/notifications', requireAdmin, async (req, res) => {
  try {
    const ownerId = req.user?.id || 'owner_tri';
    const limit = parseInt(req.query.limit || '30', 10);
    const notifications = await NotificationEngine.getAllNotifications(ownerId, limit);
    const count = await NotificationEngine.getUnreadCount(ownerId);

    res.json({ success: true, count, notifications });
  } catch (err) {
    console.error('[API NOTIFICATIONS ALL ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/notifications/:id/read (Bấm "Đã xem")
// Nguyên tắc: Ẩn khỏi unread, ghi nhận read_at, KHÔNG hoàn thành công việc, KHÔNG xóa việc
router.post('/notifications/:id/read', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user?.id || 'owner_tri';
    const ipAddress = req.ip || req.connection?.remoteAddress || '127.0.0.1';

    const result = await NotificationEngine.markAsRead(id, ownerId, ipAddress);
    res.json(result);
  } catch (err) {
    console.error('[API NOTIFICATION READ ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/notifications/:id/reschedule (Bấm "Nhắc lại")
// Nguyên tắc: Mở lại ô chat với ngữ cảnh công việc đang chọn
router.post('/notifications/:id/reschedule', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { conversationId } = req.body;
    const ownerId = req.user?.id || 'owner_tri';

    const notif = await NotificationEngine.getNotificationById(id, ownerId);
    if (!notif) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy thông báo.' });
    }

    const task = notif.task_id ? await TaskEngine.getTaskById(notif.task_id, ownerId) : { task_id: notif.task_id, title: notif.title };

    // Nạp ngữ cảnh vào SecretaryAgent
    if (conversationId && task) {
      SecretaryAgent.prepareRescheduleContext(conversationId, task);
    }

    const timeDisplay = notif.remind_at ? new Date(notif.remind_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ngày ' + new Date(notif.remind_at).toLocaleDateString('vi-VN') : 'vừa qua';
    const promptReply = `Dạ, công việc **"${task?.title || notif.title}"** hiện tại đang được nhắc lúc **${timeDisplay}**. Anh muốn dời sang thời gian nào ạ?`;

    res.json({
      success: true,
      task,
      notification: notif,
      promptReply
    });
  } catch (err) {
    console.error('[API NOTIFICATION RESCHEDULE ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// -----------------------------------------------------------------------------
// 2. TASKS API
// -----------------------------------------------------------------------------

// GET /api/tasks
router.get('/tasks', requireAdmin, async (req, res) => {
  try {
    const ownerId = req.user?.id || 'owner_tri';
    const { status, date, limit } = req.query;
    const tasks = await TaskEngine.getTasks({
      ownerId,
      status,
      date,
      limit: parseInt(limit || '30', 10)
    });

    res.json({ success: true, tasks });
  } catch (err) {
    console.error('[API TASKS GET ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/tasks
router.post('/tasks', requireAdmin, async (req, res) => {
  try {
    const ownerId = req.user?.id || 'owner_tri';
    const { title, description, startAt, dueAt, priority } = req.body;
    const ipAddress = req.ip || req.connection?.remoteAddress || '127.0.0.1';

    const task = await TaskEngine.createTask({
      ownerId,
      title,
      description,
      startAt,
      dueAt,
      priority,
      ipAddress
    });

    if (dueAt) {
      await ReminderEngine.createReminder({
        taskId: task.task_id,
        ownerId,
        remindAt: dueAt,
        ipAddress
      });
    }

    res.json({ success: true, task });
  } catch (err) {
    console.error('[API TASKS CREATE ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/tasks/:id
router.patch('/tasks/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user?.id || 'owner_tri';
    const ipAddress = req.ip || req.connection?.remoteAddress || '127.0.0.1';

    const updated = await TaskEngine.updateTask(id, req.body, ownerId, ipAddress);
    res.json({ success: true, task: updated });
  } catch (err) {
    console.error('[API TASKS UPDATE ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
