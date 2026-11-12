import React, { useState } from 'react';
import { PhoneCall, X, ShieldCheck, CheckCircle2, User, Phone, MessageSquare } from 'lucide-react';

export const PhoneContactModal = ({
  isOpen = false,
  onClose,
  onSubmit,
  selectedProduct = null,
  ownerName = 'Quang Nhựt Trí'
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [consent, setConsent] = useState(true);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    const phoneRegex = /^0[3|5|7|8|9][0-9]{8}$/;

    if (!cleanPhone) {
      setError('Vui lòng nhập số điện thoại.');
      return;
    }

    if (!phoneRegex.test(cleanPhone)) {
      setError('Số điện thoại không hợp lệ (Cần 10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09).');
      return;
    }

    if (!consent) {
      setError('Vui lòng tích đồng ý để chủ nhân có thể liên hệ với bạn.');
      return;
    }

    onSubmit({
      name: name.trim() || 'Quý khách',
      phone: cleanPhone,
      note: note.trim(),
      consent
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#07132c]/95 border-2 border-fuchsia-500/40 rounded-3xl p-6 shadow-[0_0_50px_rgba(192,38,211,0.3)] text-slate-100 animate-slide-up">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-700 via-fuchsia-700 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-fuchsia-500/30">
            <PhoneCall size={24} />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-100 font-display">
              KẾT NỐI VỚI CHỦ NHÂN
            </h3>
            <p className="text-xs text-fuchsia-300 font-medium">
              Chủ nhân ({ownerName}) sẽ liên hệ lại trực tiếp
            </p>
          </div>
        </div>

        {selectedProduct && (
          <div className="p-2.5 rounded-xl bg-[#091a3e]/80 border border-fuchsia-500/30 text-xs text-fuchsia-200 mb-4 flex items-center justify-between">
            <span className="text-slate-400">Sản phẩm quan tâm:</span>
            <strong className="text-white truncate max-w-[200px]">{selectedProduct.name}</strong>
          </div>
        )}

        {error && (
          <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs mb-3">
            ⚠️ {error}
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-300 mb-1 font-semibold">Họ và tên của bạn:</label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn Minh"
                className="w-full bg-[#0a1b38] border border-slate-700 focus:border-fuchsia-400 rounded-xl pl-9 pr-3 py-2 text-slate-100 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 mb-1 font-semibold">Số điện thoại liên hệ (*):</label>
            <div className="relative">
              <Phone size={15} className="absolute left-3 top-2.5 text-fuchsia-400" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ví dụ: 0988123456"
                className="w-full bg-[#0a1b38] border border-slate-700 focus:border-fuchsia-400 rounded-xl pl-9 pr-3 py-2 text-white font-mono outline-none font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 mb-1 font-semibold">Nhu cầu cụ thể hoặc thời gian tiện nghe máy:</label>
            <div className="relative">
              <MessageSquare size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ví dụ: Cần tư vấn máy đếm tiền cho chi nhánh..."
                className="w-full bg-[#0a1b38] border border-slate-700 focus:border-fuchsia-400 rounded-xl pl-9 pr-3 py-2 text-slate-100 outline-none"
              />
            </div>
          </div>

          {/* Consent Checkbox */}
          <div className="flex items-start space-x-2 pt-1">
            <input
              type="checkbox"
              id="modalConsent"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 rounded border-slate-700 bg-slate-900 text-fuchsia-500 focus:ring-fuchsia-500"
            />
            <label htmlFor="modalConsent" className="text-[11px] text-slate-300 leading-tight">
              Tôi đồng ý để chủ nhân trực tiếp liên hệ tư vấn và gửi bảng báo giá ưu đãi.
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-purple-700 via-fuchsia-700 to-purple-800 hover:brightness-110 text-white font-bold text-sm shadow-lg shadow-purple-900/50 active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
          >
            <PhoneCall size={16} />
            <span>GỬI YÊU CẦU LIÊN HỆ NGAY</span>
          </button>
        </form>

        {/* Micro Privacy Note */}
        <div className="mt-3 text-center text-[10px] text-slate-400 flex items-center justify-center space-x-1">
          <ShieldCheck size={11} className="text-emerald-400" />
          <span>Bảo mật 100% • Không chia sẻ thông tin cho bên thứ 3</span>
        </div>
      </div>
    </div>
  );
};

export default PhoneContactModal;