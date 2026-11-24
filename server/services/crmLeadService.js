/**
 * CRM LEAD SERVICE: INTELLIGENT PRODUCT EXTRACTION & LEAD ENRICHMENT
 * 
 * Objectives:
 * 1. Extract accurate product name, brand, model, quantity from customer conversations.
 * 2. Handle multiple products inquired in single or multi-turn dialogues.
 * 3. Match against internal product catalog (products & crawled_products) or preserve external inquiries.
 * 4. Never default to 'Sản phẩm tổng quan'; if no product mentioned, set 'Chưa xác định sản phẩm'.
 * 5. Safe backfill for legacy leads.
 */

import { randomUUID } from 'crypto';

// Known Brands
const KNOWN_BRANDS = [
  'Glory', 'Brother', 'Lenovo', 'Dell', 'HP', 'Kangaroo', 'Panasonic', 'Canon',
  'Epson', 'Casio', 'Xiudun', 'Oudis', 'Silicon', 'Xerox', 'Asus', 'Acer',
  'Apple', 'Samsung', 'Sony', 'Toshiba', 'Ricoh', 'Sharp', 'Sunhouse', 'Karofi',
  'Sanaky', 'Đôi Dép', 'Doi Dep', 'Hoàng Tỳ', 'Hoang Ty', 'Nhật Minh', 'Nhat Minh',
  'ThinkPad', 'ThinkCentre', 'Bích Thủy', 'Bich Thuy', 'Ngọc Đỉnh', 'Ngoc Dinh',
  'Logitech', 'Fujitsu', 'Avision', 'Zebra', 'Honeywell', 'Xprinter', 'Kpos'
];

// Product Category Nouns (Regex patterns)
const PRODUCT_CATEGORY_PATTERNS = [
  { label: 'Máy đếm tiền', regex: /m[aá]y\s+đ[eế]m\s+ti[eề]n/i },
  { label: 'Máy in', regex: /m[aá]y\s+in/i },
  { label: 'Máy scan', regex: /m[aá]y\s+(?:scan|qu[eé]t)/i },
  { label: 'Máy fax', regex: /m[aá]y\s+fax/i },
  { label: 'Máy hủy tài liệu', regex: /m[aá]y\s+h[uủ]y\s+(?:t[aà]i\s+li[eệ]u|gi[aấ]y)/i },
  { label: 'Máy chiếu', regex: /m[aá]y\s+chi[eế]u/i },
  { label: 'Laptop', regex: /(?:m[aá]y\s+t[ií]nh\s+x[aá]ch\s+tay|laptop)/i },
  { label: 'Máy tính để bàn', regex: /(?:m[aá]y\s+t[ií]nh\s+đ[eể]\s+b[aà]n|pc|m[aá]y\s+b[aà]n)/i },
  { label: 'Cây nước nóng lạnh', regex: /(?:c[aâ]y\s+n[uư][oớ]c\s+n[oó]ng\s+l[aạ]nh|m[aá]y\s+n[uư][oớ]c\s+n[oó]ng\s+l[aạ]nh)/i },
  { label: 'Máy lọc nước', regex: /m[aá]y\s+l[oọ]c\s+n[uư][oớ]c/i },
  { label: 'Điện thoại bàn', regex: /(?:đi[eệ]n\s+tho[aạ]i\s+b[aà]n|đi[eệ]n\s+tho[aạ]i\s+c[oố]\s+đ[iị]nh)/i },
  { label: 'Tổng đài', regex: /t[oổ]ng\s+đ[aà]i/i },
  { label: 'Trà Oolong', regex: /(?:tr[aà]|ch[eè])\s+(?:oolong|o\s*long|xanh|b[ií]ch\s+th[uủ]y)/i },
  { label: 'Cà phê', regex: /c[aà]\s*ph[eê]/i }
];

export class CrmLeadService {
  /**
   * Strip Vietnamese diacritics for flexible fuzzy comparisons
   */
  static stripDiacritics(str = '') {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  }

