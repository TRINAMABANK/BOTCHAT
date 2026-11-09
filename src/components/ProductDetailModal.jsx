import React from 'react';
import { X, CheckCircle, ShieldCheck, PhoneCall, ShoppingCart, MessageSquare, Tag, Award } from 'lucide-react';

export const ProductDetailModal = ({
  isOpen = false,
  onClose,
  product = null,
  onConsult,
  onOrder,
  onCallOwner
}) => {
  if (!isOpen || !product) return null;

  let specs = {};
  if (product.specs_json) {
    try {
      specs = typeof product.specs_json === 'string' ? JSON.parse(product.specs_json) : product.specs_json;
    } catch {
      specs = { 'Thông số': product.specs_json };
    }
  } else {
    specs = {
      'Tốc độ đếm': '1.100 - 1.200 tờ/phút',
      'Công nghệ kiểm giả': 'Hồng ngoại đa điểm IR, Cảm biến từ trường MG, Tia cực tím UV',
      'Đếm ngoại tệ': 'VNĐ, USD, EUR, JPY, CNY',
      'Điện áp': '220V - 50Hz (Công suất 60W)',
      'Bảo hành chính hãng': '24 tháng tại nơi sử dụng',
      'Xuất xứ': 'Chính hãng Xiudun - Phê duyệt kiểm định'
    };
  }

  const priceStr = product.price_formatted || `${(product.price || 0).toLocaleString('vi-VN')} ₫`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#07132c]/95 border-2 border-cyan-500/40 rounded-3xl p-5 sm:p-7 shadow-[0_0_50px_rgba(0,240,255,0.25)] text-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-slide-up">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 pb-3 border-b border-cyan-500/20">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
            <Award size={22} />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white font-display">
              {product.name}
            </h2>
            <p className="text-xs text-cyan-300 font-medium">
              Lĩnh vực: {product.field} • Nhóm: {product.group_name || 'Máy đếm tiền cao cấp'}
            </p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar my-4 pr-1 space-y-4">
          {/* Top Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-[#091a3e]/80 p-4 rounded-2xl border border-cyan-500/30">
            <div className="w-full h-44 bg-slate-950/70 rounded-xl flex items-center justify-center p-3 border border-slate-800">
              <img
                src={product.image_url}
                alt={product.name}
                className="max-h-full max-w-full object-contain drop-shadow-[0_8px_18px_rgba(0,240,255,0.3)]"
              />
            </div>

            <div className="space-y-2.5">
              <div>
                <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Giá bán niêm yết đã phê duyệt</span>
                <div className="text-2xl font-black text-[#ff3864] font-display">
                  {priceStr}
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {product.description || 'Dòng máy đếm tiền thế hệ mới, tích hợp cảm biến thông minh kiểm tra tiền giả siêu chuẩn xác, độ bền cao, hoạt động êm ái.'}
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                  <ShieldCheck size={12} />
                  <span>Bảo hành 24 tháng</span>
                </span>
                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
                  <CheckCircle size={12} />
                  <span>Chính hãng 100%</span>
                </span>
              </div>
            </div>
          </div>

          {/* Specifications Table */}
          <div>
            <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <span>Bảng Thông Số Kỹ Thuật Chi Tiết</span>
            </h4>
            <div className="rounded-xl border border-slate-700/80 overflow-hidden bg-[#071530]/80">
              <table className="w-full text-xs">
                <tbody>
                  {Object.entries(specs).map(([key, val], idx) => (
                    <tr
                      key={key}
                      className={idx % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-900/10'}
                    >
                      <td className="py-2 px-3 font-semibold text-slate-300 w-2/5 border-r border-slate-800">
                        {key}
                      </td>
                      <td className="py-2 px-3 text-slate-100 font-mono">
                        {String(val)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="pt-3 border-t border-cyan-500/20 flex flex-wrap gap-2.5 justify-end">
          <button
            onClick={() => {
              onClose();
              if (onConsult) onConsult(product);
            }}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#0c1f45] hover:bg-[#122e66] border border-cyan-500/40 text-cyan-200 text-xs font-semibold transition-all active:scale-95"
          >
            <MessageSquare size={14} className="text-cyan-400" />
            <span>Tư vấn qua AI</span>
          </button>

          <button
            onClick={() => {
              onClose();
              if (onOrder) onOrder(product);
            }}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:brightness-110 text-white text-xs font-bold shadow-md shadow-cyan-500/30 transition-all active:scale-95"
          >
            <ShoppingCart size={14} />
            <span>Đặt mua ngay</span>
          </button>

          <button
            onClick={() => {
              onClose();
              if (onCallOwner) onCallOwner(product);
            }}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-700 via-fuchsia-700 to-purple-800 hover:brightness-110 text-white text-xs font-bold shadow-[0_0_15px_rgba(192,38,211,0.5)] transition-all active:scale-95"
          >
            <PhoneCall size={14} />
            <span>Yêu cầu chủ nhân gọi lại</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailModal;