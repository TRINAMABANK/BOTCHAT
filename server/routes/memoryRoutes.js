/**
 * TRÍ AI HUMAN BRAIN – MEMORY ENGINE REST APIS
 * 
 * Provides endpoints for:
 * 1. Memory Dashboard & Stats
 * 2. 5-Tier Memory Listing & Search
 * 3. Memory Timeline (Episodic events)
 * 4. Contradictions & Conflict Resolution
 * 5. Planning & Prospective Task Management
 * 6. GDPR Forget / Archive
 */

import express from 'express';
import { requireAdmin } from '../middleware/authMiddleware.js';
import { HumanMemoryEngine } from '../services/intelligence/humanMemoryEngine.js';
import { PlanningEngine } from '../services/intelligence/planningEngine.js';
import db from '../db.js';

const router = express.Router();

/**
 * GET /api/memory/stats - Overview stats for Brain Dashboard
 */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await HumanMemoryEngine.getStats();
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/memory/list - Retrieve active memories with filters
 */
router.get('/list', requireAdmin, async (req, res) => {
  try {
    const { type, subject, search, limit = 50 } = req.query;
    let sql = 'SELECT * FROM ai_memories WHERE 1=1';
    const params = [];

    if (type && type !== 'ALL') {
      sql += ' AND memory_type = ?';
      params.push(type);
    }
    if (subject && subject !== 'ALL') {
      sql += ' AND subject = ?';
      params.push(subject);
    }
    if (search && search.trim()) {
      sql += ' AND (content LIKE ? OR subject LIKE ? OR entity_id LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
    }

    sql += ' ORDER BY reinforcement_count DESC, updated_at DESC LIMIT ?';
    params.push(parseInt(limit, 10) || 50);

    const memories = await db.all(sql, params);
    res.json({ success: true, memories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/memory/timeline - Chronological memory timeline
 */
router.get('/timeline', requireAdmin, async (req, res) => {
  try {
    const { entityId, limit = 30 } = req.query;
    const timeline = await HumanMemoryEngine.getTimeline(entityId, parseInt(limit, 10) || 30);
    res.json({ success: true, timeline });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/memory/contradictions - Contradiction & conflict history
 */
router.get('/contradictions', requireAdmin, async (req, res) => {
  try {
    const contradictions = await db.all(
      'SELECT * FROM ai_memory_contradictions ORDER BY created_at DESC LIMIT 50'
    );
    res.json({ success: true, contradictions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/memory/remember - Create or update memory fact
 */
router.post('/remember', requireAdmin, async (req, res) => {
  try {
    const { memoryType, content, subject, entityId, sensitivity, confidence } = req.body;
    if (!content) {
      return res.status(400).json({ success: false, error: 'Content is required' });
    }

    const result = await HumanMemoryEngine.remember({
      memoryType: memoryType || 'SEMANTIC',
      content,
      subject: subject || 'MANUAL_ENTRY',
      entityId: entityId || null,
      source: 'ADMIN_DASHBOARD',
      confidence: parseFloat(confidence) || 1.0,
      sensitivity: sensitivity || 'INTERNAL'
    });

    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/memory/:id - Delete or archive memory
 */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await HumanMemoryEngine.forget({ memoryId: id });
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/memory/plans - Get active planning tasks
 */
router.get('/plans', requireAdmin, async (req, res) => {
  try {
    const plans = await PlanningEngine.getActivePlans();
    res.json({ success: true, plans });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/memory/plans - Decompose & create planning goal
 */
router.post('/plans', requireAdmin, async (req, res) => {
  try {
    const { goalTitle, goalDescription } = req.body;
    if (!goalTitle) {
      return res.status(400).json({ success: false, error: 'Goal title is required' });
    }

    const plan = await PlanningEngine.createAndPersistPlan(goalTitle, goalDescription || '');
    res.json({ success: true, plan });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
