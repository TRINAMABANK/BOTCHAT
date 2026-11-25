/**
 * TEST SUITE: PHASE 2 - REASONING ENGINE UPGRADE (BOTCHAT BRAIN 2.1)
 * 
 * Verifies:
 * 1. Correct System Capability selection for all 8 domains
 * 2. Multi-step plan generation (e.g. MIXED_ORCHESTRATION, DOCUMENT_RAG, FORMAL_QUOTATION)
 * 3. RBAC Capability permission gate (rejects unauthorized access)
 * 4. Safe fallback to GENERAL_CONVERSATION (NEVER defaults to sales!)
 * 5. Step result validation (validateStepResult)
 */

import { ReasoningEngine, SYSTEM_CAPABILITIES } from '../server/services/intelligence/reasoningEngine.js';
import { IntentEngine } from '../server/services/intelligence/intentEngine.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('================================================================');
console.log('🚀 KIỂM THỬ GIAI ĐOẠN 2: REASONING ENGINE & CAPABILITY ROUTING');
console.log('================================================================\n');

// -------------------------------------------------------------
// Group 1: Capability Selection & Plan Construction
// -------------------------------------------------------------
console.log('--- 1. Kiểm tra Lựa Chọn Capability Chuẩn ---');

// 1.1 Sales Capability
const intentSales = IntentEngine.analyzeIntent('Báo giá máy in Brother HL-L6210DW');
const planSales = ReasoningEngine.planExecution(intentSales, {});
assert(planSales.capability === SYSTEM_CAPABILITIES.AI_SALES, `Sales capability: ${planSales.capability}`);
assert(planSales.steps.includes('SEARCH_PRODUCT_CATALOG'), 'Sales multi-step includes catalog search');

// 1.2 Secretary Capability (Authorized Owner)
const intentSecOwner = IntentEngine.analyzeIntent('Tổng hợp các khách hàng đang chờ báo giá', {
  userContext: { isOwner: true, role: 'admin' }
});
const planSecOwner = ReasoningEngine.planExecution(intentSecOwner, {
  userContext: { isOwner: true, role: 'admin' }
});
assert(planSecOwner.capability === SYSTEM_CAPABILITIES.AI_SECRETARY, `Secretary capability for Owner: ${planSecOwner.capability}`);
assert(planSecOwner.permissionGranted === true, 'Owner permission granted');
assert(planSecOwner.steps.includes('FETCH_PENDING_CRM_LEADS'), 'Secretary plan includes CRM fetch');

// 1.3 Document RAG Capability
const intentDoc = IntentEngine.analyzeIntent('Cho tôi xem quy trình điều chuyển tài sản nội bộ');
const planDoc = ReasoningEngine.planExecution(intentDoc, {});
assert(planDoc.capability === SYSTEM_CAPABILITIES.DOCUMENT_RAG, `Document RAG capability: ${planDoc.capability}`);
assert(planDoc.steps.includes('SEARCH_DOCUMENT_CHUNKS'), 'Document plan includes chunks search');

// 1.4 Data Excel Capability
const intentData = IntentEngine.analyzeIntent('Tính tổng cộng doanh thu trong bảng tính excel này');
const planData = ReasoningEngine.planExecution(intentData, {});
assert(planData.capability === SYSTEM_CAPABILITIES.DATA_EXCEL, `Data Excel capability: ${planData.capability}`);
assert(planData.steps.includes('EXECUTE_EXCEL_QUERY'), 'Excel plan includes execute query');

// 1.5 Web Research Capability
const intentResearch = IntentEngine.analyzeIntent('Tra cứu tin tức thời tiết trên internet');
const planResearch = ReasoningEngine.planExecution(intentResearch, {});
assert(planResearch.capability === SYSTEM_CAPABILITIES.WEB_RESEARCH, `Web Research capability: ${planResearch.capability}`);
assert(planResearch.steps.includes('EXECUTE_WEB_SEARCH'), 'Web plan includes execute web search');

