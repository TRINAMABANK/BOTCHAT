# KIỂM KÊ VÀ BẢN ĐỒ MÃ NGUỒN (CODE INVENTORY & DEPENDENCY MAP)
## TÀI LIỆU 02 – BOTCHAT BRAIN 2.1 AUDIT & ARCHITECTURE DESIGN

> **Dự án:** BOTCHAT  
> **Repository:** TRINAMABANK/BOTCHAT  
> **Branch:** `main` (Phát triển: `feature/botchat-brain-2.1-intent`)  
> **Tổng số file kiểm định:** 24 file cốt lõi (100% có mặt trên hệ thống)  
> **Nguyên tắc:** Ghi nhận thực tế source code, không giả định.

---

## 1. BẢNG TỔNG HỢP KIỂM KÊ 24 FILE

| STT | Đường dẫn File | Số dòng | Kích thước | Phân nhóm Kiến trúc |
| :---: | :--- | :---: | :---: | :--- |
| 1 | `server/services/centralBrainService.js` | 1.065 | 46.914 B | Central Brain Orchestrator |
| 2 | `server/services/intelligence/intentEngine.js` | 625 | 26.909 B | Natural Language Understanding |
| 3 | `server/services/intelligence/reasoningEngine.js` | 273 | 11.911 B | Reasoning & Execution Planning |
| 4 | `server/services/intelligence/memoryEngine.js` | 152 | 5.115 B | Persistent Customer Memory |
| 5 | `server/services/intelligence/verificationEngine.js` | 176 | 7.554 B | Verification & Anti-Off-Topic Guard |
| 6 | `server/services/intelligence/toolOrchestrator.js` | 195 | 6.622 B | Tool Execution & Telemetry |
| 7 | `server/services/intelligence/responseEngine.js` | 96 | 2.885 B | Response Formatting & UI Payload |
| 8 | `server/services/intelligence/learningCaptureEngine.js` | 415 | 15.426 B | Knowledge Gap Telemetry |
| 9 | `server/services/intelligence/learningIngestionEngine.js` | 777 | 29.748 B | Curated Knowledge & Self-Training |
| 10 | `server/services/intelligence/smartSalesConsultant.js` | 590 | 28.873 B | Domain Business Consultant |
| 11 | `server/services/intelligence/liveWebsiteRetrieval.js` | 150 | 5.589 B | Real-time Web Extraction |
| 12 | `server/services/intelligence/appointmentHandler.js` | 243 | 11.946 B | Appointment & Smart Conversation |
| 13 | `server/services/ragService.js` | 237 | 7.646 B | Internal Document RAG Engine |
| 14 | `server/salesEngine.js` | 3.686 | 182.777 B | Core Sales & Commerce Engine |
| 15 | `server/adapters/salesEngineAdapter.js` | 189 | 6.435 B | Bridge Adapter (Brain <-> Sales) |
| 16 | `server/services/webSearchService.js` | 128 | 3.713 B | Internet Web Search |
| 17 | `server/services/parsers/excelParser.js` | 214 | 7.604 B | Spreadsheet Parsing & Calculations |
| 18 | `server/index.js` | 932 | 35.634 B | Express Server Entry & Core Endpoints |
| 19 | `server/routes/centralBrainRoutes.js` | 244 | 8.345 B | Brain Management & Telemetry APIs |
| 20 | `server/routes/knowledgeRoutes.js` | 580 | 21.687 B | Document Upload & RAG APIs |
| 21 | `server/routes/learningRoutes.js` | 712 | 24.417 B | Learning Center & Rules APIs |
| 22 | `server/db.js` | 873 | 33.124 B | SQLite Database Driver & Schema Init |
| 23 | `prisma/schema.prisma` | 487 | 17.503 B | Enterprise PostgreSQL/pgvector DDL |
| 24 | `package.json` | 35 | 787 B | Project Manifest & Dependencies |

---

## 2. CHI TIẾT TỪNG MODULE CỐT LÕI

### 2.1. Central Brain
#### `server/services/centralBrainService.js`
- **Vai trò:** Bộ điều phối trung tâm toàn bộ trí tuệ hệ thống BOTCHAT (Trí An).
- **Hàm quan trọng:**
  - `processChat(params)`: Điểm vào duy nhất tiếp nhận tin nhắn từ API.
  - `runSmartOrchestratorFallback(context)`: Điều phối công cụ với Gemini hoặc bộ quy tắc phân loại chuyên sâu.
  - `runOpenAiCentralBrain(context)`: Điều phối công cụ bằng OpenAI Function Calling nguyên bản.
