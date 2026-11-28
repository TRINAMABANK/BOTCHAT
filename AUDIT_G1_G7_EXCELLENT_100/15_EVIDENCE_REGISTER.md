# AUDIT_G1_G7_EXCELLENT_100
# 15 – SỔ BỘ BẰNG CHỨNG PHÁP LÝ KỸ THUẬT (EVIDENCE REGISTER)

---

## 1. NGUYÊN TẮC BẰNG CHỨNG KIỂM TOÁN

Mỗi bằng chứng được ghi nhận trong Sổ bộ này phải thỏa mãn 4 tiêu chuẩn bắt buộc:
1. Có đường dẫn file và số dòng mã nguồn cụ thể.
2. Có câu lệnh SQL hoặc dữ liệu kiểm chứng trong database `data/triai.db`.
3. Có kết quả log đầu ra thực tế (`stdout`).
4. Gắn liền với commit SHA `bf81a1a8454144ebba0f771743bc11c0bb4a8520`.

---

## 2. DANH MỤC BẰNG CHỨNG CHI TIẾT (EVIDENCE REGISTER)

### EV-01: Bằng chứng bot nhận OpenAI là cha đẻ (Identity Hallucination)
- **Tệp mã nguồn:** [naturalHumanConversationEngine.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/intelligence/naturalHumanConversationEngine.js#L222-L243)
- **Dòng mã:** Dòng 222–243 (`buildHumanExpertPrompt`).
- **Nội dung:** System prompt không chứa định danh Anh Quang Nhựt Trí (1982).
- **Log đầu ra thực tế:** `Runtime Reply: "Dạ, 'cha đẻ' của em chính là tập thể các kỹ sư, nhà khoa học và chuyên gia công nghệ tài năng tại OpenAI..."`
- **Phân loại bằng chứng:** **RUNTIME VERIFIED – FAIL**.

### EV-02: Bằng chứng Regex tự động xóa danh xưng Anh Quang Nhựt Trí
- **Tệp mã nguồn:** [centralBrainService.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/centralBrainService.js#L64-L67)
- **Dòng mã:** Dòng 64–67:
  ```javascript
  .replace(/(\*\*[^*]+?)\s*của\s*(?:anh\s+|chị\s+|ông\s+|bà\s+)?Quang Nhựt Trí\*\*/gi, '$1**')
  .replace(/\s*của\s*(?:anh\s+|chị\s+|ông\s+|bà\s+)?(?:\*\*|\*|__|_)?Quang Nhựt Trí(?:\*\*|\*|__|_)?[\.]?/gi, '')
  ```
- **Hành vi:** Xóa bỏ toàn bộ từ "Quang Nhựt Trí" nếu câu trả lời chứa cụm từ "của anh Quang Nhựt Trí".
- **Phân loại bằng chứng:** **SOURCE VERIFIED – DEFECT**.

### EV-03: Bằng chứng Hội đồng Chuyên gia G4 là mã chết (Unwired Component)
- **Tệp mã nguồn:** [expertCouncilManager.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/intelligence/expertCouncilManager.js)
- **Kiểm chứng tìm kiếm:** `grep "expertCouncil" server/services/centralBrainService.js` $\rightarrow$ **0 kết quả**.
- **Log thực tế:** 0 cuộc gọi đến `ExpertCouncilManager` khi nhận tin nhắn từ người dùng.
- **Phân loại bằng chứng:** **INTEGRATION VERIFIED – FAIL**.

### EV-04: Bằng chứng Vision Engine dùng Heuristic tên file & Video Mock
- **Tệp mã nguồn:** [visionIntelligenceEngine.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/multimodal/visionIntelligenceEngine.js#L26-L50)
- **Dòng mã:** Dòng 26–45 (`fileName.includes('panasonic')`, `confidence: 0.96`), Dòng 75–88 (`summarizeVideo` trả mảng event cố định).
- **Phân loại bằng chứng:** **SOURCE VERIFIED – DEFECT (MOCK)**.

### EV-05: Bằng chứng Goal Stack lưu trong RAM Map dễ mất
- **Tệp mã nguồn:** [unifiedMemoryCore.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/memory/unifiedMemoryCore.js#L14-L18)
- **Dòng mã:** Dòng 14–18 (`goalStackStore = new Map()`, `workingContextStore = new Map()`).
- **Phân loại bằng chứng:** **RUNTIME VERIFIED – CONDITIONAL**.

### EV-06: Bằng chứng Trí nhớ Ngữ nghĩa lưu thực tế trong SQLite
- **Cơ sở dữ liệu:** Bảng `ai_memories` trong `data/triai.db`.
- **Query kiểm chứng:** `SELECT count(*) as cnt FROM ai_memories` $\rightarrow$ **868 bản ghi**.
- **Phân loại bằng chứng:** **DATABASE VERIFIED – PASS**.

### EV-07: Bằng chứng Phát hiện Mâu thuẫn Trí nhớ hoạt động thực tế
- **Cơ sở dữ liệu:** Bảng `ai_memory_contradictions` trong `data/triai.db`.
- **Query kiểm chứng:** `SELECT count(*) as cnt FROM ai_memory_contradictions` $\rightarrow$ **234 bản ghi**.
- **Phân loại bằng chứng:** **DATABASE VERIFIED – PASS**.

### EV-08: Bằng chứng Chốt chặn An toàn L4 (Tier 3 Payment Block)
- **Tệp mã nguồn:** [securityGovernanceGate.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/security/securityGovernanceGate.js#L38-L50)
- **Log đầu ra thực tế:** Trả về `TIER3_SECURITY_BLOCKED` khi người dùng yêu cầu chuyển tiền.
- **Phân loại bằng chứng:** **RUNTIME VERIFIED – PASS**.
