/**
 * UNIVERSAL SALES CONSULTANT – CHUYÊN GIA TƯ VẤN BÁN HÀNG TOÀN NĂNG (PHẦN V)
 * (TRÍ AI – THƯ KÝ AI TOÀN NĂNG & HUMAN BRAIN)
 * 
 * 10 BƯỚC NGHIỆP VỤ CHUẨN MỰC BẮT BUỘC:
 * 1. Phạm vi: Áp dụng cho TOÀN BỘ DANH MỤC SẢN PHẨM trong DB (Laptop, PC, Máy in, Máy scan, Trà, Cà phê, Nước hoa, Thiết bị VP...).
 * 2. Bước 1: Tiếp nhận nhu cầu (ngành hàng, mục đích sử dụng, ngân sách, tiêu chí đặc biệt).
 * 3. Bước 2: Hỏi ngân sách chuẩn: "Dạ anh/chị dự kiến ngân sách khoảng bao nhiêu để em lựa chọn những sản phẩm phù hợp nhất ạ?" (Bỏ qua nếu hỏi mã cụ thể, thông số xác định, hoặc không muốn nêu ngân sách).
 * 4. Bước 3: Tìm kiếm và lọc sản phẩm từ Database thực tế (is_active = 1, is_approved = 1, giá > 0), không bịa đặt.
 * 5. Bước 4: QUY TẮC TỐI ĐA 5 SẢN PHẨM MỖI LƯỢT: 0 -> báo không có; 1-5 -> hiển thị đúng 1, 2, 3, 4, 5; >5 -> tối đa 5 SP.
 * 6. Bước 5: Trình bày chuẩn 6 thành phần: STT, Tên, Mã SP, Cấu hình/thông số, Giá niêm yết, Lý do phù hợp.
 * 7. Bước 6: Xử lý xem tất cả ("Cho anh xem tất cả", "gửi hết"): chia nhóm tối đa 5 SP, hỏi "Anh/chị muốn em gửi tiếp 5 sản phẩm tiếp theo hay muốn em tư vấn sâu hơn những mẫu phù hợp nhất ạ?".
 * 8. Bước 7: Quản lý Phân trang (Pagination Engine): không lặp, không sót. Khi hết danh sách thông báo đã gửi toàn bộ, không hỏi máy móc.
 * 9. Bước 8: Phân biệt trạng thái sản phẩm: INTRODUCED, INTERESTED, SELECTED, QUOTED, ORDERED.
 * 10. Bước 9 & 10: Giữ nguyên ngữ cảnh khi báo giá và đồng bộ dữ liệu đa sản phẩm vào CRM Lead.
 */

import { db } from '../../db.js';
import { randomUUID } from 'crypto';
import { ActiveProductContext } from './activeProductContext.js';
import { CrmLeadService } from '../crmLeadService.js';
import ResponseEngine from './responseEngine.js';
import { HumanMemoryEngine } from './humanMemoryEngine.js';
import { IntentEngine } from './intentEngine.js';

export class UniversalSalesConsultant {
  /**
   * Check if query is a spec search
   */
  static isSpecSearch(normMessage = '') {
    return /(ram\s*(\d+|bao\s*nhieu|may|nhiue)|dung\s*luong\s*ram|ssd\s*(\d+|bao\s*nhieu|may)|o\s*cung|core\s*[iu]?\d+|core\s*5|u3|u5|u7|in\s*2\s*mat|dao\s*mat|144hz|ips|wuxga|fhd|laser|scan\s*2\s*mat|wifi|mang\s*lan|\blan\b|ket\s*noi\s*mang)\b/i.test(normMessage);
  }

  /**
   * Format standard price currency (VNĐ)
   */
  static formatPrice(price) {
    if (!price || isNaN(price) || Number(price) <= 0) return 'Liên hệ shop';
    return Number(price).toLocaleString('vi-VN') + ' ₫';
  }