- **Đầu vào:** `message`, `conversationId`, `selectedProduct`, `actionType`, `customerInfo`, `clientDevice`, `orgId`, `userId`.
- **Đầu ra:** JSON chuẩn gồm `reply`, `revealCatalog`, `recommendedField`, `recommendedProduct`, `stage`, `suggestedActions`, `citations`, `toolsUsed`.
- **Module gọi:** [server/index.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/index.js) (POST `/api/chat/message`, GET `/api/chat/stream`), [server/routes/centralBrainRoutes.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/routes/centralBrainRoutes.js).
- **Module mà nó gọi:** `IntentEngine`, `ReasoningEngine`, `MemoryEngine`, `VerificationEngine`, `ResponseEngine`, `ToolOrchestrator`, `AppointmentHandler`, `LearningIngestionEngine`, `LearningCaptureEngine`, `SmartSalesConsultant`, `SalesEngineAdapter`, `RagService`, `ExcelParser`, `WebSearchService`, `LiveWebsiteRetrieval`, `QuotationService`.
- **Dữ liệu sử dụng:** `ai_customer_memory`, `bot_settings`, `products`.
- **Rủi ro khi thay đổi:** Cực cao. Đây là "nhạc trưởng", mọi lỗi logic ở đây sẽ làm tê liệt toàn bộ luồng phản hồi của chatbot.

---

### 2.2. Nhóm Intelligence
#### `server/services/intelligence/intentEngine.js`
- **Vai trò:** Bóc tách thực thể (slots), xử lý từ lóng, chuẩn hóa không dấu, và phân loại ý định hội thoại.
- **Hàm quan trọng:** `analyzeIntent(message, context)`, `extractSlots(normText, unaccented)`, `stripDiacritics(str)`, `getIntentGroup(primaryIntent)`.
- **Đầu vào:** Chuỗi tin nhắn thô, ngữ cảnh phiên chat.
- **Đầu ra:** `intentResult` chứa `primaryIntent`, `secondaryIntents`, `confidence`, `slots` (productName, quantity, budget, brand, modelCode, targetPerson, timeSpec, phone), `intentGroup`, `flags`.
- **Module gọi:** `CentralBrainService`, `centralBrainRoutes.js`, test suites.
- **Rủi ro khi thay đổi:** Cao. Các biểu thức chính quy (Regex) nếu quá tham lam hoặc có lỗi ranh giới từ `\b` với ký tự có dấu tiếng Việt sẽ làm lệch toàn bộ quá trình định tuyến.

#### `server/services/intelligence/reasoningEngine.js`
- **Vai trò:** Đánh giá tính đầy đủ của dữ liệu, xác định độ phức tạp, và lập kế hoạch thực thi từng bước (Multi-step Execution Plan).
- **Hàm quan trọng:** `planExecution(intentResult, context)`, `assessDataSufficiency(intentResult, context)`.
- **Đầu vào:** `intentResult`, thông tin khách hàng, lịch sử hội thoại.
- **Đầu ra:** Kế hoạch thực thi gồm `complexity`, `dataSufficient`, `clarificationQuestion`, `suggestedTools`, `planSteps`.
- **Module gọi:** `CentralBrainService`.

#### `server/services/intelligence/memoryEngine.js`
- **Vai trò:** Quản lý trí nhớ khách hàng (Working Memory & Long-term Persistent Memory).
- **Hàm quan trọng:** `rememberCustomerFact({ userId, orgId, memoryType, key, value })`, `recallCustomerMemories(userId, orgId)`, `forgetCustomer(userId, orgId)`.
- **Dữ liệu sử dụng:** Bảng `ai_customer_memory`.
- **Rủi ro khi thay đổi:** Trung bình. Cần đảm bảo cô lập Tenant (`orgId`) và quyền riêng tư theo yêu cầu người dùng (`forgetCustomer`).

#### `server/services/intelligence/verificationEngine.js`
- **Vai trò:** Kiểm chứng thông tin, phân loại 5 cấp độ tin cậy dữ liệu, kiểm tra tính khả dụng của link (HTTP 200), và ngăn chặn trả lời lạc đề (`guardOffTopic`).
- **Hàm quan trọng:** `verifyUrlLiveness(url)`, `classifyConfidence(item)`, `guardOffTopic({ replyText, intentResult, userMessage })`.
- **Rủi ro khi thay đổi:** Thấp đến Trung bình. Là chốt chặn bảo vệ cuối cùng trước khi phản hồi ra người dùng.

