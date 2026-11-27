# BÁO CÁO 19: BẢNG THEO DÕI RỦI RO VÀ PHÂN LOẠI LỖI (P0 - P3)
## RISK REGISTER & DEFECT SEVERITY CLASSIFICATION

### 1. PHÂN CẤP MỨC ĐỘ RỦI RO
- **P0 (Critical):** Rủi ro mất an toàn, rò rỉ dữ liệu hoặc sai lệch tài chính nghiêm trọng.
- **P1 (High):** Ảnh hưởng trực tiếp đến khả năng hiểu, nhớ và suy luận hội thoại.
- **P2 (Medium):** Ảnh hưởng hiệu năng, trải nghiệm người dùng hoặc phụ thuộc dịch vụ ngoài.
- **P3 (Low):** Tối ưu hóa mã nguồn, refactor và cải tiến dài hạn.

---

### 2. BẢNG DANH MỤC RỦI RO ĐÃ ĐƯỢC KIỂM TOÁN

| Mã rủi ro | Mức độ | Thành phần liên quan | Mô tả rủi ro | Trạng thái hiện tại | Biện pháp kiểm soát & Khuyến nghị |
|:---:|:---:|---|---|:---:|---|
| **RISK-01** | **P0** | Security Governance | Nguy cơ AI tự ý kích hoạt chuyển tiền khi bị Prompt Injection. | **ĐÃ GIẢI QUYẾT** | Chốt chặn Tier 3/L4 chặn tuyệt đối mọi lệnh tài chính tự động. |
| **RISK-02** | **P0** | Database / Multi-tenant | Nguy cơ rò rỉ dữ liệu trí nhớ giữa các doanh nghiệp (Tenant). | **ĐÃ GIẢI QUYẾT** | Bộ lọc `WHERE tenant_id = ?` phân tách cứng tại tầng cơ sở dữ liệu. |
| **RISK-03** | **P1** | Model Gateway | Phụ thuộc vào giới hạn Quota Free Tier của Google Gemini (15 RPM). | **ĐÃ GIẢI QUYẾT** | Tự động chuyển đổi sang Local Fallback Engine khi gặp lỗi HTTP 429. |
| **RISK-04** | **P2** | Storage Layer | File SQLite `triai.db` tăng trưởng kích thước khi lưu trữ hàng triệu tin nhắn. | **THEO DÕI** | Cần bổ sung cơ chế lưu trữ phân vùng (Archiving) cho tin nhắn trên 90 ngày. |
| **RISK-05** | **P2** | Tool Gateway | Nguy cơ tấn công dò quét mạng nội bộ SSRF qua công cụ tìm kiếm web. | **ĐÃ GIẢI QUYẾT** | Chốt chặn kiểm tra dải IP Private (RFC 1918) chặn 100% truy cập nội bộ. |
| **RISK-06** | **P3** | Architecture | Trùng lặp một phần giữa `ReasoningEngine` và `CognitiveReasoningEngine`. | **CHẤP NHẬN** | Đã phân tầng: 1 bên chuyên Bán hàng thực dụng, 1 bên chuyên Phương pháp luận. |