  /**
   * Extract budget from message (VND / Triệu / k / tr)
   */
  static extractBudget(text = '') {
    if (!text || typeof text !== 'string') return null;
    const clean = text.toLowerCase();

    // Range: "tầm 15 đến 20 triệu", "khoảng 15-20tr"
    const rangeMatch = clean.match(/(?:tầm|khoảng|tu|từ)?\s*(\d+(?:[.,]\d+)?)\s*(?:đến|-|tới)\s*(\d+(?:[.,]\d+)?)\s*(?:triệu|trieu|tr|m\b)/i);
    if (rangeMatch) {
      const min = parseFloat(rangeMatch[1].replace(',', '.')) * 1000000;
      const max = parseFloat(rangeMatch[2].replace(',', '.')) * 1000000;
      return { min, max, target: max, raw: rangeMatch[0] };
    }

    // Single: "ngân sách 20 triệu", "dưới 15tr", "tầm 30tr"
    const singleMillion = clean.match(/(?:ngân sách|ngan sach|tầm|tam|khoảng|khoang|dưới|duoi|tối đa|toi da|khoang chung)?\s*(\d+(?:[.,]\d+)?)\s*(?:triệu|trieu|tr\b)/i);
    if (singleMillion) {
      const val = parseFloat(singleMillion[1].replace(',', '.')) * 1000000;
      const isUnder = /(dưới|duoi|tối đa|toi da)/i.test(singleMillion[0]);
      return { min: isUnder ? 0 : val * 0.8, max: val * 1.15, target: val, raw: singleMillion[0] };
    }

    // Single: "dưới 500 nghìn", "500k", "tầm 800 nghìn"
    const singleThousand = clean.match(/(?:ngân sách|ngan sach|tầm|tam|khoảng|khoang|dưới|duoi|tối đa|toi da|khoang chung|gia|giá)?\s*(\d+(?:[.,]\d+)?)\s*(?:nghìn|nghin|k\b)/i);
    if (singleThousand) {
      const val = parseFloat(singleThousand[1].replace(',', '.')) * 1000;
      const isUnder = /(dưới|duoi|tối đa|toi da)/i.test(singleThousand[0]);
      return { min: isUnder ? 0 : val * 0.8, max: val * 1.15, target: val, raw: singleThousand[0] };
    }

    // Direct VND: "20.000.000", "20000000"
    const directVnd = clean.match(/(\d{1,3}(?:\.\d{3}){2,3}|\d{7,9})\s*(?:đ|vnd|dong|đồng)?/i);
    if (directVnd) {
      const val = parseFloat(directVnd[1].replace(/\./g, ''));
      if (val >= 100000) {
        return { min: val * 0.8, max: val * 1.15, target: val, raw: directVnd[0] };
      }
    }

    return null;
  }

  /**
   * Extract specs summary from specs_json or description
   */
  static extractSpecsSummary(product) {
    if (!product) return 'Cấu hình tiêu chuẩn chính hãng';
    const specsJson = product.specs_json || product.specs;
    if (specsJson) {
      try {
        const parsed = typeof specsJson === 'string' ? JSON.parse(specsJson) : specsJson;
        if (typeof parsed === 'object' && parsed !== null) {
          const entries = Object.entries(parsed).filter(([k]) => !['Bảo hành', 'Mô tả', 'Xuất xứ'].includes(k));
          if (entries.length > 0) {
            return entries.slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(' | ');
          }
        }
      } catch {}
    }

    // Fallback: parse CPU, RAM, SSD from name
    const name = product.name || '';
    const parts = [];
    const cpuMatch = name.match(/\b(Core\s*[iu]?\d+|U\d+|i\d-\w+|Ultra\s*\d+|Ryzen\s*\d+)\b/i);
    if (cpuMatch) parts.push(`CPU: ${cpuMatch[0]}`);
    const ramMatch = name.match(/\b(\d+GB|\d+G|\d+GD)\b/i);
    if (ramMatch) parts.push(`RAM: ${ramMatch[0]}`);
    const ssdMatch = name.match(/\b(\d+SSD|\d+GBSSD|\d+TBSSD)\b/i);
    if (ssdMatch) parts.push(`Ổ cứng: ${ssdMatch[0]}`);
    const printMatch = name.match(/\b(in 2 mặt|duplex|laser|đa năng|đơn năng)\b/i);
    if (printMatch) parts.push(`Tính năng: ${printMatch[0]}`);

    if (parts.length > 0) return parts.join(' | ');

    if (product.description) {
      const firstLine = product.description.split(/[\r\n]+/)[0].replace(/^[-•*]\s*/, '').trim();
      if (firstLine.length > 10) return firstLine.slice(0, 90);
    }

    return 'Hàng chính hãng, bảo hành nhà sản xuất';
  }