// 1.6 Mixed Orchestration Capability
const intentMixed = IntentEngine.analyzeIntent('Báo giá máy in Brother và nhắc anh Trí 3h chiều họp');
const planMixed = ReasoningEngine.planExecution(intentMixed, {});
assert(planMixed.capability === SYSTEM_CAPABILITIES.MIXED_ORCHESTRATION, `Mixed capability: ${planMixed.capability}`);
assert(planMixed.steps.includes('EXECUTE_SALES_SUBTASK') && planMixed.steps.includes('EXECUTE_SECRETARY_SUBTASK'), 'Mixed plan has both subtasks');

// -------------------------------------------------------------
// Group 2: RBAC Capability Permission Gates
// -------------------------------------------------------------
console.log('\n--- 2. Kiểm tra Phân Quyền Năng Lực (RBAC Permission Gates) ---');

// 2.1 Unauthorized Customer requesting CRM Summary
const intentSecCustomer = IntentEngine.analyzeIntent('Tổng hợp danh sách khách hàng đang chờ báo giá', {
  userContext: { isOwner: false, role: 'customer' }
});
const planSecCustomer = ReasoningEngine.planExecution(intentSecCustomer, {
  userContext: { isOwner: false, role: 'customer' }
});
assert(planSecCustomer.capability === SYSTEM_CAPABILITIES.SECURITY_GUARD, 'Blocked customer from CRM summary');
assert(planSecCustomer.permissionGranted === false, 'Permission denied for customer');
assert(planSecCustomer.steps.includes('ENFORCE_SECURITY_BARRIER'), 'Security barrier step enforced');

// 2.2 Unauthorized user attempting owner personal tasks
const intentOwnerTaskAnon = { primaryIntent: 'OWNER_DAILY_PLAN', slots: {} };
const planOwnerTaskAnon = ReasoningEngine.planExecution(intentOwnerTaskAnon, {
  userContext: { isOwner: false, role: 'anonymous' }
});
assert(planOwnerTaskAnon.capability === SYSTEM_CAPABILITIES.SECURITY_GUARD, 'Blocked anonymous from owner tasks');
assert(planOwnerTaskAnon.permissionGranted === false, 'Permission denied for owner task');

// -------------------------------------------------------------
// Group 3: Safe Fallback (No Default Sales Engine!)
// -------------------------------------------------------------
console.log('\n--- 3. Kiểm tra Cơ Chế Fallback An Toàn (Không Mặc Định Sales) ---');

const intentGeneral = IntentEngine.analyzeIntent('Hôm nay thời tiết đẹp quá nhỉ');
const planGeneral = ReasoningEngine.planExecution(intentGeneral, {});
assert(planGeneral.capability === SYSTEM_CAPABILITIES.GENERAL_CONVERSATION, `Safe conversation capability: ${planGeneral.capability}`);
assert(planGeneral.steps.includes('ENGAGE_FRIENDLY_CHAT'), 'Friendly chat step chosen');
assert(!planGeneral.steps.includes('CONSULT_SALES_ENGINE'), 'Sales engine is STRICTLY NOT included in general chat plan');

// -------------------------------------------------------------
// Group 4: Step Result Validation (validateStepResult)
// -------------------------------------------------------------
console.log('\n--- 4. Kiểm tra Xác Thực Kết Quả Từng Bước (validateStepResult) ---');

const valSuccess = ReasoningEngine.validateStepResult('SEARCH_PRODUCT_CATALOG', { items: [{ id: 1, name: 'Brother HL-L6210DW' }] });
assert(valSuccess.success === true, 'Catalog search validated with items');

const valFailure = ReasoningEngine.validateStepResult('SEARCH_PRODUCT_CATALOG', { items: [] });
assert(valFailure.success === false, 'Catalog search failure caught on empty items');
assert(valFailure.fallbackAction === 'OFFER_BROAD_RECOMMENDATION', 'Correct fallback action suggested');

const valOrderSuccess = ReasoningEngine.validateStepResult('VALIDATE_ORDER_ITEM', { validItem: true });
assert(valOrderSuccess.success === true, 'Valid order item validated');

const valOrderFail = ReasoningEngine.validateStepResult('VALIDATE_ORDER_ITEM', { validItem: false });
assert(valOrderFail.success === false, 'Invalid order item flagged');

console.log('\n================================================================');
console.log(`🏁 KẾT QUẢ GIAI ĐOẠN 2: ${passed} PASS, ${failed} FAIL (Tỷ lệ: ${((passed / (passed + failed)) * 100).toFixed(1)}%)`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
}
