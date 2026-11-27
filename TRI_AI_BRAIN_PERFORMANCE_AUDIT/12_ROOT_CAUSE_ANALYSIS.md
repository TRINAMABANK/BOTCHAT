# BÁO CÁO PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE ANALYSIS)
# TRÍ AI ONE SUPER BRAIN — DEFECTS & ARCHITECTURAL ANOMALIES

> **Repository:** `https://github.com/TRINAMABANK/BOTCHAT` | **Branch:** `main`  
> **Commit SHA:** `65cff35063ccba4703a640a839b83104ef7d64fc`  
> **Kiểm toán viên:** Principal Systems Auditor & Root Cause Analyst  

---

## 1. MÔ HÌNH PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (5-WHYS & FISHBONE)

Dựa trên kết quả thực nghiệm 510 kịch bản và phân tích tĩnh 2.207 dòng code của `CentralBrainService`, đoàn kiểm toán xác định 5 nhóm nguyên nhân gốc rễ gây ra các lỗi hiện tại của hệ thống:

```
                      [SỰ CỐ HỆ THỐNG]
                             │
     ┌───────────────────────┼───────────────────────┐
     │                       │                       │
[ĐỊNH TUYẾN Ý ĐỊNH]    [SUY LUẬN & DỮ LIỆU]    [BẢO MẬT TIER 3]
- Regex thứ tự ưu tiên  - Thiếu kiểm tra độ dài  - Danh sách từ khóa
  chưa tối ưu ("Chính     câu hỏi tối thiểu       L4 bị hẹp ("rút
  sách" trước "bán sỉ")   - Mặc định sufficient   tiền", "xóa DB")
     │                       │                       │
     └───────────────────────┼───────────────────────┘
                             │
             ┌───────────────┴───────────────┐
             │                               │
     [CÔ LẬP GATEWAY]               [NHÂN BẢN MÃ NGUỒN]
     - ModelGateway & ToolGateway    - Đoạn code CF-2..CF-7
       được viết nhưng không         bị duplicate giữa 2 file
       được import vào CentralBrain  Service và Orchestrator
```

---

## 2. PHÂN TÍCH CHI TIẾT TỪNG NGUYÊN NHÂN GỐC RỄ

### Nguyên nhân 1: Xung đột thứ tự ưu tiên trong Intent Engine (Precedence Collision)
- **Triệu chứng:** Khách hỏi: *"Chính sách bán buôn như thế nào?"* → Bị đẩy sang tìm văn bản nội bộ RAG thay vì tư vấn bán hàng.
- **Tại sao 1 (Why 1):** Tại sao lại vào RAG? Vì hàm nhận diện tài liệu `isDocExplicitQuery` trả về `true`.
- **Tại sao 2 (Why 2):** Tại sao `isDocExplicitQuery` trả về `true`? Vì câu có chứa từ `"chính sách"`.
- **Tại sao 3 (Why 3):** Tại sao không nhận diện đây là bán buôn? Vì điều kiện phủ định chỉ loại trừ `"bảo hành"`, `"đổi trả"`, `"giao hàng"`, nhưng bỏ sót `"bán buôn"`, `"bán sỉ"`, `"chiết khấu"`.
- **Nguyên nhân gốc rễ:** Thiếu bộ lọc ngữ cảnh ghép đôi (Compound Token Filter) phân biệt rõ giữa "Chính sách quản trị nội bộ" và "Chính sách thương mại bán hàng".

### Nguyên nhân 2: Lỗi đánh giá thiếu điều kiện trong `ReasoningEngine` (Premature Sufficiency)
- **Triệu chứng:** Khách nhắn vỏn vẹn 3 chữ: *"Tư vấn máy"* → Hệ thống không dừng lại hỏi làm rõ mà lập tức báo `dataSufficient: true`.
- **Tại sao 1:** Tại sao lại cho là đủ dữ liệu? Vì hàm `evaluateSufficiency()` trả về giá trị mặc định là `true`.
- **Tại sao 2:** Tại sao mặc định là `true`? Vì lập trình viên chỉ viết các trường hợp ngoại lệ cho `slots.quantity` và `slots.budget`, mà quên mất trường hợp cơ bản: Tên sản phẩm hoàn toàn chưa được xác định.
- **Nguyên nhân gốc rễ:** Thiếu quy tắc kiểm tra ngưỡng độ dài tối thiểu (Minimum Input Length Threshold) và sự vắng mặt của thực thể sản phẩm cụ thể.

### Nguyên nhân 3: Danh mục từ khóa hành vi L4 bị sót trong `SecurityGovernanceGate`
- **Triệu chứng:** Khách yêu cầu: *"Rút tiền từ ví hệ thống"*, *"Xóa sạch toàn bộ cơ sở dữ liệu"* → Hệ thống cho phép thực thi (`Allowed: true`).
- **Tại sao 1:** Tại sao lại cho phép? Vì hàm `evaluateAuthorization` không khớp bất kỳ pattern nào trong danh sách chặn.
- **Tại sao 2:** Tại sao không khớp? Vì danh sách chặn chỉ gồm: `chuyển tiền`, `thanh toán`, `đặt cọc`, `hoàn tiền`.
- **Nguyên nhân gốc rễ:** Danh sách chốt chặn an toàn được thiết kế theo dạng Whitelist/Blacklist thủ công chưa bao quát hết các động từ tài chính và quản trị hệ thống (`rút`, `trừ`, `xóa cơ sở dữ liệu`, `reset`).

### Nguyên nhân 4: Kiến trúc phân mảnh giữa CentralBrainService và CentralBrainOrchestrator
- **Triệu chứng:** Hiệu năng bị chậm nhẹ và khó bảo trì khi cần cập nhật một kịch bản giao tiếp mới.
- **Nguyên nhân gốc rễ:** Trong quá trình nâng cấp hệ thống lên phiên bản 3.0, lập trình viên đã viết `CentralBrainOrchestrator` để gom 11 giai đoạn, nhưng sau đó không xóa đoạn mã xử lý cũ (CF-2 đến CF-8) trong `CentralBrainService`. Kết quả là khi Orchestrator trả về `null`, hệ thống chạy lại toàn bộ các logic kiểm tra tương tự lần thứ hai.
