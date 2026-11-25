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
import {
  CalendarEngine,
  RecurringScheduleEngine,
  FollowUpEngine,
  MultiChannelNotificationEngine,
  DailyBriefingEngine,
  SmartSchedulerEngine,
  PersonalAssistantEngine,
  TaskManagementEngine
} from '../services/assistant/index.js';

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

// -----------------------------------------------------------------------------
// 3. CALENDAR & ASSISTANT ENGINES API (MASTER PROMPT 03)
// -----------------------------------------------------------------------------

// GET /api/assistant/calendar
router.get('/assistant/calendar', requireAdmin, async (req, res) => {
  try {
    const userId = req.user?.id || 'owner_tri';
    const { startDate, endDate, status } = req.query;
    const events = await CalendarEngine.getEvents({ userId, startDate, endDate, status });
    res.json({ success: true, count: events.length, events });
  } catch (err) {
    console.error('[API CALENDAR GET ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/assistant/calendar
router.post('/assistant/calendar', requireAdmin, async (req, res) => {
  try {
    const userId = req.user?.id || 'owner_tri';
    const event = await CalendarEngine.createEvent({ ...req.body, userId });
    res.json({ success: true, event });
  } catch (err) {
    console.error('[API CALENDAR CREATE ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/assistant/calendar/:id
router.put('/assistant/calendar/:id', requireAdmin, async (req, res) => {
  try {
    const userId = req.user?.id || 'owner_tri';
    const updated = await CalendarEngine.updateEvent(req.params.id, req.body, userId);
    res.json({ success: true, event: updated });
  } catch (err) {
    console.error('[API CALENDAR UPDATE ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/assistant/calendar/:id
router.delete('/assistant/calendar/:id', requireAdmin, async (req, res) => {
  try {
    const userId = req.user?.id || 'owner_tri';
    await CalendarEngine.deleteEvent(req.params.id, userId);
    res.json({ success: true, message: 'Đã hủy sự kiện thành công.' });
  } catch (err) {
    console.error('[API CALENDAR DELETE ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/assistant/recurring
router.get('/assistant/recurring', requireAdmin, async (req, res) => {
  try {
    const userId = req.user?.id || 'owner_tri';
    const schedules = await RecurringScheduleEngine.getSchedules({ userId });
    res.json({ success: true, schedules });
  } catch (err) {
    console.error('[API RECURRING GET ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/assistant/recurring
router.post('/assistant/recurring', requireAdmin, async (req, res) => {
  try {
    const userId = req.user?.id || 'owner_tri';
    const schedule = await RecurringScheduleEngine.createSchedule({ ...req.body, userId });
    res.json({ success: true, schedule });
  } catch (err) {
    console.error('[API RECURRING CREATE ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/assistant/recurring/:id
router.delete('/assistant/recurring/:id', requireAdmin, async (req, res) => {
  try {
    const userId = req.user?.id || 'owner_tri';
    await RecurringScheduleEngine.deactivateSchedule(req.params.id, userId);
    res.json({ success: true, message: 'Đã hủy lịch định kỳ thành công.' });
  } catch (err) {
    console.error('[API RECURRING DEACTIVATE ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/assistant/follow-ups
router.get('/assistant/follow-ups', requireAdmin, async (req, res) => {
  try {
    const userId = req.user?.id || 'owner_tri';
    const rules = await FollowUpEngine.getActiveRules({ userId });
    res.json({ success: true, rules });
  } catch (err) {
    console.error('[API FOLLOW UPS GET ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/assistant/follow-ups
router.post('/assistant/follow-ups', requireAdmin, async (req, res) => {
  try {
    const userId = req.user?.id || 'owner_tri';
    const rule = await FollowUpEngine.createFollowUpRule({ ...req.body, userId });
    res.json({ success: true, rule });
  } catch (err) {
    console.error('[API FOLLOW UP CREATE ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/assistant/follow-ups/:id
router.delete('/assistant/follow-ups/:id', requireAdmin, async (req, res) => {
  try {
    const userId = req.user?.id || 'owner_tri';
    await FollowUpEngine.cancelRule(req.params.id, userId);
    res.json({ success: true, message: 'Đã hủy theo dõi thành công.' });
  } catch (err) {
    console.error('[API FOLLOW UP CANCEL ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/assistant/preferences
router.get('/assistant/preferences', requireAdmin, async (req, res) => {
  try {
    const userId = req.user?.id || 'owner_tri';
    const preferences = await MultiChannelNotificationEngine.getUserPreferences(userId);
    res.json({ success: true, preferences });
  } catch (err) {
    console.error('[API PREFERENCES GET ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/assistant/preferences
router.put('/assistant/preferences', requireAdmin, async (req, res) => {
  try {
    const userId = req.user?.id || 'owner_tri';
    const preferences = await MultiChannelNotificationEngine.updateUserPreferences(userId, req.body);
    res.json({ success: true, preferences });
  } catch (err) {
    console.error('[API PREFERENCES UPDATE ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/assistant/briefing/morning
router.get('/assistant/briefing/morning', requireAdmin, async (req, res) => {
  try {
    const userId = req.user?.id || 'owner_tri';
    const briefing = await DailyBriefingEngine.generateMorningBriefing(userId);
    res.json({ success: true, briefing });
  } catch (err) {
    console.error('[API MORNING BRIEFING ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/assistant/briefing/evening
router.get('/assistant/briefing/evening', requireAdmin, async (req, res) => {
  try {
    const userId = req.user?.id || 'owner_tri';
    const recap = await DailyBriefingEngine.generateEveningRecap(userId);
    res.json({ success: true, recap });
  } catch (err) {
    console.error('[API EVENING RECAP ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/assistant/scheduler/free-slots
router.get('/assistant/scheduler/free-slots', requireAdmin, async (req, res) => {
  try {
    const userId = req.user?.id || 'owner_tri';
    const { date, durationMinutes } = req.query;
    const slots = await SmartSchedulerEngine.findFreeSlots({
      userId,
      date: date ? new Date(date) : new Date(),
      durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : 60
    });
    res.json({ success: true, slots });
  } catch (err) {
    console.error('[API FREE SLOTS ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/assistant/chat (Trực tiếp tương tác với PersonalAssistantEngine)
router.post('/assistant/chat', requireAdmin, async (req, res) => {
  try {
    const userId = req.user?.id || 'owner_tri';
    const { message } = req.body;
    const ipAddress = req.ip || req.connection?.remoteAddress || '127.0.0.1';
    const result = await PersonalAssistantEngine.handleMessage({
      userId,
      text: message,
      role: 'OWNER',
      ipAddress
    });
    res.json({ success: true, result });
  } catch (err) {
    console.error('[API ASSISTANT CHAT ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
