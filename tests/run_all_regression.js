import { execSync } from 'child_process';

const suites = [
  'tests/test_natural_human_conversation_suite.js',
  'tests/test_personal_assistant_suite.js',
  'tests/test_doctor_level_benchmark.js',
  'tests/test_cognitive_core_stage2.js',
  'tests/test_knowledge_graph_stage3.js',
  'tests/test_deep_research_stage4.js',
  'tests/test_domain_expansion_stage5.js',
  'tests/test_human_brain_master_suite.js',
  'tests/test_private_secretary_suite.js',
  'tests/test_service_survey_suite.js',
  'tests/test_brain_2_1_master_suite.js',
  'tests/test_universal_sales_and_secretary_suite.js',
  'tests/test_security_audit_hardening.js'
];

console.log('========================================================================');
console.log('🚀 MASTER REGRESSION RUNNER – TRÍ AI ULTIMATE ROBOT');
console.log(`Running ${suites.length} core test suites across all stages`);
console.log('========================================================================\n');

let allPassed = true;
const summary = [];

for (const suite of suites) {
  process.stdout.write(`⏳ Running ${suite} ... `);
  const start = Date.now();
  try {
    const out = execSync(`node ${suite}`, { stdio: 'pipe' }).toString();
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`✅ PASSED (${duration}s)`);
    summary.push({ suite, status: 'PASSED', duration });
  } catch (err) {
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`❌ FAILED (${duration}s)`);
    console.error(err.stdout ? err.stdout.toString() : err.message);
    summary.push({ suite, status: 'FAILED', duration });
    allPassed = false;
    break;
  }
}

console.log('\n========================================================================');
console.log('📊 REGRESSION RUN SUMMARY:');
summary.forEach(s => console.log(`  [${s.status}] ${s.suite} (${s.duration}s)`));
console.log('========================================================================');

if (allPassed) {
  console.log(`🌟 ALL ${suites.length} TEST SUITES PASSED 100%! ZERO REGRESSION CONFIRMED.`);
  process.exit(0);
} else {
  console.error('💥 REGRESSION DETECTED! PLEASE FIX ERRORS.');
  process.exit(1);
}
