import { db, initDatabase } from '../server/db.js';
import { HumanMemoryEngine } from '../server/services/intelligence/humanMemoryEngine.js';

async function run() {
  await initDatabase();
  const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND (name = 'ai_memories' OR name LIKE 'ai_memory_%')");
  console.log('Human Brain Memory tables created:', tables.map(t => t.name));

  // Test remembering a fact
  const r1 = await HumanMemoryEngine.remember({
    memoryType: 'SEMANTIC',
    content: 'Khách hàng thích dòng máy in Brother HL-L6210DW',
    subject: 'PRODUCT_PREFERENCE',
    entityId: 'cust_001',
    userRole: 'customer',
    sensitivity: 'INTERNAL'
  });
  console.log('Remember 1 result:', r1);

  // Test retrieval
  const retrieved = await HumanMemoryEngine.retrieve({
    entityId: 'cust_001',
    userRole: 'owner'
  });
  console.log('Retrieved memories for cust_001:', retrieved.map(m => ({ id: m.memory_id, content: m.content, type: m.memory_type })));

  // Test stats
  const stats = await HumanMemoryEngine.getStats();
  console.log('Memory stats:', stats);

  process.exit(0);
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
