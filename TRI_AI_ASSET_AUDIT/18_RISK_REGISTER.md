# 18. SỔ ĐĂNG KÝ VÀ QUẢN TRỊ RỦI RO CÔNG NGHỆ (RISK REGISTER)
## BAN KIỂM TOÁN VÀ ĐÁNH GIÁ RỦI RO ĐỘC LẬP
**Mã hồ sơ:** AUD-TRIAI-2026-RISK  

---

### MA TRẬN PHÂN TÍCH RỦI RO KỸ THUẬT VÀ GIẢI PHÁP PHÒNG NGỪA

| Mã Rủi Ro | Phân Loại Rủi Ro | Mô Tả Nguy Cơ Kỹ Thuật | Khả Năng Xảy Ra | Mức Độ Ảnh Hưởng | Cấp Độ Rủi Ro | Biện Pháp Kiểm Soát Đã Triển Khai | Rủi Ro Còn Lại (Residual Risk) |
|:---:|:---|:---|:---:|:---:|:---:|:---|:---:|
| **RSK-01** | **Bảo Mật / Tài Chính** | Người dùng lừa bot tự động chuyển tiền ngân hàng hoặc thanh toán hợp đồng (L4 Action). | Trung bình | Thảm họa (Critical) | **RẤT CAO** | Đã triển khai `SecurityGovernanceGate` và `AutonomyApprovalEngine`. Chặn đứng 100% lệnh chuyển tiền, sinh Ticket phê duyệt Admin. | **Thấp** (Đã kiểm soát) |
| **RSK-02** | **An Toàn Mạng / SSRF** | Bot bị điều khiển truy cập vào mạng nội bộ hoặc localhost (Server-Side Request Forgery). | Trung bình | Nghiêm trọng | **CAO** | `ToolGateway` tích hợp `ssrfProtection.js` kiểm tra và chặn đứng toàn bộ dải IP Private/Loopback trước khi gửi HTTP. | **Thấp** (Đã kiểm soát) |
| **RSK-03** | **Bịa Đặt Dữ Liệu (Hallucination)** | Bot tự ý bịa đặt giá sản phẩm ngoài catalog hoặc cam kết lợi nhuận cổ phiếu chứng khoán. | Cao | Nghiêm trọng | **CAO** | `SelfVerificationQualityGate` bắt buộc đối chiếu giá Catalog và tính VAT 10%. `MultiThreadEngine` khóa tư vấn cổ phiếu theo nguyên tắc an toàn. | **Rất thấp** (Đạt 100% ZHF) |
| **RSK-04** | **Phụ Thuộc Bên Thứ Ba** | Google Gemini API hoặc OpenAI gặp sự cố mất kết nối hoặc hết hạn mức (Quota Exceeded). | Trung bình | Vừa phải | **TRUNG BÌNH** | `ModelGateway` trang bị cơ chế tự động Fallback sang Local Cognitive Core và Rules Engine khi Cloud AI lỗi. | **Trung bình** |
| **RSK-05** | **Hiệu Năng / Khóa CSDL** | Tệp tin SQLite bị khóa ghi (`SQLITE_BUSY`) khi có hàng trăm kết nối đồng thời cùng ghi dữ liệu. | Trung bình | Vừa phải | **TRUNG BÌNH** | Đã bật chế độ `WAL Mode` (Write-Ahead Logging) cho phép đọc song song không chặn. Lộ trình Phase 2 chuyển PostgreSQL. | **Thấp** (Hiện tại) |
| **RSK-06** | **Tràn Bộ Nhớ / DoS** | Tin nhắn có kích thước khổng lồ hoặc người dùng spam làm sập tiến trình Node.js. | Thấp | Vừa phải | **TRUNG BÌNH** | Express giới hạn payload `limit: '8mb'`. `_stage1SanitizeInput` lọc sạch chuỗi điều khiển rác. Cần thêm Rate Limit IP. | **Thấp** |
| **RSK-07** | **Mất Phiên Hội Thoại Đa Cụm** | Khi mở rộng chạy nhiều máy chủ VPS (Cluster), bộ nhớ `_sessionPools` lưu trên RAM có thể bị lệch phiên giữa các node. | Thấp (chưa chạy cluster) | Vừa phải | **TRUNG BÌNH** | Hiện tại chạy đơn máy rất ổn định. Khi mở rộng multi-VPS, cần đưa session pool lên Redis. | **Thấp** |
| **RSK-08** | **Quyền Sở Hữu Trí Tuệ** | Tranh chấp bản quyền mã nguồn nếu không ký kết văn bản chuyển giao bản quyền với lập trình viên. | Thấp | Nghiêm trọng | **TRUNG BÌNH** | Chủ sở hữu cần hoàn tất Thỏa thuận phân định quyền SHTT (IP Assignment Agreement) giữa cá nhân và pháp nhân công ty. | **Thấp** |
| **RSK-09** | **Rò Rỉ Dữ Liệu Khách Hàng** | Người dùng hỏi lén thông tin của khách hàng khác hoặc can thiệp dữ liệu xuyên tenant. | Thấp | Nghiêm trọng | **CAO** | Toàn bộ truy vấn CSDL đều cô lập chặt chẽ theo `tenant_id`. Bảng kiểm toán `ai_security_audit_logs` giám sát 24/7. | **Rất thấp** |
| **RSK-10** | **Chậm Trễ Khi Mạng Chập Chờn** | Gọi công cụ ngoài qua mạng internet bị treo khiến người dùng chờ đợi quá lâu. | Cao | Thấp | **TRUNG BÌNH** | `ToolGateway` ép buộc giới hạn thời gian chạy (Timeout) đúng 5.000ms. Hết thời gian tự động ngắt và báo lỗi lịch sự. | **Rất thấp** |

---

### KẾT LUẬN QUẢN TRỊ RỦI RO
Toàn bộ các rủi ro có mức độ ảnh hưởng nghiêm trọng (chuyển tiền trái phép, tấn công SSRF, bịa đặt giá catalog) đều đã được hệ thống xử lý triệt để ngay ở tầng kiến trúc cốt lõi. Không có bất kỳ rủi ro chí mạng (Fatal Vulnerability) nào chưa có giải pháp kiểm soát.
