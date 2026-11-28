# HỘI ĐỒNG KIỂM TOÁN PHẦN MỀM VÀ AI ĐỘC LẬP CẤP CAO
# BẢN ĐỒ LIÊN KẾT MODULE THỰC TẾ (REAL INTEGRATION MAP)
## TRÍ AI ONE SUPER BRAIN – CENTRAL INTELLIGENCE SYSTEM
### Mã tài liệu: AUDIT-G3-G7-MAP-08

---

## 1. SƠ ĐỒ LIÊN KẾT NHẬN THỨC VÀ DÒNG DỮ LIỆU THỰC TẾ

```mermaid
flowchart TD
    subgraph INGESTION["Cổng Tiếp nhận Đa phương thức"]
        M1[Text Input]
        M2[Voice WebSpeech vi-VN]
        M3[Document PDF/Excel]
        M4[Image/Video Gateway]
        M1 & M2 & M3 & M4 --> GW[multimodalInputGateway.js]
    end

    subgraph CORE["Central Brain Orchestrator Kernel"]
        GW --> P1[Context & History Recovery]
        P1 --> P2[UnifiedMemoryCore: 6 Tầng Ký Ức SQLite]
        P2 --> P3[RAG Engine: Tri thức Zone A Đã Phê Duyệt]
        P3 --> P4[Dual-Path Reasoning: Fast vs Deep DAG]
        P4 --> P5[CriticalThinking: 8 Bộ Lọc Ngụy Biện]
        P5 --> P6[ExpertCouncilManager: 10 Chuyên Gia AI]
        P6 --> P7[PlanningEngine: GoalStack 5 Cấp Độ]
        P7 --> P8[ProductConfigurationEngine: 6 Sản Phẩm]
        P8 --> P9[SecurityGovernanceGate: L1-L4 & Tier 3 Finance Lock]
    end

    subgraph EXECUTION["Thực thi & Học tập"]
        P9 --> ACT[Báo Giá Chuẩn VAT 10% / Lịch Hẹn / Soạn Thảo]
        ACT --> FB[Feedback & UnifiedMemory Update]
        FB --> ZB[learningIngestionEngine: Zone B Chờ Phê Duyệt]
    end
```

---

## 2. DANH MỤC CÁC ĐƯỜNG LIÊN KẾT ĐÃ XÁC MINH TRONG RUNTIME
1. **MultimodalGateway -> Orchestrator**: Tiếp nhận và chuẩn hóa gói tin.
2. **Orchestrator -> UnifiedMemoryCore**: Đọc và ghi 6 tầng ký ức theo `userId`.
3. **Orchestrator -> RagService**: Truy xuất tài liệu chính thống Zone A (`approval_status = 'APPROVED'`).
4. **Orchestrator -> ReasoningEngine & CriticalThinking**: Lọc 8 dạng ngụy biện, phân tích 5-Whys.
5. **Orchestrator -> ExpertCouncilManager**: Lấy ý kiến tư vấn từ Technical, Financial, Security, CS, QA.
6. **Orchestrator -> ProductConfigurationEngine**: Áp dụng ranh giới cô lập cho 6 sản phẩm.
7. **Orchestrator -> SecurityGovernanceGate**: Ngăn chặn 100% giao dịch tài chính tự động.
