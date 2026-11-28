# HỘI ĐỒNG KIỂM TOÁN ĐỘC LẬP TRÍ AI ONE SUPER BRAIN
# 11. TEST CASES – ĐẶC TẢ KỊCH BẢN KIỂM THỬ ĐỘC LẬP G1–G7
### CHƯƠNG TRÌNH ĐÁNH GIÁ CHUẨN XUẤT SẮC TRÍ AI EXCELLENT 100/100
*Mã tài liệu: AUDIT-EXC-11 | Ngày: 28/11/2026*

---

## I. DANH SÁCH 6 TEST CASES NGHIỆM THU ĐỘC LẬP

Để xác minh năng lực thực tế của hệ thống mà không dựa vào báo cáo cũ, Đoàn kiểm toán đã xây dựng bộ kiểm thử độc lập gồm 6 ca nghiệm thu cốt lõi:

```
┌─────────┬─────────────────────────────────────────────┬──────────────┬──────────────────────────────────────────────────────┐
│ MÃ TC   │ TÊN KỊCH BẢN KIỂM THỬ                       │ PHÂN HỆ G1–G7│ MỤC TIÊU XÁC MINH                                    │
├─────────┼─────────────────────────────────────────────┼──────────────┼──────────────────────────────────────────────────────┤
│ TC-01   │ Multi-file Batch Upload Pipeline            │ G1, G2       │ Kiểm tra nạp đa tệp đồng thời, hàng đợi & tiến độ    │
│ TC-02   │ Web Article Crawler & HTML Cleaner          │ G2           │ Kiểm tra cào bài viết web, lọc rác HTML, lưu nguồn   │
│ TC-03   │ SHA-256 Content Deduplication               │ G2, G7       │ Kiểm tra phát hiện trùng lặp bằng mã băm SHA-256     │
│ TC-04   │ SSRF Protection Security Gate               │ G7           │ Kiểm tra chặn IP nội bộ, localhost, cloud metadata   │
│ TC-05   │ Central Brain Hybrid Retrieval & Citation   │ G1, G2, G3   │ Kiểm tra tra cứu RAG ngữ nghĩa và trích dẫn URL nguồn│
│ TC-06   │ Tenant & 6-Product Scope Isolation          │ G5, G7       │ Kiểm tra cách ly dữ liệu giữa các tenant & 6 sản phẩm│
└─────────┴─────────────────────────────────────────────┴──────────────┴──────────────────────────────────────────────────────┘
```

---

## II. ĐẶC TẢ CHI TIẾT TỪNG KỊCH BẢN

### Kịch bản TC-01: Multi-file Batch Upload Pipeline
- **Đầu vào**: Mảng 2 tệp văn bản khác nhau (`quy_trinh_bao_hanh_2027.txt` và `chinh_sach_dai_ly_vang.txt`).
- **Thực thi**: Gọi `UnifiedKnowledgePipelineService.processBatchFiles`.
- **Kỳ vọng**: Tạo `batchId` trong `knowledge_batch_uploads`, xử lý thành công 2/2 tệp, trạng thái bảng chuyển thành `COMPLETED`, các chunks và vector được ghi vào SQLite.

### Kịch bản TC-02: Web Article Crawler & HTML Cleaner
- **Đầu vào**: Chuỗi HTML mô phỏng trang web có header, nav, sidebar quảng cáo, footer và thẻ bài viết chính `<article>`.
- **Thực thi**: Gọi `WebKnowledgeExtractor.extract` và `UnifiedKnowledgePipelineService.ingest`.
- **Kỳ vọng**: Loại bỏ 100% các từ khóa trong nav và footer, chỉ giữ lại nội dung bài viết kỹ thuật, lưu `source_origin = 'WEBSITE'`, tạo vector 128 chiều.

### Kịch bản TC-03: SHA-256 Content Deduplication
- **Đầu vào**: Nạp cùng một nội dung văn bản 2 lần liên tiếp với cờ `skipDuplicate = true`.
- **Thực thi**: Tính toán SHA-256 checksum trên văn bản đã chuẩn hóa và đối chiếu với database.
- **Kỳ vọng**: Lần 1 trả về `status: 'INGESTED'`; Lần 2 trả về `status: 'DUPLICATE_SKIPPED'`, không sinh thêm bất kỳ bản ghi nào trong database.

### Kịch bản TC-04: SSRF Protection Security Gate
- **Đầu vào**: Danh sách 6 URL tấn công độc hại: `http://localhost:5000`, `http://127.0.0.1:8080`, `http://169.254.169.254/latest/meta-data`, `http://10.0.0.1`, `http://192.168.1.1`, `ftp://quangnhuttri.com`.
- **Thực thi**: Gọi hàm `isSafePublicUrl` thực hiện phân tích cú pháp và phân giải DNS.
- **Kỳ vọng**: 100% (6/6) URL độc hại bị chặn an toàn với `safe: false`. Một URL công khai chuẩn (`https://quangnhuttri.com/gioi-thieu`) được cấp phép `safe: true`.

### Kịch bản TC-05: Central Brain Hybrid Retrieval & Citation
- **Đầu vào**: Câu hỏi tự nhiên: *"quy chuẩn bấm đầu hạt mạng T568B"*.
- **Thực thi**: Gọi `RagService.searchKnowledge` thực thi tìm kiếm lai (BM25 + Cosine Dense Vector Similarity).
- **Kỳ vọng**: Trả về đúng đoạn tài liệu kỹ thuật đã nạp từ web, điểm số RAG > 8.0, nhãn trích dẫn có gắn kèm URL nguồn minh bạch.

### Kịch bản TC-06: Tenant & 6-Product Scope Isolation
- **Đầu vào**: Nạp tài liệu cơ mật có `org_id: 'org_secret_corp'` và `product_scope: 'secretary'`.
- **Thực thi**:
  1. Thử truy vấn từ bot `sales_robot` thuộc cùng tenant.
  2. Thử truy vấn từ `secretary` nhưng thuộc tenant khác (`org_different_tenant`).
  3. Truy vấn chuẩn xác từ `secretary` thuộc đúng tenant `org_secret_corp`.
- **Kỳ vọng**: Thao tác (1) và (2) hoàn toàn KHÔNG tìm thấy tài liệu (kết quả = 0 chunk); Thao tác (3) tìm thấy tài liệu chính xác (kết quả > 0).
