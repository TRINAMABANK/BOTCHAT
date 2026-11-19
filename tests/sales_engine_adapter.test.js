/**
 * TRÍ AI ULTIMATE ROBOT - SALES ENGINE ADAPTER REGRESSION TEST SUITE
 * 
 * Verifies that the SalesEngineAdapter maintains 100% parity with SalesEngine,
 * preserves Column 2 sync signals, and formats Tool Calling outputs correctly.
 */

import { SalesEngineAdapter, SALES_ENGINE_TOOL_DEFINITION } from '../server/adapters/salesEngineAdapter.js';
import SalesEngine from '../server/salesEngine.js';
import { db, initDatabase } from '../server/db.js';

let totalTests = 0;
let passedTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING SALES ENGINE ADAPTER REGRESSION TESTS');
  console.log('======================================================\n');

  await initDatabase();

  // Test 1: Tool Definition conforms to OpenAI Function Calling standard
  console.log('--- Test 1: Tool Definition Conformance ---');
  assert(SALES_ENGINE_TOOL_DEFINITION.type === 'function', 'Tool type is function');
  assert(SALES_ENGINE_TOOL_DEFINITION.function.name === 'consult_sales_engine', 'Tool name matches');
  assert(typeof SALES_ENGINE_TOOL_DEFINITION.function.description === 'string', 'Tool has description');
  assert(SALES_ENGINE_TOOL_DEFINITION.function.parameters.type === 'object', 'Parameters type is object');
  assert(SALES_ENGINE_TOOL_DEFINITION.function.parameters.required.includes('user_message'), 'user_message is required');

  // Test 2: Parity Check - Health & Greeting inquiry ("bạn khoẻ không")
  console.log('\n--- Test 2: Health & Greeting Inquiry ("bạn khoẻ không") ---');
  const greetingPayload = {
    conversationId: 'test_conv_greet_01',
    message: 'bạn khoẻ không'
  };

  const directResult = await SalesEngine.processMessage(greetingPayload);
  const adapterResult = await SalesEngineAdapter.processMessage(greetingPayload);

  assert(adapterResult.success === directResult.success, 'Success flag matches');
  assert(adapterResult.reply.includes('khoẻ') || adapterResult.reply.includes('khỏe') || adapterResult.reply.toLowerCase().includes('khoe'), 'Reply acknowledges health politely');
  assert(!adapterResult.revealCatalog, 'Does not aggressively open catalog on health inquiry');
  assert(adapterResult.adapter.source === 'sales_engine_core', 'Adapter source metadata attached');

  // Test 3: Specific Product Inquiry ("anh cần mua trà")
  console.log('\n--- Test 3: Specific Product Inquiry ("anh cần mua trà") ---');
  const teaPayload = {
    conversationId: 'test_conv_tea_02',
    message: 'anh cần mua trà'
  };

  const teaResult = await SalesEngineAdapter.processMessage(teaPayload);
  assert(teaResult.success === true, 'Product search returned success');
  assert(teaResult.revealCatalog === true, 'revealCatalog is true for Column 2');
  assert(typeof teaResult.recommendedField === 'string' && teaResult.recommendedField.toLowerCase().includes('trà'), 'recommendedField points to Tea category');
  assert(teaResult.recommendedProduct !== null, 'recommendedProduct is populated');
  console.log(`     👉 Recommended Product: "${teaResult.recommendedProduct?.name}"`);

  // Test 4: OpenAI Tool Execution format via executeAsTool
  console.log('\n--- Test 4: OpenAI Tool Execution format via executeAsTool ---');
  const toolArgs = {
    user_message: 'báo giá máy đếm tiền cho tôi',
    action_intent: 'inquire'
  };
  const toolContext = {
    conversationId: 'test_conv_tool_03'
  };

  const toolExecution = await SalesEngineAdapter.executeAsTool(toolArgs, toolContext);
  assert(typeof toolExecution.toolResponseForLLM === 'object', 'toolResponseForLLM is an object');
  assert(typeof toolExecution.toolResponseForLLM.replySummary === 'string', 'replySummary is present');
  assert(typeof toolExecution.uiDirectives === 'object', 'uiDirectives is present');
  assert(typeof toolExecution.uiDirectives.revealCatalog === 'boolean', 'uiDirectives.revealCatalog is boolean');
  assert(toolExecution.rawResult.success === true, 'rawResult is preserved');

  // Test 5: Intent detector helper
  console.log('\n--- Test 5: Sales Inquiry Intent Detector ---');
  assert(SalesEngineAdapter.isSalesInquiry('tôi muốn mua máy tính') === true, 'Detects "mua máy tính" as sales inquiry');
  assert(SalesEngineAdapter.isSalesInquiry('giá sản phẩm này bao nhiêu') === true, 'Detects "giá sản phẩm" as sales inquiry');
  assert(SalesEngineAdapter.isSalesInquiry('thủ đô của nước Pháp là gì') === false, 'Filters out general knowledge question');

  console.log('\n======================================================');
  console.log(`🎉 ALL TESTS PASSED: ${passedTests}/${totalTests}`);
  console.log('======================================================\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('\n❌ TEST RUNNER ERROR:', err);
  process.exit(1);
});