  /**
   * Generate concise match reason (Bước 5)
   */
  static extractMatchReason(product, criteria = {}) {
    if (!product) return 'Sản phẩm chính hãng chất lượng cao.';
    const field = (product.field || product.category || '').toUpperCase();
    const name = (product.name || '').toUpperCase();

    if (criteria.budget && product.price > 0 && product.price <= criteria.budget.max) {
      return `Mức giá tối ưu trong tầm ngân sách dự kiến, hiệu năng vượt trội.`;
    }
    if (field.includes('LAPTOP') || name.includes('THINKPAD') || name.includes('DELL')) {
      return `Thiết kế bền bỉ chuẩn doanh nhân, bàn phím gõ êm, pin trâu và tản nhiệt tốt.`;
    }
    if (field.includes('MAY IN') || name.includes('BROTHER') || name.includes('CANON')) {
      return `Tốc độ in nhanh, bản in sắc nét, tiết kiệm chi phí mực in cho văn phòng.`;
    }
    if (field.includes('TRÀ') || name.includes('OOLONG') || name.includes('TRÀ')) {
      return `Dòng trà tinh tuyển thượng hạng, sắc nước trong, hương hoa tự nhiên thanh mát.`;
    }
    if (field.includes('CÀ PHÊ') || name.includes('COFFEE')) {
      return `Cà phê nguyên chất rang mộc, hương thơm đậm đà, chuẩn vị truyền thống.`;
    }
    if (field.includes('NƯỚC HOA') || name.includes('PERFUME')) {
      return `Hương thơm sang trọng, lưu hương lâu, phong cách thanh lịch cuốn hút.`;
    }
    if (field.includes('CPU') || field.includes('MAN HINH')) {
      return `Linh kiện thế hệ mới, độ ổn định cao, đáp ứng mượt mà nhu cầu đồ họa và đa nhiệm.`;
    }

    return `Sản phẩm chính hãng, đầy đủ hóa đơn VAT và bảo hành chu đáo.`;
  }

  /**
   * Load full active and approved catalog products from DB
   */
  static async loadAllCatalogProducts() {
    try {
      const [rawProducts, rawCrawled] = await Promise.all([
        db.all('SELECT * FROM products WHERE is_active = 1 AND is_approved = 1 ORDER BY field ASC, price ASC'),
        db.all(`
          SELECT id, name, category as field, brand as group_name, sale_price as price,
                 specs_json, description, image_url, sku, warranty_months
          FROM crawled_products 
          WHERE approval_status = 'APPROVED'
          ORDER BY sale_price ASC
        `).catch(() => [])
      ]);

      const normalized = [];
      const seenNames = new Set();

      for (const p of [...rawProducts, ...rawCrawled]) {
        if (!p || !p.name) continue;
        const normName = p.name.trim().toLowerCase();
        if (seenNames.has(normName)) continue;
        seenNames.add(normName);

        normalized.push({
          id: p.id,
          name: p.name.trim(),
          sku: p.sku || '',
          field: p.field || p.category || 'Sản phẩm tiêu biểu',
          group_name: p.group_name || p.brand || '',
          price: parseFloat(p.price || p.sale_price || 0),
          specs_json: p.specs_json,
          description: p.description || '',
          image_url: p.image_url || null,
          warranty_months: p.warranty_months || 12
        });
      }

      return normalized;
    } catch (err) {
      console.error('[UNIVERSAL SALES] Error loading catalog products:', err.message);
      return [];
    }
  }

