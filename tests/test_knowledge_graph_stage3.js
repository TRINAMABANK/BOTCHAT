/**
 * TRÍ AI ULTIMATE ROBOT – STAGE 3 TEST BENCH
 * KNOWLEDGE GRAPH ONTOLOGY & HYBRID DENSE VECTOR RAG
 */

import assert from 'assert';
import db, { initDatabase } from '../server/db.js';
import { KnowledgeGraphEngine, ENTITY_TYPES, RELATION_TYPES } from '../server/services/intelligence/knowledgeGraphEngine.js';
import { RagService } from '../server/services/ragService.js';
import CentralBrainService from '../server/services/centralBrainService.js';

let passed = 0;
let failed = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message);
    failed++;
  }
}

async function itAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message);
    failed++;
  }
}

async function runStage3Tests() {
  console.log('================================================================');
  console.log('🕸️  TRÍ AI ULTIMATE ROBOT – STAGE 3 KNOWLEDGE GRAPH & HYBRID RAG');
  console.log('================================================================\n');

  // 0. Ensure Database & Migrations initialized
  await initDatabase();

  // ---------------------------------------------------------------------------
  // 1. KNOWLEDGE GRAPH SCHEMA & CORE CRUD
  // ---------------------------------------------------------------------------
  console.log('--- 1. KNOWLEDGE GRAPH SCHEMA & CORE ONTOLOGY CRUD ---');

  await itAsync('Tạo và cập nhật thực thể (Upsert Entity Node)', async () => {
    const entId = await KnowledgeGraphEngine.upsertEntity({
      name: 'Máy in Brother HL-L6210DW',
      entityType: ENTITY_TYPES.PRODUCT,
      canonicalId: 'prod_test_printer_01',
      properties: { speed: 50, memory: 1024 },
      orgId: 'org_test_kg'
    });
    assert.ok(entId);

    // Update same entity with same canonical ID
    const entIdUpdated = await KnowledgeGraphEngine.upsertEntity({
      name: 'Máy in Brother HL-L6210DW (Chính hãng)',
      entityType: ENTITY_TYPES.PRODUCT,
      canonicalId: 'prod_test_printer_01',
      properties: { speed: 50, memory: 1024, warrantyYears: 3 },
      orgId: 'org_test_kg'
    });
    assert.strictEqual(entId, entIdUpdated);
  });

  await itAsync('Thiết lập quan hệ ngữ nghĩa có hướng (Add Directed Semantic Edge)', async () => {
    const prodId = await KnowledgeGraphEngine.upsertEntity({
      name: 'Brother HL-L6210DW Core',
      entityType: ENTITY_TYPES.PRODUCT,
      canonicalId: 'prod_b6210_core',
      orgId: 'org_test_kg'
    });
    const compId = await KnowledgeGraphEngine.upsertEntity({
      name: 'Hộp mực Brother TN-3608',
      entityType: ENTITY_TYPES.COMPONENT,
      canonicalId: 'comp_tn3608',
      orgId: 'org_test_kg'
    });

    const relId = await KnowledgeGraphEngine.addRelation({
      sourceEntityId: prodId,
      targetEntityId: compId,
      relationType: RELATION_TYPES.COMPATIBLE_WITH,
      weight: 1.0,
      properties: { yieldPages: 3000 },
      orgId: 'org_test_kg'
    });
    assert.ok(relId);

    // Verify Direct Outbound Relation
    const relations = await KnowledgeGraphEngine.findDirectRelations(prodId, {
      direction: 'OUT',
      relationType: RELATION_TYPES.COMPATIBLE_WITH,
      orgId: 'org_test_kg'
    });
    assert.strictEqual(relations.length, 1);
    assert.strictEqual(relations[0].target_name, 'Hộp mực Brother TN-3608');
  });

  // ---------------------------------------------------------------------------
  // 2. MULTI-HOP GRAPH TRAVERSAL
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. MULTI-HOP GRAPH TRAVERSAL & INFERENCE ---');

  await itAsync('Truy vấn quan hệ bắc cầu 2-Hop (Customer -> Product -> Component)', async () => {
    const custId = await KnowledgeGraphEngine.upsertEntity({
      name: 'Nguyễn Văn Nam (Doanh nghiệp A)',
      entityType: ENTITY_TYPES.CUSTOMER,
      canonicalId: 'cust_nam_01',
      orgId: 'org_test_kg'
    });
    const printerId = await KnowledgeGraphEngine.upsertEntity({
      name: 'Máy in Brother HL-L6210DW Enterprise',
      entityType: ENTITY_TYPES.PRODUCT,
      canonicalId: 'prod_b6210_ent',
      orgId: 'org_test_kg'
    });
    const drumId = await KnowledgeGraphEngine.upsertEntity({
      name: 'Cụm trống từ Brother DR-3608 (45.000 trang)',
      entityType: ENTITY_TYPES.COMPONENT,
      canonicalId: 'comp_dr3608',
      orgId: 'org_test_kg'
    });

    // 1-hop: Customer bought printer
    await KnowledgeGraphEngine.addRelation({
      sourceEntityId: custId,
      targetEntityId: printerId,
      relationType: RELATION_TYPES.HAS_PURCHASED,
      orgId: 'org_test_kg'
    });

    // 2-hop: Printer compatible with drum
    await KnowledgeGraphEngine.addRelation({
      sourceEntityId: printerId,
      targetEntityId: drumId,
      relationType: RELATION_TYPES.COMPATIBLE_WITH,
      orgId: 'org_test_kg'
    });

    // Traversal: Find what supplies are compatible with what Customer Nam purchased
    const paths = await KnowledgeGraphEngine.findMultiHopPath(custId, RELATION_TYPES.COMPATIBLE_WITH, 'org_test_kg');
    assert.ok(paths.length >= 1);
    assert.strictEqual(paths[0].start_node, 'Nguyễn Văn Nam (Doanh nghiệp A)');
    assert.strictEqual(paths[0].hop1_relation, 'HAS_PURCHASED');
    assert.strictEqual(paths[0].intermediate_node, 'Máy in Brother HL-L6210DW Enterprise');
    assert.strictEqual(paths[0].destination_name, 'Cụm trống từ Brother DR-3608 (45.000 trang)');
  });

  // ---------------------------------------------------------------------------
  // 3. AUTO-SYNC & COMPATIBILITY LOOKUP
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. AUTO-SYNC CATALOG & COMPATIBILITY LOOKUP ---');

  await itAsync('Đồng bộ tự động sản phẩm và linh kiện vào Đồ thị Tri thức', async () => {
    const syncRes = await KnowledgeGraphEngine.syncCatalogToGraph('org_default');
    assert.strictEqual(syncRes.success, true);

    const compatItems = await KnowledgeGraphEngine.findCompatibleItems('Brother HL-L6210DW', 'org_default');
    assert.ok(compatItems.length >= 1);
    assert.ok(compatItems.some(i => i.compatibleItem.includes('TN-3608') || i.compatibleItem.includes('Hộp mực')));
  });

  await itAsync('Tạo ngữ cảnh Đồ thị Tri thức (Augmented Graph Context) cho Prompt', async () => {
    const contextStr = await KnowledgeGraphEngine.getAugmentedContext('Hộp mực Brother TN-3608', 'org_test_kg');
    assert.ok(typeof contextStr === 'string');
  });

  // ---------------------------------------------------------------------------
  // 4. HYBRID DENSE VECTOR RAG
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. HYBRID DENSE VECTOR RAG & EMBEDDINGS ---');

  it('Tính toán Vector đặc trưng ngữ nghĩa 128 chiều chuẩn hóa L2', () => {
    const vec1 = RagService.computeSemanticEmbedding('Quy trình bảo mật in ấn văn phòng', 128);
    assert.strictEqual(vec1.length, 128);

    // Verify L2 Unit Normalization (Sum of squares ~ 1.0)
    const norm = Math.sqrt(vec1.reduce((sum, v) => sum + v * v, 0));
    assert.ok(Math.abs(norm - 1.0) < 0.05);

    // Verify Cosine Similarity
    const vec2 = RagService.computeSemanticEmbedding('Quy trình bảo mật in ấn văn phòng', 128);
    const simSame = RagService.cosineSimilarity(vec1, vec2);
    assert.ok(simSame > 0.98); // Identical text has cosine similarity ~ 1.0

    const vecDifferent = RagService.computeSemanticEmbedding('Cách nấu cháo cá lóc rau đắng miền Tây', 128);
    const simDiff = RagService.cosineSimilarity(vec1, vecDifferent);
    assert.ok(simDiff < simSame); // Different topic has significantly lower similarity
  });

  await itAsync('Nạp tài liệu tự động tính toán và lưu cache Vector Embeddings', async () => {
    const docRes = await RagService.ingestDocument({
      title: 'Quy Chế An Toàn Thiết Bị Văn Phòng 2027',
      content: 'Mọi thiết bị máy in và máy tính xách tay phải tuân thủ tiêu chuẩn tiết kiệm năng lượng Energy Star và kích hoạt mã PIN bảo mật khi in ấn.',
      orgId: 'org_test_kg',
      scope: 'private'
    });
    assert.ok(docRes.documentId);
    assert.ok(docRes.totalChunks >= 1);

    // Verify embeddings in SQLite table
    const embRow = await db.get('SELECT COUNT(*) as count FROM ai_vector_embeddings WHERE dimensions = 128');
    assert.ok(embRow.count >= 1);
  });

  await itAsync('Truy vấn Hybrid RAG kết hợp Lexical + Dense Vector + Tenant Isolation', async () => {
    // Search with exact keyword
    const results = await RagService.searchKnowledge({
      query: 'tiêu chuẩn tiết kiệm năng lượng Energy Star máy in',
      orgId: 'org_test_kg',
      scope: 'private'
    });
    assert.ok(results.length >= 1);
    assert.strictEqual(results[0].matchType, 'HYBRID_DENSE_RAG');
    assert.ok(results[0].score >= 1.5);
    assert.ok(results[0].citationLabel.includes('Quy Chế An Toàn Thiết Bị'));

    // Tenant Isolation check: Other org cannot see private document
    const resultsOther = await RagService.searchKnowledge({
      query: 'tiêu chuẩn tiết kiệm năng lượng Energy Star máy in',
      orgId: 'org_other_tenant',
      scope: 'private'
    });
    assert.strictEqual(resultsOther.length, 0);
  });

  // ---------------------------------------------------------------------------
  // 5. CENTRAL BRAIN INTEGRATION WITH KNOWLEDGE GRAPH
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. CENTRAL BRAIN INTEGRATION & COMPATIBILITY CHAT ---');

  await itAsync('CentralBrain: Trả lời tự động về linh kiện tương thích từ Đồ thị Tri thức', async () => {
    const convId = `test_kg_chat_${Date.now()}`;
    const res = await CentralBrainService.processChat({
      conversationId: convId,
      message: 'Máy in Brother HL-L6210DW dùng hộp mực nào thế em?'
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.stage, 'KNOWLEDGE_GRAPH_COMPATIBILITY_RESOLVED');
    assert.strictEqual(res.revealCatalog, true);
    assert.ok(res.reply.includes('TN-3608') || res.reply.includes('Hộp mực'));
    assert.ok(res.toolsUsed.includes('knowledge_graph_engine'));
  });

  await itAsync('CentralBrain: Bảo toàn 100% luồng bán hàng ThinkPad chuẩn (Zero Disruption)', async () => {
    const convId = `test_kg_sales_${Date.now()}`;
    const res = await CentralBrainService.processChat({
      conversationId: convId,
      message: 'Báo giá cho tôi máy in Brother HL-L6210DW số lượng 2 cái'
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.revealCatalog, true);
    assert.ok(res.reply.includes('HL-L6210DW') || res.reply.includes('báo giá'));
  });

  await itAsync('CentralBrain: Bảo toàn 100% luồng tư vấn thi công (Zero Disruption)', async () => {
    const convId = `test_kg_svc_${Date.now()}`;
    const res = await CentralBrainService.processChat({
      conversationId: convId,
      message: 'Shop có thi công lắp đặt không?'
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.revealCatalog, false);
    assert.ok(res.reply.includes('tiếp nhận nhu cầu thi công') || res.reply.includes('khảo sát'));
  });

  console.log('\n================================================================');
  console.log(`🏁 KẾT QUẢ KIỂM THỬ STAGE 3 KNOWLEDGE GRAPH & HYBRID RAG:`);
  console.log(`- ĐẠT (PASSED):     ${passed}`);
  console.log(`- THẤT BẠI (FAILED): ${failed}`);
  console.log(`- TỶ LỆ CHÍNH XÁC:   ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStage3Tests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
