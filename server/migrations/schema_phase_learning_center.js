/**
 * TRÍ AN LEARNING CENTER - DATABASE SCHEMA MIGRATION
 * Upgrades unanswered_questions, learning_knowledge_entries, knowledge_versions, ai_test_cases, and learning_test_runs
 */

function runQuery(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function allQuery(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

export async function runLearningCenterMigration(db) {
  try {
    // 1. Upgrade unanswered_questions table
    await runQuery(db, `
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
    `);

    const uqCols = (await allQuery(db, "PRAGMA table_info(unanswered_questions)")).map(c => c.name);
    const uqAlters = [
      { name: 'original_question', sql: 'ALTER TABLE unanswered_questions ADD COLUMN original_question TEXT' },
      { name: 'ai_response', sql: 'ALTER TABLE unanswered_questions ADD COLUMN ai_response TEXT' },
      { name: 'related_topic', sql: 'ALTER TABLE unanswered_questions ADD COLUMN related_topic TEXT' },
      { name: 'related_product_name', sql: 'ALTER TABLE unanswered_questions ADD COLUMN related_product_name TEXT' },
      { name: 'related_product_id', sql: 'ALTER TABLE unanswered_questions ADD COLUMN related_product_id TEXT' },
      { name: 'org_id', sql: "ALTER TABLE unanswered_questions ADD COLUMN org_id TEXT DEFAULT 'default'" },
      { name: 'chatbot_id', sql: "ALTER TABLE unanswered_questions ADD COLUMN chatbot_id TEXT DEFAULT 'tri-an-core'" },
      { name: 'assigned_to', sql: 'ALTER TABLE unanswered_questions ADD COLUMN assigned_to TEXT' },
      { name: 'tested_at', sql: 'ALTER TABLE unanswered_questions ADD COLUMN tested_at TEXT' },
      { name: 'test_notes', sql: 'ALTER TABLE unanswered_questions ADD COLUMN test_notes TEXT' },
      { name: 'sources_searched_json', sql: 'ALTER TABLE unanswered_questions ADD COLUMN sources_searched_json TEXT' },
      { name: 'failure_reason', sql: 'ALTER TABLE unanswered_questions ADD COLUMN failure_reason TEXT' },
      { name: 'priority', sql: "ALTER TABLE unanswered_questions ADD COLUMN priority TEXT DEFAULT 'MEDIUM'" },
      { name: 'hit_count', sql: "ALTER TABLE unanswered_questions ADD COLUMN hit_count INTEGER DEFAULT 1" },
      { name: 'resolved_knowledge_id', sql: 'ALTER TABLE unanswered_questions ADD COLUMN resolved_knowledge_id TEXT' },
      { name: 'is_recurring', sql: 'ALTER TABLE unanswered_questions ADD COLUMN is_recurring INTEGER DEFAULT 0' },
      { name: 'last_corrected_at', sql: 'ALTER TABLE unanswered_questions ADD COLUMN last_corrected_at TEXT' },
      { name: 'correction_diff_json', sql: 'ALTER TABLE unanswered_questions ADD COLUMN correction_diff_json TEXT' },
      { name: 'updated_at', sql: 'ALTER TABLE unanswered_questions ADD COLUMN updated_at TEXT' }
    ];

    for (const { name, sql } of uqAlters) {
      if (!uqCols.includes(name)) {
        try {
          await runQuery(db, sql);
          console.log(`[MIGRATION SUCCESS] Added column ${name} to unanswered_questions`);
        } catch (e) {
          console.error(`[MIGRATION ERROR] Column ${name} error:`, e.message);
        }
      }
    }

    // 2. Create learning_knowledge_entries table (curated knowledge taught by Admin)
    await runQuery(db, `
      CREATE TABLE IF NOT EXISTS learning_knowledge_entries (
        id TEXT PRIMARY KEY,
        unanswered_question_id TEXT,
        entry_type TEXT NOT NULL,
        standard_question TEXT,
        standard_answer TEXT NOT NULL,
        related_topic TEXT,
        related_product_id TEXT,
        related_product_name TEXT,
        policy_type TEXT,
        business_group TEXT,
        org_id TEXT DEFAULT 'default',
        source_type TEXT NOT NULL,
        source_filename TEXT,
        source_url TEXT,
        extracted_content TEXT,
        approval_status TEXT DEFAULT 'PENDING_REVIEW',
        approved_by TEXT,
        approved_at TEXT,
        conflict_flag INTEGER DEFAULT 0,
        conflict_notes TEXT,
        version INTEGER DEFAULT 1,
        is_active INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    const lkeCols = (await allQuery(db, "PRAGMA table_info(learning_knowledge_entries)")).map(c => c.name);
    const lkeAlters = [
      { name: 'org_id', sql: "ALTER TABLE learning_knowledge_entries ADD COLUMN org_id TEXT DEFAULT 'default'" },
      { name: 'policy_type', sql: 'ALTER TABLE learning_knowledge_entries ADD COLUMN policy_type TEXT' },
      { name: 'business_group', sql: 'ALTER TABLE learning_knowledge_entries ADD COLUMN business_group TEXT' },
      { name: 'conflict_flag', sql: 'ALTER TABLE learning_knowledge_entries ADD COLUMN conflict_flag INTEGER DEFAULT 0' },
      { name: 'conflict_notes', sql: 'ALTER TABLE learning_knowledge_entries ADD COLUMN conflict_notes TEXT' }
    ];
    for (const { name, sql } of lkeAlters) {
      if (!lkeCols.includes(name)) {
        try {
          await runQuery(db, sql);
          console.log(`[MIGRATION SUCCESS] Added column ${name} to learning_knowledge_entries`);
        } catch (e) {}
      }
    }

    // 3. Create learning_audit_log table (Tracks all knowledge lifecycle events)
    await runQuery(db, `
      CREATE TABLE IF NOT EXISTS learning_audit_log (
        id TEXT PRIMARY KEY,
        question_id TEXT,
        knowledge_entry_id TEXT,
        action TEXT NOT NULL,
        actor TEXT NOT NULL,
        org_id TEXT DEFAULT 'default',
        details_json TEXT,
        created_at TEXT NOT NULL
      )
    `);

    // 4. Safely upgrade knowledge_versions table for Auto Learning versioning
    const kvCols = (await allQuery(db, "PRAGMA table_info(knowledge_versions)")).map(c => c.name);
    const kvAlters = [
      { name: 'entry_id', sql: 'ALTER TABLE knowledge_versions ADD COLUMN entry_id TEXT' },
      { name: 'previous_answer', sql: 'ALTER TABLE knowledge_versions ADD COLUMN previous_answer TEXT' },
      { name: 'new_answer', sql: 'ALTER TABLE knowledge_versions ADD COLUMN new_answer TEXT' },
      { name: 'diff_analysis_json', sql: 'ALTER TABLE knowledge_versions ADD COLUMN diff_analysis_json TEXT' },
      { name: 'org_id', sql: "ALTER TABLE knowledge_versions ADD COLUMN org_id TEXT DEFAULT 'default'" }
    ];
    for (const { name, sql } of kvAlters) {
      if (!kvCols.includes(name)) {
        try {
          await runQuery(db, sql);
          console.log(`[MIGRATION SUCCESS] Added column ${name} to knowledge_versions`);
        } catch (e) {}
      }
    }

    // 5. Safely upgrade ai_test_cases table for Auto Learning regression suite
    const tcCols = (await allQuery(db, "PRAGMA table_info(ai_test_cases)")).map(c => c.name);
    const tcAlters = [
      { name: 'unanswered_question_id', sql: 'ALTER TABLE ai_test_cases ADD COLUMN unanswered_question_id TEXT' },
      { name: 'knowledge_entry_id', sql: 'ALTER TABLE ai_test_cases ADD COLUMN knowledge_entry_id TEXT' },
      { name: 'org_id', sql: "ALTER TABLE ai_test_cases ADD COLUMN org_id TEXT DEFAULT 'default'" }
    ];
    for (const { name, sql } of tcAlters) {
      if (!tcCols.includes(name)) {
        try {
          await runQuery(db, sql);
          console.log(`[MIGRATION SUCCESS] Added column ${name} to ai_test_cases`);
        } catch (e) {}
      }
    }

    // 6. Create learning_test_runs table (Before vs After regression test logs)
    await runQuery(db, `
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
    `);

    console.log('[MIGRATION SUCCESS] TRÍ AN Learning Center schema initialized.');
  } catch (err) {
    console.error('[MIGRATION FAILED] Error initializing schema:', err);
    throw err;
  }
}
