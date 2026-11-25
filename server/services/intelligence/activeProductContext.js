/**
 * ACTIVE PRODUCT CONTEXT ENGINE (BOTCHAT BRAIN 2.1)
 * 
 * Manages active product context across multi-turn conversations:
 * - Tracks:
 *   - conversation_id
 *   - customer_id
 *   - active_product_id
 *   - active_product_name
 *   - active_product_configuration
 *   - active_product_price
 *   - last_product_mentioned_at
 *   - context_source ('catalog' | 'conversation' | 'card' | 'crawler')
 * - Tracks ordered recent_products list for multi-product dialogues and ordinal selection ("sản phẩm thứ hai")
 * - Handles topic switching (Product A -> Product B)
 * - Synchronizes with HumanMemoryEngine (WORKING memory) and ContextEngine (session)
 * - Enforces pre-quotation validation:
 *   * Exists active product (clarifies if missing, never guesses or defaults to generic PC)
 *   * Price verified/valid (refuses random hallucination if price is 0/null/unverified)
 *   * Quantity verified (defaults to 1)
 */

import { db } from '../../db.js';
import { HumanMemoryEngine } from './humanMemoryEngine.js';
import { ContextEngine } from './contextEngine.js';
import { CrmLeadService } from '../crmLeadService.js';

// In-Memory store for active product contexts (TTL: 2 hours)
const activeContextStore = new Map();
const CONTEXT_TTL_MS = 2 * 60 * 60 * 1000;

export class ActiveProductContext {
  /**
   * Normalize and save an active product into conversation context
   */
  static setActiveProduct(conversationId, productData = {}, options = {}) {
    if (!conversationId) return null;

    const now = Date.now();
    const existing = this.getContext(conversationId) || {
      conversation_id: conversationId,
      customer_id: options.customerId || 'guest',
      active_product_id: null,
      active_product_name: null,
      active_product_configuration: null,
      active_product_price: 0,
      price_type: 'REFERENCE_ONLY',
      sku: '',
      unit: 'cái',
      quantity: 1,
      last_product_mentioned_at: new Date().toISOString(),
      context_source: 'conversation',
      recent_products: [],
      product_statuses: {},
      pagination: null,
      updatedAt: now
    };

    const cleanName = (productData.name || productData.active_product_name || productData.product_name || '').trim();
    if (!cleanName) return existing;

    const unitPrice = parseFloat(productData.price || productData.active_product_price || productData.unitPrice || productData.salePrice || 0);
    const config = productData.configuration || productData.active_product_configuration || productData.specs_snippet || productData.specs || null;
    const configStr = typeof config === 'object' && config !== null ? JSON.stringify(config) : (config ? String(config).trim() : null);

    const priceType = productData.priceType || productData.price_type || (unitPrice > 0 ? (productData.id ? 'SUPPLIER_VERIFIED' : 'REFERENCE_ONLY') : 'UNVERIFIED');
    const source = productData.contextSource || productData.context_source || productData.source || 'conversation';
    const prodId = productData.id || productData.active_product_id || productData.productId || null;
    const sku = productData.sku || '';
    const unit = productData.unit || 'cái';
    const quantity = Math.max(1, parseInt(productData.quantity) || 1);

    const newProductEntry = {
      id: prodId,
      name: cleanName,
      configuration: configStr,
      price: unitPrice,
      price_type: priceType,
      sku,
      unit,
      quantity,
      context_source: source,
      mentioned_at: new Date().toISOString()
    };

    // Update recent_products list (maintain order, deduplicate same model/name)
    const recent = Array.isArray(existing.recent_products) ? [...existing.recent_products] : [];
    const existingIdx = recent.findIndex(p => {
      if (p.name.toLowerCase() === cleanName.toLowerCase()) return true;
      const cleanNorm = CrmLeadService.stripDiacritics(cleanName.toLowerCase());
      const pNorm = CrmLeadService.stripDiacritics(p.name.toLowerCase());
      if (cleanNorm === pNorm) return true;
      const models1 = CrmLeadService.extractModelCodes(cleanName);
      const models2 = CrmLeadService.extractModelCodes(p.name);
      if (models1.length > 0 && models2.length > 0) {
        return models1.some(m => models2.includes(m));
      }
      return false;
    });

    let mergedPrice = unitPrice;
    let mergedConfig = configStr;
    let mergedPriceType = priceType;
    let mergedId = prodId;

    if (existingIdx >= 0) {
      const old = recent[existingIdx];
      // Preserve verified price and specs if incoming update lacks them
      if (mergedPrice <= 0 && old.price > 0) {
        mergedPrice = old.price;
        mergedPriceType = old.price_type;
      }
      if (!mergedConfig && old.configuration) {
        mergedConfig = old.configuration;
      }
      if (!mergedId && old.id) {
        mergedId = old.id;
      }
      recent.splice(existingIdx, 1);
    }

    newProductEntry.id = mergedId;
    newProductEntry.price = mergedPrice;
    newProductEntry.configuration = mergedConfig;
    newProductEntry.price_type = mergedPriceType;

    recent.push(newProductEntry);

    // Keep at most 10 recent products
    if (recent.length > 10) {
      recent.shift();
    }

    const updatedContext = {
      conversation_id: conversationId,
      customer_id: options.customerId || existing.customer_id || 'guest',
      active_product_id: mergedId,
      active_product_name: cleanName,
      active_product_configuration: mergedConfig,
      active_product_price: mergedPrice,
      price_type: mergedPriceType,
      sku,
      unit,
      quantity,
      last_product_mentioned_at: new Date().toISOString(),
      context_source: source,
      recent_products: recent,
      product_statuses: existing.product_statuses || {},
      pagination: existing.pagination || null,
      updatedAt: now
    };

    activeContextStore.set(conversationId, updatedContext);

    // Synchronize with HumanMemoryEngine (WORKING Memory)
    try {
      HumanMemoryEngine.setWorkingMemory(conversationId, {
        activeProduct: updatedContext,
        lastDiscussedProduct: cleanName,
        recentProducts: recent
      });
    } catch (err) {
      console.warn('[ACTIVE PRODUCT CONTEXT] Failed to sync working memory:', err.message);
    }

    // Synchronize with ContextEngine session
    try {
      ContextEngine.updateSessionContext(conversationId, {
        lastProduct: updatedContext
      });
    } catch (err) {
      console.warn('[ACTIVE PRODUCT CONTEXT] Failed to sync session context:', err.message);
    }

    return updatedContext;
  }

