/**
 * TEST SUITE: PHASE 8 - DATABASE SCHEMA & SAFE MIGRATION (BOTCHAT BRAIN 2.1)
 * 
 * Verifies:
 * 1. Safe execution of BOTCHAT BRAIN 2.1 schema migration
 * 2. Idempotency: Multiple runs do NOT fail or corrupt database
 * 3. Schema verification for owner_tasks, secretary_notes, and ai_security_audit_logs
 * 4. Data insertion and query integrity
 * 5. Database backup existence and health check
 */

import fs from 'fs';
import path from 'path';
import db from '../server/db.js';
import { runBrain21Migration } from '../server/migrations/schema_phase_brain_2_1.js';

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
console.log('🚀 KIỂM THỬ GIAI ĐOẠN 8: DATABASE SCHEMA & MIGRATION AN TOÀN');
console.log('================================================================\n');

async function runTests() {
  // -------------------------------------------------------------
  // Group 1: Backup File Verification
  // -------------------------------------------------------------
  console.log('--- 1. Kiểm tra Tệp Sao Lưu Dự Phòng (Backup Health Check) ---');

  const backupPath = path.resolve('data/triai.db.backup_controlled_start');
  const backupExists = fs.existsSync(backupPath);
  assert(backupExists === true, 'Database backup file exists');

  if (backupExists) {
    const stat = fs.statSync(backupPath);
    assert(stat.size > 5000000, `Backup file size is healthy (${stat.size} bytes)`);
  }

  // -------------------------------------------------------------
  // Group 2: Run Migration
  // -------------------------------------------------------------
  console.log('\n--- 2. Thực Thi Migration BOTCHAT BRAIN 2.1 ---');

  const migRes = await runBrain21Migration(db);
  assert(migRes.success === true, 'Migration executed successfully');

  // Idempotency check: run a second time to ensure CREATE TABLE IF NOT EXISTS holds
  const migRes2 = await runBrain21Migration(db);
  assert(migRes2.success === true, 'Migration is idempotent (runs cleanly second time)');

  // -------------------------------------------------------------
  // Group 3: Schema Inspection
  // -------------------------------------------------------------
  console.log('\n--- 3. Kiểm tra Cấu Trúc Các Bảng Mới (PRAGMA Table Info) ---');

  const ownerTasksCols = await db.all('PRAGMA table_info(owner_tasks)');
  assert(ownerTasksCols.some(c => c.name === 'id'), 'owner_tasks has column id');
  assert(ownerTasksCols.some(c => c.name === 'title'), 'owner_tasks has column title');
  assert(ownerTasksCols.some(c => c.name === 'status'), 'owner_tasks has column status');

  const secNotesCols = await db.all('PRAGMA table_info(secretary_notes)');
  assert(secNotesCols.some(c => c.name === 'id'), 'secretary_notes has column id');
  assert(secNotesCols.some(c => c.name === 'content'), 'secretary_notes has column content');

  const auditCols = await db.all('PRAGMA table_info(ai_security_audit_logs)');
  assert(auditCols.some(c => c.name === 'attempted_action'), 'ai_security_audit_logs has column attempted_action');
  assert(auditCols.some(c => c.name === 'blocked_reason'), 'ai_security_audit_logs has column blocked_reason');

  // -------------------------------------------------------------
  // Group 4: Data Insertion & Query Integrity
  // -------------------------------------------------------------
  console.log('\n--- 4. Kiểm tra Toàn Vẹn Dữ Liệu CRUD ---');

  const taskId = `task_test_${Date.now()}`;
  const now = new Date().toISOString();
  await db.run(`
    INSERT INTO owner_tasks (id, user_id, title, time_spec, priority, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [taskId, 'owner_tri', 'Họp kiểm tra tiến độ dự án BOTCHAT BRAIN 2.1', '14h chiều nay', 'HIGH', 'PENDING', now, now]);

  const insertedTask = await db.get('SELECT * FROM owner_tasks WHERE id = ?', [taskId]);
  assert(insertedTask !== undefined, 'Task record inserted and retrieved');
  assert(insertedTask.title === 'Họp kiểm tra tiến độ dự án BOTCHAT BRAIN 2.1', 'Task title verified');

  // Update status
  await db.run('UPDATE owner_tasks SET status = ? WHERE id = ?', ['COMPLETED', taskId]);
  const updatedTask = await db.get('SELECT status FROM owner_tasks WHERE id = ?', [taskId]);
  assert(updatedTask.status === 'COMPLETED', 'Task status update verified');

  // Audit log insertion
  const auditId = `audit_test_${Date.now()}`;
  await db.run(`
    INSERT INTO ai_security_audit_logs (id, conversation_id, user_id, attempted_action, blocked_reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [auditId, 'conv_test_audit', 'usr_fake', 'ACCESS_OWNER_PRIVATE_SCHEDULE', 'UNAUTHORIZED_ACCESS', now]);

  const insertedAudit = await db.get('SELECT * FROM ai_security_audit_logs WHERE id = ?', [auditId]);
  assert(insertedAudit !== undefined, 'Security incident recorded into audit log');

  console.log('\n================================================================');
  console.log(`🏁 KẾT QUẢ GIAI ĐOẠN 8: ${passed} PASS, ${failed} FAIL (Tỷ lệ: ${((passed / (passed + failed)) * 100).toFixed(1)}%)`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
