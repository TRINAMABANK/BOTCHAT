import { initDatabase, db } from '../server/db.js';

async function main() {
  console.log('--- Testing DB Migrations ---');
  await initDatabase();

  const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE 'supplier_%' OR name LIKE 'crawl_%' OR name LIKE 'quotation%')");
  console.log('Verified Tables:', tables.map(t => t.name));

  const supp = await db.get("SELECT * FROM supplier_organizations WHERE id = 'supp_default'");
  console.log('Default Supplier:', supp ? supp.name : 'None');

  console.log('--- DB Migration Test Complete ---');
  process.exit(0);
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
