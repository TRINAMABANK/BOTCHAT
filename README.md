# 🤖 TRÍ AI HUMANOID SALES INTERFACE (PROMPT 08)
> **Giao diện Robot AI Bán Hàng Hai Cột Độc Lập Kết Nối AI Sales Engine Hợp Nhất**  
> **Nền tảng:** TRÍ AI SaaS Enterprise • Bán hàng đỉnh cao  
> **Phiên bản:** V1.0.0 (Release 2027)

---

## 🌟 TỔNG QUAN HỆ THỐNG

Dự án hiện thực hóa trọn vẹn yêu cầu **PROMPT 08** của hệ thống **TRÍ AI SALES BOT**:
Xây dựng giao diện bán hàng AI hiện đại gồm **hai cột độc lập** nhưng được kết nối và đồng bộ thời gian thực vào cùng một **AI Sales Engine** và cơ sở dữ liệu dùng chung (Unified Platform Database).

```
+---------------------------------------------------------------------------------------+
|                           TRÍ AI HUMANOID SALES PLATFORM                              |
|                       http://localhost:5000 (Unified Engine)                          |
+-------------------------------------------+-------------------------------------------+
| [CỘT 1] HUMANOID AI ROBOT & CHAT          | [CỘT 2] PRODUCT SELECTOR (4 CẤP)          |
| 1. Nhân vật Robot 3D Canvas WebGL (60fps) | 1. Lĩnh vực (Trà Đôi Dép, AI, BĐS...)     |
|    - Idle, Listening, Thinking, Speaking, | 2. Nhóm sản phẩm                          |
|      Success, Error                       | 3. Sản phẩm cụ thể (Ảnh, Thông số, Giá)   |
|    - 4 Archetypes: Valkyrie, Tron, Sphere | 4. Nhu cầu mua hàng (6 Action Buttons):   |
| 2. Cửa sổ Chat Streaming thời gian thực   |    - Tìm hiểu • Hỏi giá • So sánh         |
|    - Hiệu ứng gõ cuộn tự nhiên            |    - Yêu cầu báo giá • Đặt mua • Liên hệ  |
|    - Dấu hiệu AI đang suy nghĩ            | => Tự động đưa Context vào Chat hiện tại  |
|    - Kịch bản chuẩn: "Tôi là trợ lý..."   |    Không làm mất lịch sử hội thoại        |
+-------------------------------------------+-------------------------------------------+
| [CRM INTEGRATION] Bảng Leads (11 Trường: Name, Phone, Email, Consent, Status...)      |
| [OWNER DASHBOARD] Thống kê tỷ lệ chuyển đổi, Khách mới, Chờ gọi, Lịch sử chat, v.v.   |
| [ADMIN SETTINGS] Đổi Robot, Lời chào, Tên chủ nhân, Giọng điệu, Hotline, v.v.         |
+---------------------------------------------------------------------------------------+
```

---

## 📋 CHI TIẾT TÍNH NĂNG THEO YÊU CẦU PROMPT 08

### I. CỘT 1 – HUMANOID AI ROBOT
- **Robot hình người 3D Canvas/WebGL:** Thiết kế hiện đại, thân thiện, chạy mượt mà 60 FPS, không gây lag hay quá nhiệt thiết bị.
- **Đầy đủ 6 trạng thái nghiệp vụ:**
  - `Idle`: Chuyển động nhẹ nhàng (nhịp thở, chớp mắt, hào quang halo xoay quanh).
  - `Listening`: Nghiêng đầu lắng nghe, sóng radar cyan quét dữ liệu.
  - `Thinking`: Vòng xoay dữ liệu holographic tím, hiệu ứng giải mã neural.
  - `Speaking`: Equalizer âm thanh nhảy theo giọng nói, hào quang vàng hổ phách.
  - `Success`: Pháo hoa particle màu xanh ngọc lục bảo (Emerald) khi lưu Lead thành công.
  - `Error`: Cảnh báo đỏ ruby dịu nhẹ khi kết nối gián đoạn.
