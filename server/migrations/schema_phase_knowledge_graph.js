/**
 * TRÍ AI ULTIMATE ROBOT – KNOWLEDGE GRAPH & VECTOR SCHEMA MIGRATION (STAGE 3)
 * DOCTOR-LEVEL ALL-DOMAIN KNOWLEDGE ONTOLOGY
 * 
 * Tables:
 * - ai_knowledge_entities: Đỉnh của đồ thị tri thức (Entity Nodes)
 * - ai_knowledge_relations: Cạnh quan hệ ngữ nghĩa có hướng (Directed Semantic Edges)
 * - ai_vector_embeddings: Kho lưu trữ Vector Embeddings hỗ trợ Dense Vector RAG
 */

export async function runKnowledgeGraphMigration(db) {
  console.log('[MIGRATION] Checking Knowledge Graph & Semantic Vector schema...');

  // 1. Knowledge Graph Entities
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ai_knowledge_entities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      canonical_id TEXT,
      properties_json TEXT,
      org_id TEXT DEFAULT 'org_default',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_kg_entities_name ON ai_knowledge_entities(name);
    CREATE INDEX IF NOT EXISTS idx_kg_entities_type ON ai_knowledge_entities(entity_type);
    CREATE INDEX IF NOT EXISTS idx_kg_entities_org ON ai_knowledge_entities(org_id);
    CREATE INDEX IF NOT EXISTS idx_kg_entities_canon ON ai_knowledge_entities(canonical_id);
  `);

  // 2. Knowledge Graph Relations (Directed Edges)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ai_knowledge_relations (
      id TEXT PRIMARY KEY,
      source_entity_id TEXT NOT NULL,
      target_entity_id TEXT NOT NULL,
      relation_type TEXT NOT NULL,
      weight REAL DEFAULT 1.0,
      properties_json TEXT,
      org_id TEXT DEFAULT 'org_default',
      created_at TEXT NOT NULL
    );
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_kg_relations_src ON ai_knowledge_relations(source_entity_id);
    CREATE INDEX IF NOT EXISTS idx_kg_relations_tgt ON ai_knowledge_relations(target_entity_id);
    CREATE INDEX IF NOT EXISTS idx_kg_relations_type ON ai_knowledge_relations(relation_type);
    CREATE INDEX IF NOT EXISTS idx_kg_relations_org ON ai_knowledge_relations(org_id);
  `);

  // 3. Dense Vector Embeddings Store
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ai_vector_embeddings (
      id TEXT PRIMARY KEY,
      content_hash TEXT UNIQUE,
      chunk_id TEXT,
      embedding_json TEXT NOT NULL,
      dimensions INTEGER DEFAULT 128,
      created_at TEXT NOT NULL
    );
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_vector_content_hash ON ai_vector_embeddings(content_hash);
  `);

  console.log('[MIGRATION] Knowledge Graph & Semantic Vector schema applied successfully.');
}
