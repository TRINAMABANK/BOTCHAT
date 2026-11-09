import React from 'react';
import { Bell, CheckCircle2, ShieldAlert, Sparkles, X } from 'lucide-react';

export const NotificationDropdown = ({ isOpen = false, onClose }) => {
  if (!isOpen) return null;

  const notifications = [
    {
      id: 1,
      title: 'Chính sách bảo hành 24 tháng',
      desc: 'Áp dụng cho dòng máy đếm tiền Xiudun XD-9999 & XD-6688 chính hãng tại nơi sử dụng.',
      time: '10 phút trước',
      icon: <CheckCircle2 size={15} className="text-emerald-400" />
    },
    {
      id: 2,
      title: 'Giao hàng hỏa tốc trong 2 giờ',
      desc: 'Miễn phí lắp đặt, hướng dẫn vận hành và thử tiền giả tận nơi tại TP.HCM & Hà Nội.',
      time: '1 giờ trước',
      icon: <Sparkles size={15} className="text-cyan-400" />
    },
    {
      id: 3,
      title: 'Cập nhật bảng giá niêm yết',
      desc: 'Đã cập nhật giá bán phê duyệt mới nhất từ quản trị viên cho các dòng máy Xiudun.',
      time: 'Hôm nay',
      icon: <Bell size={15} className="text-amber-400" />
    }
  ];

  return (
    <div className="absolute right-0 top-12 w-80 sm:w-88 rounded-2xl bg-[#07132c]/98 border border-cyan-500/40 shadow-[0_10px_35px_rgba(0,240,255,0.25)] p-3 text-slate-100 z-50 backdrop-blur-xl animate-slide-up">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyan-500/20">
        <div className="flex items-center space-x-2">
          <Bell size={15} className="text-cyan-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider font-display">Thông báo hệ thống (3)</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
        {notifications.map((item) => (
          <div
            key={item.id}
            className="p-2.5 rounded-xl bg-[#091838]/80 hover:bg-[#0c204d] border border-slate-700/60 hover:border-cyan-500/40 transition-colors text-xs"
          >
            <div className="flex items-center space-x-1.5 mb-1">
              {item.icon}
              <strong className="text-slate-100 font-semibold">{item.title}</strong>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed pl-5">
              {item.desc}
            </p>
            <span className="text-[10px] text-slate-400 block mt-1 pl-5">
              {item.time}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationDropdown;