# BÁO CÁO KIỂM TOÁN TRÍ TUỆ NGỮ CẢNH (CONTEXT INTELLIGENCE)
# TRÍ AI ONE SUPER BRAIN — CONVERSATIONAL CONTINUITY & MULTI-THREAD AUDIT

> **Repository:** `https://github.com/TRINAMABANK/BOTCHAT` | **Branch:** `main`  
> **Commit SHA:** `65cff35063ccba4703a640a839b83104ef7d64fc`  
> **Kiểm toán viên:** Conversational AI Architect & Context Systems Engineer  

---

## 1. MỤC TIÊU VÀ TIÊU CHÍ KIỂM TOÁN NGỮ CẢNH

Kiểm toán khả năng duy trì dòng chảy suy nghĩ liên tục theo triết lý:  
**ONE BRAIN – ONE UNIFIED MEMORY – ONE CONTINUOUS CONVERSATION**

Các tiêu chí đánh giá:
1. **Co-reference Resolution:** Giải quyết đại từ chỉ định ("cái đó", "loại này", "con máy trước", "mẫu lúc nãy").
2. **Topic Switching:** Chuyển đổi chủ đề linh hoạt mà không làm mất thông tin cũ.
3. **Thread Freezing & Resumption:** Đóng băng tiến trình đang trao đổi và khôi phục nguyên vẹn khi khách hàng quay lại.
4. **Entity Isolation:** Cách ly thực thể giữa các luồng, tuyệt đối không để sản phẩm của luồng Bán hàng rò rỉ sang luồng Thời tiết, Chứng khoán hay Kỹ thuật.
5. **Context Expiration (TTL):** Xử lý vòng đời phiên ngữ cảnh (mặc định 30 phút).

---

## 2. KẾT QUẢ THỰC NGHIỆM TRÊN 100 KỊCH BẢN CONTEXT

Kết quả chạy thực tế từ bộ test [test_brain_performance_audit_500.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/tests/test_brain_performance_audit_500.js):
- **Tổng số kịch bản kiểm thử:** **100 tests**
- **Số kịch bản ĐẠT (PASS):** **100 tests (100.0%)**
- **Số kịch bản LỖI (FAIL):** **0 tests (0.0%)**

### Chi tiết 4 nhóm thử nghiệm thực tế:

```
[Group 2A] Co-reference Resolution:     25 / 25 PASS (100.0%)
[Group 2B] Dynamic Topic Switching:      25 / 25 PASS (100.0%)
[Group 2C] Old Topic Goal Resumption:   25 / 25 PASS (100.0%)
[Group 2D] Multi-thread Zero Crosstalk: 25 / 25 PASS (100.0%)
```

---

## 3. PHÂN TÍCH LUỒNG ĐIỀU PHỐI THỰC TẾ (ORCHESTRATION TRACING)

### Kịch bản 1: Hội thoại tiếp nối & Đại từ chỉ định
- **Lượt 1:** Khách: *"Tư vấn giúp anh máy in văn phòng Brother HL-L2321D"*  
  → `ActiveProductContext` lưu trữ: `{ name: "Máy in Brother HL-L2321D", category: "Máy in" }`.
- **Lượt 2:** Khách: *"Con đó in 2 mặt tự động được không?"*  
  → `ContextEngine.resolveCoReferences` nhận diện đại từ *"Con đó"*, ánh xạ chính xác về `Brother HL-L2321D`.  
  → Kết quả: Trả lời chính xác thông số in đảo mặt của đúng model Brother HL-L2321D, không hỏi lại tên máy.

### Kịch bản 2: Đổi chủ đề đột ngột và cách ly thực thể
- **Lượt 1:** Đang trao đổi về laptop Lenovo ThinkBook.
- **Lượt 2:** Khách đột ngột hỏi: *"Chiều nay ở Thủ Đức có mưa không em?"*  
  → `CentralBrainOrchestrator` (Stage 4C) nhận diện chủ đề `WEATHER_FORECAST`.  
  → Gọi `MultiThreadConversationEngine.switchTopic()`: Đóng băng thread laptop, kích hoạt thread thời tiết.  
  → Gọi `WeatherService.handleWeatherQuery()` lấy dữ liệu từ Open-Meteo.  
  → `SelfVerificationQualityGate` kiểm duyệt: Cột 2 đóng, không giới thiệu sản phẩm shop, không xin SĐT mua hàng.  
  → Khách nhận được thông tin dự báo thời tiết Thủ Đức chi tiết.

### Kịch bản 3: Khôi phục chủ đề cũ (Topic Resumption)
- **Lượt 3:** Khách tiếp tục: *"Quay lại chiếc laptop lúc nãy, làm báo giá giúp anh"*  
  → `CentralBrainOrchestrator` (Stage 4A) nhận diện hành vi giao tiếp `COMMUNICATIVE_ACTS.TOPIC_RESUMPTION`.  
  → Gọi `UnifiedMemoryCore.resumePreviousGoal()`: Lấy lại mục tiêu laptop đã đóng băng trong `GoalStack`.  
  → Gọi `QuotationService.createQuotation()`: Tạo bảng báo giá chính hãng gồm VAT 10% cho đúng chiếc laptop Lenovo ban đầu.  
  → Tự động kích hoạt câu hỏi phê duyệt: *"Tôi đã chuẩn bị báo giá. Anh có muốn gửi cho khách hàng không?"*

---

## 4. HẠN CHẾ & NGUY CƠ TIỀM ẨN CỦA TẦNG NGỮ CẢNH

1. **Điểm nghẽn RAM Storage:**  
   `MultiThreadConversationEngine._sessionPools` hiện được lưu trong biến tĩnh `static _sessionPools = new Map()`. Khi server Node.js restart, toàn bộ các thread tạm dừng của các khách hàng vãng lai chưa lưu vào database sẽ bị xóa sạch khỏi RAM.
2. **Thiếu cơ chế đồng bộ đa instance (Clustering / Multi-worker):**  
   Nếu triển khai ứng dụng trên cụm máy chủ hoặc tải cân bằng PM2 (Cluster Mode), hai request liên tiếp của cùng một khách hàng có thể rơi vào hai tiến trình Node.js khác nhau, dẫn đến mất ngữ cảnh thread nếu không dùng Redis hoặc cơ sở dữ liệu chung.
3. **Khuyến nghị kiến trúc:**  
   Bổ sung bảng `ai_conversation_threads` trong SQLite để lưu snapshot thread state mỗi khi có sự kiện `switchTopic()` hoặc `pauseThread()`.
