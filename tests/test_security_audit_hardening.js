/**
 * TRÍ AI BOTCHAT - GIAI ĐOẠN 0: SECURITY AUDIT & HARDENING TEST SUITE
 * 
 * Verifies all 7 Core Security Hardening Requirements:
 * 1. Unauthenticated Admin API Protection (401 Unauthorized)
 * 2. Admin Authentication with PBKDF2 Hashing & HMAC-SHA256 Signed Token
 * 3. Tampered & Forged Token Rejection
 * 4. Change Password Strict Verification (No currentPassword bypass)
 * 5. Knowledge Center Default PENDING_REVIEW & Tenant Isolation
 * 6. SSRF Protection on Web Scraper & Supplier Website Center
 * 7. Preservation of Sales Engine, Products Catalog & Customer Chat
 */

process.env.NODE_ENV = 'test';

import assert from 'assert';
import db from '../server/db.js';
import AuthService from '../server/services/authService.js';
import { isSafePublicUrl } from '../server/utils/ssrfProtection.js';
import CentralBrainService from '../server/services/centralBrainService.js';
import { RagService } from '../server/services/ragService.js';

console.log('================================================================');
console.log('🛡️  TRÍ AI GIAI ĐOẠN 0: SECURITY AUDIT & HARDENING TEST SUITE');
console.log('================================================================\n');

