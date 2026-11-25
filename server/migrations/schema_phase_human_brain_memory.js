/**
 * SCHEMA MIGRATION: TRÍ AI HUMAN BRAIN 5-TIER MEMORY ENGINE
 * 
 * Creates:
 * 1. `ai_memories` - 16-field standard core memory table with deduplication hashing & retention
 * 2. `ai_memory_episodes` - Episodic memory (events, conversations, meetings, decisions)
 * 3. `ai_memory_entities` & `ai_memory_relations` - Semantic memory & entity knowledge graph
 * 4. `ai_memory_procedures` - Procedural memory (proven consultation skills & operational workflows)
 * 5. `ai_memory_prospective` - Prospective memory (future commitments, scheduled reminders, deadlines)
 * 6. `ai_memory_contradictions` - Contradiction detection, audit & resolution history
 * 
 * Idempotent, non-destructive, safe rollback.
 */

import crypto from 'crypto';

export async function runHumanBrainMemoryMigration(db) {
  console.log('[MIGRATION] Starting TRÍ AI Human Brain Memory Schema Migration...');

  // 1. Core Memory Table (16 Standard Fields + Hash)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ai_memories (
      memory_id TEXT PRIMARY KEY,
      memory_type TEXT NOT NULL,
      content TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      subject TEXT NOT NULL,
      entity_id TEXT,
      source TEXT NOT NULL,
      source_reference TEXT,
      confidence REAL NOT NULL DEFAULT 1.0,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      event_time TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      owner_id TEXT NOT NULL DEFAULT 'owner_tri',
      tenant_id TEXT NOT NULL DEFAULT 'org_default',
      sensitivity TEXT NOT NULL DEFAULT 'INTERNAL',
      expiration_at TEXT,
      reinforcement_count INTEGER DEFAULT 1,
      last_accessed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_ai_mem_type ON ai_memories(memory_type);
    CREATE INDEX IF NOT EXISTS idx_ai_mem_entity ON ai_memories(entity_id);
    CREATE INDEX IF NOT EXISTS idx_ai_mem_subject ON ai_memories(subject);
    CREATE INDEX IF NOT EXISTS idx_ai_mem_tenant_owner ON ai_memories(tenant_id, owner_id);
    CREATE INDEX IF NOT EXISTS idx_ai_mem_status ON ai_memories(status);
    CREATE INDEX IF NOT EXISTS idx_ai_mem_hash ON ai_memories(content_hash);
    CREATE INDEX IF NOT EXISTS idx_ai_mem_event_time ON ai_memories(event_time);
  `);

  // 2. Episodic Memory (Events & Episodes)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ai_memory_episodes (
      episode_id TEXT PRIMARY KEY,
      memory_id TEXT NOT NULL,
      conversation_id TEXT,
      participants_json TEXT NOT NULL,
      event_category TEXT NOT NULL,
      summary TEXT NOT NULL,
      outcome TEXT,
      location TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (memory_id) REFERENCES ai_memories(memory_id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_episodes_category ON ai_memory_episodes(event_category);
    CREATE INDEX IF NOT EXISTS idx_episodes_conv ON ai_memory_episodes(conversation_id);
  `);

  // 3. Semantic Memory: Entities & Relations Knowledge Graph
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ai_memory_entities (
      entity_id TEXT PRIMARY KEY,
      entity_name TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      description TEXT,
      attributes_json TEXT,
      tenant_id TEXT NOT NULL DEFAULT 'org_default',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_entities_type_name ON ai_memory_entities(entity_type, entity_name);

    CREATE TABLE IF NOT EXISTS ai_memory_relations (
      relation_id TEXT PRIMARY KEY,
      from_entity_id TEXT NOT NULL,
      relation_type TEXT NOT NULL,
      to_entity_id TEXT NOT NULL,
      strength REAL NOT NULL DEFAULT 1.0,
      confidence REAL NOT NULL DEFAULT 1.0,
      context TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (from_entity_id) REFERENCES ai_memory_entities(entity_id) ON DELETE CASCADE,
      FOREIGN KEY (to_entity_id) REFERENCES ai_memory_entities(entity_id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_rel_from ON ai_memory_relations(from_entity_id);
    CREATE INDEX IF NOT EXISTS idx_rel_to ON ai_memory_relations(to_entity_id);
  `);

  // 4. Procedural Memory: Proven Skills & Workflows
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ai_memory_procedures (
      procedure_id TEXT PRIMARY KEY,
      memory_id TEXT NOT NULL,
      procedure_name TEXT NOT NULL,
      trigger_condition TEXT NOT NULL,
      steps_json TEXT NOT NULL,
      success_rate REAL DEFAULT 1.0,
      usage_count INTEGER DEFAULT 1,
      is_verified INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (memory_id) REFERENCES ai_memories(memory_id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_proc_name ON ai_memory_procedures(procedure_name);
  `);

  // 5. Prospective Memory: Future Commitments & Tasks
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ai_memory_prospective (
      prospective_id TEXT PRIMARY KEY,
      memory_id TEXT NOT NULL,
      task_title TEXT NOT NULL,
      target_user_id TEXT NOT NULL DEFAULT 'owner_tri',
      trigger_time TEXT NOT NULL,
      trigger_condition TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING',
      priority TEXT NOT NULL DEFAULT 'NORMAL',
      notification_channel TEXT DEFAULT 'DASHBOARD',
      created_at TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY (memory_id) REFERENCES ai_memories(memory_id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_prosp_trigger ON ai_memory_prospective(trigger_time, status);
  `);

  // 6. Contradiction Detection & Audit Log
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ai_memory_contradictions (
      contradiction_id TEXT PRIMARY KEY,
      entity_id TEXT,
      subject TEXT NOT NULL,
      old_memory_id TEXT NOT NULL,
      old_value TEXT NOT NULL,
      new_value TEXT NOT NULL,
      detection_reason TEXT NOT NULL,
      resolution_status TEXT NOT NULL DEFAULT 'RESOLVED_UPDATE',
      resolved_by TEXT NOT NULL DEFAULT 'AI_LOGIC',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_contra_subject ON ai_memory_contradictions(subject);
  `);

  // 7. Safe Backfill from legacy `ai_customer_memory`
  try {
    const legacyMemories = await db.all('SELECT * FROM ai_customer_memory WHERE is_approved = 1');
    if (Array.isArray(legacyMemories) && legacyMemories.length > 0) {
      for (const lm of legacyMemories) {
        const contentStr = `${lm.key}: ${lm.value}`;
        const contentHash = crypto.createHash('sha256').update(contentStr.trim().toLowerCase()).digest('hex');
        const existing = await db.get('SELECT memory_id FROM ai_memories WHERE content_hash = ?', [contentHash]);
        if (!existing) {
          await db.run(`
            INSERT INTO ai_memories (
              memory_id, memory_type, content, content_hash, subject, entity_id,
              source, confidence, status, created_at, updated_at, owner_id, tenant_id, sensitivity, expiration_at
            ) VALUES (?, 'SEMANTIC', ?, ?, ?, ?, 'USER_CHAT', ?, 'ACTIVE', ?, ?, 'owner_tri', ?, 'INTERNAL', ?)
          `, [
            `mem_bf_${lm.id}`,
            contentStr,
            contentHash,
            lm.memory_type || 'PREFERENCE',
            lm.user_id,
            lm.confidence || 1.0,
            lm.created_at || new Date().toISOString(),
            lm.updated_at || new Date().toISOString(),
            lm.org_id || 'org_default',
            lm.expires_at || null
          ]);
        }
      }
      console.log(`[MIGRATION] Backfilled ${legacyMemories.length} legacy customer memories into ai_memories.`);
    }
  } catch (err) {
    console.warn('[MIGRATION] Legacy memory backfill notice:', err.message);
  }

  console.log('[MIGRATION] TRÍ AI Human Brain Memory Schema Migration completed successfully.');
  return { success: true };
}

export async function rollbackHumanBrainMemory(db) {
  console.log('[ROLLBACK] Rolling back TRÍ AI Human Brain Memory Schema Migration...');
  await db.exec(`
    DROP TABLE IF EXISTS ai_memory_contradictions;
    DROP TABLE IF EXISTS ai_memory_prospective;
    DROP TABLE IF EXISTS ai_memory_procedures;
    DROP TABLE IF EXISTS ai_memory_relations;
    DROP TABLE IF EXISTS ai_memory_entities;
    DROP TABLE IF EXISTS ai_memory_episodes;
    DROP TABLE IF EXISTS ai_memories;
  `);
  console.log('[ROLLBACK] TRÍ AI Human Brain Memory Schema Rollback completed.');
  return { success: true };
}

export default { runHumanBrainMemoryMigration, rollbackHumanBrainMemory };
