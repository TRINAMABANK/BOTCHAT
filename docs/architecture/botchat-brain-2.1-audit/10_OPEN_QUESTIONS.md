# DANH MỤC CÂU HỎI MỞ VÀ QUYẾT ĐỊNH CẦN PHÊ DUYỆT (OPEN QUESTIONS)
## TÀI LIỆU 10 – BOTCHAT BRAIN 2.1 AUDIT & ARCHITECTURE DESIGN

> **Dự án:** BOTCHAT  
> **Người tiếp nhận:** Chủ dự án / Ban lãnh đạo (Anh Quang Nhựt Trí & Ban điều hành TRINAMABANK)  
> **Mục đích:** Xin ý kiến định hướng cho 5 quyết định kiến trúc quan trọng trước khi bắt đầu giai đoạn Code & Implementation.

---

## 1. CÁC QUYẾT ĐỊNH KIẾN TRÚC CẦN PHÊ DUYỆT

### Quyết định 1: Cơ chế Tích hợp Lịch Google Calendar cho Anh Trí
- **Hiện trạng:** BOTCHAT Brain 2.1 đang hoạt động theo cơ chế **Trợ lý Tiếp nhận Chu đáo (Concierge Intake)**: Giải thích trung thực chưa kết nối Google Calendar cá nhân, ghi nhận 4 thông tin (Thời gian, Địa điểm, Mục đích, SĐT) và lưu vào bộ nhớ / CRM để anh Trí chủ động liên hệ lại.
- **Phương án đề xuất nâng cấp:** Tích hợp trực tiếp **Google Calendar API (OAuth 2.0 / Service Account)** để:
  - Tra cứu chính xác slot rảnh thực tế của anh Trí trong tuần.
  - Tự động tạo sự kiện lịch (Calendar Event) và gửi email mời sau khi khách bấm xác nhận.
- 👉 **Xin ý kiến Chủ dự án:** Duy trì cơ chế Trợ lý tiếp nhận ghi nhận lời nhắn hay tích hợp Google Calendar API trực tiếp?

---

### Quyết định 2: Kênh Gửi Email Báo Giá & Thông Báo Thực tế
- **Hiện trạng:** Hệ thống đang dừng lại ở việc sinh bản thảo nội dung Email (Drafting Template) và xuất bảng Markdown trong chat.
- **Phương án đề xuất:** Tích hợp một dịch vụ gửi thư thực tế:
  - *Lựa chọn A:* SMTP Server của doanh nghiệp (ví dụ: mail server nội bộ Nam A Bank / Google Workspace).
  - *Lựa chọn B:* Dịch vụ Email API chuyên dụng (SendGrid, Resend, Amazon SES).
- 👉 **Xin ý kiến Chủ dự án:** Chọn giải pháp hạ tầng gửi email nào để cấu hình trong `server/index.js`?

---

### Quyết định 3: Lộ trình Di chuyển Database từ SQLite sang PostgreSQL (Prisma SaaS Layer)
- **Hiện trạng:** Hệ thống runtime hiện đang vận hành ổn định trên SQLite (`data/triai.db` - 66 bảng). Đồng thời file `prisma/schema.prisma` đã định nghĩa sẵn cấu trúc PostgreSQL + pgvector chuẩn Enterprise SaaS.
- **Đánh giá rủi ro:** SQLite rất nhanh cho phiên bản đơn tổ chức nhưng không hỗ trợ tốt việc đồng thời ghi hàng ngàn giao dịch khi mở rộng ra hàng trăm doanh nghiệp.
- 👉 **Xin ý kiến Chủ dự án:** Giữ nguyên SQLite cho phiên bản 2.1 hay kích hoạt di chuyển sang PostgreSQL + pgvector ngay trong đợt nâng cấp này?

---

### Quyết định 4: Cơ chế Nhận diện Doanh nghiệp (Multi-Tenant Authentication)
- **Hiện trạng:** Biến `orgId` hiện đang mặc định là `'org_default'`, hoặc được truyền qua API body.
- **Phương án đề xuất chuẩn hóa:**
  - *Phương án A (Khuyên dùng):* Nhận diện qua Subdomain truy cập (ví dụ: `namabank.quangnhuttri.com` $\rightarrow$ `orgId = 'org_namabank'`).
  - *Phương án B:* Nhận diện qua JWT Token xác thực đăng nhập của khách hàng/nhân viên.
- 👉 **Xin ý kiến Chủ dự án:** Doanh nghiệp sẽ sử dụng mô hình Subdomain hay SSO Token để phân tách dữ liệu?

---

### Quyết định 5: Trải nghiệm Giao diện Cột 2 khi Thực hiện Tác vụ Phi Bán Hàng
- **Hiện trạng:** Cột 2 đang là nơi hiển thị Danh mục sản phẩm (Product Selector) và giỏ hàng. Khi chuyển sang các tác vụ như Hẹn gặp hay Phân tích Excel, Cột 2 tự động thu gọn lại (`revealCatalog: false`).
- **Phương án đề xuất:**
  - *Phương án A (Tối giản):* Tiếp tục thu gọn Cột 2 để khách tập trung tối đa vào nội dung hội thoại ở Cột 1.
  - *Phương án B (Đa năng):* Cột 2 biến đổi linh hoạt thành **Tiện ích Tương tác (Interactive Widget)**:
    - Khi hẹn gặp: Cột 2 hiển thị Lịch trình trực quan (Mini Calendar).
    - Khi phân tích Excel: Cột 2 hiển thị Bảng xem trước dữ liệu (Data Grid Preview).
    - Khi báo giá: Cột 2 hiển thị Bản in Báo giá PDF.
- 👉 **Xin ý kiến Chủ dự án:** Định hướng nâng cấp giao diện Cột 2 theo Phương án A hay Phương án B?