- **Cửa sổ hội thoại Streaming:**
  - Nội dung AI phản hồi xuất hiện dạng streaming từng từ tự nhiên.
  - Chữ chạy cuộn từ dưới lên mượt mà.
  - Tự động cuộn theo tin nhắn mới nhất, nhưng khách có thể cuộn ngược lên xem lịch sử mà không bị giật màn hình.
  - Nút "Làm mới hội thoại" để xóa hoặc bắt đầu phiên mới theo chính sách lưu trữ.

### II. CỘT 2 – PRODUCT SELECTOR (4 CẤP)
Phân cấp dữ liệu chuẩn:
1. **Lĩnh vực:** *Trà Thượng Hạng Đôi Dép*, *Giải Pháp AI & Nền Tảng Công Nghệ*, *Bất Động Sản & Nghỉ Dưỡng Hạng Sang*.
2. **Nhóm sản phẩm:** *Trà Oolong*, *Hoàng Trà*, *Hắc Trà*, *Bộ Quà Tặng*, v.v.
3. **Sản phẩm cụ thể:** Hiển thị ảnh chất lượng cao, tên, thông số kỹ thuật (specs), và giá bán đã được Quản trị viên phê duyệt.
4. **Nhu cầu mua hàng (6 lựa chọn tức thì):**
   - 🔍 *Tìm hiểu sản phẩm*
   - 💰 *Hỏi giá & Ưu đãi*
   - ⚖️ *So sánh*
   - 📋 *Yêu cầu báo giá*
   - 🛒 *Đặt mua*
   - 📞 *Yêu cầu chủ nhân liên hệ*
- **Tương tác thông minh:** Khi bấm bất kỳ nhu cầu nào, toàn bộ thông tin sản phẩm và mong muốn của khách lập tức được gửi vào phiên chat hiện tại; AI Sales Robot tự động hiểu và tư vấn ngay mà không tạo phiên chat mới.

### III. KỊCH BẢN CHỦ NHÂN CHUẨN MỰC
- **Tên chatbot mặc định:** `TRÍ AI SALES ROBOT`
- **Cách xưng hô:** `"Tôi là trợ lý bán hàng của chủ nhân."`
- **Khi khách hỏi số điện thoại chủ nhân:**
  > *"Tôi có thể ghi nhận yêu cầu để chủ nhân trực tiếp liên hệ với anh/chị. Anh/chị vui lòng để lại số điện thoại nhé."*
- **Khi khách muốn mua:**
  - Xác nhận tên sản phẩm.
  - Hỏi số lượng dự kiến.
  - Ghi nhận yêu cầu.
  - Xin họ tên và số điện thoại.
  - Xin sự đồng ý cho chủ nhân liên hệ trực tiếp.
  - Tự động tạo Lead vào CRM và thông báo thành công.
  - **Quy tắc bảo vệ:** Tuyệt đối không tự ý tạo đơn hàng đã thanh toán hay xác nhận tồn kho nếu chưa có tích hợp thực tế.

### IV. CRM INTEGRATION (11 TRƯỜNG BẮT BUỘC)
Mỗi Lead được lưu trữ tự động trong bảng `leads` của SQLite với các trường:
1. `customer_name`: Họ tên khách hàng
2. `phone`: Số điện thoại
3. `email`: Địa chỉ email (nếu có)
4. `product_id`: Mã sản phẩm quan tâm
5. `quantity`: Số lượng dự kiến
6. `customer_requirement`: Nhu cầu mua hàng
7. `conversation_id`: ID phiên hội thoại để tra cứu lại nội dung chat
8. `website_source`: Nguồn website truy cập
9. `widget_id`: ID widget hiển thị
10. `consent_to_contact`: Sự đồng ý cho chủ nhân liên hệ (`1`: Có, `0`: Không)
11. `created_time`: Thời điểm tạo
12. `lead_status`: Trạng thái mặc định: **`NEW – WAITING FOR OWNER CONTACT`**

### V. OWNER DASHBOARD (BẢNG QUẢN TRỊ CHỦ NHÂN)
- KPI Cards: Khách mới, Khách đang chờ gọi, Khách đã liên hệ, Khách quan tâm cao, Danh sách yêu cầu báo giá, Danh sách yêu cầu mua.
- **Thống kê tỷ lệ chuyển đổi (Conversion Rate %)** tính toán thời gian thực.
- Xem toàn bộ **lịch sử hội thoại gốc** của từng khách với Robot trước khi chủ nhân gọi điện.
- Nút gọi nhanh `tel:...` và chat nhanh qua `Zalo`.

