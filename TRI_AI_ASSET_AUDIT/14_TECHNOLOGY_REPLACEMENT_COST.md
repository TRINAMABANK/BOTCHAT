# 14. ĐỊNH GIÁ THEO PHƯƠNG PHÁP CHI PHÍ TÁI TẠO (TECHNOLOGY REPLACEMENT COST)
## CHUYÊN GIA ĐỊNH GIÁ TÀI SẢN CÔNG NGHỆ (VALUATION ANALYST)
**Mã hồ sơ định giá:** VAL-TRIAI-2026-COST  
**Phương pháp áp dụng:** Phương pháp Chi phí Tái tạo Thay thế (Replacement Cost Method - IVS 210)  

---

### 1. NGUYÊN TẮC VÀ CƠ SỞ ĐỊNH GIÁ CHI PHÍ
Phương pháp Chi phí Tái tạo xác định số tiền cần thiết để một tổ chức hoặc nhà đầu tư xây dựng lại một hệ thống phần mềm có tính năng, độ phức tạp, năng lực nhận thức và độ tin cậy tương đương với **TRÍ AI ONE SUPER BRAIN** tại thời điểm hiện tại, sử dụng công nghệ và tiêu chuẩn thị trường lao động công nghệ cao tại Việt Nam.

- **Không tính chi phí theo số dòng code đơn thuần** (vì code dài chưa chắc đã tốt).
- Tính theo số **Tháng-Người (Man-Months)** của đội ngũ kỹ sư cao cấp cần thiết để hoàn thiện toàn bộ 233 module, 88 bảng CSDL, 11 tầng nhận thức và 56 bộ kiểm thử.

---

### 2. DỰ TOÁN ĐỘI NGŨ NHÂN SỰ VÀ THỜI GIAN TÁI TẠO

Để tái tạo một hệ thống tương đương cần một đội ngũ R&D tinh nhuệ gồm 9 nhân sự làm việc trong vòng **11 tháng**:

| Vị Trí Kỹ Thuật (Role) | Số Lượng (Headcount) | Mức Lương Thị Trường (VNĐ/tháng) | Thời Gian (Tháng) | Tổng Chi Phí Lương (VNĐ) |
|:---|:---:|:---:|:---:|---:|
| **Principal Software / AI Architect** | 1 | 90.000.000 | 11 | 990.000.000 |
| **Senior AI / NLP Research Engineer** | 2 | 60.000.000 | 10 | 1.200.000.000 |
| **Senior Backend Node.js Engineer** | 2 | 50.000.000 | 11 | 1.100.000.000 |
| **Senior Frontend React / UI Engineer** | 1 | 45.000.000 | 8 | 360.000.000 |
| **Database & Knowledge Graph Architect**| 1 | 55.000.000 | 6 | 330.000.000 |
| **Cybersecurity & Safety Auditor** | 1 | 50.000.000 | 4 | 200.000.000 |
| **Senior QA / Automation Test Engineer**| 1 | 35.000.000 | 8 | 280.000.000 |
| **TỔNG CHI PHÍ NHÂN SỰ TRỰC TIẾP** | **9 nhân sự** | — | — | **4.460.000.000 VNĐ** |

---

### 3. CÁC CHI PHÍ HỖ TRỢ KỸ THUẬT & HẠ TẦNG PHÁT TRIỂN

| Hạng Mục Chi Phí Phụ Trợ | Mô Tả Chi Tiết | Dự Toán Chi Phí (VNĐ) |
|:---|:---|---:|
| **Hạ tầng Cloud, VPS & GPU Thử Nghiệm** | Thuê VPS, GPU Server kiểm thử mô hình và vector embeddings | 85.000.000 |
| **Chi phí API Thử nghiệm (OpenAI/Gemini)** | Chi phí gọi API phục vụ kiểm thử 200 kịch bản và huấn luyện thử nghiệm | 40.000.000 |
| **Chi phí Công cụ & Bản quyền Phần mềm** | IDE, GitHub Enterprise, Figma, Postman, Profiling tools | 35.000.000 |
| **Chi phí Biên soạn Tri thức & Rà soát TCVN** | Chuẩn hóa tri thức ngành máy văn phòng, luật kinh doanh, ngân hàng | 65.000.000 |
| **TỔNG CHI PHÍ PHỤ TRỢ** | — | **225.000.000 VNĐ** |

$$\text{Tổng Chi Phí Tái Tạo Thô (Raw Replacement Cost)} = 4.460.000.000 + 225.000.000 = \mathbf{4.685.000.000 \text{ VNĐ}} \quad (\sim \$187.400 \text{ USD})$$

---

### 4. KHẤU TRỪ KỸ THUẬT VÀ TÍNH TOÁN GIÁ TRỊ THUẦN (DEPRECIATION & DEDUCTIONS)

Mặc dù hệ thống đã hoàn thiện và vượt qua 100% các bài test, nhưng theo nguyên tắc kiểm toán thận trọng, cần áp dụng các khoản khấu trừ kỹ thuật:

| Khoản Khấu Trừ Kỹ Thuật (Technical Deductions) | Tỷ Lệ Khấu Trừ | Giá Trị Khấu Trừ (VNĐ) | Căn Cứ Đánh Giá |
|:---|:---:|---:|:---|
| **Sự phụ thuộc vào AI Model bên thứ ba (Gemini/OpenAI)** | **5.0%** | 234.250.000 | Hệ thống vẫn cần kết nối Cloud LLM cho các tác vụ suy luận ngữ nghĩa tự do. |
| **Nợ kỹ thuật kiến trúc Monolithic (Refactoring Debt)** | **4.0%** | 187.400.000 | Cần tách route trong `server/index.js` và chuyển bộ nhớ session sang Redis Cluster. |
| **Hạn chế của CSDL tệp tin SQLite khi tải siêu lớn** | **3.0%** | 140.550.000 | Cần di chuyển sang PostgreSQL khi lượng concurrent sessions vượt 1.000 kết nối. |
| **TỔNG KHẤU TRỪ KỸ THUẬT (TOTAL DEDUCTION)** | **12.0%** | **562.200.000 VNĐ** | **Mức chiết khấu an toàn theo chuẩn quốc tế** |

---

### 5. KẾT QUẢ ĐỊNH GIÁ THEO PHƯƠNG PHÁP CHI PHÍ (COST APPROACH VALUE)

$$\begin{aligned}
\text{Giá Trị Tài Sản Theo Chi Phí Tái Tạo Điều Chỉnh} &= \text{Chi Phí Tái Tạo Thô} - \text{Khấu Trừ Kỹ Thuật} \\
&= 4.685.000.000 - 562.200.000 \\
&= \mathbf{4.122.800.000 \text{ VNĐ}} \quad (\sim \mathbf{\$164.912 \text{ USD}})
\end{aligned}$$

- **Mức độ tin cậy:** **92%** (Các số liệu định mức ngày công và mức lương căn cứ theo mặt bằng thực tế của thị trường tuyển dụng CNTT tại TP.HCM và Hà Nội năm 2026).
