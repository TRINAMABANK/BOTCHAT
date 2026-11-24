/**
 * COMPREHENSIVE ACCEPTANCE TEST SUITE:
 * FIX LỖI MẤT NGỮ CẢNH SẢN PHẨM KHI TẠO BÁO GIÁ – BOTCHAT
 * 
 * Verifies all 6 mandatory acceptance criteria:
 * - Test 1: Discuss Lenovo ThinkPad T14 Gen 6 (45.100.000đ) -> "Cho anh báo giá" -> Quote for Lenovo, 45.100.000đ
 * - Test 2: Discuss Surface Pro -> "Làm báo giá giúp anh" -> Quote for Surface Pro, no switch to Lenovo or PC
 * - Test 3: Discuss 3 products -> "Báo giá sản phẩm thứ hai" -> Quote for 2nd product
 * - Test 4: Asks quote without ever discussing product -> AI asks which product to quote, no random quote created
 * - Test 5: Discuss Product A, switch to Product B -> "Cho anh báo giá" -> Quote for Product B
 * - Test 6: Product A price invalid/unverified -> AI asks for re-verification, does NOT replace with random product
 */

import { randomUUID } from 'crypto';
import db from '../server/db.js';
import { CentralBrainService } from '../server/services/centralBrainService.js';
import { ActiveProductContext } from '../server/services/intelligence/activeProductContext.js';
import { QuotationService } from '../server/services/quotationService.js';
import { ToolOrchestrator } from '../server/services/intelligence/toolOrchestrator.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('🚀 ACCEPTANCE TEST SUITE: ACTIVE PRODUCT CONTEXT IN QUOTATIONS');
  console.log('================================================================\n');

  // ============================================================================
  // TEST 1: Lenovo ThinkPad T14 Gen 6 (45.100.000đ) -> "Cho anh báo giá"
  // ============================================================================
  console.log('--- TEST 1: ThinkPad T14 Gen 6 (45.100.000đ) -> "Cho anh báo giá" ---');
  {
    const convId = `conv_test1_${Date.now()}`;
    ActiveProductContext.clearContext(convId);

    // Turn 1: Discuss product details
    const turn1Msg = 'Tôi đang quan tâm Lenovo ThinkPad T14 Gen 6 CPU: Core Ultra 7 258V RAM: 32GB SSD: 512GB Giá niêm yết: 45.100.000 đồng';
    const res1 = await CentralBrainService.processChat({
      conversationId: convId,
      message: turn1Msg,
      customerInfo: { name: 'Anh Trí', phone: '0909123456' }
    });
    assert(res1.success === true, 'Turn 1 processed successfully');

    // Verify ActiveProductContext captured the product
    const active1 = ActiveProductContext.getContext(convId);
    assert(active1 !== null, 'Active product context created');
    assert(active1?.active_product_name?.includes('ThinkPad T14 Gen 6'), 'Active product name is Lenovo ThinkPad T14 Gen 6');
    assert(active1?.active_product_price === 45100000, `Active product price is 45.100.000đ (Actual: ${active1?.active_product_price})`);

    // Turn 2: Customer asks short prompt: "Cho anh báo giá"
    const res2 = await CentralBrainService.processChat({
      conversationId: convId,
      message: 'Cho anh báo giá',
      customerInfo: { name: 'Anh Trí', phone: '0909123456' }
    });

    assert(res2.success === true, 'Turn 2 quotation request processed successfully');
    assert(res2.reply.includes('ThinkPad T14 Gen 6'), 'Quotation response contains ThinkPad T14 Gen 6');
    assert(res2.reply.includes('45.100.000') || res2.reply.includes('45,100,000'), 'Quotation response contains exact price 45.100.000');
    assert(!res2.reply.includes('PC 20 triệu') && !res2.reply.includes('ThinkCentre'), 'Quotation response does NOT hallucinate PC 20 triệu or ThinkCentre');

    // Verify database quotation record
    const latestQuote = await db.get(
      'SELECT q.*, qi.product_name, qi.unit_price, qi.quantity FROM quotations q JOIN quotation_items qi ON q.id = qi.quotation_id WHERE q.conversation_id = ? ORDER BY q.created_at DESC LIMIT 1',
      [convId]
    );
    assert(latestQuote !== null, 'Database quotation record exists');
    assert(latestQuote?.product_name?.includes('ThinkPad T14 Gen 6'), `DB product_name is ThinkPad T14 Gen 6 (Actual: ${latestQuote?.product_name})`);
    assert(latestQuote?.unit_price === 45100000, `DB unit_price is 45.100.000đ (Actual: ${latestQuote?.unit_price})`);
    assert(latestQuote?.quantity === 1, `DB quantity defaults to 1 (Actual: ${latestQuote?.quantity})`);
  }

  // ============================================================================
  // TEST 2: Surface Pro -> "Làm báo giá giúp anh" -> NO switch to ThinkPad or PC
  // ============================================================================
  console.log('\n--- TEST 2: Surface Pro -> "Làm báo giá giúp anh" (No switch to ThinkPad/PC) ---');
  {
    const convId = `conv_test2_${Date.now()}`;
    ActiveProductContext.clearContext(convId);

    // Turn 1: Discuss Surface Pro
    const turn1Msg = 'Tư vấn giúp em chiếc Surface Pro 11 Snapdragon X Plus RAM 16GB SSD 256GB giá 31.900.000 đồng với';
    const res1 = await CentralBrainService.processChat({
      conversationId: convId,
      message: turn1Msg,
      customerInfo: { name: 'Chị Mai', phone: '0912345678' }
    });
    assert(res1.success === true, 'Turn 1 Surface Pro inquiry processed');

    // Turn 2: "Làm báo giá giúp anh"
    const res2 = await CentralBrainService.processChat({
      conversationId: convId,
      message: 'Làm báo giá giúp anh',
      customerInfo: { name: 'Chị Mai', phone: '0912345678' }
    });

    assert(res2.success === true, 'Turn 2 quotation processed');
    assert(res2.reply.includes('Surface Pro'), 'Quotation response contains Surface Pro');
    assert(!res2.reply.includes('ThinkPad'), 'Quotation response does NOT contain ThinkPad');
    assert(!res2.reply.includes('PC 20 triệu'), 'Quotation response does NOT contain PC 20 triệu');
    assert(res2.reply.includes('31.900.000') || res2.reply.includes('31,900,000'), 'Quotation response reflects Surface Pro price 31.900.000đ');

    // Verify DB
    const dbQuote = await db.get(
      'SELECT qi.product_name, qi.unit_price FROM quotations q JOIN quotation_items qi ON q.id = qi.quotation_id WHERE q.conversation_id = ? ORDER BY q.created_at DESC LIMIT 1',
      [convId]
    );
    assert(dbQuote?.product_name?.includes('Surface Pro'), `DB item name is Surface Pro (Actual: ${dbQuote?.product_name})`);
    assert(dbQuote?.unit_price === 31900000, `DB item price is 31.900.000đ (Actual: ${dbQuote?.unit_price})`);
  }

  // ============================================================================
  // TEST 3: Discuss 3 products -> "Báo giá sản phẩm thứ hai" -> Quote 2nd product
  // ============================================================================
  console.log('\n--- TEST 3: Discuss 3 products -> "Báo giá sản phẩm thứ hai" ---');
  {
    const convId = `conv_test3_${Date.now()}`;
    ActiveProductContext.clearContext(convId);

    // Register 3 products in dialogue history
    // Prod 1: Lenovo ThinkPad E14 (32.790.000đ)
    await CentralBrainService.processChat({
      conversationId: convId,
      message: 'Sản phẩm 1 là Lenovo ThinkPad E14 Gen 7 giá 32.790.000 đồng',
      customerInfo: { name: 'Anh Nam' }
    });

    // Prod 2: Surface Pro 11 (31.900.000đ)
    await CentralBrainService.processChat({
      conversationId: convId,
      message: 'Sản phẩm 2 là Surface Pro 11 giá 31.900.000 đồng',
      customerInfo: { name: 'Anh Nam' }
    });

    // Prod 3: MacBook Air M3 (27.990.000đ)
    await CentralBrainService.processChat({
      conversationId: convId,
      message: 'Sản phẩm 3 là MacBook Air M3 giá 27.990.000 đồng',
      customerInfo: { name: 'Anh Nam' }
    });

    const activeCtx = ActiveProductContext.getContext(convId);
    assert(activeCtx?.recent_products?.length >= 3, `Recent products tracked >= 3 (Actual: ${activeCtx?.recent_products?.length})`);

    // Turn: "Báo giá sản phẩm thứ hai"
    const quoteRes = await CentralBrainService.processChat({
      conversationId: convId,
      message: 'Báo giá sản phẩm thứ hai',
      customerInfo: { name: 'Anh Nam' }
    });

    assert(quoteRes.success === true, 'Turn quotation processed for ordinal #2');
    assert(quoteRes.reply.includes('Surface Pro'), `Quotation is for Surface Pro 11 (2nd product)`);
    assert(!quoteRes.reply.includes('MacBook Air'), 'Quotation is NOT for 3rd product (MacBook Air)');
    assert(!quoteRes.reply.includes('ThinkPad E14'), 'Quotation is NOT for 1st product (ThinkPad E14)');
  }

  // ============================================================================
  // TEST 4: Asks quote without ever discussing product -> AI asks for clarification
  // ============================================================================
  console.log('\n--- TEST 4: Quote without product discussed -> AI asks for clarification ---');
  {
    const convId = `conv_test4_${Date.now()}`;
    ActiveProductContext.clearContext(convId);

    const res = await CentralBrainService.processChat({
      conversationId: convId,
      message: 'Cho anh báo giá',
      customerInfo: { name: 'Khách Vãng Lai' }
    });

    assert(res.success === true, 'Response returned successfully');
    assert(
      res.reply.includes('sản phẩm nào') || res.reply.includes('cho em xin tên') || res.reply.includes('model sản phẩm') || (res.reply.includes('sản phẩm') && res.reply.includes('nào')),
      `AI asks which product to quote (Actual: "${res.reply.substring(0, 80)}...")`
    );

    // Verify NO quotation created in database
    const dbQuote = await db.get('SELECT * FROM quotations WHERE conversation_id = ?', [convId]);
    assert(dbQuote === undefined || dbQuote === null, 'No quotation record created in database for clean conversation');
  }

  // ============================================================================
  // TEST 5: Discuss Product A, switch to Product B -> "Cho anh báo giá" -> Quote for B
  // ============================================================================
  console.log('\n--- TEST 5: Discuss Product A, switch to Product B -> Quote for B ---');
  {
    const convId = `conv_test5_${Date.now()}`;
    ActiveProductContext.clearContext(convId);

    // Turn 1: Discuss Product A (Dell XPS 13, 38.000.000đ)
    await CentralBrainService.processChat({
      conversationId: convId,
      message: 'Tư vấn cho mình Dell XPS 13 giá 38.000.000 đồng',
      customerInfo: { name: 'Anh Hoàng' }
    });

    // Turn 2: Customer switches to Product B (Lenovo ThinkPad T14 Gen 6, 45.100.000đ)
    await CentralBrainService.processChat({
      conversationId: convId,
      message: 'Thôi mình đổi ý, tư vấn cho mình Lenovo ThinkPad T14 Gen 6 giá 45.100.000 đồng đi',
      customerInfo: { name: 'Anh Hoàng' }
    });

    // Turn 3: "Cho anh báo giá"
    const res3 = await CentralBrainService.processChat({
      conversationId: convId,
      message: 'Cho anh báo giá',
      customerInfo: { name: 'Anh Hoàng' }
    });

    assert(res3.success === true, 'Turn 3 quotation processed');
    assert(res3.reply.includes('ThinkPad T14 Gen 6'), 'Quotation response is for Product B (ThinkPad T14 Gen 6)');
    assert(!res3.reply.includes('Dell XPS 13'), 'Quotation response does NOT quote Product A (Dell XPS 13)');
    assert(res3.reply.includes('45.100.000') || res3.reply.includes('45,100,000'), 'Quotation response reflects Product B price 45.100.000đ');
  }

  // ============================================================================
  // TEST 6: Product A price invalid/unverified -> AI asks for re-verification
  // ============================================================================
  console.log('\n--- TEST 6: Product price invalid/unverified -> AI notifies re-verification needed ---');
  {
    const convId = `conv_test6_${Date.now()}`;
    ActiveProductContext.clearContext(convId);

    // Directly set an active product with UNVERIFIED price (price = 0)
    ActiveProductContext.setActiveProduct(convId, {
      name: 'Máy in công nghiệp Xerox Color C8000',
      price: 0,
      priceType: 'UNVERIFIED',
      contextSource: 'conversation'
    });

    // Turn: Customer asks for quotation
    const res = await CentralBrainService.processChat({
      conversationId: convId,
      message: 'Cho anh báo giá',
      customerInfo: { name: 'Anh Dũng' }
    });

    assert(res.success === true, 'Response processed');
    assert(
      res.reply.includes('chờ cập nhật đơn giá') || res.reply.includes('xác minh') || res.reply.includes('chưa có giá'),
      `AI informs customer price is unverified/pending verification (Actual: "${res.reply.substring(0, 100)}...")`
    );
    assert(!res.reply.includes('PC 20 triệu'), 'AI does NOT substitute with a random 20M PC');

    // Verify DB does not contain quote for this conversation
    const dbQuote = await db.get('SELECT * FROM quotations WHERE conversation_id = ?', [convId]);
    assert(dbQuote === undefined || dbQuote === null, 'No quotation created in database for unverified price product');
  }

  console.log('\n================================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
