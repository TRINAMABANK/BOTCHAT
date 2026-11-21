/**
 * TRÍ AI BOTCHAT - SSRF (SERVER-SIDE REQUEST FORGERY) PROTECTION
 * 
 * Validates outgoing URLs before fetching to block internal network scanning,
 * localhost access, RFC1918 private IP ranges, and cloud metadata endpoints.
 */

import dns from 'dns/promises';

const PRIVATE_IP_REGEXES = [
  /^127\./,                         // Loopback 127.0.0.0/8
  /^10\./,                          // Private class A 10.0.0.0/8
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private class B 172.16.0.0/12
  /^192\.168\./,                    // Private class C 192.168.0.0/16
  /^169\.254\./,                    // Link-local / Cloud metadata 169.254.0.0/16
  /^0\./,                           // Zero addresses
  /^::1$/,                          // IPv6 loopback
  /^fc00:/i,                        // IPv6 unique local
  /^fe80:/i                         // IPv6 link-local
];

const BLOCKED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  '0.0.0.0',
  'metadata.google.internal',
  'instance-data',
  'local'
]);

export async function isSafePublicUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { safe: false, reason: 'URL không được để trống' };
  }

  let parsed;
  try {
    let clean = rawUrl.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'https://' + clean;
    }
    parsed = new URL(clean);
  } catch {
    return { safe: false, reason: 'Định dạng URL không hợp lệ' };
  }

  // 1. Only allow HTTP and HTTPS protocols
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { safe: false, reason: `Giao thức ${parsed.protocol} không được phép (chỉ hỗ trợ http/https)` };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 2. Reject blocked hosts and internal domain suffixes
  if (BLOCKED_HOSTS.has(hostname) || hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    return { safe: false, reason: 'Truy cập vào mạng nội bộ hoặc localhost bị cấm (SSRF Protection)' };
  }

  // 3. Reject direct private IP matches
  for (const regex of PRIVATE_IP_REGEXES) {
    if (regex.test(hostname)) {
      return { safe: false, reason: 'Địa chỉ IP nội bộ / private subnet bị từ chối truy cập (SSRF Protection)' };
    }
  }

  // 4. Resolve DNS to check if domain points to private IP (DNS Rebinding protection)
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    for (const addr of addresses) {
      for (const regex of PRIVATE_IP_REGEXES) {
        if (regex.test(addr.address)) {
          return { safe: false, reason: `Tên miền phân giải về địa chỉ IP nội bộ ${addr.address} bị cấm` };
        }
      }
    }
  } catch (dnsErr) {
    // If DNS cannot be resolved, reject safely
    return { safe: false, reason: `Không thể phân giải tên miền: ${dnsErr.message}` };
  }

  return { safe: true, cleanUrl: parsed.toString() };
}

export default { isSafePublicUrl };
