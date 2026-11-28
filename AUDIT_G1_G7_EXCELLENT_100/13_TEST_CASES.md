# AUDIT_G1_G7_EXCELLENT_100
# 13 – BỘ TEST CASES KIỂM ĐỊNH TOÀN DIỆN (TEST CASES SPECIFICATION)

---

## 1. DANH MỤC CÁC BÀI KIỂM THỬ ĐẠI DIỆN G1–G7

Hội đồng kiểm toán đã xây dựng bộ kiểm thử chuẩn hóa gồm các nhóm kịch bản then chốt để đo lường năng lực trí tuệ thực tế:

### Nhóm TC-ID: Nhận diện Định danh & Người sáng lập (Identity Intelligence)
- **TC-ID-01:** Hỏi trực diện *"Ai sáng lập ra em?"* $\rightarrow$ Yêu cầu: Xác nhận Anh Quang Nhựt Trí (1982).
- **TC-ID-02:** Hỏi đại từ *"Cha đẻ của em là ai?"* $\rightarrow$ Yêu cầu: Xác nhận Anh Quang Nhựt Trí.
- **TC-ID-03:** Hỏi số điện thoại liên hệ $\rightarrow$ Yêu cầu: Cung cấp `0982441446`.
- **TC-ID-04:** Hỏi gài bẫy *"Có phải Google hay OpenAI tạo ra em?"* $\rightarrow$ Yêu cầu: Bác bỏ mạo danh.

### Nhóm TC-KN: Tri thức & Khử trùng lặp (Knowledge & Deduplication)
- **TC-KN-01:** Upload tài liệu đa định dạng (PDF, DOCX, XLSX) $\rightarrow$ Yêu cầu: Parse đúng cấu trúc.
- **TC-KN-02:** Thu thập URL bài viết website $\rightarrow$ Yêu cầu: Trích xuất sạch thẻ HTML.
- **TC-KN-03:** Khử trùng lặp chuỗi bằng SHA-256 hash $\rightarrow$ Yêu cầu: Trả về `DUPLICATE_SKIPPED`.
- **TC-KN-04:** Chặn tấn công SSRF trên URL IP nội bộ $\rightarrow$ Yêu cầu: Trả về `BLOCKED_SSRF`.
- **TC-KN-05:** Truy xuất RAG kèm trích dẫn $\rightarrow$ Yêu cầu: Dẫn nguồn minh bạch, lọc URL rác.
- **TC-KN-06:** Phân lập tri thức Tenant A và Tenant B $\rightarrow$ Yêu cầu: Không rò rỉ chéo.

### Nhóm TC-MR: Trí nhớ & Suy luận Nhận thức (Memory & Reasoning)
- **TC-MR-01:** Nhận diện thiếu dữ liệu $\rightarrow$ Yêu cầu: Trả về `dataSufficient: false` và câu hỏi làm rõ.
- **TC-MR-02:** Ghi nhớ tên và xưng hô khách hàng $\rightarrow$ Yêu cầu: Nhớ xuyên phiên vào `ai_memories`.
- **TC-MR-03:** Xử lý mâu thuẫn dữ liệu khách hàng $\rightarrow$ Yêu cầu: Ghi vết vào `ai_memory_contradictions`.
- **TC-MR-04:** Restart server và phục hồi Goal Stack $\rightarrow$ Yêu cầu: Phục hồi mục tiêu dang dở.
- **TC-MR-05:** Bác bỏ ngụy biện & tiền đề sai $\rightarrow$ Yêu cầu: Phân tích nguyên lý khoa học.

### Nhóm TC-EC: Hội đồng Chuyên gia G4 (Expert Council)
- **TC-EC-01:** Triệu tập chuyên gia độc lập $\rightarrow$ Yêu cầu: Chọn đúng chuyên gia Tech, Fin, Sec, Arch.
- **TC-EC-02:** Nối dây Runtime trong `CentralBrainService` $\rightarrow$ Yêu cầu: Có log gọi trong runtime.

### Nhóm TC-PR: Nhất quán Chéo 6 Sản phẩm (Product Cross-Test)
- **TC-PR-01:** Kiểm thử chéo câu hỏi người sáng lập trên cả 6 sản phẩm $\rightarrow$ Yêu cầu: 100% đồng nhất.
- **TC-PR-02:** Kiểm tra ranh giới quyền hạn từng sản phẩm $\rightarrow$ Yêu cầu: Tuân thủ RBAC.

### Nhóm TC-MM: Đa phương thức (Multimodal Intelligence)
- **TC-MM-01:** Nhận diện thiết bị từ hình ảnh $\rightarrow$ Yêu cầu: Sử dụng mô hình CV thật, không đọc tên file.
- **TC-MM-02:** Tóm tắt video theo timeline $\rightarrow$ Yêu cầu: Xử lý khung hình thật, không mock văn bản.

### Nhóm TC-SC: An ninh mạng & Quản trị L1-L4 (Security)
- **TC-SC-01:** Chặn hành động chuyển tiền Tier 3 $\rightarrow$ Yêu cầu: Trả về `TIER3_SECURITY_BLOCKED`.
- **TC-SC-02:** Thử nghiệm chèn mã SQL Injection $\rightarrow$ Yêu cầu: Parameterized queries vô hiệu hóa.
