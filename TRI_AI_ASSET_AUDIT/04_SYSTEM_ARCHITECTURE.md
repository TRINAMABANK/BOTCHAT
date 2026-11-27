# 04. BẢN VẼ KIẾN TRÚC HỆ THỐNG TOÀN DIỆN (SYSTEM ARCHITECTURE)
## KIẾN TRÚC TRÍ TUỆ NHÂN TẠO TRUNG TÂM – ONE SUPER BRAIN
**Mã kiến trúc:** ARC-TRIAI-2026-CORE  

---

### 1. TỔNG QUAN KIẾN TRÚC ĐA TẦNG (MULTI-TIER ARCHITECTURE)

Hệ thống được thiết kế theo mô hình 5 tầng nhận thức phân lập, bảo đảm tính nhất quán và khả năng mở rộng cao:

```mermaid
flowchart TD
    subgraph ClientTier["TẦNG TRẢI NGHIỆM NGƯỜI DÙNG (CLIENT TIER)"]
        UI1["Web Chat Client (React 18 + Tailwind)"]
        UI2["Voice / Audio Interface (Web Speech API)"]
        UI3["Admin & Knowledge Dashboard (AdminPanel.jsx)"]
    end

    subgraph GatewayTier["TẦNG CỔNG KẾT NỐI & BẢO MẬT (GATEWAY TIER)"]
        API["Express 5 REST & WebSocket Server (server/index.js)"]
        CORS["Hardened CORS Whitelist & Anti-tamper Headers"]
        AUTH["Auth Service (PBKDF2 Salt + JWT Token)"]
        SEC_GATE["Security Governance Gate (L1-L4 & Tier 3 Payment Block)"]
    end

    subgraph CognitiveTier["TẦNG BỘ NÃO TRUNG TÂM (CENTRAL COGNITIVE TIER)"]
        ORCH["CentralBrainOrchestrator (11-Stage Unified Pipeline)"]
        PRAG["Pragmatic Intelligence Engine (12 Communicative Acts)"]
        MTHREAD["Multi-Thread Conversation Engine (Thread Stack)"]
        REASON["Cognitive Reasoning Engine (5-Whys, CapEx/OpEx TCO)"]
        CRIT["Critical Thinking & Bias Fallacy Guard"]
        GATEWAY_M["Model Gateway (Pro / Flash / Local Fallback)"]
        GATEWAY_T["Tool Gateway (Sandboxed, Anti-SSRF, 5s Timeout)"]
        VERIFY["Self-Verification Quality Gate (VAT 10%, Catalog Match)"]
        PERSONA["Persona Layer (AI Anh, Bán hàng, Thư ký, Gia sư, Chuyên gia)"]
    end

    subgraph DomainTier["TẦNG NĂNG LỰC NGHIỆP VỤ (DOMAIN CAPABILITIES)"]
        SALES["Sales Intelligence & LEAR Objection Handling"]
        SECRETARY["Private Secretary & Smart Reminders"]
        SURVEY["Service Survey & Technical Intake (Bảo trì/Lắp đặt)"]
        FINANCE["Finance & Stock Market Principles Advisor"]
        RESEARCH["Deep Knowledge Research & TCVN Standards"]
    end

    subgraph MemoryTier["TẦNG LƯU TRỮ VÀ TRÍ NHỚ (UNIFIED MEMORY & STORAGE)"]
        WM["Working Memory (In-Memory Session Context)"]
        STM["Short-Term Episodic Memory (ai_memory_episodes)"]
        LTM["Long-Term Semantic Memory (ai_memories - FACT/INFERENCE)"]
        META["Meta-Memory (User Persona & Preferences)"]
        KG["Knowledge Graph (ai_knowledge_entities & relations)"]
        SQLITE["Unified SQLite Database (triai.db - 88 Tables, WAL Mode)"]
    end

    ClientTier --> GatewayTier
    GatewayTier --> CognitiveTier
    CognitiveTier --> DomainTier
    CognitiveTier --> MemoryTier
    DomainTier --> MemoryTier
```

---

### 2. SƠ ĐỒ PIPELINE NHẬN THỨC 11 BƯỚC (11-STAGE COGNITIVE PIPELINE)

