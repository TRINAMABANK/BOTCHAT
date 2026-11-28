# HỘI ĐỒNG KIỂM TOÁN ĐỘC LẬP TRÍ AI ONE SUPER BRAIN
# 13. EVIDENCE REGISTER – SỔ ĐĂNG KÝ BẰNG CHỨNG KIỂM TOÁN
### CHƯƠNG TRÌNH ĐÁNH GIÁ CHUẨN XUẤT SẮC TRÍ AI EXCELLENT 100/100
*Mã tài liệu: AUDIT-EXC-13 | Ngày: 28/11/2026 | Commit SHA: bf81a1a8454144ebba0f771743bc11c0bb4a8520*

---

## I. MỤC ĐÍCH SỔ ĐĂNG KÝ

Sổ đăng ký bằng chứng (Evidence Register) là căn cứ pháp lý kỹ thuật cao nhất của đợt kiểm toán. Mọi kết luận, nhận định và điểm số trong báo cáo đều được gắn liền với vị trí dòng mã nguồn, tên hàm và hành vi thực tế đã được kiểm chứng độc lập.

---

## II. BẢNG ĐĂNG KÝ BẰNG CHỨNG KỸ THUẬT G1–G7

```
┌──────┬───────────────┬─────────────────────────────────────────────────┬───────────────────┬────────────────────────────────────────────────────────┐
│ MÃ BC│ PHÂN HỆ G1–G7 │ VỊ TRÍ MÃ NGUỒN (FILE & DÒNG)                   │ CẤP ĐỘ BẰNG CHỨNG │ MÔ TẢ BẰNG CHỨNG KỸ THUẬT                              │
├──────┼───────────────┼─────────────────────────────────────────────────┼───────────────────┼────────────────────────────────────────────────────────┤
│ EV-01│ G1            │ server/services/centralBrainService.js:380      │ RUNTIME VERIFIED  │ CentralBrainOrchestrator.runPipeline(params) được gọi. │
│ EV-02│ G1            │ server/db.js:51-56                              │ RUNTIME VERIFIED  │ SQLite cấu hình WAL mode, PRAGMA foreign_keys = ON.    │
│ EV-03│ G1            │ server/index.js:51-64                           │ RUNTIME VERIFIED  │ Middleware CORS whitelist bảo vệ chặn domain lạ.       │
│ EV-04│ G2            │ server/services/knowledge/unifiedPipeline.js:80 │ TEST VERIFIED     │ Pipeline 10 bước xử lý đa định dạng, SHA-256 hash.     │
│ EV-05│ G2            │ server/services/parsers/multiDocParser.js:154   │ TEST VERIFIED     │ parsePptx giải nén và đọc XML slide bên trong PPTX.    │
│ EV-06│ G2            │ server/services/crawler/webExtractor.js:33      │ TEST VERIFIED     │ cheerio loại bỏ 100% script, style, nav, footer, ads.  │
│ EV-07│ G2            │ server/services/ragService.js:107-236           │ TEST VERIFIED     │ searchKnowledge: Hybrid RAG (BM25 + Cosine 128d).      │
│ EV-08│ G3            │ server/services/intelligence/unifiedMemory:45   │ RUNTIME VERIFIED  │ Working memory dùng Map RAM; SQLite lưu long-term.     │
│ EV-09│ G3            │ server/services/centralBrainOrchestrator.js:270 │ RUNTIME VERIFIED  │ Xử lý phản đối giá cao theo quy trình L-E-A-R.         │
│ EV-10│ G3            │ server/services/centralBrainOrchestrator.js:287 │ RUNTIME VERIFIED  │ Tư vấn giải pháp máy chống tiền giả kép (IR, CIS, MG). │
│ EV-11│ G4            │ server/services/intelligence/expertCouncil.js   │ SOURCE EXISTS ONLY│ expertCouncilManager.js KHÔNG ĐƯỢC IMPORT ở runtime.   │
│ EV-12│ G4            │ server/services/intelligence/deepResearch.js:20 │ RUNTIME VERIFIED  │ Phân rã cây giả thuyết nghiên cứu khoa học chuyên sâu. │
│ EV-13│ G5            │ server/services/intelligence/productConfig.js   │ SOURCE EXISTS ONLY│ productConfigurationEngine.js KHÔNG ĐƯỢC IMPORT.       │
│ EV-14│ G5            │ server/routes/secretaryRoutes.js:1-120          │ RUNTIME VERIFIED  │ TRÍ AI Secretary có router và DB riêng biệt.           │
│ EV-15│ G5            │ server/migrations/schema_phase_continuous...    │ TEST VERIFIED     │ Cột product_scope ngăn chặn 100% rò rỉ chéo sản phẩm.  │
│ EV-16│ G6            │ server/services/multimodal/visionEngine.js:34   │ MOCK / HEURISTIC  │ Nhận diện ảnh bằng tên file: fileName.includes('pan..')│
│ EV-17│ G6            │ server/services/multimodal/visionEngine.js:60   │ MOCK / PLACEHOLDER│ summarizeVideo trả về string cứng, không có video model│
│ EV-18│ G6            │ server/services/multimodal/inputGateway.js:1    │ SOURCE EXISTS ONLY│ multimodalInputGateway.js chưa được cắm vào Express.   │
│ EV-19│ G7            │ server/utils/ssrfProtection.js:32-83            │ TEST VERIFIED     │ isSafePublicUrl kiểm tra regex IP và DNS lookup an toàn│
│ EV-20│ G7            │ server/services/security/securityGate.js:30     │ RUNTIME VERIFIED  │ Tier 3 Autonomy Gate chặn giao dịch tài chính L4.      │
│ EV-21│ G7            │ server/middleware/authMiddleware.js:15          │ RUNTIME VERIFIED  │ requireAdmin kiểm soát quyền truy cập toàn bộ API.     │
└──────┴───────────────┴─────────────────────────────────────────────────┴───────────────────┴────────────────────────────────────────────────────────┘
```