  /**
   * Get active context for a conversation
   */
  static getContext(conversationId) {
    if (!conversationId) return null;

    const now = Date.now();
    const existing = activeContextStore.get(conversationId);

    if (existing && (now - existing.updatedAt < CONTEXT_TTL_MS)) {
      return existing;
    }

    // Try fallback from HumanMemoryEngine working memory
    try {
      const wm = HumanMemoryEngine.getWorkingMemory(conversationId);
      if (wm?.activeProduct) {
        activeContextStore.set(conversationId, {
          ...wm.activeProduct,
          updatedAt: now
        });
        return wm.activeProduct;
      }
    } catch (e) {}

    return null;
  }

  /**
   * Clear context for conversation
   */
  static clearContext(conversationId) {
    if (!conversationId) return;
    activeContextStore.delete(conversationId);
    try {
      HumanMemoryEngine.clearWorkingMemory(conversationId);
    } catch (e) {}
  }

  /**
   * Select a product by 1-based ordinal index (e.g. "sản phẩm thứ hai" -> ordinal 2)
   */
  static selectOrdinalProduct(conversationId, ordinalIndex = 1) {
    const context = this.getContext(conversationId);
    if (!context || !Array.isArray(context.recent_products) || context.recent_products.length === 0) {
      return null;
    }

    const idx = parseInt(ordinalIndex, 10) - 1;
    if (idx < 0 || idx >= context.recent_products.length) {
      return null;
    }

    const selected = context.recent_products[idx];
    if (selected) {
      // Set this selected item as current active product
      return this.setActiveProduct(conversationId, {
        id: selected.id,
        name: selected.name,
        configuration: selected.configuration,
        price: selected.price,
        priceType: selected.price_type,
        sku: selected.sku,
        unit: selected.unit,
        quantity: selected.quantity,
        contextSource: selected.context_source
      });
    }

    return null;
  }

