/**
 * TRÍ AI ULTIMATE ROBOT – KNOWLEDGE GRAPH ENGINE (BỘ MÁY ĐỒ THỊ TRI THỨC NGỮ NGHĨA)
 * DOCTOR-LEVEL ALL-DOMAIN ONTOLOGY – STAGE 3
 * 
 * Capabilities:
 * 1. Ontology Entities: Node thực thể (Product, Customer, Brand, Category, Component, Service, Policy).
 * 2. Directed Semantic Relations: Cạnh quan hệ ngữ nghĩa có trọng số (COMPATIBLE_WITH, HAS_PURCHASED, REQUIRES_SERVICE, SUPERSEDES, BELONGS_TO).
 * 3. Multi-Hop Graph Traversal: Truy vấn đồ thị bắc cầu 1-hop, 2-hop phát hiện liên kết ẩn.
 * 4. Catalog & Customer Sync: Tự động trích xuất và đồng bộ thực thể từ bảng products, leads.
 * 5. Graph-Augmented Context: Sinh bản đồ tri thức cục bộ bổ trợ cho CentralBrain & RAG.
 */

import { randomUUID } from 'crypto';
import db from '../../db.js';

export const ENTITY_TYPES = {
  PRODUCT: 'PRODUCT',
  CUSTOMER: 'CUSTOMER',
  BRAND: 'BRAND',
  CATEGORY: 'CATEGORY',
  COMPONENT: 'COMPONENT',
  SERVICE: 'SERVICE',
  POLICY: 'POLICY',
  ORGANIZATION: 'ORGANIZATION'
};

export const RELATION_TYPES = {
  HAS_PURCHASED: 'HAS_PURCHASED',         // Khách hàng đã mua sản phẩm
  COMPATIBLE_WITH: 'COMPATIBLE_WITH',     // Thiết bị tương thích với linh kiện/vật tư
  REQUIRES_SERVICE: 'REQUIRES_SERVICE',   // Thiết bị cần dịch vụ bảo trì/lắp đặt
  SUPERSEDES: 'SUPERSEDES',               // Thế hệ mới thay thế thế hệ cũ
  BELONGS_TO: 'BELONGS_TO',               // Thuộc danh mục hoặc thương hiệu
  REGULATED_BY: 'REGULATED_BY',           // Bị chi phối bởi quy chế/chính sách
  ASSOCIATED_WITH: 'ASSOCIATED_WITH'      // Quan hệ liên kết khái niệm
};

