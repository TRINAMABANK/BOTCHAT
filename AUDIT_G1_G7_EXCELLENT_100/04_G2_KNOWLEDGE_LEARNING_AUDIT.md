# AUDIT_G1_G7_EXCELLENT_100
# 04 – KIỂM TOÁN TRI THỨC VÀ HỌC TẬP CÓ KIỂM CHỨNG (G2 AUDIT)

---

## 1. MỤC TIÊU VÀ PHẠM VI KIỂM TOÁN G2

Kiểm toán phân hệ tri thức và tiếp nhận học hỏi liên tục (Knowledge & Verified Learning) theo 10 tiêu chuẩn:
1. Tiếp nhận và bóc tách tài liệu đa định dạng (PDF, DOCX, XLSX, CSV, TXT).
2. Xử lý tài liệu nhiều trang và nhiều sheet tính toán.
3. Độ chuẩn xác trong truy xuất văn bản trích dẫn.
4. Phân định ranh giới giữa FACT, INFERENCE, HYPOTHESIS, UNKNOWN.
5. Phát hiện dữ liệu mâu thuẫn trong nguồn tri thức.
6. Chống nhiễm độc tri thức: Không nạp dữ liệu chưa qua phê duyệt (`Human-in-the-loop`).
7. Khả năng cập nhật phiên bản tri thức khi tài liệu gốc thay đổi.
8. Đánh giá chất lượng Embeddings và Vector Search.
9. Phòng chống tấn công Prompt Injection nhúng trong tài liệu.
10. Nguồn trích dẫn (Citations) có thể truy ngược về tài liệu gốc.

---

## 2. KẾT QUẢ ĐỐI SOÁT MÃ NGUỒN VÀ BẰNG CHỨNG RUNTIME

### 2.1. Kiểm tra Pipeline Ingestion và Parsers
- **Bộ bóc tách đa tài liệu [multiDocParser.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/parsers/multiDocParser.js):**
  + Tích hợp thư viện `pdf-parse` xử lý file PDF nhiều trang.
  + Tích hợp `mammoth` trích xuất văn bản thuần và bảng biểu từ file Word `.docx`.
  + Tích hợp `xlsx` duyệt toàn bộ danh sách `SheetNames`, trích xuất dữ liệu mảng đối tượng `JSON`.
  + Thử nghiệm an toàn: Trích xuất thành công nội dung tài liệu mẫu $\rightarrow$ **PASS**.
- **Bộ thu thập Website [webKnowledgeExtractor.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/crawler/webKnowledgeExtractor.js):**
  + Sử dụng `cheerio` bóc tách cấu trúc HTML: loại bỏ sạch các thẻ nhiễu `<script>`, `<style>`, `<nav>`, `<footer>`.
  + Tích hợp chốt chặn an toàn `isPrivateIpAddress` chống tấn công SSRF $\rightarrow$ **PASS**.
- **Khử trùng lặp nội dung:**
  + Module [unifiedKnowledgePipeline.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/knowledge/unifiedKnowledgePipeline.js#L75) tính toán mã băm `content_hash = crypto.createHash('sha256').update(cleanedText).digest('hex')`.
  + Kiểm tra đối chiếu với bảng `knowledge_documents`. Nếu trùng, bỏ qua với mã `DUPLICATE_SKIPPED` $\rightarrow$ **PASS**.

### 2.2. Điểm nghẽn RAG trong Runtime: Bỏ rơi tri thức đã lưu
Mặc dù cơ sở dữ liệu `data/triai.db` có bảng `knowledge_documents`, `knowledge_chunks` và `knowledge_embeddings`, hội đồng kiểm toán phát hiện **lỗi logic định tuyến nghiêm trọng**:
- Tại [centralBrainService.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/centralBrainService.js#L1239):
  `const isDocExplicitQuery = !isOfficeDocDevice && (primaryIntent === 'INTERNAL_DOCUMENT_RAG' || ((/(tài liệu|quy trình|quy chế|quyết định|công văn|văn bản|nội bộ|sổ tay|quy định)/i.test(message))...)`
- Luồng RAG chỉ được bật khi câu hỏi của người dùng có chứa đúng các từ khóa pháp quy nêu trên.
- **Hệ quả thực tế:** Khi người dùng hỏi về lịch sử, tri thức sản phẩm, hoặc hỏi *"Ai sáng lập ra em?"*, hệ thống **hoàn toàn không kích hoạt RAG**, khiến tài liệu xác thực người sáng lập nằm im trong database và bot tự bịa ra OpenAI.

### 2.3. Đánh giá Vector Embedding:
- Hệ thống hỗ trợ vector dense 1536 chiều từ OpenAI (`text-embedding-3-small`) và fallback vector 128 chiều heuristic nội bộ.
- Không phát hiện tình trạng lấy mã băm ký tự giả danh làm vector embedding ngữ nghĩa.

---

## 3. KẾT LUẬN VÀ BẢNG ĐIỂM G2

| Tiêu chí kiểm định G2 | Trọng số | Điểm thực tế | Trạng thái |
| :--- | :---: | :---: | :---: |
| Bóc tách tài liệu đa định dạng (PDF/DOCX/XLSX) | 2.0 | 2.0 | **PASS** |
| Website Crawler & SSRF Guard | 2.0 | 2.0 | **PASS** |
| SHA-256 Deduplication & Toàn vẹn tri thức | 1.5 | 1.5 | **PASS** |
| Vector Search & Trích dẫn nguồn (Citations) | 1.5 | 1.3 | **PASS** |
| Chống nhiễm độc tri thức (`PENDING_REVIEW`) | 1.5 | 1.2 | **PASS** |
| **Kích hoạt RAG trong Runtime thực tế** | 1.5 | **0.0** | **FAIL (Nghẽn Routing)** |
| **TỔNG ĐIỂM G2 (Thang 10)** | **10.0** | **8.0** | **CONDITIONAL PASS (80.0%)** |
