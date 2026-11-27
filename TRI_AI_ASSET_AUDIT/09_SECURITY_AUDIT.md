# 09. KIỂM TOÁN AN NINH MẠNG VÀ AN TOÀN HỆ THỐNG (CYBERSECURITY AUDIT)
## ĐỘI NGŨ CHUYÊN GIA AN TOÀN THÔNG TIN & THẨM ĐỊNH BẢO MẬT
**Mã kiểm toán:** AUD-TRIAI-2026-SEC  
**Tiêu chuẩn đối chiếu:** OWASP Top 10 API Security, OWASP Top 10 for LLM Applications  

---

### 1. MA TRẬN ĐÁNH GIÁ 15 HẠNG MỤC AN TOÀN THÔNG TIN

| STT | Hạng Mục Kiểm Toán | Mức Độ Rủi Ro Ban Đầu | Biện Pháp Phòng Thủ Trong Mã Nguồn | Trạng Thái Thực Tế | Điểm Đánh Giá |
|:---:|:---|:---:|:---|:---:|:---:|
| **1** | **Xác thực Admin & Mật khẩu** | Cao | Sử dụng thuật toán chuẩn `PBKDF2` (100.000 vòng lặp, Salt ngẫu nhiên 16 bytes). Không lưu mật khẩu thô trong CSDL. | **An toàn tuyệt đối** | 10 / 10 |
| **2** | **Quản lý Khóa Bí Mật & API Key** | Cực cao | Ẩn 100% API key qua endpoint `/api/settings` (dòng 135-145 `server/index.js`), chỉ trả về cờ boolean `has_openai_key`. Key lưu trong biến môi trường `.env`. | **An toàn** | 9.5 / 10 |
| **3** | **Chống Tấn Công Chèn Mã (SQLi)** | Cực cao | 100% câu lệnh truy vấn SQLite đều sử dụng Parameterized Queries (`?` placeholder) qua wrapper `server/db.js`. Không dùng phép nối chuỗi thô. | **Miễn nhiễm SQLi** | 10 / 10 |
| **4** | **Bảo Vệ Chống SSRF (Server-Side Request Forgery)** | Cao | Module `server/utils/ssrfProtection.js` kiểm tra IP/Hostname trước khi gọi công cụ ngoài; chặn đứng toàn bộ dải mạng Private (`127.0.0.1`, `10.0.0.0/8`, `192.168.0.0/16`, `169.254.0.0/16`, `localhost`). | **Chặn đứng SSRF** | 10 / 10 |
| **5** | **Chống Prompt Injection** | Cao | Input được khử khuẩn tại `_stage1SanitizeInput()`, phân tách rạch ròi giữa System Instructions và User Messages trong các payload gọi Model Gateway. | **An toàn cao** | 9.0 / 10 |
| **6** | **Chốt Chặn An Toàn Cấp Tier 3 (Financial Transfer)** | Cực cao | `SecurityGovernanceGate` chặn đứng 100% các yêu cầu chuyển tiền tự động, thanh toán hoặc can thiệp dữ liệu phá hủy L4. | **Chặn đứng tuyệt đối** | 10 / 10 |
| **7** | **Chống Path Traversal (File Upload)** | Cao | Tệp tải lên tại `/uploads` được kiểm tra phần mở rộng và chuẩn hóa đường dẫn qua `path.resolve()`, không cho phép nhảy thư mục (`../`). | **An toàn** | 9.0 / 10 |
| **8** | **Chống Tấn Công XSS (Cross-Site Scripting)** | Trung bình | Thiết lập Header `X-XSS-Protection: 1; mode=block` và React tự động escape HTML khi render state. | **An toàn** | 9.5 / 10 |
| **9** | **Chống Tấn Công Clickjacking** | Trung bình | Thiết lập Header `X-Frame-Options: SAMEORIGIN`. | **An toàn** | 9.5 / 10 |
| **10** | **Kiểm Soát Nguồn Gốc (CORS Whitelist)** | Cao | Whitelist nghiêm ngặt tại `server/index.js:L34-L64`. Ở chế độ Production, mọi domain ngoài danh sách đều bị từ chối truy cập. | **An toàn** | 9.5 / 10 |
| **11** | **Cách Ly Dữ Liệu Tenant (Cross-Tenant Leakage)** | Cực cao | Toàn bộ truy vấn trí nhớ và đơn hàng đều bắt buộc kèm `tenant_id` (`org_id`). Bảng `ai_security_audit_logs` ghi nhận 331 sự kiện kiểm toán phân quyền. | **Cách ly tốt** | 9.2 / 10 |
| **12** | **Giới Hạn Tần Suất Yêu Cầu (Rate Limiting)** | Trung bình | Hiện sử dụng timeout 5s trên từng tool call. Cần bổ sung middleware `express-rate-limit` ở tầng gateway trước khi mở public internet. | **Cần bổ sung** | 7.5 / 10 |
| **13** | **Chữ Ký Toàn Vẹn Kiểm Toán (Audit Trail)** | Cao | Các hành động L4 yêu cầu mã xác thực HMAC SHA-256 không thể chối bỏ (Non-repudiation). | **An toàn cao** | 9.5 / 10 |
| **14** | **Kiểm Soát Độ Trễ & Treo Tiến Trình (DoS/Timeout)** | Cao | `ToolGateway` thiết lập cơ chế ngắt cưỡng bức (Timeout) sau đúng 5.000ms, ngăn chặn công cụ bên ngoài bị treo làm đơ server. | **An toàn** | 9.5 / 10 |
| **15** | **Rò Rỉ Dữ Liệu Khách Hàng (Data Leak)** | Cực cao | `SecretaryHandler.handleUnauthorizedAccess` chặn đứng hành vi dò hỏi thông tin khách hàng khác hoặc lịch trình bí mật của chủ sở hữu. | **An toàn cao** | 9.5 / 10 |

---

### 2. KẾT QUẢ KIỂM TOÁN TỆP BÍ MẬT & API KEY
- **Kiểm tra mã nguồn:**
  - Không có bất kỳ khóa riêng (Private Key), mật khẩu quản trị viên dạng rõ (Plaintext) hay token nhạy cảm nào bị hardcode trong mã nguồn JavaScript được commit lên Git.
  - Toàn bộ cấu hình nhạy cảm được nạp động từ file môi trường `.env` hoặc bảng `bot_settings` đã qua mã hóa.
- **Khuyến nghị an ninh vận hành:**
  - Định kỳ luân phiên (rotate) các API key của OpenAI và Google Gemini sau mỗi 90 ngày.
  - Bổ sung cấu hình tường lửa Web Application Firewall (WAF) Cloudflare phía trước VPS production.
