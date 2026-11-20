/**
 * TRÍ AI ULTIMATE ROBOT - PRODUCT NORMALIZER
 * Extracts and standardizes product data into the 22-field enterprise schema.
 * Supports JSON-LD Schema.org, OpenGraph, Microdata, and HTML table fallback.
 */

import * as cheerio from 'cheerio';
import crypto from 'crypto';

export class ProductNormalizer {
  /**
   * Clean and parse Vietnamese / International numeric price strings
   * Examples: "15.490.000 ₫", "15,490,000 VND", "15490000", "Liên hệ"
   */
  static cleanPrice(priceInput) {
    if (typeof priceInput === 'number') return priceInput;
    if (!priceInput || typeof priceInput !== 'string') return 0;

    const lower = priceInput.toLowerCase().trim();
    if (lower.includes('liên hệ') || lower.includes('contact') || lower.includes('hết hàng') || lower.includes('call')) {
      return 0;
    }

    // Remove currency symbols and non-digits except dots and commas
    const cleaned = priceInput.replace(/[^\d.,]/g, '').trim();
    if (!cleaned) return 0;

    // Handle Vietnamese format (e.g. 15.000.000 or 15,000,000)
    // If multiple dots/commas exist, remove all separators
    if ((cleaned.match(/[.,]/g) || []).length > 1) {
      return parseFloat(cleaned.replace(/[.,]/g, '')) || 0;
    }

    // If single dot/comma:
    // If 3 digits after separator (e.g. 15.000), it's thousands separator
    if (/^[0-9]+[.,][0-9]{3}$/.test(cleaned)) {
      return parseFloat(cleaned.replace(/[.,]/g, '')) || 0;
    }

    // Decimal float
    return parseFloat(cleaned.replace(',', '.')) || 0;
  }

