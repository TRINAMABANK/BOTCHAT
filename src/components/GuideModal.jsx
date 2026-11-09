import React from 'react';
import { X, HelpCircle, Bot, Package, PhoneCall, ShieldCheck, Sparkles } from 'lucide-react';

export const GuideModal = ({ isOpen = false, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl bg-[#07132c]/95 border-2 border-cyan-500/40 rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(0,240,255,0.25)] text-slate-100 flex flex-col max-h-[85vh] overflow-hidden animate-slide-up">
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
            <HelpCircle size={22} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white font-display">
              HƯỚNG DẪN SỬ DỤNG TRÍ AI SALES ROBOT
            </h2>
            <p className="text-xs text-cyan-300">
              Trợ lý bán hàng thông minh • Tư vấn đúng nhu cầu • Kết nối chủ nhân
            </p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar my-4 pr-1 space-y-3.5 text-xs">
          <div className="p-3 rounded-2xl bg-[#0a1c3d]/70 border border-cyan-500/30 flex items-start space-x-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-300 flex-shrink-0 mt-0.5">
              <Bot size={18} />
            </div>
            <div>
              <strong className="text-cyan-200 text-sm">Cột 1: Tư Vấn Cùng Robot AI</strong>
              <p className="text-slate-300 mt-1 leading-relaxed">
                Robot nữ 3D túc trực 24/7. Bạn có thể gõ câu hỏi bất kỳ ở ô chat bên dưới hoặc nhấn nút Micro để trò chuyện. AI sẽ giải đáp thông số, chính sách bảo hành và so sánh các dòng máy.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#0a1c3d]/70 border border-cyan-500/30 flex items-start space-x-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-300 flex-shrink-0 mt-0.5">
              <Package size={18} />
            </div>
            <div>
              <strong className="text-cyan-200 text-sm">Cột 2: Chọn Sản Phẩm & Nhu Cầu</strong>
              <p className="text-slate-300 mt-1 leading-relaxed">
                Khám phá 5 lĩnh vực sản phẩm và 3 mẫu máy đếm tiền nổi bật. Nhấn <code>💬 Tư vấn</code> hoặc <code>👁️ Xem chi tiết</code> để xem thông số và giá đã phê duyệt. Nhấn 4 nút hành động để AI hỗ trợ ngay tức thì.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#0a1c3d]/70 border border-purple-500/30 flex items-start space-x-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-300 flex-shrink-0 mt-0.5">
              <PhoneCall size={18} />
            </div>
            <div>
              <strong className="text-purple-200 text-sm">Nút CTA: Yêu Cầu Chủ Nhân Gọi Lại</strong>
              <p className="text-slate-300 mt-1 leading-relaxed">
                Khi bạn muốn đặt mua hoặc nhận bảng giá ưu đãi riêng, hãy nhấn nút màu tím lớn bên phải. Chủ nhân sẽ trực tiếp liên hệ hỗ trợ bạn chu đáo và nhanh nhất.
              </p>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center space-x-2 text-emerald-300 text-[11px]">
            <ShieldCheck size={16} className="text-emerald-400 flex-shrink-0" />
            <span>Cam kết bảo mật 100% • Mọi thông tin chỉ được lưu trữ khi có sự đồng ý của bạn.</span>
          </div>
        </div>

        {/* Close Button */}
        <div className="pt-2 border-t border-cyan-500/20 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95"
          >
            Đã hiểu, quay lại giao diện
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuideModal;