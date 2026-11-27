# BÁO CÁO 04: KIẾN TRÚC HỆ THỐNG TOÀN CẦU
## ENTERPRISE SYSTEM ARCHITECTURE & INTEGRATION TOPOLOGY

```mermaid
flowchart TD
    subgraph ClientLayer["Lớp Tương tác Khách hàng & Đối tác"]
        Web[Web Browser / Responsive PWA]
        Mobile[Mobile App / React Native]
        PartnerApp[Hệ thống Đối tác / REST API Client]
        VoiceIn[Voice Recognizer / Micro Input]
    end

    subgraph GatewayLayer["Lớp Cổng Giao tiếp & An ninh (API Gateway)"]
        CORS[CORS & Security Headers]
        Sanitizer[Input Sanitizer & Anti-Prompt-Injection]
        AuthGuard[JWT Auth & Tenant Isolation Guard]
    end

    subgraph CognitiveCore["LỚP BỘ NÃO TRUNG TÂM (CENTRAL BRAIN CORE)"]
        Orchestrator[CentralBrainOrchestrator<br/>Pipeline 11 Giai đoạn]
        Pragmatic[Pragmatic Intelligence Engine<br/>12 Communicative Acts]
        Context[Dynamic Context Engine<br/>Co-Reference & Time Resolver]
        MultiThread[Multi-Thread Engine<br/>Goal Stack & Topic Registry]
        Reasoning[Cognitive Reasoning Engine<br/>5-Whys, CapEx/OpEx, LEAR]
        QualityGate[Self-Verification Quality Gate<br/>Ground Truth & VAT 10% Check]
    end

    subgraph MemoryLayer["Lớp Trí nhớ Thống nhất (Canonical Memory)"]
        UnifiedMem[UnifiedMemoryCore Facade]
        SQLiteWAL[(SQLite WAL Mode Database<br/>ai_memories / conversations)]
        KG[(Hardware Knowledge Graph<br/>Compatibility Edges)]
    end

    subgraph ExecutionLayer["Lớp Cổng Mô hình & Công cụ (Model & Tool Gateway)"]
        ModelGW[Model Gateway<br/>Tier-based Routing]
        ToolGW[Tool Gateway & SSRF Sandbox]
        Gemini[Google Gemini 3.5 Flash]
        OpenAI[OpenAI GPT-4o]
        LocalAI[Deterministic Local Fallback AI]
        RAG[RAG Hybrid Search Engine]
        Quotation[Quotation & VAT Engine]
    end

    ClientLayer --> GatewayLayer
    GatewayLayer --> CognitiveCore
    CognitiveCore <--> MemoryLayer
    CognitiveCore <--> ExecutionLayer
    ExecutionLayer --> Gemini
    ExecutionLayer --> OpenAI
    ExecutionLayer --> LocalAI
    ExecutionLayer --> RAG
    ExecutionLayer --> Quotation
```

---

### NGUYÊN TẮC BẢO TOÀN KIẾN TRÚC
1. **Decoupled Intelligence:** Tách biệt tuyệt đối giữa tầng nhận thức (Cognitive Core) và tầng thực thi mô hình (Model Gateway). Điều này giúp hệ thống không bị phụ thuộc (Vendor lock-in) vào bất kỳ hãng AI nào.
2. **Deterministic Safety Net:** Mọi quyết định liên quan đến giá bán, thông số thiết bị và giao dịch tiền tệ đều được chốt chặn bằng logic xác định (Deterministic Quality Gate), triệt tiêu hoàn toàn rủi ro ảo giác (Hallucination).
