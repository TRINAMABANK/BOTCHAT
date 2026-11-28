# 16. SỔ NHẬT KÝ BẰNG CHỨNG KIỂM ĐỊNH (EVIDENCE REGISTER)
## DANH MỤC CÁC BẰNG CHỨNG THỰC NGHIỆM ĐÃ ĐƯỢC XÁC THỰC

**Hội đồng thẩm định:** Release Acceptance Board, Independent QA Lead  
**Ghi nhận lúc:** 28/11/2026 08:35:00 UTC+7  

---

### DANH BẠ CÁC TỆP BẰNG CHỨNG KIỂM TOÁN CỐT LÕI

| STT | Mã bằng chứng | Mô tả nội dung bằng chứng | Tệp lưu trữ / Nguồn gốc | Trạng thái xác thực |
| :---: | :--- | :--- | :--- | :---: |
| 1 | **EVD-GIT-01** | Trạng thái Git nhánh `main`, commit `f06a4b3` | `git status` & `git log -n 5` | **XÁC MINH 100%** |
| 2 | **EVD-TEST-01** | Kết quả chạy 110 cases Service Product Isolation | Log thực thi `test_vietnamese_service_product_isolation_100.js` | **110/110 PASS (100%)** |
| 3 | **EVD-TEST-02** | Kết quả chạy 105 cases Semantic Intelligence | Log thực thi `test_vietnamese_semantic_intelligence_100.js` | **105/105 PASS (100%)** |
| 4 | **EVD-TEST-03** | Kết quả chạy 510 cases Master Performance Audit | `tests/audit_500_results.json` | **510/510 PASS (100%)** |
| 5 | **EVD-TEST-04** | Kết quả chạy 130 cases Continuous Evaluation | SQLite table `evaluation_benchmark_runs` (`bench_run_1795837746425_ef7a53`) | **130/130 PASS (100%)** |
| 6 | **EVD-TEST-05** | Kết quả chạy 16 cases Security Hardening | Log thực thi `test_security_audit_hardening.js` | **15/16 PASS (93.8%)** |
| 7 | **EVD-DB-01** | Bảng danh mục 88 bảng SQLite và PRAGMA | Log truy vấn `sqlite_master` & `PRAGMA table_info` | **88 BẢNG TOÀN VẸN** |
| 8 | **EVD-LATENCY-01**| Bảng đo độ trễ P50 (0ms), P95 (5ms), P99 (53ms) | Log thực thi `test_brain_performance_audit_500.js` | **ĐẠT CHUẨN TIER-1** |
| 9 | **EVD-BACKUP-01** | Tệp sao lưu an toàn `triai_backup_stage_d.db` | Kiểm tra kích thước và tính toàn vẹn `data/` | **PRAGMA INTEGRITY OK** |
| 10 | **EVD-HOMOPHONE**| Khử hoàn toàn lỗi nhầm "sửa" vs "sữa", "mưa" vs "mua" | 6 Homophone Zero-Guard Tests trong Suite 1 | **6/6 ZERO SIMILARITY** |

Mọi kết luận trong báo cáo kiểm định này đều được bảo chứng bởi các tệp nhật ký và kết quả thực thi độc lập nêu trên.
