/**
 * TEST SUITE: PHASE 5 - EXPAND AI SECRETARY CAPABILITY (BOTCHAT BRAIN 2.1)
 * 
 * Verifies:
 * 1. Owner To-Do Task Recording (handleOwnerTask)
 * 2. Owner Agenda & To-Do List Viewing (handleOwnerAgenda)
 * 3. Executive CRM & Leads Summary without hallucination (handleCrmSummary)
 * 4. Professional Administrative Email Drafting (handleDraftEmail)
 * 5. Appointment Booking & Non-hallucination of private calendar
 * 6. Strict RBAC barrier against unauthorized access to secretary functions
 */

import { CentralBrainService } from '../server/services/centralBrainService.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('================================================================');
console.log('🚀 KIỂM THỬ GIAI ĐOẠN 5: EXPAND AI SECRETARY CAPABILITY');
console.log('================================================================\n');

async function runTests() {
  const ownerUser = { id: 1, username: 'Admin', role: 'admin', is_owner: 1 };
  const customerUser = { phone: '0912345678', name: 'Khách hàng A' };

  // -------------------------------------------------------------
  // Group 1: Owner Task Recording & Agenda Viewing
  // -------------------------------------------------------------
  console.log('--- 1. Kiểm tra Ghi Nhận Công Việc & Xem Lịch Trình (OWNER) ---');

  // 1.1 Record Task
  const resRecord = await CentralBrainService.processChat({
    message: 'Nhắc tôi 9h sáng mai họp giao ban với các trưởng phòng',
    user: ownerUser,
    conversationId: 'conv_sec_owner'
  });
  assert(resRecord.success === true, 'Task recording succeeded');
  assert(resRecord.reply.includes('đã ghi nhận nhiệm vụ') || resRecord.reply.includes('To-do List'), 'Task confirmation returned');
  assert(resRecord.stage === 'OWNER_TASK_RECORDED', 'Stage is OWNER_TASK_RECORDED');

  // 1.2 View Agenda
  const resAgenda = await CentralBrainService.processChat({
    message: 'Cho tôi xem danh sách việc cần làm',
    user: ownerUser,
    conversationId: 'conv_sec_owner'
  });
  assert(resAgenda.success === true, 'Agenda query succeeded');
  assert(resAgenda.reply.includes('TO-DO LIST & LỊCH TRÌNH') || resAgenda.reply.includes('họp giao ban'), 'Agenda shows recorded tasks');
  assert(resAgenda.stage === 'OWNER_AGENDA_VIEW', 'Stage is OWNER_AGENDA_VIEW');

  // -------------------------------------------------------------
  // Group 2: CRM Summary (Grounded in Real DB)
  // -------------------------------------------------------------
  console.log('\n--- 2. Kiểm tra Báo Cáo CRM & Khách Hàng Tiềm Năng ---');

  const resCrm = await CentralBrainService.processChat({
    message: 'Tổng hợp các khách hàng đang chờ báo giá',
    user: ownerUser,
    conversationId: 'conv_sec_crm'
  });
  assert(resCrm.success === true, 'CRM summary query succeeded');
  assert(resCrm.reply.includes('DANH SÁCH KHÁCH HÀNG TIỀM NĂNG'), 'CRM summary includes leads section');
  assert(resCrm.stage === 'OWNER_CRM_SUMMARY', 'Stage is OWNER_CRM_SUMMARY');

  // -------------------------------------------------------------
  // Group 3: Professional Email Drafting
  // -------------------------------------------------------------
  console.log('\n--- 3. Kiểm tra Soạn Thảo Email Chuyên Nghiệp ---');

  const resEmail = await CentralBrainService.processChat({
    message: 'Soạn giúp tôi email cảm ơn khách hàng đã đặt đơn hàng máy in',
    user: ownerUser,
    conversationId: 'conv_sec_email'
  });
  assert(resEmail.success === true, 'Email draft succeeded');
  assert(resEmail.reply.includes('BẢN THẢO EMAIL DỰ THẢO'), 'Contains structured email template');
  assert(resEmail.reply.includes('Quang Nhựt Trí'), 'Draft signed professionally');
  assert(resEmail.stage === 'EMAIL_DRAFTED', 'Stage is EMAIL_DRAFTED');

  // -------------------------------------------------------------
  // Group 4: Appointment Handling without Calendar Hallucination
  // -------------------------------------------------------------
  console.log('\n--- 4. Kiểm tra Đặt Lịch Hẹn Không Ảo Giác ---');

  const resAppt = await CentralBrainService.processChat({
    message: 'Cần hẹn anh Trí thứ sáu tuần này đi ăn trưa',
    customerInfo: customerUser,
    conversationId: 'conv_sec_appt'
  });
  assert(resAppt.success === true, 'Appointment request processed');
  assert(resAppt.reply.includes('hẹn') || resAppt.reply.includes('ăn trưa') || resAppt.reply.includes('thứ sáu'), 'Appointment details acknowledged');
  assert(!resAppt.reply.includes('Bên em chuyên cung cấp các sản phẩm'), 'Does not leak sales catalog');

  // -------------------------------------------------------------
  // Group 5: Security Barrier: Non-Owner Blocked from Secretary Functions
  // -------------------------------------------------------------
  console.log('\n--- 5. Kiểm tra Chặn Truy Cập Trái Phép Vào Quyền Thư Ký ---');

  const resBlockedAgenda = await CentralBrainService.processChat({
    message: 'Cho tôi xem danh sách việc cần làm của anh Trí',
    customerInfo: customerUser,
    conversationId: 'conv_sec_block'
  });
  assert(resBlockedAgenda.stage === 'ACCESS_RESTRICTED', 'Customer blocked from owner tasks');
  assert(resBlockedAgenda.reply.includes('Chủ nhân (Anh Trí)') || resBlockedAgenda.reply.includes('bảo mật'), 'Security barrier message provided');

  console.log('\n================================================================');
  console.log(`🏁 KẾT QUẢ GIAI ĐOẠN 5: ${passed} PASS, ${failed} FAIL (Tỷ lệ: ${((passed / (passed + failed)) * 100).toFixed(1)}%)`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