#### `server/services/intelligence/toolOrchestrator.js`
- **Vai trò:** Điều phối thực thi các công cụ, giám sát thời gian trễ (latency), ghi nhận nhật ký viễn thám (telemetry) và chi phí ước tính.
- **Hàm quan trọng:** `executeWithTelemetry(toolName, fn, meta)`, `executeQuotation(params, meta)`, `executeLiveWebSearch(query, meta)`.
- **Dữ liệu sử dụng:** Bảng `ai_tool_telemetry`.

#### `server/services/intelligence/responseEngine.js`
- **Vai trò:** Định dạng cấu trúc JSON trả về client, kiểm tra guardrail, tạo danh sách gợi ý hành động (Suggested Actions) và các trích dẫn nguồn (Citations).
- **Hàm quan trọng:** `formatResponse(options)`, `formatClarification(question, options)`.

#### `server/services/intelligence/appointmentHandler.js`
- **Vai trò:** Xử lý toàn bộ các giao tiếp phi thương mại: Hẹn gặp, tra cứu lịch, nhắc việc, giao tiếp xã hội, hỗ trợ doanh nghiệp.
- **Hàm quan trọng:** `handleAppointment(context)`, `handleScheduleQuery(context)`, `handleReminder(context)`, `handleGeneralChat(context)`, `handleBusinessSupport(context)`.
- **Rủi ro khi thay đổi:** Đảm bảo duy trì nguyên tắc trung thực: Không bịa lịch Google Calendar của anh Trí, không rò rỉ mời mọc mua sắm.

#### `server/services/intelligence/smartSalesConsultant.js`
- **Vai trò:** Cung cấp nghiệp vụ bán hàng chuyên sâu theo kịch bản: Handoff nhân viên, chính sách bảo hành theo tính chất sản phẩm (đồ ăn/uống vs điện máy), so sánh sản phẩm khách quan, tra cứu thông số kỹ thuật.
- **Hàm quan trọng:** `handleStaffHandoff()`, `handlePolicyInquiry()`, `handleComparison()`, `handleSpecSearch()`, `isFoodOrBeverageProduct(product)`.

---

### 2.3. Nhóm Knowledge & Sales
#### `server/salesEngine.js`
- **Vai trò:** Động cơ bán hàng cốt lõi và kịch bản chốt đơn (3.686 dòng code).
- **Hàm quan trọng:** `processMessage(params)`, `matchProductsWithTiers(query, allProducts)`, `handleOrderStep(...)`, `formatPrice(p)`.
- **Dữ liệu sử dụng:** `products`, `leads`, `conversations`, `messages`, `bot_settings`.
- **Rủi ro khi thay đổi:** Cực cao vì chứa toàn bộ kịch bản chốt sale, xử lý giỏ hàng và mở Cột 2.

#### `server/adapters/salesEngineAdapter.js`
- **Vai trò:** Cầu nối điều hợp giữa `CentralBrainService` và `SalesEngine`, chuyển đổi giao thức tool execution.
- **Hàm quan trọng:** `processMessage(params)`, `executeAsTool(args, context)`.

#### `server/services/ragService.js`
- **Vai trò:** Tìm kiếm ngữ nghĩa tài liệu văn bản nội bộ (PDF, Word, TXT) theo tổ chức.
- **Hàm quan trọng:** `searchKnowledge({ query, orgId, limit })`, `logCitations(conversationId, messageId, citations)`.
- **Dữ liệu sử dụng:** `knowledge_documents`, `knowledge_chunks`, `citation_logs`.

#### `server/services/parsers/excelParser.js`
- **Vai trò:** Phân tích cú pháp file Excel (`.xlsx`, `.xls`, `.csv`), trích xuất cấu trúc bảng tính, hỗ trợ tính toán tổng hợp số liệu.
- **Hàm quan trọng:** `parseExcel(filePath, options)`, `queryData({ filterVal, sheetName })`.
- **Dữ liệu sử dụng:** `document_sheets`, `document_rows`.

---

### 2.4. Nhóm Infrastructure & Storage
#### `server/db.js`
- **Vai trò:** Khởi tạo kết nối SQLite, quản lý file `data/triai.db`, tự động chạy các migration tập tin (Phase 2, Crawler, Intelligence 2.0, Learning Center).
- **Hàm quan trọng:** `db.get(sql, params)`, `db.all(sql, params)`, `db.run(sql, params)`.
- **Số bảng thực tế:** 66 bảng.

#### `prisma/schema.prisma`
- **Vai trò:** Định nghĩa Schema Enterprise PostgreSQL + pgvector phục vụ lộ trình mở rộng SaaS đa người dùng.
- **Ghi chú quan trọng:** Hiện tại runtime của hệ thống vẫn đang chạy SQLite thông qua `server/db.js`; Prisma chưa được cài trong `dependencies` của `package.json`.
