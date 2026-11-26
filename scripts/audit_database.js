import { db } from '../server/db.js';

async function audit() {
  const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
  console.log('=== DATABASE AUDIT: ' + tables.length + ' TABLES ===');
  for (const t of tables) {
    const info = await db.all(`PRAGMA table_info(${t.name})`);
    const count = await db.get(`SELECT COUNT(*) as cnt FROM ${t.name}`);
    console.log(`Table [${t.name}] (${count.cnt} rows):`);
    console.log('  Columns:', info.map(c => `${c.name} (${c.type}${c.notnull ? ' NOT NULL' : ''}${c.pk ? ' PK' : ''})`).join(', '));
  }
  process.exit(0);
}

audit().catch(err => {
  console.error(err);
  process.exit(1);
});
