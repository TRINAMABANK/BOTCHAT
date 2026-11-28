# HỘI ĐỒNG KIỂM TOÁN ĐỘC LẬP TRÍ AI ONE SUPER BRAIN
# 14. BUGS, ROOT CAUSES & RISKS – BẢNG LỖI VÀ MA TRẬN RỦI RO
### CHƯƠNG TRÌNH ĐÁNH GIÁ CHUẨN XUẤT SẮC TRÍ AI EXCELLENT 100/100
*Mã tài liệu: AUDIT-EXC-14 | Ngày: 28/11/2026*

---

## I. BẢNG PHÂN LOẠI LỖI THEO MỨC ĐỘ NGHIÊM TRỌNG (P0 – P3)

```
┌──────┬────────┬───────────────┬───────────────────────────────────────────────────────────────────┬────────────────────────────────────────────────────────┐
│ MÃ   │ CẤP ĐỘ │ PHÂN HỆ G1–G7 │ MÔ TẢ CHI TIẾT LỖI                                                │ NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE)                        │
├──────┼────────┼───────────────┼───────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ BUG-1│ **P0** │ G6            │ Vision & Video dùng Heuristic tên file và Mock chuỗi cố định.      │ Thiếu mô hình thị giác AI thực tế (Computer Vision API)│
│      │        │               │ `fileName.includes('panasonic')`, confidence: 0.96.               │ do mới chỉ làm giao diện mẫu tại Stage G6.             │
├──────┼────────┼───────────────┼───────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ BUG-2│ **P1** │ G4            │ `expertCouncilManager.js` không được import tại bất kỳ đâu trong   │ Module được code độc lập tại G4 nhưng chưa được        │
│      │        │               │ `centralBrainService.js` hay `centralBrainOrchestrator.js`.       │ nối dây (wiring) vào pipeline chính của Central Brain. │
├──────┼────────┼───────────────┼───────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ BUG-3│ **P1** │ G5            │ `productConfigurationEngine.js` không được import để cưỡng chế     │ Tương tự BUG-2, cấu hình 6 sản phẩm chưa được cắm vào  │
│      │        │               │ quyền hạn và giới hạn công cụ tại runtime của tin nhắn.           │ hàm xử lý tin nhắn trung tâm `handleMessage`.          │
├──────┼────────┼───────────────┼───────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ BUG-4│ **P1** │ G6            │ `multimodalInputGateway.js` chưa được gắn vào tuyến Express Route.│ Chưa có endpoint tiếp nhận gói nhận thức đa phương     │
│      │        │               │                                                                   │ thức `/api/multimodal/packet`.                         │
├──────┼────────┼───────────────┼───────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ BUG-5│ **P2** │ G3            │ Working Memory (Goal Stack) dùng Map trong RAM, bị xóa khi restart│ Chưa có bảng SQLite đệm lưu trạng thái phiên dở dang   │
│      │        │               │ tiến trình Node.js.                                               │ `ai_memory_working_context`.                           │
├──────┼────────┼───────────────┼───────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ BUG-6│ **P3** │ G2            │ Admin UI chưa có tab hiển thị trực tiếp danh sách crawler tasks   │ Backend API đã có (`/crawler/tasks`) nhưng frontend    │
│      │        │               │ và batch uploads.                                                 │ KnowledgeCenter.jsx chưa vẽ component bảng.           │
└──────┴────────┴───────────────┴───────────────────────────────────────────────────────────────────┴────────────────────────────────────────────────────────┘
```

---

## II. MA TRẬN RỦI RO HỆ THỐNG (RISK MATRIX)

```
┌──────────────────────────────────────┬─────────────┬──────────────┬──────────────┬────────────────────────────────────────────────────────┐
│ MÔ TẢ RỦI RO KỸ THUẬT                │ XÁC SUẤT    │ TÁC ĐỘNG     │ MỨC ĐỘ RỦI RO│ BIỆN PHÁP GIẢM THIỂU (MITIGATION)                      │
├──────────────────────────────────────┼─────────────┼──────────────┼──────────────┼────────────────────────────────────────────────────────┤
│ R-01: Người dùng gửi ảnh không có tên│ RẤT CAO     │ CAO          │ **NGHIÊM TRỌNG** Tích hợp Gemini 1.5 Flash Vision API phân tích       │
│ đúng từ khóa thì AI nhận diện sai.   │ (90%)       │              │              │ điểm ảnh thực tế thay vì soi tên file.                 │
├──────────────────────────────────────┼─────────────┼──────────────┼──────────────┼────────────────────────────────────────────────────────┤
│ R-02: Hội đồng chuyên gia không bao  │ RẤT CAO     │ TRUNG BÌNH   │ **CAO**      │ Import và kích hoạt ExpertCouncilManager tại Stage 8   │
│ giờ được kích hoạt khi câu hỏi khó.  │ (100%)      │              │              │ của centralBrainOrchestrator.js.                       │
├──────────────────────────────────────┼─────────────┼──────────────┼──────────────┼────────────────────────────────────────────────────────┤
│ R-03: Server khởi động lại làm mất   │ TRUNG BÌNH  │ THẤP         │ **VỪA PHẢI** │ Lưu goalStackStore xuống SQLite trước khi thoát tiến   │
│ ngữ cảnh đang trao đổi dở dang.      │ (30%)       │              │              │ trình và khôi phục khi khởi động lại.                  │
└──────────────────────────────────────┴─────────────┴──────────────┴──────────────┴────────────────────────────────────────────────────────┘
```
