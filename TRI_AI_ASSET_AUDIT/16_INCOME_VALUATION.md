# 16. ĐỊNH GIÁ THEO PHƯƠNG PHÁP THU NHẬP CHIẾT KHẤU (INCOME VALUATION)
## CHUYÊN GIA TÀI CHÍNH VÀ ĐỊNH GIÁ DÒNG TIỀN (DCF VALUATION)
**Mã hồ sơ định giá:** VAL-TRIAI-2026-DCF  
**Phương pháp áp dụng:** Phương pháp Chiết khấu Dòng tiền Tự do (Discounted Cash Flow - DCF 3 Năm)  

---

### 1. MÔ HÌNH KHAI THÁC THƯƠNG MẠI (COMMERCIALIZATION MODEL)
Hệ thống **TRÍ AI ONE SUPER BRAIN** có khả năng thương mại hóa ngay lập tức thông qua 3 kênh dòng tiền thực tế:
1. **Mô hình B2B SaaS Subscription (Doanh nghiệp vừa và nhỏ - SMB):**
   - Triển khai cho các doanh nghiệp thương mại, phân phối thiết bị văn phòng, dịch vụ tài chính/ngân hàng.
   - Mức phí thuê bao dịch vụ: **1.500.000 – 3.000.000 VNĐ / tháng / doanh nghiệp**.
2. **Mô hình Enterprise On-Premise / Private Cloud Licensing:**
   - Chuyển giao trọn gói bản quyền cho các ngân hàng, chuỗi siêu thị, tổng công ty có yêu cầu bảo mật dữ liệu nội bộ.
   - Phí bản quyền triển khai một lần: **300.000.000 – 500.000.000 VNĐ / tổ chức** + Phí bảo trì 15%/năm.
3. **Mô hình White-Label / API Reseller:**
   - Cung cấp lõi nhận thức Central Brain cho các công ty giải pháp phần mềm khác nhúng vào sản phẩm của họ.

---

### 2. CÁC GIẢ ĐỊNH TÀI CHÍNH CỐT LÕI (FINANCIAL ASSUMPTIONS)
- **Chu kỳ dự phóng:** 3 năm (2027 – 2029).
- **Tỷ lệ chiết khấu (WACC - Weighted Average Cost of Capital):** **18.0% / năm** (Mức chiết khấu phản ánh rủi ro đối với tài sản công nghệ phần mềm giai đoạn đầu tại Việt Nam).
- **Chi phí vận hành (OPEX):** Chi phí Cloud, API AI bên ngoài, hạ tầng mạng, nhân sự hỗ trợ kỹ thuật ước tính chiếm **35% - 40% doanh thu**.
- **Kịch bản cơ sở (Baseline Scenario):**
  - Năm 1 (2027): 50 khách hàng B2B SaaS + 2 hợp đồng Enterprise Licensing.
  - Năm 2 (2028): 150 khách hàng B2B SaaS + 5 hợp đồng Enterprise Licensing.
  - Năm 3 (2029): 300 khách hàng B2B SaaS + 8 hợp đồng Enterprise Licensing.

---

### 3. BẢNG DỰ PHÓNG DÒNG TIỀN VÀ GIÁ TRỊ HIỆN TẠI THUẦN (DCF PROJECTIONS)

*(Đơn vị tính: Triệu VNĐ)*

| Chỉ Tiêu Tài Chính | Năm 1 (2027) | Năm 2 (2028) | Năm 3 (2029) |
|:---|---:|---:|---:|
| **Doanh thu B2B SaaS** (TB 24 tr/khách/năm) | 1.200 | 3.600 | 7.200 |
| **Doanh thu Enterprise Licensing** | 700 | 1.750 | 2.800 |
| **Doanh thu Dịch vụ Bảo trì & Tùy biến** | 100 | 360 | 680 |
| **TỔNG DOANH THU THUẦN (GROSS REVENUE)** | **2.000** | **5.710** | **10.680** |
| **Chi phí Vận hành (Cloud, API, Nhân sự)** | -800 | -2.150 | -3.850 |
| **Thu nhập Trước Lãi Vay & Thuế (EBIT)** | **1.200** | **3.560** | **6.830** |
| **Thuế Thu Nhập Doanh Nghiệp (Ưu đãi PM: 10%)** | -120 | -356 | -683 |
| **Dòng Tiền Tự Do Thuần (Free Cash Flow - FCF)** | **1.080** | **3.204** | **6.147** |
| **Hệ Số Chiết Khấu (Discount Factor @ 18%)** | 0.8475 | 0.7182 | 0.6086 |
| **Giá Trị Hiện Tại Thuần Hàng Năm (PV of FCF)** | **915.3** | **2.301.1** | **3.741.1** |
| **TỔNG GIÁ TRỊ HIỆN TẠI 3 NĂM (NPV 3-Year)** | — | — | **6.957.5 Triệu VNĐ** |

---

### 4. ĐIỀU CHỈNH RỦI RO THỰC THI (EXECUTION RISK ADJUSTMENT)
Trong giai đoạn hiện tại, sản phẩm chưa mở bán đại trà thương mại mà mới vượt qua thử nghiệm nội bộ và đóng gói production.
- Áp dụng **Hệ số rủi ro thực thi thị trường (Market Execution Discount):** **20%**.

$$\begin{aligned}
\text{Giá Trị Tài Sản Theo Phương Pháp Thu Nhập Điều Chỉnh} &= 6.957.500.000 \times (1 - 0.20) \\
&= \mathbf{5.566.000.000 \text{ VNĐ}} \quad (\sim \mathbf{\$222.640 \text{ USD}})
\end{aligned}$$

- **Mức độ tin cậy của phương pháp thu nhập:** **85%** (Mô hình kinh doanh B2B SaaS và Enterprise AI Agent tại Việt Nam đang có nhu cầu thực tế rất lớn trong khâu tự động hóa tư vấn và kiểm soát rủi ro bán hàng).
