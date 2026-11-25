/**
 * AUDIT LOG SERVICE – NHẬT KÝ THAO TÁC BẢO MẬT THƯ KÝ RIÊNG
 * (BOTCHAT BRAIN 2.1 – THƯ KÝ RIÊNG CỦA ANH)
 */

import { db } from '../../db.js';
import crypto from 'crypto';

export class AuditLogService {
  /**
   * Log action with caller details
   */
  static async logAction({
    ownerId = 'owner_tri',
    actionType,
    targetType,
    targetId,
    details = {},
    ipAddress = '127.0.0.1'
  }) {
    if (!actionType || !targetType || !targetId) {
      console.warn('[AUDIT LOG] Missing mandatory audit fields:', { actionType, targetType, targetId });
      return null;
    }

    const logId = `aud_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const nowIso = new Date().toISOString();

    try {
      await db.run(
        `INSERT INTO owner_audit_logs (log_id, owner_id, action_type, target_type, target_id, details_json, ip_address, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          logId,
          ownerId,
          actionType,
          targetType,
          targetId,
          typeof details === 'string' ? details : JSON.stringify(details),
          ipAddress,
          nowIso
        ]
      );
      return { logId, createdAt: nowIso };
    } catch (err) {
      console.error('[AUDIT LOG ERROR] Failed to record audit log:', err.message);
      return null;
    }
  }

  /**
   * Fetch recent audit logs for owner
   */
  static async getLogs(ownerId = 'owner_tri', limit = 20) {
    try {
      return await db.all(
        `SELECT * FROM owner_audit_logs WHERE owner_id = ? ORDER BY created_at DESC LIMIT ?`,
        [ownerId, limit]
      );
    } catch (err) {
      console.error('[AUDIT LOG ERROR] Failed to query audit logs:', err.message);
      return [];
    }
  }
}

export default AuditLogService;
