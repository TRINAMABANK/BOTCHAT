# KẾ HOẠCH KHẮC PHỤC SỰ CỐ & NÂNG CẤP ƯU TIÊN
# TRÍ AI ONE SUPER BRAIN — PRIORITIZED FIX ROADMAP (P0 TO P3)

> **Repository:** `https://github.com/TRINAMABANK/BOTCHAT` | **Branch:** `main`  
> **Commit SHA:** `65cff35063ccba4703a640a839b83104ef7d64fc`  
> **Nguyên tắc:** BẢN KẾ HOẠCH DÀNH CHO CHỦ DỰ ÁN DUYỆT TRƯỚC KHI THỰC HIỆN. TUYỆT ĐỐI KHÔNG TỰ Ý SỬA TRONG GIAI ĐOẠN KIỂM TOÁN.  

---

## 1. HẠNG MỤC P0 — LỖI NGHIÊM TRỌNG (CRITICAL SECURITY & ROUTING FIXES)

### Hạng mục P0-1: Mở rộng chốt chặn an toàn tài chính Tier 3 (Security L4 Bypass)
- **Tệp tin cần sửa:** [server/services/security/securityGovernanceGate.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/security/securityGovernanceGate.js)
- **Hàm cần sửa:** `evaluateAuthorization(params)`
- **Nguyên nhân gốc:** Regex chặn L4 chỉ lọc `chuyển tiền`, `thanh toán`, bỏ sót `rút tiền từ ví`, `xóa cơ sở dữ liệu`, `trừ tiền thẻ`.
- **Phương án sửa:**  
  Bổ sung danh sách mẫu L4 nghiêm ngặt bao quát các hành vi can thiệp tài chính và phá hủy hệ thống:
  ```javascript
  const L4_BLOCKED_PATTERNS = [
    /(?:rút|rut)\s*(?:tiền|tien)/i,
    /(?:trừ|tru)\s*(?:tiền|tien)/i,
    /(?:xóa|xoa)\s*(?:sạch|toàn\s*bộ)?\s*(?:dữ\s*liệu|database|cơ\s*sở\s*dữ\s*liệu)/i,
    /(?:chuyển|chuyen)\s*(?:khoản|tiền)/i,
    /(?:thanh\s*toán|thanh\s*toan)\s*(?:tự\s*động|ngay)/i
  ];
  ```
- **Rủi ro ảnh hưởng:** Rất thấp; chỉ tác động đến các câu lệnh độc hại.
- **Test hồi quy cần chạy:** `tests/test_security_audit_hardening.js` & Group 7 trong `test_brain_performance_audit_500.js`.
- **Điều kiện nghiệm thu:** 100% các câu lệnh rút tiền, trừ tiền, xóa database bị từ chối với thông báo Tier 3 an toàn.

---

### Hạng mục P0-2: Khắc phục xung đột thứ tự ưu tiên "Chính sách bán buôn"
- **Tệp tin cần sửa:** [server/services/intelligence/intentEngine.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/intelligence/intentEngine.js)
- **Hàm cần sửa:** `analyzeIntent(rawText, params)` & `isDocumentQuery()`
- **Nguyên nhân gốc:** Khi câu có chữ "Chính sách", hệ thống ưu tiên đẩy sang RAG tài liệu trước khi kiểm tra từ khóa bán hàng ("bán buôn", "bán sỉ").
- **Phương án sửa:**  
  Thêm điều kiện ngoại lệ: Nếu câu chứa `"bán buôn"`, `"bán sỉ"`, `"chiết khấu số lượng lớn"`, gán trực tiếp ý định là `SALES_CONSULTATION` hoặc `CATALOG_OVERVIEW`.
- **Rủi ro ảnh hưởng:** Cần đảm bảo các câu hỏi về *"Chính sách bảo mật"*, *"Chính sách tuyển dụng"* vẫn vào đúng RAG.
- **Test hồi quy cần chạy:** `tests/test_vietnamese_semantic_intelligence_100.js`.
- **Điều kiện nghiệm thu:** Câu hỏi *"Chính sách bán buôn như thế nào?"* được trả lời chính sách ưu đãi của shop và mở danh mục sản phẩm.

---

## 2. HẠNG MỤC P1 — LỖI QUAN TRỌNG & HOÀN THIỆN ĐẤU NỐI KIẾN TRÚC

