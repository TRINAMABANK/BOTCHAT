# HỘI ĐỒNG KIỂM TOÁN PHẦN MỀM VÀ AI ĐỘC LẬP CẤP CAO
# DANH MỤC TEST CASES KIỂM ĐỊNH ĐỘC LẬP G3–G7
## TRÍ AI ONE SUPER BRAIN – CENTRAL INTELLIGENCE SYSTEM
### Mã tài liệu: AUDIT-G3-G7-TC-09

---

## 1. PHÂN BỔ TEST CASES THEO CÁC GIAI ĐOẠN

| Nhóm Kiểm định | Giai đoạn | Số lượng Test Cases | Phương pháp Kiểm chứng |
|:---|:---:|:---:|:---|
| **Nhóm 1: Memory & Reasoning** | G3 | 30 Cases | Semantic Intelligence & Context Switch Tests |
| **Nhóm 2: Expert Council & Planning** | G4 | 30 Cases | Multi-specialist consensus & Dynamic DAG replanning |
| **Nhóm 3: Six Product Integration** | G5 | 40 Cases | Product & Tenant Isolation (110 automated tests) |
| **Nhóm 4: Multimodal Intelligence** | G6 | 30 Cases | WebSpeech vi-VN, PDF/Excel Parser, Gateway Packet |
| **Nhóm 5: Security & Optimization** | G7 | 50 Cases | PBKDF2, HMAC, SSRF, L1-L4 Gate, 510 benchmark requests |
| **TỔNG CỘNG TEST CASES ĐẶC TẢ** | **G3–G7** | **180 Cases** | **Dựa trên 871 bài kiểm thử tự động đã thực thi** |

---

## 2. TRÍCH DẪN TEST CASES TIÊU BIỂU TỪNG GIAI ĐOẠN

### G3: Trí nhớ & Suy luận
- `TC-G3-01`: Kiểm tra lưu trữ Working Memory và khôi phục sau 5 lượt đổi chủ đề.
- `TC-G3-02`: Kiểm tra tính toàn vẹn Episodic Memory sau khi tắt và khởi động lại Node.js server.
- `TC-G3-03`: Kiểm tra nhận diện 8 dạng ngụy biện kinh điển (Ad Hominem, Strawman, False Dilemma,...).
- `TC-G3-04`: Phân tích nguyên nhân sự cố kỹ thuật viễn thông qua chuỗi 5-Whys.

### G4: Hội đồng Chuyên gia & Lập kế hoạch
- `TC-G4-01`: Kích hoạt phân tích đồng thời 4 chuyên gia (Technical, Financial, Security, CS) cho yêu cầu báo giá TCO 5 năm.
- `TC-G4-02`: Chặn đứng đề xuất hành động vượt quyền từ chuyên gia nhờ Safeguard gate.
- `TC-G4-03`: Quản lý tiến độ GoalStack 5 cấp độ (Goal -> SubGoal -> Task -> SubTask -> ActionStep).

### G5: Tích hợp 6 Sản phẩm
- `TC-G5-01`: Ngăn chặn người dùng từ kênh Robot Receptionist gọi API sinh báo giá của Sales Robot.
- `TC-G5-02`: Xác minh cô lập dữ liệu tuyệt đối giữa Tenant A và Tenant B (0 rò rỉ chéo).
- `TC-G5-03`: Kiểm tra tính toàn vẹn Persona riêng biệt của cả 6 sản phẩm.

### G6: Đa phương thức
- `TC-G6-01`: Tiếp nhận âm thanh Web Speech API vi-VN và chuyển đổi thành văn bản chuẩn xác.
- `TC-G6-02`: Bóc tách bảng giá từ tệp Excel nhiều sheets có cột thành tiền phức tạp.
- `TC-G6-03`: Chuẩn hóa gói tin đa phương thức `Multimodal Context Packet` tại Gateway.

### G7: An ninh & Hiệu năng
- `TC-G7-01`: Chặn mã độc SQL Injection trong chuỗi truy vấn tham số.
- `TC-G7-02`: Chặn đứng lệnh chuyển tiền tự động tại bước thẩm duyệt L4 (Tier 3 Gate).
- `TC-G7-03`: Chặn dải IP nội bộ RFC1918 và Cloud Metadata (169.254.169.254) chống SSRF.
- `TC-G7-04`: Đo lường độ trễ 510 yêu cầu liên tục, kiểm tra P50 < 50ms, P95 < 200ms.
