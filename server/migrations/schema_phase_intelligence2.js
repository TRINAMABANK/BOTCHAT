/**
 * SCHEMA MIGRATION: TRÍ AI SMART INTELLIGENCE 2.0
 * 
 * Supports:
 * 1. AI Customer Memory (Session, Opt-in Profile, Preferences, Tenant Isolation)
 * 2. User Feedbacks & Continuous Learning
 * 3. Smart Tool Telemetry & Cost / Latency Metrics
 * 4. Live Website Retrieval Short-Term Cache
 */

export async function runIntelligence2Migration(db) {
  console.log('[MIGRATION] Starting TRÍ AI Smart Intelligence 2.0 Schema Migration...');

  // 1. Customer Memory Table (Tiered & Scoped per user & organization)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ai_customer_memory (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      org_id TEXT NOT NULL DEFAULT 'org_default',
      memory_type TEXT NOT NULL, -- 'PROFILE', 'PREFERENCE', 'BUDGET', 'NOTE'
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      confidence REAL NOT NULL DEFAULT 1.0,
      is_approved INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      expires_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_ai_mem_user_org ON ai_customer_memory(user_id, org_id);
    CREATE INDEX IF NOT EXISTS idx_ai_mem_key ON ai_customer_memory(key);
  `);

  // 2. Memory Feedback & Quality Ratings
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ai_memory_feedbacks (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      message_id TEXT,
      rating INTEGER NOT NULL, -- 1 = Positive, -1 = Negative
      feedback_text TEXT,
      category TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ai_feedbacks_conv ON ai_memory_feedbacks(conversation_id);
  `);

  // 3. Smart Tool Telemetry & Latency/Cost Tracker
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ai_tool_telemetry (
      id TEXT PRIMARY KEY,
      conversation_id TEXT,
      tool_name TEXT NOT NULL,
      execution_time_ms INTEGER NOT NULL,
      tokens_used INTEGER NOT NULL DEFAULT 0,
      cost_usd REAL NOT NULL DEFAULT 0.0,
      status TEXT NOT NULL, -- 'SUCCESS', 'ERROR', 'TIMEOUT'
      error_message TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ai_telem_tool ON ai_tool_telemetry(tool_name);
    CREATE INDEX IF NOT EXISTS idx_ai_telem_created ON ai_tool_telemetry(created_at);
  `);

  // 4. Live Website Retrieval Cache (Short-term caching to prevent excessive crawling)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS live_website_cache (
      id TEXT PRIMARY KEY,
      website_id TEXT,
      query_key TEXT NOT NULL,
      product_name TEXT NOT NULL,
      product_url TEXT NOT NULL,
      price REAL,
      specs_json TEXT,
      status_code INTEGER DEFAULT 200,
      crawled_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_live_cache_key ON live_website_cache(query_key);
    CREATE INDEX IF NOT EXISTS idx_live_cache_expires ON live_website_cache(expires_at);
  `);

  // 5. Seed default Central Brain control settings if not present
  const defaultBrainSettings = [
    { key: 'brain_intelligence_level', value: '2.0', description: 'Phiên bản trí tuệ nhân tạo Central Brain' },
    { key: 'enable_customer_memory', value: '1', description: 'Cho phép ghi nhớ thông tin khách hàng có kiểm soát (1: Bật, 0: Tắt)' },
    { key: 'enable_live_website_retrieval', value: '1', description: 'Cho phép truy xuất trực tiếp website nhà cung cấp theo thời gian thực (1: Bật, 0: Tắt)' },
    { key: 'enable_tool_telemetry', value: '1', description: 'Ghi nhật ký chi phí token và độ trễ các công cụ (1: Bật, 0: Tắt)' },
    { key: 'memory_retention_days', value: '90', description: 'Số ngày lưu trữ trí nhớ khách hàng trước khi tự động hết hạn' }
  ];

  for (const s of defaultBrainSettings) {
    const existing = await db.get('SELECT key FROM bot_settings WHERE key = ?', [s.key]);
    if (!existing) {
      await db.run(
        'INSERT INTO bot_settings (key, value, description, updated_at) VALUES (?, ?, ?, ?)',
        [s.key, s.value, s.description, new Date().toISOString()]
      );
    }
  }

  console.log('[MIGRATION COMPLETE] TRÍ AI Smart Intelligence 2.0 Schema successfully applied.');
}