### Hạng mục P1-1: Kích hoạt hỏi làm rõ khi câu hỏi thiếu thông tin (Premature Sufficiency)
- **Tệp tin cần sửa:** [server/services/intelligence/reasoningEngine.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/intelligence/reasoningEngine.js)
- **Hàm cần sửa:** `evaluateSufficiency(intentResult, context)`
- **Nguyên nhân gốc:** Khi câu hỏi dưới 4 từ và không có thực thể sản phẩm (như *"Tư vấn máy"*), hàm mặc định trả về `dataSufficient: true`.
- **Phương án sửa:**  
  Nếu độ dài câu hỏi `<= 3 từ` và không chứa mã model hay thương hiệu cụ thể, đặt `dataSufficient = false` và sinh câu hỏi làm rõ:
  *"Dạ em sẵn sàng hỗ trợ! Anh/chị đang cần tìm dòng máy in, máy đếm tiền hay máy tính cho văn phòng ạ? Ngân sách dự kiến của mình khoảng bao nhiêu để em tư vấn mẫu phù hợp nhất nhé!"*
- **Test hồi quy cần chạy:** 15 test ca `REASON_CLARIFY` trong bộ test 500.

---

### Hạng mục P1-2: Đấu nối ModelGateway & ToolGateway vào Central Brain
- **Tệp tin cần sửa:** [server/services/centralBrainService.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/centralBrainService.js)
- **Hàm cần sửa:** `runSmartOrchestratorFallback()`, `ToolOrchestrator.js`
- **Nguyên nhân gốc:** Hai module gateway được code hoàn chỉnh nhưng bị bỏ rơi, chưa import vào Service chính.
- **Phương án sửa:**  
  1. Import `ModelGateway` vào `centralBrainService.js`. Thay thế `callGemini(prompt)` bằng `ModelGateway.execute({ prompt, taskType })`.
  2. Bọc toàn bộ các lệnh thực thi công cụ trong `ToolOrchestrator` qua `ToolGateway.executeTool(name, params)` để có Timeout 5s và SSRF Shield.
- **Điều kiện nghiệm thu:** 100% các cuộc gọi LLM và Tool đều đi qua Gateway và có nhật ký đo lường latency/audit log.

---

### Hạng mục P1-3: Xóa bỏ mã trùng lặp (De-duplicate CF-2 đến CF-7)
- **Tệp tin cần sửa:** [server/services/centralBrainService.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/centralBrainService.js) (Dòng 400 đến 550)
- **Phương án sửa:** Xóa bỏ đoạn mã lặp lại CF-2..CF-7 trong `CentralBrainService` vì toàn bộ các logic này đã được `CentralBrainOrchestrator.runPipeline()` xử lý triệt để ở đầu hàm.

---

## 3. HẠNG MỤC P2 — TỐI ƯU HIỆU NĂNG & ĐỘ BỀN VỮNG DỮ LIỆU

### Hạng mục P2-1: Chuyển nạp Context sang chạy song song (`Promise.all`)
- **Tệp tin:** `server/services/centralBrainService.js` (Dòng 292, 348)
- **Phương án:** Chạy song song `ContextEngine.getConversationHistory()` và `KnowledgeGraphEngine.getAugmentedContext()`. Giảm 10ms độ trễ.

### Hạng mục P2-2: Lưu bền vững Thread Session xuống SQLite
- **Tệp tin:** `server/services/intelligence/multiThreadConversationEngine.js`
- **Phương án:** Lưu snapshot trạng thái `threads` vào bảng SQLite `conversations.metadata_json` mỗi khi đổi chủ đề, chấm dứt việc phụ thuộc 100% vào RAM.

---

## 4. HẠNG MỤC P3 — NÂNG CẤP MỞ RỘNG (EVOLUTIONARY ROADMAP)

1. **Chuẩn bị tích hợp Robot hình người & Màn hình Kiosk:** Tích hợp bộ đệm Streaming SSE để đẩy văn bản tức thời cho bộ đọc Text-to-Speech (TTS) của Robot, duy trì độ trễ phản hồi giọng nói < 500ms.
2. **Tri thức tự động cập nhật (Continuous Self-Improvement):** Tự động liên kết các câu hỏi khách hàng hay hỏi nhiều nhất trong `learning_gaps` với các tài liệu mới tải lên trong RAG.
