/**
 * TRÍ AI ULTIMATE ROBOT - FORMAL QUOTATION SERVICE
 * Generates enterprise-grade quotations, calculates line items, VAT,
 * and maintains strict distinction between Reference vs Verified supplier pricing.
 */

import { db } from '../db.js';

export class QuotationService {
  /**
   * Search approved crawled supplier products
   */
  static async searchSupplierCatalog({ query, category, brand, minPrice, maxPrice, limit = 8 }) {
    try {
      let sql = `
        SELECT p.*, s.name as supplier_name, w.name as website_name
        FROM crawled_products p
        JOIN supplier_organizations s ON p.supplier_id = s.id
        JOIN supplier_websites w ON p.website_id = w.id
        WHERE p.approval_status = 'APPROVED'
      `;
      const params = [];

      if (query && query.trim()) {
        const words = query.trim().split(/\s+/).filter(Boolean);
        for (const w of words) {
          sql += ` AND (p.name LIKE ? OR p.sku LIKE ? OR p.brand LIKE ? OR p.description LIKE ? OR p.specs_json LIKE ?)`;
          const param = `%${w}%`;
          params.push(param, param, param, param, param);
        }
      }

      if (category && category.trim()) {
        sql += ` AND p.category LIKE ?`;
        params.push(`%${category.trim()}%`);
      }

      if (brand && brand.trim()) {
        sql += ` AND p.brand LIKE ?`;
        params.push(`%${brand.trim()}%`);
      }

      if (minPrice && !isNaN(minPrice)) {
        sql += ` AND p.sale_price >= ?`;
        params.push(Number(minPrice));
      }

      if (maxPrice && !isNaN(maxPrice)) {
        sql += ` AND p.sale_price <= ?`;
        params.push(Number(maxPrice));
      }

      sql += ` ORDER BY p.data_confidence DESC, p.crawled_at DESC LIMIT ?`;
      params.push(parseInt(limit) || 8);

      const products = await db.all(sql, params);

      return products.map(p => {
        let specs = {};
        try {
          specs = JSON.parse(p.specs_json || '{}');
        } catch (e) {}

        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          brand: p.brand,
          category: p.category,
          specs,
          originalPrice: p.original_price,
          salePrice: p.sale_price,
          currency: p.currency,
          unit: p.unit || 'cái',
          availability: p.availability,
          imageUrl: p.image_url,
          productUrl: p.product_url,
          supplierName: p.supplier_name,
          websiteName: p.website_name,
          priceConfirmationLevel: p.price_confirmation_level, // REFERENCE_ONLY vs SUPPLIER_VERIFIED
          crawledAt: p.crawled_at
        };
      });
    } catch (err) {
      console.error('[QUOTATION SERVICE ERROR] Search failed:', err);
      return [];
    }
  }

  /**
   * Generate formal quotation record & formatted markdown table
   */
  static async createQuotation({
    customerName = 'Quý Khách Hàng',
    customerPhone = '',
    customerEmail = '',
    customerCompany = '',
    conversationId = null,
    items = [],
    vatPercent = 10,
    validDays = 7,
    notes = ''
  }) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Báo giá phải bao gồm ít nhất một sản phẩm');
    }

    const now = new Date();
    const validUntil = new Date(now.getTime() + validDays * 24 * 60 * 60 * 1000).toISOString();
    const quoteCode = `BG-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const quoteId = `quote_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    let subtotal = 0;
    const lineItems = [];
    let hasReferencePrice = false;

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const qty = Math.max(1, parseInt(it.quantity) || 1);
      const unitPrice = parseFloat(it.unitPrice || it.unit_price) || 0;
      const lineTotal = qty * unitPrice;
      subtotal += lineTotal;

      const priceType = it.priceType || it.price_type || 'REFERENCE_ONLY';
      if (priceType === 'REFERENCE_ONLY') {
        hasReferencePrice = true;
      }

      lineItems.push({
        id: `qi_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 5)}`,
        quotation_id: quoteId,
        product_id: it.productId || it.product_id || null,
        product_name: it.productName || it.product_name || `Sản phẩm ${i + 1}`,
        sku: it.sku || '',
        specs_snippet: it.specsSnippet || it.specs_snippet || '',
        quantity: qty,
        unit: it.unit || 'cái',
        unit_price: unitPrice,
        price_type: priceType,
        total_price: lineTotal,
        notes: it.notes || ''
      });
    }

    const vatRate = parseFloat(vatPercent) || 0;
    const vatAmount = Math.round(subtotal * (vatRate / 100));
    const finalAmount = subtotal + vatAmount;

    // Persist header
    await db.run(`
      INSERT INTO quotations (
        id, quote_code, customer_name, customer_phone, customer_email, customer_company,
        conversation_id, total_amount, vat_percent, vat_amount, final_amount,
        status, notes, valid_until, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, 'Central Brain AI', ?, ?)
    `, [
      quoteId, quoteCode, customerName, customerPhone, customerEmail, customerCompany,
      conversationId, subtotal, vatRate, vatAmount, finalAmount,
      notes, validUntil, now.toISOString(), now.toISOString()
    ]);

    // Persist items
    for (const li of lineItems) {
      await db.run(`
        INSERT INTO quotation_items (
          id, quotation_id, product_id, product_name, sku, specs_snippet,
          quantity, unit, unit_price, price_type, total_price, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        li.id, li.quotation_id, li.product_id, li.product_name, li.sku, li.specs_snippet,
        li.quantity, li.unit, li.unit_price, li.price_type, li.total_price, li.notes
      ]);
    }

    // Format Markdown Table
    const markdown = QuotationService.formatQuotationMarkdown({
      quoteCode,
      customerName,
      customerCompany,
      customerPhone,
      lineItems,
      subtotal,
      vatPercent: vatRate,
      vatAmount,
      finalAmount,
      validUntil,
      hasReferencePrice,
      notes
    });

    return {
      quoteId,
      quoteCode,
      customerName,
      subtotal,
      vatPercent: vatRate,
      vatAmount,
      finalAmount,
      validUntil,
      hasReferencePrice,
      items: lineItems,
      markdown
    };
  }

  /**
   * Format executive Markdown Table for chat response
   */
  static formatQuotationMarkdown({
    quoteCode,
    customerName,
    customerCompany,
    customerPhone,
    lineItems,
    subtotal,
    vatPercent,
    vatAmount,
    finalAmount,
    validUntil,
    hasReferencePrice,
    notes
  }) {
    const validDateFormatted = new Date(validUntil).toLocaleDateString('vi-VN');
    const nowFormatted = new Date().toLocaleDateString('vi-VN');

    let md = `\n### 📋 BẢNG BÁO GIÁ SẢN PHẨM & THIẾT BỊ\n`;
    md += `**Mã Báo Giá:** \`${quoteCode}\` | **Ngày lập:** ${nowFormatted}\n`;
    md += `**Kính gửi:** ${customerName}${customerCompany ? ` - ${customerCompany}` : ''}${customerPhone ? ` (${customerPhone})` : ''}\n`;
    md += `**Hiệu lực báo giá:** 07 ngày (đến hết ngày ${validDateFormatted})\n\n`;

    md += `| STT | Tên Sản Phẩm | Mã Hàng (SKU) | ĐVT | SL | Đơn Giá (VNĐ) | Thành Tiền (VNĐ) | Tình Trạng Giá |\n`;
    md += `| :---: | :--- | :---: | :---: | :---: | ---: | ---: | :---: |\n`;

    lineItems.forEach((it, idx) => {
      const priceBadge = it.price_type === 'SUPPLIER_VERIFIED' ? 'Đã xác nhận' : 'Tham khảo web';
      const unitPriceStr = Number(it.unit_price).toLocaleString('vi-VN');
      const totalPriceStr = Number(it.total_price).toLocaleString('vi-VN');
      md += `| ${idx + 1} | **${it.product_name}**${it.specs_snippet ? `<br><small>_${it.specs_snippet}_</small>` : ''} | \`${it.sku || 'N/A'}\` | ${it.unit} | ${it.quantity} | ${unitPriceStr} | **${totalPriceStr}** | ${priceBadge} |\n`;
    });

    md += `\n`;
    md += `- **Cộng tiền hàng (chưa VAT):** **${Number(subtotal).toLocaleString('vi-VN')} VNĐ**\n`;
    if (vatPercent > 0) {
      md += `- **Thuế GTGT (VAT ${vatPercent}%):** ${Number(vatAmount).toLocaleString('vi-VN')} VNĐ\n`;
    }
    md += `- 💰 **TỔNG CỘNG THANH TOÁN:** **${Number(finalAmount).toLocaleString('vi-VN')} VNĐ**\n\n`;

    if (hasReferencePrice) {
      md += `> ⚠️ **LƯU Ý QUAN TRỌNG VỀ ĐƠN GIÁ:**\n`;
      md += `> Các sản phẩm có tình trạng **"Tham khảo web"** được thu thập tự động từ website bán hàng của nhà cung cấp tại thời điểm mới nhất. Đơn giá chính thức, chương trình chiết khấu số lượng lớn và chi phí vận chuyển sẽ được chuyên viên bán hàng hoặc đối tác xác nhận trước khi phát hành hợp đồng/đơn hàng chính thức.\n`;
    }

    if (notes && notes.trim()) {
      md += `\n**Ghi chú bổ sung:** ${notes.trim()}\n`;
    }

    return md;
  }
}

export default QuotationService;
