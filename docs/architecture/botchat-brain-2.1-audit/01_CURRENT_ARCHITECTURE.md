# KIẾN TRÚC HIỆN TẠI HỆ THỐNG BOTCHAT (AS-IS ARCHITECTURE)
## TÀI LIỆU 01 – BOTCHAT BRAIN 2.1 AUDIT & ARCHITECTURE DESIGN

> **Dự án:** BOTCHAT – AI Employee Đa Năng  
> **Repository:** TRINAMABANK/BOTCHAT  
> **Branch:** `main` (Phát triển: `feature/botchat-brain-2.1-intent`)  
> **Domain mục tiêu:** `quangnhuttri.com`  
> **Thời điểm kiểm định:** 24/11/2026  
> **Vai trò:** Principal AI Architect, Senior Backend Engineer & Conversational AI Specialist  

---

## 1. TỔNG QUAN HỆ THỐNG HIỆN HỮU

BOTCHAT là hệ thống Trợ lý AI tích hợp giao diện Humanoid 3D đa phương thức (Web 3D + Giọng nói STT/TTS + Hội thoại thời gian thực) phục vụ doanh nghiệp. Hệ thống được tổ chức theo mô hình Full-stack:
- **Frontend:** Single Page Application (SPA) xây dựng trên nền **React 18.3.1**, đóng gói bằng **Vite 5.2.0**, giao diện Responsive với TailwindCSS, Lucide Icons, Canvas Confetti.
- **Backend:** **Node.js Express 5.2.1** (ES Modules), phục vụ các API RESTful và Server-Sent Events (SSE) streaming.
- **Database:** **SQLite 3** (`data/triai.db` - 66 bảng) thông qua driver `sqlite3 6.0.1`. Đồng thời có sẵn file thiết kế cấu trúc SaaS đa người dùng **PostgreSQL + pgvector** tại `prisma/schema.prisma`.
- **AI Engine Orchestration:** Mô hình kép:
  - *Primary Engine:* `CentralBrainService` (Điều phối Intent, Memory, Reasoning, Verification, Response, Tool Orchestration).
  - *Secondary / Legacy Engine:* `SalesEngine` (Hơn 3.680 dòng code xử lý sâu kịch bản bán hàng, giỏ hàng, chốt sale, đặt hàng, đối chiếu sản phẩm 3 cấp độ).
  - *LLM Foundation Models:* Hỗ trợ đồng thời **Google Gemini** (`gemini-flash-lite-latest` qua Google AI REST API) và **OpenAI** (`gpt-4o-mini` qua Chat Completions Function Calling).

```mermaid
flowchart TB
    subgraph Frontend["Giao diện Người dùng (React 18 + Vite)"]
        UI_Col1["Cột 1: Cửa sổ Chat & Streaming SSE\n(ChatStreamWindow)"]
        UI_Col2["Cột 2: Bộ chọn & Chi tiết Sản phẩm\n(ProductSelector & Modal)"]
        UI_3D["Robot 3D Humanoid Valkyrie\n(Three.js / CSS 3D & TTS)"]
        UI_Voice["Voice Recognition (STT)\n& Voice Synthesis (TTS)"]
    end

    subgraph Backend_APIs["Tầng Điều hướng API (server/index.js)"]
        API_Chat["/api/chat/message (POST)"]
        API_Stream["/api/chat/stream (SSE GET)"]
        API_Brain["/api/central-brain/*"]
        API_Knowledge["/api/knowledge/*"]
        API_Learning["/api/learning-center/*"]
        API_Suppliers["/api/supplier-websites/*"]
    end

    subgraph Central_Brain["Central Brain Service (server/services/centralBrainService.js)"]
        Intent["IntentEngine\n(Phân loại ý định & bóc tách slots)"]
        Memory["MemoryEngine\n(Bộ nhớ khách hàng ai_customer_memory)"]
        Reasoning["ReasoningEngine\n(Đánh giá độ đủ dữ liệu & lập kế hoạch)"]
        Router{"Điều hướng Năng lực\n(Capability Router)"}
        Verification["VerificationEngine\n(Kiểm chứng liveness & chống lạc đề)"]
        Response["ResponseEngine\n(Đóng gói câu trả lời, Cột 2 & CTA)"]
    end

    subgraph Specialized_Engines["Các Phân Hệ Năng Lực Nghiệp Vụ"]
        Sales["SalesEngine & SmartSalesConsultant\n(Bán hàng, so sánh, chốt đơn, Cột 2)"]
        Appointment["AppointmentHandler\n(Hẹn gặp, lịch trình, nhắc việc, giao tiếp)"]
        RAG["RagService & KnowledgeBase\n(Tra cứu tài liệu quy chế, văn bản)"]
        Excel["ExcelParser\n(Tính toán, phân tích số liệu bảng tính)"]
        WebCrawler["LiveWebsiteRetrieval & WebSearchService\n(Truy xuất web nhà cung cấp & tin tức)"]
        Quotation["QuotationService\n(Lập báo giá chuẩn VAT 10%, mã BG)"]
        Learning["LearningCapture & IngestionEngine\n(Ghi nhận lỗ hổng & duyệt tri thức mới)"]
    end

    subgraph Data_Layer["Tầng Lưu trữ Dữ liệu (SQLite 3 - 66 Bảng)"]
        DB[(data/triai.db)]
    end

    Frontend --> Backend_APIs
    API_Chat --> Central_Brain
    API_Stream --> Central_Brain
    Central_Brain --> Router
    Router --> Sales
    Router --> Appointment
    Router --> RAG
    Router --> Excel
    Router --> WebCrawler
    Router --> Quotation
    Router --> Learning
    Specialized_Engines --> DB
    Central_Brain --> DB
```

