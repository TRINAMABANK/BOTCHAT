import { HumanMemoryEngine } from '../server/services/intelligence/humanMemoryEngine.js';
import { db } from '../server/db.js';

async function testContradiction() {
  // First statement: budget 10M
  await HumanMemoryEngine.remember({
    memoryType: 'SEMANTIC',
    content: '10 triệu đồng',
    subject: 'budget',
    entityId: 'cust_test_contra',
    userRole: 'customer'
  });

  // Second statement: budget changed to 25M
  await HumanMemoryEngine.remember({
    memoryType: 'SEMANTIC',
    content: '25 triệu đồng',
    subject: 'budget',
    entityId: 'cust_test_contra',
    userRole: 'customer'
  });

  // Check contradiction log
  const contraLogs = await db.all("SELECT * FROM ai_memory_contradictions WHERE entity_id = 'cust_test_contra'");
  console.log('Contradiction logs:', contraLogs);

  // Check active memories: should only have the new 25M active, 10M is SUPERSEDED
  const activeMem = await db.all("SELECT content, status FROM ai_memories WHERE entity_id = 'cust_test_contra'");
  console.log('Memories for cust_test_contra:', activeMem);

  // Clean up test
  await db.run("DELETE FROM ai_memory_contradictions WHERE entity_id = 'cust_test_contra'");
  await db.run("DELETE FROM ai_memories WHERE entity_id = 'cust_test_contra'");

  process.exit(0);
}

testContradiction().catch(err => {
  console.error(err);
  process.exit(1);
});
