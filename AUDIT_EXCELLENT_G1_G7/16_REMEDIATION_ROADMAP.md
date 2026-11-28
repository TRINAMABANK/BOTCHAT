# HỘI ĐỒNG KIỂM TOÁN ĐỘC LẬP TRÍ AI ONE SUPER BRAIN
# 16. REMEDIATION ROADMAP – LỘ TRÌNH KHẮC PHỤC ĐẠT CHUẨN EXCELLENT 100/100
### CHƯƠNG TRÌNH ĐÁNH GIÁ CHUẨN XUẤT SẮC TRÍ AI EXCELLENT 100/100
*Mã tài liệu: AUDIT-EXC-16 | Ngày: 28/11/2026*

---

## I. MỤC TIÊU LỘ TRÌNH

Cung cấp giải pháp kỹ thuật cụ thể, chi tiết tới từng dòng lệnh để nâng điểm toàn hệ thống từ **78.0 điểm lên 100/100 điểm chuẩn EXCELLENT**. Toàn bộ các hạng mục này **chỉ được triển khai sau khi có phê chuẩn chính thức** của Chủ hệ thống.

---

## II. 4 HẠNG MỤC KHẮC PHỤC TRỌNG YẾU

```
┌──────┬───────────────┬──────────────────────┬─────────────────────────────────────────────────────────┬─────────────┐
│ MÃ   │ PHÂN HỆ G1–G7 │ FILE CẦN TÁC ĐỘNG    │ GIẢI PHÁP KỸ THUẬT CỤ THỂ                               │ ĐIỂM CỘNG   │
├──────┼───────────────┼──────────────────────┼─────────────────────────────────────────────────────────┼─────────────┤
│ RM-01│ G6 (Multimodal│ server/services/     │ Tích hợp Google Gemini Vision API phân tích base64 ảnh  │ +6.0 điểm   │
│      │ Intelligence) │ multimodal/vision... │ thật sự; loại bỏ 100% filename heuristic & mock string. │ (Lên 10/10) │
├──────┼───────────────┼──────────────────────┼─────────────────────────────────────────────────────────┼─────────────┤
│ RM-02│ G4 (Expert    │ server/services/     │ Import `ExpertCouncilManager` vào centralBrainOrches... │ +4.0 điểm   │
│      │ Council)      │ centralBrainOrche... │ và gọi `conveneCouncil` khi câu hỏi đa ngành phức tạp.  │ (Lên 10/10) │
├──────┼───────────────┼──────────────────────┼─────────────────────────────────────────────────────────┼─────────────┤
│ RM-03│ G5 (Six       │ server/services/     │ Import `ProductConfigurationEngine` vào handleMessage   │ +5.5 điểm   │
│      │ Products)     │ centralBrainService  │ để tự động áp đặt tools & giới hạn quyền của 6 sản phẩm.│ (Lên 15/15) │
├──────┼───────────────┼──────────────────────┼─────────────────────────────────────────────────────────┼─────────────┤
│ RM-04│ G3 & G1       │ server/services/     │ Bổ sung lưu đệm Working Memory Goal Stack xuống SQLite  │ +3.5 điểm   │
│      │ (Architecture)│ unifiedMemoryCore.js │ để không bị mất ngữ cảnh phiên khi restart server.     │ (Lên 25/25) │
├──────┼───────────────┼──────────────────────┼─────────────────────────────────────────────────────────┼─────────────┤
│ TỔNG │ ĐẠT CHUẨN     │ 4 HẠNG MỤC CHÍNH     │ ĐẠT CHUẨN XUẤT SẮC TUYỆT ĐỐI                            │ **100/100** │
└──────┴───────────────┴──────────────────────┴─────────────────────────────────────────────────────────┴─────────────┘
```

---

## III. THIẾT KẾ CHI TIẾT TỪNG BƯỚC KHẮC PHỤC

### 1. Khắc phục RM-01 (G6: Multimodal Vision API Thật):
- Tại [visionIntelligenceEngine.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/multimodal/visionIntelligenceEngine.js):
  - Thay thế toàn bộ đoạn code kiểm tra `fileName.includes(...)`.
  - Sử dụng API `@google/generative-ai` với model `gemini-1.5-flash` nhận dữ liệu ảnh base64 thực tế:
    ```javascript
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent([
      "Phân tích ảnh thiết bị viễn thông/công nghệ và trích xuất cổng kết nối, linh kiện, nhãn hiệu:",
      { inlineData: { data: imageMeta.base64, mimeType: imageMeta.mimeType || 'image/jpeg' } }
    ]);
    ```

### 2. Khắc phục RM-02 (G4: Nối dây Hội đồng Chuyên gia Runtime):
- Tại [centralBrainOrchestrator.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/centralBrainOrchestrator.js):
  - Import `ExpertCouncilManager` từ `./intelligence/expertCouncilManager.js`.
  - Tại Stage 8 (Dispatch), nếu câu hỏi có tính chất đa ngành (kết hợp kỹ thuật, tài chính và pháp lý):
    ```javascript
    const councilEvaluation = await ExpertCouncilManager.conveneCouncil({
      query: pipelineContext.sanitizedText,
      context: params
    });
    if (councilEvaluation.handled) {
      return ResponseEngine.formatResponse({
        replyText: councilEvaluation.synthesisReport,
        toolsUsed: ['expert_council_manager', ...councilEvaluation.specialistsConsulted]
      });
    }
    ```

### 3. Khắc phục RM-03 (G5: Cưỡng chế Cấu hình 6 Sản phẩm):
- Tại [centralBrainService.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/centralBrainService.js):
  - Import `ProductConfigurationEngine` từ `./intelligence/productConfigurationEngine.js`.
  - Tại đầu hàm `handleMessage`:
    ```javascript
    const productConfig = ProductConfigurationEngine.getConfiguration(params.productScope || 'sales_robot');
    params.allowedTools = productConfig.toolsAllowed;
    params.systemPersonaPrompt = productConfig.systemPrompt;
    ```

### 4. Khắc phục RM-04 (G3: Bảo toàn Working Memory qua Restart):
- Tạo bảng `ai_memory_working_context` trong SQLite.
- Mỗi khi `pushGoal` hoặc `popGoal`, tự động đồng bộ xuống bảng SQLite này để khi server khởi động lại có thể nạp lại phiên làm việc dở dang.
