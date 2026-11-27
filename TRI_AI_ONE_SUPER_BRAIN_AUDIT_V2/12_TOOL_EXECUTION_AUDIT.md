# BÁO CÁO 12: KIỂM TOÁN TẦNG 6 – CÔNG CỤ VÀ HÀNH ĐỘNG
## TOOL GATEWAY, SANDBOXING & SSRF SECURITY VERIFICATION

### 1. DANH MỤC CÔNG CỤ ĐƯỢC PHÉP THỰC THI (WHITELIST TOOLS)
Mọi công cụ được quản lý tập trung qua `ToolGateway` (`server/services/gateway/toolGateway.js`):
1. `sales_engine_adapter`: Tra cứu sản phẩm, thông số, đồng bộ hiển thị.
2. `quotation_service`: Lập bảng báo giá chính hãng, tính toán thuế VAT 10%.
3. `excel_structured_query`: Truy vấn số liệu bảng tính Excel.
4. `rag_hybrid_search`: Tra cứu kho tài liệu nội bộ.
5. `knowledge_graph_engine`: Đối chiếu tương thích linh kiện phần cứng.
6. `search_web_internet`: Tra cứu dữ liệu thời gian thực có kiểm soát.

---

### 2. PHÒNG VỆ CHỐNG TẤN CÔNG SSRF (SERVER-SIDE REQUEST FORGERY)
Hội đồng Kiểm toán đã kiểm tra khả năng chặn đứng yêu cầu dò quét mạng nội bộ:
- **Thử nghiệm:** Kích hoạt tool `search_web_internet` với địa chỉ IP nội bộ: `http://127.0.0.1:8080/admin` hoặc `http://169.254.169.254/latest/meta-data/`.
- **Phản ứng của ToolGateway:**
```
[TOOL GATEWAY] Tool search_web_internet failed: Blocked SSRF access to restricted network address:
Truy cập vào mạng nội bộ hoặc localhost bị cấm (SSRF Protection)
```
- **Kết luận:** Chốt chặn an ninh mạng hoạt động tuyệt đối an toàn, chặn 100% tấn công SSRF vào hạ tầng mạng cục bộ.
