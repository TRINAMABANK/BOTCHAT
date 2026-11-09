import React, { useRef, useEffect } from 'react';
import { Mic, MessageSquare, User, CheckCircle2, RotateCcw } from 'lucide-react';
import AudioWaveform from './AudioWaveform';

export const HumanoidChatCard = ({
  messages = [],
  isThinking = false,
  isStreaming = false,
  botState = 'idle', // 'idle' | 'listening' | 'thinking' | 'speaking' | 'success' | 'error'
  onResetChat,
  onMicClick
}) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking, isStreaming]);

  return (
    <div className="relative rounded-[26px] bg-[#050C1F]/90 border border-cyan-500/40 shadow-[0_0_35px_rgba(0,240,255,0.18)] p-3 md:p-4 flex flex-col md:flex-row gap-4 h-full min-h-[480px] overflow-hidden backdrop-blur-xl">
      {/* Background ambient light - deep cyan glow */}
      <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />

      {/* LEFT SUB-COLUMN: HUMANOID ROBOT FIGURE & AUDIO BAR (~42% width) */}
      <div className="flex flex-col items-center justify-between w-full md:w-[42%] relative z-10 flex-shrink-0">
        {/* Robot 3D Avatar Image with Sci-Fi Halo */}
        <div className="relative w-full flex-1 flex items-center justify-center min-h-[300px] md:min-h-[370px] overflow-hidden rounded-2xl group">
          {/* Cyber Halo / Backdrop rings matching mockup */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`w-64 h-64 rounded-full border border-cyan-500/25 ${botState === 'speaking' ? 'animate-spin' : ''} duration-1000`} />
            <div className="absolute w-52 h-52 rounded-full border border-sky-400/25" />
            <div className={`absolute w-44 h-44 rounded-full bg-cyan-500/20 blur-2xl ${botState === 'speaking' ? 'scale-125' : ''} transition-transform duration-500`} />
          </div>

          {/* The High-Resolution Humanoid Robot Portrait with TRÍ AI on armor */}
          <img
            src="/assets/humanoid_robot.png"
            alt="TRÍ AI Sales Humanoid Robot"
            className="relative z-10 max-h-[360px] md:max-h-[390px] object-contain drop-shadow-[0_12px_28px_rgba(0,240,255,0.4)] animate-float"
          />
        </div>

        {/* Bottom Voice / Microphone & Audio Equalizer Bar */}
        <div className="w-full flex items-center justify-between space-x-2.5 px-3 py-2 rounded-2xl bg-[#071633]/90 border border-cyan-500/40 backdrop-blur-md shadow-lg shadow-cyan-950/40">
          {/* Circular Cyan Mic Button */}
          <button
            onClick={onMicClick}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
              botState === 'speaking' || botState === 'listening'
                ? 'bg-cyan-400 text-slate-950 shadow-[0_0_18px_rgba(0,240,255,0.9)] scale-105'
                : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/50 shadow-[0_0_12px_rgba(0,240,255,0.4)]'
            }`}
            title="Nhấn để bật micro nói chuyện với Robot"
          >
            <Mic size={17} />
          </button>

          {/* Dynamic Audio Equalizer Waveform */}
          <div className="flex-1 flex justify-center">
            <AudioWaveform
              isSpeaking={botState === 'speaking'}
              isListening={botState === 'listening'}
            />
          </div>
        </div>
      </div>

      {/* RIGHT SUB-COLUMN: HỘI THOẠI TƯ VẤN (~58% width) */}
      <div className="flex flex-col flex-1 min-h-[340px] relative z-10">
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

          <button
            onClick={onResetChat}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-[11px] text-slate-400 hover:text-cyan-300 border border-slate-700 transition-colors"
            title="Làm mới cuộc trò chuyện"
          >
            <RotateCcw size={11} />
            <span>Làm mới</span>
          </button>
        </div>

        {/* Scrollable Chat Area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar text-xs leading-relaxed max-h-[360px] md:max-h-[395px]"
        >
          {messages.map((msg, idx) => {
            const isUser = msg.senderType === 'user' || msg.role === 'user';
            const timeStr = msg.createdAt
              ? new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
              : '10:25';

            return (
              <div
                key={msg.id || idx}
                className={`flex items-start space-x-2 animate-slide-up ${
                  isUser ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                {/* Avatar Icon */}
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

                {/* Message Bubble */}
                <div className="flex flex-col max-w-[85%]">
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 shadow-md ${
                      isUser
                        ? 'bg-[#0f2444] text-slate-100 border border-cyan-500/40 rounded-tr-none'
                        : 'bg-[#0A1633]/90 text-slate-100 border border-cyan-500/30 rounded-tl-none backdrop-blur-sm'
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words">
                      {msg.content}
                    </div>

                    {/* Lead creation confirmation badge */}
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

          {/* Always Present AI Pulse / Thinking Indicator Pill (matches mockup image) */}
          <div className="flex items-start space-x-2 pt-0.5 animate-fade-in">
            <div className="bg-[#071633]/90 border border-cyan-500/40 rounded-full px-3 py-1.5 flex items-center space-x-1.5 shadow-md shadow-cyan-950/40">
              <span className={`w-1.5 h-1.5 rounded-full bg-cyan-400 ${isThinking ? 'animate-bounce' : 'animate-pulse'}`}></span>
              <span className={`w-1.5 h-1.5 rounded-full bg-cyan-300 ${isThinking ? 'animate-bounce [animation-delay:0.2s]' : 'animate-pulse [animation-delay:0.3s]'}`}></span>
              <span className={`w-1.5 h-1.5 rounded-full bg-sky-200 ${isThinking ? 'animate-bounce [animation-delay:0.4s]' : 'animate-pulse [animation-delay:0.6s]'}`}></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HumanoidChatCard;