  /**
   * Parse numerical price from Vietnamese text
   */
  static extractPrice(text = '') {
    if (!text || typeof text !== 'string') return null;

    // Pattern 1: Standard currency 45.100.000 / 45,100,000 / 45.100.000đ / 45.100.000 đồng
    const fullMatch = text.match(/\b([0-9]{1,3}(?:[.,][0-9]{3}){1,3})\s*(?:đồng|đ|vnd)?\b/i);
    if (fullMatch) {
      const num = parseInt(fullMatch[1].replace(/[.,]/g, ''), 10);
      if (num > 0) return num;
    }

    // Pattern 2: Decimal millions (45.1 triệu, 45,1 triệu, 45.1tr, 20 triệu, 20tr)
    const milMatch = text.match(/\b([0-9]+(?:[.,][0-9]+)?)\s*(?:triệu|trieu|tr)\b/i);
    if (milMatch) {
      const num = parseFloat(milMatch[1].replace(',', '.'));
      if (num > 0) return Math.round(num * 1000000);
    }

    // Pattern 3: Thousands (500k, 500.000)
    const kMatch = text.match(/\b([0-9]+)\s*k\b/i);
    if (kMatch) {
      const num = parseInt(kMatch[1], 10);
      if (num > 0) return num * 1000;
    }

    return null;
  }

  /**
   * Extract configuration specs (CPU, RAM, SSD, Display) from text
   */
  static extractSpecs(text = '') {
    if (!text || typeof text !== 'string') return null;

    const parts = [];

    // CPU
    const cpuMatch = text.match(/\b(Core\s+Ultra\s+\d+\s+[A-Z0-9]+|Core\s+i[3579][-\s]?[0-9A-Z]*|Ryzen\s+\d+\s+[A-Z0-9]*|Snapdragon\s+X\s+(?:Elite|Plus)|M[1234](?:\s+Pro|\s+Max)?|U[357][-\s]?[0-9A-Z]+)\b/i);
    if (cpuMatch) parts.push(cpuMatch[1].trim());

    // RAM
    let ram = null;
    const ramPre = text.match(/(?:RAM|bộ\s*nhớ)[:\s]+([0-9]{1,3}\s*(?:GB|GD5|GD6))\b/i);
    if (ramPre) {
      ram = ramPre[1];
    } else {
      const ramPost = text.match(/\b([0-9]{1,3}\s*(?:GB|GD5|GD6))\s*(?:RAM|bộ\s*nhớ)?\b/i);
      if (ramPost) ram = ramPost[1];
    }
    if (ram && !parts.some(p => p.includes(ram))) parts.push(`RAM ${ram.trim()}`);

    // Storage / SSD
    let ssd = null;
    const ssdPre = text.match(/(?:SSD|HDD|NVMe|ổ\s*cứng)[:\s]+([0-9]{1,4}\s*(?:GB|TB))\b/i);
    if (ssdPre) {
      ssd = ssdPre[1];
    } else {
      const ssdPost = text.match(/\b([0-9]{1,4}\s*(?:GB|TB))\s+(?:SSD|HDD|NVMe|ổ\s*cứng)\b/i);
      if (ssdPost) ssd = ssdPost[1];
    }
    if (ssd && !parts.some(p => p.includes(ssd))) parts.push(`SSD ${ssd.trim()}`);

    return parts.length > 0 ? parts.join(', ') : null;
  }

