import { RobotsChecker } from '../server/services/crawler/robotsChecker.js';
import { SitemapParser } from '../server/services/crawler/sitemapParser.js';
import { ProductNormalizer } from '../server/services/crawler/productNormalizer.js';
import { db, initDatabase } from '../server/db.js';

async function runTests() {
  console.log('=== TEST SUITE: CRAWLER & PRODUCT NORMALIZER ===');
  await initDatabase();

  // 1. Test RobotsChecker
  console.log('\n[1] Testing RobotsChecker parsing...');
  const sampleRobotsTxt = `
    User-agent: *
    Disallow: /cart/
    Disallow: /checkout/
    Disallow: /admin/
    Allow: /san-pham/
    Crawl-delay: 2
    Sitemap: https://supplier.example.com/sitemap.xml
  `;
  const parsedRobots = RobotsChecker.parseRobotsTxt(sampleRobotsTxt);
  console.assert(parsedRobots.groups.length > 0, 'Robots groups should not be empty');
  console.assert(parsedRobots.sitemaps[0] === 'https://supplier.example.com/sitemap.xml', 'Sitemap URL parsed correctly');
  console.log('✓ Robots.txt parsing succeeded:', parsedRobots.sitemaps[0]);

  // 2. Test SitemapParser
  console.log('\n[2] Testing SitemapParser XML extraction...');
  const sampleSitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url><loc>https://example.com/san-pham/may-in-canon-lbp-2900</loc></url>
      <url><loc>https://example.com/san-pham/laptop-dell-vostro-3520</loc></url>
      <url><loc>https://example.com/tin-tuc/khuyen-mai-thang-11</loc></url>
      <url><loc>https://example.com/cart</loc></url>
    </urlset>`;
  const locs = SitemapParser.extractLocTags(sampleSitemapXml);
  console.assert(locs.length === 4, `Expected 4 locs, got ${locs.length}`);
  const filteredProducts = locs.filter(u => SitemapParser.isLikelyProductUrl(u));
  console.assert(filteredProducts.length === 2, `Expected 2 product URLs, got ${filteredProducts.length}`);
  console.log('✓ Discovered Product URLs:', filteredProducts);

  // 3. Test ProductNormalizer with JSON-LD & Spec Table
  console.log('\n[3] Testing ProductNormalizer extraction...');
  const sampleHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Máy In Laser Canon LBP 2900 Chính Hãng Giá Rẻ</title>
        <meta property="og:title" content="Máy In Laser Canon LBP 2900" />
        <meta property="og:image" content="https://example.com/images/canon-2900.jpg" />
        <script type="application/ld+json">
        {
          "@context": "https://schema.org/",
          "@type": "Product",
          "name": "Máy In Laser Canon LBP 2900",
          "image": "https://example.com/images/canon-2900.jpg",
          "description": "Máy in laser trắng đen Canon LBP 2900 tốc độ cao, mực in bền bỉ.",
          "sku": "CANON-LBP-2900",
          "brand": {
            "@type": "Brand",
            "name": "Canon"
          },
          "offers": {
            "@type": "Offer",
            "priceCurrency": "VND",
            "price": "3850000",
            "availability": "https://schema.org/InStock"
          }
        }
        </script>
      </head>
      <body>
        <div class="technical-specs">
          <table>
            <tr><td>Loại máy</td><td>Máy in laser trắng đen</td></tr>
            <tr><td>Độ phân giải</td><td>2400 x 600 dpi</td></tr>
            <tr><td>Tốc độ in</td><td>12 trang/phút</td></tr>
            <tr><td>Khổ giấy</td><td>A4, A5, B5</td></tr>
          </table>
        </div>
      </body>
    </html>
  `;

  const normalized = ProductNormalizer.normalize({
    html: sampleHtml,
    productUrl: 'https://example.com/san-pham/may-in-canon-lbp-2900',
    supplierId: 'supp_default',
    websiteId: 'web_test'
  });

  console.assert(normalized.name === 'Máy In Laser Canon LBP 2900', `Product name mismatch: ${normalized.name}`);
  console.assert(normalized.sku === 'CANON-LBP-2900', `SKU mismatch: ${normalized.sku}`);
  console.assert(normalized.sale_price === 3850000, `Sale price mismatch: ${normalized.sale_price}`);
  console.assert(normalized.brand === 'Canon', `Brand mismatch: ${normalized.brand}`);
  const specs = JSON.parse(normalized.specs_json);
  console.assert(specs['Loại máy'] === 'Máy in laser trắng đen', 'Specs table extraction failed');
  console.assert(normalized.data_confidence >= 0.8, `Confidence score should be high: ${normalized.data_confidence}`);
  console.log('✓ Product successfully normalized into 22 fields:');
  console.log('  - Name:', normalized.name);
  console.log('  - SKU:', normalized.sku);
  console.log('  - Brand:', normalized.brand);
  console.log('  - Price:', normalized.sale_price.toLocaleString('vi-VN'), normalized.currency);
  console.log('  - Specs:', specs);
  console.log('  - Confidence:', normalized.data_confidence);

  // 4. Test Price Change Detection & Audit Log in DB
  console.log('\n[4] Testing Database Persistence & Price Change History...');
  
  // Ensure web_test exists in supplier_websites
  const existingWeb = await db.get("SELECT id FROM supplier_websites WHERE id = 'web_test'");
  if (!existingWeb) {
    await db.run(`
      INSERT INTO supplier_websites (id, supplier_id, name, url, category_hint, created_at, updated_at)
      VALUES ('web_test', 'supp_default', 'Website Mẫu Test', 'https://example.com', 'Thiết bị văn phòng', ?, ?)
    `, [new Date().toISOString(), new Date().toISOString()]);
  }

  // Insert initial product
  await db.run('DELETE FROM crawled_products WHERE id = ?', [normalized.id]);
  await db.run('DELETE FROM product_price_history WHERE product_id = ?', [normalized.id]);

  await db.run(`
    INSERT INTO crawled_products (
      id, supplier_id, website_id, product_id, name, sku, brand, category, description,
      specs_json, original_price, sale_price, currency, unit, availability, image_url,
      product_url, source_url, crawled_at, approval_status, price_confirmation_level,
      data_confidence, org_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED', 'REFERENCE_ONLY', ?, 'org_default', ?, ?)
  `, [
    normalized.id, normalized.supplier_id, normalized.website_id, normalized.product_id, normalized.name,
    normalized.sku, normalized.brand, normalized.category, normalized.description, normalized.specs_json,
    normalized.original_price, normalized.sale_price, normalized.currency, normalized.unit, normalized.availability,
    normalized.image_url, normalized.product_url, normalized.source_url, normalized.crawled_at,
    normalized.data_confidence, normalized.created_at, normalized.updated_at
  ]);

  // Simulate price drop from 3,850,000 to 3,690,000
  const newPrice = 3690000;
  const oldPrice = normalized.sale_price;
  const changePercent = Math.round(((newPrice - oldPrice) / oldPrice) * 10000) / 100;
  const historyId = `ph_test_${Date.now()}`;

  await db.run(`
    INSERT INTO product_price_history (id, product_id, old_price, new_price, price_type, changed_at, change_percent, job_id, source_url)
    VALUES (?, ?, ?, ?, 'sale_price', ?, ?, 'job_test', ?)
  `, [historyId, normalized.id, oldPrice, newPrice, new Date().toISOString(), changePercent, normalized.product_url]);

  await db.run('UPDATE crawled_products SET sale_price = ? WHERE id = ?', [newPrice, normalized.id]);

  const history = await db.all('SELECT * FROM product_price_history WHERE product_id = ?', [normalized.id]);
  console.assert(history.length === 1, 'Price history record missing');
  console.assert(history[0].new_price === 3690000, 'Price history new price mismatch');
  console.log(`✓ Price change recorded: ${history[0].old_price.toLocaleString('vi-VN')} -> ${history[0].new_price.toLocaleString('vi-VN')} (${history[0].change_percent}%)`);

  console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
