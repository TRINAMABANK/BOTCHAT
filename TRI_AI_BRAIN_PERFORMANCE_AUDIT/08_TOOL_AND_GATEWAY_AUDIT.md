# BÁO CÁO KIỂM TOÁN CỔNG CÔNG CỤ & MÔ HÌNH (TOOL & GATEWAY AUDIT)
# TRÍ AI ONE SUPER BRAIN — MODEL GATEWAY, TOOL DISPATCH & SSRF AUDIT

> **Repository:** `https://github.com/TRINAMABANK/BOTCHAT` | **Branch:** `main`  
> **Commit SHA:** `65cff35063ccba4703a640a839b83104ef7d64fc`  
> **Kiểm toán viên:** Enterprise AI Integration Architect & Cybersecurity Specialist  

---

## 1. MỤC TIÊU VÀ TIÊU CHUẨN KIỂM TOÁN CỔNG ĐIỀU PHỐI

Kiểm toán toàn bộ cơ chế giao tiếp giữa Central Brain với:
1. **Các mô hình ngôn ngữ lớn (LLM Gateway):** Phân luồng thông minh theo độ phức tạp bài toán (Gemini 2.5 Pro vs Gemini 2.5 Flash vs Local Engine).
2. **Cổng công cụ an toàn (Tool Gateway):** Kiểm tra cơ chế Sandbox, Timeout giới hạn 5 giây, bảo vệ chống tấn công SSRF (Server-Side Request Forgery) và xác thực đầu vào.
3. **Các bộ chuyển đổi công cụ thực tế (Adapters):** SalesEngineAdapter, QuotationService, WeatherService, RAG Hybrid Search, Excel Parser, Web Search.

---

## 2. PHÁT HIỆN KIẾN TRÚC ĐỘC LẬP: CÁC MODULE GATEWAY BỊ "CÔ LẬP" (NOT CONNECTED)

Đoàn kiểm toán phát hiện một sự đứt gãy kiến trúc nghiêm trọng trong thiết kế Gateway:

### A. Sự cô lập của `ModelGateway` (`server/services/gateway/modelGateway.js`)
- **Thiết kế dự định:**  
  File được lập trình hoàn chỉnh với 3 cấp độ:
  - `TIER_PRO` (`gemini-2.5-pro`): Dành cho bài toán suy luận sâu, phân tích 5-Whys, đánh giá TCO.
  - `TIER_FLASH` (`gemini-2.5-flash`): Dành cho hội thoại bán hàng nhanh, độ trễ thấp.
  - `TIER_LOCAL` (`local-deterministic`): Dành cho lệnh regex, toán học chính xác, chi phí 0 đồng.
- **Thực tế thực thi tại Runtime:**  
  Trong `server/services/centralBrainService.js`, hệ thống **không hề import hay gọi `ModelGateway`**!  
  Tại dòng 1563, 1612, 1656, Central Brain gọi thẳng hàm `callGemini(prompt)` từ `server/geminiService.js`.
- **Hệ quả:** Mọi truy vấn chuyển sang LLM đều dùng model mặc định trong biến môi trường, không tự động phân tầng Pro/Flash như kiến trúc đã thiết kế.

### B. Sự cô lập của `ToolGateway` (`server/services/gateway/toolGateway.js`)
- **Thiết kế dự định:**  
  Chứa cơ chế bảo vệ tối quan trọng:
  - Timeout giới hạn 5.000ms (`Promise.race`) chống treo tiến trình.
  - Chốt chặn SSRF (`isSafePublicUrl`) ngăn chặn tấn công dò quét mạng nội bộ khi thực hiện Web Scraping.
  - Nhật ký kiểm toán thực thi công cụ (`_logToolExecution`).
- **Thực tế thực thi tại Runtime:**  
  Trong `CentralBrainService`, các công cụ được gọi trực tiếp qua `ToolOrchestrator` hoặc gọi thẳng Service (`QuotationService`, `WeatherService`, `ExcelParser`).  
  File `toolGateway.js` **không có bất kỳ caller nào trong toàn bộ repository**.
- **Hệ quả:** Tính năng kiểm duyệt Sandbox 5s và SSRF Shield bị tê liệt ở luồng chạy thực tế.

---

## 3. KIỂM TOÁN TỪNG CÔNG CỤ THỰC TẾ ĐANG HOẠT ĐỘNG

| Tên công cụ | Tệp tin phục vụ | Cơ chế an toàn | Đánh giá kiểm toán |
| :--- | :--- | :--- | :--- |
| **Báo giá chính thức** | `QuotationService.js` | Tính toán VAT 10% tất định bằng mã JavaScript | **XUẤT SẮC:** Loại bỏ hoàn toàn lỗi hallucination số học của LLM. |
| **Thời tiết vệ tinh** | `WeatherService.js` | Gọi REST API Open-Meteo, có fallback tọa độ mặc định | **RẤT TỐT:** Dữ liệu thời gian thực, không bịa đặt dự báo. |
| **Kho tài liệu RAG** | `ragService.js` | Vector Hybrid Search, lọc theo `orgId` | **TỐT:** Cách ly tài liệu nội bộ chuẩn xác, có trích dẫn nguồn. |
| **Truy vấn Excel** | `excelParser.js` | Tính SUM, COUNT, AVG trực tiếp trên bảng tính | **TỐT:** Đảm bảo số liệu tài chính có căn cứ từ tệp đính kèm. |
| **Tìm kiếm Web** | `webSearchService.js` | DuckDuckGo HTML parser, loại bỏ link quảng cáo | **TRUNG BÌNH:** Phụ thuộc vào tính ổn định của trang tìm kiếm ngoài. |

---

## 4. KẾ HOẠCH TÍCH HỢP BẮT BUỘC (P1 FIX)

1. **Đấu nối `ModelGateway`:** Thay thế các lệnh gọi trực tiếp `callGemini(prompt)` trong `centralBrainService.js` bằng `ModelGateway.execute({ prompt, taskType })` để tự động tối ưu chi phí và độ trễ.
2. **Đấu nối `ToolGateway`:** Bọc toàn bộ các lời gọi công cụ trong `ToolOrchestrator` qua `ToolGateway.executeTool(toolName, params)` để kích hoạt cơ chế Timeout 5s và SSRF Shield.
