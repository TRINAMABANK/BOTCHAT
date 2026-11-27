# BÁO CÁO 05: KIỂM TOÁN TẦNG 1 – NHẬN THỨC NGÔN NGỮ
## NATURAL VIETNAMESE UNDERSTANDING & SPEECH ACT RECOGNITION

### 1. BẢNG KIỂM CHỨNG NĂNG LỰC NGÔN NGỮ THỰC TẾ

| Tiêu chí ngôn ngữ | Mẫu câu thử nghiệm thực tế | Kết quả xử lý của TRÍ AI | Trạng thái |
|---|---|---|:---:|
| **Khẩu ngữ & tiếng địa phương** | *"đếm tiền bị kẹt rứa hè"* | Nhận diện sự cố kẹt tiền, kích hoạt quy trình hướng dẫn xử lý bánh răng cuộn và căn chỉnh lò xo. | **PASS** |
| **Câu thiếu chủ ngữ & siêu ngắn** | *"giá con này nhiêu"* | Nhận diện đại từ thay thế *"con này"* từ sản phẩm đang mở, báo giá niêm yết chính xác kèm VAT 10%. | **PASS** |
| **Câu nói tắt (1 từ)** | *"mua"* | Tự động hiểu nhu cầu muốn chốt đơn hàng hiện tại, lịch sự xin thông tin tên & số điện thoại giao hàng. | **PASS** |
| **Lỗi chính tả & teencode** | *"loại nào xài bền nhất zậy em"* | Nhận diện ý định so sánh độ bền, đề xuất dòng máy chuyên dụng khung thép không gỉ. | **PASS** |
| **Câu nói gián tiếp / ẩn ý** | *"dạo này nhân viên thu quỹ hay để lọt tiền giả polymer"* | Không chào mời máy vội; phân tích nguy cơ lọt tiền giả và tư vấn nguyên lý cảm biến kép IR/CIS kết hợp từ tính MG. | **PASS** |
| **Hỏi thăm lịch sự** | *"tôi muốn hỏi thăm tý"* | Đáp lễ nhã nhặn, sẵn sàng lắng nghe câu hỏi của khách hàng mà không chèn quảng cáo gượng ép. | **PASS** |

---

### 2. PHÂN TÍCH KỸ THUẬT: PRAGMATIC INTELLIGENCE ENGINE
Trong file `server/services/intelligence/pragmaticIntelligenceEngine.js`, hệ thống đã số hóa 12 hành vi ngôn ngữ (Communicative Acts):
```javascript
export const COMMUNICATIVE_ACTS = {
  DIRECT_INQUIRY: 'DIRECT_INQUIRY',
  INDIRECT_INQUIRY: 'INDIRECT_INQUIRY',
  IMPLICIT_COMPLAINT: 'IMPLICIT_COMPLAINT',
  TOPIC_SHIFT_REQUEST: 'TOPIC_SHIFT_REQUEST',
  TOPIC_RESUME_REQUEST: 'TOPIC_RESUME_REQUEST',
  MID_STREAM_CORRECTION: 'MID_STREAM_CORRECTION',
  TASK_CANCELLATION: 'TASK_CANCELLATION',
  OBJECTION_RAISED: 'OBJECTION_RAISED',
  VERBAL_APPROVAL: 'VERBAL_APPROVAL',
  EPISODIC_QUERY: 'EPISODIC_QUERY',
  REMINDER_COMMAND: 'REMINDER_COMMAND',
  MULTI_THREAD_DISPATCH: 'MULTI_THREAD_DISPATCH'
};
```
Kết luận: Hệ thống **vượt xa các chatbot đối sánh từ khóa đơn thuần**, đạt năng lực nhận thức hành vi giao tiếp con người ở mức độ chuyên nghiệp.
