import React, { useRef, useEffect } from 'react';
import {
  Mic,
  MessageSquare,
  User,
  CheckCircle2,
  RotateCcw,
  Volume2,
  VolumeX,
  FastForward,
  Square
} from 'lucide-react';
import AudioWaveform from './AudioWaveform';

/**
 * Render inline **bold** and *italic* markdown cleanly without raw asterisks.
 */
function renderInlineFormatting(inlineText) {
  if (!inlineText) return null;
  const parts = String(inlineText).split(/(\*\*[^*]+\*\*|\*[^*\n]+\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-bold text-cyan-200">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={idx} className="italic text-slate-300">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

/**
 * Render formatted message text.
 */
function renderFormattedText(text) {
  if (!text) return null;
  const lines = String(text).split('\n');

  return lines.map((line, pIdx) => {
    const trimmed = line.trim();

    return (
      <div key={pIdx} className={pIdx > 0 && trimmed === '' ? 'h-2' : ''}>
        {renderInlineFormatting(line)}
      </div>
    );
  });
}

const STATE_META = {
  idle: { label: 'Sẵn sàng', dot: 'bg-emerald-400', text: 'text-emerald-300 border-emerald-500/40 bg-emerald-950/60' },
  listening: { label: 'Đang lắng nghe...', dot: 'bg-cyan-400 animate-ping', text: 'text-cyan-200 border-cyan-400/60 bg-cyan-950/70' },
  thinking: { label: 'Đang suy nghĩ...', dot: 'bg-amber-400 animate-bounce', text: 'text-amber-200 border-amber-400/50 bg-amber-950/60' },
  speaking: { label: 'Đang trả lời...', dot: 'bg-sky-400 animate-pulse', text: 'text-sky-200 border-sky-400/50 bg-sky-950/60' },
  success: { label: 'Đã ghi nhận Lead!', dot: 'bg-emerald-400', text: 'text-emerald-200 border-emerald-400/60 bg-emerald-950/80' },
  error: { label: 'Gián đoạn kết nối', dot: 'bg-rose-500', text: 'text-rose-200 border-rose-500/50 bg-rose-950/70' }
};

export const HumanoidChatCard = ({
  messages = [],
  isThinking = false,
  isStreaming = false,
  botState = 'idle',
  voiceEnabled = false,
  availableFields = [],
  isCatalogRevealed = false,
  isMobile = false,
  onPickField,
  onSkipStreaming,
  onToggleVoice,
  onSpeakMessage,
  onStopSpeaking,
  onQuickPrompt,
  onResetChat,
  onMicClick,
  onTriggerAction,
  onViewProductDetail
}) => {
  const scrollRef = useRef(null);
  const latestMsgRef = useRef(null);
  const isUserScrolledRef = useRef(false);
  const lastAutoScrollTopRef = useRef(0);

  /**
   * Cuộn tin mới nhất vào chính giữa trung tâm khung hội thoại.
   */
  const scrollToLatestCenter = (smooth = true) => {
    if (isUserScrolledRef.current) return;
    const container = scrollRef.current;
    const target = latestMsgRef.current;
    if (!container || !target) return;

    requestAnimationFrame(() => {
      if (!container || !target) return;
      const targetOffsetTop = target.offsetTop;
      const targetHeight = target.offsetHeight;
      const containerHeight = container.clientHeight;

      let desiredScrollTop;
      // Nếu tin nhắn dài hơn chiều cao khung nhìn, căn lề trên cách 16px để người đọc đọc từ đầu
      if (targetHeight >= containerHeight - 30) {
        desiredScrollTop = targetOffsetTop - 16;
      } else {
        // Căn tin nhắn ở chính giữa trung tâm chiều dọc
        const targetCenter = targetOffsetTop + targetHeight / 2;
        desiredScrollTop = targetCenter - containerHeight / 2;
      }

      const maxScroll = Math.max(0, container.scrollHeight - containerHeight);
      const clampedScrollTop = Math.max(0, Math.min(desiredScrollTop, maxScroll));

      lastAutoScrollTopRef.current = clampedScrollTop;
      container.scrollTo({
        top: clampedScrollTop,
        behavior: smooth ? 'smooth' : 'auto'
      });
    });
  };

  // Luôn căn giữa tin mới nhất mỗi khi có tin nhắn mới hoặc robot bắt đầu suy nghĩ
  useEffect(() => {
    isUserScrolledRef.current = false;
    scrollToLatestCenter(true);
  }, [messages.length, isThinking]);

  // Xử lý khi chữ chạy (streaming) và khi hoàn thành câu trả lời
  useEffect(() => {
    if (isStreaming) {
      if (isUserScrolledRef.current) return;
      const container = scrollRef.current;
      const target = latestMsgRef.current;
      if (!container || !target) return;

      const targetOffsetTop = target.offsetTop;
      const targetHeight = target.offsetHeight;
      const containerHeight = container.clientHeight;

      const messageBottom = targetOffsetTop + targetHeight;
      const visibleBottom = container.scrollTop + containerHeight;
      if (messageBottom > visibleBottom - 24) {
        container.scrollTo({
          top: messageBottom - containerHeight + 36,
          behavior: 'auto'
        });
      }
    } else {
      scrollToLatestCenter(true);
    }
  }, [messages, isStreaming]);

  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container) return;
    if (container.scrollTop < lastAutoScrollTopRef.current - 60) {
      isUserScrolledRef.current = true;
    } else if (container.scrollTop >= lastAutoScrollTopRef.current - 20) {
      isUserScrolledRef.current = false;
    }
  };

  const currentMeta = STATE_META[botState] || STATE_META.idle;

  return (
    <div className="relative rounded-[26px] bg-[#050C1F]/90 border border-cyan-500/40 shadow-[0_0_35px_rgba(0,240,255,0.18)] p-3 md:p-4 flex flex-col md:flex-row gap-3 md:gap-4 h-full min-h-[380px] md:min-h-[480px] overflow-hidden backdrop-blur-xl">
      {/* Background ambient light - deep cyan glow */}
      <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />

      {/* LEFT SUB-COLUMN: HUMANOID ROBOT FIGURE & AUDIO BAR (~40% on tablet/desktop) */}
      <div className="flex flex-col items-center justify-between w-full md:w-[38%] lg:w-[42%] relative z-10 flex-shrink-0">
        {/* Live State Pill */}
        <div className={`self-start inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold shadow-sm mb-1 ${currentMeta.text}`}>
          <span className={`w-2 h-2 rounded-full ${currentMeta.dot}`} />
          <span>{currentMeta.label}</span>
        </div>

        {/* Robot 3D Avatar Image with Sci-Fi Halo */}
        <div className="relative w-full flex-1 flex items-center justify-center min-h-[120px] sm:min-h-[160px] md:min-h-[350px] max-h-[135px] sm:max-h-[180px] md:max-h-none overflow-hidden rounded-2xl group my-1 md:my-0">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`w-36 h-36 sm:w-48 sm:h-48 md:w-64 md:h-64 rounded-full border border-cyan-500/25 ${botState === 'speaking' ? 'animate-spin' : ''} duration-1000`} />
            <div className="absolute w-28 h-28 sm:w-36 sm:h-36 md:w-52 md:h-52 rounded-full border border-sky-400/25" />
            <div className={`absolute w-20 h-20 sm:w-28 sm:h-28 md:w-44 md:h-44 rounded-full bg-cyan-500/20 blur-xl md:blur-2xl ${botState === 'speaking' || botState === 'listening' ? 'scale-125' : ''} transition-transform duration-500`} />
          </div>

          <img
            src="/assets/humanoid_robot.png"
            alt="TRÍ AI Sales Humanoid Robot"
            className="relative z-10 max-h-[120px] sm:max-h-[165px] md:max-h-[375px] object-contain rounded-2xl drop-shadow-[0_12px_28px_rgba(0,240,255,0.4)] animate-float"
          />
        </div>

        {/* Bottom Voice / Microphone & Audio Equalizer Bar */}
        <div className="w-full flex items-center justify-between space-x-2.5 px-3 py-2 rounded-2xl bg-[#071633]/90 border border-cyan-500/40 backdrop-blur-md shadow-lg shadow-cyan-950/40">
          <button
            onClick={onMicClick}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
              botState === 'listening'
                ? 'bg-rose-500 text-white shadow-[0_0_18px_rgba(244,63,94,0.9)] scale-105 animate-pulse'
                : botState === 'speaking'
                  ? 'bg-cyan-400 text-slate-950 shadow-[0_0_18px_rgba(0,240,255,0.9)] scale-105'
                  : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/50 shadow-[0_0_12px_rgba(0,240,255,0.4)]'
            }`}
            title={botState === 'listening' ? 'Đang nghe... Nhấn để dừng' : 'Nhấn để nói tiếng Việt trực tiếp với Robot'}
          >
            <Mic size={17} />
          </button>

          <div className="flex-1 flex justify-center">
            <AudioWaveform
              isSpeaking={botState === 'speaking'}
              isListening={botState === 'listening'}
            />
          </div>

          {/* Nút dừng phát giọng nói nhanh khi robot đang đọc */}
          {botState === 'speaking' && onStopSpeaking && (
            <button
              type="button"
              onClick={onStopSpeaking}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white text-[11px] font-bold shadow-[0_0_12px_rgba(244,63,94,0.7)] animate-pulse transition-all flex-shrink-0 active:scale-95"
              title="Dừng robot phát giọng nói ngay lập tức"
            >
              <VolumeX size={13} />
              <span>Dừng</span>
            </button>
          )}
        </div>
      </div>

      {/* RIGHT SUB-COLUMN: HỘI THOẠI TƯ VẤN (~58% width) */}
      <div className="flex flex-col flex-1 min-w-0 min-h-[340px] relative z-10">
        {/* Header: Hội thoại tư vấn */}
        <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-cyan-500/20">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-[0_0_8px_rgba(0,240,255,0.4)]">
              <MessageSquare size={13} />
            </div>
            <h3 className="text-sm font-bold text-slate-100 font-display tracking-wide">
              Hội thoại tư vấn
            </h3>
          </div>

          <div className="flex items-center space-x-1.5">
            {isStreaming && onSkipStreaming && (
              <button
                type="button"
                onClick={onSkipStreaming}
                className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 text-[11px] text-cyan-300 border border-cyan-400/50 transition-colors animate-pulse"
                title="Hiển thị toàn bộ nội dung ngay"
              >
                <FastForward size={11} />
                <span className="hidden sm:inline">Hiện nhanh</span>
              </button>
            )}

            {/* Dừng đọc nhanh trong header khi Robot đang phát âm */}
            {botState === 'speaking' && onStopSpeaking && (
              <button
                type="button"
                onClick={onStopSpeaking}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-rose-950/90 hover:bg-rose-900 text-rose-300 border border-rose-500/60 text-[11px] font-bold shadow-sm animate-pulse transition-all"
                title="Dừng robot đọc"
              >
                <VolumeX size={12} />
                <span>Dừng đọc</span>
              </button>
            )}

            {onToggleVoice && (
              <button
                type="button"
                onClick={onToggleVoice}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[11px] border font-medium transition-all ${
                  voiceEnabled
                    ? 'bg-cyan-500/25 text-cyan-300 border-cyan-400/80 shadow-[0_0_12px_rgba(0,240,255,0.45)]'
                    : 'bg-slate-800/90 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/60 border-slate-700'
                }`}
                title={voiceEnabled ? 'Nhấn để tắt giọng đọc tiếng Việt' : 'Nhấn để BẬT giọng đọc tiếng Việt của Robot'}
              >
                {voiceEnabled ? (
                  <Volume2 size={13} className="text-cyan-300 animate-pulse flex-shrink-0" />
                ) : (
                  <VolumeX size={13} className="flex-shrink-0" />
                )}
                <span>{voiceEnabled ? 'Giọng đọc: BẬT' : 'Bật giọng nói'}</span>
              </button>
            )}

            <button
              onClick={onResetChat}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-[11px] text-slate-400 hover:text-cyan-300 border border-slate-700 transition-colors"
              title="Làm mới cuộc trò chuyện"
            >
              <RotateCcw size={11} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        {/* Scrollable Chat Area */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto overflow-x-hidden space-y-3.5 pr-1.5 custom-scrollbar text-xs leading-relaxed max-h-[420px] md:max-h-[520px] pb-6"
        >
          {messages.length === 0 ? (
            <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center p-6 text-slate-300 select-none">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-600/30 via-blue-600/20 to-purple-600/30 border border-cyan-400/40 flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.25)] mb-3 relative">
                <img
                  src="/assets/ai_avatar.png"
                  alt="TRÍ AI"
                  className="w-12 h-12 rounded-full object-cover"
                />
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              </div>
              <h4 className="text-sm font-semibold text-cyan-300 flex items-center gap-1.5 mb-1">
                TRÍ AI – Chuyên Viên Tư Vấn Thông Minh
              </h4>
              <p className="text-slate-400 text-[11px] max-w-xs leading-relaxed mb-4">
                Dạ em sẵn sàng hỗ trợ! Anh/Chị có thể nhắn tin hoặc bấm micro để bắt đầu trao đổi bất kỳ lúc nào ạ.
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                {[
                  'Tư vấn sản phẩm phù hợp',
                  'Báo giá chính hãng tốt nhất',
                  'Chính sách bảo hành & giao hàng'
                ].map((prompt, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => onQuickPrompt && onQuickPrompt(prompt)}
                    className="px-3 py-1.5 rounded-full bg-slate-800/80 hover:bg-cyan-950/80 text-[11px] text-slate-300 hover:text-cyan-300 border border-slate-700/80 hover:border-cyan-400/60 transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    💬 {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => {
            const isUser = msg.senderType === 'user' || msg.role === 'user';
            const isLatest = idx === messages.length - 1;
            const timeStr = msg.createdAt
              ? new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
              : '10:25';

            return (
              <div
                key={msg.id || idx}
                ref={isLatest ? latestMsgRef : null}
                className={`flex items-start space-x-2 min-w-0 transition-all duration-300 ${
                  isUser ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {isUser ? (
                    <div className="w-7 h-7 rounded-full bg-[#0a2342] border border-cyan-400 flex items-center justify-center text-cyan-300 shadow-[0_0_8px_rgba(0,240,255,0.4)]">
                      <User size={13} className="text-cyan-200" />
                    </div>
                  ) : (
                    <img
                      src="/assets/ai_avatar.png"
                      alt="TRÍ AI"
                      className={`w-7 h-7 rounded-full object-cover border transition-all ${
                        isLatest
                          ? 'border-cyan-300 shadow-[0_0_14px_rgba(0,240,255,0.8)] scale-105'
                          : 'border-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.6)]'
                      }`}
                    />
                  )}
                </div>

                <div className="flex flex-col min-w-0 max-w-[calc(100%-2.5rem)]">
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 shadow-md transition-all duration-300 ${
                      isUser
                        ? 'bg-[#0f2444] text-slate-100 border border-cyan-500/40 rounded-tr-none'
                        : isLatest
                        ? 'bg-[#0b1836]/95 text-slate-100 border-2 border-cyan-400/80 rounded-tl-none backdrop-blur-md shadow-[0_0_24px_rgba(0,240,255,0.22)] ring-1 ring-cyan-400/30'
                        : 'bg-[#0A1633]/90 text-slate-100 border border-cyan-500/30 rounded-tl-none backdrop-blur-sm'
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words leading-relaxed">
                      {isUser ? msg.content : renderFormattedText(msg.content)}
                    </div>

                    {msg.metadata?.leadCreated && (
                      <div className="mt-2.5 p-2 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-[11px] flex items-center space-x-2">
                        <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
                        <div>
                          <strong>Đã lưu Lead CRM thành công!</strong>
                          <div className="text-[10px] text-emerald-400/80">Trạng thái: NEW – WAITING FOR OWNER CONTACT</div>
                        </div>
                      </div>
                    )}

                    {/* Interactive Confirmation Button for Reset Chat */}
                    {!isUser && (msg.isResetPrompt || msg.metadata?.isResetPrompt || msg.actionType === 'CONFIRM_RESET_CHAT' || msg.metadata?.actionType === 'CONFIRM_RESET_CHAT' || (msg.content && msg.content.includes('Xác nhận Làm mới'))) && (
                      <div className="mt-3 pt-2.5 border-t border-cyan-500/30 flex flex-wrap gap-2 items-center">
                        <button
                          type="button"
                          onClick={() => (onResetChat ? onResetChat(true) : null)}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium text-xs shadow-lg shadow-cyan-900/40 border border-cyan-400/60 transition-all transform active:scale-95 cursor-pointer"
                        >
                          <RotateCcw size={13} className="text-cyan-200 animate-spin-reverse" />
                          <span>🔄 Xác nhận Làm mới</span>
                        </button>
                      </div>
                    )}

                    {/* Quick Confirmation Chips (Chỉ hiển thị các nút xác nhận reset an toàn, không hiển thị nút chức năng nghiệp vụ) */}
                    {!isUser && isLatest && (msg.suggestedActions || msg.metadata?.suggestedActions) && (
                      (msg.suggestedActions || msg.metadata?.suggestedActions).filter(act => 
                        act.action === 'reset_chat' || act.action === 'request_reset_chat' || act.action === 'cancel_reset'
                      )
                    ).length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-cyan-500/20 flex flex-wrap gap-1.5 items-center">
                        {(msg.suggestedActions || msg.metadata?.suggestedActions)
                          .filter(act => act.action === 'reset_chat' || act.action === 'request_reset_chat' || act.action === 'cancel_reset')
                          .map((act, actIdx) => (
                          <button
                            key={act.id || actIdx}
                            type="button"
                            onClick={() => {
                              if (act.action === 'reset_chat') {
                                if (onResetChat) onResetChat(true);
                              } else if (act.action === 'request_reset_chat') {
                                if (onQuickPrompt) onQuickPrompt('Xóa nội dung chat');
                              } else if (act.action === 'cancel_reset') {
                                if (onQuickPrompt) onQuickPrompt('Tiếp tục trò chuyện');
                              }
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all transform active:scale-95 flex items-center space-x-1 cursor-pointer ${
                              act.action === 'reset_chat'
                                ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-900/50 border border-cyan-400'
                                : act.action === 'request_reset_chat'
                                ? 'bg-amber-950/70 hover:bg-amber-900/90 text-amber-300 border border-amber-500/40'
                                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-cyan-300 border border-slate-700/80 hover:border-cyan-500/40'
                            }`}
                          >
                            <span>{act.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div
                    className={`flex items-center text-[10px] text-slate-400 mt-1 px-1 ${
                      isUser ? 'justify-end' : 'justify-between'
                    }`}
                  >
                    <span>{timeStr}</span>
                    {!isUser && msg.content && (onSpeakMessage || onStopSpeaking) && (
                      <button
                        type="button"
                        onClick={() => {
                          if (botState === 'speaking' && onStopSpeaking) {
                            onStopSpeaking();
                          } else if (onSpeakMessage) {
                            onSpeakMessage(msg.content);
                          }
                        }}
                        className={`flex items-center space-x-1 py-0.5 px-2 rounded-md border text-[10px] font-medium transition-all ml-2 ${
                          botState === 'speaking'
                            ? 'text-rose-300 bg-rose-950/70 border-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.4)]'
                            : 'text-cyan-400/80 hover:text-cyan-200 hover:bg-cyan-950/60 border-transparent hover:border-cyan-500/30'
                        }`}
                        title={botState === 'speaking' ? 'Dừng đọc' : 'Nghe Robot đọc câu trả lời này bằng tiếng Việt'}
                      >
                        {botState === 'speaking' ? <VolumeX size={11} /> : <Volume2 size={11} />}
                        <span>{botState === 'speaking' ? 'Dừng đọc' : 'Đọc lại'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          }))}

          {/* Thinking indicator */}
          {(isThinking || isStreaming) && (
            <div className="flex items-start space-x-2 pt-0.5 animate-fade-in">
              <div className="bg-[#071633]/90 border border-cyan-500/40 rounded-full px-3 py-1.5 flex items-center space-x-1.5 shadow-md shadow-cyan-950/40">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-sky-200 animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HumanoidChatCard;
