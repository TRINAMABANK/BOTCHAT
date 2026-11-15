import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Paperclip, Mic, Send, VolumeX, Square } from 'lucide-react';

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
  onStopSpeaking,
  isListening = false,
  isSpeaking = false,
  isThinking = false,
  isStreaming = false,
  isCatalogRevealed = false,
  interimText = '',
  voiceAlert = null,
  onDismissVoiceAlert,
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
      if (!isThinking && !isStreaming && !isListening) {
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
    if (!isThinking && !isStreaming && !isListening) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isThinking, isStreaming, isListening, orderStep, focusTick]);

  const placeholderText = isListening
    ? '🎙️ Đang nghe giọng nói của bạn... Hãy nói câu hỏi'
    : (ORDER_STEP_PLACEHOLDERS[orderStep] || 'Nhập thông tin xưng hô hoặc câu hỏi của bạn...');

  const displayInputValue = isListening && interimText ? interimText : inputText;

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
    <div className="w-full mt-3.5 transition-all duration-500">
      {/* 1. Voice Alert Notification Banner */}
      {voiceAlert && (
        <div className="mb-2 px-4 py-2.5 rounded-2xl bg-amber-950/95 border border-amber-500/60 shadow-[0_0_18px_rgba(245,158,11,0.35)] flex items-center justify-between text-xs text-amber-200 animate-slide-up backdrop-blur-md">
          <div className="flex items-center space-x-2 min-w-0 mr-2">
            <span className="text-base flex-shrink-0">⚠️</span>
            <span className="leading-relaxed">{voiceAlert}</span>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            {onMicClick && !voiceAlert.includes('Cốc Cốc') && !voiceAlert.includes('Brave') && (
              <button
                type="button"
                onClick={() => {
                  if (onDismissVoiceAlert) onDismissVoiceAlert();
                  setTimeout(() => onMicClick(), 150);
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-500/30 hover:bg-amber-500/50 text-amber-200 hover:text-white font-bold text-[11px] border border-amber-400/50 transition-colors active:scale-95"
              >
                Thử lại
              </button>
            )}
            {onDismissVoiceAlert && (
              <button
                type="button"
                onClick={onDismissVoiceAlert}
                className="text-amber-400 hover:text-white font-bold text-sm px-1.5 py-0.5 rounded transition-colors"
                title="Đóng thông báo"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. Real-time Listening Banner with Interim Speech */}
      {isListening && (
        <div className="mb-2.5 px-4 py-2 rounded-2xl bg-cyan-950/95 border border-cyan-400/70 shadow-[0_0_20px_rgba(0,240,255,0.4)] flex items-center justify-between animate-fade-in backdrop-blur-md">
          <div className="flex items-center space-x-2.5 min-w-0">
            <span className="relative flex h-3 w-3 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
            <span className="text-xs font-bold text-cyan-300 flex-shrink-0">Đang nghe tiếng Việt:</span>
            <span className="text-xs text-white font-medium italic truncate">
              {interimText || 'Mời bạn nói câu hỏi hoặc tên sản phẩm...'}
            </span>
          </div>
          <button
            type="button"
            onClick={onMicClick}
            className="ml-2 px-3 py-1 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold flex-shrink-0 transition-all shadow-sm active:scale-95"
            title="Dừng nhận diện giọng nói"
          >
            Dừng nghe
          </button>
        </div>
      )}

      {/* 3. CHAT INPUT CAPSULE BAR */}
      <div className="flex items-center w-full">
        <form
          onSubmit={handleSubmit}
          className={`w-full flex items-center space-x-2.5 px-4 py-2.5 rounded-full bg-[#06122d]/95 border transition-all backdrop-blur-xl ${
            isListening
              ? 'border-rose-500/80 shadow-[0_0_25px_rgba(244,63,94,0.35)]'
              : 'border-cyan-500/50 shadow-[0_0_20px_rgba(0,240,255,0.22)] focus-within:border-cyan-400 focus-within:shadow-[0_0_25px_rgba(0,240,255,0.4)]'
          }`}
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
            value={displayInputValue}
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

          {/* Stop Speaking Button if Robot is currently speaking */}
          {isSpeaking && onStopSpeaking && (
            <button
              type="button"
              onClick={onStopSpeaking}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-[0_0_12px_rgba(244,63,94,0.6)] animate-pulse flex-shrink-0"
              title="Dừng robot đọc ngay lập tức"
            >
              <VolumeX size={14} />
              <span className="hidden sm:inline">Dừng nói</span>
            </button>
          )}

          {/* Mic Button */}
          <button
            type="button"
            onClick={onMicClick}
            className={`p-1.5 rounded-full flex-shrink-0 transition-all ${
              isListening
                ? 'bg-rose-500 text-white animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.9)] scale-110'
                : 'text-slate-400 hover:text-cyan-300'
            }`}
            title={isListening ? 'Đang nghe... Nhấn để dừng' : 'Nói để nhập câu hỏi tiếng Việt'}
          >
            <Mic size={18} />
          </button>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || isThinking || isStreaming || isListening}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-bold text-xs sm:text-sm shadow-[0_0_15px_rgba(0,240,255,0.4)] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0 active:scale-95"
          >
            <Send size={13} className="fill-slate-950" />
            <span>Gửi</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default BottomControls;