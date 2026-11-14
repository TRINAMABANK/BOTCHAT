import React, { useRef, useEffect } from 'react';
import {
  Mic,
  MessageSquare,
  User,
  CheckCircle2,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Layers,
  FastForward,
  ShoppingCart,
  Eye
} from 'lucide-react';
import AudioWaveform from './AudioWaveform';

/**
 * Render inline **bold** and *italic* markdown cleanly without raw asterisks.
 */
function renderFormattedText(text) {
  if (!text) return null;
  const parts = String(text).split(/(\*\*[^*]+\*\*|\*[^*\n]+\*)/g);
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

const STATE_META = {
  idle: { label: 'Sẵn sàng', dot: 'bg-emerald-400', text: 'text-emerald-300 border-emerald-500/40 bg-emerald-950/60' },
  listening: { label: 'Đang lắng nghe...', dot: 'bg-cyan-400 animate-ping', text: 'text-cyan-200 border-cyan-400/60 bg-cyan-950/70' },
  thinking: { label: 'Đang suy nghĩ...', dot: 'bg-amber-400 animate-bounce', text: 'text-amber-200 border-amber-400/50 bg-amber-950/60' },
  speaking: { label: 'Đang trả lời...', dot: 'bg-sky-400 animate-pulse', text: 'text-sky-200 border-sky-400/50 bg-sky-950/60' },
  success: { label: 'Đã ghi nhận Lead!', dot: 'bg-emerald-400', text: 'text-emerald-200 border-emerald-400/60 bg-emerald-950/80' },
  error: { label: 'Gián đoạn kết nối', dot: 'bg-rose-500', text: 'text-rose-200 border-rose-500/50 bg-rose-950/70' }
};

const QUICK_SUGGESTIONS = [
  'So sánh 3 mẫu máy đếm tiền',
  'Máy nào giá dưới 5 triệu?',
  'Cần máy đếm ngoại tệ & chống tiền giả',
  'Xin số điện thoại chủ nhân'
];

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
            className="relative z-10 max-h-[120px] sm:max-h-[165px] md:max-h-[375px] object-contain drop-shadow-[0_12px_28px_rgba(0,240,255,0.4)] animate-float"
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
          className="flex-1 overflow-y-auto overflow-x-hidden space-y-3.5 pr-1.5 custom-scrollbar text-xs leading-relaxed max-h-[340px] md:max-h-[370px] pb-36"
        >
          {messages.map((msg, idx) => {
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

                    {/* Inline Product Showcase Cards: trình bày trực tiếp sản phẩm trong ô chat */}
                    {!isUser && msg.metadata?.products && msg.metadata.products.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-cyan-500/25 space-y-2">
                        <div className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider flex items-center space-x-1">
                          <Sparkles size={11} className="text-cyan-400" />
                          <span>Sản phẩm ({msg.metadata.products.length}):</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {msg.metadata.products.map((p) => (
                            <div
                              key={p.id || p.slug || p.name}
                              className="rounded-xl bg-[#061430]/95 border border-cyan-500/40 hover:border-cyan-400/80 p-2.5 flex flex-col sm:flex-row gap-2.5 shadow-[0_0_15px_rgba(0,240,255,0.1)] transition-all"
                            >
                              {/* Product Thumbnail */}
                              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-slate-950 border border-cyan-500/30 overflow-hidden flex-shrink-0 flex items-center justify-center p-1 mx-auto sm:mx-0">
                                <img
                                  src={p.image_url || '/assets/products/xiudun-2166.jpg'}
                                  alt={p.name}
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = '/assets/products/xiudun-2166.jpg';
                                  }}
                                />
                              </div>

                              {/* Product Info */}
                              <div className="flex-1 min-w-0 flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {p.field && (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-cyan-950/90 text-cyan-300 border border-cyan-400/40">
                                        {p.field}
                                      </span>
                                    )}
                                    {p.group_name && (
                                      <span className="text-[9px] text-slate-400">
                                        • {p.group_name}
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="text-xs font-bold text-white line-clamp-2 mt-1 leading-tight">
                                    {p.name}
                                  </h4>
                                  <div className="text-xs font-extrabold text-cyan-300 mt-1">
                                    {p.price_formatted || (p.price ? `${Number(p.price).toLocaleString('vi-VN')} ₫` : 'Liên hệ')}
                                  </div>
                                  {(p.short_description || p.description) && (
                                    <p className="text-[10px] text-slate-300 line-clamp-2 mt-0.5 leading-snug">
                                      {p.short_description || p.description}
                                    </p>
                                  )}
                                </div>

                                {/* Instant Action Buttons */}
                                <div className="flex items-center gap-1.5 mt-2 pt-1.5 border-t border-cyan-500/20">
                                  {onTriggerAction && (
                                    <button
                                      type="button"
                                      onClick={() => onTriggerAction('Đặt mua ngay', p)}
                                      className="flex-1 flex items-center justify-center space-x-1 py-1.5 px-2.5 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-bold text-[10px] shadow-[0_0_10px_rgba(0,240,255,0.4)] transition-all active:scale-95"
                                    >
                                      <ShoppingCart size={11} className="fill-slate-950" />
                                      <span>Đặt mua ngay</span>
                                    </button>
                                  )}
                                  {onViewProductDetail && (
                                    <button
                                      type="button"
                                      onClick={() => onViewProductDetail(p)}
                                      className="flex items-center justify-center space-x-1 py-1.5 px-2.5 rounded-lg bg-[#0c2044] hover:bg-cyan-950 text-cyan-200 border border-cyan-400/40 text-[10px] font-semibold transition-all active:scale-95"
                                      title="Xem bảng thông số chi tiết"
                                    >
                                      <Eye size={11} />
                                      <span>Chi tiết</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {msg.metadata?.leadCreated && (
                      <div className="mt-2.5 p-2 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-[11px] flex items-center space-x-2">
                        <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
                        <div>
                          <strong>Đã lưu Lead CRM thành công!</strong>
                          <div className="text-[10px] text-emerald-400/80">Trạng thái: NEW – WAITING FOR OWNER CONTACT</div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div
                    className={`flex items-center text-[10px] text-slate-400 mt-1 px-1 ${
                      isUser ? 'justify-end' : 'justify-between'
                    }`}
                  >
                    <span>{timeStr}</span>
                    {!isUser && msg.content && onSpeakMessage && (
                      <button
                        type="button"
                        onClick={() => onSpeakMessage(msg.content)}
                        className="flex items-center space-x-1 text-cyan-400/80 hover:text-cyan-200 transition-colors py-0.5 px-1.5 rounded hover:bg-cyan-950/60 border border-transparent hover:border-cyan-500/30 ml-2"
                        title="Nghe Robot đọc lại nội dung này bằng tiếng Việt"
                      >
                        <Volume2 size={11} />
                        <span>Đọc lại</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

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

        {/* Dynamic Field Discovery Bar (Guides customer to pick a field & unlocks Column 2!) */}
        {availableFields.length > 0 && onPickField && (
          <div className="w-full min-w-0 mt-2 pt-2 border-t border-cyan-500/20">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1">
                <Layers size={11} className="text-cyan-400" />
                <span>
                  {isCatalogRevealed
                    ? 'Đổi nhanh lĩnh vực sản phẩm:'
                    : isMobile
                    ? 'Chọn lĩnh vực để xem sản phẩm:'
                    : 'Chọn lĩnh vực để mở sản phẩm trực quan:'}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {availableFields.map((fld) => (
                <button
                  key={fld}
                  type="button"
                  disabled={isThinking || isStreaming}
                  onClick={() => onPickField(fld)}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#0b234d] to-[#0a1938] hover:from-cyan-500 hover:to-blue-500 hover:text-slate-950 border border-cyan-400/45 hover:border-cyan-300 text-[11px] font-bold text-cyan-100 whitespace-nowrap transition-all shadow-[0_0_12px_rgba(0,240,255,0.14)] hover:shadow-[0_0_18px_rgba(0,240,255,0.45)] active:scale-95 disabled:opacity-50"
                >
                  {fld}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Smart Quick-Prompt Chips */}
        {onQuickPrompt && (
          <div className="w-full min-w-0 mt-1.5 pt-1.5 border-t border-cyan-500/15 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <Sparkles size={12} className="text-cyan-400 flex-shrink-0" />
            {(isCatalogRevealed
              ? QUICK_SUGGESTIONS
              : ['Bên em đang bán những gì?', 'Máy nào giá dưới 5 triệu?', 'So sánh 3 mẫu máy đếm tiền', 'Xin số điện thoại chủ nhân']
            ).map((q) => (
              <button
                key={q}
                type="button"
                disabled={isThinking || isStreaming}
                onClick={() => onQuickPrompt(q)}
                className="px-2.5 py-1 rounded-full bg-[#091a3d] hover:bg-cyan-950/80 border border-cyan-500/30 hover:border-cyan-400 text-[10px] text-cyan-200 whitespace-nowrap transition-all disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HumanoidChatCard;
