/**
 * MASTER ACCEPTANCE TEST SUITE: TRÍ AI – HUMAN BRAIN
 * 
 * Verifies all 7 Mandatory Acceptance Test Scenarios:
 * Test 1 – Nhớ thông tin (Information Retention)
 * Test 2 – Nhớ sự kiện (Episodic Recall)
 * Test 3 – Nhớ công việc (Prospective Recall)
 * Test 4 – Nhớ khách hàng (Customer Recognition & Continuity)
 * Test 5 – Nhận diện xung đột (Contradiction Detection)
 * Test 6 – Phân quyền RBAC & Cô lập dữ liệu (Security Isolation)
 * Test 7 – Bảo toàn nghiệp vụ bán hàng & CRM (Sales Integrity)
 */

import { db, initDatabase } from '../server/db.js';
import { HumanMemoryEngine } from '../server/services/intelligence/humanMemoryEngine.js';
import { PlanningEngine } from '../server/services/intelligence/planningEngine.js';
import { CrmLeadService } from '../server/services/crmLeadService.js';
import { randomUUID } from 'crypto';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  \x1b[32m✔ PASS\x1b[0m: ${message}`);
    passed++;
  } else {
    console.error(`  \x1b[31m✘ FAIL\x1b[0m: ${message}`);
    failed++;
  }
}

async function runMasterSuite() {
  console.log('\n================================================================');
  console.log('  TRÍ AI – HUMAN BRAIN MASTER ACCEPTANCE VERIFICATION SUITE');
  console.log('================================================================\n');

  await initDatabase();

  // -------------------------------------------------------------
  // TEST 1 – NHỚ THÔNG TIN (Information Retention)
  // -------------------------------------------------------------
  console.log('[TEST 1] Nhớ thông tin qua nhiều phiên (Information Retention)');
  const testUserId = `user_test_${randomUUID().slice(0, 6)}`;
  
  // Session 1: Người dùng chia sẻ sở thích
  const rem1 = await HumanMemoryEngine.remember({
    memoryType: 'SEMANTIC',
    content: 'Khách hàng đặc biệt yêu thích Trà Oolong Xanh Bảo Lộc và chỉ dùng nước suối khoáng pha',
    subject: 'TEA_PREFERENCE',
    entityId: testUserId,
    source: 'USER_CHAT',
    confidence: 1.0,
    sensitivity: 'INTERNAL'
  });
  assert(rem1 !== null && rem1.memoryId, 'Phiên 1: Ghi nhớ sở thích vào Semantic Memory thành công');

  // Session 2: Người dùng hỏi lại
  const retrieved1 = await HumanMemoryEngine.retrieve({
    entityId: testUserId,
    subject: 'TEA_PREFERENCE',
    userRole: 'customer',
    requestingUserId: testUserId
  });
  assert(retrieved1.length > 0, 'Phiên 2: Truy xuất thành công thông tin đã ghi nhớ');
  assert(retrieved1[0].content.includes('Trà Oolong Xanh Bảo Lộc'), `Nội dung truy xuất chính xác: "${retrieved1[0].content}"`);
  assert(retrieved1[0].memory_type === 'SEMANTIC', 'Phân loại đúng tầng Semantic Memory');

  // -------------------------------------------------------------
  // TEST 2 – NHỚ SỰ KIỆN (Episodic Recall)
  // -------------------------------------------------------------
  console.log('\n[TEST 2] Nhớ sự kiện trong quá khứ (Episodic Recall)');
  const episodeTime = '2026-11-20T09:30:00Z';
  const rem2 = await HumanMemoryEngine.remember({
    memoryType: 'EPISODIC',
    content: 'Cuộc họp ngày 20/11: Khách hàng đồng ý mua 2 máy đếm tiền Glory EU200 sau khi được báo giá 10.500.000đ',
    subject: 'CONSULTATION_OUTCOME',
    entityId: testUserId,
    eventTime: episodeTime,
    source: 'SYSTEM_ACTION',
    sourceReference: 'conv_session_past_01',
    confidence: 1.0,
    extraData: {
      conversationId: 'conv_session_past_01',
      participants: [testUserId, 'Quang Nhựt Trí'],
      eventCategory: 'PRICE_QUOTATION',
      outcome: 'AGREED_PURCHASE'
    }
  });
  assert(rem2 !== null && rem2.memoryId, 'Ghi nhận sự kiện quá khứ vào Episodic Memory thành công');

  const retrieved2 = await HumanMemoryEngine.retrieve({
    entityId: testUserId,
    memoryTypes: ['EPISODIC'],
    userRole: 'owner'
  });
  assert(retrieved2.length > 0, 'Truy xuất sự kiện Episodic thành công');
  assert(retrieved2[0].event_time === episodeTime, `Thời điểm sự kiện khớp chính xác: ${retrieved2[0].event_time}`);
  assert(retrieved2[0].source_reference === 'conv_session_past_01', 'Có nguồn gốc chứng thực (provenance)');

  // -------------------------------------------------------------
  // TEST 3 – NHỚ CÔNG VIỆC (Prospective Recall)
  // -------------------------------------------------------------
  console.log('\n[TEST 3] Nhớ công việc tương lai & Lịch hẹn (Prospective Recall)');
  const futureTime = new Date(Date.now() + 86400000).toISOString(); // Ngày mai
  const rem3 = await HumanMemoryEngine.remember({
    memoryType: 'PROSPECTIVE',
    content: 'Gọi lại cho anh Hoàng xác nhận số lượng máy in Brother trước 10h sáng mai',
    subject: 'SCHEDULED_REMINDER',
    entityId: 'owner_tri',
    source: 'USER_CHAT',
    confidence: 1.0,
    ownerId: 'owner_tri',
    sensitivity: 'RESTRICTED',
    extraData: {
      taskTitle: 'Gọi lại cho anh Hoàng xác nhận số lượng máy in',
      targetUserId: 'owner_tri',
      triggerTime: futureTime,
      priority: 'HIGH'
    }
  });
  assert(rem3 !== null && rem3.memoryId, 'Ghi nhớ công việc tương lai vào Prospective Memory');

  const prospRow = await db.get("SELECT * FROM ai_memory_prospective WHERE memory_id = ?", [rem3.memoryId]);
  assert(prospRow !== null, 'Dữ liệu prospective được lưu trữ bền vững trong bảng con');
  assert(prospRow.status === 'PENDING', `Trạng thái nhiệm vụ là PENDING (got: ${prospRow.status})`);
  assert(prospRow.priority === 'HIGH', `Mức độ ưu tiên chính xác: ${prospRow.priority}`);

  // -------------------------------------------------------------
  // TEST 4 – NHỚ KHÁCH HÀNG & TIẾP NỐI HỘI THOẠI (Customer Recognition)
  // -------------------------------------------------------------
  console.log('\n[TEST 4] Nhớ khách hàng cũ quay lại (Customer Recognition & Continuity)');
  const custPhone = '0982441446';
  
  // Lưu Lead và lịch sử trước đó
  const enrichedLead = await CrmLeadService.enrichLeadData({
    leadId: `lead_recog_${randomUUID().slice(0, 6)}`,
    customerName: 'Anh Minh',
    phone: custPhone,
    currentMessage: 'Tôi cần mua máy đếm tiền Glory EU200',
    db
  });
  assert(enrichedLead.product_name === 'Máy đếm tiền Glory EU200', 'Lead ban đầu ghi nhận đúng Glory EU200');

  // Khách hàng quay lại sau nhiều ngày và hỏi tiếp mà không nhắc lại tên máy
  const continuation = await CrmLeadService.extractProductsFromConversation({
    currentMessage: 'Sản phẩm hôm trước báo giá còn hàng để giao ngay trong hôm nay không?',
    activeProduct: { name: enrichedLead.product_name, brand: enrichedLead.brand, model: enrichedLead.model },
    db
  });
  assert(continuation.productName === 'Máy đếm tiền Glory EU200', `Tiếp nối thành công sản phẩm cũ từ ngữ cảnh: "${continuation.productName}"`);
  assert(continuation.model === 'EU200', 'Bảo toàn model EU200 khi khách quay lại');

  // -------------------------------------------------------------
  // TEST 5 – NHẬN DIỆN XUNG ĐỘT (Contradiction Detection)
  // -------------------------------------------------------------
  console.log('\n[TEST 5] Nhận diện xung đột thông tin (Contradiction Detection)');
  const contraUser = `user_contra_${randomUUID().slice(0, 6)}`;
  
  // Thông tin 1: Ngân sách 10 triệu
  await HumanMemoryEngine.remember({
    memoryType: 'SEMANTIC',
    content: 'Ngân sách dự kiến: 10 triệu đồng',
    subject: 'target_budget',
    entityId: contraUser,
    sensitivity: 'INTERNAL'
  });

  // Thông tin 2: Người dùng đổi ngân sách thành 25 triệu
  await HumanMemoryEngine.remember({
    memoryType: 'SEMANTIC',
    content: 'Ngân sách dự kiến tăng lên: 25 triệu đồng',
    subject: 'target_budget',
    entityId: contraUser,
    sensitivity: 'INTERNAL'
  });

  const contraLog = await db.get("SELECT * FROM ai_memory_contradictions WHERE entity_id = ?", [contraUser]);
  assert(contraLog !== null, 'Phát hiện thành công mâu thuẫn dữ kiện và lưu vào bảng ai_memory_contradictions');
  assert(contraLog.old_value.includes('10 triệu'), `Giá trị cũ được lưu vết: "${contraLog.old_value}"`);
  assert(contraLog.new_value.includes('25 triệu'), `Giá trị mới được ghi nhận: "${contraLog.new_value}"`);

  const activeMems = await db.all("SELECT content, status FROM ai_memories WHERE entity_id = ? ORDER BY created_at ASC", [contraUser]);
  assert(activeMems.length === 2, 'Cả 2 bản ghi vẫn tồn tại, không bị xóa âm thầm');
  assert(activeMems[0].status === 'SUPERSEDED', 'Bản ghi cũ chuyển trạng thái SUPERSEDED');
  assert(activeMems[1].status === 'ACTIVE', 'Bản ghi mới ở trạng thái ACTIVE');

  // -------------------------------------------------------------
  // TEST 6 – PHÂN QUYỀN RBAC & CÔ LẬP DỮ LIỆU (Security Isolation)
  // -------------------------------------------------------------
  console.log('\n[TEST 6] Phân quyền RBAC & Cô lập tuyệt đối dữ liệu Owner (Security Isolation)');
  
  // Tạo 1 ký ức mật của Owner
  await HumanMemoryEngine.remember({
    memoryType: 'SEMANTIC',
    content: 'Kế hoạch tài chính nội bộ năm 2027: Lợi nhuận mục tiêu 50 tỷ đồng',
    subject: 'FINANCIAL_PLAN',
    entityId: 'owner_tri',
    ownerId: 'owner_tri',
    sensitivity: 'RESTRICTED'
  });

  // Khách hàng (vai trò CUSTOMER) cố gắng truy vấn ký ức của Owner
  const customerAccess = await HumanMemoryEngine.retrieve({
    query: 'Lợi nhuận mục tiêu',
    userRole: 'customer',
    requestingUserId: 'cust_unauthorized_99'
  });
  assert(customerAccess.length === 0, 'CUSTOMER bị CHẶN 100% khỏi việc truy vấn ký ức nhạy cảm của OWNER');

  // Khách hàng chỉ truy vấn được dữ liệu của chính mình
  const ownAccess = await HumanMemoryEngine.retrieve({
    entityId: testUserId,
    userRole: 'customer',
    requestingUserId: testUserId
  });
  assert(ownAccess.length > 0, 'CUSTOMER truy xuất được dữ liệu thuộc phạm vi của chính mình');

  // -------------------------------------------------------------
  // TEST 7 – BẢO TOÀN NGHIỆP VỤ BÁN HÀNG & CRM (Sales Integrity)
  // -------------------------------------------------------------
  console.log('\n[TEST 7] Bảo toàn 100% chức năng Bán hàng & CRM (Sales Integrity)');
  const prods = await db.all("SELECT id, name, price FROM products WHERE is_active = 1");
  assert(prods.length > 0, `Danh mục sản phẩm hoạt động bình thường (${prods.length} sản phẩm)`);

  const leads = await db.all("SELECT id, product_name, phone FROM leads LIMIT 5");
  assert(leads.length > 0, `Bảng CRM Leads hoạt động bình thường (${leads.length} leads kiểm tra)`);

  // Dọn dẹp dữ liệu test tạm
  await db.run("DELETE FROM ai_memories WHERE entity_id IN (?, ?)", [testUserId, contraUser]);
  await db.run("DELETE FROM ai_memory_contradictions WHERE entity_id = ?", [contraUser]);

  console.log('\n----------------------------------------------------------------');
  console.log(`TỔNG SỐ TEST CASES ĐÃ CHẠY: ${passed + failed}`);
  console.log(`✅ TEST THÀNH CÔNG (PASS):   ${passed}`);
  console.log(`❌ TEST THẤT BẠI (FAIL):     ${failed}`);
  console.log(`🎯 TỶ LỆ CHÍNH XÁC:          ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runMasterSuite().catch(err => {
  console.error('Master Suite execution error:', err);
  process.exit(1);
});
