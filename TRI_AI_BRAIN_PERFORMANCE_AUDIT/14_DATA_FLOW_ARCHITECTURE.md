# BÁO CÁO KIỂM TOÁN KIẾN TRÚC LUỒNG DỮ LIỆU
# TRÍ AI ONE SUPER BRAIN — END-TO-END DATA FLOW & EXECUTION PIPELINE

> **Repository:** `https://github.com/TRINAMABANK/BOTCHAT` | **Branch:** `main`  
> **Commit SHA:** `65cff35063ccba4703a640a839b83104ef7d64fc`  
> **Kiểm toán viên:** Principal Systems Architect & Integration Specialist  

---

## 1. BẢN ĐỒ LUỒNG DỮ LIỆU TOÀN DIỆN (11-STAGE UNIFIED COGNITIVE PIPELINE)

Sơ đồ thể hiện chu trình xử lý một thông điệp từ khi khách hàng gửi đến khi phản hồi được xuất ra và lưu vết trí nhớ:

```mermaid
flowchart TD
    UserInput["1. USER INPUT\n(Web / Kiosk / Voice STT)"] --> Stage1["GIAI ĐOẠN 1: Input Sanitization\n(Lọc ký tự điều khiển, chuẩn hóa tiếng lóng)"]
    
    Stage1 --> Stage2["GIAI ĐOẠN 2: Pragmatic Intelligence\n(Phân tích 12 hành vi ngôn ngữ & ý định ngầm)"]
    
    Stage2 --> Stage3["GIAI ĐOẠN 3: Context Hydration\n(Nạp lịch sử, đại từ chỉ định, khóa sản phẩm)"]
    
    Stage3 --> Stage4{"GIAI ĐOẠN 4: Multi-Thread State\nPhân luồng & Chuyển chủ đề"}
    
    Stage4 -- "Quay lại chủ đề cũ" --> ResumeOld["Khôi phục Goal Stack cũ\n(Soạn báo giá)"]
    Stage4 -- "Chứng khoán / Tài chính" --> StockTopic["Phân tích thị trường tài chính"]
    Stage4 -- "Dự báo thời tiết" --> WeatherTopic["Thời tiết vệ tinh Open-Meteo"]
    Stage4 -- "Soạn công văn / Thông báo" --> AdminTopic["Soạn thảo văn bản hành chính"]
    Stage4 -- "Sự cố kỹ thuật (Kẹt giấy)" --> TechTopic["Quy trình 4 bước gỡ kẹt giấy an toàn"]
    Stage4 -- "Fallthrough luồng sâu" --> Stage5["GIAI ĐOẠN 5: Unified Memory Retrieval\n(Kiểm tra lệnh bộ nhớ: Xem/Sửa/Xóa)"]
    
    Stage5 --> Stage6{"GIAI ĐOẠN 6: Security Governance\nKiểm tra phân quyền L1 - L4"}
    Stage6 -- "Yêu cầu thanh toán / Rút tiền" --> BlockTier3["CHỐT CHẶN BẢO MẬT TIER 3\nTừ chối tự động chuyển tiền"]
    Stage6 -- "Hợp lệ" --> Stage7{"GIAI ĐOẠN 7: Cognitive Reasoning\nĐánh giá năng lực chuyên sâu"}
    
    Stage7 -- "Khách chê giá cao" --> LearFramework["Quy trình xử lý phản đối LEAR"]
    Stage7 -- "Sót tiền giả tinh vi" --> FakeMoneySol["Giải pháp cảm biến quang học IR/MG/CIS"]
    Stage7 -- "Giải thích nguyên lý" --> ExplainPrinciple["Cơ chế nạp cơ học & vi xử lý DSP"]
    Stage7 -- "Yêu cầu bán hàng / Báo giá / Tra cứu" --> Stage8["GIAI ĐOẠN 8: Tool Selection\n(Quotation, RAG, Excel, Web, SalesEngine)"]
    
    Stage8 --> Stage9["GIAI ĐOẠN 9: Response Planning & Persona\n(Định danh TRÍ AI, lọc bỏ 'Cột 2')"]
    
    Stage9 --> Stage10{"GIAI ĐOẠN 10: Self-Verification Quality Gate\n(Kiểm định Ground Truth, VAT 10%)"}
    
    Stage10 -- "Đạt chuẩn" --> Stage11["GIAI ĐOẠN 11: Memory Consolidation\n(Lưu tin nhắn vào SQLite, ghi nhận mâu thuẫn)"]
    
    Stage11 --> FinalOutput["FINAL RESPONSE\n(Xuất ra màn hình chat, kèm âm thanh TTS tự nhiên)"]
```

---

## 2. PHÂN TÍCH TUẦN TỰ VS SONG SONG TRONG PIPELINE

### A. Các bước đang chạy tuần tự (Sequential Steps):
1. **Sanitization → Pragmatic → Context → Thread Dispatch:** Bắt buộc phải tuần tự vì bước sau cần dữ liệu chuẩn hóa của bước trước.
2. **Security Gate → Tool Execution → Verification:** Bắt buộc tuần tự để đảm bảo an toàn tuyệt đối (Không bao giờ gọi tool trước khi kiểm tra quyền).

### B. Các bước CẦN chuyển sang chạy song song (Parallel Opportunities):
1. **Nạp Lịch sử Hội thoại & Nạp Đồ thị Tri thức (Stage 3):**  
   Hiện đang chạy tuần tự (`await getConversationHistory(); await getAugmentedContext();`).  
   → Cần chuyển sang `Promise.all()` để giảm ngay 10ms độ trễ.
2. **Truy vấn Dữ liệu Sản phẩm & Kiểm tra Tri thức Curated (Stage 8):**  
   Có thể truy vấn song song giữa bảng `products` và `approved_knowledge` của TRÍ AN Learning Center.

---

## 3. CÁC ĐIỂM CÓ NGUY CƠ GÂY VÒNG LẶP HOẶC PHẢN HỒI CHẬM

1. **Nguy cơ Fallback lặp (Loop / Waterfall Fallback):**  
   Khi người dùng gửi câu hỏi tra cứu web mà kết nối Internet bị timeout, hệ thống thử lại lần 2 bằng Gemini, nếu Gemini lỗi 429 lại rơi xuống Smart Sales Consultant, cuối cùng trả về thông báo lỗi chung. Quá trình này có thể kéo dài tới 4 - 6 giây nếu không có cơ chế Circuit Breaker.
2. **Khuyến nghị kiến trúc:**  
   Áp dụng `ToolGateway` với `Promise.race` cố định 5.000ms. Nếu quá 5 giây, ngắt ngay lập tức và trả lời thẳng thắn: *"Dạ hiện tại kênh tra cứu ngoài đang phản hồi chậm, em xin phép hỗ trợ thông tin nội bộ của shop trước nhé ạ!"*.
