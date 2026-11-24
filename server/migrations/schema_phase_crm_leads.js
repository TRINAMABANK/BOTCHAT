/**
 * SCHEMA MIGRATION: CRM LEADS ENHANCEMENT
 * 
 * Supports:
 * 1. Adding columns: brand, model, products_json, conversation_summary to `leads` table.
 * 2. Idempotent check (adds columns only if not already existing).
 * 3. Safe index creation.
 */

export async function runCrmLeadsMigration(db) {
  console.log('[MIGRATION] Checking CRM leads schema enhancements...');

  // 1. Get existing columns of `leads` table
  const columns = await db.all('PRAGMA table_info(leads)');
  const colNames = new Set(columns.map(c => c.name));

  if (!colNames.has('brand')) {
    console.log('[MIGRATION] Adding column brand to leads table...');
    await db.exec('ALTER TABLE leads ADD COLUMN brand TEXT;');
  }

  if (!colNames.has('model')) {
    console.log('[MIGRATION] Adding column model to leads table...');
    await db.exec('ALTER TABLE leads ADD COLUMN model TEXT;');
  }

  if (!colNames.has('products_json')) {
    console.log('[MIGRATION] Adding column products_json to leads table...');
    await db.exec('ALTER TABLE leads ADD COLUMN products_json TEXT;');
  }

  if (!colNames.has('conversation_summary')) {
    console.log('[MIGRATION] Adding column conversation_summary to leads table...');
    await db.exec('ALTER TABLE leads ADD COLUMN conversation_summary TEXT;');
  }

  // 2. Create index for fast product queries
  try {
    await db.exec('CREATE INDEX IF NOT EXISTS idx_leads_product_name ON leads(product_name);');
  } catch (e) {
    // Index may already exist
  }

  console.log('[MIGRATION] CRM leads schema enhancement completed successfully.');
  return { success: true };
}

export async function rollbackCrmLeadsMigration(db) {
  console.log('[ROLLBACK] Note: SQLite does not drop columns in-place without table rebuild.');
  return { success: true };
}

export default { runCrmLeadsMigration, rollbackCrmLeadsMigration };
