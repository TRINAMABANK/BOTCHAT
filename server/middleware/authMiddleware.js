/**
 * TRÍ AI BOTCHAT - AUTHENTICATION & ACCESS CONTROL MIDDLEWARE
 * 
 * Verifies HMAC-SHA256 tokens, guards Admin API routes,
 * enforces Organization Tenant Isolation (BOLA protection).
 */

import AuthService from '../services/authService.js';

export async function requireAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (req.headers['x-admin-token']) {
      token = String(req.headers['x-admin-token']).trim();
    } else if (req.query?.admin_token) {
      token = String(req.query.admin_token).trim();
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Chưa đăng nhập hoặc thiếu token xác thực quản trị (401 Unauthorized).'
      });
    }

    const payload = await AuthService.verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return res.status(401).json({
        success: false,
        error: 'Phiên làm việc đã hết hạn hoặc token không hợp lệ. Vui lòng đăng nhập lại!'
      });
    }

    // Attach verified user and enforce verified orgId
    req.user = payload;
    req.orgId = payload.orgId || 'org_default';

    // Prevent Tenant Escaping: Client cannot bypass by passing conflicting orgId
    if (req.query?.orgId && req.query.orgId !== req.orgId && req.orgId !== 'org_global_superadmin') {
      // Force scoping to authenticated orgId
      req.query.orgId = req.orgId;
    }
    if (req.body?.orgId && req.body.orgId !== req.orgId && req.orgId !== 'org_global_superadmin') {
      req.body.orgId = req.orgId;
    }

    next();
  } catch (err) {
    console.error('[AUTH MIDDLEWARE ERROR]', err);
    return res.status(500).json({ success: false, error: 'Lỗi xác thực hệ thống.' });
  }
}

export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (req.headers['x-admin-token']) {
      token = String(req.headers['x-admin-token']).trim();
    }

    if (token) {
      const payload = await AuthService.verifyToken(token);
      if (payload) {
        req.user = payload;
        req.orgId = payload.orgId || 'org_default';
      }
    }
  } catch {
    // Non-blocking
  }
  next();
}

export default { requireAdmin, optionalAuth };
