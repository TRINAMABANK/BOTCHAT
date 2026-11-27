# BÁO CÁO 02: DANH MỤC VÀ KIỂM KÊ MÃ NGUỒN TOÀN DIỆN
## INVENTORY OF ARCHITECTURAL ASSETS & RUNTIME DEPENDENCIES

### 1. BẢNG KIỂM KÊ 19 MODULE KIẾN TRÚC TRỌNG YẾU

| STT | Thành phần kiến trúc | Đường dẫn tệp tin | Số dòng | Kích thước | Tình trạng import | Tình trạng luồng chạy |
|:---:|---|---|:---:|:---:|:---:|:---:|
| 1 | **Central Brain** | `server/services/centralBrainService.js` | 2,092 | 103,413 B | Import bởi API routes | **OPERATIONAL (Chính)** |
| 2 | **Central Brain Orchestrator** | `server/services/centralBrainOrchestrator.js` | 395 | 22,483 B | Import bởi Central Brain | **OPERATIONAL (Chính)** |
| 3 | **Intent Engine** | `server/services/intelligence/intentEngine.js` | 1,154 | 55,993 B | Import bởi Central Brain | **OPERATIONAL** |
| 4 | **Context Engine** | `server/services/intelligence/contextEngine.js` | 212 | 7,835 B | Import bởi Orchestrator | **OPERATIONAL** |
| 5 | **Reasoning Engine** | `server/services/intelligence/reasoningEngine.js` | 467 | 21,469 B | Import bởi Central Brain | **OPERATIONAL** |
| 6 | **Cognitive Reasoning Engine** | `server/services/intelligence/cognitiveReasoningEngine.js` | 138 | 10,643 B | Import bởi Orchestrator | **OPERATIONAL** |
| 7 | **Critical Thinking Engine** | `server/services/intelligence/criticalThinkingEngine.js` | 318 | 16,009 B | Import bởi Central Brain | **OPERATIONAL** |
| 8 | **Metacognition Engine** | `server/services/intelligence/metacognitionEngine.js` | 206 | 9,908 B | Import bởi Central Brain | **OPERATIONAL** |
| 9 | **Memory Engine** | `server/services/intelligence/memoryEngine.js` | 152 | 5,234 B | Import bởi Central Brain | **OPERATIONAL** |
| 10 | **Unified Memory Core** | `server/services/intelligence/unifiedMemoryCore.js` | 609 | 25,956 B | Import bởi Orchestrator | **CANONICAL MEMORY** |
| 11 | **Human Memory Engine** | `server/services/intelligence/humanMemoryEngine.js` | 463 | 17,208 B | Import bởi Central Brain | **OPERATIONAL** |
| 12 | **Multi-thread Conversation Engine** | `server/services/intelligence/multiThreadConversationEngine.js` | 293 | 11,934 B | Import bởi Orchestrator | **OPERATIONAL** |
| 13 | **Natural Human Conversation Engine** | `server/services/intelligence/naturalHumanConversationEngine.js` | 389 | 25,292 B | Import bởi Orchestrator | **OPERATIONAL** |
| 14 | **Pragmatic Intelligence Engine** | `server/services/intelligence/pragmaticIntelligenceEngine.js` | 208 | 9,356 B | Import bởi Orchestrator | **OPERATIONAL** |
| 15 | **Self Verification Quality Gate** | `server/services/intelligence/selfVerificationQualityGate.js` | 144 | 5,001 B | Import bởi Orchestrator | **OPERATIONAL** |
| 16 | **Deep Research Engine** | `server/services/intelligence/deepResearchEngine.js` | 280 | 12,958 B | Import bởi Central Brain | **OPERATIONAL** |
| 17 | **Model Gateway** | `server/services/gateway/modelGateway.js` | 99 | 3,230 B | Import bởi Tool/Brain | **OPERATIONAL** |
| 18 | **Tool Gateway** | `server/services/gateway/toolGateway.js` | 130 | 4,018 B | Import bởi Orchestrator | **OPERATIONAL (SSRF Guard)** |
| 19 | **Security Governance Gate** | `server/services/security/securityGovernanceGate.js` | 98 | 4,069 B | Import bởi Orchestrator | **OPERATIONAL (L1-L4 Guard)** |

---

### 2. CƠ SỞ DỮ LIỆU & LƯU TRỮ (DATABASE ASSETS)
- **Engine:** SQLite 3 với WAL Mode (`PRAGMA journal_mode = WAL`)
- **Vị trí file:** `data/triai.db`
- **Kích thước file hiện tại:** ~14.8 MB
- **Các bảng trọng yếu đã xác minh:**
  1. `conversations` – Lưu phiên hội thoại đa người dùng
  2. `messages` – Lưu trữ toàn bộ tin nhắn đa lượt, role, content và metadata_json
  3. `ai_memories` – Lưu trữ sự kiện, facts, truth_type, verification_status
  4. `products` & `crawled_products` – Danh mục sản phẩm, cấu hình, giá niêm yết
  5. `bot_settings` – Cấu hình nhân cách, thương hiệu, tone giao tiếp
  6. `knowledge_graph_nodes` & `knowledge_graph_edges` – Đồ thị tri thức phần cứng & tương thích
  7. `crm_leads` & `quotations` – Quản lý khách hàng tiềm năng và bảng báo giá chính hãng.
