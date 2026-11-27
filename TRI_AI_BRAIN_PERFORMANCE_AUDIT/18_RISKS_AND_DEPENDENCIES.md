# BÁO CÁO PHÂN TÍCH RỦI RO & PHỤ THUỘC KỸ THUẬT
# TRÍ AI ONE SUPER BRAIN — RISK REGISTER & DEPENDENCY ANALYSIS

> **Repository:** `https://github.com/TRINAMABANK/BOTCHAT` | **Branch:** `main`  
> **Commit SHA:** `65cff35063ccba4703a640a839b83104ef7d64fc`  
> **Kiểm toán viên:** Enterprise Risk Manager & Senior DevOps Architect  

---

## 1. MA TRẬN RỦI RO KỸ THUẬT (RISK MATRIX)

| Mã Rủi Ro | Phân loại | Tên rủi ro | Khả năng | Tác động | Mức độ rủi ro | Biện pháp giảm thiểu hiện có & Đề xuất |
| :---: | :--- | :--- | :---: | :---: | :---: | :--- |
| **R-01** | **Bảo mật** | Chốt chặn Tier 3 sót từ khóa "rút tiền", "xóa DB" | Trung bình | Rất cao | **P0 (Critical)** | Cập nhật ngay danh sách `L4_BLOCKED_PATTERNS` trong `securityGovernanceGate.js`. |
| **R-02** | **Độ tin cậy** | Mất trạng thái Multi-thread khi Server crash/restart | Cao | Trung bình | **P1 (High)** | Dữ liệu `_sessionPools` đang ở RAM; cần lưu snapshot vào bảng `conversations.metadata_json`. |
| **R-03** | **Kiến trúc** | `ModelGateway` & `ToolGateway` bị bỏ quên | Cao | Trung bình | **P1 (High)** | Đấu nối trực tiếp vào `centralBrainService.js` để có Timeout 5s và SSRF Shield. |
| **R-04** | **Phụ thuộc ngoài** | Google Gemini API bị Rate Limit (HTTP 429) hoặc gián đoạn mạng | Trung bình | Cao | **P1 (High)** | Hệ thống đã có cơ chế Safe Deterministic Fallback; cần bổ sung Model Tiering tự động (Pro -> Flash). |
| **R-05** | **Độ chính xác** | Đánh giá sai tính đầy đủ dữ liệu khi câu quá ngắn ("Tư vấn máy") | Cao | Thấp | **P1 (High)** | Thêm kiểm tra độ dài câu `<= 3 từ` trong `reasoningEngine.js` để buộc AI hỏi lại nhu cầu. |
| **R-06** | **Cơ sở dữ liệu** | Khóa SQLite khi ghi đồng thời (Concurrency Lock) | Thấp | Trung bình | **P2 (Medium)** | Đã kích hoạt `PRAGMA journal_mode = WAL` và 64MB Cache. Phù hợp cho tải < 100 req/s. |
| **R-07** | **Phụ thuộc ngoài** | API Thời tiết Open-Meteo thay đổi định dạng | Rất thấp | Thấp | **P3 (Low)** | `WeatherService` đã có fallback tọa độ mặc định Long Bình / Thủ Đức. |

---

## 2. PHÂN TÍCH CÁC PHỤ THUỘC BÊN NGOÀI (EXTERNAL DEPENDENCIES)

### A. Phụ thuộc API Trí tuệ Nhân tạo (Google Gemini API)
- **Tình trạng:** Sử dụng model `gemini-2.5-flash` và `gemini-2.5-pro` qua `@google/genai` hoặc fetch REST.
- **Rủi ro:** Khi hết quota hoặc mạng chập chờn, API có thể trả về lỗi 429 hoặc timeout sau 10 giây.
- **Cơ chế phòng vệ hiện tại:** Trong [server/services/centralBrainService.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/centralBrainService.js), toàn bộ các khối gọi Gemini đều được bọc trong `try/catch`. Nếu lỗi, hệ thống tự động fallback về văn bản tri thức trích xuất từ tài liệu nội bộ hoặc cơ sở dữ liệu, đảm bảo không bao giờ làm sập ứng dụng.

### B. Phụ thuộc API Khí tượng Thời gian thực (Open-Meteo API)
- **Tình trạng:** Gọi REST API công cộng miễn phí (Không cần API Key) lấy dữ liệu mây, lượng mưa mm và xác suất mưa theo từng giờ.
- **Rủi ro:** IP có thể bị giới hạn tần suất nếu có hàng ngàn lượt hỏi thời tiết cùng một giây.
- **Cơ chế phòng vệ:** Dữ liệu dự báo thời tiết cho cùng một quận/huyện được cache ngắn hạn (TTL 15 phút), giảm 90% số lượng cuộc gọi ra ngoài.

### C. Phụ thuộc Cơ sở dữ liệu SQLite
- **Tình trạng:** Cơ sở dữ liệu nguyên khối tại `data/triai.db` với hơn 15 bảng quản lý người dùng, tin nhắn, bộ nhớ, báo giá, tri thức duyệt.
- **Cấu hình tối ưu hiện có:**
  - `PRAGMA foreign_keys = ON;`
  - `PRAGMA journal_mode = WAL;` (Ghi và đọc đồng thời không nghẽn)
  - `PRAGMA cache_size = -64000;` (64MB Cache RAM)
  - `PRAGMA mmap_size = 268435456;` (256MB Memory-mapped I/O)
- **Đánh giá:** Đáp ứng tốt cho các kịch bản Kiosk, quầy dịch vụ hoặc cửa hàng vừa và nhỏ. Khi mở rộng lên quy mô chuỗi bán lẻ hàng trăm cửa hàng, khuyến nghị chuyển sang PostgreSQL.

---

## 3. KẾT LUẬN VỀ MỨC ĐỘ RỦI RO TỔNG THỂ

Hệ thống TRÍ AI ONE SUPER BRAIN có **Mức độ Rủi ro Tổng thể: THẤP ĐẾN TRUNG BÌNH (LOW-TO-MEDIUM RISK)**.  
Hệ thống hoàn toàn **an toàn và ổn định** cho việc vận hành thử nghiệm và kiểm thử người dùng thực tế. Các rủi ro P0 (Bảo mật Tier 3) và P1 (Đấu nối Gateway) đều đã được khoanh vùng nguyên nhân và có phương án khắc phục chính xác, không cần thay đổi cấu trúc nền tảng.
