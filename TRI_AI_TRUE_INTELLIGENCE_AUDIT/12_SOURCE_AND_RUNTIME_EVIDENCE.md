# TRI_AI_TRUE_INTELLIGENCE_AUDIT
# 12 – BẰNG CHỨNG MÃ NGUỒN VÀ RUNTIME (SOURCE & RUNTIME EVIDENCE)

---

## 1. MỤC ĐÍCH TÀI LIỆU

Tài liệu này đóng vai trò như một **Sổ bộ Bằng chứng Pháp lý Kỹ thuật (Forensic Evidence Register)**, liên kết trực tiếp giữa các kết luận kiểm toán với vị trí dòng code cụ thể, câu lệnh SQL thực tế, và bản ghi đầu ra runtime tại commit SHA `bf81a1a8454144ebba0f771743bc11c0bb4a8520`.

---

## 2. SỔ BỘ BẰNG CHỨNG KỸ THUẬT CHI TIẾT (EVIDENCE REGISTER)

### EV-01: Bằng chứng bot nhận OpenAI là cha đẻ (Identity Hallucination)
- **Tệp mã nguồn:** [naturalHumanConversationEngine.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/intelligence/naturalHumanConversationEngine.js#L222-L243)
- **Vị trí dòng code:** Dòng 222–243 (`buildHumanExpertPrompt`).
- **Thực tế mã:** Prompt chỉ ghi *"Bạn là TRÍ AI – một chuyên gia trí tuệ nhân tạo đa lĩnh vực..."*, hoàn toàn không chứa định danh Anh Quang Nhựt Trí (1982).
- **Log đầu ra runtime:**
  ```
  Query: "Cha đẻ của em là ai?"
  Runtime Stage: NATURAL_HUMAN_CONVERSATION_RESOLVED
  Runtime Tools Used: ["natural_human_conversation_engine"]
  Runtime Reply: "Dạ, 'cha đẻ' của em chính là tập thể các kỹ sư, nhà khoa học và chuyên gia công nghệ tài năng tại OpenAI..."
  ```
- **Kết luận kiểm toán:** Bằng chứng vật lý chứng minh bot bị ảo giác gán danh tính cho OpenAI.

### EV-02: Bằng chứng Regex vô tình xóa tên Anh Quang Nhựt Trí
- **Tệp mã nguồn:** [centralBrainService.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/centralBrainService.js#L64-L67)
- **Vị trí dòng code:** Dòng 64–67:
  ```javascript
  .replace(/(\*\*[^*]+?)\s*của\s*(?:anh\s+|chị\s+|ông\s+|bà\s+)?Quang Nhựt Trí\*\*/gi, '$1**')
  .replace(/\s*của\s*(?:anh\s+|chị\s+|ông\s+|bà\s+)?(?:\*\*|\*|__|_)?Quang Nhựt Trí(?:\*\*|\*|__|_)?[\.]?/gi, '')
  ```
- **Kết luận kiểm toán:** Cơ chế Regex này trực tiếp tước bỏ tên người sáng lập khỏi câu trả lời của AI.

### EV-03: Bằng chứng Hồ sơ Người sáng lập nằm trong DB nhưng bị bỏ rơi
- **Cơ sở dữ liệu:** `data/triai.db` $\rightarrow$ Bảng `knowledge_documents` & `knowledge_chunks`.
- **Query kiểm chứng:**
  `SELECT id, title FROM knowledge_documents WHERE title LIKE '%Quang Nhựt Trí%'`
- **Kết quả thực tế:**
  `doc_6192b643-d08f-4028-b5ba-976f135f21ff` – *"Hồ sơ Xác thực Người Sáng lập & Cha đẻ TRÍ AI ONE SUPER BRAIN"* (3 chunks).
- **Điểm gãy luồng:** Tại [centralBrainService.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/centralBrainService.js#L1239), RAG chỉ kích hoạt nếu câu hỏi có từ: *tài liệu, quy trình, quy chế, quyết định, công văn...*. Câu hỏi *"Ai sáng lập ra em?"* không có các từ này nên **không bao giờ được tra cứu DB**.

### EV-04: Bằng chứng Hội đồng Chuyên gia G4 là mã chết trong runtime
- **Tệp mã nguồn:** [expertCouncilManager.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/intelligence/expertCouncilManager.js)
- **Lệnh kiểm tra:** `grep "expertCouncil" server/services/centralBrainService.js` $\rightarrow$ **0 matches**.
- **Kết luận kiểm toán:** `ExpertCouncilManager` không được import và không được gọi trong luồng xử lý tin nhắn của `CentralBrainService`.

### EV-05: Bằng chứng Goal Stack lưu trên RAM Map (Dễ bay hơi)
- **Tệp mã nguồn:** [unifiedMemoryCore.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/memory/unifiedMemoryCore.js#L14-L18)
- **Vị trí dòng code:** Dòng 14–18:
  ```javascript
  const workingContextStore = new Map();
  const goalStackStore = new Map();
  const semanticCache = new Map();
  const episodicBuffer = new Map();
  ```
- **Log runtime test:** Khi tiến trình Node.js khởi động lại, `goalStackStore` bị reset về rỗng.

### EV-06: Bằng chứng Trí nhớ Ngữ nghĩa lưu trữ thực tế trong SQLite
- **Cơ sở dữ liệu:** Bảng `ai_memories` trong `data/triai.db`.
- **Query kiểm chứng:** `SELECT count(*) as cnt FROM ai_memories` $\rightarrow$ **868 bản ghi**.
- **Query mâu thuẫn:** `SELECT count(*) as cnt FROM ai_memory_contradictions` $\rightarrow$ **234 bản ghi**.
- **Kết luận:** Hệ thống có năng lực ghi nhớ sự thật về khách hàng và phát hiện mâu thuẫn rất tốt.

### EV-07: Bằng chứng Bộ máy Suy luận nhận diện thiếu dữ liệu
- **Tệp mã nguồn:** [reasoningEngine.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/intelligence/reasoningEngine.js#L130-L160)
- **Log runtime test:**
  ```json
  {
    "dataSufficient": false,
    "clarificationQuestion": "Dạ bạn đang quan tâm dòng máy hoặc thiết bị cụ thể nào (như laptop, máy in hay linh kiện) để em tư vấn chính xác nhất ạ?"
  }
  ```
- **Kết luận:** Nhận diện thiếu thông tin hoạt động thực chất, không phán đoán bừa bãi.

---

## 3. BẢNG TỔNG HỢP TRẠNG THÁI BẰNG CHỨNG

| Mã bằng chứng | Phân hệ | Mô tả bằng chứng | Trạng thái kỹ thuật |
| :---: | :---: | :--- | :---: |
| **EV-01** | Identity | Bot nhận OpenAI là cha đẻ | **FAIL (Ảo giác)** |
| **EV-02** | Identity | Regex vô tình xóa danh xưng Anh Trí | **FAIL (Lỗi bộ lọc)** |
| **EV-03** | Knowledge | Hồ sơ Founder trong DB không được tra cứu | **FAIL (Nghẽn Routing)** |
| **EV-04** | Expert | Hội đồng Chuyên gia không được import | **FAIL (Unwired G4)** |
| **EV-05** | Memory | Goal Stack lưu trong RAM Map | **CONDITIONAL (Dễ mất)** |
| **EV-06** | Memory | 868 bản ghi trí nhớ & 234 mâu thuẫn | **PASS (Thực chất)** |
| **EV-07** | Reasoning | Nhận diện thiếu dữ liệu & đặt câu hỏi | **PASS (Thực chất)** |
