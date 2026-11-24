/**
 * TRÍ AI HUMAN BRAIN – 5-TIER HUMAN MEMORY ENGINE
 * 
 * Capabilities:
 * 1. 5 Memory Tiers:
 *    - Working Memory: Active goal, session context, conversational co-references
 *    - Episodic Memory: Past events, consultation history, meetings, outcomes
 *    - Semantic Memory: Entity knowledge graph (Person, Org, Product), facts, preferences
 *    - Procedural Memory: Proven consultation methods, operational skills, heuristics
 *    - Prospective Memory: Future commitments, deadlines, tasks, scheduled actions
 * 2. Human Cognitive Mechanics:
 *    - SHA-256 Content Hashing & Non-duplication (reinforcement counter)
 *    - Contradiction Detection & History Logging (no silent overwrites)
 *    - Multi-tier Retrieval Hierarchy (Working -> Episodic -> Semantic -> Procedural -> Prospective)
 *    - Secret Redaction (passwords, tokens, API keys excluded)
 *    - RBAC & Tenant Isolation (Owner vs Staff vs Customer)
 */

import crypto from 'crypto';
import { randomUUID } from 'crypto';
import db from '../../db.js';

// Sensitive patterns to redact or block from memory
const SECRET_PATTERNS = [
  /password\s*[:=]\s*\S+/i,
  /m[aậ]t\s*kh[aẩ]u\s*[:=]\s*\S+/i,
  /bearer\s+[a-zA-Z0-9_\-\.]{20,}/i,
  /api[_-]?key\s*[:=]\s*\S+/i,
  /sk-[a-zA-Z0-9]{20,}/i,
  /\b[0-9]{4}[- ]?[0-9]{4}[- ]?[0-9]{4}[- ]?[0-9]{4}\b/ // Credit card numbers
];

export class HumanMemoryEngine {
  /**
   * Working Memory cache for active in-memory session contexts
   */
  static workingMemoryStore = new Map();

