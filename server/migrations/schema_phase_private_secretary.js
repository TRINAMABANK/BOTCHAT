/**
 * SCHEMA MIGRATION: THƯ KÝ RIÊNG CỦA ANH (OWNER PRIVATE SECRETARY)
 * (BOTCHAT BRAIN 2.1 – TASK, REMINDER, NOTIFICATION & AUDIT LOG ENGINES)
 * 
 * Supports:
 * 1. `owner_tasks`: Quản lý công việc cá nhân của Anh Trí (tiêu đề, hạn, ưu tiên, trạng thái).
 * 2. `owner_reminders`: Quản lý lịch nhắc việc, hỗ trợ dời lịch, lịch sử thay đổi.
 * 3. `owner_notifications`: Danh sách thông báo nhắc việc hiển thị tại nút Nhắc việc trên WebApp.
 * 4. `owner_audit_logs`: Nhật ký thao tác bảo mật (tạo, sửa, dời, hoàn thành, đọc thông báo).
 */

export async function runPrivateSecretaryMigration(db) {
  console.log('[MIGRATION] Starting Private Secretary Schema Migration...');

  // 1. Bảng Quản lý Công việc của Chủ nhân (owner_tasks)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS owner_tasks (
      task_id TEXT PRIMARY KEY,
      id TEXT,
      owner_id TEXT NOT NULL DEFAULT 'owner_tri',
      user_id TEXT DEFAULT 'owner_tri',
      title TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL,
      start_at TEXT,
      due_at TEXT,
      priority TEXT NOT NULL DEFAULT 'NORMAL', -- 'LOW', 'NORMAL', 'HIGH', 'URGENT'
      status TEXT NOT NULL DEFAULT 'PENDING',  -- 'PENDING', 'IN_PROGRESS', 'WAITING', 'COMPLETED', 'OVERDUE', 'CANCELLED'
      completed_at TEXT,
      updated_at TEXT NOT NULL
    );
  `);

  // Migrate existing owner_tasks columns if legacy schema was present
  try {
    const cols = await db.all('PRAGMA table_info(owner_tasks)');
    const colNames = new Set(cols.map(c => c.name));

    if (!colNames.has('task_id')) {
      await db.run('ALTER TABLE owner_tasks ADD COLUMN task_id TEXT');
      await db.run('UPDATE owner_tasks SET task_id = id WHERE task_id IS NULL');
    }
    if (!colNames.has('owner_id')) {
      await db.run("ALTER TABLE owner_tasks ADD COLUMN owner_id TEXT DEFAULT 'owner_tri'");
      await db.run('UPDATE owner_tasks SET owner_id = user_id WHERE owner_id IS NULL');
    }
    if (!colNames.has('start_at')) {
      await db.run('ALTER TABLE owner_tasks ADD COLUMN start_at TEXT');
    }
    if (!colNames.has('due_at')) {
      await db.run('ALTER TABLE owner_tasks ADD COLUMN due_at TEXT');
      await db.run('UPDATE owner_tasks SET due_at = time_spec WHERE due_at IS NULL AND time_spec IS NOT NULL');
    }
    if (!colNames.has('completed_at')) {
      await db.run('ALTER TABLE owner_tasks ADD COLUMN completed_at TEXT');
    }
  } catch (colErr) {
    console.warn('[MIGRATION] Migration column check warning:', colErr.message);
  }

  await db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_owner_tasks_task_id_uniq ON owner_tasks(task_id);
    CREATE INDEX IF NOT EXISTS idx_owner_tasks_owner ON owner_tasks(owner_id);
    CREATE INDEX IF NOT EXISTS idx_owner_tasks_status ON owner_tasks(status);
    CREATE INDEX IF NOT EXISTS idx_owner_tasks_due ON owner_tasks(due_at);
  `);

  // 2. Bảng Quản lý Lịch nhắc việc (owner_reminders)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS owner_reminders (
      reminder_id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      owner_id TEXT NOT NULL DEFAULT 'owner_tri',
      remind_at TEXT NOT NULL,
      acknowledged_at TEXT,
      acknowledged_by TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'FIRED', 'ACKNOWLEDGED', 'RESCHEDULED', 'CANCELLED'
      previous_due_at TEXT,
      new_due_at TEXT,
      action_history TEXT, -- JSON string array
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (task_id) REFERENCES owner_tasks(task_id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_owner_reminders_owner ON owner_reminders(owner_id);
    CREATE INDEX IF NOT EXISTS idx_owner_reminders_status_time ON owner_reminders(status, remind_at);
  `);

  // 3. Bảng Quản lý Thông báo Nhắc việc trên WebApp (owner_notifications)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS owner_notifications (
      notification_id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL DEFAULT 'owner_tri',
      task_id TEXT,
      reminder_id TEXT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      remind_at TEXT NOT NULL,
      due_at TEXT,
      priority TEXT DEFAULT 'NORMAL',
      status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'READ', 'DISMISSED', 'RESCHEDULED'
      is_read INTEGER DEFAULT 0,    -- 0: Chưa xem, 1: Đã xem
      read_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_owner_notifs_owner ON owner_notifications(owner_id);
    CREATE INDEX IF NOT EXISTS idx_owner_notifs_read ON owner_notifications(is_read);
    CREATE INDEX IF NOT EXISTS idx_owner_notifs_created ON owner_notifications(created_at);
  `);

  // 4. Bảng Nhật ký Thao tác Bảo mật (owner_audit_logs)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS owner_audit_logs (
      log_id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL DEFAULT 'owner_tri',
      action_type TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      details_json TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_owner_audit_owner ON owner_audit_logs(owner_id);
    CREATE INDEX IF NOT EXISTS idx_owner_audit_created ON owner_audit_logs(created_at);
  `);

  console.log('[MIGRATION] Private Secretary Schema Migration completed successfully.');
  return { success: true };
}

export async function rollbackPrivateSecretaryMigration(db) {
  console.log('[ROLLBACK] Rolling back Private Secretary Schema Migration...');
  await db.exec(`
    DROP TABLE IF EXISTS owner_notifications;
    DROP TABLE IF EXISTS owner_reminders;
    DROP TABLE IF EXISTS owner_tasks;
    DROP TABLE IF EXISTS owner_audit_logs;
  `);
  console.log('[ROLLBACK] Private Secretary Schema Rollback completed.');
  return { success: true };
}

export default { runPrivateSecretaryMigration, rollbackPrivateSecretaryMigration };
