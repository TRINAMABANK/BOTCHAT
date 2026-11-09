import React, { useState } from 'react';
import { MessageSquare, Paperclip, Mic, Send, PhoneCall } from 'lucide-react';

export const BottomControls = ({
  onSendMessage,
  onOpenPhoneModal,
  isThinking = false,
  isStreaming = false
}) => {
  const [inputText, setInputText] = useState('');

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
    <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-4 mt-3.5">
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
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập câu hỏi hoặc nhu cầu của anh/chị..."
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
            className="text-slate-400 hover:text-cyan-300 p-1 flex-shrink-0 transition-colors"
            title="Nói để nhập văn bản"
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