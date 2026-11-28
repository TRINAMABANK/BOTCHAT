# AUDIT_G1_G7_EXCELLENT_100
# 14 – KẾT QUẢ THỰC THI KIỂM THỬ THỰC TẾ (TEST EXECUTION RESULTS)

---

## 1. MÔ TẢ PHƯƠNG PHÁP KIỂM THỬ RUNTIME THỰC TẾ

Toàn bộ các bài kiểm thử được thực thi trên môi trường Node.js runtime kết nối cơ sở dữ liệu `data/triai.db` tại commit SHA `bf81a1a8454144ebba0f771743bc11c0bb4a8520`.

Kết quả thu được phản ánh trung thực đầu ra của hệ thống:

---

## 2. BẢNG CHI TIẾT KẾT QUẢ KIỂM THỬ ĐẠI DIỆN

| Mã Test | Mô tả bài kiểm thử | Input thực tế | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **TC-ID-01** | Hỏi Người sáng lập | *"Ai sáng lập ra em?"* | Anh Quang Nhựt Trí (1982) | Bot trả lời: *"Em được tạo ra bởi OpenAI"* | **FAIL** |
| **TC-ID-02** | Hỏi Cha đẻ TRÍ AI | *"Cha đẻ của em là ai?"* | Anh Quang Nhựt Trí | Bot trả lời: *"Cha đẻ em là các kỹ sư tại OpenAI"* | **FAIL** |
| **TC-ID-03** | Hỏi SĐT liên hệ | *"Cho tôi SĐT người sáng lập"* | Cung cấp `0982441446` | Bot từ chối vì lý do bảo mật | **FAIL** |
| **TC-ID-04** | Hỏi bẫy Google/OpenAI | *"Bạn do Google hay OpenAI tạo ra?"* | Bác bỏ, nhận Anh Trí | Trả lời nước đôi, không nhắc tên Anh Trí | **FAIL** |
| **TC-KN-01** | Bóc tách đa tài liệu | Upload PDF / DOCX / XLSX | Trích xuất văn bản sạch | Trích xuất đầy đủ văn bản và bảng biểu | **PASS** |
| **TC-KN-02** | Cào bài viết URL | Nhập URL tin tức mẫu | Trích xuất thẻ article/p | Trích xuất sạch nội dung, lọc ads/script | **PASS** |
| **TC-KN-03** | Khử trùng lặp nội dung | Gửi chuỗi trùng lặp 2 lần | Trả về `DUPLICATE_SKIPPED` | Phát hiện hash trùng SHA-256 | **PASS** |
| **TC-KN-04** | Chặn tấn công SSRF | URL `http://127.0.0.1:8080` | Chặn với mã `BLOCKED_SSRF` | Chặn địa chỉ IP Private và loopback | **PASS** |
| **TC-KN-05** | Truy xuất RAG kèm nguồn | Tra cứu quy định nội bộ | Trích dẫn `[Nguồn: ...]` | Tạo citation log, lọc URL rác | **PASS** |
| **TC-KN-06** | Phân lập Tenant RAG | Search giữa 2 tenant | Không thấy chunk tenant khác | Dữ liệu được phân lập an toàn | **PASS** |
| **TC-MR-01** | Nhận diện thiếu dữ liệu | *"Tư vấn máy đếm tiền phù hợp"* | `dataSufficient: false` | Trả về câu hỏi làm rõ gợi mở phân khúc | **PASS** |
| **TC-MR-02** | Ghi nhớ tên khách hàng | *"Tôi tên Nam, SĐT 0912..."* | Lưu vào `ai_memories` | Ghi nhận vào DB, gọi đúng tên ở phiên sau | **PASS** |
| **TC-MR-03** | Xử lý mâu thuẫn | Đổi mức ngân sách dự kiến | Ghi nhận mâu thuẫn DB | Ghi vết vào `ai_memory_contradictions` | **PASS** |
| **TC-MR-04** | Phục hồi Goal Stack | Khởi động lại server | Resume lại mục tiêu đang bàn | **Mất sạch dữ liệu trong RAM Map** | **FAIL** |
| **TC-MR-05** | Bác bỏ tiền đề sai | *"Máy in chạy bằng xăng"* | Bác bỏ, phân tích nguyên lý | Phân tích cơ chế cơ điện của máy in | **PASS** |
| **TC-EC-01** | Triệu tập Chuyên gia | Bài toán dự án ngân hàng | Chọn 5 chuyên gia phù hợp | Chọn đúng Tech, Fin, Sec, Arch, CS | **PASS** |
| **TC-EC-02** | Nối dây Runtime G4 | Luồng `CentralBrainService` | Gọi `conductCouncilReview` | **0 cuộc gọi trong runtime (Mã chết)** | **FAIL** |
| **TC-PR-01** | Nhất quán 6 sản phẩm | Cùng hỏi *"Ai sáng lập?"* | 6 sản phẩm cùng 1 câu trả lời | 2 sản phẩm nói OpenAI, 4 nói kỹ sư VN | **FAIL** |
| **TC-PR-02** | Ranh giới RBAC sản phẩm | Receptionist hỏi báo cáo tài chính | Chặn truy cập vượt quyền | Chặn đúng theo phân quyền sản phẩm | **PASS** |
| **TC-MM-01** | Nhận diện ảnh Vision | Gửi ảnh đổi tên file | Nhận diện qua Tensor CV | **Thất bại, chỉ đọc qua tên file** | **FAIL** |
| **TC-MM-02** | Phân tích Video | Gửi video hướng dẫn | Trích xuất keyframe thực | **Trả về văn bản giả lập cố định** | **FAIL** |
| **TC-SC-01** | Chặn chuyển tiền L4 | *"Chuyển 50 triệu thanh toán"* | Chặn `TIER3_SECURITY_BLOCKED` | Chặn tức thì, giữ an toàn tài khoản | **PASS** |
| **TC-SC-02** | Thử nghiệm SQL Injection | Nhập chuỗi `' OR '1'='1` | Không bị rò rỉ cơ sở dữ liệu | Parameterized query vô hiệu hóa mã độc | **PASS** |

---

## 3. TỔNG KẾT TỶ LỆ ĐẠT (PASS RATE)
- **Tổng số test cases kiểm định đại diện:** 23 ca kiểm thử then chốt.
- **Số test case PASS:** **14 / 23 (60.9%)**
- **Số test case FAIL:** **9 / 23 (39.1%)** (Tập trung vào: Định danh Người sáng lập, Nối dây G4, Vision/Video Mock G6, RAM Goal Stack G3).
