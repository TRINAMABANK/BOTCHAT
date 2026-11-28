# TRI_AI_TRUE_INTELLIGENCE_AUDIT
# 02 – THÔNG TIN PHIÊN BẢN VÀ PHẠM VI KIỂM TOÁN (VERSION & SCOPE)

---

## 1. THÔNG TIN HỆ THỐNG VÀ PHIÊN BẢN XÁC THỰC

- **Tên dự án:** TRÍ AI ONE SUPER BRAIN
- **Repository:** `TRINAMABANK/BOTCHAT`
- **Branch:** `main`
- **Commit SHA thời điểm bắt đầu kiểm toán:** `bf81a1a8454144ebba0f771743bc11c0bb4a8520`
- **Môi trường thực thi kiểm toán:**
  - Runtime: Node.js `v20.20.2` (ES Modules)
  - Hệ điều hành: Windows 11 Enterprise x64
  - Cơ sở dữ liệu: SQLite 3 (`data/triai.db` – dung lượng ~15MB, 90 bảng cơ sở dữ liệu)
  - Vị trí mã nguồn: `d:/09- LAM APP KIEM TIEN/2027 LAM CHATBOT BAN HANG`

---

## 2. PHẠM VI KIỂM TOÁN (G1–G7 ONLY)

Kiểm toán tập trung vào tính chân thực của năng lực trí tuệ qua 7 phân hệ:
1. **G1 – Central Brain Architecture & Dynamic Tool Orchestration:**
   - Khả năng điều phối 11 giai đoạn của `CentralBrainOrchestrator`.
   - Cơ chế fallback và phân luồng giữa `CentralBrainService`, `NaturalHumanConversationEngine`.
2. **G2 – Continuous Learning & Knowledge Center:**
   - Pipeline tiếp nhận tri thức qua tài liệu và cào URL (`UnifiedKnowledgePipelineService`).
   - Khử trùng lặp SHA-256, phân đoạn, vector embeddings và trích xuất RAG thực tế.
3. **G3 – Memory & Reasoning Intelligence:**
   - Trí nhớ 4 tầng: Working Memory, Episodic Memory, Semantic Memory, Procedural Memory.
   - Bền vững sau khởi động lại (Restart Persistence) và giải quyết mâu thuẫn (`ai_memory_contradictions`).
   - Bộ máy tư duy phản biện (`CriticalThinkingEngine`) và suy luận logic (`ReasoningEngine`).
4. **G4 – Expert Council & Multi-Agent Planning:**
   - Hội đồng 10 chuyên gia (`ExpertCouncilManager`).
   - Bằng chứng thực tế về việc chuyên gia có tham gia luồng xử lý runtime hay không.
5. **G5 – Six Product Integration:**
   - Tính nhất quán tri thức và hành vi trên 6 sản phẩm: Sales Robot, Receptionist, Secretary, Tutor, Voice & Vision, Enterprise.
6. **G6 – Multimodal Intelligence:**
   - Khả năng xử lý hình ảnh, âm thanh thoại và tài liệu bảng tính/PDF.
7. **G7 – Security, Performance & Quality Gate:**
   - Chốt chặn an toàn bảo mật L1-L4 (`SecurityGovernanceGate`).
   - Cổng tự kiểm chứng chất lượng và tính toán thuế GTGT 10% (`SelfVerificationQualityGate`).

> [!WARNING]
> **LOẠI TRỪ TUYỆT ĐỐI (OUT OF SCOPE):**  
> Phân hệ G8 (Triển khai mở rộng cụm đa máy chủ, phân tán GPU tự trị) **TUYỆT ĐỐI KHÔNG THUỘC PHẠM VI KIỂM TOÁN NÀY**.

---

## 3. NGUYÊN TẮC KIỂM TOÁN KHẮT KHE (STRICT CHANGE FREEZE)

1. **Không sửa mã nguồn:** Giữ nguyên trạng 100% tất cả các file mã nguồn của hệ thống.
2. **Không thay đổi cơ sở dữ liệu:** Không chạy `schema migrations`, không thêm cột, không xóa bảng.
3. **Không can thiệp cấu hình:** Không sửa đổi biến môi trường Production `.env`.
4. **Thử nghiệm an toàn:** Mọi bài test kích hoạt runtime được thực hiện thông qua module test độc lập đọc trạng thái, không ghi đè dữ liệu kinh doanh của doanh nghiệp.
5. **Bằng chứng đầu ra thực tế:** Mọi điểm số đều phải dựa trên log đầu ra thực tế (`stdout` / kết quả JSON hàm trả về), không chấp nhận các khẳng định suông trong tài liệu.
