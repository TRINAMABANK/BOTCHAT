/**
 * TRÍ AI BOTCHAT - SECURE AUTHENTICATION SERVICE
 * 
 * Cryptographic Password Hashing (PBKDF2-SHA512 with 100,000 iterations),
 * Secure HMAC-SHA256 Token Signing & Verification with Expiration,
 * Legacy Password Migration without Service Disruption.
 */

import crypto from 'crypto';
import db from '../db.js';

const ITERATIONS = 100000;
const KEY_LEN = 64;
const DIGEST = 'sha512';
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

let cachedJwtSecret = null;

async function getJwtSecret() {
  if (cachedJwtSecret) return cachedJwtSecret;

  try {
    const row = await db.get("SELECT value FROM bot_settings WHERE key = 'auth_jwt_secret'");
    if (row && row.value && row.value.length >= 32) {
      cachedJwtSecret = row.value;
      return cachedJwtSecret;
    }

    // Generate a cryptographically secure random secret and persist
    const newSecret = crypto.randomBytes(32).toString('hex');
    const now = new Date().toISOString();
    await db.run(
      "INSERT OR REPLACE INTO bot_settings (key, value, description, updated_at) VALUES ('auth_jwt_secret', ?, 'Secret key for signing admin authentication tokens', ?)",
      [newSecret, now]
    );
    cachedJwtSecret = newSecret;
    return cachedJwtSecret;
  } catch (err) {
    console.error('[AUTH SECRET ERROR] Failed to fetch secret from DB:', err.message);
    return process.env.JWT_SECRET || 'triai_secure_admin_jwt_secret_fallback_key_2026';
  }
}

export class AuthService {
  /**
   * Hashes a plaintext password using PBKDF2-SHA512 with a unique salt
   */
  static hashPassword(password) {
    if (!password || typeof password !== 'string') {
      throw new Error('Mật khẩu không hợp lệ');
    }
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, DIGEST).toString('hex');
    return `pbkdf2$${salt}$${ITERATIONS}$${hash}`;
  }

  /**
   * Verifies password against stored hash.
   * Gracefully supports legacy plaintext passwords and signals when rehash is needed.
   */
  static verifyPassword(password, storedValue) {
    if (!password || !storedValue) return { isValid: false, needsRehash: false };

    const rawInput = String(password).trim();
    const stored = String(storedValue).trim();

    // 1. Check if stored value is a PBKDF2 hash
    if (stored.startsWith('pbkdf2$')) {
      const parts = stored.split('$');
      if (parts.length === 4) {
        const [, salt, iterStr, originalHash] = parts;
        const iterations = parseInt(iterStr, 10) || ITERATIONS;
        const computedHash = crypto.pbkdf2Sync(rawInput, salt, iterations, KEY_LEN, DIGEST).toString('hex');
        
        try {
          const bufA = Buffer.from(computedHash, 'hex');
          const bufB = Buffer.from(originalHash, 'hex');
          if (bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)) {
            return { isValid: true, needsRehash: false };
          }
        } catch {
          return { isValid: false, needsRehash: false };
        }
      }
    }

    // 2. Legacy Plaintext comparison (with timing safe comparison)
    // Used only to migrate existing admin passwords on first login
    const inputBuf = Buffer.from(rawInput);
    const storedBuf = Buffer.from(stored);
    let isMatch = false;
    if (inputBuf.length === storedBuf.length) {
      isMatch = crypto.timingSafeEqual(inputBuf, storedBuf);
    } else {
      isMatch = (rawInput === stored);
    }

    if (isMatch) {
      return { isValid: true, needsRehash: true };
    }

    return { isValid: false, needsRehash: false };
  }

  /**
   * Creates a tamper-proof HMAC-SHA256 signed token
   */
  static async generateToken(user) {
    const secret = await getJwtSecret();
    const now = Date.now();
    const payload = {
      username: user.username || 'Admin',
      orgId: user.orgId || 'org_default',
      role: user.role || 'admin',
      iat: now,
      exp: now + TOKEN_TTL_MS
    };

    const payloadJson = JSON.stringify(payload);
    const payloadB64 = Buffer.from(payloadJson).toString('base64url');
    const signature = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');

    return `${payloadB64}.${signature}`;
  }

  /**
   * Verifies an HMAC-SHA256 signed token
   */
  static async verifyToken(token) {
    if (!token || typeof token !== 'string') return null;

    const parts = token.trim().split('.');
    if (parts.length !== 2) return null;

    const [payloadB64, signature] = parts;
    const secret = await getJwtSecret();

    const expectedSignature = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');

    // Constant-time comparison to prevent timing attacks
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    try {
      const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
      const payload = JSON.parse(payloadJson);

      // Check token expiration
      if (!payload.exp || Date.now() > payload.exp) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }
}

export default AuthService;