  /**
   * Extract product info from raw message or assistant text
   */
  static extractProductFromText(text = '', catalogProducts = []) {
    if (!text || typeof text !== 'string' || text.trim().length < 4) return null;

    // Check catalog products first
    for (const cp of catalogProducts) {
      const cpNameNorm = cp.name.toLowerCase();
      const cpClean = CrmLeadService.stripDiacritics(cpNameNorm);
      const textNorm = text.toLowerCase();
      const textClean = CrmLeadService.stripDiacritics(textNorm);

      if (textNorm.includes(cpNameNorm) || (cp.name.length > 8 && textClean.includes(cpClean))) {
        return {
          id: cp.id,
          name: cp.name,
          brand: cp.group_name || CrmLeadService.extractBrand(cp.name) || 'Chính hãng',
          model: cp.sku || CrmLeadService.extractModelCodes(cp.name)[0] || null,
          configuration: cp.specs_json ? (typeof cp.specs_json === 'string' ? cp.specs_json : JSON.stringify(cp.specs_json)) : null,
          price: cp.price || cp.sale_price || 0,
          priceType: 'SUPPLIER_VERIFIED',
          sku: cp.sku || '',
          unit: cp.unit || 'cái',
          contextSource: 'catalog'
        };
      }
    }

    // Known explicit product names pattern
    const KNOWN_MODELS_REGEX = /(Lenovo\s+ThinkPad\s+T14(?:\s+Gen\s+\d+)?|Lenovo\s+ThinkPad\s+E14(?:\s+Gen\s+\d+)?|Lenovo\s+ThinkPad\s+L14(?:\s+Gen\s+\d+)?|Surface\s+Pro(?:\s+\d+)?|Surface\s+Laptop(?:\s+\d+)?|Dell\s+XPS\s+\d+|MacBook\s+Air(?:\s+M\d+)?|MacBook\s+Pro(?:\s+M\d+)?|ThinkCentre\s+neo\s+50s(?:\s+Gen\s+\d+)?|Brother\s+HL[-_\s]L6210DW|Brother\s+ADS[-_\s]4300N|Canon\s+LBP\s+2900|Canon\s+MF244dw)/i;
    const modelMatch = text.match(KNOWN_MODELS_REGEX);

    if (modelMatch) {
      const name = modelMatch[0].trim();
      const brand = CrmLeadService.extractBrand(name) || (name.toLowerCase().includes('surface') ? 'Microsoft' : null);
      const price = this.extractPrice(text);
      const specs = this.extractSpecs(text);

      return {
        id: null,
        name,
        brand,
        model: CrmLeadService.extractModelCodes(name)[0] || null,
        configuration: specs,
        price: price || 0,
        priceType: price ? 'REFERENCE_ONLY' : 'UNVERIFIED',
        sku: '',
        unit: 'cái',
        contextSource: 'conversation'
      };
    }

    // Fallback: Check if message has brand + category or model code
    const brand = CrmLeadService.extractBrand(text);
    const category = CrmLeadService.extractCategory(text);
    const models = CrmLeadService.extractModelCodes(text);

    if (brand && (models.length > 0 || category)) {
      const name = [category, brand, models[0]].filter(Boolean).join(' ');
      const price = this.extractPrice(text);
      const specs = this.extractSpecs(text);

      return {
        id: null,
        name,
        brand,
        model: models[0] || null,
        configuration: specs,
        price: price || 0,
        priceType: price ? 'REFERENCE_ONLY' : 'UNVERIFIED',
        sku: '',
        unit: 'cái',
        contextSource: 'conversation'
      };
    }

    return null;
  }

  /**
   * Scan conversation messages in database to reconstruct product history
   */
  static async resolveFromHistory(conversationId, database = null) {
    const dbInstance = database || db;
    if (!dbInstance || !conversationId) return null;

    try {
      const rows = await dbInstance.all(
        'SELECT sender_type, content, metadata_json, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
        [conversationId]
      );

      if (!rows || rows.length === 0) return null;

      // Query active catalog for matching
      const catalog = await dbInstance.all('SELECT id, name, sku, price, group_name FROM products WHERE is_active = 1');

      for (const r of rows) {
        if (!r.content) continue;
        const meta = r.metadata_json ? (typeof r.metadata_json === 'string' ? JSON.parse(r.metadata_json) : r.metadata_json) : {};

        // 1. If metadata has recommendedProduct
        if (meta?.recommendedProduct) {
          const rp = meta.recommendedProduct;
          this.setActiveProduct(conversationId, {
            id: rp.id,
            name: rp.name,
            price: rp.price || rp.salePrice,
            configuration: rp.specs || rp.configuration,
            sku: rp.sku,
            unit: rp.unit,
            contextSource: 'card'
          });
          continue;
        }

        // 2. Scan text
        const detected = this.extractProductFromText(r.content, catalog);
        if (detected) {
          this.setActiveProduct(conversationId, detected);
        }
      }

      return this.getContext(conversationId);
    } catch (err) {
      console.warn('[ACTIVE PRODUCT CONTEXT] Failed to resolve from history:', err.message);
      return null;
    }
  }

