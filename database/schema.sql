-- =============================================================================
-- TRÍ AI SALES ROBOT - POSTGRESQL PRODUCTION DDL SCRIPT (WITH PGVECTOR)
-- =============================================================================

-- Enable UUID & pgvector extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. Users & RBAC
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'customer',
  plan VARCHAR(50) DEFAULT 'Free',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  module VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id)
);

-- 2. Robot Profile
CREATE TABLE IF NOT EXISTS robot_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(150) NOT NULL DEFAULT 'TRÍ AI SALES ROBOT',
  model_type VARCHAR(100) NOT NULL DEFAULT 'cyber_valkyrie',
  avatar_url TEXT,
  tone VARCHAR(255) DEFAULT 'Chuyên nghiệp, thân thiện, lịch thiệp',
  greeting TEXT,
  system_prompt TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Product Catalog
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES product_categories(id),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  icon VARCHAR(100),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  field VARCHAR(150) NOT NULL,
  group_name VARCHAR(150) NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  sku VARCHAR(100),
  price BIGINT NOT NULL,
  price_formatted VARCHAR(100),
  specs_json JSONB,
  description TEXT,
  image_url TEXT,
  is_approved BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_attributes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  attr_name VARCHAR(150) NOT NULL,
  attr_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  price BIGINT NOT NULL,
  effective_date TIMESTAMPTZ NOT NULL,
  approved_by VARCHAR(150),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  stock_quantity INT DEFAULT 0,
  warehouse_location VARCHAR(255),
  last_checked_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. RAG Knowledge Base & Vector Embeddings
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_path TEXT,
  file_size BIGINT,
  source_type VARCHAR(100) DEFAULT 'manual_upload',
  status VARCHAR(50) DEFAULT 'approved',
  extracted_text TEXT,
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  char_count INT,
  embedding_json JSONB,
  metadata_json JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS knowledge_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chunk_id UUID REFERENCES knowledge_chunks(id) ON DELETE CASCADE,
  model VARCHAR(100) DEFAULT 'text-embedding-3-small',
  embedding vector(1536) NOT NULL,
  dimensions INT DEFAULT 1536,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS knowledge_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  source_url TEXT,
  source_type VARCHAR(100) NOT NULL,
  is_approved BOOLEAN DEFAULT true,
  sync_schedule VARCHAR(100),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS knowledge_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  change_summary TEXT,
  approved_by VARCHAR(150),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. FAQ, Scenarios & AI Rules
CREATE TABLE IF NOT EXISTS faq_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category VARCHAR(150),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  tags_json JSONB,
  usage_count INT DEFAULT 0,
  is_approved BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales_scenarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scenario_name VARCHAR(255) NOT NULL,
  customer_intent VARCHAR(255) NOT NULL,
  suggested_action TEXT NOT NULL,
  script_template TEXT NOT NULL,
  priority INT DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_code VARCHAR(100) UNIQUE NOT NULL,
  rule_type VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  enforcement_level VARCHAR(50) DEFAULT 'strict',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Conversations & Leads
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  agent_id VARCHAR(100) DEFAULT 'tri-ai-sales-robot',
  skill_id VARCHAR(100) DEFAULT 'chatbot-sales-ai',
  title VARCHAR(255) DEFAULT 'Phiên tư vấn bán hàng',
  is_archived BOOLEAN DEFAULT false,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type VARCHAR(50) NOT NULL,
  sender_id VARCHAR(150),
  content TEXT NOT NULL,
  metadata_json JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(255),
  quantity INT DEFAULT 1,
  customer_requirement TEXT,
  conversation_id UUID REFERENCES conversations(id),
  website_source VARCHAR(255) DEFAULT 'TRÍ AI Humanoid Widget',
  widget_id VARCHAR(100) DEFAULT 'WIDGET_HUMANOID_V1',
  consent_to_contact BOOLEAN DEFAULT true,
  created_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  lead_status VARCHAR(100) DEFAULT 'NEW – WAITING FOR OWNER CONTACT',
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  activity_type VARCHAR(100) NOT NULL,
  performed_by VARCHAR(150) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. System, QA & Logs
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS unanswered_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id),
  question TEXT NOT NULL,
  context_json JSONB,
  status VARCHAR(50) DEFAULT 'pending',
  resolved_answer TEXT,
  resolved_by VARCHAR(150),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ai_test_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category VARCHAR(100) NOT NULL,
  test_name VARCHAR(255) NOT NULL,
  input_prompt TEXT NOT NULL,
  expected_behavior TEXT NOT NULL,
  forbidden_keywords TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_test_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_case_id UUID REFERENCES ai_test_cases(id) ON DELETE CASCADE,
  model_used VARCHAR(100) NOT NULL,
  ai_output TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  score REAL,
  evaluated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  evaluation_notes TEXT
);

CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category VARCHAR(100) DEFAULT 'general',
  key VARCHAR(150) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  is_secret BOOLEAN DEFAULT false,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  target_entity VARCHAR(100) NOT NULL,
  target_id VARCHAR(150),
  changes_json JSONB,
  ip_address VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  content_snippet TEXT,
  status VARCHAR(50) NOT NULL,
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agent_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id VARCHAR(100) NOT NULL,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  last_active_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

-- Indexes for ultra-fast query performance
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(lead_status);
CREATE INDEX IF NOT EXISTS idx_products_field ON products(field);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_conv_messages ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_hnsw ON knowledge_embeddings USING hnsw (embedding vector_cosine_ops);
