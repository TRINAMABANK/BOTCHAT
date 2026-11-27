# BÁO CÁO KIỂM TOÁN SUY LUẬN & LẬP KẾ HOẠCH
# TRÍ AI ONE SUPER BRAIN — REASONING, CRITICAL THINKING & PLANNING AUDIT

> **Repository:** `https://github.com/TRINAMABANK/BOTCHAT` | **Branch:** `main`  
> **Commit SHA:** `65cff35063ccba4703a640a839b83104ef7d64fc`  
> **Kiểm toán viên:** Principal AI Architect & AI Research Engineer  

---

## 1. MỤC TIÊU VÀ PHẠM VI KIỂM TOÁN

Đánh giá năng lực tư duy bậc cao (Higher-Order Cognitive Functions) của TRÍ AI:
- **Phân tích vấn đề & Nguyên nhân gốc rễ (Root Cause Analysis):** Thuật toán 5-Whys.
- **Suy luận logic & Đánh giá mức độ đầy đủ dữ liệu (Data Sufficiency):** Khả năng dừng lại để hỏi làm rõ thay vì trả lời bừa.
- **Tư duy phản biện (Critical Thinking):** Phát hiện tiền đề sai (False Premise), ngụy biện logic (Fallacy).
- **Lập kế hoạch đa bước (Multi-step Planning):** Phân rã mục tiêu phức tạp thành các bước tuần tự.
- **Xử lý phản đối bán hàng (LEAR Objection Handling):** Lắng nghe, đồng cảm, giải thích giá trị thay vì giảm giá vội vã.

---

## 2. KẾT QUẢ KIỂM THỬ THỰC TẾ TRÊN 130 KỊCH BẢN

Thực hiện 80 test Suy luận + 50 test Lập kế hoạch trong [test_brain_performance_audit_500.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/tests/test_brain_performance_audit_500.js):

| Nhóm Kiểm Thử | Số lượng test | ĐẠT (PASS) | LỖI (FAIL) | Tỷ lệ Đạt | Nhận xét kiểm toán |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Multi-step Logical Deductions** | 15 | 15 | 0 | **100%** | Phân tầng độ phức tạp (STANDARD vs DEEP_COGNITIVE) chuẩn xác. |
| **Clarification for Insufficient Data** | 15 | 0 | 15 | **0.0% (LỖI TOÀN BỘ)** | Câu hỏi *"Tư vấn máy"* bị đánh giá nhầm là `dataSufficient: true`. |
| **Critical Thinking & Fallacy Detection**| 15 | 15 | 0 | **100%** | Nhận diện xuất sắc ngụy biện False Equivalence, Sunk Cost. |
| **Price Objection (LEAR Framework)** | 15 | 9 | 6 | **60.0% (LỖI 6 CA)** | Sót từ ngữ phản đối giá: *"chát quá"*, trật tự từ *"Khách chê giá cao"*. |
| **Hardware Compatibility Reasoning** | 20 | 20 | 0 | **100%** | Truy vấn đồ thị tri thức bắt đúng mã mực, cụm sấy. |
| **Tool Selection Dispatch** | 20 | 20 | 0 | **100%** | Chọn đúng công cụ: Quotation, Weather, RAG, Excel, Web. |
| **Formal Quotation Math (10% VAT)** | 15 | 15 | 0 | **100%** | Toán học tất định 100% chính xác từng đồng, không ảo giác. |
| **Service vs Product Tool Separation** | 15 | 12 | 3 | **80.0% (LỖI 3 CA)** | Nhầm lẫn *"khảo sát lắp đặt mạng văn phòng"* thành trò chuyện. |

---

## 3. PHÁT HIỆN SỰ CỐ KIẾN TRÚC & NGUYÊN NHÂN GỐC RỄ

### Phát hiện 1: Module `cognitiveReasoningEngine.js` bị bỏ quên hoàn toàn (Unconnected Module)
- **Bằng chứng trong mã nguồn:**  
  File [server/services/intelligence/cognitiveReasoningEngine.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/intelligence/cognitiveReasoningEngine.js) chứa phương thức `analyzeRootCause()` phân tích 5-Whys rất chi tiết cho sự cố kẹt giấy máy in và chi phí in ấn.  
  Tuy nhiên, khi grep toàn bộ thư mục `server/`, **không có bất kỳ file nào import class này!**  
  File `centralBrainOrchestrator.js` ghi trong comment là Stage 7 có 5-Whys nhưng thực chất chỉ gọi LEAR framework và giải thích nguyên lý.  
- **Hậu quả:** Năng lực phân tích nguyên nhân gốc rễ 5-Whys tồn tại trong code nhưng không bao giờ chạy ở runtime.

### Phát hiện 2: `ReasoningEngine.planExecution` đánh giá sai tính đầy đủ dữ liệu (Premature Sufficiency)
- **Bằng chứng:** Khi khách gửi câu hỏi *"Tư vấn máy"*, intent được gán là `PRODUCT_CONSULTATION`.  
  Trong hàm `evaluateSufficiency()` của `ReasoningEngine.js`, hệ thống kiểm tra:
  ```javascript
  if (primaryIntent === 'PRODUCT_CONSULTATION' && slots.quantity) ...
  ```
  Nhưng nếu `slots` rỗng, nó mặc định rơi vào nhánh `dataSufficient: true` với `clarificationQuestion: null`.
- **Hậu quả:** AI vội vàng xả danh mục sản phẩm hoặc trả lời chung chung thay vì hỏi lại: *"Anh/chị cần tư vấn dòng máy in, máy đếm tiền hay máy tính ạ? Ngân sách dự kiến của mình khoảng bao nhiêu?"*

### Phát hiện 3: Pattern phản đối giá (Objection Handling) bị hẹp
- Regex hiện tại trong `centralBrainOrchestrator.js` (dòng 267) và `centralBrainService.js` (dòng 482) chỉ bắt:
  `/(giá cao quá|gia cao qua|đắt quá|chê đắt|chê mắc|giá đắt|giá mắc|đắt thế)/`  
  Do đó, khi khách hàng dùng tiếng Việt tự nhiên: *"giá này chát quá"*, *"bớt đi em"*, *"bên khác bán mềm hơn"*, AI không nhận diện được để kích hoạt quy trình LEAR.

---

## 4. ĐỀ XUẤT NÂNG CẤP BẬC CAO (P1)

1. **Đấu nối `cognitiveReasoningEngine.js` vào CentralBrainOrchestrator (Stage 7):**  
   Cho phép kích hoạt phân tích 5-Whys và đánh giá CapEx vs OpEx khi khách hàng hỏi về sự cố lặp lại hoặc bài toán tối ưu chi phí thiết bị văn phòng.
2. **Siết chặt điều kiện `evaluateSufficiency`:**  
   Nếu độ dài câu hỏi dưới 4 từ và không chứa tên thiết bị cụ thể, bắt buộc trả về `dataSufficient: false` và sinh câu hỏi làm rõ nhu cầu.
3. **Mở rộng từ điển phản đối giá trong `UniversalSalesConsultant`:** Bổ sung các từ: `chát`, `chát quá`, `bớt`, `giảm giá đi`, `hơi cao`, `rẻ hơn`.