  /**
   * Validate and resolve product for quotation generation
   * Enforces strict rules:
   * 1. No product found -> NEED_CLARIFICATION (never guess or default to generic PC)
   * 2. Ordinal selection -> resolves exact index from recent_products
   * 3. Price validation -> if <= 0 or unverified -> PRICE_UNVERIFIED (never guess random price)
   * 4. Quantity validation -> defaults to 1
   */
  static async resolveForQuotation({
    conversationId,
    requestedQuantity = 1,
    ordinal = null,
    explicitProductName = null,
    selectedProduct = null,
    database = null
  }) {
    const dbInstance = database || db;

    // 1. If ordinal is explicitly specified (e.g. "sản phẩm thứ hai" -> ordinal 2)
    if (ordinal && parseInt(ordinal, 10) > 0) {
      const ordinalProd = this.selectOrdinalProduct(conversationId, ordinal);
      if (ordinalProd) {
        return this._validateProductForQuotation(ordinalProd, requestedQuantity);
      }
    }

    // 2. If explicit product passed from UI (selectedProduct)
    if (selectedProduct && (selectedProduct.name || selectedProduct.active_product_name)) {
      const updated = this.setActiveProduct(conversationId, {
        id: selectedProduct.id,
        name: selectedProduct.name || selectedProduct.active_product_name,
        price: selectedProduct.price || selectedProduct.salePrice || selectedProduct.active_product_price,
        configuration: selectedProduct.configuration || selectedProduct.specs || selectedProduct.specs_snippet,
        sku: selectedProduct.sku,
        unit: selectedProduct.unit,
        contextSource: 'card'
      });
      return this._validateProductForQuotation(updated, requestedQuantity);
    }

    // 3. Check existing in-memory ActiveProductContext first
    let active = this.getContext(conversationId);
    if (!active || !active.active_product_name) {
      active = await this.resolveFromHistory(conversationId, dbInstance);
    }

    // If active exists but price is <= 0, try enriching from catalog/crawler
    if (active && active.active_product_name && (!active.active_product_price || active.active_product_price <= 0) && dbInstance) {
      const flexPat = '%' + active.active_product_name.replace(/[\s\-_]+/g, '%') + '%';
      let cMatch = await dbInstance.get(
        'SELECT * FROM products WHERE is_active = 1 AND is_approved = 1 AND (name LIKE ? OR sku LIKE ?)',
        [flexPat, flexPat]
      );
      if (!cMatch) {
        const mCodes = CrmLeadService.extractModelCodes(active.active_product_name);
        if (mCodes.length > 0) {
          cMatch = await dbInstance.get(
            'SELECT * FROM products WHERE is_active = 1 AND is_approved = 1 AND (name LIKE ? OR sku LIKE ?)',
            [`%${mCodes[0]}%`, `%${mCodes[0]}%`]
          );
        }
      }
      if (cMatch) {
        active = this.setActiveProduct(conversationId, {
          id: cMatch.id,
          name: cMatch.name,
          price: cMatch.price,
          configuration: cMatch.specs_json,
          sku: cMatch.sku,
          unit: cMatch.unit,
          contextSource: 'catalog'
        });
      }
    }

    // 4. If explicitProductName provided (and not a generic stop-word)
    const cleanExplicit = (explicitProductName || '')
      .replace(/(cho tôi|cho em|cho anh|cho chị|cho mình|báo giá|bảng báo giá|giá|xin|lập|chi tiết|giúp|nhé|nha|với|máy|sản phẩm|số lượng|so luong|sl|\b\d+\b|cái|chiếc|bộ)/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleanExplicit.length > 3 && !['may', 'san pham', 'chiec', 'cai'].includes(CrmLeadService.stripDiacritics(cleanExplicit).toLowerCase())) {
      // If explicitProductName matches active product and active has a verified price, use active directly!
      if (active && active.active_product_name && active.active_product_price > 0) {
        const explicitNorm = CrmLeadService.stripDiacritics(cleanExplicit.toLowerCase());
        const activeNorm = CrmLeadService.stripDiacritics(active.active_product_name.toLowerCase());
        const expModels = CrmLeadService.extractModelCodes(cleanExplicit);
        const actModels = CrmLeadService.extractModelCodes(active.active_product_name);
        const modelMatches = expModels.length > 0 && actModels.length > 0 && expModels.some(m => actModels.includes(m));

        if (explicitNorm === activeNorm || activeNorm.includes(explicitNorm) || explicitNorm.includes(activeNorm) || modelMatches) {
          return this._validateProductForQuotation(active, requestedQuantity);
        }
      }

      // Check catalog with flexible pattern
      if (dbInstance) {
        const flexiblePattern = '%' + cleanExplicit.replace(/[\s\-_]+/g, '%') + '%';
        let catMatch = await dbInstance.get(
          'SELECT * FROM products WHERE is_active = 1 AND is_approved = 1 AND (name LIKE ? OR sku LIKE ?)',
          [flexiblePattern, flexiblePattern]
        );
        if (!catMatch) {
          const models = CrmLeadService.extractModelCodes(cleanExplicit);
          if (models.length > 0) {
            const mPat = '%' + models[0].replace(/[\s\-_]+/g, '%') + '%';
            catMatch = await dbInstance.get(
              'SELECT * FROM products WHERE is_active = 1 AND is_approved = 1 AND (name LIKE ? OR sku LIKE ?)',
              [mPat, mPat]
            );
          }
        }
        if (catMatch) {
          const updated = this.setActiveProduct(conversationId, {
            id: catMatch.id,
            name: catMatch.name,
            price: catMatch.price,
            configuration: catMatch.specs_json,
            sku: catMatch.sku,
            unit: catMatch.unit,
            contextSource: 'catalog'
          });
          return this._validateProductForQuotation(updated, requestedQuantity);
        }
      }

      // Check crawled catalog with flexible pattern
      if (dbInstance) {
        const flexiblePattern = '%' + cleanExplicit.replace(/[\s\-_]+/g, '%') + '%';
        let crawlMatch = await dbInstance.get(
          'SELECT * FROM crawled_products WHERE approval_status = "APPROVED" AND (name LIKE ? OR sku LIKE ?)',
          [flexiblePattern, flexiblePattern]
        );
        if (!crawlMatch) {
          const models = CrmLeadService.extractModelCodes(cleanExplicit);
          if (models.length > 0) {
            const mPat = '%' + models[0].replace(/[\s\-_]+/g, '%') + '%';
            crawlMatch = await dbInstance.get(
              'SELECT * FROM crawled_products WHERE approval_status = "APPROVED" AND (name LIKE ? OR sku LIKE ?)',
              [mPat, mPat]
            );
          }
        }
        if (crawlMatch) {
          const updated = this.setActiveProduct(conversationId, {
            id: crawlMatch.id,
            name: crawlMatch.name,
            price: crawlMatch.sale_price,
            configuration: crawlMatch.specs_json,
            sku: crawlMatch.sku,
            unit: crawlMatch.unit,
            contextSource: 'crawler'
          });
          return this._validateProductForQuotation(updated, requestedQuantity);
        }
      }

      // External explicit name
      const extProd = this.extractProductFromText(explicitProductName);
      if (extProd) {
        const updated = this.setActiveProduct(conversationId, extProd);
        return this._validateProductForQuotation(updated, requestedQuantity);
      }
    }

    // 5. If active product exists, use it!
    if (active && active.active_product_name) {
      return this._validateProductForQuotation(active, requestedQuantity);
    }

    // 6. If STILL no active product -> Mandatory Rule: Ask customer, NEVER guess or hallucinate!
    return {
      status: 'NEED_CLARIFICATION',
      product: null,
      message: 'Dạ, anh muốn em lập báo giá cho sản phẩm nào ạ? Anh có thể cho em xin tên hoặc model sản phẩm để em tạo bảng giá chính xác nhất nhé ạ!'
    };
  }