  /**
   * Extract hardware model codes from text
   * E.g. EU200, HL-L6210DW, KG64A3, E14, L14, neo 50s, 13DLS1JR00, KX-TS500, G3010, 320Gr
   */
  static extractModelCodes(text) {
    if (!text) return [];
    const models = [];

    // Normalize spaced hyphens like 'HL - L6210DW' -> 'HL-L6210DW'
    const normalizedText = text.replace(/([A-Z0-9]+)\s*-\s*([A-Z0-9]+)/gi, '$1-$2');

    // Pattern 1: Alphanumeric models with hyphens or numbers (e.g., HL-L6210DW, EU200, KG64A3, E14, L14, KX-TS500, G3010)
    // Avoid pure numbers like phone numbers (10 digits) or years (2024, 2027)
    const regex = /\b(?![0-9]{8,11}\b)([A-Z0-9]{1,6}[-_][A-Z0-9]{2,10}(?:[-_][A-Z0-9]{1,8})*|[A-Z]{1,5}\d{2,6}[A-Z0-9]*|\bneo\s*50s\b|[A-Z]{1,3}\d{1,3}\b)\b/gi;
    let match;
    while ((match = regex.exec(normalizedText)) !== null) {
      const code = match[0].trim();
      // Skip common non-model words
      const lower = code.toLowerCase();
      if (['chao', 'shop', 'zalo', 'sdt', 'vnd', 'gia', 'bao', 'gui'].includes(lower)) continue;
      // Skip pure small integers or pure years
      if (/^\d+$/.test(code) && (parseInt(code) < 100 || parseInt(code) > 2099)) continue;
      if (!models.includes(code)) {
        models.push(code);
      }
    }
    return models;
  }

  /**
   * Extract brand name from text
   */
  static extractBrand(text) {
    if (!text) return null;
    const textNorm = text.toLowerCase();
    for (const brand of KNOWN_BRANDS) {
      const bLower = brand.toLowerCase();
      const bClean = this.stripDiacritics(bLower);
      if (textNorm.includes(bLower) || this.stripDiacritics(textNorm).includes(bClean)) {
        return brand;
      }
    }
    return null;
  }

  /**
   * Extract category label from text
   */
  static extractCategory(text) {
    if (!text) return null;
    for (const item of PRODUCT_CATEGORY_PATTERNS) {
      if (item.regex.test(text)) {
        return item.label;
      }
    }
    return null;
  }

  /**
   * Extract quantity from text associated with products
   */
  static extractQuantity(text) {
    if (!text) return 1;
    // Pattern 1: Explicit keyword: số lượng: 3, sl 2
    const kw = text.match(/(?:s[oố]\s+l[uư][oợ]ng|sl)\s*[:=\s]+([1-9]\d{0,2})\b/i);
    if (kw && kw[1]) return parseInt(kw[1], 10);

    // Pattern 2: mua 3 cái, lấy 2 máy, đặt 5 bộ
    const verbUnit = text.match(/(?:mua|l[aấ]y|c[aầ]n|đ[aặ]t|l[aấ]y\s+th[eê]m)\s+([1-9]\d{0,2})\s*(?:c[aá]i|chi[eế]c|m[aá]y|b[oộ]|h[oộ]p|g[oó]i|kg|th[uù]ng)?/i);
    if (verbUnit && verbUnit[1]) return parseInt(verbUnit[1], 10);

    // Pattern 3: Standalone number with unit: 2 máy, 3 cái
    const numUnit = text.match(/(?<![a-zA-Z0-9_-])([1-9]\d{0,2})\s+(?:c[aá]i|chi[eế]c|m[aá]y|b[oộ]|h[oộ]p|g[oó]i|kg|th[uù]ng)\b/i);
    if (numUnit && numUnit[1]) return parseInt(numUnit[1], 10);

    // Pattern 4: x2, x 3
    const mult = text.match(/(?<![a-zA-Z0-9])x\s*([1-9]\d{0,1})\b/i);
    if (mult && mult[1]) return parseInt(mult[1], 10);

    return 1;
  }

