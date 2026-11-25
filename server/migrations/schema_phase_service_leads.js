/**
 * SCHEMA MIGRATION: SERVICE SURVEY & INSTALLATION LEADS
 * 
 * Expands `leads` table with:
 * 1. `lead_type`: 'PRODUCT_SALES' | 'SERVICE_SURVEY'
 * 2. `service_type`: 'SERVICE_SURVEY_REQUEST' | 'INSTALLATION_REQUEST' | 'MAINTENANCE_REQUEST' | 'REPAIR_REQUEST'
 * 3. `survey_address`: Text address of the site / construction project
 * 4. `scale_or_quantity`: Scale, capacity or number of units/devices to install
 * 5. `expected_time`: Desired execution or survey time requested by customer
 * 6. `attachments`: JSON array string of customer files or images
 */

export async function runServiceLeadsMigration(db) {
  console.log('[MIGRATION] Checking Service Survey & Installation CRM schema...');

  const columns = await db.all('PRAGMA table_info(leads)');
  const colNames = new Set(columns.map(c => c.name));

  if (!colNames.has('lead_type')) {
    console.log('[MIGRATION] Adding column lead_type to leads table...');
    await db.exec("ALTER TABLE leads ADD COLUMN lead_type TEXT DEFAULT 'PRODUCT_SALES';");
  }

  if (!colNames.has('service_type')) {
    console.log('[MIGRATION] Adding column service_type to leads table...');
    await db.exec('ALTER TABLE leads ADD COLUMN service_type TEXT;');
  }

  if (!colNames.has('survey_address')) {
    console.log('[MIGRATION] Adding column survey_address to leads table...');
    await db.exec('ALTER TABLE leads ADD COLUMN survey_address TEXT;');
  }

  if (!colNames.has('scale_or_quantity')) {
    console.log('[MIGRATION] Adding column scale_or_quantity to leads table...');
    await db.exec('ALTER TABLE leads ADD COLUMN scale_or_quantity TEXT;');
  }

  if (!colNames.has('expected_time')) {
    console.log('[MIGRATION] Adding column expected_time to leads table...');
    await db.exec('ALTER TABLE leads ADD COLUMN expected_time TEXT;');
  }

  if (!colNames.has('attachments')) {
    console.log('[MIGRATION] Adding column attachments to leads table...');
    await db.exec('ALTER TABLE leads ADD COLUMN attachments TEXT;');
  }

  try {
    await db.exec('CREATE INDEX IF NOT EXISTS idx_leads_service_type ON leads(service_type);');
    await db.exec('CREATE INDEX IF NOT EXISTS idx_leads_lead_type ON leads(lead_type);');
  } catch (e) {
    // Indexes may already exist
  }

  console.log('[MIGRATION] Service Survey & Installation CRM schema migration completed.');
  return { success: true };
}

export default { runServiceLeadsMigration };