### VI. MOBILE RESPONSIVE
- **Trên máy tính:** Hai cột độc lập song song trực quan.
- **Trên điện thoại:** Ưu tiên hiển thị Robot 3D và khung hội thoại; khu vực chọn sản phẩm chuyển thành nút nổi và bottom panel trượt lên mượt mà, thao tác dễ dàng mà không làm mất lịch sử chat.

### VII. QUẢN TRỊ CẤU HÌNH (ADMIN SETTINGS)
- Thay đổi 4 mô hình Robot 3D: *Cyber Valkyrie, Tron Humanoid, Quantum Sphere, Nano Sentinel*.
- Thay ảnh đại diện avatar robot.
- Thay lời chào mở đầu.
- Thay tên chủ nhân (mặc định: *Quang Nhựt Trí*).
- Chọn giọng điệu AI (Thân thiện, VIP, Năng động...).
- Thêm lĩnh vực và thêm sản phẩm vào Product Center.
- Cấu hình lời mời để lại số điện thoại.
- Cấu hình email nhận thông báo Lead mới.
- Bật/tắt công khai số hotline.

### VIII. YÊU CẦU CHẤT LƯỢNG & TÍCH HỢP HỆ THỐNG
- **Dùng chung Database:** Kết nối trực tiếp vào file SQLite `triai.db` tại `D:\09- LAM APP KIEM TIEN\LAM PHAN MEM APP AI BAN\tri-ai-v1\tri-ai-v1\.data\triai.db`, không tạo cơ sở dữ liệu trùng lặp.
- **Bảo mật:** Validate định dạng số điện thoại Việt Nam, chống SQL Injection, lưu bằng chứng Consent (sự đồng ý), không spam quảng cáo tự động.

---

## 🚀 HƯỚNG DẪN KHỞI CHẠY HỆ THỐNG

### Cách 1: Khởi chạy 1 chạm bằng File .bat (Khuyến nghị cho Windows)
Chỉ cần nhấp đúp vào file:
```
CHAY_APP.bat
```
Hệ thống sẽ tự động bật trình duyệt và truy cập: **`http://localhost:5000`**

### Cách 2: Khởi chạy bằng lệnh qua Terminal
```bash
# Di chuyển vào thư mục dự án
cd "d:\09- LAM APP KIEM TIEN\2027 LAM CHATBOT BAN HANG"

# Khởi chạy server fullstack (kết nối trực tiếp DB chung)
npm start
```

---

## 🛠️ DANH SÁCH API ENDPOINTS

| Phương thức | Đường dẫn API | Mô tả nghiệp vụ |
|---|---|---|
| `GET` | `/api/health` | Kiểm tra tình trạng server & kết nối SQLite |
| `GET` | `/api/products` | Lấy danh mục sản phẩm 4 cấp phân loại |
| `POST` | `/api/products` | Thêm sản phẩm mới (Admin phê duyệt giá) |
| `POST` | `/api/chat/message` | Gửi tin nhắn và tiếp nhận context từ Cột 2 |
| `GET` | `/api/chat/stream` | Stream phản hồi chữ chạy thời gian thực (SSE) |
| `GET` | `/api/chat/conversations/:id` | Lấy lịch sử tin nhắn của phiên chat |
| `DELETE` | `/api/chat/conversations/:id` | Xóa/Làm mới phiên chat theo chính sách |
| `GET` | `/api/crm/leads` | Danh sách Lead cho Owner Dashboard (lọc trạng thái) |
| `POST` | `/api/leads` | Tạo Lead mới vào CRM kèm Consent |
| `PUT` | `/api/crm/leads/:id/status` | Cập nhật trạng thái Lead (Đã gọi, Chốt đơn...) |
| `GET` | `/api/crm/stats` | Thống kê số lượng Lead và tỷ lệ chuyển đổi |
| `GET` | `/api/settings` | Lấy cấu hình hệ thống & nhân vật robot |
| `PUT` | `/api/settings` | Cập nhật cấu hình quản trị |

---

*Hệ thống đã được kiểm thử thực tế và sẵn sàng vận hành sản xuất 24/7.*
