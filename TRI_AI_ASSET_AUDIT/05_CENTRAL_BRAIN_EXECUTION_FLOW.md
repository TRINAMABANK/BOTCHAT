# 05. TRUY VẾT LUỒNG THỰC THI BỘ NÃO TRUNG TÂM (CENTRAL BRAIN EXECUTION FLOW)
## ĐỐI CHIẾU THIẾT KẾ KIẾN TRÚC VỚI THỰC TẾ MÃ NGUỒN
**Mã kiểm toán:** AUD-TRIAI-2026-FLOW  

---

### 1. BẢNG ĐỐI CHIẾU LUỒNG THỰC THI TOÀN TRÌNH (END-TO-END TRACE)

| Bước | Thành phần lý thuyết | Điểm thực thi thực tế trong mã nguồn | Trạng thái hoạt động | Dẫn chứng dòng mã (Code Reference) | Nhận xét của Kiểm toán viên |
|:---:|:---|:---|:---:|:---|:---|
| **1** | **User Input** | HTTP POST `/api/central-brain/chat` | **Đang hoạt động** | `server/routes/centralBrainRoutes.js:L20` | Tiếp nhận payload: `{ message, conversationId, customerInfo, orgId }`. |
| **2** | **API Entry** | `CentralBrainService.processChat()` | **Đang hoạt động** | `server/services/centralBrainService.js:L350` | Điểm hội tụ trung tâm của mọi request trò chuyện. |
| **3** | **Authentication & Whitelist** | CORS Whitelist & Session ID resolver | **Đang hoạt động** | `server/index.js:L51-L64` | Client ngoài danh sách trắng bị chặn ngay từ lớp HTTP. |
| **4** | **Input Sanitization** | `CentralBrainOrchestrator._stage1SanitizeInput()` | **Đang hoạt động** | `server/services/centralBrainOrchestrator.js:L189-L197` | Lọc bỏ toàn bộ ký tự điều khiển ASCII độc hại (`\u0000-\u001F`). |
| **5** | **Pragmatic Understanding** | `PragmaticIntelligenceEngine.analyze()` | **Đang hoạt động** | `server/services/intelligence/pragmaticIntelligenceEngine.js:L25` | Nhận diện 12 hành vi ngôn ngữ, bóc tách hàm ý, tỉnh lược chủ ngữ. |
| **6** | **Context Retrieval** | `ContextEngine.resolveUserContext()` | **Đang hoạt động** | `server/services/intelligence/contextEngine.js:L20` | Nạp lịch sử 6 lượt gần nhất và ngữ cảnh sản phẩm đang chọn. |
| **7** | **Topic & Thread Management** | `MultiThreadConversationEngine` | **Đang hoạt động** | `server/services/intelligence/multiThreadConversationEngine.js:L75` | Quản lý Thread Stack, chuyển đổi đề tài: Bán hàng, Chứng khoán, Thời tiết, Văn bản. |
| **8** | **Memory Retrieval** | `UnifiedMemoryCore.handleMemoryCommand()` | **Đang hoạt động** | `server/services/intelligence/unifiedMemoryCore.js:L380` | Tự động xử lý các lệnh: "Nhớ rằng...", "Quên...", "Hôm qua làm đến đâu?". |
| **9** | **Security & Tier 3 Gate** | `SecurityGovernanceGate` & `AutonomyApprovalEngine` | **Đang hoạt động** | `server/services/security/securityGovernanceGate.js:L30` | Chặn đứng tuyệt đối yêu cầu chuyển tiền hoặc xóa dữ liệu L4. |
| **10** | **Cognitive Reasoning** | `CognitiveReasoningEngine` & `UniversalSalesConsultant` | **Đang hoạt động** | `server/services/intelligence/cognitiveReasoningEngine.js` | Áp dụng khung LEAR phản biện giá, suy luận 5-Whys, phân tích TCO. |
| **11** | **Capability & Tool Dispatch** | `ModelGateway` & `ToolGateway` | **Đang hoạt động** | `server/services/gateway/toolGateway.js:L35` | Điều phối công cụ ngoài với lớp bảo vệ chống SSRF và timeout 5s. |
| **12** | **Self-Verification** | `SelfVerificationQualityGate.verifyResponse()` | **Đang hoạt động** | `server/services/intelligence/selfVerificationQualityGate.js:L32` | Bắt buộc kiểm tra thuế VAT 10% trên báo giá và đối chiếu Catalog sản phẩm. |
| **13** | **Response Synthesis** | `ResponseEngine.formatResponse()` | **Đang hoạt động** | `server/services/intelligence/responseEngine.js:L18` | Chuẩn hóa cấu trúc trả về gồm text, suggestedActions, toolsUsed. |
| **14** | **Memory Consolidation** | `UnifiedMemoryCore.recordEpisode()` | **Đang hoạt động** | `server/services/intelligence/unifiedMemoryCore.js:L124` | Ghi nhận tiến độ phiên vào bảng `ai_memory_episodes` của SQLite. |
| **15** | **User Output** | JSON Response trả về Client SPA | **Đang hoạt động** | `server/routes/centralBrainRoutes.js:L32` | Client hiển thị câu trả lời tự nhiên dạng bong bóng chat. |

---

### 2. PHÂN TÁCH RẠCH RÒI GIỮA BRAIN CORE VÀ SALES INTELLIGENCE
Một phát hiện kiểm toán mang tính quyết định:
- **Nguy cơ tiềm ẩn ban đầu:** Trong mã nguồn cũ, khi người dùng hỏi các câu ngoài bán hàng (ví dụ: *"Em có biết cổ phiếu nào đang ngon không?"*), regex bán hàng cũ có thể bị kích hoạt nhầm, biến bot thành kẻ chào mời sản phẩm thô lỗ.
- **Hiện trạng đã giải quyết triệt để:**
  - `server/services/centralBrainOrchestrator.js` (dòng 108-120) đã chủ động bắt các chủ đề tài chính, chứng khoán, đầu tư và điều hướng về `MultiThreadConversationEngine.handleStockInquiry()`.
  - Kết quả kiểm toán: Tuyệt đối **0%** rò rỉ mã sản phẩm máy đếm tiền hoặc câu chào hàng vào luồng tư vấn chứng khoán hay thời tiết.
  - Bộ não trung tâm (`Brain Core`) giữ vai trò nhận thức bao trùm, trong khi `Sales Intelligence` chỉ là một năng lực chuyên môn (Capability) được kích hoạt khi và chỉ khi người dùng thực sự có nhu cầu trang bị thiết bị.

---

### 3. KIỂM TOÁN CÁC ĐIỂM GHI ĐÈ VÀ NGUY CƠ LỖI NGỮ CẢNH (OVERRIDE HAZARDS)
1. **Điểm Fallthrough tại dòng 185 `centralBrainOrchestrator.js`:**
   - Nếu tin nhắn không rơi vào các trường hợp rẽ nhánh đặc biệt (chứng khoán, thời tiết, văn bản, phản đối giá, giải thích nguyên lý, lệnh bộ nhớ, chặn Tier 3), hàm `runPipeline()` trả về `null`.
   - Khi đó, `CentralBrainService` tiếp tục luồng xử lý sâu với RAG, Knowledge Graph và Deep Research.
   - **Đánh giá:** Đây là thiết kế Fallthrough an toàn, giúp tận dụng tối đa kho tri thức nghiệp vụ chuyên sâu đã tích lũy mà không làm gián đoạn hội thoại.
2. **Quản lý Session State In-Memory:**
   - `MultiThreadConversationEngine._sessionPools` hiện lưu trạng thái luồng trong `Map` bộ nhớ RAM của tiến trình Node.js.
   - **Khuyến nghị kiến trúc:** Khi hệ thống mở rộng đa cụm server (Cluster / Multi-instance) với Load Balancer, cần chuyển `_sessionPools` sang lưu trữ tập trung tại Redis Cluster để đảm bảo tính nhất quán phiên giữa các node.