  /**
   * Set pagination state for multi-page product catalogs
   */
  static setPagination(conversationId, paginationData = null) {
    if (!conversationId) return;
    const ctx = this.getContext(conversationId) || {
      conversation_id: conversationId,
      customer_id: 'guest',
      active_product_id: null,
      active_product_name: null,
      active_product_configuration: null,
      active_product_price: 0,
      price_type: 'REFERENCE_ONLY',
      sku: '',
      unit: 'cái',
      quantity: 1,
      last_product_mentioned_at: new Date().toISOString(),
      context_source: 'conversation',
      recent_products: [],
      product_statuses: {},
      pagination: null,
      updatedAt: Date.now()
    };
    ctx.pagination = paginationData;
    ctx.updatedAt = Date.now();
    activeContextStore.set(conversationId, ctx);
  }

  /**
   * Get active pagination state
   */
  static getPagination(conversationId) {
    if (!conversationId) return null;
    const ctx = this.getContext(conversationId);
    return ctx?.pagination || null;
  }

  /**
   * Clear pagination state
   */
  static clearPagination(conversationId) {
    if (!conversationId) return;
    const ctx = this.getContext(conversationId);
    if (ctx) {
      ctx.pagination = null;
      activeContextStore.set(conversationId, ctx);
    }
  }

