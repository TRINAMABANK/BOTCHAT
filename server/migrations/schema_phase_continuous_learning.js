/**
 * TRÍ AI ONE SUPER BRAIN - CONTINUOUS LEARNING & UNIFIED KNOWLEDGE PIPELINE SCHEMA MIGRATION
 * 
 * Non-destructive, idempotent migration:
 * 1. Extends `knowledge_documents` with:
 *    - source_origin ('UPLOAD' | 'WEBSITE' | 'INTERNET' | 'EXPERIENCE' | 'EXPERT')
 *    - source_url
 *    - original_filename
 *    - content_hash (SHA-256 for deduplication)
 *    - processing_status ('PENDING' | 'PROCESSING' | 'READY' | 'FAILED')
 *    - processing_error
 *    - product_scope ('all' | 'sales_robot' | 'receptionist' | 'secretary' | 'tutor' | 'voice_vision' | 'enterprise')
 * 2. Extends `knowledge_chunks` with:
 *    - product_scope
 * 3. Creates `knowledge_batch_uploads` table for tracking multi-file upload progress.
 * 4. Creates `knowledge_crawler_tasks` table for managing background general web knowledge crawls.
 */

async function addColumnIfNotExists(db, tableName, columnName, columnDefinition) {
  try {
    const columns = await db.all(`PRAGMA table_info(${tableName})`);
    const exists = columns.some((c) => c.name.toLowerCase() === columnName.toLowerCase());
    if (!exists) {
      console.log(`[MIGRATION] Adding column '${columnName}' to table '${tableName}'...`);
      await db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
      console.log(`[MIGRATION SUCCESS] Column '${columnName}' added to '${tableName}'.`);
    }
  } catch (err) {
    console.warn(`[MIGRATION WARN] Could not add column '${columnName}' to '${tableName}':`, err.message);
  }
}

export async function runContinuousLearningMigration(db) {
  console.log('[MIGRATION] Starting Continuous Learning & Unified Knowledge Pipeline Schema Migration...');
  const now = new Date().toISOString();

  // 1. Extend knowledge_documents
  await addColumnIfNotExists(db, 'knowledge_documents', 'source_origin', "TEXT DEFAULT 'UPLOAD'");
  await addColumnIfNotExists(db, 'knowledge_documents', 'source_url', 'TEXT');
  await addColumnIfNotExists(db, 'knowledge_documents', 'original_filename', 'TEXT');
  await addColumnIfNotExists(db, 'knowledge_documents', 'content_hash', 'TEXT');
  await addColumnIfNotExists(db, 'knowledge_documents', 'processing_status', "TEXT DEFAULT 'READY'");
  await addColumnIfNotExists(db, 'knowledge_documents', 'processing_error', 'TEXT');
  await addColumnIfNotExists(db, 'knowledge_documents', 'product_scope', "TEXT DEFAULT 'all'");

  // 2. Extend knowledge_chunks
  await addColumnIfNotExists(db, 'knowledge_chunks', 'product_scope', "TEXT DEFAULT 'all'");

  // 3. Create knowledge_batch_uploads
  await db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_batch_uploads (
      id TEXT PRIMARY KEY,
      org_id TEXT DEFAULT 'org_default',
      total_files INTEGER NOT NULL DEFAULT 0,
      processed_files INTEGER NOT NULL DEFAULT 0,
      successful_files INTEGER NOT NULL DEFAULT 0,
      failed_files INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'PENDING',
      error_log_json TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_batch_status ON knowledge_batch_uploads(status);
  `);

  // 4. Create knowledge_crawler_tasks
  await db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_crawler_tasks (
      id TEXT PRIMARY KEY,
      org_id TEXT DEFAULT 'org_default',
      root_url TEXT NOT NULL,
      crawl_mode TEXT DEFAULT 'SINGLE_PAGE',
      max_urls INTEGER DEFAULT 20,
      urls_discovered INTEGER DEFAULT 0,
      urls_crawled INTEGER DEFAULT 0,
      pages_ingested INTEGER DEFAULT 0,
      pages_skipped INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'PENDING',
      error_log_json TEXT DEFAULT '[]',
      last_content_hash TEXT,
      product_scope TEXT DEFAULT 'all',
      started_at TEXT,
      finished_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_crawl_task_status ON knowledge_crawler_tasks(status);
    CREATE INDEX IF NOT EXISTS idx_kd_source_origin ON knowledge_documents(source_origin);
    CREATE INDEX IF NOT EXISTS idx_kd_content_hash ON knowledge_documents(content_hash);
    CREATE INDEX IF NOT EXISTS idx_kd_product_scope ON knowledge_documents(product_scope);
  `);

  console.log('[MIGRATION SUCCESS] Continuous Learning Schema Migration complete.');
}

export default runContinuousLearningMigration;
