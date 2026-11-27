# KẾ HOẠCH KIỂM THỬ HỒI QUY (REGRESSION TEST PLAN)
# TRÍ AI ONE SUPER BRAIN — AUTOMATED VERIFICATION MATRIX

> **Repository:** `https://github.com/TRINAMABANK/BOTCHAT` | **Branch:** `main`  
> **Commit SHA:** `65cff35063ccba4703a640a839b83104ef7d64fc`  
> **Kiểm toán viên:** QA Automation Architect & Test Infrastructure Lead  

---

## 1. NGUYÊN TẮC KIỂM THỬ HỒI QUY BẢO VỆ NỀN TẢNG (NON-REGRESSION PRINCIPLES)

Mỗi khi chủ dự án phê duyệt sửa đổi mã nguồn cho bất kỳ module nào (kể cả 1 dòng regex), bắt buộc phải chạy toàn bộ ma trận kiểm thử tự động gồm **725 kịch bản** để đảm bảo:
1. **Không làm sống lại lỗi cũ (No Zombie Bugs):** Lỗi nhầm mưa/mua hoặc sửa/sữa tuyệt đối không được tái xuất hiện.
2. **Không phá vỡ luồng tư vấn bán hàng:** Báo giá VAT 10%, mã SKU, bảo hành chính hãng phải giữ nguyên độ chính xác.
3. **Không làm rò rỉ Cột 2:** Câu hỏi thời tiết, kỹ thuật, chứng khoán không bao giờ được mở danh mục bán hàng.
4. **Không làm chậm hệ thống:** Độ trễ P95 không được vượt quá 20ms cho tầng tiền xử lý.

---

## 2. MA TRẬN BỘ TEST HỒI QUY TOÀN DIỆN (725 TEST CASES)

| Bộ Kiểm Thử (Test Suite) | Tệp tin thực thi | Số ca test | Mục tiêu kiểm chứng hồi quy | Thời gian chạy |
| :--- | :--- | :---: | :--- | :---: |
| **1. Master Audit 500 Suite** | `tests/test_brain_performance_audit_500.js` | **510** | Kiểm chứng 8 trụ cột nhận thức, bộ nhớ, suy luận, bảo mật Tier 3, latency P50-P99. | ~ 12s |
| **2. Service & Product Isolation** | `tests/test_vietnamese_service_product_isolation_100.js` | **110** | Chống nhầm dịch vụ sửa chữa điện thoại với cà phê sữa GUNAM; cô lập dịch vụ thi công. | ~ 8s |
| **3. Tone Mark Semantic Suite** | `tests/test_vietnamese_semantic_intelligence_100.js` | **105** | Phân biệt dấu thanh 8 cặp đồng âm (mưa/mua, bàn/bán, bảo/bão, nghỉ/nghĩ, cổ/cỗ). | ~ 15s |
| **TỔNG SỐ KỊCH BẢN HỒI QUY** | **3 Bộ Test Độc Lập** | **725** | **BẢO ĐẢM TOÀN DIỆN TOÀN HỆ THỐNG** | **~ 35s** |

---

## 3. LỆNH CHẠY KIỂM THỬ TỰ ĐỘNG BẰNG 1 CÂU LỆNH (ONE-COMMAND CI/CD)

Để xác nhận hệ thống hoàn toàn sạch lỗi sau khi áp dụng bản vá, chạy lệnh liên hoàn sau trong terminal PowerShell:

```powershell
node tests/test_vietnamese_service_product_isolation_100.js && `
node tests/test_vietnamese_semantic_intelligence_100.js && `
node tests/test_brain_performance_audit_500.js
```

### Điều kiện nghiệm thu hồi quy (Pass/Fail Gate):
- **Tỷ lệ Đạt bắt buộc:** **>= 98.0%** (Tối thiểu 710 / 725 test PASS).
- **Lỗi chí mạng (Blockers):** Bằng 0 (0 ca lỗi về mưa/mua, 0 ca lỗi về sửa/sữa, 0 ca lỗi rò rỉ thanh toán Tier 3).
- **Build Frontend:** Lệnh `npm run build` phải biên dịch thành công 100%, không có lỗi module syntax.
