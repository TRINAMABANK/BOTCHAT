# MA TRẬN BẢO TOÀN VÀ TƯƠNG THÍCH CHỨC NĂNG (COMPATIBILITY MATRIX)
## TÀI LIỆU 07 – BOTCHAT BRAIN 2.1 AUDIT & ARCHITECTURE DESIGN

> **Dự án:** BOTCHAT  
> **Cam kết:** BẢO VỆ 100% CÁC TÍNH NĂNG ĐANG VẬN HÀNH.  
> **Nguyên tắc:** Tuyệt đối không xóa, không đổi tên các API endpoint, không làm thay đổi cấu trúc bảng Database runtime.

---

## 1. MA TRẬN 20 TÍNH NĂNG HIỆN HỮU VÀ PHƯƠNG ÁN BẢO TOÀN

| STT | Chức năng Hiện tại | File / API Liên quan | Hành vi Hiện tại | Thay đổi Dự kiến trong Brain 2.1 | Nguy cơ Ảnh hưởng | Regression Test Bắt buộc |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Chat Giao tiếp thời gian thực** | `POST /api/chat/message`<br>`GET /api/chat/stream` | Nhận tin nhắn, trả lời text hoặc stream SSE từng ký tự. | Giữ nguyên 100% định dạng JSON & SSE Protocol. | Thấp | Test gửi tin nhắn đơn & SSE stream gõ chữ. |
| **2** | **Robot Humanoid 3D Valkyrie** | `src/components/HumanoidRobot3D.jsx` | Hiển thị mô hình 3D, cử động môi khi nói, đổi trạng thái. | Giữ nguyên logic hoạt họa, nhận sự kiện qua State/Props. | Không | Kiểm tra visual giao diện 3D không bị giật lag. |
| **3** | **Giao diện Hai Cột (Two-Column)** | `src/App.jsx`<br>`src/components/ChatStreamWindow.jsx` | Cột 1 chat, Cột 2 tự động mở khi có gợi ý sản phẩm. | Giữ nguyên cơ chế `revealCatalog` và cờ thu gọn Cột 2 khi đặt hàng. | Thấp | Test mở Cột 2 khi hỏi sản phẩm & đóng khi chốt đơn. |
| **4** | **Trợ lý Giọng nói (STT & TTS)** | `src/utils/speech.js`<br>`voiceRecognition.js` | Ghi âm giọng nói chuyển thành văn bản và đọc phản hồi. | Giữ nguyên Web Speech API. | Không | Test ghi âm nút Mic và phát âm thanh đọc lại. |
| **5** | **Product Selector & Bộ lọc** | `src/components/ProductSelector.jsx` | Hiển thị danh mục sản phẩm, bộ lọc theo lĩnh vực (`field`). | Giữ nguyên truy vấn SQLite và truyền props. | Không | Test bấm lọc các danh mục tại Cột 2. |
| **6** | **Modal Chi tiết Sản phẩm** | `src/components/ProductDetailModal.jsx` | Xem chi tiết thông số kỹ thuật, bảo hành, ảnh sản phẩm. | Giữ nguyên quy tắc: Đồ ăn/uống không hiển thị badge "Bảo hành 24 tháng". | Không | Test mở modal trà Hoàng Tỳ Nhật Minh & máy in Brother. |
| **7** | **Động cơ Bán hàng (Sales Engine)** | `server/salesEngine.js`<br>`server/adapters/salesEngineAdapter.js` | Xử lý tư vấn, kiểm tra tồn kho, đối chiếu 3 tier sản phẩm. | Giữ nguyên mã nguồn; chỉ kích hoạt khi Intent là thương mại. | Thấp | Test 10 kịch bản mua sắm, so sánh, hỏi thông số. |
| **8** | **Kho Hàng Nhà Cung Cấp (Crawler)** | `server/services/quotationService.js`<br>`crawled_products` | Tra cứu sản phẩm đã thu thập từ web nhà cung cấp đối tác. | Giữ nguyên logic tìm kiếm `searchSupplierCatalog`. | Không | Test tra cứu kho đối tác đã duyệt. |
| **9** | **Lập Báo Giá Chuẩn Doanh nghiệp** | `generate_formal_quotation`<br>`QuotationService.createQuotation` | Xuất bảng báo giá có mã BG, đơn giá, SL, VAT 10%. | Giữ nguyên thuật toán tính toán và định dạng bảng Markdown. | Không | Test lập báo giá 3 máy in Brother HL-L6210DW. |
| **10** | **Quy trình Đặt Hàng 7 Bước** | `SalesEngine.handleOrderStep`<br>`orders`, `order_items` | Thu thập Tên -> SĐT -> Địa chỉ -> Chốt đơn. | Giữ nguyên quy trình từng bước, tự động thu gọn Cột 2. | Thấp | Test hoàn tất 1 đơn hàng qua chat. |
| **11** | **CRM Ghi nhận Leads Khách hàng** | `leads`, `lead_activities` | Tự động tạo lead khi khách để lại SĐT hoặc đặt hàng. | Giữ nguyên cấu trúc bảng và hàm `createLeadFromChat`. | Không | Test nhập SĐT "0982441446" và kiểm tra DB leads. |
| **12** | **Tra cứu Tài liệu Nội bộ (RAG)** | `server/services/ragService.js`<br>`POST /api/knowledge/search` | Tra cứu văn bản quy chế ngân hàng, dẫn link trích dẫn. | Giữ nguyên SQLite FTS / LIKE search và nhãn trích dẫn. | Thấp | Test hỏi quy chế điều chuyển tài sản Nam A Bank. |
| **13** | **Tải lên & Xử lý File (Upload)** | `server/routes/knowledgeRoutes.js`<br>`pdf-parse`, `mammoth`, `xlsx` | Tải file PDF, DOCX, XLSX vào kho tri thức. | Giữ nguyên các route upload và parser. | Không | Test upload file văn bản và file Excel mẫu. |
| **14** | **Phân tích Bảng tính (Excel Query)** | `server/services/parsers/excelParser.js`<br>`query_excel_data` | Đọc cấu trúc sheet, trích xuất dòng, tính toán số liệu. | Giữ nguyên cấu trúc `document_sheets`, `document_rows`. | Không | Test hỏi tổng cộng doanh thu bảng tính. |
| **15** | **Tìm kiếm Internet (Web Search)** | `server/services/webSearchService.js`<br>`search_web_internet` | Tìm kiếm tin tức bên ngoài, loại bỏ link DuckDuckGo rác. | Giữ nguyên bộ lọc link và cơ chế trích dẫn. | Không | Test hỏi tin tức thời sự/thời tiết. |
| **16** | **Trích xuất Web Trực tiếp** | `server/services/intelligence/liveWebsiteRetrieval.js` | Cào dữ liệu theo thời gian thực từ URL web sản phẩm. | Giữ nguyên HTTP client và bộ bóc tách Cheerio. | Không | Test cào thông tin sản phẩm từ link trực tiếp. |
| **17** | **Trí nhớ Khách hàng (Memory)** | `server/services/intelligence/memoryEngine.js`<br>`ai_customer_memory` | Ghi nhớ Tên, SĐT, ngân sách; lệnh quên thông tin. | Giữ nguyên hàm `rememberCustomerFact` & `forgetCustomer`. | Không | Test ghi nhớ SĐT và lệnh "Quên thông tin của tôi". |
| **18** | **Trung tâm Tri thức (Learning Center)** | `server/routes/learningRoutes.js`<br>`learning_knowledge_entries` | Ghi nhận câu hỏi chưa có lời đáp, duyệt tri thức mới. | Giữ nguyên quy trình Auto-Learning và bảng audit log. | Không | Test phát hiện gap sản phẩm thiếu và duyệt tri thức. |
| **19** | **Bảng Quản trị & Cài đặt (Admin)** | `server/routes/centralBrainRoutes.js`<br>`bot_settings` | Bật/tắt công cụ, xem viễn thám latency, cấu hình API Key. | Giữ nguyên toàn bộ endpoints quản trị và telemetry. | Không | Test gọi `/api/central-brain/status`. |
| **20** | **Bảo mật & Phân quyền (Security)** | `server/middleware/authMiddleware.js` | Kiểm tra quyền Admin (`requireAdmin`), chống can thiệp. | Giữ nguyên các middleware bảo vệ token/cookie. | Không | Test gọi API Admin khi không có token (bị từ chối 401). |

---

## 2. KẾ HOẠCH BẢO VỆ CHỐNG HỒI QUY (ZERO-REGRESSION GUARANTEE)

1. **Cam kết không xóa bất kỳ API công khai nào:**
   - Các API `/api/chat/message`, `/api/chat/stream`, `/api/health`, `/api/settings`, `/api/knowledge/*`, `/api/learning-center/*`, `/api/central-brain/*` được cam kết giữ nguyên 100% chữ ký (Signature) và cấu trúc Request/Response.
2. **Kế thừa hoàn toàn cơ sở dữ liệu SQLite (`data/triai.db`):**
   - Không thực hiện bất kỳ lệnh `DROP TABLE`, `ALTER TABLE ... DROP COLUMN` nào trên 66 bảng đang hoạt động.
3. **Bộ hồi quy tự động:**
   - Mọi bản nâng cấp bắt buộc phải chạy qua Suite hồi quy 100 kịch bản trước khi được phép xem xét sáp nhập (Merge).
