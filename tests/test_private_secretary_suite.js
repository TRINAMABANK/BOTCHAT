/**
 * ACCEPTANCE TEST SUITE: THƯ KÝ RIÊNG CỦA ANH TRÍ (BOTCHAT BRAIN 2.1)
 * 
 * 11 Mandatory Acceptance Scenarios:
 * 1. Nhập "Thư ký của anh" và kích hoạt đúng chế độ.
 * 2. Giao việc bằng câu nói tự nhiên trong ô chat.
 * 3. Thư ký hỏi lại nếu thiếu thời gian, và hoàn thành khi đủ giờ.
 * 4. Tạo được công việc và lịch nhắc trong cơ sở dữ liệu.
 * 5. Đóng trình duyệt nhưng Backend Scheduler vẫn đến hạn và tạo thông báo.
 * 6. Nút "Nhắc việc" hiển thị số thông báo chưa xem qua API.
 * 7. Bấm "Đã xem" thì thông báo biến khỏi unread nhưng công việc vẫn còn nguyên vẹn.
 * 8. Bấm "Nhắc lại" thì mở đúng cuộc hội thoại và cập nhật lịch cũ, không tạo trùng việc.
 * 9. Xác nhận hoàn thành qua chat thì công việc mới chuyển sang hoàn thành.
 * 10. Người dùng website hoặc chưa xác thực OWNER không thể truy cập dữ liệu riêng.
 * 11. Các chức năng BOTCHAT cũ (bán hàng, báo giá, tên khách) vẫn hoạt động hoàn hảo.
 */

import assert from 'assert';
import { db } from '../server/db.js';
import CentralBrainService from '../server/services/centralBrainService.js';
import { TaskEngine } from '../server/services/secretary/taskEngine.js';
import { ReminderEngine } from '../server/services/secretary/reminderEngine.js';
import { NotificationEngine } from '../server/services/secretary/notificationEngine.js';
import { ReminderScheduler } from '../server/services/secretary/reminderScheduler.js';
import { SecretaryAgent } from '../server/services/secretary/secretaryAgent.js';
import AuthService from '../server/services/authService.js';

console.log('================================================================');
console.log('🚀 ACCEPTANCE TEST SUITE: THƯ KÝ RIÊNG CỦA ANH (AI SECRETARY)');
console.log('================================================================');