  /**
   * Format product presentation according to Step 5 (STT, Name, SKU, Specs, Price, Reason)
   */
  static formatProductPresentation(products = [], startIndex = 1) {
    if (!products || products.length === 0) return '';

    return products.map((p, idx) => {
      const stt = startIndex + idx;
      const skuLine = p.sku ? `\n   • **Mã sản phẩm:** \`${p.sku}\`` : '';
      const specsLine = `\n   • **Cấu hình / Thông số:** ${this.extractSpecsSummary(p)}`;
      const priceLine = `\n   • **Giá niêm yết:** **${this.formatPrice(p.price)}**`;
      const reasonLine = `\n   • **Lý do phù hợp:** ${this.extractMatchReason(p)}`;

      return `${stt}. **${p.name}**${skuLine}${specsLine}${priceLine}${reasonLine}`;
    }).join('\n\n');
  }

  /**
   * Search and filter products from full catalog based on criteria
   */
  static searchAndFilterProducts(allProducts = [], criteria = {}) {
    const { category, keyword, budget, explicitModel } = criteria;
    const cleanKw = (keyword || '').toLowerCase();
    const cleanCat = (category || '').toLowerCase();
    const cleanModel = (explicitModel || '').toLowerCase();

    const scored = allProducts.map(p => {
      let score = 0;
      const pName = (p.name || '').toLowerCase();
      const pField = (p.field || '').toLowerCase();
      const pSku = (p.sku || '').toLowerCase();
      const pSpecs = (typeof p.specs_json === 'string' ? p.specs_json : JSON.stringify(p.specs_json || '')).toLowerCase();

      // Exact model code match (highest weight)
      const normModel = cleanModel ? cleanModel.replace(/\s*-\s*/g, '-') : '';
      const normPName = pName.replace(/\s*-\s*/g, '-');
      const normPSku = pSku.replace(/\s*-\s*/g, '-');
      if (cleanModel && (pName.includes(cleanModel) || pSku.includes(cleanModel) || (normModel && (normPName.includes(normModel) || normPSku.includes(normModel))))) {
        score += 100;
      }

      // Keyword match
      if (cleanKw) {
        const tokens = cleanKw.split(/\s+/).filter(t => t.length >= 2);
        for (const t of tokens) {
          if (pName.includes(t)) score += 20;
          if (pField.includes(t)) score += 15;
          if (pSku.includes(t)) score += 25;
          if (pSpecs.includes(t)) score += 10;
        }
      }

      // Category match
      if (cleanCat && (pField.includes(cleanCat) || cleanCat.includes(pField))) {
        score += 30;
      }

      // Budget filter: Strictly enforce budget constraints
      if (budget && budget.target > 0) {
        if (p.price > 0) {
          if (p.price <= budget.max && p.price >= (budget.min || 0)) {
            score += 40;
            // Closer to target budget is better
            const diff = Math.abs(p.price - budget.target) / budget.target;
            score += Math.max(0, 20 * (1 - diff));
          } else if (p.price <= budget.max * 1.2) {
            score += 10;
          } else {
            // Over budget: strictly exclude when customer specified a budget ceiling
            return { product: p, score: -999 };
          }
        }
      }

      return { product: p, score };
    });

    // Filter out products with <= 0 score if criteria was specific
    const matched = scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(s => s.product);

    return matched;
  }