---

## 2. KIẾN TRÚC MẶT TRƯỚC (FRONTEND ARCHITECTURE)

### 2.1. Bố cục Hai Cột Đặc trưng (Two-Column Layout)
- **Cột 1 (Bên trái):** `ChatStreamWindow.jsx` hiển thị dòng tin nhắn người dùng và phản hồi của trợ lý ảo theo cơ chế Server-Sent Events (SSE) gõ chữ từng từ mượt mà. Tích hợp thanh nhập liệu text, nút ghi âm giọng nói STT, nút điều khiển robot 3D, và danh sách các nút hành động nhanh (Suggested Action Chips).
- **Cột 2 (Bên phải):** `ProductSelector.jsx` & `ProductDetailModal.jsx` hiển thị trực quan các thẻ sản phẩm có giá niêm yết đã phê duyệt, ảnh chụp thực tế, bộ lọc theo danh mục, nút xem thông số kỹ thuật chi tiết, và nút kích hoạt đặt mua ngay.
- **Cơ chế phối hợp Cột 1 và Cột 2:** Khi `CentralBrainService` hoặc `SalesEngine` trả về chỉ thị `revealCatalog: true`, Cột 2 tự động bung mở, định vị đúng danh mục (`recommendedField`) và cuộn tới sản phẩm trọng tâm (`recommendedProduct`). Khi khách hàng tiến hành chốt đơn nhập thông tin, Cột 2 tự động thu gọn lại để tập trung vào luồng thanh toán.

### 2.2. Nhân vật Humanoid 3D & Xử lý Giọng nói
- `HumanoidRobot3D.jsx`: Mô hình đại diện trợ lý ảo với các trạng thái hoạt họa (Idle, Talking, Thinking, Listening).
- `src/utils/speech.js`, `voiceRecognition.js`, `voiceSynthesis.js`: Tích hợp Web Speech API chuẩn trình duyệt, cho phép người dùng giao tiếp rảnh tay hai chiều.

---

## 3. KIẾN TRÚC MẶT SAU (BACKEND ARCHITECTURE)

### 3.1. Điểm Tiếp nhận Yêu cầu (Entry Points)
Tất cả các tin nhắn hội thoại từ người dùng gửi lên qua hai cổng chính tại [server/index.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/index.js):
1. `POST /api/chat/message`: Xử lý đồng bộ nhận toàn bộ JSON payload gồm `{ conversationId, message, selectedProduct, actionType, customerInfo, clientDevice, orgId }` và trả về kết quả cấu trúc hoàn chỉnh.
2. `GET /api/chat/stream`: Kết nối SSE dòng dữ liệu, truyền tải từng chunk ký tự phản hồi ra giao diện chat theo thời gian thực.

Cả hai endpoint này đều ủy quyền xử lý trực tiếp cho:
`CentralBrainService.processChat(params)`

