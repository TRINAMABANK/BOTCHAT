/**
 * SCHEMA MIGRATION: BOTCHAT BRAIN 2.1 – UNIVERSAL INTENT & CONTEXT ENGINE
 * 
 * Supports:
 * 1. Owner Tasks & Agenda Management (`owner_tasks`)
 * 2. AI Secretary Memos & Email Drafts (`secretary_notes`)
 * 3. Security & Anti-Impersonation Audit Logs (`ai_security_audit_logs`)
 * 4. Safe idempotent execution and rollback capability
 */

export async function runBrain21Migration(db) {
  console.log('[MIGRATION] Starting BOTCHAT BRAIN 2.1 Schema Migration...');

  // 1. Owner Tasks & Agenda Management
  await db.exec(`
    CREATE TABLE IF NOT EXISTS owner_tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'owner_tri',
      title TEXT NOT NULL,
      description TEXT,
      time_spec TEXT,
      priority TEXT NOT NULL DEFAULT 'NORMAL', -- 'LOW', 'NORMAL', 'HIGH', 'URGENT'
      status TEXT NOT NULL DEFAULT 'PENDING',  -- 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_owner_tasks_user ON owner_tasks(user_id);
    CREATE INDEX IF NOT EXISTS idx_owner_tasks_status ON owner_tasks(status);
  `);

  // 2. AI Secretary Notes & Drafts
  await db.exec(`
    CREATE TABLE IF NOT EXISTS secretary_notes (
      id TEXT PRIMARY KEY,
      conversation_id TEXT,
      user_id TEXT NOT NULL DEFAULT 'owner_tri',
      category TEXT NOT NULL DEFAULT 'NOTE', -- 'NOTE', 'EMAIL_DRAFT', 'MEETING_MEMO'
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sec_notes_user ON secretary_notes(user_id);
    CREATE INDEX IF NOT EXISTS idx_sec_notes_cat ON secretary_notes(category);
  `);

  // 3. Security Audit & Anti-Impersonation Incident Logs
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ai_security_audit_logs (
      id TEXT PRIMARY KEY,
      conversation_id TEXT,
      user_id TEXT,
      attempted_action TEXT NOT NULL,
      blocked_reason TEXT NOT NULL,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sec_audit_action ON ai_security_audit_logs(attempted_action);
    CREATE INDEX IF NOT EXISTS idx_sec_audit_created ON ai_security_audit_logs(created_at);
  `);

  console.log('[MIGRATION] BOTCHAT BRAIN 2.1 Schema Migration completed successfully.');
  return { success: true };
}

export async function rollbackBrain21Migration(db) {
  console.log('[ROLLBACK] Rolling back BOTCHAT BRAIN 2.1 Schema Migration...');
  await db.exec(`
    DROP TABLE IF EXISTS owner_tasks;
    DROP TABLE IF EXISTS secretary_notes;
    DROP TABLE IF EXISTS ai_security_audit_logs;
  `);
  console.log('[ROLLBACK] BOTCHAT BRAIN 2.1 Schema Rollback completed.');
  return { success: true };
}

export default { runBrain21Migration, rollbackBrain21Migration };
