/**
 * MASTER TEST RUNNER: BOTCHAT BRAIN 2.1 – CONTROLLED IMPLEMENTATION
 * 
 * Aggregates and runs all 9 comprehensive test suites:
 * - Suite 1: Phase 1 Intent Engine (8 Canonical Domains, Multi-intent, Confidence)
 * - Suite 2: Phase 2 Reasoning Engine (Capability Routing, Step Validation, Safe Fallback)
 * - Suite 3: Phase 3 Identity & Permission RBAC (Owner, Staff, Customer, Anti-impersonation)
 * - Suite 4: Phase 4 AI Sales Capability & Anti-Confusion
 * - Suite 5: Phase 5 AI Secretary Capability (Tasks, Agenda, CRM, Email Draft)
 * - Suite 6: Phase 6 Multi-turn Context & Pronoun Co-reference Resolution
 * - Suite 7: Phase 7 RAG Knowledge Hybrid Search & Multi-Tenant Isolation
 * - Suite 8: Phase 8 Database Schema & Safe Migration
 * - Suite 9: Dual-Role AI Employee Integration Scenarios (TC-DR-01 to TC-DR-08)
 */

import { spawn } from 'child_process';
import path from 'path';

const SUITES = [
  { name: 'Giai đoạn 1: Universal Intent Engine', file: 'tests/test_phase1_intent_engine.js' },
  { name: 'Giai đoạn 2: Reasoning Engine & Capabilities', file: 'tests/test_phase2_reasoning_engine.js' },
  { name: 'Giai đoạn 3: Identity & Permission RBAC', file: 'tests/test_phase3_identity_permission.js' },
  { name: 'Giai đoạn 4: Fortify AI Sales Capability', file: 'tests/test_phase4_ai_sales.js' },
  { name: 'Giai đoạn 5: Expand AI Secretary Capability', file: 'tests/test_phase5_ai_secretary.js' },
  { name: 'Giai đoạn 6: Multi-turn Context & Co-reference', file: 'tests/test_phase6_context_memory.js' },
  { name: 'Giai đoạn 7: RAG & Knowledge Hybrid Search', file: 'tests/test_phase7_rag_knowledge.js' },
  { name: 'Giai đoạn 8: Database Schema & Migration', file: 'tests/test_phase8_database_migration.js' },
  { name: 'Dual Role: AI Sales & AI Secretary Integration', file: 'tests/test_dual_role_ai_employee.js' }
];

console.log('================================================================');
console.log('🌟 BẮT ĐẦU CHẠY TOÀN BỘ BỘ KIỂM THỬ TỔNG HỢP (MASTER SUITE)');
console.log('    DỰ ÁN: BOTCHAT BRAIN 2.1 – CONTROLLED IMPLEMENTATION');
console.log('================================================================\n');

function runSuite(suite) {
  return new Promise((resolve) => {
    const start = Date.now();
    const proc = spawn('node', [suite.file], { stdio: ['inherit', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      const duration = Date.now() - start;
      const passMatches = stdout.match(/✅ PASS/g) || [];
      const failMatches = stdout.match(/❌ FAIL/g) || [];

      resolve({
        name: suite.name,
        file: suite.file,
        code,
        duration,
        passed: passMatches.length,
        failed: failMatches.length,
        stdout,
        stderr
      });
    });
  });
}

async function runAll() {
  const results = [];
  let totalPass = 0;
  let totalFail = 0;

  for (const suite of SUITES) {
    process.stdout.write(`⏳ Đang chạy: ${suite.name} (${suite.file})... `);
    const res = await runSuite(suite);
    results.push(res);
    totalPass += res.passed;
    totalFail += res.failed;

    if (res.code === 0 && res.failed === 0) {
      console.log(`✅ PASS (${res.passed} test cases, ${res.duration}ms)`);
    } else {
      console.log(`❌ FAIL (${res.failed} failures, code: ${res.code})`);
      if (res.stderr) console.error(res.stderr);
    }
  }

  const grandTotal = totalPass + totalFail;
  const passRate = grandTotal > 0 ? ((totalPass / grandTotal) * 100).toFixed(1) : '0.0';

  console.log('\n================================================================');
  console.log('📊 BẢNG TỔNG HỢP KẾT QUẢ KIỂM THỬ THỰC TẾ (MASTER REPORT)');
  console.log('================================================================');
  console.log('| STT | Hạng mục kiểm thử                     | Pass | Fail | Thời gian |');
  console.log('|-----|---------------------------------------|------|------|-----------|');
  results.forEach((r, idx) => {
    const paddedName = r.name.padEnd(37, ' ');
    const paddedPass = String(r.passed).padStart(4, ' ');
    const paddedFail = String(r.failed).padStart(4, ' ');
    const paddedTime = `${r.duration}ms`.padStart(9, ' ');
    console.log(`| ${idx + 1}   | ${paddedName} | ${paddedPass} | ${paddedFail} | ${paddedTime} |`);
  });
  console.log('----------------------------------------------------------------');
  console.log(`🏆 TỔNG SỐ TEST CASES ĐÃ CHẠY: ${grandTotal}`);
  console.log(`✅ TỔNG SỐ TEST PASS:          ${totalPass}`);
  console.log(`❌ TỔNG SỐ TEST FAIL:          ${totalFail}`);
  console.log(`🎯 TỶ LỆ CHÍNH XÁC ĐẠT ĐƯỢC:   ${passRate}%`);
  console.log('================================================================\n');

  if (totalFail > 0) {
    process.exit(1);
  }
}

runAll().catch(err => {
  console.error('Master runner error:', err);
  process.exit(1);
});
