import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import db, { initDatabase } from './db.js';
import SalesEngine from './salesEngine.js';
import { testGeminiConnection, analyzeProductFromWebpage } from './geminiService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middleware
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true, limit: '8mb' }));

// Persistent local uploads directory served directly at /uploads
const uploadsDir = path.resolve(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Anti-tamper & Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// -----------------------------------------------------------------------------
// 1. HEALTH & SYSTEM STATUS
// -----------------------------------------------------------------------------
app.get('/api/health', async (req, res) => {
  try {
    const leadCount = await db.get('SELECT COUNT(*) as count FROM leads');
    const productCount = await db.get('SELECT COUNT(*) as count FROM products');
    res.json({
      success: true,
      status: 'ONLINE',
      system: 'TRÍ AI Humanoid Sales Bot',
      version: '2027.1.0',
      database: 'Connected (Shared Platform SQLite)',
      leadsCount: leadCount?.count || 0,
      productsCount: productCount?.count || 0,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -----------------------------------------------------------------------------
// 2. BOT SETTINGS & CONFIGURATION (ADMIN VII)
// -----------------------------------------------------------------------------
app.get('/api/settings', async (req, res) => {
  try {
    const rows = await db.all('SELECT key, value, description FROM bot_settings');
    const settings = {};
    let hasDbKey = false;
    let hasGeminiDbKey = false;

    rows.forEach((r) => {
      if (r.key === 'openai_api_key') {
        hasDbKey = Boolean(r.value && r.value.trim().length > 12 && !r.value.includes('your_'));
        return; // Never expose raw API keys to the frontend
      }
      if (r.key === 'gemini_api_key') {
        hasGeminiDbKey = Boolean(r.value && r.value.trim().length > 8 && !r.value.includes('your_'));
        return; // Never expose raw API keys to the frontend
      }
      settings[r.key] = r.value;
    });

    const hasEnvKey = Boolean(process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('your_') && process.env.OPENAI_API_KEY.trim().length > 12);
    settings.has_openai_key = (hasDbKey || hasEnvKey) ? '1' : '0';
    if (!settings.openai_model) settings.openai_model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    if (!settings.openai_base_url) settings.openai_base_url = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

    const envGemini = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const hasGeminiEnvKey = Boolean(envGemini && !envGemini.includes('your_') && envGemini.trim().length > 8);
    settings.has_gemini_key = (hasGeminiDbKey || hasGeminiEnvKey) ? '1' : '0';
    if (!settings.gemini_model) settings.gemini_model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    if (!settings.llm_provider) settings.llm_provider = 'gemini';

    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    const updates = req.body;
    const now = new Date().toISOString();

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'has_openai_key' || key === 'has_gemini_key') continue;
      if (key === 'openai_api_key' && (!value || String(value).trim() === '' || String(value).includes('••••'))) {
        continue; // Keep existing key if blank or masked
      }
      if (key === 'gemini_api_key' && (!value || String(value).trim() === '' || String(value).includes('••••'))) {
        continue; // Keep existing key if blank or masked
      }
      const existing = await db.get('SELECT key FROM bot_settings WHERE key = ?', [key]);
      if (existing) {
        await db.run('UPDATE bot_settings SET value = ?, updated_at = ? WHERE key = ?', [String(value), now, key]);
      } else {
        await db.run('INSERT INTO bot_settings (key, value, description, updated_at) VALUES (?, ?, ?, ?)', [key, String(value), 'Admin configured setting', now]);
      }
    }

    res.json({ success: true, message: 'Cập nhật cấu hình quản trị thành công!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Test Google Gemini Connection
app.post('/api/settings/test-gemini', async (req, res) => {
  try {
    let { apiKey, model } = req.body;
    if (!apiKey || apiKey.includes('••••')) {
      const row = await db.get("SELECT value FROM bot_settings WHERE key = 'gemini_api_key'");
      apiKey = row?.value || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    }
    const result = await testGeminiConnection(apiKey, model || 'gemini-1.5-flash');
    res.json({
      success: true,
      message: `Kết nối Google Gemini AI thành công! (Model: ${result.model})`,
      reply: result.reply
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// -----------------------------------------------------------------------------
// 3. PRODUCT SELECTOR & PRODUCT CENTER (ADMIN + COLUMN 2)
// -----------------------------------------------------------------------------
app.get('/api/products', async (req, res) => {
  try {
    const { field, group, search } = req.query;
    let query = 'SELECT * FROM products WHERE is_active = 1';
    const params = [];

    if (field) {
      query += ' AND field = ?';
      params.push(field);
    }
    if (group) {
      query += ' AND group_name = ?';
      params.push(group);
    }
    if (search) {
      query += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY field ASC, group_name ASC, price ASC';

    const products = await db.all(query, params);

    // Extract unique fields & groups for multi-level navigation
    const allProducts = await db.all('SELECT field, group_name FROM products WHERE is_active = 1');
    const fieldsMap = {};
    allProducts.forEach(p => {
      if (!fieldsMap[p.field]) fieldsMap[p.field] = new Set();
      fieldsMap[p.field].add(p.group_name);
    });

    const hierarchy = Object.entries(fieldsMap).map(([fieldName, groupSet]) => ({
      field: fieldName,
      groups: Array.from(groupSet)
    }));

    res.json({
      success: true,
      hierarchy,
      products
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Crawl and Analyze Product Webpage URL using Google Gemini LLM
app.post('/api/products/analyze-url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url.trim())) {
      return res.status(400).json({
        success: false,
        error: 'Đường dẫn website không hợp lệ. Vui lòng nhập link đầy đủ bắt đầu bằng http:// hoặc https://'
      });
    }

    const targetUrl = url.trim();

    // Fetch API key from DB or env
    const geminiSetting = await db.get("SELECT value FROM bot_settings WHERE key = 'gemini_api_key'");
    const modelSetting = await db.get("SELECT value FROM bot_settings WHERE key = 'gemini_model'");
    const geminiApiKey = geminiSetting?.value || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const geminiModel = modelSetting?.value || process.env.GEMINI_MODEL || 'gemini-1.5-flash';

    console.log(`[AI CRAWLER] Fetching product webpage: ${targetUrl}`);

    // Fetch webpage with timeout & standard desktop browser User-Agent
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    let html = '';
    try {
      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7'
        }
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Website trả về mã lỗi HTTP ${response.status}`);
      }

      html = await response.text();
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      console.warn(`[AI CRAWLER] Direct fetch failed for ${targetUrl}:`, fetchErr.message);
      // Fallback: analyze using URL domain and slug metadata
      const cleanSlug = targetUrl.split('/').filter(Boolean).pop() || 'Sản phẩm mới';
      html = `<html><head><title>${cleanSlug.replace(/[-_]+/g, ' ')}</title></head><body>Sản phẩm: ${cleanSlug} Nguồn: ${targetUrl}</body></html>`;
    }

    // Call Gemini LLM analyzer
    const analyzed = await analyzeProductFromWebpage(html, targetUrl, {
      apiKey: geminiApiKey,
      model: geminiModel
    });

    res.json({
      success: true,
      product: analyzed
    });
  } catch (err) {
    console.error('[ANALYZE URL ERROR]:', err);
    res.status(500).json({
      success: false,
      error: `Lỗi phân tích trang web: ${err.message}`
    });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { field, group_name, name, price, specs_json, description, image_url, is_approved } = req.body;
    if (!name || !field || !group_name || price === undefined) {
      return res.status(400).json({ success: false, error: 'Thiếu thông tin sản phẩm bắt buộc (Tên, Lĩnh vực, Nhóm, Giá).' });
    }

    const id = `prod_${Date.now()}`;
    const slug = name.toLowerCase().replace(/[^a-z0-9à-ỹ]+/g, '-').replace(/(^-|-$)/g, '');
    const priceNum = parseInt(price, 10) || 0;
    const priceFormatted = `${priceNum.toLocaleString('vi-VN')} ₫`;
    const now = new Date().toISOString();

    await db.run(`
      INSERT INTO products (id, field, group_name, name, slug, price, price_formatted, specs_json, description, image_url, is_approved, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `, [
      id, field, group_name, name, slug, priceNum, priceFormatted,
      typeof specs_json === 'object' ? JSON.stringify(specs_json) : (specs_json || '{}'),
      description || '', image_url || 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=600&auto=format&fit=crop&q=80',
      is_approved !== undefined ? (is_approved ? 1 : 0) : 1,
      now, now
    ]);

    res.json({ success: true, message: 'Đã thêm sản phẩm mới thành công!', id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { field, group_name, name, price, specs_json, description, image_url, is_approved, is_active } = req.body;
    const now = new Date().toISOString();
    const priceNum = price !== undefined ? parseInt(price, 10) : undefined;

    let updateSql = 'UPDATE products SET updated_at = ?';
    const params = [now];

    if (field !== undefined) { updateSql += ', field = ?'; params.push(field); }
    if (group_name !== undefined) { updateSql += ', group_name = ?'; params.push(group_name); }
    if (name !== undefined) { updateSql += ', name = ?'; params.push(name); }
    if (priceNum !== undefined) {
      updateSql += ', price = ?, price_formatted = ?';
      params.push(priceNum, `${priceNum.toLocaleString('vi-VN')} ₫`);
    }
    if (specs_json !== undefined) {
      updateSql += ', specs_json = ?';
      params.push(typeof specs_json === 'object' ? JSON.stringify(specs_json) : specs_json);
    }
    if (description !== undefined) { updateSql += ', description = ?'; params.push(description); }
    if (image_url !== undefined) { updateSql += ', image_url = ?'; params.push(image_url); }
    if (is_approved !== undefined) { updateSql += ', is_approved = ?'; params.push(is_approved ? 1 : 0); }
    if (is_active !== undefined) { updateSql += ', is_active = ?'; params.push(is_active ? 1 : 0); }

    updateSql += ' WHERE id = ?';
    params.push(id);

    await db.run(updateSql, params);
    res.json({ success: true, message: 'Cập nhật sản phẩm thành công!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Chuẩn hóa danh sách ID hợp lệ cho thao tác xóa hàng loạt.
 */
function sanitizeIdList(ids) {
  if (!Array.isArray(ids)) return [];
  return [...new Set(ids.filter((id) => typeof id === 'string' && id.trim().length > 0).map((id) => id.trim()))];
}

app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.run('DELETE FROM products WHERE id = ?', [id]);
    if (!result.changes) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy sản phẩm để xóa.' });
    }
    res.json({ success: true, message: 'Đã xóa sản phẩm thành công!', deletedId: id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/products/bulk-delete', async (req, res) => {
  try {
    const { ids, deleteAll } = req.body || {};
    let result;
    if (deleteAll === true) {
      result = await db.run('DELETE FROM products');
    } else {
      const cleanIds = sanitizeIdList(ids);
      if (cleanIds.length === 0) {
        return res.status(400).json({ success: false, error: 'Vui lòng chọn ít nhất 1 sản phẩm để xóa.' });
      }
      const placeholders = cleanIds.map(() => '?').join(', ');
      result = await db.run(`DELETE FROM products WHERE id IN (${placeholders})`, cleanIds);
    }

    res.json({
      success: true,
      deletedCount: result.changes || 0,
      message: `Đã xóa ${result.changes || 0} sản phẩm thành công!`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -----------------------------------------------------------------------------
// 3B. LOCAL IMAGE UPLOAD FROM COMPUTER
// -----------------------------------------------------------------------------
app.post('/api/upload/image', (req, res) => {
  try {
    const { fileName, dataUrl } = req.body;
    if (!dataUrl || typeof dataUrl !== 'string') {
      return res.status(400).json({ success: false, error: 'Thiếu dữ liệu ảnh tải lên.' });
    }

    const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
      return res.status(400).json({ success: false, error: 'Định dạng ảnh không hợp lệ (chỉ hỗ trợ PNG, JPG, WEBP, GIF).' });
    }

    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(413).json({ success: false, error: 'Kích thước ảnh vượt quá giới hạn 5MB.' });
    }

    const safeBase = (fileName || 'product')
      .replace(/\.[^/.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '_')
      .slice(0, 40) || 'image';

    const finalName = `${Date.now()}_${safeBase}.${ext}`;
    const targetPath = path.join(uploadsDir, finalName);
    fs.writeFileSync(targetPath, buffer);

    res.json({
      success: true,
      url: `/uploads/${finalName}`,
      fileName: finalName,
      size: buffer.length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -----------------------------------------------------------------------------
// 4. CHAT & STREAMING ENGINE (COLUMN 1)
// -----------------------------------------------------------------------------
app.post('/api/chat/message', async (req, res) => {
  try {
    const { conversationId, message, selectedProduct, actionType, customerInfo } = req.body;

    const result = await SalesEngine.processMessage({
      conversationId,
      message,
      selectedProduct,
      actionType,
      customerInfo
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Server-Sent Events (SSE) Streaming endpoint for fluid typewriting / word streaming
app.get('/api/chat/stream', async (req, res) => {
  const { conversationId, message, productId, actionType } = req.query;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    let selectedProduct = null;
    if (productId) {
      selectedProduct = await db.get('SELECT * FROM products WHERE id = ?', [productId]);
    }

    const result = await SalesEngine.processMessage({
      conversationId,
      message,
      selectedProduct,
      actionType
    });

    const fullReply = result.reply;
    const words = fullReply.split(' ');

    // Stream words with natural cadence
    for (let i = 0; i < words.length; i++) {
      const wordChunk = words[i] + (i < words.length - 1 ? ' ' : '');
      res.write(`data: ${JSON.stringify({ chunk: wordChunk, done: false, botState: 'speaking' })}\n\n`);
      await new Promise(resolve => setTimeout(resolve, 30));
    }

    // Final payload with metadata and Lead status
    res.write(`data: ${JSON.stringify({
      done: true,
      conversationId: result.conversationId,
      messageId: result.messageId,
      leadCreated: result.leadCreated,
      botState: result.leadCreated ? 'success' : 'idle'
    })}\n\n`);

    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message, done: true, botState: 'error' })}\n\n`);
    res.end();
  }
});

app.get('/api/chat/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const conv = await db.get('SELECT * FROM conversations WHERE id = ?', [id]);
    const messages = await db.all('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC', [id]);

    res.json({
      success: true,
      conversation: conv,
      messages: messages.map(m => ({
        id: m.id,
        senderType: m.sender_type,
        senderId: m.sender_id,
        content: m.content,
        metadata: m.metadata_json ? JSON.parse(m.metadata_json) : {},
        createdAt: m.created_at
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/chat/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM messages WHERE conversation_id = ?', [id]);
    await db.run('DELETE FROM conversations WHERE id = ?', [id]);
    res.json({ success: true, message: 'Đã xóa lịch sử hội thoại theo chính sách lưu trữ.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -----------------------------------------------------------------------------
// 5. CRM & LEADS MANAGEMENT (SECTION IV & V)
// -----------------------------------------------------------------------------
app.post('/api/leads', async (req, res) => {
  try {
    const {
      customer_name,
      phone,
      email,
      product_id,
      product_name,
      quantity,
      customer_requirement,
      conversation_id,
      website_source,
      widget_id,
      consent_to_contact,
      notes
    } = req.body;

    if (!customer_name || !phone) {
      return res.status(400).json({ success: false, error: 'Họ tên và Số điện thoại là thông tin bắt buộc.' });
    }

    // Phone validation
    const phoneClean = phone.replace(/\s+/g, '');
    const phoneRegex = /^0[3|5|7|8|9][0-9]{8}$/;
    if (!phoneRegex.test(phoneClean)) {
      return res.status(400).json({ success: false, error: 'Số điện thoại không hợp lệ (Cần 10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09).' });
    }

    const id = `lead_${Date.now()}`;
    const now = new Date().toISOString();

    await db.run(`
      INSERT INTO leads (
        id, customer_name, phone, email, product_id, product_name, quantity,
        customer_requirement, conversation_id, website_source, widget_id,
        consent_to_contact, created_time, lead_status, notes, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NEW – WAITING FOR OWNER CONTACT', ?, ?)
    `, [
      id,
      customer_name.trim(),
      phoneClean,
      email ? email.trim() : null,
      product_id || null,
      product_name || null,
      parseInt(quantity, 10) || 1,
      customer_requirement || 'Yêu cầu tư vấn',
      conversation_id || null,
      website_source || 'TRÍ AI Sales Web Interface',
      widget_id || 'WIDGET_HUMANOID_V1',
      consent_to_contact ? 1 : 0,
      now,
      notes || '',
      now
    ]);

    res.json({
      success: true,
      message: 'Tạo Lead CRM thành công! Chủ nhân sẽ sớm liên hệ.',
      leadId: id
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/crm/leads', async (req, res) => {
  try {
    const { status, search } = req.query;
    let sql = 'SELECT * FROM leads WHERE 1=1';
    const params = [];

    if (status && status !== 'all') {
      sql += ' AND lead_status = ?';
      params.push(status);
    }

    if (search) {
      sql += ' AND (customer_name LIKE ? OR phone LIKE ? OR email LIKE ? OR product_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY created_time DESC';

    const leads = await db.all(sql, params);
    res.json({ success: true, leads });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/crm/leads/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { lead_status, notes } = req.body;
    const now = new Date().toISOString();

    await db.run(
      'UPDATE leads SET lead_status = ?, notes = COALESCE(?, notes), updated_at = ? WHERE id = ?',
      [lead_status, notes, now, id]
    );

    res.json({ success: true, message: 'Cập nhật trạng thái Lead thành công!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/crm/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM lead_activities WHERE lead_id = ?', [id]);
    const result = await db.run('DELETE FROM leads WHERE id = ?', [id]);
    if (!result.changes) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy khách hàng để xóa.' });
    }
    res.json({ success: true, message: 'Đã xóa khách hàng khỏi danh sách CRM!', deletedId: id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/crm/leads/bulk-delete', async (req, res) => {
  try {
    const { ids, deleteAll } = req.body || {};
    let result;
    if (deleteAll === true) {
      await db.run('DELETE FROM lead_activities');
      result = await db.run('DELETE FROM leads');
    } else {
      const cleanIds = sanitizeIdList(ids);
      if (cleanIds.length === 0) {
        return res.status(400).json({ success: false, error: 'Vui lòng chọn ít nhất 1 khách hàng để xóa.' });
      }
      const placeholders = cleanIds.map(() => '?').join(', ');
      await db.run(`DELETE FROM lead_activities WHERE lead_id IN (${placeholders})`, cleanIds);
      result = await db.run(`DELETE FROM leads WHERE id IN (${placeholders})`, cleanIds);
    }

    res.json({
      success: true,
      deletedCount: result.changes || 0,
      message: `Đã xóa ${result.changes || 0} khách hàng khỏi danh sách!`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/crm/stats', async (req, res) => {
  try {
    const totalRow = await db.get('SELECT COUNT(*) as count FROM leads');
    const newRow = await db.get("SELECT COUNT(*) as count FROM leads WHERE lead_status = 'NEW – WAITING FOR OWNER CONTACT'");
    const waitingRow = await db.get("SELECT COUNT(*) as count FROM leads WHERE lead_status = 'WAITING_CALL'");
    const contactedRow = await db.get("SELECT COUNT(*) as count FROM leads WHERE lead_status = 'CONTACTED'");
    const highInterestRow = await db.get("SELECT COUNT(*) as count FROM leads WHERE lead_status = 'HIGH_INTEREST'");
    const quoteRow = await db.get("SELECT COUNT(*) as count FROM leads WHERE customer_requirement LIKE '%báo giá%'");
    const buyRow = await db.get("SELECT COUNT(*) as count FROM leads WHERE customer_requirement LIKE '%Đặt mua%' OR customer_requirement LIKE '%mua%'");

    const total = totalRow.count || 0;
    const contacted = contactedRow.count || 0;
    const conversionRate = total > 0 ? ((contacted / total) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      stats: {
        totalLeads: total,
        newLeads: newRow.count || 0,
        waitingCall: waitingRow.count || 0,
        contacted: contacted,
        highInterest: highInterestRow.count || 0,
        quoteRequests: quoteRow.count || 0,
        buyRequests: buyRow.count || 0,
        conversionRate: `${conversionRate}%`
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -----------------------------------------------------------------------------
// 6. SERVE STATIC CLIENT IN PRODUCTION (Express 5 compatible)
// -----------------------------------------------------------------------------
const distPath = path.resolve(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(distPath, 'index.html'));
    }
    next();
  });
}

// -----------------------------------------------------------------------------
// 7. START SERVER
// -----------------------------------------------------------------------------
async function start() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`
========================================================================
🤖 TRÍ AI HUMANOID SALES ENGINE ONLINE
- Backend API: http://localhost:${PORT}
- Health Check: http://localhost:${PORT}/api/health
- Shared DB:   Unified TRÍ AI Database (${process.env.SHARED_DB_PATH || 'Local'})
========================================================================
      `);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

export default app;
