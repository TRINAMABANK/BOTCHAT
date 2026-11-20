/**
 * TRÍ AI ULTIMATE ROBOT - DATABASE MIGRATION (WEBSITE-TO-QUOTATION ENGINE)
 * Idempotent schema migration for Universal Crawler, 22-field Product Catalog,
 * Price Change History, and Quotation Management.
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

export async function runCrawlerMigrations(db) {
  console.log('[MIGRATION] Starting Website-to-Quotation Schema Migration...');
  const now = new Date().toISOString();

  // 1. Supplier Organizations
  await db.exec(`
    CREATE TABLE IF NOT EXISTS supplier_organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contact_email TEXT,
      contact_phone TEXT,
      address TEXT,
      notes TEXT,
      org_id TEXT DEFAULT 'org_default',
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_supplier_orgs_name ON supplier_organizations(name);
  `);

  // Ensure default sample supplier exists
  const defaultSupplier = await db.get("SELECT id FROM supplier_organizations WHERE id = 'supp_default'");
  if (!defaultSupplier) {
    await db.run(`
      INSERT INTO supplier_organizations (id, name, contact_email, contact_phone, address, notes, org_id, is_active, created_at, updated_at)
      VALUES ('supp_default', 'Nhà Phân Phối Thiết Bị & Công Nghệ Tổng Hợp', 'contact@supplier.vn', '1900 6868', 'Hà Nội & TP.HCM', 'Nhà cung cấp đối tác mẫu cho hệ thống', 'org_default', 1, ?, ?)
    `, [now, now]);
    console.log('[MIGRATION SEED] Seeded default supplier "supp_default".');
  }

  // 2. Supplier Websites
  await db.exec(`
    CREATE TABLE IF NOT EXISTS supplier_websites (
      id TEXT PRIMARY KEY,
      supplier_id TEXT NOT NULL,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      category_hint TEXT,
      crawl_frequency TEXT DEFAULT 'DAILY',
      last_crawled_at TEXT,
      last_status TEXT DEFAULT 'IDLE',
      products_count INTEGER DEFAULT 0,
      auto_crawl INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (supplier_id) REFERENCES supplier_organizations(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_supplier_websites_supp ON supplier_websites(supplier_id);
  `);

  // 3. Crawl Jobs
  await db.exec(`
    CREATE TABLE IF NOT EXISTS crawl_jobs (
      id TEXT PRIMARY KEY,
      website_id TEXT NOT NULL,
      supplier_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      urls_discovered INTEGER DEFAULT 0,
      urls_crawled INTEGER DEFAULT 0,
      products_found INTEGER DEFAULT 0,
      products_new INTEGER DEFAULT 0,
      products_updated INTEGER DEFAULT 0,
      errors_count INTEGER DEFAULT 0,
      error_log_json TEXT,
      started_at TEXT,
      finished_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (website_id) REFERENCES supplier_websites(id) ON DELETE CASCADE,
      FOREIGN KEY (supplier_id) REFERENCES supplier_organizations(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_crawl_jobs_web ON crawl_jobs(website_id);
    CREATE INDEX IF NOT EXISTS idx_crawl_jobs_status ON crawl_jobs(status);
  `);

  // 4. Crawl URLs (Frontier & Status)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS crawl_urls (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      website_id TEXT NOT NULL,
      url TEXT NOT NULL,
      url_type TEXT DEFAULT 'PRODUCT',
      depth INTEGER DEFAULT 0,
      http_status INTEGER,
      crawl_status TEXT DEFAULT 'PENDING',
      error_message TEXT,
      crawled_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (job_id) REFERENCES crawl_jobs(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_crawl_urls_job ON crawl_urls(job_id);
    CREATE INDEX IF NOT EXISTS idx_crawl_urls_url ON crawl_urls(url);
  `);

  // 5. Crawled Products (22 Standard Fields)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS crawled_products (
      id TEXT PRIMARY KEY,
      supplier_id TEXT NOT NULL,
      website_id TEXT NOT NULL,
      product_id TEXT,
      name TEXT NOT NULL,
      sku TEXT,
      brand TEXT,
      category TEXT,
      description TEXT,
      specs_json TEXT,
      original_price REAL DEFAULT 0,
      sale_price REAL DEFAULT 0,
      currency TEXT DEFAULT 'VND',
      unit TEXT DEFAULT 'cái',
      availability TEXT DEFAULT 'IN_STOCK',
      image_url TEXT,
      product_url TEXT NOT NULL,
      source_url TEXT,
      crawled_at TEXT NOT NULL,
      verified_at TEXT,
      approval_status TEXT DEFAULT 'PENDING',
      price_confirmation_level TEXT DEFAULT 'REFERENCE_ONLY',
      data_confidence REAL DEFAULT 0.8,
      org_id TEXT DEFAULT 'org_default',
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (supplier_id) REFERENCES supplier_organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (website_id) REFERENCES supplier_websites(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_crawled_prod_supp ON crawled_products(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_crawled_prod_web ON crawled_products(website_id);
    CREATE INDEX IF NOT EXISTS idx_crawled_prod_status ON crawled_products(approval_status);
    CREATE INDEX IF NOT EXISTS idx_crawled_prod_url ON crawled_products(product_url);
    CREATE INDEX IF NOT EXISTS idx_crawled_prod_sku ON crawled_products(sku);
  `);

  // 6. Product Price History
  await db.exec(`
    CREATE TABLE IF NOT EXISTS product_price_history (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      old_price REAL NOT NULL,
      new_price REAL NOT NULL,
      price_type TEXT DEFAULT 'sale_price',
      changed_at TEXT NOT NULL,
      change_percent REAL,
      job_id TEXT,
      source_url TEXT,
      FOREIGN KEY (product_id) REFERENCES crawled_products(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_price_history_prod ON product_price_history(product_id);
  `);

  // 7. Quotations
  await db.exec(`
    CREATE TABLE IF NOT EXISTS quotations (
      id TEXT PRIMARY KEY,
      quote_code TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      customer_email TEXT,
      customer_company TEXT,
      conversation_id TEXT,
      total_amount REAL NOT NULL DEFAULT 0,
      vat_percent REAL DEFAULT 10,
      vat_amount REAL DEFAULT 0,
      final_amount REAL NOT NULL DEFAULT 0,
      status TEXT DEFAULT 'DRAFT',
      notes TEXT,
      valid_until TEXT,
      created_by TEXT DEFAULT 'Central Brain AI',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_quotes_code ON quotations(quote_code);
    CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotations(status);
  `);

  // 8. Quotation Items
  await db.exec(`
    CREATE TABLE IF NOT EXISTS quotation_items (
      id TEXT PRIMARY KEY,
      quotation_id TEXT NOT NULL,
      product_id TEXT,
      product_name TEXT NOT NULL,
      sku TEXT,
      specs_snippet TEXT,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit TEXT DEFAULT 'cái',
      unit_price REAL NOT NULL,
      price_type TEXT DEFAULT 'REFERENCE_ONLY',
      total_price REAL NOT NULL,
      notes TEXT,
      FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_quote_items_qid ON quotation_items(quotation_id);
  `);

  console.log('[MIGRATION COMPLETE] Website-to-Quotation Schema Migration successfully applied.');
}

export default runCrawlerMigrations;
