/**
 * CRM LEAD ENHANCEMENT TEST SUITE
 * 
 * Verifies all 5 Acceptance Criteria:
 * 1. Customer inquires about Glory EU200 -> CRM records "Máy đếm tiền Glory EU200", brand: Glory, model: EU200.
 * 2. Customer asks about 2 products -> CRM saves both products in products_json.
 * 3. Customer only asks general question -> CRM records "Chưa xác định sản phẩm".
 * 4. Multi-turn dialogue context: Product asked in Turn 1, Phone provided in Turn 2 -> correctly captures product from conversation.
 * 5. Data persistence & schema verification: brand, model, products_json, conversation_summary.
 * 6. Legacy backfill verification: Zero leads with "Sản phẩm tổng quan".
 */

import { getDb, db } from '../server/db.js';
import { runCrmLeadsMigration } from '../server/migrations/schema_phase_crm_leads.js';
import { CrmLeadService } from '../server/services/crmLeadService.js';
import { randomUUID } from 'crypto';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  \x1b[32m✔ PASS\x1b[0m: ${message}`);
    passed++;
  } else {
    console.error(`  \x1b[31m✘ FAIL\x1b[0m: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('  BOTCHAT CRM LEAD ENHANCEMENT VERIFICATION SUITE');
  console.log('======================================================\n');

  // Test Suite 1: Schema & Migration
  console.log('[SUITE 1] Database Schema & Migration Verification');
  await runCrmLeadsMigration(db);
  const cols = await db.all('PRAGMA table_info(leads)');
  const colNames = new Set(cols.map(c => c.name));
  assert(colNames.has('brand'), 'Column brand exists in leads table');
  assert(colNames.has('model'), 'Column model exists in leads table');
  assert(colNames.has('products_json'), 'Column products_json exists in leads table');
  assert(colNames.has('conversation_summary'), 'Column conversation_summary exists in leads table');

  // Test Suite 2: Single Product Inquiry (Glory EU200)
  console.log('\n[SUITE 2] Acceptance Criterion 1: Glory EU200');
  const res1 = await CrmLeadService.extractProductsFromConversation({
    currentMessage: 'Báo giá cho tôi máy đếm tiền Glory EU200 với, sđt 0988111222',
    db
  });
  assert(res1.productName === 'Máy đếm tiền Glory EU200', `Product name is 'Máy đếm tiền Glory EU200' (got: "${res1.productName}")`);
  assert(res1.brand === 'Glory', `Brand is Glory (got: "${res1.brand}")`);
  assert(res1.model === 'EU200', `Model is EU200 (got: "${res1.model}")`);
  assert(res1.products.length === 1, `Exactly 1 product in list (got: ${res1.products.length})`);
  assert(res1.quantity === 1, `Quantity is 1 (got: ${res1.quantity})`);

  // Test Suite 3: Multi-product Inquiry
  console.log('\n[SUITE 3] Acceptance Criterion 2: Multi-product Inquiry');
  const res2 = await CrmLeadService.extractProductsFromConversation({
    currentMessage: 'Tôi muốn mua máy đếm tiền Glory EU200 và máy in Brother HL-L6210DW số điện thoại 0912345678',
    db
  });
  assert(res2.products.length === 2, `Detected 2 products in inquiry (got: ${res2.products.length})`);
  const names = res2.products.map(p => p.name);
  assert(names.some(n => n.includes('Glory') && n.includes('EU200')), `Contains Glory EU200: ${JSON.stringify(names)}`);
  assert(names.some(n => n.includes('Brother') && n.includes('HL-L6210DW')), `Contains Brother HL-L6210DW: ${JSON.stringify(names)}`);
  assert(res2.products.some(p => p.brand === 'Brother'), 'Brother brand recognized');
  assert(res2.products.some(p => p.model === 'HL-L6210DW'), 'HL-L6210DW model recognized');

  // Test Suite 4: General Inquiry without Product
  console.log('\n[SUITE 4] Acceptance Criterion 3: General Inquiry (Chưa xác định sản phẩm)');
  const res3 = await CrmLeadService.extractProductsFromConversation({
    currentMessage: 'Chào shop, cho tôi hỏi giờ mở cửa và địa chỉ công ty ở đâu? SĐT 0933444555',
    db
  });
  assert(res3.productName === 'Chưa xác định sản phẩm', `Product name is 'Chưa xác định sản phẩm' (got: "${res3.productName}")`);
  assert(res3.products.length === 0, `Products list is empty (got: ${res3.products.length})`);
  assert(res3.brand === null, `Brand is null (got: ${res3.brand})`);
  assert(res3.model === null, `Model is null (got: ${res3.model})`);

  // Test Suite 5: Multi-turn Dialogue Context
  console.log('\n[SUITE 5] Multi-turn Dialogue Context Extraction');
  const testConvId = `conv_test_${randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();

  // Seed Turn 1: User asks about product
  await db.run(
    'INSERT INTO conversations (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    [testConvId, 'usr_customer', 'Test Conversation', now, now]
  );
  await db.run(
    'INSERT INTO messages (id, conversation_id, sender_type, content, created_at) VALUES (?, ?, ?, ?, ?)',
    [`msg_1_${randomUUID().slice(0, 6)}`, testConvId, 'user', 'Cây nước nóng lạnh Kangaroo KG64A3 dùng có bền không shop? Giá bao nhiêu?', now]
  );
  await db.run(
    'INSERT INTO messages (id, conversation_id, sender_type, content, created_at) VALUES (?, ?, ?, ?, ?)',
    [`msg_2_${randomUUID().slice(0, 6)}`, testConvId, 'assistant', 'Dạ cây nước nóng lạnh Kangaroo KG64A3 bên em bảo hành 12 tháng, dùng rất bền ạ!', now]
  );

  // Turn 2: User provides phone without repeating product name
  const enrichedMultiTurn = await CrmLeadService.enrichLeadData({
    leadId: `lead_test_${randomUUID().slice(0, 6)}`,
    customerName: 'Chị Mai',
    phone: '0909123456',
    conversationId: testConvId,
    currentMessage: '0909123456 gọi lại báo giá giúp tôi nhé',
    db
  });

  assert(enrichedMultiTurn.product_name.includes('Kangaroo') && enrichedMultiTurn.product_name.includes('KG64A3'),
    `Extracted Kangaroo KG64A3 from dialogue history (got: "${enrichedMultiTurn.product_name}")`);
  assert(enrichedMultiTurn.brand === 'Kangaroo', `Extracted brand Kangaroo (got: "${enrichedMultiTurn.brand}")`);
  assert(enrichedMultiTurn.model === 'KG64A3', `Extracted model KG64A3 (got: "${enrichedMultiTurn.model}")`);
  assert(enrichedMultiTurn.conversation_summary.includes('Kangaroo KG64A3'), 'Summary contains Kangaroo KG64A3');

  // Test Suite 6: Database Insertion & Retrieval
  console.log('\n[SUITE 6] Lead Insertion & Persistence Verification');
  await db.run(`
    INSERT INTO leads (
      id, customer_name, phone, email, product_id, product_name, quantity, customer_requirement,
      conversation_id, website_source, widget_id, consent_to_contact, created_time, lead_status, notes, updated_at,
      brand, model, products_json, conversation_summary
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    enrichedMultiTurn.id,
    enrichedMultiTurn.customer_name,
    enrichedMultiTurn.phone,
    enrichedMultiTurn.email,
    enrichedMultiTurn.product_id,
    enrichedMultiTurn.product_name,
    enrichedMultiTurn.quantity,
    enrichedMultiTurn.customer_requirement,
    enrichedMultiTurn.conversation_id,
    enrichedMultiTurn.website_source,
    enrichedMultiTurn.widget_id,
    enrichedMultiTurn.consent_to_contact,
    enrichedMultiTurn.created_time,
    enrichedMultiTurn.lead_status,
    enrichedMultiTurn.notes,
    enrichedMultiTurn.updated_at,
    enrichedMultiTurn.brand,
    enrichedMultiTurn.model,
    enrichedMultiTurn.products_json,
    enrichedMultiTurn.conversation_summary
  ]);

  const fetchedLead = await db.get('SELECT * FROM leads WHERE id = ?', [enrichedMultiTurn.id]);
  assert(fetchedLead !== null, 'Lead fetched successfully from database');
  assert(fetchedLead.product_name === enrichedMultiTurn.product_name, 'product_name persisted exactly');
  assert(fetchedLead.brand === 'Kangaroo', 'brand persisted exactly');
  assert(fetchedLead.model === 'KG64A3', 'model persisted exactly');
  assert(typeof fetchedLead.products_json === 'string' && fetchedLead.products_json.includes('KG64A3'), 'products_json persisted valid JSON');
  assert(fetchedLead.conversation_summary === enrichedMultiTurn.conversation_summary, 'conversation_summary persisted exactly');

  // Cleanup test records
  await db.run('DELETE FROM leads WHERE id = ?', [enrichedMultiTurn.id]);
  await db.run('DELETE FROM messages WHERE conversation_id = ?', [testConvId]);
  await db.run('DELETE FROM conversations WHERE id = ?', [testConvId]);

  // Test Suite 7: Legacy Backfill Check
  console.log('\n[SUITE 7] Legacy Backfill Check');
  const legacyCount = await db.get("SELECT COUNT(*) as count FROM leads WHERE product_name = 'Sản phẩm tổng quan'");
  assert(legacyCount.count === 0, `Zero leads with 'Sản phẩm tổng quan' (got: ${legacyCount.count})`);

  console.log('\n------------------------------------------------------');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log(`SUCCESS RATE: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
