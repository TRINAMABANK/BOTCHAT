import dotenv from 'dotenv';
dotenv.config();

/**
 * Clean and strip noisy HTML to extract readable text and meta tags.
 */
export function extractTextAndMetaFromHtml(html, sourceUrl = '') {
  if (!html || typeof html !== 'string') {
    return { title: '', metaDesc: '', ogImage: '', text: '', sourceUrl };
  }

  // 1. Title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';

  // 2. Meta Description
  const metaDescMatch =
    html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ||
    html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
    html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i);
  const metaDesc = metaDescMatch ? metaDescMatch[1].trim() : '';

  // 3. OpenGraph / Product Image
  const ogImgMatch =
    html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
    html.match(/<meta\s+name=["']og:image["']\s+content=["']([^"']+)["']/i) ||
    html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);
  let ogImage = ogImgMatch ? ogImgMatch[1].trim() : '';
  if (ogImage && !ogImage.startsWith('http') && sourceUrl) {
    try {
      ogImage = new URL(ogImage, sourceUrl).href;
    } catch (e) {}
  }

  // 4. Strip scripts, styles, noscript, svg, navigation, footer, header to focus on product content
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

  // Strip all HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#\d+;/g, ' ');

  // Normalize excessive spaces
  text = text.replace(/\s+/g, ' ').trim();

  return {
    title,
    metaDesc,
    ogImage,
    text: text.slice(0, 16000), // Keep up to 16,000 characters of clean content
    sourceUrl
  };
}

/**
 * Call Google Gemini REST API using Native generateContent endpoint.
 */
export async function callGemini(promptOrContents, options = {}) {
  const apiKey =
    options.apiKey ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY;

  if (!apiKey || apiKey.includes('your_') || apiKey.trim().length < 8) {
    return null;
  }

  const requestedModel = options.model || process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
  const temperature = options.temperature !== undefined ? options.temperature : 0.4;
  const maxOutputTokens = options.maxOutputTokens || 2048;
  const jsonMode = Boolean(options.jsonMode);

  // Normalize contents structure
  let contents = [];
  let systemInstruction = null;

  if (typeof promptOrContents === 'string') {
    contents = [{ role: 'user', parts: [{ text: promptOrContents }] }];
  } else if (Array.isArray(promptOrContents)) {
    // Check if system message exists
    const sysMsg = promptOrContents.find((m) => m.role === 'system');
    if (sysMsg) {
      systemInstruction = { parts: [{ text: sysMsg.content }] };
    }
    const nonSys = promptOrContents.filter((m) => m.role !== 'system');
    contents = nonSys.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));
  }

  const bodyPayload = {
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens
    }
  };

  if (systemInstruction) {
    bodyPayload.system_instruction = systemInstruction;
  }

  if (jsonMode) {
    bodyPayload.generationConfig.responseMimeType = 'application/json';
  }

  // Fallback candidate list to automatically handle model deprecation (404) or overload (503)
  const candidateModels = [
    requestedModel,
    'gemini-flash-lite-latest',
    'gemini-3.5-flash-lite',
    'gemini-flash-latest',
    'gemini-3.7-flash',
    'gemini-3.8-flash',
    'gemini-pro-latest'
  ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

  let lastError = null;
  for (const model of candidateModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });

      if (!res.ok) {
        const errText = await res.text();
        if (res.status === 404 || res.status === 503) {
          console.warn(`[GEMINI API] Model "${model}" returned HTTP ${res.status}. Auto-trying next candidate model...`);
          lastError = new Error(`Google Gemini API (${model}) HTTP ${res.status}: ${errText}`);
          continue;
        }
        throw new Error(`Google Gemini API (${model}) HTTP ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const candidate = data.candidates?.[0];
      const textOutput = candidate?.content?.parts?.[0]?.text || null;
      if (textOutput !== null) {
        return textOutput;
      }
    } catch (err) {
      lastError = err;
      if (err.message?.includes('HTTP 404') || err.message?.includes('HTTP 503')) {
        continue;
      }
      throw err;
    }
  }

  if (lastError) {
    throw lastError;
  }
  return null;
}

/**
 * Test connectivity with Google Gemini API.
 */
export async function testGeminiConnection(apiKey, model = 'gemini-flash-lite-latest') {
  if (!apiKey || apiKey.trim().length < 8) {
    throw new Error('API Key của Google Gemini không được để trống hoặc quá ngắn.');
  }

  const testPrompt = 'Hãy trả lời chính xác từ: "KẾT NỐI GEMINI THÀNH CÔNG"';
  const reply = await callGemini(testPrompt, { apiKey: apiKey.trim(), model, temperature: 0.1 });
  if (!reply) {
    throw new Error('Không nhận được phản hồi từ Google Gemini API.');
  }
  return { success: true, reply: reply.trim(), model };
}

/**
 * Analyze product and price from webpage text using Google Gemini AI with smart heuristic fallback.
 */
export async function analyzeProductFromWebpage(html, sourceUrl, options = {}) {
  const { title, metaDesc, ogImage, text } = extractTextAndMetaFromHtml(html, sourceUrl);

  const apiKey =
    options.apiKey ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY;

  const model = options.model || process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';

  if (apiKey && apiKey.trim().length > 10 && !apiKey.includes('your_')) {
    try {
      const prompt = `
Bạn là chuyên gia phân tích dữ liệu sản phẩm thương mại điện tử và trợ lý bán hàng xuất sắc.
Hãy phân tích nội dung trang web sản phẩm dưới đây và trích xuất thông tin sản phẩm đầy đủ, chuẩn xác nhất thành định dạng JSON.

ĐƯỜNG DẪN NGUỒN: ${sourceUrl}
TIÊU ĐỀ TRANG: ${title}
MÔ TẢ META: ${metaDesc}
NỘI DUNG VĂN BẢN TRANG WEB:
"""
${text.slice(0, 12000)}
"""

YÊU CẦU ĐỊNH DẠNG ĐẦU RA (JSON BẮT BUỘC):
{
  "name": "Tên thương mại đầy đủ và chuẩn xác của sản phẩm (viết hoa các chữ cái đầu, ví dụ: 'Máy đếm tiền Xinda Super 2026')",
  "field": "Lĩnh vực / Danh mục sản phẩm tổng quát (chọn 1 lĩnh vực phù hợp nhất, ví dụ: 'Máy đếm tiền', 'Thiết bị văn phòng', 'Laptop & Công nghệ', 'Két sắt thông minh', 'Trà cao cấp', 'Gia dụng')",
  "group_name": "Nhóm sản phẩm / Phân khúc (ví dụ: 'Dòng máy phát hiện tiền giả siêu chuẩn', 'Phân khúc cao cấp ngân hàng', 'Thiết bị văn phòng chuyên dụng')",
  "price": 0, // Số nguyên giá bán VND (ví dụ: 6500000). Nếu không tìm thấy giá rõ ràng thì để 0 (sẽ hiển thị là Liên hệ)
  "price_formatted": "Giá hiển thị tiếng Việt (ví dụ: '6.500.000 ₫' hoặc 'Liên hệ')",
  "description": "Mô tả bán hàng hấp dẫn, chuyên nghiệp từ 2-4 câu làm nổi bật công năng, lợi ích và giá trị cho khách hàng",
  "specs_json": {
    "Thuộc tính 1": "Giá trị 1",
    "Thuộc tính 2": "Giá trị 2"
  },
  "key_highlights": [
    "Điểm mạnh nổi bật 1",
    "Điểm mạnh nổi bật 2",
    "Điểm mạnh nổi bật 3"
  ],
  "image_url": "${ogImage || ''}"
}
`;

      const jsonStr = await callGemini(prompt, {
        apiKey,
        model,
        temperature: 0.2,
        jsonMode: true
      });

      if (jsonStr) {
        // Strip markdown code fence if Gemini returned it despite jsonMode
        const cleanJsonStr = jsonStr.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
        const parsed = JSON.parse(cleanJsonStr);

        // Sanitize numbers and fallback
        const priceNum = parseInt(parsed.price, 10) || 0;
        return {
          sourceUrl,
          name: parsed.name || title || 'Sản phẩm mới',
          field: parsed.field || 'Thiết bị & Sản phẩm',
          group_name: parsed.group_name || 'Sản phẩm chọn lọc',
          price: priceNum,
          price_formatted: priceNum > 0 ? `${priceNum.toLocaleString('vi-VN')} ₫` : (parsed.price_formatted || 'Liên hệ'),
          description: parsed.description || metaDesc || 'Sản phẩm chất lượng cao chính hãng.',
          specs_json: parsed.specs_json || {},
          key_highlights: Array.isArray(parsed.key_highlights) ? parsed.key_highlights : [],
          image_url: parsed.image_url || ogImage || '/assets/machine_2166.png',
          analyzed_by: `Google Gemini (${model})`
        };
      }
    } catch (err) {
      console.error('[GEMINI ANALYZE ERROR] Fallback to smart heuristic parser:', err.message);
    }
  }

  // Smart Heuristic Fallback (Runs if no Gemini key or network fails)
  return heuristicProductAnalysis({ title, metaDesc, ogImage, text, sourceUrl });
}

/**
 * Rule-based heuristic extractor when LLM is unavailable.
 */
function heuristicProductAnalysis({ title, metaDesc, ogImage, text, sourceUrl }) {
  // Extract candidate name from title
  let name = (title || '').split(/[-|–—]/)[0].trim();
  if (!name || name.length < 3) name = 'Sản phẩm nhập từ Website';

  // Extract candidate price (e.g. 7.200.000, 6,500,000 đ, VND)
  let price = 0;
  const priceMatch = (text + ' ' + title).match(
    /\b(\d{1,3}(?:[.,]\d{3}){1,3})\s*(?:đ|vnd|đồng|d)?\b/i
  );
  if (priceMatch) {
    const rawDigits = priceMatch[1].replace(/[.,]/g, '');
    const num = parseInt(rawDigits, 10);
    if (num >= 10000 && num <= 5000000000) {
      price = num;
    }
  }

  // Detect field / category
  const lower = (name + ' ' + text).toLowerCase();
  let field = 'Sản phẩm công nghệ';
  let group_name = 'Phổ thông';

  if (lower.includes('dem tien') || lower.includes('đếm tiền')) {
    field = 'Máy đếm tiền';
    group_name = 'Dòng máy phát hiện tiền giả';
  } else if (lower.includes('laptop') || lower.includes('may tinh') || lower.includes('máy tính')) {
    field = 'Laptop & Công nghệ';
    group_name = 'Laptop hiệu năng cao';
  } else if (lower.includes('ket sat') || lower.includes('két sắt')) {
    field = 'Két sắt thông minh';
    group_name = 'Két sắt bảo mật vân tay';
  } else if (lower.includes('may in') || lower.includes('máy in')) {
    field = 'Thiết bị văn phòng';
    group_name = 'Máy in & photocopy';
  } else if (lower.includes('tra') || lower.includes('trà')) {
    field = 'Trà đạo thượng hạng';
    group_name = 'Trà biếu cao cấp';
  }

  const desc = metaDesc || `Sản phẩm chính hãng ${name}, chất lượng bảo đảm, chế độ bảo hành uy tín.`;

  return {
    sourceUrl,
    name,
    field,
    group_name,
    price,
    price_formatted: price > 0 ? `${price.toLocaleString('vi-VN')} ₫` : 'Liên hệ',
    description: desc,
    specs_json: {
      'Nguồn gốc': 'Nhập khẩu chính hãng',
      'Tình trạng': 'Mới 100% nguyên hộp',
      'Bảo hành': '12 - 24 tháng tận nơi'
    },
    key_highlights: [
      'Chính hãng 100%, nguyên tem niêm phong',
      'Hỗ trợ giao hàng và hướng dẫn sử dụng tận nơi',
      'Được kiểm duyệt chất lượng nghiêm ngặt'
    ],
    image_url: ogImage || '/assets/machine_2166.png',
    analyzed_by: 'Heuristic Smart Parser (Nhập API Key để mở khóa Gemini AI)'
  };
}
