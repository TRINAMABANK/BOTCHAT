/**
 * TRÍ AN LEARNING CENTER - DATABASE SCHEMA MIGRATION
 * Upgrades unanswered_questions table, creates learning_knowledge_entries and learning_test_runs
 */

export function runLearningCenterMigration(db) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 1. Upgrade unanswered_questions table with safe ALTER TABLE
      db.run(`
        CREATE TABLE IF NOT EXISTS unanswered_questions (
          id TEXT PRIMARY KEY,
          conversation_id TEXT,
          question TEXT,
          context_json TEXT,
          status TEXT DEFAULT 'NEW',
          resolved_answer TEXT,
          resolved_by TEXT,
          created_at TEXT,
          resolved_at TEXT
        )
      `, (err) => {
        if (err) console.error('[MIGRATION] Error ensuring unanswered_questions table:', err.message);
      });

      // Safely check and add columns to unanswered_questions
      db.all("PRAGMA table_info(unanswered_questions)", [], (err, cols) => {
        if (!err && cols) {
          const colNames = cols.map(c => c.name);
          const alterStatements = [
            { name: 'original_question', sql: 'ALTER TABLE unanswered_questions ADD COLUMN original_question TEXT' },
            { name: 'ai_response', sql: 'ALTER TABLE unanswered_questions ADD COLUMN ai_response TEXT' },
            { name: 'related_topic', sql: 'ALTER TABLE unanswered_questions ADD COLUMN related_topic TEXT' },
            { name: 'related_product_name', sql: 'ALTER TABLE unanswered_questions ADD COLUMN related_product_name TEXT' },
            { name: 'sources_searched_json', sql: 'ALTER TABLE unanswered_questions ADD COLUMN sources_searched_json TEXT' },
            { name: 'failure_reason', sql: 'ALTER TABLE unanswered_questions ADD COLUMN failure_reason TEXT' },
            { name: 'priority', sql: "ALTER TABLE unanswered_questions ADD COLUMN priority TEXT DEFAULT 'MEDIUM'" },
            { name: 'hit_count', sql: "ALTER TABLE unanswered_questions ADD COLUMN hit_count INTEGER DEFAULT 1" },
            { name: 'resolved_knowledge_id', sql: 'ALTER TABLE unanswered_questions ADD COLUMN resolved_knowledge_id TEXT' },
            { name: 'updated_at', sql: 'ALTER TABLE unanswered_questions ADD COLUMN updated_at TEXT' }
          ];

          alterStatements.forEach(({ name, sql }) => {
            if (!colNames.includes(name)) {
              db.run(sql, (alterErr) => {
                if (!alterErr) {
                  console.log(`[MIGRATION SUCCESS] Added column ${name} to unanswered_questions`);
                }
              });
            }
          });
        }
      });

      // 2. Create learning_knowledge_entries table (curated knowledge taught by Admin)
      db.run(`
        CREATE TABLE IF NOT EXISTS learning_knowledge_entries (
          id TEXT PRIMARY KEY,
          unanswered_question_id TEXT,
          entry_type TEXT NOT NULL,
          standard_question TEXT,
          standard_answer TEXT NOT NULL,
          related_topic TEXT,
          related_product_id TEXT,
          related_product_name TEXT,
          source_type TEXT NOT NULL,
          source_filename TEXT,
          source_url TEXT,
          extracted_content TEXT,
          approval_status TEXT DEFAULT 'NEW',
          approved_by TEXT,
          approved_at TEXT,
          version INTEGER DEFAULT 1,
          is_active INTEGER DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `, (err) => {
        if (err) console.error('[MIGRATION] Error creating learning_knowledge_entries:', err.message);
      });

      // 3. Create learning_test_runs table (Before vs After regression test logs)
      db.run(`
        CREATE TABLE IF NOT EXISTS learning_test_runs (
          id TEXT PRIMARY KEY,
          unanswered_question_id TEXT,
          learning_knowledge_id TEXT,
          test_query TEXT NOT NULL,
          before_response TEXT,
          after_response TEXT,
          is_correct_product INTEGER DEFAULT 0,
          is_grounded INTEGER DEFAULT 0,
          has_valid_source INTEGER DEFAULT 0,
          passed INTEGER DEFAULT 0,
          metrics_json TEXT,
          created_at TEXT NOT NULL
        )
      `, (err) => {
        if (err) {
          console.error('[MIGRATION] Error creating learning_test_runs:', err.message);
          return reject(err);
        }
        console.log('[MIGRATION SUCCESS] TRÍ AN Learning Center schema initialized.');
        resolve();
      });
    });
  });
}