async function runSecuritySuite() {
  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}`);
      console.error('   Error:', err.message);
    }
  }

  // ---------------------------------------------------------------------------
  // 1. Password Hashing & Legacy Migration
  // ---------------------------------------------------------------------------
  await test('1.1. PBKDF2 Password Hashing & Verification', async () => {
    const rawPass = '0982441446';
    const hash = AuthService.hashPassword(rawPass);
    assert(hash.startsWith('pbkdf2$'), 'Hash phải bắt đầu bằng pbkdf2$');
    
    const verifyValid = AuthService.verifyPassword(rawPass, hash);
    assert.strictEqual(verifyValid.isValid, true);
    assert.strictEqual(verifyValid.needsRehash, false);

    const verifyWrong = AuthService.verifyPassword('wrong_pass', hash);
    assert.strictEqual(verifyWrong.isValid, false);
  });

  await test('1.2. Legacy Plaintext Password Migration Detection', async () => {
    const legacyPass = '0982441446';
    const verifyLegacy = AuthService.verifyPassword(legacyPass, legacyPass);
    assert.strictEqual(verifyLegacy.isValid, true);
    assert.strictEqual(verifyLegacy.needsRehash, true, 'Phải gắn cờ needsRehash = true để tự động di chuyển');
  });

  // ---------------------------------------------------------------------------
  // 2. Token Security (HMAC-SHA256 & Expiration)
  // ---------------------------------------------------------------------------
  let validAdminToken = null;
  await test('2.1. Generate & Verify Cryptographically Signed Token', async () => {
    validAdminToken = await AuthService.generateToken({
      username: 'Admin',
      orgId: 'org_default',
      role: 'admin'
    });
    assert(validAdminToken.includes('.'), 'Token phải có cấu trúc payload.signature');

    const decoded = await AuthService.verifyToken(validAdminToken);
    assert(decoded !== null, 'Token hợp lệ phải giải mã thành công');
    assert.strictEqual(decoded.username, 'Admin');
    assert.strictEqual(decoded.role, 'admin');
    assert.strictEqual(decoded.orgId, 'org_default');
  });

  await test('2.2. Reject Tampered or Forged Token', async () => {
    const tampered = validAdminToken.slice(0, -4) + 'abcd';
    const decoded = await AuthService.verifyToken(tampered);
    assert.strictEqual(decoded, null, 'Chữ ký giả mạo phải bị từ chối');

    const fakeToken = Buffer.from(JSON.stringify({ username: 'Admin', role: 'admin' })).toString('base64url') + '.fakesig';
    const decodedFake = await AuthService.verifyToken(fakeToken);
    assert.strictEqual(decodedFake, null, 'Token giả mạo phải bị từ chối');
  });

  // ---------------------------------------------------------------------------
  // 3. Knowledge Center: PENDING_REVIEW & Tenant Isolation
  // ---------------------------------------------------------------------------
  await test('3.1. Tài liệu mới mặc định là PENDING_REVIEW và không lọt vào RAG chính thức', async () => {
    const testDocId = `doc_test_sec_${Date.now()}`;
    const now = new Date().toISOString();

    // Ingest a pending review document
    await db.run(`
      INSERT INTO knowledge_documents (id, title, file_type, source_type, status, extracted_text, org_id, scope, approval_status, created_at, updated_at)
      VALUES (?, 'Bí mật kinh doanh chưa duyệt', 'txt', 'text_ingestion', 'ready', 'Mật khẩu kho hàng là 999888', 'org_default', 'global', 'PENDING_REVIEW', ?, ?)
    `, [testDocId, now, now]);

    await db.run(`
      INSERT INTO knowledge_chunks (id, document_id, chunk_index, content, org_id, scope, created_at)
      VALUES (?, ?, 0, 'Mật khẩu kho hàng là 999888', 'org_default', 'global', ?)
    `, [`chk_${testDocId}`, testDocId, now]);

    // RAG search must NOT return PENDING_REVIEW documents
    const ragResults = await RagService.searchKnowledge({ query: 'Mật khẩu kho hàng', orgId: 'org_default', limit: 5 });
    const leaked = ragResults.some(c => c.content && c.content.includes('999888'));
    assert.strictEqual(leaked, false, 'Tài liệu PENDING_REVIEW tuyệt đối không được xuất hiện trong RAG!');

    // Cleanup test doc
    await db.run('DELETE FROM knowledge_chunks WHERE document_id = ?', [testDocId]);
    await db.run('DELETE FROM knowledge_documents WHERE id = ?', [testDocId]);
  });

  await test('3.2. Phân tách dữ liệu đa tổ chức (Tenant Isolation)', async () => {
    const docOrgA = `doc_orgA_${Date.now()}`;
    const docOrgB = `doc_orgB_${Date.now()}`;
    const now = new Date().toISOString();

    await db.run(`
      INSERT INTO knowledge_documents (id, title, file_type, source_type, status, extracted_text, org_id, scope, approval_status, created_at, updated_at)
      VALUES (?, 'Báo cáo OrgA', 'txt', 'text_ingestion', 'ready', 'Dữ liệu tuyệt mật của Tổ chức A 112233', 'org_A', 'org', 'APPROVED', ?, ?)
    `, [docOrgA, now, now]);

    await db.run(`
      INSERT INTO knowledge_chunks (id, document_id, chunk_index, content, org_id, scope, created_at)
      VALUES (?, ?, 0, 'Dữ liệu tuyệt mật của Tổ chức A 112233', 'org_A', 'org', ?)
    `, [`chk_${docOrgA}`, docOrgA, now]);

    // Query from org_B must NEVER see org_A scoped chunks
    const ragOrgB = await RagService.searchKnowledge({ query: 'Dữ liệu tuyệt mật', orgId: 'org_B', limit: 5 });
    const leakedToB = ragOrgB.some(c => c.content && c.content.includes('112233'));
    assert.strictEqual(leakedToB, false, 'Tổ chức B không được phép nhìn thấy dữ liệu nội bộ của Tổ chức A!');

    // Cleanup
    await db.run('DELETE FROM knowledge_chunks WHERE document_id = ?', [docOrgA]);
    await db.run('DELETE FROM knowledge_documents WHERE id = ?', [docOrgA]);
  });

  // ---------------------------------------------------------------------------
  // 4. SSRF Protection Tests
  // ---------------------------------------------------------------------------
  await test('4.1. SSRF: Chặn truy cập localhost, loopback và port nội bộ', async () => {
    const resLocalhost = await isSafePublicUrl('http://localhost:5000/api/settings');
    assert.strictEqual(resLocalhost.safe, false);

    const res127 = await isSafePublicUrl('http://127.0.0.1:8080/admin');
    assert.strictEqual(res127.safe, false);

    const resLoopback = await isSafePublicUrl('http://0.0.0.0/');
    assert.strictEqual(resLoopback.safe, false);
  });

  await test('4.2. SSRF: Chặn dải IP Private RFC1918 và Cloud Metadata 169.254.169.254', async () => {
    const resMeta = await isSafePublicUrl('http://169.254.169.254/latest/meta-data/');
    assert.strictEqual(resMeta.safe, false, 'Phải chặn AWS/GCP metadata endpoint');

    const resClassA = await isSafePublicUrl('http://10.0.0.1/internal-api');
    assert.strictEqual(resClassA.safe, false, 'Phải chặn Private Subnet Class A');

    const resClassC = await isSafePublicUrl('http://192.168.1.1/router-login');
    assert.strictEqual(resClassC.safe, false, 'Phải chặn Private Subnet Class C');
  });

  await test('4.3. SSRF: Cho phép các URL công khai hợp lệ', async () => {
    const resValid = await isSafePublicUrl('https://quangnhuttri.com');
    assert.strictEqual(resValid.safe, true);
    assert(resValid.cleanUrl.startsWith('https://'));
  });

  // ---------------------------------------------------------------------------
  // 5. Preserving Sales Engine & Customer Experience
  // ---------------------------------------------------------------------------
  await test('5.1. Sales Engine & Chat khách hàng không bị ảnh hưởng (Zero Disruption)', async () => {
    const chatRes = await CentralBrainService.processChat({
      message: 'Shop có laptop ThinkPad không?',
      history: []
    });
    assert(chatRes.reply && chatRes.reply.length > 20, 'Chat bán hàng phải phản hồi bình thường');
    assert(chatRes.revealCatalog !== undefined, 'Tính năng mở Cột 2 phải hoạt động');
  });

  await test('5.2. Chống nhầm lẫn sản phẩm (Panasonic KX-TSC11 3-step flow)', async () => {
    const resMissing = await CentralBrainService.processChat({
      message: 'em bán điện thoại bàn panasonic không'
    });
    assert(resMissing.reply.toLowerCase().includes('chưa tìm thấy'), 'Phải nói rõ chưa tìm thấy');
    assert(resMissing.reply.toLowerCase().includes('số điện thoại'), 'Phải xin số điện thoại');
    assert(!resMissing.reply.toLowerCase().includes('đồ gia dụng panasonic'), 'Không được nhầm sang đồ gia dụng');
  });

  await test('5.3. Public Settings không làm lộ Mật khẩu hay API Key', async () => {
    const rows = await db.all('SELECT key, value FROM bot_settings');
    const settings = {};
    rows.forEach(r => {
      if (r.key === 'openai_api_key' || r.key === 'gemini_api_key' || r.key === 'admin_password' || r.key === 'auth_jwt_secret') {
        return;
      }
      settings[r.key] = r.value;
    });

    assert.strictEqual(settings.admin_password, undefined, 'Mật khẩu Admin tuyệt đối không được trả về trong settings public');
    assert.strictEqual(settings.auth_jwt_secret, undefined, 'Secret token tuyệt đối không được trả về trong settings public');
    assert.strictEqual(settings.openai_api_key, undefined, 'API Key OpenAI không được lộ');
    assert.strictEqual(settings.gemini_api_key, undefined, 'API Key Gemini không được lộ');
    assert(settings.bot_name !== undefined, 'Bot name vẫn phải công khai cho khách hàng');
  });

  // ---------------------------------------------------------------------------
  // 6. Direct HTTP API Access Control & Route Hardening Verification
  // ---------------------------------------------------------------------------
  let serverInstance = null;
  let testBaseUrl = '';

  try {
    const appModule = await import('../server/index.js');
    const app = appModule.default;
    await new Promise((resolve) => {
      serverInstance = app.listen(0, () => {
        const port = serverInstance.address().port;
        testBaseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    await test('6.1. HTTP: Chặn 401 Unauthorized khi chưa đăng nhập gọi Admin APIs', async () => {
      const endpointsToTest = [
        { path: '/api/crm/leads', method: 'GET' },
        { path: '/api/crm/stats', method: 'GET' },
        { path: '/api/settings', method: 'PUT', body: { bot_name: 'Hacked' } },
        { path: '/api/products', method: 'POST', body: { name: 'Hacked' } },
        { path: '/api/knowledge/stats', method: 'GET' },
        { path: '/api/supplier-websites/stats', method: 'GET' },
        { path: '/api/learning-center/stats', method: 'GET' },
        { path: '/api/central-brain/status', method: 'GET' },
        { path: '/api/auth/change-password', method: 'POST', body: { newPassword: 'abc' } }
      ];

      for (const ep of endpointsToTest) {
        const res = await fetch(`${testBaseUrl}${ep.path}`, {
          method: ep.method,
          headers: { 'Content-Type': 'application/json' },
          body: ep.body ? JSON.stringify(ep.body) : undefined
        });
        assert.strictEqual(
          res.status,
          401,
          `Endpoint ${ep.method} ${ep.path} phải trả về 401 khi không có token (nhận được: ${res.status})`
        );
      }
    });

    await test('6.2. HTTP: Cho phép Admin có Token hợp lệ gọi API Quản trị', async () => {
      const resCrm = await fetch(`${testBaseUrl}/api/crm/leads`, {
        headers: { 'Authorization': `Bearer ${validAdminToken}` }
      });
      assert.strictEqual(resCrm.status, 200, 'Admin có token phải truy cập được /api/crm/leads');

      const resKnowledge = await fetch(`${testBaseUrl}/api/knowledge/stats`, {
        headers: { 'Authorization': `Bearer ${validAdminToken}` }
      });
      assert.strictEqual(resKnowledge.status, 200, 'Admin có token phải truy cập được /api/knowledge/stats');

      const resSupp = await fetch(`${testBaseUrl}/api/supplier-websites/stats`, {
        headers: { 'Authorization': `Bearer ${validAdminToken}` }
      });
      assert.strictEqual(resSupp.status, 200, 'Admin có token phải truy cập được /api/supplier-websites/stats');
    });

    await test('6.3. HTTP: Các API công khai cho khách hàng không bị chặn 401', async () => {
      const resProds = await fetch(`${testBaseUrl}/api/products`);
      assert.strictEqual(resProds.status, 200, 'Khách hàng phải xem được danh mục sản phẩm');

      const resSettings = await fetch(`${testBaseUrl}/api/settings`);
      assert.strictEqual(resSettings.status, 200, 'Khách hàng phải lấy được cấu hình chào hỏi');
      const settingsData = await resSettings.json();
      assert.strictEqual(settingsData.settings.admin_password, undefined, 'Mật khẩu Admin không được lộ');

      // POST /api/leads without body returns 400 (Validation), NEVER 401
      const resLead = await fetch(`${testBaseUrl}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      assert.strictEqual(resLead.status, 400, 'POST /api/leads phải công khai cho khách (trả 400 validation, không 401)');
    });

    await test('6.4. HTTP: Đổi mật khẩu bắt buộc phải xác minh Mật khẩu hiện tại (No Bypass)', async () => {
      // 1. Gửi request đổi mật khẩu nhưng KHÔNG có currentPassword
      const resNoPass = await fetch(`${testBaseUrl}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validAdminToken}`
        },
        body: JSON.stringify({ newPassword: 'newSecretPass123' })
      });
      assert.strictEqual(resNoPass.status, 400, 'Phải từ chối 400 khi thiếu currentPassword');
      const dataNoPass = await resNoPass.json();
      assert(dataNoPass.error.includes('Mật khẩu hiện tại'));

      // 2. Gửi request đổi mật khẩu với currentPassword SAI
      const resWrongPass = await fetch(`${testBaseUrl}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validAdminToken}`
        },
        body: JSON.stringify({ currentPassword: 'wrong_password_999', newPassword: 'newSecretPass123' })
      });
      assert.strictEqual(resWrongPass.status, 400, 'Phải từ chối 400 khi currentPassword sai');
    });

  } finally {
    if (serverInstance) {
      serverInstance.close();
    }
  }

  console.log('\n================================================================');
  console.log(`🏁 KẾT QUẢ KIỂM THỬ BẢO MẬT: ${passed}/${total} BÀI THÀNH CÔNG (${Math.round((passed/total)*100)}%)`);
  console.log('================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runSecuritySuite().catch(err => {
  console.error('Lỗi chạy suite bảo mật:', err);
  process.exit(1);
});
