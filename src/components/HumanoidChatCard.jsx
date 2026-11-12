import React, { useRef, useEffect } from 'react';
import { Mic, MessageSquare, User, CheckCircle2, RotateCcw, Volume2, VolumeX, Sparkles } from 'lucide-react';
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
  onToggleVoice,
  onQuickPrompt,
  onResetChat,
  onMicClick
}) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking, isStreaming]);

  const currentMeta = STATE_META[botState] || STATE_META.idle;

  return (
    <div className="relative rounded-[26px] bg-[#050C1F]/90 border border-cyan-500/40 shadow-[0_0_35px_rgba(0,240,255,0.18)] p-3 md:p-4 flex flex-col md:flex-row gap-4 h-full min-h-[480px] overflow-hidden backdrop-blur-xl">
      {/* Background ambient light - deep cyan glow */}
      <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />

      {/* LEFT SUB-COLUMN: HUMANOID ROBOT FIGURE & AUDIO BAR (~42% width) */}
      <div className="flex flex-col items-center justify-between w-full md:w-[42%] relative z-10 flex-shrink-0">
        {/* Live State Pill */}
        <div className={`self-start inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold shadow-sm mb-1 ${currentMeta.text}`}>
          <span className={`w-2 h-2 rounded-full ${currentMeta.dot}`} />
          <span>{currentMeta.label}</span>
        </div>

        {/* Robot 3D Avatar Image with Sci-Fi Halo */}
        <div className="relative w-full flex-1 flex items-center justify-center min-h-[290px] md:min-h-[350px] overflow-hidden rounded-2xl group">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`w-64 h-64 rounded-full border border-cyan-500/25 ${botState === 'speaking' ? 'animate-spin' : ''} duration-1000`} />
            <div className="absolute w-52 h-52 rounded-full border border-sky-400/25" />
            <div className={`absolute w-44 h-44 rounded-full bg-cyan-500/20 blur-2xl ${botState === 'speaking' || botState === 'listening' ? 'scale-125' : ''} transition-transform duration-500`} />
          </div>

          <img
            src="/assets/humanoid_robot.png"
            alt="TRÍ AI Sales Humanoid Robot"
            className="relative z-10 max-h-[340px] md:max-h-[375px] object-contain drop-shadow-[0_12px_28px_rgba(0,240,255,0.4)] animate-float"
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
            {onToggleVoice && (
              <button
                onClick={onToggleVoice}
                className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-[11px] border transition-colors ${
                  voiceEnabled
                    ? 'bg-cyan-950/80 text-cyan-300 border-cyan-400/60'
                    : 'bg-slate-800/80 text-slate-400 hover:text-cyan-300 border-slate-700'
                }`}
                title={voiceEnabled ? 'Tắt giọng đọc AI' : 'Bật giọng đọc tiếng Việt AI'}
              >
                {voiceEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
                <span className="hidden sm:inline">{voiceEnabled ? 'Đang đọc' : 'Giọng nói'}</span>
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
          className="flex-1 overflow-y-auto overflow-x-hidden space-y-3 pr-1.5 custom-scrollbar text-xs leading-relaxed max-h-[340px] md:max-h-[370px]"
        >
          {messages.map((msg, idx) => {
            const isUser = msg.senderType === 'user' || msg.role === 'user';
            const timeStr = msg.createdAt
              ? new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
              : '10:25';

            return (
              <div
                key={msg.id || idx}
                className={`flex items-start space-x-2 min-w-0 animate-slide-up ${
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
                      className="w-7 h-7 rounded-full object-cover border border-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.6)]"
                    />
                  )}
                </div>

                <div className="flex flex-col min-w-0 max-w-[calc(100%-2.5rem)]">
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 shadow-md ${
                      isUser
                        ? 'bg-[#0f2444] text-slate-100 border border-cyan-500/40 rounded-tr-none'
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
                  </div>

                  <span
                    className={`text-[10px] text-slate-400 mt-1 px-1 ${
                      isUser ? 'text-right' : 'text-left'
                    }`}
                  >
                    {timeStr}
                  </span>
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

        {/* Smart Quick-Prompt Chips */}
        {onQuickPrompt && (
          <div className="w-full min-w-0 mt-2 pt-2 border-t border-cyan-500/15 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <Sparkles size={12} className="text-cyan-400 flex-shrink-0" />
            {QUICK_SUGGESTIONS.map((q) => (
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
