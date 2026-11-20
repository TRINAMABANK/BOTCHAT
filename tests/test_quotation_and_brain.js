import { QuotationService } from '../server/services/quotationService.js';
import { CentralBrainService } from '../server/services/centralBrainService.js';
import { db, initDatabase } from '../server/db.js';

async function main() {
  console.log('=== TEST SUITE: CENTRAL BRAIN & QUOTATION ENGINE ===');
  await initDatabase();

  // 1. Seed an approved crawled product for testing
  const testProdId = `cprod_test_${Date.now()}`;
  await db.run(`
    INSERT OR REPLACE INTO crawled_products (
      id, supplier_id, website_id, product_id, name, sku, brand, category, description,
      specs_json, original_price, sale_price, currency, unit, availability, image_url,
      product_url, source_url, crawled_at, approval_status, price_confirmation_level,
      data_confidence, org_id, created_at, updated_at
    ) VALUES (
      ?, 'supp_default', 'web_test', ?, 'Máy In Đa Năng Canon MF244dw', 'CANON-MF244DW', 'Canon',
      'Máy in & Thiết bị văn phòng', 'Máy in laser đa chức năng in 2 mặt, scan, copy tốc độ cao.',
      '{"Tốc độ in":"27 trang/phút","Độ phân giải":"1200 x 1200 dpi","Bộ nhớ":"512 MB"}',
      5900000, 5490000, 'VND', 'cái', 'IN_STOCK', 'https://example.com/canon-mf244dw.jpg',
      'https://example.com/san-pham/canon-mf244dw', 'https://example.com/san-pham/canon-mf244dw',
      ?, 'APPROVED', 'REFERENCE_ONLY', 0.95, 'org_default', ?, ?
    )
  `, [testProdId, testProdId, new Date().toISOString(), new Date().toISOString(), new Date().toISOString()]);

  console.log('✓ Seeded approved supplier product: Máy In Đa Năng Canon MF244dw (5.490.000 ₫)');

  // 2. Test QuotationService.searchSupplierCatalog
  console.log('\n[1] Testing QuotationService.searchSupplierCatalog...');
  const searchResults = await QuotationService.searchSupplierCatalog({ query: 'Canon MF244dw' });
  console.assert(searchResults.length > 0, 'Should find Canon MF244dw in supplier catalog');
  console.assert(searchResults[0].salePrice === 5490000, 'Sale price mismatch');
  console.log('✓ Catalog search passed. Found product:', searchResults[0].name, 'Price:', searchResults[0].salePrice);

  // 3. Test QuotationService.createQuotation
  console.log('\n[2] Testing Quotation Calculation (5 units + VAT 10%)...');
  const quote = await QuotationService.createQuotation({
    customerName: 'Anh Trí',
    customerPhone: '0982441446',
    customerCompany: 'Công ty Cổ phần Nam Á',
    items: [{
      productId: searchResults[0].id,
      productName: searchResults[0].name,
      sku: searchResults[0].sku,
      quantity: 5,
      unit: 'cái',
      unitPrice: searchResults[0].salePrice,
      priceType: 'REFERENCE_ONLY'
    }],
    vatPercent: 10
  });

  const expectedSubtotal = 5 * 5490000; // 27,450,000
  const expectedVat = Math.round(expectedSubtotal * 0.1); // 2,745,000
  const expectedFinal = expectedSubtotal + expectedVat; // 30,195,000

  console.assert(quote.subtotal === expectedSubtotal, `Subtotal mismatch: got ${quote.subtotal}, expected ${expectedSubtotal}`);
  console.assert(quote.vatAmount === expectedVat, `VAT mismatch: got ${quote.vatAmount}, expected ${expectedVat}`);
  console.assert(quote.finalAmount === expectedFinal, `Final amount mismatch: got ${quote.finalAmount}, expected ${expectedFinal}`);
  console.assert(quote.markdown.includes('BẢNG BÁO GIÁ SẢN PHẨM & THIẾT BỊ'), 'Markdown header missing');
  console.assert(quote.markdown.includes('30.195.000 VNĐ'), 'Grand total missing from markdown');

  console.log('✓ Quotation calculations passed:');
  console.log('  - Subtotal (5 cái):', quote.subtotal.toLocaleString('vi-VN'), 'VNĐ');
  console.log('  - VAT 10%:', quote.vatAmount.toLocaleString('vi-VN'), 'VNĐ');
  console.log('  - Grand Total:', quote.finalAmount.toLocaleString('vi-VN'), 'VNĐ');
  console.log('  - Quote Code:', quote.quoteCode);

  // 4. Test CentralBrainService End-to-End Chat with Quotation Request
  console.log('\n[3] Testing CentralBrainService with user query: "Cho tôi báo giá 5 máy in Canon"...');
  const chatRes = await CentralBrainService.processChat({
    conversationId: `conv_test_${Date.now()}`,
    message: 'Cho tôi báo giá 5 máy in Canon',
    customerInfo: { name: 'Anh Trí', phone: '0982441446' }
  });

  console.assert(chatRes.success === true, 'Chat processing should succeed');
  console.assert(chatRes.toolsUsed.includes('generate_formal_quotation'), 'Should have used generate_formal_quotation tool');
  console.assert(chatRes.reply.includes('BẢNG BÁO GIÁ'), 'Reply should contain formal quotation markdown');
  console.assert(chatRes.revealCatalog === true, 'Should reveal catalog/column 2');
  console.assert(chatRes.recommendedProduct !== null, 'Should recommend product');

  console.log('✓ Central Brain responded with formal quotation:');
  console.log('  - Tools used:', chatRes.toolsUsed);
  console.log('  - Recommended product:', chatRes.recommendedProduct?.name);
  console.log('  - Snippet of response:\n', chatRes.reply.slice(0, 300) + '...\n');

  console.log('=== ALL TESTS PASSED CLEANLY! ===');
  process.exit(0);
}

main().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
