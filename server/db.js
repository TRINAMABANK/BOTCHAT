import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Shared database path from environment or relative fallback
let dbPath = process.env.SHARED_DB_PATH || 'D:/09- LAM APP KIEM TIEN/LAM PHAN MEM APP AI BAN/tri-ai-v1/tri-ai-v1/.data/triai.db';

if (!fs.existsSync(dbPath)) {
  const localDir = path.resolve(__dirname, '../data');
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }
  dbPath = path.join(localDir, 'triai.db');
  console.log(`[DB INFO] Shared database not found at configured path, using local database: ${dbPath}`);
} else {
  console.log(`[DB SUCCESS] Connecting to unified TRÍ AI platform database: ${dbPath}`);
}

const sqlite = sqlite3.verbose();
let dbInstance = null;

export function getDb() {
  if (!dbInstance) {
    dbInstance = new sqlite.Database(dbPath, (err) => {
      if (err) {
        console.error('[DB ERROR] Failed to connect to SQLite database:', err.message);
      } else {
        console.log(`[DB CONNECTED] Connected to database: ${dbPath}`);
      }
    });

    dbInstance.run('PRAGMA foreign_keys = ON;');
    dbInstance.run('PRAGMA journal_mode = WAL;');
  }
  return dbInstance;
}

export const db = {
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      getDb().get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      });
    });
  },

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      getDb().all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
  },

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      getDb().run(sql, params, function (err) {
        if (err) return reject(err);
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },

  exec(sql) {
    return new Promise((resolve, reject) => {
      getDb().exec(sql, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
};

export async function initDatabase() {
  console.log('[DB MIGRATE] Running schema verification and migrations...');

  // 0. Ensure default customer user exists for conversation foreign keys
  try {
    const existingUser = await db.get('SELECT id FROM users WHERE id = ?', ['usr_customer']);
    if (!existingUser) {
      const now = new Date().toISOString();
      await db.run(`
        INSERT OR IGNORE INTO users (id, email, password_hash, full_name, role, plan, is_active, created_at, updated_at)
        VALUES ('usr_customer', 'customer@triai.vn', 'customer_hash_2027', 'Khách Hàng Tư Vấn', 'customer', 'Khách Hàng', 1, ?, ?)
      `, [now, now]);
      console.log('[DB SEED] Ensured user "usr_customer" exists.');
    }
  } catch (err) {
    // If users table has different constraints, ignore
  }

  // 1. Leads Table (CRM Integration)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      product_id TEXT,
      product_name TEXT,
      quantity INTEGER DEFAULT 1,
      customer_requirement TEXT,
      conversation_id TEXT,
      website_source TEXT DEFAULT 'TRÍ AI Humanoid Sales Widget',
      widget_id TEXT DEFAULT 'WIDGET_HUMANOID_V1',
      consent_to_contact INTEGER DEFAULT 1,
      created_time TEXT NOT NULL,
      lead_status TEXT NOT NULL DEFAULT 'NEW – WAITING FOR OWNER CONTACT',
      notes TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(lead_status);
    CREATE INDEX IF NOT EXISTS idx_leads_conv ON leads(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_time);
  `);

  // 2. Products Table (Product Center)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      field TEXT NOT NULL,
      group_name TEXT NOT NULL,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      sku TEXT,
      price INTEGER NOT NULL,
      price_formatted TEXT,
      specs_json TEXT,
      description TEXT,
      image_url TEXT,
      is_approved INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_products_field ON products(field);
    CREATE INDEX IF NOT EXISTS idx_products_group ON products(group_name);
    CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
  `);

  // 3. Bot Settings Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS bot_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      updated_at TEXT NOT NULL
    );
  `);

  // 4. Conversations & Messages (Ensuring they exist for standalone or shared)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'usr_anonymous',
      agent_id TEXT DEFAULT 'tri-ai-sales-robot',
      skill_id TEXT DEFAULT 'chatbot-sales-ai',
      title TEXT NOT NULL DEFAULT 'Phiên tư vấn bán hàng',
      is_archived INTEGER NOT NULL DEFAULT 0,
      last_message_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      sender_type TEXT NOT NULL,
      sender_id TEXT,
      content TEXT NOT NULL,
      metadata_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_messages_conv_id ON messages(conversation_id);
  `);

  // 5. Check and seed Agent `tri-ai-sales-robot`
  try {
    const existingAgent = await db.get('SELECT id FROM agents WHERE id = ?', ['tri-ai-sales-robot']);
    if (!existingAgent) {
      const now = new Date().toISOString();
      await db.run(`
        INSERT INTO agents (id, slug, name, role, avatar_url, bio, greeting, specialties_json, model_config_json, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `, [
        'tri-ai-sales-robot',
        'tri-ai-sales-robot',
        'TRÍ AI SALES ROBOT',
        'Trợ lý bán hàng của chủ nhân',
        '/assets/robot_avatar.png',
        'Trợ lý bán hàng AI Humanoid thông minh tư vấn sản phẩm, giải đáp thắc mắc, so sánh, báo giá và tiếp nhận nhu cầu mua hàng cho chủ nhân.',
        'Xin chào anh/chị! Tôi là TRÍ AI Sales Robot - trợ lý bán hàng của chủ nhân. Tôi rất vinh hạnh được hỗ trợ anh/chị chọn sản phẩm phù hợp nhất hôm nay.',
        JSON.stringify(['Tư vấn sản phẩm', 'So sánh & Báo giá', 'Tiếp nhận Lead', 'Chăm sóc khách hàng 24/7']),
        JSON.stringify({ model: 'gpt-4o-mini', temperature: 0.7 }),
        now,
        now
      ]);
      console.log('[DB SEED] Seeded agent "tri-ai-sales-robot" successfully.');
    }
  } catch (err) {
    console.log('[DB NOTICE] Skipping agents table insert if not present or error:', err.message);
  }

  // 6. Seed Bot Settings
  const defaultSettings = [
    { key: 'bot_name', value: 'TRÍ AI SALES ROBOT', description: 'Tên chatbot đại diện' },
    { key: 'owner_name', value: 'Quang Nhựt Trí', description: 'Tên chủ nhân shop' },
    { key: 'robot_model', value: 'cyber_valkyrie', description: 'Mô hình robot 3D (cyber_valkyrie, tron_humanoid, quantum_sphere, nano_sentinel)' },
    { key: 'avatar_url', value: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80', description: 'Ảnh đại diện Robot' },
    { key: 'greeting', value: 'Xin chào anh/chị! Tôi là TRÍ AI Sales Robot - trợ lý bán hàng của chủ nhân. Tôi có thể hỗ trợ anh/chị tìm hiểu sản phẩm hoặc báo giá gì hôm nay ạ?', description: 'Lời chào mặc định khi mở chat' },
    { key: 'ai_tone', value: 'Chuyên nghiệp, thân thiện, lịch thiệp', description: 'Giọng điệu AI khi giao tiếp' },
    { key: 'phone_invitation_prompt', value: 'Tôi có thể ghi nhận yêu cầu để chủ nhân trực tiếp liên hệ với anh/chị. Anh/chị vui lòng để lại số điện thoại nhé.', description: 'Lời mời để lại số điện thoại chuẩn kịch bản' },
    { key: 'lead_notification_email', value: 'triqnnamabank@gmail.com', description: 'Email nhận thông báo Lead mới' },
    { key: 'hotline', value: '0982441446', description: 'Số hotline hỗ trợ' },
    { key: 'show_hotline', value: '1', description: 'Bật/tắt công khai số hotline trên giao diện (1: Bật, 0: Tắt)' }
  ];

  for (const s of defaultSettings) {
    const existing = await db.get('SELECT key FROM bot_settings WHERE key = ?', [s.key]);
    if (!existing) {
      await db.run(
        'INSERT INTO bot_settings (key, value, description, updated_at) VALUES (?, ?, ?, ?)',
        [s.key, s.value, s.description, new Date().toISOString()]
      );
    }
  }

  // 7. Seed Initial Products if table is empty
  const countRow = await db.get('SELECT COUNT(*) as count FROM products');
  if (countRow.count === 0) {
    console.log('[DB SEED] Seeding curated product catalog approved by Administrator...');
    const now = new Date().toISOString();

    const sampleProducts = [
      // Lĩnh vực 1: Trà Thượng Hạng Đôi Dép
      {
        id: 'prod_tra_001',
        field: 'Trà Thượng Hạng Đôi Dép',
        group_name: 'Trà Oolong Thượng Hạng',
        name: '🍵 Bích Thủy Hoàn Nguyên (Oolong)',
        slug: 'bich-thuy-hoan-nguyen',
        sku: 'TRA-BTHN-01',
        price: 2699000,
        price_formatted: '2.699.000 ₫',
        specs_json: JSON.stringify({
          'Dòng trà': 'Oolong Xanh Cao Cấp',
          'Xuất xứ': 'Đôi Dép - Bảo Lộc, Lâm Đồng',
          'Màu nước': 'Xanh ngọc bích óng ánh',
          'Hương vị': 'Hương hoa rừng nồng nàn, cỏ cây thảo mộc, hậu vị ngọt thanh dài lâu',
          'Đóng gói': 'Hộp sơn mài cao cấp 200g'
        }),
        description: 'Bích Thuỷ Hoàn Nguyên với ý nghĩa màu nước xanh ngọc bích thanh tao. Hương thơm phong phú kết hợp giữa hoa tự nhiên và cỏ sương sớm, dư vị sâu lắng tuyệt hảo.',
        image_url: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=600&auto=format&fit=crop&q=80',
        is_approved: 1
      },
      {
        id: 'prod_tra_002',
        field: 'Trà Thượng Hạng Đôi Dép',
        group_name: 'Hoàng Trà Bồi Hỏa',
        name: '🍂 Bất Thụ Đông Phong (Hoàng Trà)',
        slug: 'bat-thu-dong-phong',
        sku: 'TRA-BTDP-02',
        price: 2699000,
        price_formatted: '2.699.000 ₫',
        specs_json: JSON.stringify({
          'Dòng trà': 'Hoàng Trà Bồi Hỏa Độc Bản',
          'Xuất xứ': 'Đôi Dép - Lâm Đồng',
          'Màu nước': 'Vàng óng ánh ngả hổ phách',
          'Hương vị': 'Vị béo bùi, hương khói rang bồi hỏa độc quyền, đắng êm dịu',
          'Đóng gói': 'Hộp gốm tử sa bảo quản 250g'
        }),
        description: 'Bất Thụ Đông Phong - Không ngại gió rét mùa đông. Nước trà vàng óng ngả đỏ do bí thuật bồi hỏa, vị béo bùi suông miệng, ấm áp cơ thể.',
        image_url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80',
        is_approved: 1
      },
      {
        id: 'prod_tra_003',
        field: 'Trà Thượng Hạng Đôi Dép',
        group_name: 'Hắc Trà Dược Liệu',
        name: '🪵 Hoàng Tỳ Nhật Minh (Hắc Trà GABA)',
        slug: 'hoang-ty-nhat-minh',
        sku: 'TRA-HTNM-03',
        price: 1799000,
        price_formatted: '1.799.000 ₫',
        specs_json: JSON.stringify({
          'Dòng trà': 'Hắc Trà Lên Men Tự Nhiên',
          'Hàm lượng GABA': 'Giàu dưỡng chất an thần, ngủ sâu',
          'Hương vị': 'Gỗ quế cổ thụ, khói nhẹ xì gà, hậu vị ngọt đậm',
          'Công dụng': 'Thải độc gan, thanh lọc cơ thể sau bia rượu, giảm căng thẳng'
        }),
        description: 'Dòng hắc trà đặc sản mang màu cánh gián quyền quý. Thức uống dưỡng sinh cao cấp bồi bổ tỳ vị và tăng cường năng lượng tích cực.',
        image_url: 'https://images.unsplash.com/photo-1594631252845-29fc4586d52c?w=600&auto=format&fit=crop&q=80',
        is_approved: 1
      },
      {
        id: 'prod_tra_004',
        field: 'Trà Thượng Hạng Đôi Dép',
        group_name: 'Trà Xanh Tinh Khiết',
        name: '🏺 Hương Phù Ngõa Đỉnh (Trà Xanh)',
        slug: 'huong-phu-ngoa-dinh',
        sku: 'TRA-HPND-04',
        price: 2699000,
        price_formatted: '2.699.000 ₫',
        specs_json: JSON.stringify({
          'Dòng trà': 'Trà Xanh Đỉnh Núi',
          'Màu nước': 'Xanh vàng óng ánh',
          'Hương thơm': 'Hương hoa quả tươi mọng quyện chút ngọt sữa tinh tế'
        }),
        description: 'Hương thơm tựa làn khói thơm ngát bốc lên từ vò sành cổ. Thưởng trà mang lại cảm giác tĩnh tại, an yên và thư giãn đỉnh cao.',
        image_url: 'https://images.unsplash.com/photo-1571934811356-5cc561b63d2c?w=600&auto=format&fit=crop&q=80',
        is_approved: 1
      },
      {
        id: 'prod_tra_005',
        field: 'Trà Thượng Hạng Đôi Dép',
        group_name: 'Bộ Quà Tặng Doanh Nhân',
        name: '🎁 Ngũ Vị Trà - Hộp Quà Hoàng Gia',
        slug: 'ngu-vi-tra-hoang-gia',
        sku: 'TRA-NVT-05',
        price: 2499000,
        price_formatted: '2.499.000 ₫',
        specs_json: JSON.stringify({
          'Gồm 5 phẩm vị': 'Hảo Kỳ Trà, Xuân Nhật Trà, Nguyên Vị Trà, Phong Mật Trà, Hoàng Tỳ Nhật Minh',
          'Hình thức': 'Hộp gỗ bọc nhung ép kim sang trọng, kèm bộ dụng cụ thưởng trà',
          'Mục đích': 'Món quà ngoại giao, biếu tặng đối tác và lãnh đạo cấp cao'
        }),
        description: 'Hội tụ tinh hoa ngũ hành ẩm thực trà đạo Việt Nam. Đem lại 5 cung bậc cảm xúc thưởng vị đa dạng trong một bộ sưu tập đẳng cấp.',
        image_url: 'https://images.unsplash.com/photo-1597481616781-a773d2a7593c?w=600&auto=format&fit=crop&q=80',
        is_approved: 1
      },
      {
        id: 'prod_tra_006',
        field: 'Trà Thượng Hạng Đôi Dép',
        group_name: 'Hồng Trà Lên Men',
        name: '🍯 Phong Mật Trà (Hồng Trà Mật Ong)',
        slug: 'phong-mat-tra',
        sku: 'TRA-PMT-06',
        price: 1899000,
        price_formatted: '1.899.000 ₫',
        specs_json: JSON.stringify({
          'Dòng trà': 'Hồng Trà Núi Cao Lên Men',
          'Hương vị': 'Mật mía, mật ong rừng nguyên chất, ấm nồng',
          'Độ chát': 'Rất dịu, ngọt hậu sâu'
        }),
        description: 'Hương thơm ngọt ngào ấm áp như giọt nắng mùa thu. Phù hợp cho những buổi đàm đạo cùng bằng hữu hoặc nhâm nhi mỗi chiều.',
        image_url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80',
        is_approved: 1
      },
      // Lĩnh vực 2: Giải Pháp AI & Nền Tảng Công Nghệ
      {
        id: 'prod_ai_001',
        field: 'Giải Pháp AI & Nền Tảng Công Nghệ',
        group_name: 'AI Sales Agent',
        name: '🤖 TRÍ AI Humanoid Sales Engine (Bản Quyền Vĩnh Viễn)',
        slug: 'tri-ai-humanoid-sales-engine',
        sku: 'SOFT-AI-HUMANOID-01',
        price: 19500000,
        price_formatted: '19.500.000 ₫',
        specs_json: JSON.stringify({
          'Công nghệ': 'Three.js 3D WebGL + Streaming LLM + SQLite CRM',
          'Triển khai': 'Nhúng widget 1 dòng code vào mọi website/Landing Page',
          'Tính năng': 'Tự động tư vấn, lọc sản phẩm 4 cấp, tạo Lead chuẩn CRM, dashboard thống kê',
          'Bảo hành & Support': 'Hỗ trợ kỹ thuật 24/7 trọn đời'
        }),
        description: 'Giải pháp robot hình người bán hàng tự động hai cột đỉnh cao. Tăng tỷ lệ chuyển đổi khách hàng tiềm năng lên đến 300%.',
        image_url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&auto=format&fit=crop&q=80',
        is_approved: 1
      },
      {
        id: 'prod_ai_002',
        field: 'Giải Pháp AI & Nền Tảng Công Nghệ',
        group_name: 'Gói Kỹ Năng Doanh Nghiệp',
        name: '⚡ Gói 33 Kỹ Năng TRÍ AI Master Enterprise',
        slug: 'goi-33-ky-nang-tri-ai-master',
        sku: 'SOFT-SKILL-33-ALL',
        price: 8900000,
        price_formatted: '8.900.000 ₫',
        specs_json: JSON.stringify({
          'Số lượng': '33 Kỹ Năng chuẩn hóa toàn diện',
          'Phân hệ': 'Chiến lược, Mua sắm, PCCC, Pháp lý, Tài chính, Bán hàng, KOL Visual',
          'Tích hợp': 'Nền tảng TRÍ AI SaaS Banhangdinhcao.com'
        }),
        description: 'Bộ kỹ năng AI hoàn chỉnh giúp số hóa 90% quy trình tham mưu, thẩm định và quản trị doanh nghiệp hiện đại.',
        image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
        is_approved: 1
      },
      // Lĩnh vực 3: Bất Động Sản & Nghỉ Dưỡng Hạng Sang
      {
        id: 'prod_bds_001',
        field: 'Bất Động Sản & Nghỉ Dưỡng Hạng Sang',
        group_name: 'Biệt Thự Đồi Sương Mù',
        name: '🏡 Biệt Thự Nghỉ Dưỡng Đồi Chè Bảo Lộc Eco-Villa',
        slug: 'biet-thu-nghi-duong-bao-loc',
        sku: 'BDS-BL-VILLA-01',
        price: 4850000000,
        price_formatted: '4.850.000.000 ₫',
        specs_json: JSON.stringify({
          'Diện tích': '500m2 (Thổ cư 200m2), View toàn cảnh thung lũng đồi chè',
          'Pháp lý': 'Sổ hồng riêng chính chủ, công chứng sang tên ngay',
          'Thiết kế': 'Phong cách Scandinavia hòa mình vào thiên nhiên, sân vườn trà đạo'
        }),
        description: 'Khu biệt thự nghỉ dưỡng cao cấp giữa lòng thủ phủ chè Bảo Lộc. Không gian trong lành lý tưởng để tĩnh dưỡng và tái tạo năng lượng.',
        image_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&auto=format&fit=crop&q=80',
        is_approved: 1
      }
    ];

    for (const p of sampleProducts) {
      await db.run(`
        INSERT INTO products (id, field, group_name, name, slug, sku, price, price_formatted, specs_json, description, image_url, is_approved, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `, [
        p.id,
        p.field,
        p.group_name,
        p.name,
        p.slug,
        p.sku,
        p.price,
        p.price_formatted,
        p.specs_json,
        p.description,
        p.image_url,
        p.is_approved,
        now,
        now
      ]);
    }
    console.log(`[DB SEED] Successfully inserted ${sampleProducts.length} approved products.`);
  }

  // 8. Seed Sample Leads if empty for owner dashboard visualization
  const leadCountRow = await db.get('SELECT COUNT(*) as count FROM leads');
  if (leadCountRow.count === 0) {
    console.log('[DB SEED] Seeding sample leads for Owner Dashboard demonstration...');
    const now = new Date();
    const isoNow = now.toISOString();
    const hourAgo = new Date(now.getTime() - 3600000).toISOString();
    const dayAgo = new Date(now.getTime() - 86400000).toISOString();
    const twoDaysAgo = new Date(now.getTime() - 172800000).toISOString();

    const sampleLeads = [
      {
        id: 'lead_demo_001',
        customer_name: 'Nguyễn Văn Minh',
        phone: '0918234567',
        email: 'minh.nguyen@investcorp.vn',
        product_id: 'prod_tra_005',
        product_name: '🎁 Ngũ Vị Trà - Hộp Quà Hoàng Gia',
        quantity: 5,
        customer_requirement: 'Đặt mua',
        conversation_id: 'conv_demo_101',
        website_source: 'Trang Chủ giamua.com.vn',
        widget_id: 'WIDGET_HUMANOID_V1',
        consent_to_contact: 1,
        created_time: hourAgo,
        lead_status: 'NEW – WAITING FOR OWNER CONTACT',
        notes: 'Khách muốn mua 5 hộp làm quà Tết biếu đối tác ngoại giao, cần xuất hóa đơn VAT.'
      },
      {
        id: 'lead_demo_002',
        customer_name: 'Trần Thị Thu Thảo',
        phone: '0903847291',
        email: 'thuthao.tran@gmail.com',
        product_id: 'prod_tra_001',
        product_name: '🍵 Bích Thủy Hoàn Nguyên (Oolong)',
        quantity: 2,
        customer_requirement: 'Yêu cầu báo giá',
        conversation_id: 'conv_demo_102',
        website_source: 'Landing Page Trà Đạo',
        widget_id: 'WIDGET_HUMANOID_V1',
        consent_to_contact: 1,
        created_time: dayAgo,
        lead_status: 'WAITING_CALL',
        notes: 'Đã hẹn gọi tư vấn chi tiết về quy cách hộp và chiết khấu số lượng.'
      },
      {
        id: 'lead_demo_003',
        customer_name: 'Lê Hoàng Phong',
        phone: '0988776655',
        email: 'phong.le@techstartup.io',
        product_id: 'prod_ai_001',
        product_name: '🤖 TRÍ AI Humanoid Sales Engine (Bản Quyền Vĩnh Viễn)',
        quantity: 1,
        customer_requirement: 'Yêu cầu chủ nhân liên hệ',
        conversation_id: 'conv_demo_103',
        website_source: 'Website Bán Hàng Đỉnh Cao',
        widget_id: 'WIDGET_HUMANOID_V1',
        consent_to_contact: 1,
        created_time: twoDaysAgo,
        lead_status: 'HIGH_INTEREST',
        notes: 'Muốn chủ nhân trực tiếp tư vấn demo tích hợp cho chuỗi cửa hàng thời trang.'
      },
      {
        id: 'lead_demo_004',
        customer_name: 'Đặng Ngọc Mai',
        phone: '0934112233',
        email: 'ngocmai.dang@resortgroup.vn',
        product_id: 'prod_bds_001',
        product_name: '🏡 Biệt Thự Nghỉ Dưỡng Đồi Chè Bảo Lộc Eco-Villa',
        quantity: 1,
        customer_requirement: 'Tìm hiểu sản phẩm',
        conversation_id: 'conv_demo_104',
        website_source: 'Fanpage Hotline',
        widget_id: 'WIDGET_HUMANOID_V1',
        consent_to_contact: 1,
        created_time: twoDaysAgo,
        lead_status: 'CONTACTED',
        notes: 'Chủ nhân đã gọi điện tư vấn pháp lý sổ hồng và hẹn ngày đi xem đất thực tế.'
      }
    ];

    for (const ld of sampleLeads) {
      await db.run(`
        INSERT INTO leads (id, customer_name, phone, email, product_id, product_name, quantity, customer_requirement, conversation_id, website_source, widget_id, consent_to_contact, created_time, lead_status, notes, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        ld.id, ld.customer_name, ld.phone, ld.email, ld.product_id, ld.product_name, ld.quantity, ld.customer_requirement, ld.conversation_id, ld.website_source, ld.widget_id, ld.consent_to_contact, ld.created_time, ld.lead_status, ld.notes, isoNow
      ]);
    }
  }

  // ---------------------------------------------------------------------------
  // 8. ENTERPRISE & SAAS SCHEMA EXPANSION (SECTION VII - 31 TABLES)
  // ---------------------------------------------------------------------------
  await db.exec(`
    -- RBAC Management
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      module TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_roles (
      user_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      assigned_at TEXT NOT NULL,
      PRIMARY KEY (user_id, role_id)
    );

    -- Robot Profiles
    CREATE TABLE IF NOT EXISTS robot_profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      model_type TEXT NOT NULL DEFAULT 'cyber_valkyrie',
      avatar_url TEXT,
      tone TEXT NOT NULL DEFAULT 'Chuyên nghiệp, nhiệt tình, lịch sự',
      greeting TEXT,
      system_prompt TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Product Catalog Extensions
    CREATE TABLE IF NOT EXISTS product_categories (
      id TEXT PRIMARY KEY,
      parent_id TEXT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      icon TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS product_images (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      image_url TEXT NOT NULL,
      is_primary INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS product_attributes (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      attr_name TEXT NOT NULL,
      attr_value TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS product_prices (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      price INTEGER NOT NULL,
      effective_date TEXT NOT NULL,
      approved_by TEXT,
      note TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inventory_records (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      warehouse_location TEXT,
      last_checked_at TEXT,
      updated_at TEXT NOT NULL
    );

    -- RAG Knowledge Base & Auto-Sync
    CREATE TABLE IF NOT EXISTS knowledge_documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_path TEXT,
      file_size INTEGER,
      source_type TEXT DEFAULT 'manual_upload',
      status TEXT DEFAULT 'approved',
      extracted_text TEXT,
      version INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS knowledge_chunks (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      char_count INTEGER,
      embedding_json TEXT,
      metadata_json TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS knowledge_embeddings (
      id TEXT PRIMARY KEY,
      chunk_id TEXT NOT NULL,
      model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
      vector_json TEXT NOT NULL,
      dimensions INTEGER DEFAULT 1536,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS knowledge_sources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      source_url TEXT,
      source_type TEXT NOT NULL,
      is_approved INTEGER DEFAULT 1,
      sync_schedule TEXT,
      last_synced_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS knowledge_versions (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      version_number INTEGER NOT NULL,
      change_summary TEXT,
      approved_by TEXT,
      created_at TEXT NOT NULL
    );

    -- FAQ, Scenarios & Rules
    CREATE TABLE IF NOT EXISTS faq_items (
      id TEXT PRIMARY KEY,
      category TEXT,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      tags_json TEXT,
      usage_count INTEGER DEFAULT 0,
      is_approved INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sales_scenarios (
      id TEXT PRIMARY KEY,
      scenario_name TEXT NOT NULL,
      customer_intent TEXT NOT NULL,
      suggested_action TEXT NOT NULL,
      script_template TEXT NOT NULL,
      priority INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_rules (
      id TEXT PRIMARY KEY,
      rule_code TEXT UNIQUE NOT NULL,
      rule_type TEXT NOT NULL,
      description TEXT NOT NULL,
      enforcement_level TEXT DEFAULT 'strict',
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    -- CRM & Activity Tracking
    CREATE TABLE IF NOT EXISTS lead_activities (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      activity_type TEXT NOT NULL,
      performed_by TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      is_read INTEGER DEFAULT 0,
      action_url TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS unanswered_questions (
      id TEXT PRIMARY KEY,
      conversation_id TEXT,
      question TEXT NOT NULL,
      context_json TEXT,
      status TEXT DEFAULT 'pending',
      resolved_answer TEXT,
      resolved_by TEXT,
      created_at TEXT NOT NULL,
      resolved_at TEXT
    );

    -- AI Test Bench
    CREATE TABLE IF NOT EXISTS ai_test_cases (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      test_name TEXT NOT NULL,
      input_prompt TEXT NOT NULL,
      expected_behavior TEXT NOT NULL,
      forbidden_keywords TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_test_results (
      id TEXT PRIMARY KEY,
      test_case_id TEXT NOT NULL,
      model_used TEXT NOT NULL,
      ai_output TEXT NOT NULL,
      passed INTEGER NOT NULL,
      score REAL,
      evaluated_at TEXT NOT NULL,
      evaluation_notes TEXT
    );

    -- System Configuration & Auditing
    CREATE TABLE IF NOT EXISTS system_settings (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      is_secret INTEGER DEFAULT 0,
      description TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      target_entity TEXT NOT NULL,
      target_id TEXT,
      changes_json TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS email_logs (
      id TEXT PRIMARY KEY,
      recipient TEXT NOT NULL,
      subject TEXT NOT NULL,
      content_snippet TEXT,
      status TEXT NOT NULL,
      error_message TEXT,
      sent_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agent_sessions (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      session_token TEXT UNIQUE NOT NULL,
      started_at TEXT NOT NULL,
      last_active_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
  `);

  // Seed default admin role and permissions if missing
  try {
    const adminRole = await db.get("SELECT id FROM roles WHERE id = 'role_admin'");
    if (!adminRole) {
      const now = new Date().toISOString();
      await db.run("INSERT INTO roles (id, name, description, created_at, updated_at) VALUES ('role_admin', 'Administrator', 'Toàn quyền quản trị hệ thống TRÍ AI', ?, ?)", [now, now]);
      await db.run("INSERT INTO roles (id, name, description, created_at, updated_at) VALUES ('role_sales', 'Sales Manager', 'Quản lý Lead và chăm sóc khách hàng', ?, ?)", [now, now]);
    }
  } catch (err) {}

  console.log('[DB READY] Database initialization and schema migration completed.');
}

export default db;