  /**
   * Track specific product status: 'INTRODUCED' | 'INTERESTED' | 'SELECTED' | 'QUOTED' | 'ORDERED'
   */
  static updateProductStatus(conversationId, productId, status = 'INTRODUCED') {
    if (!conversationId || !productId) return;
    const ctx = this.getContext(conversationId) || {
      conversation_id: conversationId,
      customer_id: 'guest',
      active_product_id: null,
      active_product_name: null,
      active_product_configuration: null,
      active_product_price: 0,
      price_type: 'REFERENCE_ONLY',
      sku: '',
      unit: 'cái',
      quantity: 1,
      last_product_mentioned_at: new Date().toISOString(),
      context_source: 'conversation',
      recent_products: [],
      product_statuses: {},
      pagination: null,
      updatedAt: Date.now()
    };
    if (!ctx.product_statuses) ctx.product_statuses = {};
    ctx.product_statuses[productId] = status;
    ctx.updatedAt = Date.now();
    activeContextStore.set(conversationId, ctx);
  }

  /**
   * Get product status
   */
  static getProductStatus(conversationId, productId) {
    if (!conversationId || !productId) return null;
    const ctx = this.getContext(conversationId);
    return ctx?.product_statuses?.[productId] || null;
  }

  /**
   * Internal validator for quotation readiness
   */
  static _validateProductForQuotation(activeContext, requestedQuantity = 1) {
    if (!activeContext) {
      return {
        valid: false,
        status: 'NO_ACTIVE_PRODUCT',
        reason: 'Chưa có sản phẩm được chọn',
        message: 'Dạ anh đang muốn em làm báo giá cho sản phẩm nào ạ? Anh cho em xin tên hoặc mã máy cụ thể để em lên báo giá chuẩn cho anh nhé!'
      };
    }

    const name = activeContext.active_product_name || activeContext.name;
    const price = parseFloat(activeContext.active_product_price || activeContext.price || 0);
    const priceType = activeContext.price_type || (price > 0 ? (activeContext.active_product_id ? 'SUPPLIER_VERIFIED' : 'REFERENCE_ONLY') : 'UNVERIFIED');
    const qty = Math.max(1, parseInt(requestedQuantity, 10) || activeContext.quantity || 1);

    // Price Verification Rule: If price is invalid / 0 / UNVERIFIED -> Inform customer, DO NOT hallucinate
    if (!price || price <= 0 || priceType === 'UNVERIFIED') {
      return {
        status: 'PRICE_UNVERIFIED',
        product: {
          id: activeContext.active_product_id || activeContext.id || null,
          name,
          configuration: activeContext.active_product_configuration || activeContext.configuration || null,
          price: 0,
          priceType: 'UNVERIFIED',
          sku: activeContext.sku || '',
          unit: activeContext.unit || 'cái',
          quantity: qty,
          contextSource: activeContext.context_source || 'conversation'
        },
        message: `Dạ sản phẩm **${name}** hiện đang chờ cập nhật đơn giá chính xác từ nhà cung cấp/kho hàng. Em không thể tự gán giá ngẫu nhiên. Em đã ghi nhận yêu cầu và sẽ thông báo chuyên viên kiểm tra và báo giá chính xác cho anh sớm nhất nhé ạ!`
      };
    }

    return {
      status: 'READY',
      product: {
        id: activeContext.active_product_id || activeContext.id || null,
        name,
        configuration: activeContext.active_product_configuration || activeContext.configuration || null,
        price,
        priceType,
        sku: activeContext.sku || '',
        unit: activeContext.unit || 'cái',
        quantity: qty,
        contextSource: activeContext.context_source || 'conversation'
      },
      message: null
    };
  }
}

export default ActiveProductContext;
