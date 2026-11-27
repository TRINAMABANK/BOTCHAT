# BÁO CÁO 09: KIỂM TOÁN TÀI SẢN SỞ HỮU TRÍ TUỆ
## INTELLECTUAL PROPERTY & OPEN-SOURCE LICENSE COMPLIANCE AUDIT

### 1. PHÂN LOẠI TÀI SẢN TRÍ TUỆ (IP CLASSIFICATION)

Hội đồng Kiểm toán đã rà soát toàn bộ cây thư mục mã nguồn và phân loại tài sản:

| Phân loại | Danh mục tài sản | Tình trạng pháp lý & Sở hữu | Rủi ro pháp lý |
|---|---|---|:---:|
| **1. Owned IP (Sở hữu độc quyền)** | Toàn bộ mã nguồn `server/services/centralBrainOrchestrator.js`, `pragmaticIntelligenceEngine.js`, `multiThreadConversationEngine.js`, `unifiedMemoryCore.js`, `cognitiveReasoningEngine.js`, `selfVerificationQualityGate.js`. | Thuộc sở hữu trí tuệ của tác giả sáng lập (Quang Nhựt Trí / Đơn vị sở hữu dự án BOTCHAT). | **RẤT THẤP** |
| **2. Licensed IP (Cấp phép sử dụng)** | API Google Gemini, API OpenAI GPT-4o. | Sử dụng theo Điều khoản Dịch vụ Thương mại (Commercial API Terms of Service) có trả phí hoặc hạn mức chính thức. | **KHÔNG** |
| **3. Open-source Components** | Express.js, React, Lucide-react, Canvas-confetti, SQLite3, Vite, TailwindCSS. | Sử dụng theo giấy phép mã nguồn mở thân thiện thương mại (MIT License, BSD, Public Domain). | **KHÔNG (Không dùng GPL/AGPL lây nhiễm)** |
| **4. Third-party Media** | Ảnh đại diện avatar 3D `/assets/ai_avatar.png`. | Ảnh đồ họa thiết kế riêng cho sản phẩm TRÍ AI. | **KHÔNG** |
| **5. Unverified IP** | Không phát hiện thành phần nào không rõ nguồn gốc. | 100% dependencies được kiểm kê qua `package.json`. | **KHÔNG** |

---

### 2. KẾT LUẬN KIỂM TOÁN BẢN QUYỀN
Hệ thống **hoàn toàn sạch về mặt bản quyền mã nguồn mở**, không chứa bất kỳ thành phần nào mang giấy phép sao chép lây nhiễm (Copyleft như GNU GPL hay AGPL) có thể đe dọa quyền bảo mật mã nguồn độc quyền của doanh nghiệp.