export class KnowledgeGraphEngine {
  /**
   * 1. Upsert Entity Node into Knowledge Graph
   */
  static async upsertEntity(params = {}) {
    const {
      name,
      entityType = ENTITY_TYPES.PRODUCT,
      canonicalId = null,
      properties = {},
      orgId = 'org_default'
    } = params;

    if (!name || typeof name !== 'string') return null;

    const trimmedName = name.trim();
    const now = new Date().toISOString();
    const propsJson = typeof properties === 'string' ? properties : JSON.stringify(properties);

    try {
      // Check if entity already exists by name or canonicalId
      let existing = null;
      if (canonicalId) {
        existing = await db.get(
          'SELECT id FROM ai_knowledge_entities WHERE canonical_id = ? AND org_id = ?',
          [canonicalId, orgId]
        );
      }
      if (!existing) {
        existing = await db.get(
          'SELECT id FROM ai_knowledge_entities WHERE LOWER(name) = LOWER(?) AND org_id = ?',
          [trimmedName, orgId]
        );
      }

      if (existing) {
        await db.run(`
          UPDATE ai_knowledge_entities
          SET name = ?, entity_type = ?, canonical_id = COALESCE(?, canonical_id),
              properties_json = ?, updated_at = ?
          WHERE id = ?
        `, [trimmedName, entityType, canonicalId, propsJson, now, existing.id]);
        return existing.id;
      }

      const newId = `ent_${randomUUID().slice(0, 10)}`;
      await db.run(`
        INSERT INTO ai_knowledge_entities (
          id, name, entity_type, canonical_id, properties_json, org_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [newId, trimmedName, entityType, canonicalId, propsJson, orgId, now, now]);

      return newId;
    } catch (err) {
      console.warn('[KNOWLEDGE GRAPH] Error upserting entity:', err.message);
      return null;
    }
  }

  /**
   * 2. Add Directed Semantic Relation between two Entities
   */
  static async addRelation(params = {}) {
    const {
      sourceEntityId,
      targetEntityId,
      relationType = RELATION_TYPES.ASSOCIATED_WITH,
      weight = 1.0,
      properties = {},
      orgId = 'org_default'
    } = params;

    if (!sourceEntityId || !targetEntityId) return null;

    const now = new Date().toISOString();
    const propsJson = typeof properties === 'string' ? properties : JSON.stringify(properties);

    try {
      const existing = await db.get(`
        SELECT id FROM ai_knowledge_relations
        WHERE source_entity_id = ? AND target_entity_id = ? AND relation_type = ? AND org_id = ?
      `, [sourceEntityId, targetEntityId, relationType, orgId]);

      if (existing) {
        await db.run(`
          UPDATE ai_knowledge_relations
          SET weight = ?, properties_json = ?
          WHERE id = ?
        `, [weight, propsJson, existing.id]);
        return existing.id;
      }

      const relId = `rel_${randomUUID().slice(0, 10)}`;
      await db.run(`
        INSERT INTO ai_knowledge_relations (
          id, source_entity_id, target_entity_id, relation_type, weight, properties_json, org_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [relId, sourceEntityId, targetEntityId, relationType, weight, propsJson, orgId, now]);

      return relId;
    } catch (err) {
      console.warn('[KNOWLEDGE GRAPH] Error adding relation:', err.message);
      return null;
    }
  }

  /**
   * 3. Find 1-Hop Direct Neighbors of an Entity
   */
  static async findDirectRelations(entityId, options = {}) {
    const {
      direction = 'OUT', // 'OUT' | 'IN' | 'BOTH'
      relationType = null,
      orgId = 'org_default'
    } = options;

    if (!entityId) return [];

    try {
      let sql = '';
      const params = [];

      if (direction === 'OUT') {
        sql = `
          SELECT r.id as relation_id, r.relation_type, r.weight, r.properties_json as rel_props,
                 e.id as target_id, e.name as target_name, e.entity_type as target_type, e.properties_json as target_props
          FROM ai_knowledge_relations r
          JOIN ai_knowledge_entities e ON r.target_entity_id = e.id
          WHERE r.source_entity_id = ? AND r.org_id = ?
        `;
        params.push(entityId, orgId);
      } else if (direction === 'IN') {
        sql = `
          SELECT r.id as relation_id, r.relation_type, r.weight, r.properties_json as rel_props,
                 e.id as source_id, e.name as source_name, e.entity_type as source_type, e.properties_json as source_props
          FROM ai_knowledge_relations r
          JOIN ai_knowledge_entities e ON r.source_entity_id = e.id
          WHERE r.target_entity_id = ? AND r.org_id = ?
        `;
        params.push(entityId, orgId);
      } else {
        // BOTH
        sql = `
          SELECT r.id as relation_id, r.relation_type, r.weight, 'OUT' as dir,
                 e.id as neighbor_id, e.name as neighbor_name, e.entity_type as neighbor_type
          FROM ai_knowledge_relations r
          JOIN ai_knowledge_entities e ON r.target_entity_id = e.id
          WHERE r.source_entity_id = ? AND r.org_id = ?
          UNION ALL
          SELECT r.id as relation_id, r.relation_type, r.weight, 'IN' as dir,
                 e.id as neighbor_id, e.name as neighbor_name, e.entity_type as neighbor_type
          FROM ai_knowledge_relations r
          JOIN ai_knowledge_entities e ON r.source_entity_id = e.id
          WHERE r.target_entity_id = ? AND r.org_id = ?
        `;
        params.push(entityId, orgId, entityId, orgId);
      }

      if (relationType) {
        sql += direction === 'BOTH'
          ? ` AND relation_type = ?`
          : ` AND r.relation_type = ?`;
        params.push(relationType);
      }

      const rows = await db.all(sql, params);
      return rows;
    } catch (err) {
      console.warn('[KNOWLEDGE GRAPH] findDirectRelations error:', err.message);
      return [];
    }
  }

  /**
   * 4. Multi-Hop Graph Traversal (Truy vết quan hệ bắc cầu 2-hop)
   * Ví dụ: Customer -> HAS_PURCHASED -> Product -> COMPATIBLE_WITH -> Component
   */
  static async findMultiHopPath(startEntityId, targetRelationType, orgId = 'org_default') {
    if (!startEntityId) return [];

    try {
      const sql = `
        SELECT 
          e1.name as start_node,
          r1.relation_type as hop1_relation,
          e2.name as intermediate_node,
          r2.relation_type as hop2_relation,
          e3.id as destination_id,
          e3.name as destination_name,
          e3.entity_type as destination_type,
          e3.properties_json as destination_props
        FROM ai_knowledge_relations r1
        JOIN ai_knowledge_entities e1 ON r1.source_entity_id = e1.id
        JOIN ai_knowledge_entities e2 ON r1.target_entity_id = e2.id
        JOIN ai_knowledge_relations r2 ON e2.id = r2.source_entity_id
        JOIN ai_knowledge_entities e3 ON r2.target_entity_id = e3.id
        WHERE e1.id = ? AND r2.relation_type = ? AND r1.org_id = ? AND r2.org_id = ?
      `;

      const rows = await db.all(sql, [startEntityId, targetRelationType, orgId, orgId]);
      return rows;
    } catch (err) {
      console.warn('[KNOWLEDGE GRAPH] findMultiHopPath error:', err.message);
      return [];
    }
  }

  /**
   * 5. Find Compatible Supplies / Accessories for a Product
   */
  static async findCompatibleItems(productQuery = '', orgId = 'org_default') {
    if (!productQuery) return [];

    try {
      const q = productQuery.toLowerCase().trim();
      const normQ = q.replace(/[\s\-_]+/g, '');

      // 1. Try exact or substring match
      let prod = await db.get(`
        SELECT id, name FROM ai_knowledge_entities
        WHERE entity_type = 'PRODUCT' AND LOWER(name) LIKE ? AND org_id = ?
        LIMIT 1
      `, [`%${q}%`, orgId]);

      // 2. If not found, search with normalized match or tokens
      if (!prod) {
        const prods = await db.all(`
          SELECT id, name FROM ai_knowledge_entities
          WHERE entity_type = 'PRODUCT' AND org_id = ?
        `, [orgId]);

        prod = prods.find(p => {
          const pNorm = p.name.toLowerCase().replace(/[\s\-_]+/g, '');
          if (pNorm.includes(normQ) || normQ.includes(pNorm)) return true;
          // check model tokens (e.g. l6210, 6210dw, t14)
          const modelTokens = q.split(/[\s\-_]+/).filter(t => /[0-9]/.test(t) && t.length >= 3);
          if (modelTokens.length > 0 && modelTokens.some(mt => pNorm.includes(mt.toLowerCase()))) return true;
          // check if key words match
          const tokens = q.split(/[\s\-_]+/).filter(t => t.length >= 3);
          return tokens.length > 0 && tokens.every(tok => p.name.toLowerCase().includes(tok));
        });
      }

      if (!prod) return [];

      const relations = await this.findDirectRelations(prod.id, {
        direction: 'OUT',
        relationType: RELATION_TYPES.COMPATIBLE_WITH,
        orgId
      });

      return relations.map(r => ({
        productName: prod.name,
        compatibleItem: r.target_name,
        itemType: r.target_type,
        relationType: r.relation_type
      }));
    } catch (err) {
      console.warn('[KNOWLEDGE GRAPH] findCompatibleItems error:', err.message);
      return [];
    }
  }

  /**
   * 6. Auto-Sync Catalog & Customer Purchases into Graph
   */
  static async syncCatalogToGraph(orgId = 'org_default') {
    try {
      const products = await db.all('SELECT id, name, field, group_name, price, sku FROM products WHERE is_active = 1 LIMIT 100');
      for (const p of products) {
        // Upsert Product Entity
        const prodEntId = await this.upsertEntity({
          name: p.name,
          entityType: ENTITY_TYPES.PRODUCT,
          canonicalId: p.id,
          properties: { price: p.price, sku: p.sku, field: p.field },
          orgId
        });

        // Upsert Category Entity & Relation
        if (p.field && prodEntId) {
          const catEntId = await this.upsertEntity({
            name: p.field,
            entityType: ENTITY_TYPES.CATEGORY,
            orgId
          });
          if (catEntId) {
            await this.addRelation({
              sourceEntityId: prodEntId,
              targetEntityId: catEntId,
              relationType: RELATION_TYPES.BELONGS_TO,
              orgId
            });
          }
        }

        // Auto-seed typical hardware compatibility edges
        const normName = p.name.toLowerCase().replace(/[\s\-_]+/g, '');
        if (normName.includes('brother') && (normName.includes('l6210') || normName.includes('6210'))) {
          const tonerId = await this.upsertEntity({
            name: 'Hộp mực Brother TN-3608 (In được 3.000 trang)',
            entityType: ENTITY_TYPES.COMPONENT,
            canonicalId: 'comp_tn3608',
            properties: { type: 'Toner Cartridge', standardYield: 3000 },
            orgId
          });
          const drumId = await this.upsertEntity({
            name: 'Cụm trống từ Brother DR-3608 (Độ bền 45.000 trang)',
            entityType: ENTITY_TYPES.COMPONENT,
            canonicalId: 'comp_dr3608',
            properties: { type: 'Drum Unit', standardYield: 45000 },
            orgId
          });
          if (tonerId) await this.addRelation({ sourceEntityId: prodEntId, targetEntityId: tonerId, relationType: RELATION_TYPES.COMPATIBLE_WITH, orgId });
          if (drumId) await this.addRelation({ sourceEntityId: prodEntId, targetEntityId: drumId, relationType: RELATION_TYPES.COMPATIBLE_WITH, orgId });
        }

        if (normName.includes('thinkpad') && normName.includes('t14')) {
          const chargerId = await this.upsertEntity({
            name: 'Bộ sạc Lenovo 65W USB-C GaN Chính hãng',
            entityType: ENTITY_TYPES.COMPONENT,
            canonicalId: 'comp_lenovo_65w',
            properties: { type: 'Power Adapter', outputWattage: 65 },
            orgId
          });
          const dockId = await this.upsertEntity({
            name: 'Lenovo ThinkPad Universal Thunderbolt 4 Dock',
            entityType: ENTITY_TYPES.COMPONENT,
            canonicalId: 'comp_thinkpad_dock',
            properties: { type: 'Docking Station', ports: 'Thunderbolt 4, HDMI 2.1, DisplayPort' },
            orgId
          });
          if (chargerId) await this.addRelation({ sourceEntityId: prodEntId, targetEntityId: chargerId, relationType: RELATION_TYPES.COMPATIBLE_WITH, orgId });
          if (dockId) await this.addRelation({ sourceEntityId: prodEntId, targetEntityId: dockId, relationType: RELATION_TYPES.COMPATIBLE_WITH, orgId });
        }
      }

      // Sync Leads to Customer Purchase Relations
      const leads = await db.all("SELECT id, customer_name, phone, product_id, product_name FROM leads WHERE lead_status IN ('Đã hoàn thành', 'Khách đồng ý', 'Đã mua') LIMIT 50");
      for (const l of leads) {
        if (l.customer_name && l.product_name) {
          const custEntId = await this.upsertEntity({
            name: l.customer_name,
            entityType: ENTITY_TYPES.CUSTOMER,
            properties: { phone: l.phone },
            orgId
          });
          const prodEntId = await this.upsertEntity({
            name: l.product_name,
            entityType: ENTITY_TYPES.PRODUCT,
            canonicalId: l.product_id,
            orgId
          });
          if (custEntId && prodEntId) {
            await this.addRelation({
              sourceEntityId: custEntId,
              targetEntityId: prodEntId,
              relationType: RELATION_TYPES.HAS_PURCHASED,
              orgId
            });
          }
        }
      }

      return { success: true, message: 'Knowledge Graph synchronized with Catalog and CRM' };
    } catch (err) {
      console.warn('[KNOWLEDGE GRAPH] syncCatalogToGraph warning:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * 7. Graph-Augmented Context Generation for Prompts
   */
  static async getAugmentedContext(text = '', orgId = 'org_default') {
    const raw = (text || '').toLowerCase().trim();
    if (!raw || raw.length < 4) return '';

    try {
      // Find entities mentioned in text
      const entities = await db.all(`
        SELECT id, name, entity_type, properties_json FROM ai_knowledge_entities
        WHERE org_id = ?
      `, [orgId]);

      const matched = entities.filter(e => raw.includes(e.name.toLowerCase()));
      if (matched.length === 0) return '';

      const lines = [];
      for (const m of matched.slice(0, 3)) {
        lines.push(`- **Thực thể:** ${m.name} (${m.entity_type})`);
        const rels = await this.findDirectRelations(m.id, { direction: 'OUT', orgId });
        rels.forEach(r => {
          lines.push(`  + [${r.relation_type}] -> ${r.target_name} (${r.target_type})`);
        });
      }

      return lines.length > 0 ? `\n[Mạng lưới Đồ thị Tri thức (Knowledge Graph)]:\n${lines.join('\n')}\n` : '';
    } catch (err) {
      return '';
    }
  }
}

export default KnowledgeGraphEngine;
