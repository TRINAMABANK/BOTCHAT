/**
 * SECRETARY AGENT – TRỢ LÝ THƯ KÝ CÁ NHÂN THÔNG MINH CỦA ANH TRÍ
 * (BOTCHAT BRAIN 2.1 – THƯ KÝ RIÊNG CỦA ANH)
 * 
 * Capabilities:
 * - Kích hoạt chế độ Thư ký riêng qua câu: "Thư ký của anh"
 * - Chỉ cho phép OWNER đã xác thực Backend (Anti-Impersonation)
 * - Giao việc hoàn toàn qua MỘT Ô CHAT DUY NHẤT
 * - Nhận diện ngày giờ tự nhiên, hỏi lại ngay trong chat nếu thiếu giờ
 * - Quản lý công việc (Hôm nay, Quá hạn, Tổng hợp tuần, Dời lịch, Hoàn thành)
 * - Tiếp tục ngữ cảnh khi bấm nút "Nhắc lại" từ thông báo
 */

import { TaskEngine } from './taskEngine.js';
import { ReminderEngine } from './reminderEngine.js';
import { NotificationEngine } from './notificationEngine.js';
import { AuditLogService } from './auditLogService.js';
import MemoryEngine from '../intelligence/memoryEngine.js';
import ResponseEngine from '../intelligence/responseEngine.js';
import { ActiveProductContext } from '../intelligence/activeProductContext.js';
import { PersonalAssistantEngine } from '../assistant/personalAssistantEngine.js';

// In-memory clarification state per conversation: { taskTitle, dueDay, pendingField, targetTaskId }
const clarificationSessions = new Map();

