# HỘI ĐỒNG KIỂM TOÁN PHẦN MỀM VÀ AI ĐỘC LẬP CẤP CAO
# SỔ ĐĂNG KÝ VÀ MA TRẬN RỦI RO (RISK REGISTER)
## TRÍ AI ONE SUPER BRAIN – CENTRAL INTELLIGENCE SYSTEM
### Mã tài liệu: AUDIT-G3-G7-RISK-13

---

## 1. MA TRẬN RỦI RO HOẠT ĐỘNG (OPERATIONAL RISK MATRIX)

| Mã Rủi ro | Lĩnh vực | Mô tả Nguy cơ | Khả năng | Tác động | Biện pháp Phòng ngừa Đang hoạt động |
|:---:|:---|:---|:---:|:---:|:---|
| **RSK-FIN-01** | Tài chính | AI tự động chuyển tiền vượt quyền | Cực thấp | Nghiêm trọng | Cổng an toàn Tier 3 Gate chặn đứng 100% tự động |
| **RSK-LEAK-02**| Dữ liệu | Rò rỉ dữ liệu giữa các khách hàng (Cross-tenant) | Cực thấp | Cao | Ranh giới `createScopeFilter` cô lập theo `tenant_id` |
| **RSK-POIS-03**| Tri thức | Người dùng bên ngoài đầu độc dữ liệu RAG | Cực thấp | Cao | Phân vùng Zone A (chỉ duyệt mới sinh lời) và Zone B |
| **RSK-PERF-04**| Hiệu năng | Quá tải cơ sở dữ liệu khi nhiều người truy cập | Thấp | Vừa | SQLite WAL Mode + Bộ nhớ đệm ngữ nghĩa Fast Path (<5ms) |
| **RSK-VISN-05**| Đa thể thức| Thiếu mô hình Vision cục bộ khi xử lý camera | Vừa | Thấp | Fallback sang mô tả thuộc tính và phân tích file tĩnh |