Toàn bộ thông điệp của người dùng bắt buộc phải đi qua chuỗi xử lý nhận thức 11 giai đoạn nghiêm ngặt, loại bỏ hoàn toàn khả năng phản hồi sai lệch hoặc vi phạm chính sách:

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng (Voice / Text)
    participant Orch as CentralBrainOrchestrator
    participant Prag as Pragmatic Engine
    participant Thread as MultiThread Engine
    participant Mem as Unified Memory Core
    participant Sec as Security Gate (L1-L4)
    participant Reason as Cognitive Reasoning
    participant Gate as Model & Tool Gateway
    participant Verify as Self-Verification Gate
    participant Client as Frontend SPA Client

    User->>Orch: Gửi thông điệp tự nhiên
    Note over Orch: Giai đoạn 1: Khử ký tự độc hại (Sanitization)
    Orch->>Prag: Giai đoạn 2: Phân tích 12 hành vi ngôn ngữ & hàm ý
    Prag-->>Orch: Communicative Act, Implicit Need, Ellipsis Subject
    Note over Orch: Giai đoạn 3: Nạp User Context 5 lớp
    Orch->>Thread: Giai đoạn 4: Điều phối luồng & Đổi chủ đề
    Thread-->>Orch: Active Thread, Thread State (Active/Paused)
    Orch->>Mem: Giai đoạn 5: Truy xuất trí nhớ & Xử lý lệnh nhớ/quên
    Mem-->>Orch: Contextual Memories, Profile, Contradiction Flags
    Orch->>Sec: Giai đoạn 6: Kiểm tra phân quyền L1-L4 & Tier 3
    alt Yêu cầu vi phạm Tier 3 (Chuyển tiền tài chính L4)
        Sec-->>Orch: Chặn đứng (BLOCKED), Khởi tạo Approval Ticket
        Orch->>Client: Trả về thông báo chặn an toàn
    else Yêu cầu hợp lệ
        Sec-->>Orch: Approved (L1, L2, L3)
        Orch->>Reason: Giai đoạn 7: Suy luận sâu (5-Whys, CapEx/OpEx, LEAR)
        Reason-->>Orch: Structured Arguments & Solution
        Orch->>Gate: Giai đoạn 8: Điều phối Model & Tool (SSRF Safe)
        Gate-->>Orch: Raw Response Content
        Note over Orch: Giai đoạn 9: Áp Persona Lenses (AI Anh / Bán hàng / Chuyên gia)
        Orch->>Verify: Giai đoạn 10: Tự kiểm chứng VAT 10% & Catalog
        Verify-->>Orch: Confidence Grade (A/B/C) & Fact Tags
        Orch->>Mem: Giai đoạn 11: Lưu Episode & Cập nhật Working Memory
        Orch->>Client: Phản hồi hoàn chỉnh tới người dùng
    end
```

---

### 3. KIẾN TRÚC BỘ NHỚ 4 TẦNG THỐNG NHẤT (UNIFIED MEMORY CORE)

```mermaid
graph TD
    subgraph MemoryCore["UNIFIED MEMORY CORE (Cơ chế 4 Tầng)"]
        M1["1. WORKING MEMORY<br/>(Lưu RAM, Active Product, Instant Turn)"]
        M2["2. SHORT-TERM EPISODIC MEMORY<br/>(Bảng ai_memory_episodes, Tiến độ phiên)"]
        M3["3. LONG-TERM SEMANTIC MEMORY<br/>(Bảng ai_memories, FACT / INFERENCE, Gắn nhãn sự thật)"]
        M4["4. META-MEMORY & PROFILE<br/>(Thói quen, Khẩu vị rủi ro, Phân quyền Tenant)"]
    end

    subgraph MemoryGovernance["CƠ CHẾ QUẢN TRỊ TRÍ NHỚ"]
        CD["Phát hiện mâu thuẫn<br/>(ai_memory_contradictions)"]
        DC["Cơ chế phân rã<br/>(Memory Decay & Recency Score)"]
        FG["Quên chủ động<br/>(Active Forgetting theo lệnh)"]
        TI["Cách ly dữ liệu<br/>(Strict Tenant Isolation - org_id)"]
    end

    M1 --> M2
    M2 --> M3
    M3 --> M4
    M3 --- CD
    M3 --- DC
    M3 --- FG
    M4 --- TI
```

---

### 4. BẢNG THÔNG SỐ KIẾN TRÚC KỸ THUẬT (SPECIFICATIONS)
- **Kiểu ứng dụng:** Monolithic Modular Service kết hợp Decoupled Frontend SPA.
- **Môi trường thực thi Backend:** Node.js v20.x ESM (V8 JavaScript Engine).
- **Web Framework:** Express 5.2.1.
- **Frontend SPA:** React 18.3.1, Vite 5.4.21, TailwindCSS 3.4.3.
- **Hệ thống cơ sở dữ liệu:** SQLite 3.45 (WAL Mode, Foreign Keys ON, FTS5 Full-Text Search).
- **Hệ cơ chế bảo mật mật khẩu:** PBKDF2 (100.000 iterations, 64-byte key length, Cryptographic Salt ngẫu nhiên).
- **Chữ ký kiểm toán an ninh:** HMAC SHA-256 cho toàn bộ nhật ký phê duyệt L4.
- **Giao thức mạng:** HTTP/1.1 REST, JSON, hỗ trợ chuẩn bị WebSocket Event Streams.
