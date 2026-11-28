# 19. KẾ HOẠCH HÀNH ĐỘNG VÀ KHẮC PHỤC (REMEDIATION PLAN)
## LỘ TRÌNH CHUYỂN GIAO TỪ CONDITIONAL PASS SANG FULL PRODUCTION ACCEPTANCE

**Hội đồng lập kế hoạch:** Senior Software Auditor, Release Acceptance Board  
**Mục tiêu:** Giải quyết dứt điểm 100% các khuyến nghị còn lại để phát hành chính thức  

---

### I. CÁC HẠNG MỤC CẦN TRIỂN KHAI VÀ KHẮC PHỤC

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          LỘ TRÌNH 3 BƯỚC KHẮC PHỤC                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ BƯỚC 1: Sửa lỗi Test Assertion 5.2 trong test_security_audit_hardening.js    │
│ BƯỚC 2: Triển khai 3 File Adapter G4, G5, G6 từ các Master Blueprints        │
│ BƯỚC 3: Chạy toàn bộ Regression Test Suite & Xác nhận Full Acceptance       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### II. KẾ HOẠCH THỰC HIỆN CHI TIẾT

#### Hạng mục 1: Cập nhật Test Case 5.2 trong `test_security_audit_hardening.js`
- **Mục tiêu:** Đồng bộ kỳ vọng câu thoại của test case với phong cách tư vấn tự nhiên của Central Brain.
- **Dự kiến thay đổi:** Bổ sung điều kiện kiểm tra phản hồi chứa câu hỏi làm rõ dòng sản phẩm hoặc thông báo chưa có sẵn.
- **Rủi ro phát sinh:** Không có rủi ro, không ảnh hưởng tới mã nguồn production.

#### Hạng mục 2: Triển khai 3 File Adapter đã thiết kế
1. `server/services/intelligence/expertCouncilManager.js`:
   - Nạp Registry 10 chuyên gia chức năng đã được thiết kế tại Blueprint G4.
2. `server/services/intelligence/productConfigurationEngine.js`:
   - Nạp bộ máy quản lý cấu hình 18 trường cho 6 sản phẩm đã được thiết kế tại Blueprint G5.
3. `server/services/multimodal/multimodalInputGateway.js`:
   - Nạp cổng tiếp nhận và kiểm tra MIME đa phương thức đã được thiết kế tại Blueprint G6.

#### Hạng mục 3: Chạy bộ kiểm thử hồi quy toàn diện (Final Regression)
- Chạy lại toàn bộ 725+ test cases:
  - `node tests/test_security_audit_hardening.js` (Mục tiêu: 16/16 Pass - 100%)
  - `node tests/test_vietnamese_service_product_isolation_100.js` (110/110 Pass - 100%)
  - `node tests/test_vietnamese_semantic_intelligence_100.js` (105/105 Pass - 100%)
  - `node tests/test_brain_performance_audit_500.js` (510/510 Pass - 100%)
  - `node tests/test_continuous_evaluation_suite.js` (130/130 Pass - 100%)
- **Mục tiêu nghiệm thu:** Đạt 100.0% trên toàn bộ các bộ kiểm thử.

---

### III. KẾ HOẠCH AN TOÀN VÀ PHÊ DUYỆT

- **Nguyên tắc:** Toàn bộ công việc chỉ được thực hiện trên nhánh phát triển độc lập `feature/final-remediation-g1-g7` sau khi có sự đồng ý của Chủ dự án.
- **Khôi phục khẩn cấp:** Luôn có sẵn bản sao lưu cơ sở dữ liệu `data/triai_backup_stage_d.db` và nhánh `main` được bảo vệ nghiêm ngặt.
