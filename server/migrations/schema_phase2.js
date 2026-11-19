/**
 * TRÍ AI ULTIMATE ROBOT - DATABASE MIGRATION (PHASE 2)
 * Safe, idempotent schema extensions for Multi-Tenancy, Knowledge Ingestion,
 * Structured Excel storage, Multi-tier Price Lists, and Audit Citations.
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

export async function runPhase2Migrations(db) {
  console.log('[MIGRATION] Starting Phase 2 Schema Extensions for TRÍ AI ULTIMATE ROBOT...');
  const now = new Date().toISOString();

  // 1. Organizations Table (Multi-Tenancy Isolation)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      domain TEXT,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Ensure default organization exists
  const defaultOrg = await db.get("SELECT id FROM organizations WHERE id = 'org_default'");
  if (!defaultOrg) {
    await db.run(`
      INSERT INTO organizations (id, name, slug, domain, description, is_active, created_at, updated_at)
      VALUES ('org_default', 'Hệ thống TRÍ AI Global', 'triai-global', 'quangnhuttri.com', 'Tổ chức quản trị hệ thống và tri thức chung toàn diện', 1, ?, ?)
    `, [now, now]);
    console.log('[MIGRATION SEED] Seeded default organization "org_default".');
  }

  // 2. Extend Knowledge Documents with Scope & Approval Workflow
  await addColumnIfNotExists(db, 'knowledge_documents', 'org_id', "TEXT DEFAULT 'org_default'");
  await addColumnIfNotExists(db, 'knowledge_documents', 'scope', "TEXT DEFAULT 'global'");
  await addColumnIfNotExists(db, 'knowledge_documents', 'category_id', 'TEXT');
  await addColumnIfNotExists(db, 'knowledge_documents', 'approval_status', "TEXT DEFAULT 'APPROVED'");
  await addColumnIfNotExists(db, 'knowledge_documents', 'approved_by', 'TEXT');
  await addColumnIfNotExists(db, 'knowledge_documents', 'page_count', 'INTEGER DEFAULT 1');

  // 3. Extend Knowledge Chunks with Page/Sheet Citations
  await addColumnIfNotExists(db, 'knowledge_chunks', 'page_number', 'INTEGER');
  await addColumnIfNotExists(db, 'knowledge_chunks', 'sheet_name', 'TEXT');
  await addColumnIfNotExists(db, 'knowledge_chunks', 'org_id', "TEXT DEFAULT 'org_default'");
  await addColumnIfNotExists(db, 'knowledge_chunks', 'scope', "TEXT DEFAULT 'global'");

  // 4. Excel Structured Tables: Document Sheets & Document Rows
  await db.exec(`
    CREATE TABLE IF NOT EXISTS document_sheets (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      sheet_name TEXT NOT NULL,
      sheet_index INTEGER DEFAULT 0,
      row_count INTEGER DEFAULT 0,
      column_count INTEGER DEFAULT 0,
      columns_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (document_id) REFERENCES knowledge_documents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS document_rows (
      id TEXT PRIMARY KEY,
      sheet_id TEXT NOT NULL,
      document_id TEXT NOT NULL,
      row_index INTEGER NOT NULL,
      row_data_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (sheet_id) REFERENCES document_sheets(id) ON DELETE CASCADE,
      FOREIGN KEY (document_id) REFERENCES knowledge_documents(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_doc_rows_sheet ON document_rows(sheet_id);
    CREATE INDEX IF NOT EXISTS idx_doc_rows_doc ON document_rows(document_id);
  `);

  // 5. Multi-tier Price Lists
  await db.exec(`
    CREATE TABLE IF NOT EXISTS price_lists (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL DEFAULT 'org_default',
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      tier_type TEXT DEFAULT 'retail',
      currency TEXT DEFAULT 'VND',
      is_active INTEGER DEFAULT 1,
      valid_from TEXT,
      valid_to TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Seed default retail price list if not present
  const defaultPriceList = await db.get("SELECT id FROM price_lists WHERE id = 'pl_default_retail'");
  if (!defaultPriceList) {
    await db.run(`
      INSERT INTO price_lists (id, org_id, name, code, tier_type, currency, is_active, valid_from, valid_to, created_at, updated_at)
      VALUES ('pl_default_retail', 'org_default', 'Bảng Giá Bán Lẻ Tiêu Chuẩn', 'RETAIL_STANDARD', 'retail', 'VND', 1, ?, NULL, ?, ?)
    `, [now, now, now]);
    console.log('[MIGRATION SEED] Seeded default retail price list "pl_default_retail".');
  }

  // 6. Extend Product Prices
  await addColumnIfNotExists(db, 'product_prices', 'price_list_id', "TEXT DEFAULT 'pl_default_retail'");
  await addColumnIfNotExists(db, 'product_prices', 'currency', "TEXT DEFAULT 'VND'");
  await addColumnIfNotExists(db, 'product_prices', 'is_active', 'INTEGER DEFAULT 1');

  // 7. Promotions and Promotion Products
  await db.exec(`
    CREATE TABLE IF NOT EXISTS promotions (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL DEFAULT 'org_default',
      name TEXT NOT NULL,
      code TEXT UNIQUE,
      promo_type TEXT NOT NULL DEFAULT 'discount_percent',
      discount_percent REAL DEFAULT 0,
      discount_amount INTEGER DEFAULT 0,
      min_order_value INTEGER DEFAULT 0,
      gift_description TEXT,
      start_date TEXT,
      end_date TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS promotion_products (
      id TEXT PRIMARY KEY,
      promotion_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );
  `);

  // 8. Citation Audit Logs
  await db.exec(`
    CREATE TABLE IF NOT EXISTS citation_logs (
      id TEXT PRIMARY KEY,
      conversation_id TEXT,
      message_id TEXT,
      document_id TEXT,
      chunk_id TEXT,
      citation_text TEXT,
      score REAL,
      page_number INTEGER,
      sheet_name TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_citations_conv ON citation_logs(conversation_id);
  `);

  // 9. Extend Products for enterprise catalog requirements
  await addColumnIfNotExists(db, 'products', 'org_id', "TEXT DEFAULT 'org_default'");
  await addColumnIfNotExists(db, 'products', 'sku', 'TEXT');
  await addColumnIfNotExists(db, 'products', 'specs_json', 'TEXT');
  await addColumnIfNotExists(db, 'products', 'warranty_months', 'INTEGER DEFAULT 12');
  await addColumnIfNotExists(db, 'products', 'wholesale_price', 'INTEGER');
  await addColumnIfNotExists(db, 'products', 'business_status', "TEXT DEFAULT 'active'");

  console.log('[MIGRATION COMPLETE] Phase 2 Schema Extensions successfully applied.');
}

export default runPhase2Migrations;