  /**
   * Extract all products from conversation history and current message
   * @param {Object} options
   * @param {string} options.conversationId
   * @param {string} options.currentMessage
   * @param {Object} options.activeProduct
   * @param {Object} options.db
   * @returns {Promise<{ products: Array, productName: string, brand: string|null, model: string|null, quantity: number, customerRequirement: string, conversationSummary: string }>}
   */
  static async extractProductsFromConversation({ conversationId, currentMessage = '', activeProduct = null, db = null }) {
    const messages = [];

    // 1. Gather dialogue messages from database if conversationId provided
    if (db && conversationId) {
      try {
        const rows = await db.all(
          'SELECT sender_type, content, metadata_json FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
          [conversationId]
        );
        if (Array.isArray(rows)) {
          for (const r of rows) {
            if (r.content && typeof r.content === 'string') {
              messages.push({
                sender: r.sender_type,
                text: r.content.trim(),
                metadata: r.metadata_json ? (typeof r.metadata_json === 'string' ? JSON.parse(r.metadata_json) : r.metadata_json) : null
              });
            }
          }
        }
      } catch (err) {
        console.warn('[CRM LEAD SERVICE] Failed to query conversation messages:', err.message);
      }
    }

    // 2. Add current message if present
    if (currentMessage && typeof currentMessage === 'string' && currentMessage.trim()) {
      messages.push({
        sender: 'user',
        text: currentMessage.trim(),
        metadata: null
      });
    }

    // 3. Collect all user text and relevant assistant text
    const userTexts = messages
      .filter(m => m.sender === 'user')
      .map(m => m.text);
    const combinedUserText = userTexts.join('\n');
    const allText = messages.map(m => m.text).join('\n');

    const products = [];
    const detectedNames = new Set();

    // Helper to add a product cleanly
    const addProduct = (prod) => {
      if (!prod || !prod.name) return;
      const cleanName = prod.name.trim();
      const normName = cleanName.toLowerCase();
      if (detectedNames.has(normName)) return;
      detectedNames.add(normName);

      products.push({
        id: prod.id || null,
        name: cleanName,
        brand: prod.brand || null,
        model: prod.model || null,
        quantity: prod.quantity || 1,
        price: prod.price || null,
        price_formatted: prod.price_formatted || null
      });
    };

    // A. Check activeProduct passed from session
    if (activeProduct && activeProduct.name) {
      addProduct({
        id: activeProduct.id,
        name: activeProduct.name,
        brand: activeProduct.brand || this.extractBrand(activeProduct.name),
        model: activeProduct.model || (this.extractModelCodes(activeProduct.name)[0] || null),
        quantity: activeProduct.quantity || this.extractQuantity(combinedUserText) || 1,
        price: activeProduct.price,
        price_formatted: activeProduct.price_formatted
      });
    }

    // B. Check against DB Catalog (`products` and `crawled_products`)
    if (db) {
      try {
        const catalogProducts = await db.all(
          'SELECT id, name, sku, price, price_formatted, group_name FROM products WHERE is_active = 1'
        );
        for (const cp of (catalogProducts || [])) {
          const cpNameNorm = cp.name.toLowerCase();
          const cpSkuNorm = (cp.sku || '').toLowerCase();
          const nameNormAscii = this.stripDiacritics(cpNameNorm);

          // Check if catalog product mentioned in user text
          let matched = false;
          if (cpSkuNorm && cpSkuNorm.length > 2 && combinedUserText.toLowerCase().includes(cpSkuNorm)) {
            matched = true;
          } else if (combinedUserText.toLowerCase().includes(cpNameNorm)) {
            matched = true;
          } else if (cp.name.length > 8 && this.stripDiacritics(combinedUserText.toLowerCase()).includes(nameNormAscii)) {
            matched = true;
          }

          if (matched) {
            addProduct({
              id: cp.id,
              name: cp.name,
              brand: this.extractBrand(cp.name),
              model: this.extractModelCodes(cp.name)[0] || cp.sku || null,
              quantity: this.extractQuantity(combinedUserText) || 1,
              price: cp.price,
              price_formatted: cp.price_formatted
            });
          }
        }
      } catch (err) {
        console.warn('[CRM LEAD SERVICE] Catalog match warning:', err.message);
      }
    }

    // C. Detect multi-product mentions and explicit external products from text
    // Example: "Tôi muốn mua máy đếm tiền Glory EU200 và máy in Brother HL-L6210DW"
    // Split sentences or clauses by conjunctions: và, với, cộng, ",", "+" (without diacritic \b trap)
    const clauses = combinedUserText.split(/(?:,|\s+(?:và|va|với|voi|cộng|cong|\+)\s+|\n|\.)+/i);

    for (const clause of clauses) {
      const trimmedClause = clause.trim();
      if (!trimmedClause || trimmedClause.length < 3) continue;

      const brand = this.extractBrand(trimmedClause);
      const category = this.extractCategory(trimmedClause);
      const models = this.extractModelCodes(trimmedClause);
      const qty = this.extractQuantity(trimmedClause);

      if (brand || models.length > 0 || category) {
        // Build product representation
        for (const model of (models.length > 0 ? models : [null])) {
          let constructedName = '';
          if (category && brand && model) {
            constructedName = `${category} ${brand} ${model}`;
          } else if (brand && model) {
            constructedName = `${brand} ${model}`;
          } else if (category && model) {
            constructedName = `${category} ${model}`;
          } else if (category && brand) {
            constructedName = `${category} ${brand}`;
          } else if (category) {
            // Only category if specific enough (e.g. "máy đếm tiền")
            // Check if user specifically asked about it
            if (/m[aá]y\s+đ[eế]m\s+ti[eề]n|c[aâ]y\s+n[uư][oớ]c\s+n[oó]ng\s+l[aạ]nh|t[oổ]ng\s+đ[aà]i/i.test(trimmedClause)) {
              constructedName = category;
            }
          }

          if (constructedName) {
            // Check if already covered by an existing product name
            const exists = products.some(p => 
              p.name.toLowerCase().includes(constructedName.toLowerCase()) ||
              (model && p.model && p.model.toLowerCase() === model.toLowerCase())
            );

            if (!exists) {
              addProduct({
                id: null,
                name: constructedName,
                brand: brand || null,
                model: model || null,
                quantity: qty || 1
              });
            }
          }
        }
      }
    }

    // D. Check for "Tìm nguồn hàng: <item>" pattern in previous state
    const missingMatch = combinedUserText.match(/(?:t[iì]m\s+ngu[oồ]n\s+h[aà]ng|quan\s+t[aâ]m|h[oỏ]i\s+mua)\s*:\s*([^,\n.]+)/i);
    if (missingMatch && missingMatch[1]) {
      const requestedItem = missingMatch[1].trim();
      if (requestedItem && requestedItem.length > 3 && !detectedNames.has(requestedItem.toLowerCase())) {
        // If not a phone number or general word
        if (!/^\d{8,11}$/.test(requestedItem) && !/^(tu van|bao gia|gap nhan vien)$/i.test(this.stripDiacritics(requestedItem))) {
          addProduct({
            id: null,
            name: requestedItem,
            brand: this.extractBrand(requestedItem),
            model: this.extractModelCodes(requestedItem)[0] || null,
            quantity: 1
          });
        }
      }
    }

    // E. Determine Customer Requirement (customer_need)
    let customerRequirement = 'Yêu cầu tư vấn';
    const textLower = combinedUserText.toLowerCase();
    if (/gi[aá]|b[aá]o\s+gi[aá]|chi\s+ph[ií]|khuy[eế]n\s+m[aã]i|gi[aả]m\s+gi[aá]/i.test(textLower)) {
      customerRequirement = 'Hỏi giá và chính sách ưu đãi';
    } else if (/th[oô]ng\s+s[oố]|t[ií]nh\s+n[aă]ng|so\s+s[aá]nh|k[yỹ]\s+thu[aậ]t|h[uư][oớ]ng\s+d[aẫ]n/i.test(textLower)) {
      customerRequirement = 'Tư vấn thông số và tính năng';
    } else if (/g[aặ]p\s+nh[aâ]n\s+vi[eê]n|g[oọ]i\s+l[aạ]i|li[eê]n\s+h[eệ]\s+tr[uự]c\s+ti[eế]p|t[uư]\s+v[aấ]n\s+tr[uự]c\s+ti[eế]p/i.test(textLower)) {
      customerRequirement = 'Yêu cầu chuyên viên gọi lại trực tiếp';
    } else if (/đ[aặ]t\s+h[aà]ng|mua\s+ngay|l[aấ]y\s+h[aà]ng|giao\s+h[aà]ng|thanh\s+to[aá]n/i.test(textLower)) {
      customerRequirement = 'Nhu cầu đặt mua hàng';
    }

    // F. Synthesize Lead Product Results & Summary
    let productName = 'Chưa xác định sản phẩm';
    let brand = null;
    let model = null;
    let quantity = 1;
    let conversationSummary = '';

    if (products.length > 0) {
      const primary = products[0];
      productName = primary.name;
      brand = primary.brand || null;
      model = primary.model || null;
      quantity = primary.quantity || 1;

      const productDescriptions = products
        .map(p => `${p.name} (SL: ${p.quantity || 1})`)
        .join(', ');

      conversationSummary = `Khách hàng quan tâm và yêu cầu tư vấn: ${productDescriptions}. Nhu cầu: ${customerRequirement}.`;
    } else {
      // No specific product mentioned
      productName = 'Chưa xác định sản phẩm';
      conversationSummary = `Khách hàng để lại thông tin liên hệ / trao đổi chung, chưa đề cập sản phẩm cụ thể. Nhu cầu: ${customerRequirement}.`;
    }

    return {
      products,
      productName,
      brand,
      model,
      quantity,
      customerRequirement,
      conversationSummary
    };
  }

  /**
   * Format and enrich full lead payload ready for DB insert/update
   */
  static async enrichLeadData({
    leadId,
    customerName,
    phone,
    email,
    conversationId,
    currentMessage = '',
    activeProduct = null,
    db = null,
    source = 'TRÍ AI Humanoid Widget',
    widgetId = 'WIDGET_HUMANOID_V1'
  }) {
    const analysis = await this.extractProductsFromConversation({
      conversationId,
      currentMessage,
      activeProduct,
      db
    });

    const now = new Date().toISOString();
    const id = leadId || `lead_${randomUUID().slice(0, 8)}`;
    const finalCustomerName = (customerName && customerName !== 'Quý Khách' && customerName !== 'Quý khách')
      ? customerName.trim()
      : (phone ? `Khách ${phone}` : 'Khách hàng');

    const primaryProduct = analysis.products[0] || null;

    return {
      id,
      customer_name: finalCustomerName,
      phone: phone ? phone.trim() : '',
      email: email ? email.trim() : null,
      product_id: primaryProduct?.id || null,
      product_name: analysis.productName,
      brand: analysis.brand,
      model: analysis.model,
      quantity: analysis.quantity,
      products_json: JSON.stringify(analysis.products),
      customer_requirement: analysis.customerRequirement,
      conversation_summary: analysis.conversationSummary,
      conversation_id: conversationId || null,
      website_source: source,
      widget_id: widgetId,
      consent_to_contact: 1,
      created_time: now,
      lead_status: 'NEW – WAITING FOR OWNER CONTACT',
      notes: `Hội thoại ghi nhận: ${analysis.conversationSummary}`,
      updated_at: now
    };
  }

