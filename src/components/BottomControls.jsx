import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Paperclip, Mic, Send, PhoneCall } from 'lucide-react';

const ORDER_STEP_PLACEHOLDERS = {
  ask_quantity: 'Nhập số lượng muốn mua (ví dụ: 1, 2 chiếc)...',
  ask_name: 'Nhập họ và tên của bạn...',
  ask_phone: 'Nhập số điện thoại liên hệ (10 chữ số)...',
  ask_note: 'Nhập địa chỉ, giờ tiện nghe máy hoặc phản hồi thêm...'
};

export const BottomControls = ({
  onSendMessage,
  onOpenPhoneModal,
  onMicClick,
  isListening = false,
  isThinking = false,
  isStreaming = false,
  isCatalogRevealed = false,
  orderStep = null,
  focusTick = 0
}) => {
  const [inputText, setInputText] = useState('');
  const inputRef = useRef(null);

  // 1. Tự động focus con trỏ chuột ngay khi khách hàng vừa vào webapp
  useEffect(() => {
    inputRef.current?.focus();

    // Thử lại sau các khoảng trễ nhỏ để đảm bảo vượt qua render ban đầu của trình duyệt
    const t1 = setTimeout(() => inputRef.current?.focus(), 100);
    const t2 = setTimeout(() => inputRef.current?.focus(), 300);
    const t3 = setTimeout(() => inputRef.current?.focus(), 600);

    // Khi người dùng chuyển tab và quay lại webapp
    const handleWindowFocus = () => {
      if (!isThinking && !isStreaming) {
        inputRef.current?.focus();
      }
    };
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  // 2. Luôn luôn giữ con trỏ chuột sẵn sàng sau khi robot trả lời xong, đổi bước hoặc kích hoạt focus
  useEffect(() => {
    if (!isThinking && !isStreaming) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isThinking, isStreaming, orderStep, focusTick]);

  const placeholderText =
    ORDER_STEP_PLACEHOLDERS[orderStep] || 'Nhập thông tin xưng hô hoặc câu hỏi của bạn...';

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!inputText.trim() || isThinking || isStreaming) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      className={`w-full grid gap-3.5 mt-3.5 transition-all duration-500 ${
        isCatalogRevealed ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 sm:grid-cols-[1fr_auto]'
      }`}
    >
      {/* LEFT CONTROL: CHAT INPUT CAPSULE BAR (Directly under Left Card) */}
      <div className="flex items-center w-full">
        <form
          onSubmit={handleSubmit}
          className="w-full flex items-center space-x-2.5 px-4 py-2.5 rounded-full bg-[#06122d]/95 border border-cyan-500/50 shadow-[0_0_20px_rgba(0,240,255,0.22)] backdrop-blur-xl focus-within:border-cyan-400 focus-within:shadow-[0_0_25px_rgba(0,240,255,0.4)] transition-all"
        >
          {/* Message Icon */}
          <div className="w-8 h-8 rounded-full bg-cyan-950/70 border border-cyan-500/40 flex items-center justify-center text-cyan-300 flex-shrink-0 shadow-inner">
            <MessageSquare size={15} />
          </div>

          {/* Text Input */}
          <input
            ref={inputRef}
            autoFocus
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholderText}
            disabled={isThinking || isStreaming}
            className="flex-1 bg-transparent text-xs sm:text-sm text-slate-100 placeholder-slate-400 outline-none"
          />

          {/* Attachment Icon */}
          <button
            type="button"
            className="text-slate-400 hover:text-cyan-300 p-1 flex-shrink-0 transition-colors"
            title="Đính kèm tệp tin"
          >
            <Paperclip size={18} />
          </button>

          {/* Mic Icon */}
          <button
            type="button"
            onClick={onMicClick}
            className={`p-1.5 rounded-full flex-shrink-0 transition-all ${
              isListening
                ? 'bg-rose-500 text-white animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.8)]'
                : 'text-slate-400 hover:text-cyan-300'
            }`}
            title={isListening ? 'Đang nghe... Nhấn để dừng' : 'Nói để nhập câu hỏi tiếng Việt'}
          >
            <Mic size={18} />
          </button>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || isThinking || isStreaming}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-bold text-xs sm:text-sm shadow-[0_0_15px_rgba(0,240,255,0.4)] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0 active:scale-95"
          >
            <Send size={13} className="fill-slate-950" />
            <span>Gửi</span>
          </button>
        </form>
      </div>

      {/* RIGHT CONTROL: ROYAL PURPLE / MAGENTA GLOWING CALL-TO-ACTION (Directly under Right Card) */}
      <div className="flex items-center w-full">
        <button
          onClick={onOpenPhoneModal}
          className="w-full flex items-center justify-between px-6 py-3 rounded-full bg-gradient-to-r from-[#6b1187] via-[#86198f] to-[#581c87] hover:brightness-110 text-white font-bold text-xs sm:text-sm border border-fuchsia-400/50 shadow-[0_0_25px_rgba(192,38,211,0.5)] active:scale-[0.99] transition-all group"
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
              <PhoneCall size={17} className="text-white" />
            </div>
            <span className="tracking-wide font-bold text-xs sm:text-sm">
              Yêu cầu chủ nhân gọi lại
            </span>
          </div>

          <div className="flex items-center text-fuchsia-200 group-hover:translate-x-1 transition-transform">
            <span className="font-mono text-lg font-black tracking-widest">≫</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default BottomControls;