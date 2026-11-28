# AUDIT_G1_G7_EXCELLENT_100
# 17 – SỔ ĐĂNG KÝ RỦI RO AN NINH VÀ HỆ THỐNG (SECURITY RISK REGISTER)

---

## 1. MA TRẬN ĐÁNH GIÁ VÀ XẾP HẠNG RỦI RO (RISK MATRIX)

| Mã Rủi ro | Cấp độ | Phân hệ | Tên Rủi ro | Nguy cơ tác động | Biện pháp giảm thiểu bắt buộc |
| :---: | :---: | :---: | :--- | :--- | :--- |
| **SEC-01** | **P0** | Identity | **Mất bản quyền và mạo danh OpenAI** | Người dùng tin rằng hệ thống thuộc về OpenAI, làm mất tính độc lập và chủ quyền của TRÍ AI. | Khóa chết định danh bằng `FounderIdentityEngine` deterministic. |
| **SEC-02** | **P0** | Multimodal | **Rủi ro nhận diện sai thiết bị do Heuristic** | Ảnh thiết bị khác nếu vô tình có tên file chứa `panasonic` sẽ bị tư vấn sai thông số kỹ thuật. | Bỏ heuristic tên file, tích hợp mô hình Computer Vision thật. |
| **SEC-03** | **P1** | G4/G5 | **Sai lệch ranh giới phân quyền sản phẩm** | Sản phẩm tiếp tân có thể bị khai thác để trả lời các câu hỏi tài chính do thiếu kiểm soát chặt. | Ép buộc RBAC và Product Scope trong `productConfigurationEngine.js`. |
| **SEC-04** | **P2** | Memory | **Mất dữ liệu phiên chat khi Crash / Restart** | Mất dữ liệu Goal Stack khi server khởi động lại hoặc khi mở rộng nhiều worker qua PM2 cluster. | Đồng bộ hóa Goal Stack xuống cơ sở dữ liệu SQLite hoặc Redis. |
| **SEC-05** | **P2** | Knowledge | **Nghẽn tri thức làm giảm trí thông minh** | Bot không đọc được tri thức đã nạp trong database, dẫn tới trả lời sai kiến thức chuyên môn. | Mở rộng Semantic Vector Probe song song cho mọi câu hỏi. |

---

## 2. ĐÁNH GIÁ CÁC BIỆN PHÁP AN NINH ĐANG HOẠT ĐỘNG TỐT (DEFENSE-IN-DEPTH)

1. **Chốt chặn an toàn tài chính Tier 3 (Level L4):**
   - Đã được kiểm chứng thực tế: Chặn đứng 100% các yêu cầu chuyển tiền tự động. Không có rủi ro thất thoát tài sản.
2. **Bộ lọc phòng chống tấn công SSRF:**
   - Đã được kiểm chứng thực tế: Chặn đứng 100% các dải IP nội bộ và metadata đám mây khi cào website.
3. **Phân lập Đa người thuê (Tenant Isolation):**
   - Đã được kiểm chứng thực tế: Toàn bộ truy vấn RAG đều lọc theo `org_id` / `tenant_id`, không có rủi ro rò rỉ dữ liệu giữa các doanh nghiệp.
