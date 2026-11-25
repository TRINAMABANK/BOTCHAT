/**
 * SCHEMA MIGRATION: TRÍ AI PERSONAL ASSISTANT & SMART REMINDER (MASTER PROMPT 03)
 * 
 * Supports:
 * 1. `calendar_events`: Sự kiện và cuộc họp, tích hợp thời gian, địa điểm, người tham gia.
 * 2. `recurring_schedules`: Quản lý các chu kỳ lặp lại (Hàng ngày, Hàng tuần, Hàng tháng, Cron, RRule).
 * 3. `follow_up_rules`: Theo dõi có điều kiện (PO chưa xác nhận, Báo giá chưa phản hồi, Task trì trệ).
 * 4. `notification_preferences`: Cấu hình nhận thông báo đa kênh cho từng người dùng (App, Push, Email, Telegram).
 * 5. `notification_logs`: Nhật ký và hàng đợi chuyển phát thông báo đa kênh (có retry và deduplication).
 */

export async function runPersonalAssistantMigration(db) {
  console.log('[MIGRATION] Starting Personal Assistant & Smart Reminder Schema Migration...');

  // 1. Bảng Sự Kiện & Lịch Trình (calendar_events)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS calendar_events (
      event_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'owner_tri',
      tenant_id TEXT DEFAULT 'default',
      title TEXT NOT NULL,
      description TEXT,
      location TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      all_day INTEGER DEFAULT 0,
      status TEXT DEFAULT 'CONFIRMED', -- 'CONFIRMED', 'TENTATIVE', 'CANCELLED'
      priority TEXT DEFAULT 'MEDIUM',   -- 'LOW', 'MEDIUM', 'HIGH', 'URGENT'
      participants TEXT DEFAULT '[]',   -- JSON array: [{ name, email, role }]
      recurrence_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_calendar_user_time ON calendar_events(user_id, start_time, end_time);
    CREATE INDEX IF NOT EXISTS idx_calendar_status ON calendar_events(status);
  `);

  // 2. Bảng Quản Lý Chu Kỳ Lặp Lại (recurring_schedules)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS recurring_schedules (
      schedule_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'owner_tri',
      tenant_id TEXT DEFAULT 'default',
      target_type TEXT NOT NULL, -- 'TASK', 'REMINDER', 'EVENT', 'BRIEFING'
      target_id TEXT,
      title TEXT NOT NULL,
      recurrence_rule TEXT NOT NULL, -- e.g. 'FREQ=WEEKLY;BYDAY=MO;BYHOUR=9' or 'CRON:0 9 * * 1'
      next_run_at TEXT NOT NULL,
      last_run_at TEXT,
      end_condition TEXT,            -- JSON: { until, count, maxOccurrences }
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_recurring_active_next ON recurring_schedules(is_active, next_run_at);
  `);

  // 3. Bảng Quy Tắc Theo Dõi Có Điều Kiện (follow_up_rules)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS follow_up_rules (
      rule_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'owner_tri',
      tenant_id TEXT DEFAULT 'default',
      condition_type TEXT NOT NULL, -- 'SUPPLIER_PO_UNCONFIRMED', 'QUOTATION_PENDING', 'TASK_STAGNANT', 'CUSTOM'
      target_ref TEXT,               -- PO ID, Lead Phone, Quotation ID, Task ID
      check_interval_hours INTEGER DEFAULT 24,
      max_wait_hours INTEGER DEFAULT 72,
      trigger_condition TEXT,        -- JSON: { expected_status, max_days_unanswered: 3, entity_table: 'leads' }
      action_type TEXT DEFAULT 'CREATE_REMINDER', -- 'CREATE_REMINDER', 'ESCALATE_OWNER', 'NOTIFY_CHANNEL'
      status TEXT DEFAULT 'ACTIVE',  -- 'ACTIVE', 'TRIGGERED', 'EXPIRED', 'CANCELLED'
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_follow_up_status ON follow_up_rules(status, condition_type);
  `);

  // 4. Bảng Cài Đặt Nhận Thông Báo Đa Kênh (notification_preferences)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS notification_preferences (
      pref_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      tenant_id TEXT DEFAULT 'default',
      enable_in_app INTEGER DEFAULT 1,
      enable_push INTEGER DEFAULT 1,
      enable_email INTEGER DEFAULT 0,
      enable_telegram INTEGER DEFAULT 0,
      push_subscription TEXT,
      email_address TEXT,
      telegram_chat_id TEXT,
      quiet_hours_start TEXT DEFAULT '22:00',
      quiet_hours_end TEXT DEFAULT '07:00',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 5. Bảng Hàng Đợi & Nhật Ký Gửi Thông Báo (notification_logs)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS notification_logs (
      log_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'owner_tri',
      tenant_id TEXT DEFAULT 'default',
      notification_id TEXT,
      channel TEXT NOT NULL,        -- 'IN_APP', 'PUSH', 'EMAIL', 'TELEGRAM'
      recipient TEXT,
      subject TEXT,
      payload TEXT,
      delivery_status TEXT DEFAULT 'PENDING', -- 'PENDING', 'SENT', 'FAILED', 'RETRYING'
      retry_count INTEGER DEFAULT 0,
      last_error TEXT,
      delivered_at TEXT,
      created_at TEXT NOT NULL
    );
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_notif_log_status ON notification_logs(delivery_status, channel);
  `);

  // 6. Nâng cấp các bảng hiện có (Backward-Compatible Schema Alterations)
  try {
    const taskCols = await db.all('PRAGMA table_info(owner_tasks)');
    const taskColNames = new Set(taskCols.map(c => c.name));
    if (!taskColNames.has('recurrence_id')) {
      await db.run('ALTER TABLE owner_tasks ADD COLUMN recurrence_id TEXT');
    }
    if (!taskColNames.has('assigned_to')) {
      await db.run("ALTER TABLE owner_tasks ADD COLUMN assigned_to TEXT DEFAULT 'owner_tri'");
    }
    if (!taskColNames.has('remind_at')) {
      await db.run('ALTER TABLE owner_tasks ADD COLUMN remind_at TEXT');
    }

    const reminderCols = await db.all('PRAGMA table_info(owner_reminders)');
    const reminderColNames = new Set(reminderCols.map(c => c.name));
    if (!reminderColNames.has('schedule_id')) {
      await db.run('ALTER TABLE owner_reminders ADD COLUMN schedule_id TEXT');
    }
    if (!reminderColNames.has('condition_rule_id')) {
      await db.run('ALTER TABLE owner_reminders ADD COLUMN condition_rule_id TEXT');
    }
    if (!reminderColNames.has('channel')) {
      await db.run("ALTER TABLE owner_reminders ADD COLUMN channel TEXT DEFAULT 'ALL'");
    }

    // Đảm bảo cấu hình mặc định cho owner_tri
    const existingPref = await db.get('SELECT pref_id FROM notification_preferences WHERE user_id = ?', ['owner_tri']);
    if (!existingPref) {
      const nowIso = new Date().toISOString();
      await db.run(`
        INSERT INTO notification_preferences (
          pref_id, user_id, tenant_id, enable_in_app, enable_push, enable_email, enable_telegram,
          quiet_hours_start, quiet_hours_end, created_at, updated_at
        ) VALUES (?, ?, ?, 1, 1, 0, 0, '22:00', '07:00', ?, ?)
      `, [`pref_owner_tri`, 'owner_tri', 'default', nowIso, nowIso]);
    }
  } catch (err) {
    console.warn('[MIGRATION] Table alteration or default pref warning:', err.message);
  }

  console.log('[MIGRATION] Personal Assistant Schema Migration completed successfully.');
}