export class SecretaryAgent {
  /**
   * Helper parse date and time from Vietnamese text
   */
  static parseDateTimeSpec(text = '') {
    const raw = text.toLowerCase().trim();
    const now = new Date(); // Local / Server time

    let targetDate = new Date(now);
    let hasExplicitDate = false;
    let hasExplicitTime = false;
    let rawDateStr = '';
    let rawTimeStr = '';

    // 1. Phân tích Ngày
    if (/ngày mai|ngay mai|mai\b/i.test(raw)) {
      targetDate.setDate(targetDate.getDate() + 1);
      hasExplicitDate = true;
      rawDateStr = 'ngày mai';
    } else if (/hôm nay|hom nay|nay\b/i.test(raw)) {
      hasExplicitDate = true;
      rawDateStr = 'hôm nay';
    } else if (/ngày kia|ngay kia/i.test(raw)) {
      targetDate.setDate(targetDate.getDate() + 2);
      hasExplicitDate = true;
      rawDateStr = 'ngày kia';
    } else {
      // Thứ trong tuần (Thứ 2 -> Thứ 7, Chủ nhật)
      const thuMatch = raw.match(/thứ\s*([2-7]|hai|ba|tư|tu|năm|nam|sáu|sau|bảy|bay)|chủ\s*nhật|chu\s*nhat/i);
      if (thuMatch) {
        hasExplicitDate = true;
        const targetDayMap = {
          '2': 1, 'hai': 1,
          '3': 2, 'ba': 2,
          '4': 3, 'tư': 3, 'tu': 3,
          '5': 4, 'năm': 4, 'nam': 4,
          '6': 5, 'sáu': 5, 'sau': 5,
          '7': 6, 'bảy': 6, 'bay': 6,
          'chủ nhật': 0, 'chu nhat': 0
        };
        const dayKey = (thuMatch[1] || 'chủ nhật').toLowerCase();
        const targetDay = targetDayMap[dayKey] !== undefined ? targetDayMap[dayKey] : 5;
        const currentDay = now.getDay();
        let daysAhead = targetDay - currentDay;
        if (daysAhead <= 0) daysAhead += 7; // Next occurrence
        targetDate.setDate(targetDate.getDate() + daysAhead);
        const dayNames = {
          '2': 'thứ Hai', 'hai': 'thứ Hai',
          '3': 'thứ Ba', 'ba': 'thứ Ba',
          '4': 'thứ Tư', 'tư': 'thứ Tư', 'tu': 'thứ Tư',
          '5': 'thứ Năm', 'năm': 'thứ Năm', 'nam': 'thứ Năm',
          '6': 'thứ Sáu', 'sáu': 'thứ Sáu', 'sau': 'thứ Sáu',
          '7': 'thứ Bảy', 'bảy': 'thứ Bảy', 'bay': 'thứ Bảy',
          'chủ nhật': 'Chủ Nhật', 'chu nhat': 'Chủ Nhật'
        };
        rawDateStr = dayNames[dayKey] || `thứ ${dayKey}`;
      } else {
        // Ngày cụ thể dd/mm hoặc dd tháng mm
        const dateMatch = raw.match(/(?:ngày\s+)?(\d{1,2})(?:[\/\-]|\s+tháng\s+)(\d{1,2})(?:[\/\-](\d{4}))?/i);
        if (dateMatch) {
          hasExplicitDate = true;
          const day = parseInt(dateMatch[1], 10);
          const month = parseInt(dateMatch[2], 10) - 1;
          const year = dateMatch[3] ? parseInt(dateMatch[3], 10) : now.getFullYear();
          targetDate.setFullYear(year, month, day);
          rawDateStr = `ngày ${day}/${month + 1}`;
        }
      }
    }

    // 2. Phân tích Giờ
    let hour = 8; // Default morning
    let minute = 0;

    const timeMatch = raw.match(/(\d{1,2})(?::(\d{2})|h(?:(\d{2}))?|\s*giờ(?:\s*(\d{2}))?)\s*(sáng|trưa|chiều|tối)?/i);
    if (timeMatch) {
      hasExplicitTime = true;
      hour = parseInt(timeMatch[1], 10);
      minute = parseInt(timeMatch[2] || timeMatch[3] || timeMatch[4] || '0', 10);
      const period = (timeMatch[5] || '').toLowerCase();

      if ((period === 'chiều' || period === 'tối') && hour < 12) {
        hour += 12;
      } else if (period === 'sáng' && hour === 12) {
        hour = 0;
      }
      rawTimeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    } else if (/sáng|buổi sáng/i.test(raw)) {
      hour = 8;
      minute = 0;
      hasExplicitTime = true;
      rawTimeStr = '08:00';
    } else if (/trưa|buổi trưa/i.test(raw)) {
      hour = 12;
      minute = 0;
      hasExplicitTime = true;
      rawTimeStr = '12:00';
    } else if (/chiều|buổi chiều/i.test(raw)) {
      hour = 14;
      minute = 0;
      hasExplicitTime = true;
      rawTimeStr = '14:00';
    } else if (/tối|buổi tối/i.test(raw)) {
      hour = 20;
      minute = 0;
      hasExplicitTime = true;
      rawTimeStr = '20:00';
    }

    targetDate.setHours(hour, minute, 0, 0);

    return {
      isoString: targetDate.toISOString(),
      hasExplicitDate,
      hasExplicitTime,
      rawDateStr,
      rawTimeStr,
      formattedTime: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      formattedDate: `${targetDate.getDate()}/${targetDate.getMonth() + 1}/${targetDate.getFullYear()}`
    };
  }

  /**
   * Main entry point for AI Secretary Conversation
   */
  static async handleSecretaryConversation(context = {}) {
    const {
      message = '',
      conversationId = 'default_conv',
      userContext = {},
      intentResult = {}
    } = context;

    const unaccented = message
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .toLowerCase()
      .trim();

    // -------------------------------------------------------------
    // 0. BẢO MẬT & PHÂN QUYỀN OWNER BACKEND (Defense-in-depth)
    // -------------------------------------------------------------
    if (!userContext.isOwner && userContext.role !== 'OWNER' && userContext.role !== 'admin') {
      return ResponseEngine.formatResponse({
        replyText: `Dạ, chức năng Thư ký riêng chỉ dành cho Chủ nhân tài khoản (Anh Trí) đã đăng nhập xác thực bảo mật. Nếu anh là chủ tài khoản, vui lòng đăng nhập qua Bảng Quản trị để sử dụng tính năng này ạ.`,
        revealCatalog: false,
        stage: 'ACCESS_RESTRICTED',
        toolsUsed: ['secretary_security_gate']
      });
    }

    const ownerId = userContext.userId || 'owner_tri';

    // -------------------------------------------------------------
    // 1. KÍCH HOẠT CHẾ ĐỘ THƯ KÝ RIÊNG ("Thư ký của anh")
    // -------------------------------------------------------------
    const isActivation = /^(thu ky cua anh|thu ky rieng cua anh|em la thu ky cua anh|bat thu ky|kich hoat thu ky)/i.test(unaccented);
    if (isActivation) {
      clarificationSessions.delete(conversationId);
      return ResponseEngine.formatResponse({
        replyText: `Dạ, em đây anh Trí. Từ bây giờ em sẽ hỗ trợ anh quản lý công việc, ghi nhớ thông tin, lập lịch nhắc và theo dõi tiến độ. Anh cứ giao việc trực tiếp trong ô chat nhé.`,
        revealCatalog: false,
        stage: 'SECRETARY_ACTIVATED',
        toolsUsed: ['secretary_activation']
      });
    }

    // -------------------------------------------------------------
    // 1B. NÂNG CẤP TRỢ LÝ THƯ KÝ ĐA NĂNG (MASTER PROMPT 03: RECURRING, FOLLOW-UP, BRIEFING, CALENDAR)
    // -------------------------------------------------------------
    const assistantResult = await PersonalAssistantEngine.handleMessage({
      userId: ownerId,
      text: message,
      role: userContext.role || 'OWNER',
      ipAddress: context.ipAddress || '127.0.0.1'
    });

    if (assistantResult && assistantResult.handled && assistantResult.action !== 'ACTIVATE_SECRETARY') {
      return ResponseEngine.formatResponse({
        replyText: assistantResult.message,
        revealCatalog: false,
        stage: assistantResult.action,
        toolsUsed: ['personal_assistant_engine']
      });
    }

    // -------------------------------------------------------------
    // 2. KIỂM TRA TRẠNG THÁI CHỜ HỎI LẠI THÔNG TIN (Clarification in chat)
    // -------------------------------------------------------------
    const pendingClarification = clarificationSessions.get(conversationId);
    if (pendingClarification) {
      if (pendingClarification.action === 'ASK_TIME') {
        const timeParsed = this.parseDateTimeSpec(message);
        if (timeParsed.hasExplicitTime) {
          // Người dùng đã trả lời giờ (Ví dụ "8 giờ sáng")
          clarificationSessions.delete(conversationId);

          // Tạo công việc
          const task = await TaskEngine.createTask({
            ownerId,
            title: pendingClarification.taskTitle,
            dueAt: timeParsed.isoString,
            priority: pendingClarification.priority || 'NORMAL'
          });

          // Tạo lịch nhắc
          await ReminderEngine.createReminder({
            taskId: task.task_id,
            ownerId,
            remindAt: timeParsed.isoString
          });

          const reply = `Dạ, em đã tạo lịch nhắc lúc ${timeParsed.formattedTime} ${pendingClarification.dueDay || ''} cho công việc **"${pendingClarification.taskTitle}"** của Anh Trí (đã ghi nhận nhiệm vụ vào To-do List). Em sẽ thông báo cho anh tại nút Nhắc việc.`;

          return ResponseEngine.formatResponse({
            replyText: reply,
            revealCatalog: false,
            stage: 'OWNER_TASK_RECORDED',
            toolsUsed: ['secretary_task_engine', 'secretary_reminder_engine']
          });
        }
      } else if (pendingClarification.action === 'RESCHEDULE_TASK') {
        // Đang chờ giờ mới để dời lịch
        const timeParsed = this.parseDateTimeSpec(message);
        if (timeParsed.hasExplicitTime || timeParsed.hasExplicitDate) {
          clarificationSessions.delete(conversationId);

          await ReminderEngine.rescheduleReminder({
            taskId: pendingClarification.targetTaskId,
            newRemindAt: timeParsed.isoString,
            ownerId
          });

          const reply = `Dạ, em đã dời lịch nhắc công việc **"${pendingClarification.taskTitle}"** sang lúc **${timeParsed.formattedTime} ngày ${timeParsed.formattedDate}**. Em sẽ thông báo cho anh tại nút Nhắc việc ạ.`;

          return ResponseEngine.formatResponse({
            replyText: reply,
            revealCatalog: false,
            stage: 'OWNER_TASK_RESCHEDULED',
            toolsUsed: ['secretary_reminder_engine']
          });
        }
      }
    }

    // -------------------------------------------------------------
    // 3. HOÀN THÀNH CÔNG VIỆC ("Việc báo cáo tháng đã hoàn thành", "Hoàn thành việc...")
    // -------------------------------------------------------------
    const isComplete = /(?:hoan thanh|da hoan thanh|xong roi|da xong|lam xong)\s*(?:viec|cong viec|nhiem vu)?/i.test(unaccented);
    if (isComplete) {
      const cleanKeyword = message
        .replace(/(?:đã hoàn thành|hoàn thành|xong rồi|đã xong|làm xong|việc|công việc|nhiệm vụ|giúp anh|cho anh)/gi, '')
        .trim();

      const res = await TaskEngine.completeTask(cleanKeyword || 'gần nhất', ownerId);
      if (res.success) {
        return ResponseEngine.formatResponse({
          replyText: `Dạ thưa Anh Trí, em đã cập nhật trạng thái **Hoàn thành** cho công việc: **"${res.task.title}"** rồi ạ. 🎉`,
          revealCatalog: false,
          stage: 'OWNER_TASK_COMPLETED',
          toolsUsed: ['secretary_task_engine']
        });
      } else {
        return ResponseEngine.formatResponse({
          replyText: `Dạ thưa Anh Trí, ${res.message} Anh có thể nêu rõ tên việc hoặc số thứ tự công việc cần hoàn thành nhé ạ.`,
          revealCatalog: false,
          stage: 'OWNER_TASK_NOT_FOUND',
          toolsUsed: ['secretary_task_engine']
        });
      }
    }

    // -------------------------------------------------------------
    // 4. DỜI LỊCH NHẮC CÔNG VIỆC ("Dời lịch nhắc việc này sang 9 giờ sáng mai", "Dời việc số 2")
    // -------------------------------------------------------------
    const isReschedule = /(?:doi\s+lich|doi\s+sang|chuyen\s+sang|lui\s+lich|doi\s+viec)/i.test(unaccented);
    if (isReschedule) {
      const timeParsed = this.parseDateTimeSpec(message);
      // Tìm công việc cần dời
      const targetTask = await TaskEngine.findTaskByKeyword(ownerId, message);

      if (!targetTask) {
        return ResponseEngine.formatResponse({
          replyText: `Dạ thưa Anh Trí, em chưa tìm thấy công việc tương ứng để dời lịch. Anh có thể nói rõ tên việc hoặc số thứ tự công việc được không ạ?`,
          revealCatalog: false,
          stage: 'TASK_RESCHEDULE_CLARIFICATION'
        });
      }

      if (!timeParsed.hasExplicitTime && !timeParsed.hasExplicitDate) {
        // Chưa có thời gian mới -> Hỏi lại
        clarificationSessions.set(conversationId, {
          action: 'RESCHEDULE_TASK',
          targetTaskId: targetTask.task_id,
          taskTitle: targetTask.title
        });

        const activeRem = await ReminderEngine.getActiveReminderForTask(targetTask.task_id, ownerId);
        const oldTime = activeRem ? new Date(activeRem.remind_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ngày ' + new Date(activeRem.remind_at).toLocaleDateString('vi-VN') : 'chưa xác định';

        return ResponseEngine.formatResponse({
          replyText: `Dạ, công việc **"${targetTask.title}"** hiện tại đang được nhắc lúc **${oldTime}**. Anh muốn dời sang thời gian nào ạ?`,
          revealCatalog: false,
          stage: 'TASK_RESCHEDULE_ASK_TIME'
        });
      } else {
        // Đã có thời gian mới -> Cập nhật ngay
        await ReminderEngine.rescheduleReminder({
          taskId: targetTask.task_id,
          newRemindAt: timeParsed.isoString,
          ownerId
        });

        return ResponseEngine.formatResponse({
          replyText: `Dạ, em đã dời lịch nhắc công việc **"${targetTask.title}"** sang lúc **${timeParsed.formattedTime} ngày ${timeParsed.formattedDate}**. Em sẽ thông báo cho anh tại nút Nhắc việc ạ.`,
          revealCatalog: false,
          stage: 'OWNER_TASK_RESCHEDULED',
          toolsUsed: ['secretary_reminder_engine']
        });
      }
    }

    // -------------------------------------------------------------
    // 5. TRUY VẤN CÔNG VIỆC / LỊCH TRÌNH / TO-DO LIST
    // e.g. "Hôm nay anh còn những việc gì?", "Cho tôi xem danh sách việc cần làm", "Xem lịch trình"
    // -------------------------------------------------------------
    const isAgendaQuery = /(?:hom nay\s+(?:anh|toi)\s+con\s+(?:nhung\s+)?viec|viec\s+hom\s+nay|lich\s+trinh|danh\s+sach\s+viec|to[\s\-]do\s+list|viec\s+can\s+lam)/i.test(unaccented) ||
      intentResult.primaryIntent === 'OWNER_DAILY_PLAN';

    if (isAgendaQuery) {
      const isSpecificToday = /(?:hom nay|ngay hom nay)/i.test(unaccented);
      const today = new Date().toISOString().slice(0, 10);
      const tasks = isSpecificToday
        ? await TaskEngine.getTasks({ ownerId, date: today, limit: 15 })
        : await TaskEngine.getTasks({ ownerId, limit: 15 });

      if (tasks.length === 0) {
        return ResponseEngine.formatResponse({
          replyText: `Dạ thưa Anh Trí, hiện tại trong TO-DO LIST & LỊCH TRÌNH anh không có công việc tồn đọng nào cần xử lý ạ. Anh cứ thảnh thơi nhé hoặc giao thêm việc mới cho em bất cứ lúc nào!`,
          revealCatalog: false,
          stage: 'OWNER_AGENDA_VIEW'
        });
      }

      const lines = tasks.map((t, idx) => {
        const timeStr = t.due_at ? new Date(t.due_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Trong ngày';
        const stt = t.status === 'COMPLETED' ? '✅ Hoàn thành' : (t.status === 'IN_PROGRESS' ? '⏳ Đang làm' : '📌 Chưa làm');
        return `${idx + 1}. [${timeStr}] **${t.title}** (${stt})`;
      }).join('\n');

      return ResponseEngine.formatResponse({
        replyText: `📋 **TO-DO LIST & LỊCH TRÌNH CÔNG VIỆC CỦA ANH TRÍ:**\n\n${lines}\n\nAnh cần em cập nhật hoặc nhắc việc nào cứ nhắn em nhé.`,
        revealCatalog: false,
        stage: 'OWNER_AGENDA_VIEW'
      });
    }

    // -------------------------------------------------------------
    // 6. TRUY VẤN CÔNG VIỆC QUÁ HẠN ("Việc nào đang quá hạn?")
    // -------------------------------------------------------------
    const isOverdueQuery = /(?:viec\s+nao\s+dang\s+qua\s+han|qua\s+han|tre\s+han)/i.test(unaccented);
    if (isOverdueQuery) {
      const overdueTasks = await TaskEngine.getOverdueTasks(ownerId);
      if (overdueTasks.length === 0) {
        return ResponseEngine.formatResponse({
          replyText: `Dạ thưa Anh Trí, tuyệt vời là hiện tại không có công việc nào bị quá hạn ạ! Mọi tiến độ đều đang được đảm bảo chuẩn mực.`,
          revealCatalog: false,
          stage: 'OWNER_OVERDUE_VIEW'
        });
      }

      const lines = overdueTasks.map((t, idx) => {
        const dueStr = t.due_at ? new Date(t.due_at).toLocaleString('vi-VN') : 'Không rõ';
        return `${idx + 1}. ⚠️ **${t.title}** (Hạn chót: \`${dueStr}\` - Ưu tiên: **${t.priority}**)`;
      }).join('\n');

      return ResponseEngine.formatResponse({
        replyText: `Dạ thưa Anh Trí, các công việc đang bị quá hạn gồm có:\n\n${lines}\n\nAnh có muốn dời lịch nhắc hoặc đánh dấu hoàn thành việc nào không ạ?`,
        revealCatalog: false,
        stage: 'OWNER_OVERDUE_VIEW'
      });
    }

    // -------------------------------------------------------------
    // 7. TỔNG HỢP CÔNG VIỆC TUẦN NÀY ("Tổng hợp công việc tuần này cho anh")
    // -------------------------------------------------------------
    const isWeeklyQuery = /(?:tong\s+hop\s+cong\s+viec\s+tuan|bao\s+cao\s+tuan|viec\s+tuan\s+nay)/i.test(unaccented);
    if (isWeeklyQuery) {
      const summary = await TaskEngine.getWeeklySummary(ownerId);
      const reply = `Dạ thưa Anh Trí, em xin phép tổng hợp tình hình công việc tuần này (${summary.range.from} - ${summary.range.to}) của anh ạ:\n\n` +
        `📊 **TỔNG KẾT TIẾN ĐỘ TUẦN:**\n` +
        `• 🎯 **Tổng số công việc:** **${summary.total}** việc\n` +
        `• ✅ **Đã hoàn thành:** **${summary.completed.length}** việc\n` +
        `• ⏳ **Đang thực hiện:** **${summary.inProgress.length}** việc\n` +
        `• 🕒 **Đang chờ xử lý:** **${summary.pending.length}** việc\n` +
        `• ⚠️ **Quá hạn cần lưu ý:** **${summary.overdue.length}** việc\n\n` +
        (summary.overdue.length > 0 ? `👉 *Anh có ${summary.overdue.length} việc quá hạn, anh có muốn dời lịch sang tuần sau không ạ?*` : `✨ *Tiến độ tuần của anh đang rất tốt ạ!*`);

      return ResponseEngine.formatResponse({
        replyText: reply,
        revealCatalog: false,
        stage: 'OWNER_WEEKLY_SUMMARY'
      });
    }

    // -------------------------------------------------------------
    // 8. LƯU THÔNG TIN DÀI HẠN ("Lưu lại thông tin nhà cung cấp này")
    // -------------------------------------------------------------
    const isSaveInfo = /(?:luu\s+lai\s+thong\s+tin|ghi\s+nho\s+thong\s+tin|luu\s+thong\s+tin)/i.test(unaccented);
    if (isSaveInfo) {
      await MemoryEngine.rememberCustomerFact({
        userId: ownerId,
        orgId: userContext.orgId || 'org_default',
        memoryType: 'OWNER_NOTE',
        key: `note_${Date.now()}`,
        value: message
      });

      return ResponseEngine.formatResponse({
        replyText: `Dạ, em đã lưu lại thông tin này vào bộ nhớ dài hạn của anh Trí rồi ạ. Khi cần tra cứu lại thông tin nhà cung cấp, anh cứ bảo em nhé!`,
        revealCatalog: false,
        stage: 'OWNER_NOTE_SAVED'
      });
    }

    // -------------------------------------------------------------
    // 9. GIAO VIỆC & TẠO LỊCH NHẮC MỚI TỰ NHIÊN
    // e.g. "Thư ký, ngày mai nhắc anh gọi nhà cung cấp."
    //      "Thứ Sáu nhắc anh hoàn thành báo cáo mua sắm."
    //      "Ngày 30/11 nhắc anh kiểm tra tiến độ đơn hàng PO."
    // -------------------------------------------------------------
    const isTaskCreation = /(?:nhac\s+(?:anh|toi)|len\s+lich|tao\s+viec|them\s+viec|ghi\s+viec)/i.test(unaccented) ||
      intentResult.primaryIntent === 'SECRETARY_TASK' ||
      intentResult.primaryIntent === 'REMINDER';

    if (isTaskCreation) {
      // 1. Trích xuất nội dung công việc
      let cleanTask = message
        .replace(/^(?:thư ký(?: ơi| riêng)?(?:,)?\s*)/i, '')
        .replace(/(?:ngày mai|sáng mai|chiều mai|tối mai|trưa mai|hôm nay|thứ [2-7]|thứ hai|thứ ba|thứ tư|thứ năm|thứ sáu|thứ bảy|chủ nhật|ngày \d+[\/\-]\d+|\d+h|\d+\s*giờ(?:\s*sáng|\s*chiều)?)/gi, '')
        .replace(/(?:nhắc anh|nhắc tôi|lên lịch|tạo việc|thêm việc|ghi việc|nhớ nhắc|giúp anh|cho anh)/gi, '')
        .trim();

      // Bỏ các từ nối đầu câu thừa
      cleanTask = cleanTask.replace(/^(?:là|rằng|về việc|việc)\s+/i, '').trim();
      if (!cleanTask || cleanTask.length < 2) {
        cleanTask = 'Công việc cần thực hiện';
      }

      // Viết hoa chữ cái đầu
      cleanTask = cleanTask.charAt(0).toUpperCase() + cleanTask.slice(1);

      // 2. Phân tích Ngày và Giờ
      const timeParsed = this.parseDateTimeSpec(message);

      // Nếu có ngày (ví dụ "thứ Sáu" hoặc "ngày mai") nhưng THIẾU GIỜ CỤ THỂ
      if (timeParsed.hasExplicitDate && !timeParsed.hasExplicitTime) {
        // Lưu trạng thái chờ hỏi lại
        clarificationSessions.set(conversationId, {
          action: 'ASK_TIME',
          taskTitle: cleanTask,
          dueDay: timeParsed.rawDateStr || 'Thứ Sáu',
          priority: 'NORMAL'
        });

        const dayDisplay = timeParsed.rawDateStr ? (timeParsed.rawDateStr.charAt(0).toUpperCase() + timeParsed.rawDateStr.slice(1)) : 'Thứ Sáu';
        const reply = `Dạ, em đã ghi nhận công việc: **${cleanTask}**. Hạn thực hiện: **${dayDisplay}**. Anh muốn em nhắc lúc mấy giờ ạ?`;

        return ResponseEngine.formatResponse({
          replyText: reply,
          revealCatalog: false,
          stage: 'TASK_CLARIFICATION_ASK_TIME'
        });
      }

      // Nếu đã có đủ ngày và giờ (hoặc mặc định đầy đủ)
      const task = await TaskEngine.createTask({
        ownerId,
        title: cleanTask,
        dueAt: timeParsed.isoString,
        priority: 'NORMAL'
      });

      await ReminderEngine.createReminder({
        taskId: task.task_id,
        ownerId,
        remindAt: timeParsed.isoString
      });

      const dayDisplay = timeParsed.rawDateStr ? timeParsed.rawDateStr : `ngày ${timeParsed.formattedDate}`;
      const reply = `Dạ, em đã tạo lịch nhắc lúc ${timeParsed.formattedTime} ${dayDisplay} cho công việc **"${cleanTask}"** của Anh Trí (đã ghi nhận nhiệm vụ vào To-do List). Em sẽ thông báo cho anh tại nút Nhắc việc.`;

      return ResponseEngine.formatResponse({
        replyText: reply,
        revealCatalog: false,
        stage: 'OWNER_TASK_RECORDED',
        toolsUsed: ['secretary_task_engine', 'secretary_reminder_engine']
      });
    }

    // Mặc định phản hồi thư ký hỗ trợ chung
    return ResponseEngine.formatResponse({
      replyText: `Dạ em đây anh Trí. Anh có cần em ghi nhận công việc, kiểm tra lịch trình hay hỗ trợ soạn thảo gì không ạ? Anh cứ giao việc trực tiếp trong ô chat nhé.`,
      revealCatalog: false,
      stage: 'SECRETARY_GENERAL_READY'
    });
  }

  /**
   * Helper nạp ngữ cảnh khi bấm nút "Nhắc lại" trên danh sách thông báo
   */
  static prepareRescheduleContext(conversationId, task) {
    if (!conversationId || !task) return;
    clarificationSessions.set(conversationId, {
      action: 'RESCHEDULE_TASK',
      targetTaskId: task.task_id,
      taskTitle: task.title
    });
  }

  /**
   * Check if conversation currently has pending clarification
   */
  static hasPendingClarification(conversationId) {
    return Boolean(conversationId && clarificationSessions.has(conversationId));
  }
}

export default SecretaryAgent;
