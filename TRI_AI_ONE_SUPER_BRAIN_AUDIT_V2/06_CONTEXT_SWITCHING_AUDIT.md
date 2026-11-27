# BÁO CÁO 06: KIỂM THỬ CHUYỂN CẢNH HỘI THOẠI & ĐỒNG THAM CHIẾU
## CONVERSATIONAL CONTEXT SWITCHING & CO-REFERENCE RESOLUTION

### 1. KIỂM THỬ 20 TÌNH HUỐNG CHUYỂN CẢNH BẮT BUỘC

Hội đồng Kiểm toán đã chạy độc lập toàn bộ 20 tình huống hội thoại chuyển cảnh bắt buộc trong mục VI:

| STT | Kịch bản chuyển cảnh | Đầu vào thực tế | Hành vi của AI | Kết quả |
|:---:|---|---|---|:---:|
| 1 | Máy đếm tiền ➔ Thời tiết | *"Thời tiết Hà Nội mai có mưa ko?"* | Trả lời thông tin thời tiết chuẩn, đóng băng tiến trình máy đếm tiền vào Goal Stack. | **PASS** |
| 2 | Thời tiết ➔ Máy đếm tiền | *"Quay lại chuyện lúc nãy, phương án trước thì sao?"* | Tự động Pop Goal từ Stack, khôi phục báo giá máy đếm tiền liền mạch. | **PASS** |
| 3 | Báo giá ➔ Kỹ thuật | *"Cảm biến CIS quét tiền giả như thế nào?"* | Tạm ngưng chốt đơn, giải thích cặn kẽ nguyên lý cảm biến hình ảnh tiếp xúc đa phổ. | **PASS** |
| 4 | Dự án A ➔ Dự án B | *"Chuyển qua dự án trang bị 20 máy cho chi nhánh HCM"* | Cập nhật Working Context sang phạm vi dự án mới, không bị lẫn thông số dự án cũ. | **PASS** |
| 5 | Dự án B ➔ Dự án A | *"Thế dự án bên Hà Nội hôm qua chốt loại nào?"* | Truy vấn Episodic Memory trả về đúng dòng máy XINDA của dự án Hà Nội. | **PASS** |
| 6 | 3 chủ đề song song | Gọi lại chủ đề 1 trong danh sách | Tra cứu Thread State tương ứng và tiếp tục thảo luận chuẩn xác. | **PASS** |
| 7 | Đại từ thay thế | *"Cái đó có tốt không?"* | Nhận diện *"cái đó"* là máy vừa được nhắc ở lượt trước (Co-reference Engine). | **PASS** |
| 8 | Yêu cầu mở rộng | *"Còn loại nào khác?"* | Lấy danh mục sản phẩm cùng phân khúc và tính năng từ Database để đề xuất. | **PASS** |
| 9 | Phủ định hiểu lầm | *"Không phải ý anh"* | Tự điều chỉnh, hạ điểm tự tin, hỏi lại mục tiêu chính xác của người dùng. | **PASS** |
| 10 | Quay lại chủ đề cũ | *"Quay lại chuyện lúc nãy"* | Đọc lại Lịch sử hội thoại và khôi phục chủ đề liền kề trước đó. | **PASS** |
| 11 | So sánh phương án | *"Vậy phương án trước thì sao?"* | So sánh đối chiếu giữa giải pháp vừa nêu và giải pháp đã trao đổi trước. | **PASS** |
| 12 | Đổi quyết định | *"Thôi anh đổi ý lấy con cao cấp hơn"* | Cập nhật giỏ hàng/báo giá sang dòng máy cao cấp hơn ngay lập tức. | **PASS** |
| 13 | Mâu thuẫn thông tin | Đưa thông tin đối lập với lượt trước | Phát hiện mâu thuẫn (Contradiction Detection), hỏi xác nhận dữ liệu chuẩn. | **PASS** |
| 14 | Bổ sung chi tiết | Khách bổ sung *"lấy thêm 2 cuộn băng keo"* | Nhận diện ngữ cảnh và thêm hạng mục phụ kiện vào danh sách báo giá. | **PASS** |
| 15 | Câu hỏi ➔ Hành động | *"Lập báo giá gửi anh luôn"* | Kích hoạt QuotationService sinh mã báo giá kèm thuế VAT 10%. | **PASS** |
| 16 | Nói bóng gió | *"Có con nào đếm được cả tiền polymer lẫn ngoại tệ không?"* | Đề xuất ngay dòng máy đa tiền tệ (GLORY GFS-120). | **PASS** |
| 17 | Đại từ qua nhiều lượt | *"Nó"*, *"chiếc này"*, *"con đó"* liên tiếp | Duy trì Active Product Context ổn định qua 5 lượt thoại liên tiếp. | **PASS** |
| 18 | Liên quan 2 chủ đề | *"Máy này chạy trời mưa ẩm ở miền Bắc có dễ chập không?"* | Kết hợp kiến thức thiết bị và yếu tố thời tiết/độ ẩm để đưa lời khuyên bảo quản. | **PASS** |
| 19 | Quay lại sau nhiều lượt | Hỏi lại về dự án sau 15 lượt đàm thoại khác | Truy xuất dữ liệu từ Long-Term Memory chính xác không sai lệch. | **PASS** |
| 20 | Sửa đổi thông tin | *"Sửa lại địa chỉ giao hàng là số 12 Lê Duẩn"* | Cập nhật thuộc tính địa chỉ trong CRM Lead mà không tạo khách hàng trùng lặp. | **PASS** |

---

### 2. KẾT LUẬN VỀ KHẢ NĂNG CHUYỂN CẢNH
Hệ thống xử lý mượt mà, tự nhiên và chính xác 100% các tình huống chuyển cảnh phức tạp nhờ cơ chế kết hợp giữa **Pragmatic Intelligence Engine**, **ActiveProductContext** và **MultiThreadConversationEngine**.
