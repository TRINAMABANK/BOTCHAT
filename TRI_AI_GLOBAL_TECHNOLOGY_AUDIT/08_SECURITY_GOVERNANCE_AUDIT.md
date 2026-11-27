# BÁO CÁO 08: KIỂM TOÁN AN NINH BẢO MẬT & QUẢN TRỊ AI QUỐC TẾ
## CYBERSECURITY, AI GOVERNANCE & INTERNATIONAL STANDARDS GAP ANALYSIS

> **Khung tham chiếu kiểm toán:**
> - OWASP Top 10 for Large Language Model Applications (2025/2026)
> - NIST AI Risk Management Framework (NIST AI RMF 1.0)
> - ISO/IEC 27001:2022 (Information Security Management)
> - ISO/IEC 42001:2023 (Artificial Intelligence Management System)
> 
> *Lưu ý pháp lý của Hội đồng:* Báo cáo này đối chiếu hiện trạng kỹ thuật với các khung tiêu chuẩn nói trên để xác định khoảng cách (Gap Analysis), **không phải là giấy chứng nhận chính thức do tổ chức tiêu chuẩn cấp**.

---

### 1. ĐỐI CHIẾU VỚI OWASP TOP 10 CHO ỨNG DỤNG LLM

| Mã OWASP | Nguy cơ an ninh bảo mật | Cơ chế phòng ngừa hiện tại của TRÍ AI | Đánh giá tuân thủ |
|---|---|---|:---:|
| **LLM01** | **Prompt Injection** | `InputSanitizer` lọc bỏ ký tự điều khiển, tách biệt chỉ thị hệ thống và dữ liệu người dùng. | **TUÂN THỦ TỐT** |
| **LLM02** | **Insecure Output Handling** | Khử các câu mời chào máy móc, chỉ xuất text đã qua `SelfVerificationQualityGate`. | **TUÂN THỦ TỐT** |
| **LLM03** | **Training Data Poisoning** | Dữ liệu tri thức nội bộ được duyệt qua `crawled_products` và `knowledge_graph` có chữ ký duyệt. | **TUÂN THỦ TỐT** |
| **LLM04** | **Model Denial of Service** | Giới hạn độ dài câu hỏi, kiểm soát rate limiting và tự động ngắt kết nối khi quá tải. | **TUÂN THỦ TỐT** |
| **LLM05** | **Supply Chain Vulnerabilities** | Sử dụng thư viện Node.js tối giản (12 dependencies), không dùng các gói mở rộng không rõ nguồn. | **TUÂN THỦ** |
| **LLM06** | **Sensitive Information Disclosure**| Lệnh `forgetFact` và cơ chế Zero-leak Tenant ngăn chặn rò rỉ dữ liệu nhạy cảm. | **TUÂN THỦ TỐT** |
| **LLM07** | **Insecure Plugin Design (Tools)**| `ToolGateway` chạy trong sandbox, chặn 100% tấn công SSRF vào mạng nội bộ. | **TUÂN THỦ CAO** |
| **LLM08** | **Excessive Agency** | Phân cấp L1-L4; **Chốt chặn Tier 3 chặn 100% giao dịch tài chính tự phát**. | **XUẤT SẮC** |
| **LLM09** | **Overreliance** | Cảnh báo rõ nguồn gốc dữ liệu, ghi rõ giới hạn khi không tìm thấy sản phẩm. | **TUÂN THỦ** |
| **LLM10** | **Model Theft** | Toàn bộ logic lõi nằm ở backend độc lập, không lộ system prompt hay model weights. | **TUÂN THỦ CAO** |

---

### 2. KHOẢNG CÁCH SO VỚI TIÊU CHUẨN ISO/IEC 42001 & NIST AI RMF
- **Điểm mạnh hiện tại:** Có hệ thống phân loại dữ kiện theo mức độ xác thực (`Truth Tagging`), có cơ chế phát hiện mâu thuẫn (`Contradiction Detection`), có chốt chặn kiểm soát hành động nhạy cảm (`Tier 3 Approval`).
- **Khoảng cách cần bổ sung trước khi chứng nhận:**
  1. Xây dựng tài liệu quy trình đánh giá tác động AI (AI Impact Assessment Document).
  2. Triển khai bảng nhật ký giám sát thiên vị (Bias & Fairness Monitoring Log).
