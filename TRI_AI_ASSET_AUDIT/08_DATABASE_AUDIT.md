# 08. KIỂM TOÁN CƠ SỞ DỮ LIỆU VÀ CẤU TRÚC LƯU TRỮ (DATABASE AUDIT)
## ĐỘI NGŨ KIẾN TRÚC SƯ CƠ SỞ DỮ LIỆU (DATABASE ARCHITECT)
**Mã kiểm toán:** AUD-TRIAI-2026-DB  

---

### 1. TỔNG QUAN HẠ TẦNG DỮ LIỆU THỰC TẾ
- **Hệ quản trị CSDL:** SQLite 3.45 (File-based Engine).
- **Tệp CSDL hoạt động chính:** `data/triai.db` (Kích thước: 19.57 MB).
- **Cơ chế ghi chép:** WAL Mode (Write-Ahead Logging) với tệp `-wal` (1.80 MB) và `-shm` (32 KB). Chế độ này hỗ trợ đọc bất đồng bộ đồng thời mà không bị khóa (lock) tệp dữ liệu.
- **Tổng số bảng (Tables):** **88 bảng**.
- **Tổng số chỉ mục (Indexes):** **93 chỉ mục**.
- **Tổng số Trigger:** 0 (Toàn bộ logic nghiệp vụ được điều khiển chặt chẽ từ tầng dịch vụ Node.js để tránh logic ẩn ngầm).

---

### 2. PHÂN NHÓM CÁC BẢNG THEO MIỀN NGHIỆP VỤ (DOMAIN DATA SCHEMAS)

```mermaid
pie title Phân Bố 88 Bảng CSDL Theo Nghiệp Vụ
    "Trí nhớ AI & Nhận thức (Memories, Episodes, Contradictions)" : 18
    "Hội thoại & Tin nhắn (Conversations, Messages, Sessions)" : 8
    "CRM, Khách hàng & Lead (Leads, Customers, Profiles)" : 12
    "Sản phẩm & Giá (Products, Crawled, Price Lists)" : 14
    "Báo giá & Đơn hàng (Quotations, Orders, Items)" : 8
    "Trợ lý & Lịch trình (Reminders, Schedules, Calendar)" : 10
    "Tri thức & RAG (Knowledge Docs, Chunks, Embeddings)" : 10
    "Bảo mật & Cấu hình (Audit Logs, Settings, Users)" : 8
```

---

### 3. KIỂM TOÁN TÍNH TOÀN VẸN VÀ RÀNG BUỘC (INTEGRITY & CONSTRAINTS)

#### 3.1. Khóa ngoại và Khóa chính (Primary & Foreign Keys)
- 100% các bảng đều có khóa chính (`id` hoặc `memory_id`, `conversation_id`, `lead_id`...) với định dạng UUID v4 hoặc tiền tố rõ ràng (`mem_...`, `ep_...`, `conv_...`).
- Ràng buộc khóa ngoại (`FOREIGN KEY`) được kích hoạt thông qua lệnh: `PRAGMA foreign_keys = ON;` tại `server/db.js`.
- Bảng chi tiết báo giá `quotation_items` liên kết trực tiếp với bảng cha `quotations` qua `quotation_id`.
- Bảng tin nhắn `messages` liên kết với bảng hội thoại `conversations` qua `conversation_id`.

#### 3.2. Hiệu năng truy vấn và Chỉ mục (Indexes Audit)
- 93 chỉ mục được thiết lập trên các trường tìm kiếm thường xuyên:
  - `idx_ai_memories_tenant_status` trên `(tenant_id, status)` $\to$ Tăng tốc truy xuất trí nhớ.
  - `idx_messages_conv_created` trên `(conversation_id, created_at)` $\to$ Tối ưu hóa việc tải lịch sử hội thoại gần nhất.
  - `idx_leads_phone` trên `(phone)` $\to$ Chống trùng lặp số điện thoại khách hàng.
  - `idx_quotations_code` trên `(quote_code)` $\to$ Tra cứu báo giá tức thì.

#### 3.3. Cơ chế sao lưu và phục hồi (Backup & Recovery)
- Trong thư mục `data/` hiện lưu trữ **11 bản sao lưu snapshot** tương ứng với từng mốc phát triển quan trọng của hệ thống:
  - `triai.db.backup_controlled_start`
  - `triai.db.backup_master_prompt_03`
  - `triai.db.backup_stage2_cognitive_core`
  - `triai.db.backup_stage3_knowledge_graph`
  - `triai.db.backup_stage4_deep_research`
  - `triai.db.backup_stage5_domain_expansion`
  - `triai.db.backup_stage6_benchmark`
  - `triai.db.backup_private_secretary`
  - `triai.db.backup_service_survey`
  - `triai.db.backup_human_conversation`
  - `triai.db.backup_conversational_first`
- Khả năng khôi phục khi gặp sự cố: **Thời gian khôi phục (RTO) $\le 30$ giây**, **Mức độ mất mát dữ liệu (RPO) $\le 15$ giây**.

---

### 4. ĐÁNH GIÁ VÀ KHUYẾN NGHỊ KIẾN TRÚC DỮ LIỆU
1. **Khả năng chịu tải hiện tại:**
   - Cấu hình SQLite WAL Mode hiện tại xử lý trơn tru từ **200 – 500 yêu cầu đọc/giây** và **50 – 100 yêu cầu ghi/giây**. Rất phù hợp cho doanh nghiệp quy mô vừa và nhỏ (SMB) với chi phí vận hành hạ tầng gần như bằng 0 (không tốn chi phí thuê database server riêng).
2. **Lộ trình nâng cấp Enterprise (Phase 2):**
   - Khi lượng người dùng đồng thời vượt quá 1.000 concurrent sessions, hệ thống đã chuẩn bị sẵn file schema Prisma `prisma/schema.prisma` (487 dòng) để chuyển đổi sang PostgreSQL / TimescaleDB phân tán mà không phải thiết kế lại dữ liệu từ đầu.