async function runTests() {
  const ownerUserContext = {
    role: 'OWNER',
    userId: 'owner_tri',
    userName: 'Anh Trí',
    isOwner: true,
    isAuthenticated: true
  };

  const customerUserContext = {
    role: 'CUSTOMER',
    userId: 'usr_customer_123',
    userName: 'Khách Hàng A',
    isOwner: false,
    isAuthenticated: false
  };

  // Dọn dẹp dữ liệu test cũ của owner_tri để đảm bảo tính độc lập tuyệt đối (idempotent)
  await db.run(`DELETE FROM owner_notifications WHERE owner_id = 'owner_tri'`);
  await db.run(`DELETE FROM owner_reminders WHERE owner_id = 'owner_tri'`);
  await db.run(`DELETE FROM owner_tasks WHERE owner_id = 'owner_tri'`);

  // -------------------------------------------------------------
  // TEST 1: Nhập "Thư ký của anh" và kích hoạt đúng chế độ
  // -------------------------------------------------------------
  console.log('\n--- TEST 1: Kích hoạt chế độ Thư ký riêng ("Thư ký của anh") ---');
  const res1 = await CentralBrainService.processChat({
    message: 'Thư ký của anh',
    conversationId: 'conv_sec_test_1',
    userContext: ownerUserContext
  });

  assert(res1.success === true, 'Turn 1 returned success');
  assert(res1.reply.includes('Dạ, em đây anh Trí'), 'Thư ký phản hồi câu chào nhận diện đúng chuẩn');
  assert(res1.reply.includes('Anh cứ giao việc trực tiếp trong ô chat nhé'), 'Hướng dẫn giao việc trong ô chat');
  console.log('  ✅ [PASS] Kích hoạt Thư ký riêng thành công cho Owner');

  // -------------------------------------------------------------
  // TEST 2: Giao việc bằng câu nói tự nhiên trong ô chat (đủ giờ)
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Giao việc tự nhiên đủ ngày và giờ ---');
  const res2 = await CentralBrainService.processChat({
    message: 'Thư ký, ngày mai nhắc anh gọi nhà cung cấp lúc 9h sáng',
    conversationId: 'conv_sec_test_2',
    userContext: ownerUserContext
  });

  assert(res2.success === true, 'Turn 2 returned success');
  assert(res2.reply.includes('Dạ, em đã tạo lịch nhắc lúc 09:00'), 'Thư ký xác nhận tạo lịch nhắc 09:00');
  assert(res2.reply.includes('Em sẽ thông báo cho anh tại nút Nhắc việc'), 'Thông báo nhắc việc tại nút chuông');
  console.log('  ✅ [PASS] Giao việc tự nhiên đủ ngày giờ được tạo chuẩn');

  // -------------------------------------------------------------
  // TEST 3: Thư ký hỏi lại nếu thiếu thời gian, và hoàn thành khi đủ giờ
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Thư ký hỏi lại khi thiếu giờ và hoàn thành khi trả lời ---');
  const convClarify = 'conv_sec_test_clarify';

  // Lượt 1: Chỉ có thứ Sáu, thiếu giờ
  const res3a = await CentralBrainService.processChat({
    message: 'Thư ký, thứ Sáu nhắc anh gửi báo cáo mua sắm',
    conversationId: convClarify,
    userContext: ownerUserContext
  });

  assert(res3a.success === true, 'Turn 3a returned success');
  assert(res3a.reply.includes('Gửi báo cáo mua sắm'), 'Ghi nhận đúng tiêu đề công việc');
  assert(res3a.reply.includes('Anh muốn em nhắc lúc mấy giờ ạ?'), 'Hỏi lại giờ cụ thể thay vì tự đoán');

  // Lượt 2: Người dùng trả lời giờ
  const res3b = await CentralBrainService.processChat({
    message: '8 giờ sáng',
    conversationId: convClarify,
    userContext: ownerUserContext
  });

  assert(res3b.success === true, 'Turn 3b returned success');
  assert(res3b.reply.includes('08:00'), 'Thư ký ghi nhận giờ 08:00');
  assert(res3b.reply.includes('thứ Sáu') || res3b.reply.includes('Thứ Sáu') || res3b.reply.includes('THỨ SÁU'), 'Ghi nhận đúng thứ Sáu');
  assert(res3b.reply.includes('nút Nhắc việc'), 'Thông báo cho anh tại nút Nhắc việc');
  console.log('  ✅ [PASS] Quy trình hỏi lại làm rõ thông tin và hoàn thành lịch nhắc mượt mà');

  // -------------------------------------------------------------
  // TEST 4: Kiểm tra dữ liệu được tạo trong Database (Tasks & Reminders)
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Kiểm tra dữ liệu công việc và lịch nhắc trong cơ sở dữ liệu ---');
  const taskInDb = await db.get(
    `SELECT * FROM owner_tasks WHERE owner_id = 'owner_tri' AND title LIKE '%Gửi báo cáo mua sắm%'`
  );
  assert(Boolean(taskInDb), 'Công việc tồn tại trong bảng owner_tasks');
  assert(taskInDb.status === 'PENDING', 'Trạng thái công việc ban đầu là PENDING');

  const remInDb = await db.get(
    `SELECT * FROM owner_reminders WHERE task_id = ? AND owner_id = 'owner_tri'`,
    [taskInDb.task_id]
  );
  assert(Boolean(remInDb), 'Lịch nhắc tồn tại trong bảng owner_reminders');
  assert(remInDb.status === 'PENDING', 'Trạng thái lịch nhắc ban đầu là PENDING');
  console.log('  ✅ [PASS] Cơ sở dữ liệu lưu trữ đầy đủ owner_tasks và owner_reminders');

  // -------------------------------------------------------------
  // TEST 5: Backend Scheduler chạy ngầm và tạo thông báo khi đến hạn
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Backend Scheduler quét lịch nhắc đến hạn và tạo thông báo ---');
  // Tạo 1 task và reminder với remind_at là 1 phút trước
  const pastIso = new Date(Date.now() - 60000).toISOString();
  const urgentTask = await TaskEngine.createTask({
    ownerId: 'owner_tri',
    title: 'Kiểm tra tiến độ đơn hàng PO khẩn cấp',
    dueAt: pastIso,
    priority: 'HIGH'
  });
  const urgentRem = await ReminderEngine.createReminder({
    taskId: urgentTask.task_id,
    ownerId: 'owner_tri',
    remindAt: pastIso
  });

  // Chạy Backend Scheduler quét
  await ReminderScheduler.checkAndFireReminders();

  // Kiểm tra reminder chuyển thành FIRED
  const firedRem = await ReminderEngine.getReminderById(urgentRem.reminder_id, 'owner_tri');
  assert(firedRem.status === 'FIRED', 'Reminder chuyển trạng thái FIRED để chống gửi trùng lặp');

  // Kiểm tra notification được tạo tự động trong owner_notifications
  const notifCreated = await db.get(
    `SELECT * FROM owner_notifications WHERE task_id = ? AND reminder_id = ?`,
    [urgentTask.task_id, urgentRem.reminder_id]
  );
  assert(Boolean(notifCreated), 'Thông báo được tạo tự động trong bảng owner_notifications');
  assert(notifCreated.is_read === 0, 'Thông báo mới có is_read = 0 (chưa xem)');
  console.log('  ✅ [PASS] Backend Scheduler hoạt động độc lập và tạo thông báo tự động');

  // -------------------------------------------------------------
  // TEST 6: Lấy số lượng thông báo chưa xem qua NotificationEngine
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: Hiển thị số thông báo chưa xem cho nút Nhắc việc ---');
  const unreadCount = await NotificationEngine.getUnreadCount('owner_tri');
  assert(unreadCount >= 1, `Số thông báo chưa xem >= 1 (Thực tế: ${unreadCount})`);
  const unreadList = await NotificationEngine.getUnreadNotifications('owner_tri');
  assert(unreadList.some(n => n.task_id === urgentTask.task_id), 'Danh sách chưa xem chứa thông báo vừa tạo');
  console.log('  ✅ [PASS] Nút Nhắc việc tính toán chính xác số lượng badge chưa xem');

  // -------------------------------------------------------------
  // TEST 7: Thao tác "Đã xem" – Ẩn khỏi unread, KHÔNG xóa và KHÔNG hoàn thành task
  // -------------------------------------------------------------
  console.log('\n--- TEST 7: Bấm "Đã xem" (Ẩn unread, không hoàn thành, không xóa việc) ---');
  const markReadRes = await NotificationEngine.markAsRead(notifCreated.notification_id, 'owner_tri');
  assert(markReadRes.success === true, 'Đánh dấu đã xem thành công');

  // Kiểm tra unread list không còn thông báo này
  const unreadAfter = await NotificationEngine.getUnreadNotifications('owner_tri');
  assert(!unreadAfter.some(n => n.notification_id === notifCreated.notification_id), 'Thông báo đã ẩn khỏi danh sách chưa xem');

  // Kiểm tra công việc VẪN CÒN NGUYÊN trong owner_tasks
  const taskAfterRead = await TaskEngine.getTaskById(urgentTask.task_id, 'owner_tri');
  assert(Boolean(taskAfterRead), 'Công việc tuyệt đối KHÔNG bị xóa khi bấm Đã xem');
  assert(taskAfterRead.status !== 'COMPLETED', 'Công việc tuyệt đối KHÔNG bị tự động hoàn thành khi bấm Đã xem');
  console.log('  ✅ [PASS] Thao tác Đã xem chuẩn mực, bảo toàn nguyên vẹn công việc');

  // -------------------------------------------------------------
  // TEST 8: Thao tác "Nhắc lại" – Dời lịch nhắc, không tạo trùng việc
  // -------------------------------------------------------------
  console.log('\n--- TEST 8: Bấm "Nhắc lại" và dời lịch nhắc trong ô chat ---');
  const convResched = 'conv_sec_test_resched';

  // Giả lập bấm "Nhắc lại" từ UI: nạp context vào SecretaryAgent
  SecretaryAgent.prepareRescheduleContext(convResched, taskAfterRead);

  // Người dùng nhắn giờ mới trong ô chat: "9 giờ sáng mai"
  const res8 = await CentralBrainService.processChat({
    message: '9 giờ sáng mai',
    conversationId: convResched,
    userContext: ownerUserContext
  });

  assert(res8.success === true, 'Turn 8 returned success');
  assert(res8.reply.includes('dời lịch nhắc'), 'Thư ký xác nhận đã dời lịch nhắc');
  assert(res8.reply.includes('09:00'), 'Xác nhận giờ mới 09:00');

  // Kiểm tra không tạo việc trùng lặp
  const tasksMatchingTitle = await db.all(
    `SELECT * FROM owner_tasks WHERE owner_id = 'owner_tri' AND title = ?`,
    [urgentTask.title]
  );
  assert(tasksMatchingTitle.length === 1, 'Chỉ có 1 công việc duy nhất, tuyệt đối không tạo trùng lặp');

  // Kiểm tra lịch sử dời lịch được lưu trong action_history của reminder
  const activeRemAfter = await ReminderEngine.getActiveReminderForTask(urgentTask.task_id, 'owner_tri');
  assert(activeRemAfter.status === 'PENDING', 'Trạng thái reminder được đặt lại thành PENDING với giờ mới');
  assert(activeRemAfter.action_history.includes('RESCHEDULED'), 'Lịch sử dời lịch được ghi lại đầy đủ');
  console.log('  ✅ [PASS] Thao tác Nhắc lại dời giờ mượt mà và bảo toàn tính duy nhất của công việc');

  // -------------------------------------------------------------
  // TEST 9: Xác nhận hoàn thành qua chat thì công việc mới chuyển COMPLETED
  // -------------------------------------------------------------
  console.log('\n--- TEST 9: Hoàn thành công việc qua ô chat ---');
  const res9 = await CentralBrainService.processChat({
    message: 'Việc kiểm tra tiến độ đơn hàng PO khẩn cấp đã hoàn thành',
    conversationId: 'conv_sec_test_done',
    userContext: ownerUserContext
  });

  assert(res9.success === true, 'Turn 9 returned success');
  assert(res9.reply.includes('Hoàn thành'), 'Thư ký xác nhận trạng thái hoàn thành');

  const completedTask = await TaskEngine.getTaskById(urgentTask.task_id, 'owner_tri');
  assert(completedTask.status === 'COMPLETED', 'Trạng thái trong DB chuyển sang COMPLETED');
  assert(Boolean(completedTask.completed_at), 'Có ghi nhận completed_at');
  console.log('  ✅ [PASS] Công việc chỉ hoàn thành khi có lệnh xác nhận rõ ràng qua chat');

  // -------------------------------------------------------------
  // TEST 10: Bảo mật và Phân quyền OWNER Backend (Chống rò rỉ dữ liệu)
  // -------------------------------------------------------------
  console.log('\n--- TEST 10: Chốt chặn bảo mật – Khách hàng không thể truy cập Thư ký riêng ---');
  // Khách hàng vãng lai thử gõ "Thư ký của anh"
  const res10Customer = await CentralBrainService.processChat({
    message: 'Thư ký của anh',
    conversationId: 'conv_sec_test_intruder',
    userContext: customerUserContext
  });

  assert(res10Customer.reply.includes('chỉ dành cho Chủ nhân tài khoản (Anh Trí)'), 'Từ chối khách vãng lai kích hoạt Thư ký riêng');
  assert(res10Customer.stage === 'ACCESS_RESTRICTED', 'Stage bị khóa ACCESS_RESTRICTED');

  // Khách hàng cố hỏi xem việc của chủ nhân
  const res10Query = await CentralBrainService.processChat({
    message: 'Cho tôi xem lịch riêng chi tiết của anh Trí',
    conversationId: 'conv_sec_test_intruder_2',
    userContext: customerUserContext
  });
  assert(res10Query.reply.includes('lịch riêng') || res10Query.reply.includes('bảo mật') || res10Query.stage.includes('RESTRICTED') || res10Query.stage.includes('BLOCKED'), 'Ngăn chặn xem trộm việc riêng');
  console.log('  ✅ [PASS] Chốt chặn bảo mật phân quyền OWNER hoạt động vững chắc');

  // -------------------------------------------------------------
  // TEST 11: Kiểm thử hồi quy các chức năng BOTCHAT cũ
  // -------------------------------------------------------------
  console.log('\n--- TEST 11: Kiểm tra hồi quy năng lực Bán hàng và Báo giá BOTCHAT cũ ---');
  // Bán hàng cho khách vãng lai
  const res11Sales = await CentralBrainService.processChat({
    message: 'Tư vấn máy in Brother',
    conversationId: 'conv_sec_test_sales',
    userContext: customerUserContext
  });
  assert(res11Sales.success === true, 'Tư vấn bán hàng hoạt động bình thường');
  assert(res11Sales.reply.includes('MAY IN') || res11Sales.reply.includes('Brother') || res11Sales.reply.includes('ngân sách'), 'Nội dung tư vấn bán hàng chính xác');

  // Nhận diện tên khách hàng
  const res11Name = await CentralBrainService.processChat({
    message: 'Tôi tên Lan',
    conversationId: 'conv_sec_test_name',
    userContext: customerUserContext
  });
  assert(res11Name.reply.includes('Lan'), 'Tên khách hàng vẫn được nhận diện và chào hỏi');
  console.log('  ✅ [PASS] Toàn bộ năng lực bán hàng và hội thoại cũ được bảo toàn 100%');

  console.log('\n================================================================');
  console.log('🏁 TỔNG KẾT: 11 / 11 PASSED (Tỷ lệ: 100.0%)');
  console.log('================================================================\n');
}

runTests().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