  /**
   * Extract JSON-LD objects from HTML
   */
  static extractJsonLd($) {
    const jsonLdObjects = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const text = $(el).html();
        if (!text) return;
        const parsed = JSON.parse(text.trim());
        if (Array.isArray(parsed)) {
          jsonLdObjects.push(...parsed);
        } else if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
          jsonLdObjects.push(...parsed['@graph']);
        } else {
          jsonLdObjects.push(parsed);
        }
      } catch (e) {
        // Ignore invalid JSON-LD script blocks
      }
    });

    // Find Product type
    return jsonLdObjects.find(obj => {
      const type = obj['@type'];
      if (!type) return false;
      if (Array.isArray(type)) return type.includes('Product');
      return type.toLowerCase() === 'product';
    });
  }

  /**
   * Extract technical specifications from tables or dl lists
   */
  static extractSpecs($, container) {
    const specs = {};
    const scope = container ? $(container) : $('body');

    // 1. Table rows with 2 columns
    scope.find('table tr').each((_, tr) => {
      const cells = $(tr).find('td, th');
      if (cells.length === 2) {
        const key = $(cells[0]).text().trim().replace(/[:：]/g, '');
        const val = $(cells[1]).text().trim();
        if (key && val && key.length < 100 && val.length < 500) {
          specs[key] = val;
        }
      }
    });

    // 2. Definition lists <dl><dt>..<dd>..
    scope.find('dl').each((_, dl) => {
      let currentDt = '';
      $(dl).children().each((_, child) => {
        if (child.tagName === 'dt') {
          currentDt = $(child).text().trim().replace(/[:：]/g, '');
        } else if (child.tagName === 'dd' && currentDt) {
          specs[currentDt] = $(child).text().trim();
          currentDt = '';
        }
      });
    });

    // 3. Common eCommerce spec-box list items (.spec-item, .thong-so li)
    scope.find('.technical-specs li, .thong-so-ky-thuat li, .specifications li').each((_, li) => {
      const text = $(li).text().trim();
      if (text.includes(':')) {
        const parts = text.split(':');
        const key = parts[0].trim();
        const val = parts.slice(1).join(':').trim();
        if (key && val && !specs[key]) {
          specs[key] = val;
        }
      }
    });

    return specs;
  }

  /**
   * Normalize an HTML page into a standard Crawled Product record
   */
  static normalize({ html, productUrl, supplierId = 'supp_default', websiteId = 'web_default', categoryHint = '' }) {
    const $ = cheerio.load(html);
    const jsonLd = ProductNormalizer.extractJsonLd($);

    // 1. Identification
    const urlHash = crypto.createHash('md5').update(productUrl).digest('hex').substring(0, 16);
    const productId = `cprod_${urlHash}`;

    // 2. Product Name
    let name = '';
    if (jsonLd && jsonLd.name) {
      name = jsonLd.name;
    } else {
      const h1Text = $('h1.product-title, h1.product_title, h1.entry-title, h1').first().text().trim();
      const ogTitle = $('meta[property="og:title"]').attr('content');
      name = h1Text || ogTitle || $('title').text().trim().split(/[-|–]/)[0].trim();
    }

    // 3. SKU
    let sku = '';
    if (jsonLd && (jsonLd.sku || jsonLd.mpn)) {
      sku = jsonLd.sku || jsonLd.mpn;
    } else {
      sku = $('meta[property="product:retailer_item_id"]').attr('content') ||
            $('[itemprop="sku"]').text().trim() ||
            $('.sku, .product-sku, [data-sku]').first().text().replace(/sku:?/i, '').trim() ||
            `SKU-${urlHash.substring(0, 8).toUpperCase()}`;
    }

    // 4. Brand
    let brand = '';
    if (jsonLd && jsonLd.brand) {
      brand = typeof jsonLd.brand === 'object' ? jsonLd.brand.name : jsonLd.brand;
    } else {
      brand = $('meta[property="product:brand"]').attr('content') ||
              $('meta[name="brand"]').attr('content') ||
              $('[itemprop="brand"]').text().trim() ||
              $('.brand, .product-brand').first().text().trim() ||
              'Chính hãng';
    }

    // 5. Category
    let category = categoryHint || '';
    if (!category && jsonLd && jsonLd.category) {
      category = jsonLd.category;
    }
    if (!category) {
      // Breadcrumbs
      const breadcrumbs = [];
      $('.breadcrumb a, .breadcrumbs a, [aria-label="breadcrumb"] a').each((_, el) => {
        const text = $(el).text().trim();
        if (text && !text.toLowerCase().includes('trang chủ') && !text.toLowerCase().includes('home')) {
          breadcrumbs.push(text);
        }
      });
      if (breadcrumbs.length > 0) {
        category = breadcrumbs[breadcrumbs.length - 1];
      } else {
        category = 'Sản phẩm tiêu biểu';
      }
    }

    // 6. Description
    let description = '';
    if (jsonLd && jsonLd.description) {
      description = jsonLd.description;
    } else {
      description = $('meta[property="og:description"]').attr('content') ||
                    $('meta[name="description"]').attr('content') ||
                    $('.product-description, .product-short-description, #tab-description').first().text().trim() ||
                    '';
    }
    // Clean up excessive whitespace
    description = description.replace(/\s+/g, ' ').trim().substring(0, 1500);

    // 7. Specifications
    let specs = {};
    if (jsonLd && Array.isArray(jsonLd.additionalProperty)) {
      jsonLd.additionalProperty.forEach(prop => {
        if (prop.name && prop.value) {
          specs[prop.name] = prop.value;
        }
      });
    }
    const htmlSpecs = ProductNormalizer.extractSpecs($, '.technical-specs, .thong-so-ky-thuat, .specifications, #tab-specification, table');
    specs = { ...htmlSpecs, ...specs };

    // 8. Prices (Original Price and Sale Price)
    let originalPrice = 0;
    let salePrice = 0;
    let currency = 'VND';
    let availability = 'IN_STOCK';

    if (jsonLd && jsonLd.offers) {
      const offers = Array.isArray(jsonLd.offers) ? jsonLd.offers[0] : jsonLd.offers;
      if (offers) {
        salePrice = ProductNormalizer.cleanPrice(offers.price || offers.lowPrice);
        currency = offers.priceCurrency || 'VND';
        if (offers.availability) {
          const availStr = offers.availability.toLowerCase();
          if (availStr.includes('outofstock') || availStr.includes('discontinued')) {
            availability = 'OUT_OF_STOCK';
          }
        }
      }
    }

    // Fallback or verify with HTML price tags
    if (salePrice === 0) {
      const metaPrice = $('meta[property="product:price:amount"]').attr('content') ||
                        $('meta[property="og:price:amount"]').attr('content');
      if (metaPrice) {
        salePrice = ProductNormalizer.cleanPrice(metaPrice);
      }
    }

    // Try HTML DOM for regular and sale price
    const delPriceText = $('del .amount, .old-price, .original-price, .regular-price').first().text().trim();
    if (delPriceText) {
      originalPrice = ProductNormalizer.cleanPrice(delPriceText);
    }

    const insPriceText = $('ins .amount, .special-price, .sale-price, .current-price, .price').first().text().trim();
    if (insPriceText) {
      const parsedIns = ProductNormalizer.cleanPrice(insPriceText);
      if (parsedIns > 0) {
        salePrice = parsedIns;
      }
    }

    if (originalPrice === 0 && salePrice > 0) {
      originalPrice = salePrice;
    } else if (originalPrice > 0 && salePrice === 0) {
      salePrice = originalPrice;
    }

    if (salePrice === 0) {
      availability = 'CONTACT';
    }

    // 9. Image URL
    let imageUrl = '';
    if (jsonLd && jsonLd.image) {
      imageUrl = Array.isArray(jsonLd.image) ? jsonLd.image[0] : (typeof jsonLd.image === 'object' ? jsonLd.image.url : jsonLd.image);
    }
    if (!imageUrl) {
      imageUrl = $('meta[property="og:image"]').attr('content') ||
                 $('meta[name="twitter:image"]').attr('content') ||
                 $('.woocommerce-product-gallery__image img, .product-image img, .main-image img').first().attr('src') ||
                 $('img[src*="product"], img[src*="san-pham"]').first().attr('src') ||
                 '';
    }
    // Handle relative image URLs
    if (imageUrl && !imageUrl.startsWith('http')) {
      try {
        imageUrl = new URL(imageUrl, productUrl).href;
      } catch (e) {}
    }

    // 10. Data Confidence Score
    let confidence = 0.3;
    if (name && name.length > 5) confidence += 0.2;
    if (salePrice > 0) confidence += 0.2;
    if (imageUrl && imageUrl.startsWith('http')) confidence += 0.1;
    if (Object.keys(specs).length > 0) confidence += 0.1;
    if (brand && brand !== 'Chính hãng') confidence += 0.05;
    if (sku && !sku.startsWith('SKU-')) confidence += 0.05;
    confidence = Math.min(1.0, Math.round(confidence * 100) / 100);

    const now = new Date().toISOString();

    return {
      id: productId,
      supplier_id: supplierId,
      website_id: websiteId,
      product_id: productId,
      name: name || 'Sản phẩm chưa đặt tên',
      sku: sku || `SKU-${urlHash.substring(0, 8).toUpperCase()}`,
      brand: brand || 'Chính hãng',
      category: category || 'Sản phẩm tiêu biểu',
      description: description || name,
      specs_json: JSON.stringify(specs),
      original_price: originalPrice,
      sale_price: salePrice,
      currency: currency.toUpperCase() === 'VND' || currency === 'VNĐ' ? 'VND' : currency,
      unit: 'cái',
      availability,
      image_url: imageUrl,
      product_url: productUrl,
      source_url: productUrl,
      crawled_at: now,
      verified_at: null,
      approval_status: 'PENDING',
      price_confirmation_level: 'REFERENCE_ONLY',
      data_confidence: confidence,
      org_id: 'org_default',
      notes: null,
      created_at: now,
      updated_at: now
    };
  }
}

export default ProductNormalizer;
