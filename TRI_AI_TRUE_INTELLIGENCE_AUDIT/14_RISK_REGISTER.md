# TRI_AI_TRUE_INTELLIGENCE_AUDIT
# 14 – SỔ ĐĂNG KÝ RỦI RO HỆ THỐNG (RISK REGISTER)

---

## 1. MA TRẬN ĐÁNH GIÁ RỦI RO (RISK MATRIX)

Hội đồng kiểm toán phân loại các rủi ro kỹ thuật và vận hành theo 4 cấp độ:
- **P0 (Critical):** Rủi ro nghiêm trọng đe dọa trực tiếp đến bản quyền, tính pháp lý và danh tính của hệ thống.
- **P1 (High):** Lỗi chức năng cốt lõi bị tê liệt hoặc không được kết nối vào runtime.
- **P2 (Medium):** Suy giảm trải nghiệm người dùng, mất dữ liệu tạm thời khi server khởi động lại.
- **P3 (Low):** Bất tiện về mặt giao diện quản trị, thiếu màn hình trực quan.

---

## 2. DANH MỤC RỦI RO CHI TIẾT (RISK REGISTER TABLE)

| Mã Rủi ro | Cấp độ | Tên Rủi ro | Vị trí phát sinh | Tác động thực tế | Biện pháp giảm thiểu bắt buộc |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **RSK-01** | **P0** | **Mất chủ quyền danh tính Người sáng lập** | `intentEngine.js`, `naturalHumanConversationEngine.js` | Bot nhận OpenAI là cha đẻ, từ chối số điện thoại Anh Trí, làm mất quyền sở hữu trí tuệ của sản phẩm. | Tạo `FOUNDER_IDENTITY_INTENT`, chốt chặn Deterministic không qua LLM. |
| **RSK-02** | **P0** | **Regex xóa danh xưng Người sáng lập** | `centralBrainService.js` (dòng 64–67) | Mọi nỗ lực nhắc tên "Anh Quang Nhựt Trí" đều bị bộ lọc regex tự động xóa sạch. | Bổ sung điều kiện miễn trừ trong `sanitizeAiResponse`. |
| **RSK-03** | **P1** | **Hội đồng Chuyên gia G4 bị cô lập (Unwired)** | `centralBrainService.js`, `expertCouncilManager.js` | Hệ thống quảng bá có 10 chuyên gia nhưng thực tế chạy 0 cuộc gọi, suy giảm năng lực tư vấn cấp cao. | Wire `ExpertCouncilManager` vào luồng `processChat`. |
| **RSK-04** | **P1** | **Không nhất quán hành vi giữa 6 sản phẩm** | `productConfigurationEngine.js` | 2 sản phẩm nói OpenAI, 4 sản phẩm nói kỹ sư Việt Nam, gây hoang mang cho người dùng doanh nghiệp. | Ép buộc một bộ quy tắc Verified Ground Truth chung cho cả 6 sản phẩm. |
| **RSK-05** | **P2** | **Mất Goal Stack khi Server Restart** | `unifiedMemoryCore.js` (dòng 14–18) | Khách hàng đang chốt đơn mà server reboot thì mất toàn bộ ngữ cảnh đang mua sắm. | Chuyển `workingContextStore` và `goalStackStore` xuống SQLite/Redis. |
| **RSK-06** | **P2** | **Nghẽn Routing ngăn cản RAG Tri thức** | `centralBrainService.js` (dòng 1239) | Tài liệu nạp vào DB rất nhiều nhưng chỉ truy xuất khi người dùng nói trúng từ khóa pháp quy nội bộ. | Bổ sung Semantic Vector Probe song song cho mọi câu hỏi. |
| **RSK-07** | **P3** | **Thiếu giao diện Web Admin quản lý tri thức** | Frontend UI | Quản trị viên phải cào web và kiểm duyệt feedback qua API hoặc DB trực tiếp. | Xây dựng màn hình Knowledge Center trên Admin Dashboard. |

---

## 3. KẾT LUẬN QUẢN TRỊ RỦI RO
Rủi ro **RSK-01 và RSK-02 (Cấp độ P0)** phải được xử lý ngay lập tức trong gói khắc phục đầu tiên để lập lại trật tự về danh tính và bản quyền của hệ thống TRÍ AI ONE SUPER BRAIN.