  /**
   * Backfill existing legacy leads with 'Sản phẩm tổng quan' or NULL product_name
   */
  static async backfillExistingLeads(db) {
    if (!db) return { success: false, error: 'Database instance required' };

    console.log('[CRM LEAD SERVICE] Starting legacy leads backfill...');
    const legacyLeads = await db.all(`
      SELECT id, conversation_id, notes, customer_requirement, product_name
      FROM leads
      WHERE product_name = 'Sản phẩm tổng quan'
         OR product_name IS NULL
         OR product_name = ''
    `);

    let updatedCount = 0;
    let identifiedCount = 0;
    let undeterminedCount = 0;

    for (const lead of legacyLeads) {
      let analysis = null;

      if (lead.conversation_id) {
        analysis = await this.extractProductsFromConversation({
          conversationId: lead.conversation_id,
          currentMessage: lead.notes || '',
          activeProduct: null,
          db
        });
      }

      let newProductName = 'Chưa xác định sản phẩm';
      let brand = null;
      let model = null;
      let productsJson = '[]';
      let summary = lead.customer_requirement || 'Trao đổi chung';

      if (analysis && analysis.products.length > 0) {
        newProductName = analysis.productName;
        brand = analysis.brand;
        model = analysis.model;
        productsJson = JSON.stringify(analysis.products);
        summary = analysis.conversationSummary;
        identifiedCount++;
      } else {
        undeterminedCount++;
        summary = `Khách hàng trao đổi chung, chưa đề cập sản phẩm cụ thể.`;
      }

      await db.run(`
        UPDATE leads
        SET product_name = ?,
            brand = ?,
            model = ?,
            products_json = ?,
            conversation_summary = ?,
            updated_at = ?
        WHERE id = ?
      `, [
        newProductName,
        brand,
        model,
        productsJson,
        summary,
        new Date().toISOString(),
        lead.id
      ]);

      updatedCount++;
    }

    console.log(`[CRM LEAD SERVICE] Backfill completed. Total: ${updatedCount}, Identified: ${identifiedCount}, Undetermined: ${undeterminedCount}`);
    return {
      success: true,
      totalUpdated: updatedCount,
      identifiedCount,
      undeterminedCount
    };
  }
}

export default CrmLeadService;
