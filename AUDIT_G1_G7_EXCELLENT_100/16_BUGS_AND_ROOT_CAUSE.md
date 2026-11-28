# AUDIT_G1_G7_EXCELLENT_100
# 16 – DANH MỤC LỖI VÀ PHÂN TÍCH NGUYÊN NHÂN GỐC (BUGS & ROOT CAUSE)

---

## 1. PHÂN LOẠI MỨC ĐỘ LỖI KỸ THUẬT

- **P0 – Critical (Lỗi Nghiêm trọng):** Nguy cơ mất quyền sở hữu trí tuệ, mạo danh đơn vị khác, mock giả lập tính năng cốt lõi.
- **P1 – High (Lỗi Cao):** Lỗi kiến trúc tích hợp, module có trong mã nguồn nhưng không được gọi trong runtime.
- **P2 – Medium (Lỗi Trung bình):** Trí nhớ tạm thời trong RAM bị mất khi khởi động lại, nghẽn bộ định tuyến RAG.
- **P3 – Low (Lỗi Thấp):** Thiếu giao diện quản trị Web Admin.

---

## 2. DANH MỤC LỖI CHI TIẾT (BUGS REGISTER)

### LỖI BUG-01 [P0 - CRITICAL]: SỤP ĐỔ ĐỊNH DANH NGƯỜI SÁNG LẬP (OPENAI HALLUCINATION)
- **Vị trí:** [intentEngine.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/intelligence/intentEngine.js#L1057) & [naturalHumanConversationEngine.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/intelligence/naturalHumanConversationEngine.js#L222).
- **Mô tả:** Khi hỏi *"Ai sáng lập ra em?"*, bot trả lời do **OpenAI** sáng lập; từ chối cung cấp số điện thoại `0982441446` của Anh Quang Nhựt Trí.
- **Nguyên nhân gốc:** Bỏ sót phân loại ý định `FOUNDER_IDENTITY_INTENT`, luồng hội thoại không kích hoạt RAG, system prompt không định nghĩa Anh Trí.
- **Tác động:** Làm mất tính độc lập và bản quyền sáng chế của hệ thống.
- **Đề xuất khắc phục:** Xây dựng `FounderIdentityEngine` và chốt chặn Deterministic không qua LLM ngoài.

### LỖI BUG-02 [P0 - CRITICAL]: BỘ LỌC REGEX TỰ XÓA DANH TÍNH ANH QUANG NHỰT TRÍ
- **Vị trí:** [centralBrainService.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/centralBrainService.js#L64-L67).
- **Mô tả:** Regex trong `sanitizeAiResponse` xóa toàn bộ từ "Quang Nhựt Trí" nếu câu trả lời chứa cụm từ "của anh Quang Nhựt Trí".
- **Nguyên nhân gốc:** Tác dụng phụ ngoài ý muốn của bộ lọc chống bot tự xưng rập khuôn khi bán hàng.
- **Đề xuất khắc phục:** Bổ sung điều kiện miễn trừ (Bypass) cho câu trả lời định danh Người sáng lập.

### LỖI BUG-03 [P0 - CRITICAL]: THỊ GIÁC MÁY TÍNH VÀ VIDEO DÙNG MOCK / HEURISTIC
- **Vị trí:** [visionIntelligenceEngine.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/multimodal/visionIntelligenceEngine.js#L26-L50).
- **Mô tả:** Nhận diện ảnh bằng cách đọc tên file (`fileName.includes('panasonic')`), gán cứng `confidence: 0.96`, video trả về văn bản giả lập.
- **Nguyên nhân gốc:** Chưa tích hợp API thị giác máy tính thực tế (Gemini 1.5 Vision / CLIP).
- **Đề xuất khắc phục:** Tích hợp Gemini Flash Vision đọc buffer ảnh và sinh mô tả thông số kỹ thuật thực tế.

### LỖI BUG-04 [P1 - HIGH]: HỘI ĐỒNG 10 CHUYÊN GIA G4 CHƯA NỐI DÂY VÀO RUNTIME
- **Vị trí:** [centralBrainService.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/centralBrainService.js) & [expertCouncilManager.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/intelligence/expertCouncilManager.js).
- **Mô tả:** Module `expertCouncilManager.js` không được import và không được gọi trong `centralBrainService.js`.
- **Nguyên nhân gốc:** Phát triển phân hệ G4 độc lập nhưng bỏ quên bước nối dây vào luồng xử lý chính.
- **Đề xuất khắc phục:** Wire `ExpertCouncilManager` vào hàm `processChat`.

### LỖI BUG-05 [P1 - HIGH]: BẤT NHẤT HÀNH VI VÀ NHÂN CÁCH TRÊN 6 SẢN PHẨM
- **Vị trí:** [productConfigurationEngine.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/intelligence/productConfigurationEngine.js).
- **Mô tả:** 2 sản phẩm trả lời do OpenAI tạo ra, 4 sản phẩm trả lời do kỹ sư Việt Nam tạo ra.
- **Nguyên nhân gốc:** Chưa ép buộc nhân cách cốt lõi tối cao (Verified Ground Truth) xuống cấu hình của từng sản phẩm.
- **Đề xuất khắc phục:** Bắt buộc cả 6 sản phẩm kế thừa cùng một module định danh trung tâm.

### LỖI BUG-06 [P2 - MEDIUM]: GOAL STACK VÀ WORKING MEMORY LƯU TRONG RAM MAP
- **Vị trí:** [unifiedMemoryCore.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/memory/unifiedMemoryCore.js#L14-L18).
- **Mô tả:** Mất toàn bộ ngữ cảnh phiên làm việc và mục tiêu đang bàn khi server khởi động lại.
- **Nguyên nhân gốc:** Dùng `Map()` trong RAM để tăng tốc độ truy xuất nhưng thiếu cơ chế persistence xuống SQLite/Redis.
- **Đề xuất khắc phục:** Đồng bộ trạng thái Goal Stack xuống database sau mỗi lượt chat.

### LỖI BUG-07 [P2 - MEDIUM]: BỘ ĐỊNH TUYẾN RAG BỊ NGHẼN BỞI TỪ KHÓA CỨNG
- **Vị trí:** [centralBrainService.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/centralBrainService.js#L1239).
- **Mô tả:** RAG chỉ kích hoạt khi câu hỏi có chứa các từ: *quy trình, quy chế, quyết định, công văn...* Các câu hỏi khác bị bỏ qua RAG.
- **Nguyên nhân gốc:** Logic lọc quá cứng nhắc nhằm ngăn chặn RAG quấy rầy việc bán hàng thông thường.
- **Đề xuất khắc phục:** Bổ sung Semantic Vector Probe chạy song song cho mọi câu hỏi có độ tương đồng cao.

### LỖI BUG-08 [P3 - LOW]: THIẾU GIAO DIỆN WEB ADMIN CHO KHO TRI THỨC
- **Vị trí:** Frontend Admin Dashboard.
- **Mô tả:** Quản trị viên chưa có màn hình trực quan để upload hàng loạt file và kiểm duyệt feedback học hỏi.
- **Đề xuất khắc phục:** Xây dựng module Knowledge Management trên frontend.