Nếu `CentralBrainService.processChat` gặp lỗi ngoại lệ nghiêm trọng, cơ chế Fallback phòng vệ cấp 2 tại [server/index.js#L510-L516](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/index.js#L510-L516) sẽ chuyển tiếp sang `SalesEngine.processMessage(req.body)` để đảm bảo người dùng không bị gián đoạn phiên chat.

### 3.2. Luồng Thực thi Thực tế trong Central Brain (End-to-End Pipeline)

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng (Client)
    participant API as server/index.js (/api/chat/message)
    participant Brain as CentralBrainService
    participant IntentEng as IntentEngine
    participant LearnIngest as LearningIngestionEngine
    participant ReasonEng as ReasoningEngine
    participant Router as Capability Router
    participant SpecEngine as Specialized Engines (Sales / Appt / RAG / Quote)
    participant VerifEng as VerificationEngine
    participant RespEng as ResponseEngine

    User->>API: Gửi tin nhắn { message, conversationId, orgId }
    API->>Brain: processChat(params)
    Brain->>IntentEng: analyzeIntent(trimmedMsg, params)
    Note over IntentEng: Chuẩn hóa tiếng Việt, bóc tách slots,<br/>xác định primaryIntent & intentGroup
    IntentEng-->>Brain: intentResult { primaryIntent, slots, intentGroup }

    alt Ý định Xóa nhớ (MEMORY_COMMAND)
        Brain->>Brain: MemoryEngine.forgetCustomer()
        Brain-->>API: Phản hồi hoàn tất xóa nhớ
    else Ý định Làm mới Chat (RESET_CHAT)
        Brain-->>API: Phản hồi xác nhận Reset cuộc trò chuyện
    else Tri thức Chuẩn Admin (Learning Center Lookup)
        Brain->>LearnIngest: lookupApprovedKnowledge(msg, orgId)
        opt Tìm thấy câu trả lời chuẩn đã duyệt
            LearnIngest-->>Brain: approvedCurated
            Brain-->>API: Phản hồi câu trả lời chuẩn (Priority 1)
        end
    end

    Brain->>ReasonEng: planExecution(intentResult, params)
    ReasonEng-->>Brain: plan { dataSufficient, clarificationQuestion, tools }

    opt Thiếu dữ kiện cốt lõi
        Brain-->>API: formatClarification(clarificationQuestion)
    end

    Brain->>Router: Định tuyến theo primaryIntent & context

    alt Intent thuộc APPOINTMENT / SCHEDULE / CHAT
        Router->>SpecEngine: AppointmentHandler.handleAppointment / handleGeneralChat
        SpecEngine-->>Router: Kết quả hội thoại xã giao / lịch hẹn
    else Intent thuộc TÀI LIỆU NỘI BỘ (INTERNAL_DOCUMENT_RAG)
        Router->>SpecEngine: RagService.searchKnowledge(query, orgId)
        SpecEngine-->>Router: Chunks trích dẫn tài liệu quy chuẩn
    else Intent thuộc EXCEL / BẢNG TÍNH
        Router->>SpecEngine: ExcelParser.queryData(filterVal)
        SpecEngine-->>Router: Số liệu tính toán từ bảng tính
    else Intent thuộc BÁO GIÁ CHÍNH THỨC (FORMAL_QUOTATION)
        Router->>SpecEngine: ToolOrchestrator.executeQuotation(productName, qty)
        SpecEngine-->>Router: Bảng báo giá chi tiết VAT 10%
    else Mặc định thương mại / Tư vấn sản phẩm (PRODUCT_INQUIRY / SALES)
        Router->>SpecEngine: SalesEngineAdapter -> SalesEngine.processMessage
        SpecEngine-->>Router: Kịch bản tư vấn bán hàng & mở Cột 2
    end

    Router-->>Brain: replyText & uiDirectives
    Brain->>VerifEng: guardOffTopic({ replyText, intentResult })
    VerifEng-->>Brain: verifiedReplyText (Chặn rò rỉ bán hàng khi không mua hàng)
    Brain->>RespEng: formatResponse({ replyText, citations, toolsUsed, ... })
    RespEng-->>API: JSON payload hoàn chỉnh
    API-->>User: Hiển thị phản hồi & điều khiển Cột 2
```

---

## 4. TỔNG KẾT RỦI RO KIẾN TRÚC HIỆN TẠI

1. **Hiện tượng "Hai Bộ Não Song Song" (Dual-Brain Friction):**
   - `CentralBrainService` đại diện cho bộ não trí tuệ hiện đại (RAG, Tool calling, Intent, Reasoning).
   - Tuy nhiên, `SalesEngine.js` (hơn 3.680 dòng code) chứa đựng một bộ não quy tắc khổng lồ độc lập (tự bóc tách danh từ, tự so khớp sản phẩm theo 3 tier, tự quản lý profile khách hàng, tự gọi trực tiếp Gemini/OpenAI nếu chưa có reply).
   - Khi `CentralBrainService` không bắt được một intent phi bán hàng, luồng xử lý bị rơi vào `SalesEngineAdapter` $\rightarrow$ biến toàn bộ cuộc trò chuyện thành kịch bản bán hàng.
2. **Conversation History chưa được đồng bộ cấu trúc:**
   - Trong nhánh gọi OpenAI Tool Calling (`runOpenAiCentralBrain`), danh sách tin nhắn gửi lên API chỉ bao gồm `[systemPrompt, userMessage]`, làm mất ngữ cảnh các lượt trước.
   - Nhánh `SalesEngine` tự đọc lịch sử từ bảng `messages`, dẫn đến độ lệch ngữ cảnh giữa 2 nhánh thực thi.
3. **Cần một Context Engine tập trung:**
   - Cần một module ngữ cảnh chung duy nhất (`ContextEngine`) làm nguồn chân lý duy nhất (Single Source of Truth) phục vụ cho mọi phân hệ.