  /**
   * Main entry point: Universal Sales Consultant orchestrator (10 Steps)
   */
  static async consultSales(context = {}) {
    const {
      message = '',
      conversationId,
      userContext = {},
      slots = {},
      intentResult = {},
      customerInfo = {},
      selectedProduct = null,
      orgId = 'org_default'
    } = context;

    const unaccented = CrmLeadService.stripDiacritics(message).toLowerCase();
    const allProducts = await this.loadAllCatalogProducts();

    // -------------------------------------------------------------
    // CHECK PAGINATION: Request to view next batch of 5 products
    // -------------------------------------------------------------
    const isPaginationNext = intentResult.primaryIntent === 'PAGINATION_NEXT' ||
      /(?:gui\s+tiep|xem\s+tiep|tiep\s+tuc|gui\s+them|cho\s+xem\s+tiep|5\s+mau\s+tiep\s+theo|5\s+san\s+pham\s+tiep\s+theo|gui\s+tiep\s+5\s+mau|xem\s+tiep\s+5\s+san\s+pham|mau\s+tiep|trang\s+sau|trang\s+tiep|gui\s+5\s+mau\s+tiep|gui\s+5\s+mau\s+nua|ok\s+gui\s+tiep|dong\s+y\s+gui\s+tiep)\b/i.test(unaccented);

    const activePagination = ActiveProductContext.getPagination(conversationId);

    if (isPaginationNext && activePagination && activePagination.matchedProducts?.length > 0) {
      const { matchedProducts, pageIndex = 0, pageSize = 5, categoryTitle = 'sản phẩm' } = activePagination;
      const nextPageIndex = pageIndex + 1;
      const startIdx = nextPageIndex * pageSize;
      const nextBatch = matchedProducts.slice(startIdx, startIdx + pageSize);

      if (nextBatch.length > 0) {
        // Record into recent products & active context
        for (const p of nextBatch) {
          ActiveProductContext.setActiveProduct(conversationId, p, { status: 'INTRODUCED' });
          ActiveProductContext.updateProductStatus(conversationId, p.id, 'INTRODUCED');
        }

        const isLastBatch = (startIdx + nextBatch.length) >= matchedProducts.length;
        const batchPresentation = this.formatProductPresentation(nextBatch, startIdx + 1);

        let followUpQuestion = '';
        if (!isLastBatch) {
          // Bước 6: Sau mỗi nhóm, hỏi tiếp
          followUpQuestion = `\n\n💬 **Anh/chị muốn em gửi tiếp 5 sản phẩm tiếp theo hay muốn em tư vấn sâu hơn những mẫu phù hợp nhất ạ?**`;
          ActiveProductContext.setPagination(conversationId, {
            ...activePagination,
            pageIndex: nextPageIndex
          });
        } else {
          // Bước 7: Hết danh sách -> thông báo đã hết, không hỏi máy móc
          followUpQuestion = `\n\n✅ **Dạ em đã gửi toàn bộ danh mục ${categoryTitle} phù hợp hiện có tại shop rồi ạ.**\n\nAnh/chị ấn tượng với mẫu nào nhất để em hỗ trợ tư vấn chi tiết hơn hoặc lên bảng báo giá chính xác cho mình nhé ạ!`;
          ActiveProductContext.clearPagination(conversationId);
        }

        const reply = `Dạ, em xin gửi tiếp danh sách các mẫu ${categoryTitle} tiếp theo để anh/chị tham khảo ạ:\n\n${batchPresentation}${followUpQuestion}`;

        return ResponseEngine.formatResponse({
          replyText: reply,
          revealCatalog: true,
          recommendedField: nextBatch[0]?.field || null,
          recommendedProduct: nextBatch[0] || null,
          stage: 'PAGINATION_ADVANCED',
          toolsUsed: ['universal_sales_consultant_pagination']
        });
      }
    }

    // -------------------------------------------------------------
    // CHECK VIEW ALL: Request to see full catalog or all products in a category
    // -------------------------------------------------------------
    const isViewAll = intentResult.primaryIntent === 'VIEW_ALL_PRODUCTS' ||
      /(?:cho\s+anh\s+xem\s+tat\s+ca|cho\s+toi\s+xem\s+tat\s+ca|xem\s+tat\s+ca|gui\s+het\s+danh\s+sach|gui\s+het|co\s+nhung\s+mau\s+nao|tham\s+khao\s+toan\s+bo|xem\s+toan\s+bo|xem\s+het|toan\s+bo\s+danh\s+muc)\b/i.test(unaccented);

    // -------------------------------------------------------------
    // STEP 1 & 2: NEED INTAKE & BUDGET INQUIRY
    // -------------------------------------------------------------
    const resolvedSlots = (slots && Object.keys(slots).length > 0) ? slots : (IntentEngine.extractSlots ? IntentEngine.extractSlots(message) : {});
    const budget = this.extractBudget(message) || (resolvedSlots.budget ? { target: resolvedSlots.budget, max: resolvedSlots.budget * 1.15 } : null);
    const categoryDomain = resolvedSlots.categoryDomain || null;
    const categoryDomainName = resolvedSlots.categoryDomainName || null;
    const explicitModel = resolvedSlots.modelCode || null;
    const explicitProduct = resolvedSlots.productName || null;

    // Detect if customer asks for a specific category or product
    let detectedCategory = null;
    if (/laptop|máy tính xách tay|may tinh xach tay|notebook/i.test(unaccented)) detectedCategory = 'LAPTOP';
    else if (/máy in|may in|printer/i.test(unaccented)) detectedCategory = 'MAY IN';
    else if (/máy scan|may scan|scanner/i.test(unaccented)) detectedCategory = 'MAY SCAN';
    else if (/máy tính để bàn|pc|may tinh de ban|cpu/i.test(unaccented)) detectedCategory = 'CPU';
    else if (/màn hình|man hinh|monitor/i.test(unaccented)) detectedCategory = 'MAN HINH VI TINH';
    else if (/trà|tra|oolong|matcha/i.test(unaccented)) detectedCategory = 'Trà cao cấp';
    else if (/cà phê|ca phe|coffee|espresso/i.test(unaccented)) detectedCategory = 'Cà phê Espresso 250gr';
    else if (/nước hoa|nuoc hoa|mỹ phẩm|my pham/i.test(unaccented)) detectedCategory = 'Nước hoa & Mỹ phẩm';
    else if (/máy đếm tiền|may dem tien/i.test(unaccented)) detectedCategory = 'Máy đếm tiền';
    else if (categoryDomainName) detectedCategory = categoryDomainName;

    // Check broad general question with NO product or category (Bước 1: hỏi khách cần mua loại hàng nào)
    const isGenericProduct = !explicitProduct || /^(hàng|hang|sản phẩm|san pham|đồ|do)$/i.test(explicitProduct.trim());
    const combinedMsg = (message + ' ' + unaccented).toLowerCase();
    if (!detectedCategory && isGenericProduct && !explicitModel && !budget && !isViewAll) {
      if (/(cần mua|can mua|muốn mua|muon mua|tư vấn mua|tu van mua|tư vấn sản phẩm|tu van san pham|tư vấn hàng|tu van hang|bán gì|ban gi|có gì bán|co gi ban|xem hàng|xem hang|mua đồ|mua do|tìm hàng|tim hang|mua hàng|mua hang|shop có gì|shop co gi)/i.test(combinedMsg)) {
        return ResponseEngine.formatResponse({
          replyText: `Dạ chào bạn! Hiện tại shop đang cung cấp đầy đủ các dòng sản phẩm chất lượng chính hãng:\n\n` +
            `• 💻 **Thiết bị công nghệ:** Laptop doanh nhân (Lenovo ThinkPad, Dell, Asus), PC để bàn, Màn hình vi tính.\n` +
            `• 🖨️ **Thiết bị văn phòng:** Máy in Brother siêu tốc in 2 mặt, Máy scan tài liệu, Máy đếm tiền.\n` +
            `• 🍵 **Trà & Cà phê thượng hạng:** Trà Oolong tinh tuyển (Bích Thủy, Hoàng Tỳ), Cà phê rang mộc nguyên chất.\n` +
            `• ✨ **Nước hoa & Mỹ phẩm cao cấp:** Hương thơm thanh lịch chính hãng.\n\n` +
            `Bạn đang tìm kiếm loại hàng hoặc sản phẩm nào để em tư vấn chi tiết và chính xác nhất cho mình nhé ạ?`,
          revealCatalog: true,
          stage: 'UNCLEAR_NEEDS_INTAKE',
          toolsUsed: ['universal_sales_consultant_intake']
        });
      }
    }

    // Step 2: Check budget inquiry exception rules
    const isSpecificModelInquiry = Boolean(explicitModel || (explicitProduct && /\d+/.test(explicitProduct)));
    const isSpecSearch = this.isSpecSearch(unaccented);
    const hasRefusedBudget = /(không cần ngân sách|khong can ngan sach|tùy ý|cứ chọn mẫu tốt|mẫu nào ngon|mẫu tốt nhất|không quan trọng giá)\b/i.test(unaccented);

    // Mandatory Rule: If customer has NOT provided budget and consulting depends on budget, ask exact sentence:
    // "Dạ anh/chị dự kiến ngân sách khoảng bao nhiêu để em lựa chọn những sản phẩm phù hợp nhất ạ?"
    if (!budget && !isSpecificModelInquiry && !isSpecSearch && !hasRefusedBudget && !isViewAll && detectedCategory) {
      const sampleProds = allProducts.filter(p => (p.field || '').toUpperCase().includes(detectedCategory.toUpperCase())).slice(0, 2);
      const sampleNames = sampleProds.map(p => `**${p.name}** (${this.formatPrice(p.price)})`).join(', ');
      const referenceNote = sampleNames ? ` (Hiện tại shop có sẵn các dòng từ phân khúc phổ thông đến cao cấp như ${sampleNames})` : '';

      return ResponseEngine.formatResponse({
        replyText: `Dạ, để em có thể lọc ra các mẫu **${detectedCategory}** phù hợp tối ưu nhất với nhu cầu sử dụng của bạn:\n\n` +
          `👉 **Dạ anh/chị dự kiến ngân sách khoảng bao nhiêu để em lựa chọn những sản phẩm phù hợp nhất ạ?**\n\n` +
          `*(Bạn có thể chia sẻ tầm giá mong muốn ví dụ: dưới 15 triệu, từ 20 - 30 triệu, hoặc bất kỳ tiêu chí đặc biệt nào để em hỗ trợ nhé ạ!)${referenceNote}*`,
        revealCatalog: true,
        recommendedField: detectedCategory,
        stage: 'ASKING_BUDGET',
        toolsUsed: ['universal_sales_consultant_budget_inquiry']
      });
    }

    // -------------------------------------------------------------
    // STEP 3: SEARCH AND FILTER PRODUCTS
    // -------------------------------------------------------------
    let candidatePool = allProducts;
    if (detectedCategory) {
      const catMatches = allProducts.filter(p => {
        const fNorm = CrmLeadService.stripDiacritics(p.field || '').toLowerCase();
        const dNorm = CrmLeadService.stripDiacritics(detectedCategory).toLowerCase();
        return fNorm.includes(dNorm) || dNorm.includes(fNorm);
      });
      if (catMatches.length > 0) candidatePool = catMatches;
    }

    const matchedProducts = this.searchAndFilterProducts(candidatePool, {
      category: detectedCategory,
      keyword: explicitProduct || message,
      budget,
      explicitModel
    });

    const totalMatched = matchedProducts.length;

    // -------------------------------------------------------------
    // STEP 4: STRICT LIMIT OF 5 PRODUCTS PER TURN
    // -------------------------------------------------------------
    if (totalMatched === 0) {
      // 0 sản phẩm: Thông báo trung thực, tuyệt đối không bịa
      const catLabel = detectedCategory || 'sản phẩm';
      const budgetLabel = budget?.raw ? ` trong tầm giá **${budget.raw}**` : '';
      return ResponseEngine.formatResponse({
        replyText: `Dạ hiện tại shop chưa tìm thấy mẫu **${catLabel}** nào phù hợp chính xác với tiêu chí${budgetLabel} trong dữ liệu kho hàng ạ.\n\n` +
          `Anh/chị có muốn điều chỉnh lại khoảng ngân sách hoặc tham khảo các mẫu phân khúc tương đương đang có sẵn tại shop không ạ? Em luôn sẵn sàng hỗ trợ kiểm tra nguồn hàng kho cho mình ạ!`,
        revealCatalog: true,
        stage: 'NO_PRODUCT_FOUND',
        toolsUsed: ['universal_sales_consultant_search']
      });
    }

    // Take max 5 products for current turn
    const pageSize = 5;
    const currentBatch = matchedProducts.slice(0, pageSize);
    const hasMore = totalMatched > pageSize;

    // -------------------------------------------------------------
    // STEP 5: FORMAT PRESENTATION (STT, Tên, Mã, Cấu hình, Giá, Lý do)
    // -------------------------------------------------------------
    const formattedBatch = this.formatProductPresentation(currentBatch, 1);

    // Save into ActiveProductContext & recent_products
    for (const p of currentBatch) {
      ActiveProductContext.setActiveProduct(conversationId, p, { status: 'INTRODUCED' });
      ActiveProductContext.updateProductStatus(conversationId, p.id, 'INTRODUCED');
    }

    // Top recommended product for Column 2 synchronization
    const topProduct = currentBatch[0];

    // -------------------------------------------------------------
    // STEP 6 & 7: VIEW ALL / PAGINATION QUESTION
    // -------------------------------------------------------------
    let transitionPrompt = '';
    const catTitle = detectedCategory || 'sản phẩm';

    if (hasMore) {
      // Save pagination state for follow-up "gửi tiếp"
      ActiveProductContext.setPagination(conversationId, {
        matchedProducts,
        pageIndex: 0,
        pageSize: 5,
        totalMatched,
        categoryTitle: catTitle
      });

      transitionPrompt = `\n\n💬 **Anh/chị muốn em gửi tiếp 5 sản phẩm tiếp theo hay muốn em tư vấn sâu hơn những mẫu phù hợp nhất ạ?**`;
    } else {
      ActiveProductContext.clearPagination(conversationId);
      const custRef = customerInfo?.addressing || customerInfo?.name || (customerInfo?.pronoun ? customerInfo.pronoun : 'anh/chị');
      transitionPrompt = `\n\nToàn bộ thông tin chi tiết và hình ảnh thực tế của các sản phẩm đã được mở sẵn ở **Cột 2**, ${customerInfo?.pronoun || 'mình'} có thể xem thêm ở Cột 2 nhé ạ!\n\n${custRef} ưng ý mẫu nào nhất trong danh sách trên để em hỗ trợ tư vấn chi tiết hoặc làm bảng báo giá cho mình nhé ạ!`;
    }

    const budgetPhrase = budget?.target ? ` trong tầm ngân sách **${this.formatPrice(budget.target)}**` : '';
    const custRef = customerInfo?.addressing || customerInfo?.name || (customerInfo?.pronoun ? customerInfo.pronoun : 'anh/chị');
    const introLine = isViewAll
      ? `Dạ ${custRef}, em xin gửi danh sách 5 mẫu **${catTitle}** đầu tiên để ${customerInfo?.pronoun || 'mình'} tham khảo ạ:`
      : `Dạ ${custRef}, em gửi ${customerInfo?.pronoun || 'mình'} danh sách các mẫu **${catTitle}** chất lượng chính hãng tốt nhất${budgetPhrase} tại shop:\n\n`;

    const finalReply = `${introLine}\n\n${formattedBatch}${transitionPrompt}`;

    return ResponseEngine.formatResponse({
      replyText: finalReply,
      revealCatalog: true,
      recommendedField: topProduct?.field || detectedCategory || null,
      recommendedProduct: topProduct || null,
      stage: 'UNIVERSAL_SALES_CONSULTED',
      toolsUsed: ['universal_sales_consultant']
    });
  }
}

export default UniversalSalesConsultant;
