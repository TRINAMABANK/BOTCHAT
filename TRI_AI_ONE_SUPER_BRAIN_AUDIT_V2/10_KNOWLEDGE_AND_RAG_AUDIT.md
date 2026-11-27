# BÁO CÁO 10: KIỂM TOÁN TẦNG 5 – TRI THỨC VÀ RAG
## HYBRID RAG SEARCH, KNOWLEDGE GRAPH & ANTI-HALLUCINATION

### 1. KIẾN TRÚC RAG HYBRID & ĐỒ THỊ TRI THỨC
TRÍ AI kết hợp 3 lớp truy xuất tri thức:
1. **Structured RAG (Excel & SQLite):** Truy vấn chính xác 100% về mã SKU, thông số điện áp, kích thước và bảng giá niêm yết chính thức.
2. **Unstructured RAG (Vector / BM25 Hybrid):** Tra cứu tài liệu hướng dẫn kỹ thuật, chính sách bảo hành, catalogue sản phẩm từ thư mục `data/knowledge/`.
3. **Hardware Knowledge Graph:** Mô hình hóa quan hệ tương thích giữa các thiết bị và linh kiện:
   - Node: Thiết bị (XINDA Super BC-35)
   - Edge: `COMPATIBLE_WITH`
   - Node: Linh kiện (Mắt đọc tia hồng ngoại IR kép, Cụm bánh răng cao su 8 múi)

---

### 2. CƠ CHẾ CHỐNG ẢO GIÁC (ANTI-HALLUCINATION)
Hội đồng Kiểm toán đã thử nghiệm các câu hỏi gài bẫy và truy vấn không có trong danh mục:
- **Tình huống 1:** Khách hỏi mua sản phẩm không có thật trong shop (*"Máy đếm tiền bay vũ trụ X900"*).
  - *Hành vi AI:* Tuyệt đối không tự bịa đặt thông số hay giá bán. Báo rõ sản phẩm chưa có trong danh mục của shop, và nhã nhặn đề xuất giải pháp tương tự có sẵn.
  - *Kết quả:* **PASS**
- **Tình huống 2:** Khách hỏi về chính sách bảo hành trà thực phẩm.
  - *Hành vi AI:* Phân biệt bản chất sản phẩm là thực phẩm/đồ uống tiêu hao, không áp dụng chế độ bảo hành cơ học 12-24 tháng như máy móc mà áp dụng chính sách đổi trả hàng nguyên seal trong 7 ngày.
  - *Kết quả:* **PASS**