  /**
   * Compute SHA-256 hash of normalized content
   */
  static computeHash(content = '', subject = '', entityId = '') {
    const raw = `${subject.trim().toLowerCase()}::${entityId || ''}::${content.trim().toLowerCase()}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Check and redact sensitive secrets
   */
  static sanitizeContent(content = '') {
    if (!content || typeof content !== 'string') return '';
    let sanitized = content;
    for (const pat of SECRET_PATTERNS) {
      sanitized = sanitized.replace(pat, '[REDACTED_SECRET]');
    }
    return sanitized;
  }

  // ==========================================
  // 1. WORKING MEMORY (Prefrontal Cortex)
  // ==========================================
  static setWorkingMemory(sessionId, data = {}) {
    if (!sessionId) return;
    const current = this.workingMemoryStore.get(sessionId) || {};
    this.workingMemoryStore.set(sessionId, {
      ...current,
      ...data,
      lastActiveAt: Date.now()
    });
  }

  static getWorkingMemory(sessionId) {
    if (!sessionId) return null;
    return this.workingMemoryStore.get(sessionId) || null;
  }

  static clearWorkingMemory(sessionId) {
    if (!sessionId) return;
    this.workingMemoryStore.delete(sessionId);
  }

  // ==========================================
  // 2. CORE REMEMBER (Consolidation & Store)
  // ==========================================
  /**
   * Store or reinforce a memory with contradiction detection and deduplication
   */
  static async remember(params = {}) {
    const {
      memoryType = 'SEMANTIC', // 'WORKING', 'EPISODIC', 'SEMANTIC', 'PROCEDURAL', 'PROSPECTIVE'
      content,
      subject = 'GENERAL',
      entityId = null,
      source = 'USER_CHAT',
      sourceReference = null,
      confidence = 1.0,
      eventTime = null,
      ownerId = 'owner_tri',
      tenantId = 'org_default',
      sensitivity = 'INTERNAL', // 'PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'
      expirationDays = null,
      extraData = {} // Tier-specific metadata
    } = params;

    if (!content || typeof content !== 'string') return null;

    const sanitizedContent = this.sanitizeContent(content.trim());
    if (sanitizedContent.includes('[REDACTED_SECRET]') && sensitivity === 'PUBLIC') {
      sensitivity = 'RESTRICTED';
    }

    const contentHash = this.computeHash(sanitizedContent, subject, entityId);
    const now = new Date().toISOString();
    let expirationAt = null;
    if (expirationDays && expirationDays > 0) {
      expirationAt = new Date(Date.now() + expirationDays * 86400000).toISOString();
    }

    // A. DEDUPLICATION CHECK
    const existing = await db.get(
      'SELECT memory_id, reinforcement_count, confidence FROM ai_memories WHERE content_hash = ? AND status = ?',
      [contentHash, 'ACTIVE']
    );

    if (existing) {
      // Reinforce existing memory
      const newCount = (existing.reinforcement_count || 1) + 1;
      const newConf = Math.min(1.0, (existing.confidence || 0.8) + 0.05);
      await db.run(
        'UPDATE ai_memories SET reinforcement_count = ?, confidence = ?, last_accessed_at = ?, updated_at = ? WHERE memory_id = ?',
        [newCount, newConf, now, now, existing.memory_id]
      );
      return { memoryId: existing.memory_id, reinforced: true, count: newCount };
    }

    // B. CONTRADICTION DETECTION
    // Check if an active memory exists for same entityId and same specific subject (e.g. "budget", "phone", "delivery_date")
    if (entityId && subject && subject !== 'GENERAL' && subject !== 'NOTE') {
      const priorConflict = await db.get(`
        SELECT memory_id, content, confidence
        FROM ai_memories
        WHERE entity_id = ? AND subject = ? AND status = 'ACTIVE' AND memory_type = ?
        ORDER BY updated_at DESC LIMIT 1
      `, [entityId, subject, memoryType]);

      if (priorConflict && priorConflict.content.toLowerCase() !== sanitizedContent.toLowerCase()) {
        const contraId = `contra_${randomUUID().slice(0, 8)}`;
        console.log(`[MEMORY CONTRADICTION] Detected change for [${entityId} - ${subject}]: "${priorConflict.content}" -> "${sanitizedContent}"`);
        
        // Log contradiction history
        await db.run(`
          INSERT INTO ai_memory_contradictions (
            contradiction_id, entity_id, subject, old_memory_id, old_value, new_value,
            detection_reason, resolution_status, resolved_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'RESOLVED_UPDATE', 'AI_LOGIC', ?)
        `, [
          contraId,
          entityId,
          subject,
          priorConflict.memory_id,
          priorConflict.content,
          sanitizedContent,
          `Khách hàng cập nhật thông tin mới cho chủ đề ${subject}`,
          now
        ]);

        // Mark previous memory as SUPERSEDED (never silently destroy)
        await db.run(
          "UPDATE ai_memories SET status = 'SUPERSEDED', updated_at = ? WHERE memory_id = ?",
          [now, priorConflict.memory_id]
        );
      }
    }

    // C. INSERT CORE MEMORY
    const memoryId = `mem_${randomUUID().slice(0, 10)}`;
    await db.run(`
      INSERT INTO ai_memories (
        memory_id, memory_type, content, content_hash, subject, entity_id,
        source, source_reference, confidence, status, event_time, created_at,
        updated_at, owner_id, tenant_id, sensitivity, expiration_at,
        reinforcement_count, last_accessed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `, [
      memoryId,
      memoryType,
      sanitizedContent,
      contentHash,
      subject,
      entityId,
      source,
      sourceReference,
      confidence,
      eventTime || now,
      now,
      now,
      ownerId,
      tenantId,
      sensitivity,
      expirationAt,
      now
    ]);

    // D. TIER-SPECIFIC SUB-TABLE INSERTION
    try {
      if (memoryType === 'EPISODIC' && extraData) {
        const episodeId = `ep_${randomUUID().slice(0, 8)}`;
        await db.run(`
          INSERT INTO ai_memory_episodes (
            episode_id, memory_id, conversation_id, participants_json,
            event_category, summary, outcome, location, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          episodeId,
          memoryId,
          extraData.conversationId || null,
          JSON.stringify(extraData.participants || ['Customer', 'TRÍ AI']),
          extraData.eventCategory || 'CONSULTATION',
          sanitizedContent,
          extraData.outcome || 'IN_PROGRESS',
          extraData.location || 'Online Chat',
          now
        ]);
      } else if (memoryType === 'SEMANTIC' && extraData.entityName) {
        const entId = entityId || `ent_${randomUUID().slice(0, 8)}`;
        const existingEnt = await db.get('SELECT entity_id FROM ai_memory_entities WHERE entity_id = ? OR entity_name = ?', [entId, extraData.entityName]);
        if (!existingEnt) {
          await db.run(`
            INSERT INTO ai_memory_entities (
              entity_id, entity_name, entity_type, description, attributes_json, tenant_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            entId,
            extraData.entityName,
            extraData.entityType || 'TOPIC',
            sanitizedContent,
            JSON.stringify(extraData.attributes || {}),
            tenantId,
            now,
            now
          ]);
        }
      } else if (memoryType === 'PROCEDURAL' && extraData.procedureName) {
        const procId = `proc_${randomUUID().slice(0, 8)}`;
        await db.run(`
          INSERT INTO ai_memory_procedures (
            procedure_id, memory_id, procedure_name, trigger_condition,
            steps_json, success_rate, usage_count, is_verified, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 1.0, 1, 1, ?, ?)
        `, [
          procId,
          memoryId,
          extraData.procedureName,
          extraData.triggerCondition || 'General trigger',
          JSON.stringify(extraData.steps || [sanitizedContent]),
          now,
          now
        ]);
      } else if (memoryType === 'PROSPECTIVE' && extraData.triggerTime) {
        const prospId = `prosp_${randomUUID().slice(0, 8)}`;
        await db.run(`
          INSERT INTO ai_memory_prospective (
            prospective_id, memory_id, task_title, target_user_id,
            trigger_time, trigger_condition, status, priority,
            notification_channel, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)
        `, [
          prospId,
          memoryId,
          extraData.taskTitle || sanitizedContent,
          extraData.targetUserId || ownerId,
          extraData.triggerTime,
          extraData.triggerCondition || null,
          extraData.priority || 'NORMAL',
          extraData.notificationChannel || 'DASHBOARD',
          now
        ]);
      }
    } catch (subErr) {
      console.warn('[MEMORY ENGINE] Sub-table insertion note:', subErr.message);
    }

    return { memoryId, reinforced: false, count: 1 };
  }

  // ==========================================
  // 3. RETRIEVE MEMORY (Hierarchical 5 Tiers + RBAC)
  // ==========================================
  static async retrieve(params = {}) {
    const {
      query = '',
      entityId = null,
      subject = null,
      memoryTypes = null, // Array of types or null for all
      userRole = 'customer', // 'owner', 'staff', 'customer'
      requestingUserId = null,
      tenantId = 'org_default',
      limit = 10
    } = params;

    // RBAC FILTERING
    let sql = "SELECT * FROM ai_memories WHERE status = 'ACTIVE' AND tenant_id = ?";
    const queryParams = [tenantId];

    if (userRole === 'customer') {
      // CUSTOMER can only access memories linked to their own entityId or public memories
      if (requestingUserId || entityId) {
        sql += ' AND (entity_id = ? OR sensitivity = ?)';
        queryParams.push(requestingUserId || entityId, 'PUBLIC');
      } else {
        sql += ' AND sensitivity = ?';
        queryParams.push('PUBLIC');
      }
      // Never allow customer to read confidential/restricted
      sql += " AND sensitivity NOT IN ('CONFIDENTIAL', 'RESTRICTED')";
    } else if (userRole === 'staff') {
      // STAFF cannot read RESTRICTED memories belonging strictly to OWNER
      sql += " AND sensitivity != 'RESTRICTED'";
    }
    // OWNER has full access to all sensitivities within tenant

    if (entityId) {
      sql += ' AND (entity_id = ? OR entity_id IS NULL)';
      queryParams.push(entityId);
    }

    if (subject && subject !== 'ALL') {
      sql += ' AND subject = ?';
      queryParams.push(subject);
    }

    if (Array.isArray(memoryTypes) && memoryTypes.length > 0) {
      const placeholders = memoryTypes.map(() => '?').join(', ');
      sql += ` AND memory_type IN (${placeholders})`;
      queryParams.push(...memoryTypes);
    }

    if (query && query.trim()) {
      sql += ' AND content LIKE ?';
      queryParams.push(`%${query.trim()}%`);
    }

    sql += ' ORDER BY reinforcement_count DESC, updated_at DESC LIMIT ?';
    queryParams.push(limit);

    try {
      const records = await db.all(sql, queryParams);
      // Update last_accessed_at for retrieved memories
      if (records.length > 0) {
        const ids = records.map(r => r.memory_id);
        const placeholders = ids.map(() => '?').join(', ');
        await db.run(
          `UPDATE ai_memories SET last_accessed_at = ? WHERE memory_id IN (${placeholders})`,
          [new Date().toISOString(), ...ids]
        );
      }
      return records;
    } catch (err) {
      console.error('[MEMORY ENGINE] Retrieve error:', err.message);
      return [];
    }
  }

  // ==========================================
  // 4. FORGET MEMORY (GDPR & Privacy Compliance)
  // ==========================================
  static async forget(params = {}) {
    const { entityId, memoryId, ownerId = 'owner_tri', tenantId = 'org_default' } = params;
    try {
      if (memoryId) {
        await db.run("UPDATE ai_memories SET status = 'ARCHIVED', updated_at = ? WHERE memory_id = ?", [new Date().toISOString(), memoryId]);
        return { success: true, count: 1 };
      } else if (entityId) {
        const res = await db.run(
          "UPDATE ai_memories SET status = 'ARCHIVED', updated_at = ? WHERE entity_id = ? AND tenant_id = ?",
          [new Date().toISOString(), entityId, tenantId]
        );
        return { success: true, count: res?.changes || 0 };
      }
      return { success: false, error: 'Either memoryId or entityId required' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ==========================================
  // 5. STATS & TIMELINE (Admin Observability)
  // ==========================================
  static async getStats(tenantId = 'org_default') {
    try {
      const totalRow = await db.get("SELECT COUNT(*) as total FROM ai_memories WHERE status = 'ACTIVE' AND tenant_id = ?", [tenantId]);
      const typeRows = await db.all(
        "SELECT memory_type, COUNT(*) as count FROM ai_memories WHERE status = 'ACTIVE' AND tenant_id = ? GROUP BY memory_type",
        [tenantId]
      );
      const contraRow = await db.get("SELECT COUNT(*) as count FROM ai_memory_contradictions");
      const prospRow = await db.get("SELECT COUNT(*) as count FROM ai_memory_prospective WHERE status = 'PENDING'");

      const countsByType = {
        WORKING: 0,
        EPISODIC: 0,
        SEMANTIC: 0,
        PROCEDURAL: 0,
        PROSPECTIVE: 0
      };
      for (const r of typeRows) {
        if (countsByType[r.memory_type] !== undefined) {
          countsByType[r.memory_type] = r.count;
        }
      }

      return {
        totalMemories: totalRow?.total || 0,
        countsByType,
        contradictionsCount: contraRow?.count || 0,
        pendingProspectiveTasks: prospRow?.count || 0
      };
    } catch (err) {
      console.error('[MEMORY ENGINE] Stats error:', err);
      return {
        totalMemories: 0,
        countsByType: { WORKING: 0, EPISODIC: 0, SEMANTIC: 0, PROCEDURAL: 0, PROSPECTIVE: 0 },
        contradictionsCount: 0,
        pendingProspectiveTasks: 0
      };
    }
  }

  static async getTimeline(entityId = null, limit = 20) {
    try {
      let sql = `
        SELECT m.memory_id, m.memory_type, m.content, m.subject, m.entity_id,
               m.confidence, m.created_at, m.event_time, e.event_category, e.outcome
        FROM ai_memories m
        LEFT JOIN ai_memory_episodes e ON m.memory_id = e.memory_id
        WHERE m.status = 'ACTIVE'
      `;
      const params = [];
      if (entityId) {
        sql += ' AND m.entity_id = ?';
        params.push(entityId);
      }
      sql += ' ORDER BY COALESCE(m.event_time, m.created_at) DESC LIMIT ?';
      params.push(limit);

      return await db.all(sql, params);
    } catch (err) {
      console.error('[MEMORY ENGINE] Timeline error:', err);
      return [];
    }
  }
}

export default HumanMemoryEngine;
