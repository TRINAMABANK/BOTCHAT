import React, { useState, useEffect, useRef } from 'react';
import { Send, Trash2, RotateCcw, Sparkles, User, Bot, CheckCircle2, ShieldCheck, Phone, ChevronDown } from 'lucide-react';

export const ChatStreamWindow = ({
  messages = [],
  isThinking = false,
  isStreaming = false,
  onSendMessage,
  onResetChat,
  selectedProduct,
  ownerName = 'Quang Nhựt Trí'
}) => {
  const [inputText, setInputText] = useState('');
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll logic respecting user manual scroll up
  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  };

  useEffect(() => {
    // If user is near bottom, keep auto-scrolling
    const container = scrollContainerRef.current;
    if (!container) return;

    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    if (isNearBottom || isStreaming) {
      scrollToBottom(true);
    }
  }, [messages, isThinking, isStreaming]);

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const isUp = container.scrollHeight - container.scrollTop - container.clientHeight > 150;
    setShowScrollBottom(isUp);
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!inputText.trim() || isThinking || isStreaming) return;
    onSendMessage(inputText.trim());
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextareaChange = (e) => {
    setInputText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  // Quick Action Prompts
  const quickPrompts = [
    'Tôi muốn hỏi giá sản phẩm này',
    'Chủ nhân có ưu đãi gì không?',
    'Cho tôi xin số điện thoại chủ nhân',
    'Tôi muốn đặt mua ngay'
  ];

  return (
    <div className="flex flex-col flex-1 min-h-[380px] h-[calc(100vh-370px)] bg-[#091024]/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden mt-3 backdrop-blur-md">
      {/* Chat Header Actions */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/80 border-b border-slate-800/80 text-xs text-slate-400">
        <div className="flex items-center space-x-2">
          <Sparkles size={14} className="text-cyan-400" />
          <span className="font-medium text-slate-300">Cửa sổ hội thoại trực tiếp</span>
          {selectedProduct && (
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/50 text-[10px] truncate max-w-[180px]">
              🎯 {selectedProduct.name}
            </span>
          )}
        </div>

        <button
          onClick={onResetChat}
          className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800/70 hover:bg-rose-900/30 text-slate-400 hover:text-rose-300 border border-slate-700/50 hover:border-rose-700/50 transition-all"
          title="Xóa hoặc bắt đầu cuộc trò chuyện mới theo chính sách lưu trữ"
        >
          <RotateCcw size={12} />
          <span>Làm mới hội thoại</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar relative"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-6 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3 animate-float">
              <Bot size={24} />
            </div>
            <h4 className="font-semibold text-slate-200 text-sm">Chào mừng bạn đến với TRÍ AI Sales Robot!</h4>
            <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
              Tôi là trợ lý bán hàng của chủ nhân ({ownerName}). Hãy bấm chọn sản phẩm bên Cột 2 (Product Selector) hoặc nhắn tin trực tiếp để tôi tư vấn nhé!
            </p>
          </div>
        )}

        {messages.map((msg, index) => {
          const isUser = msg.senderType === 'user' || msg.role === 'user';
          return (
            <div
              key={msg.id || index}
              className={`flex items-start space-x-3 animate-slide-up ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
            >
              {/* Avatar Icon */}
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs shadow-md ${
                  isUser
                    ? 'bg-gradient-to-tr from-cyan-600 to-blue-500 text-white'
                    : 'bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 text-white border border-cyan-400/40'
                }`}
              >
                {isUser ? <User size={15} /> : <Bot size={16} />}
              </div>

              {/* Message Bubble */}
              <div
                className={`relative max-w-[85%] md:max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-lg ${
                  isUser
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-none'
                    : 'bg-slate-800/90 text-slate-100 border border-slate-700/70 rounded-tl-none'
                }`}
              >
                {/* Formatted Markdown Content */}
                <div className="whitespace-pre-wrap break-words prose prose-invert prose-sm">
                  {msg.content}
                </div>

                {/* Lead Confirmation Card if Lead created in message */}
                {msg.metadata?.leadCreated && (
                  <div className="mt-3 p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center space-x-2">
                    <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-emerald-300">Đã lưu Lead CRM thành công!</div>
                      <div className="text-[11px] text-emerald-400/80">Trạng thái: NEW – WAITING FOR OWNER CONTACT</div>
                    </div>
                  </div>
                )}

                {/* Message Timestamp */}
                <div
                  className={`text-[10px] mt-1 text-right ${
                    isUser ? 'text-cyan-200/70' : 'text-slate-400'
                  }`}
                >
                  {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Vừa xong'}
                </div>
              </div>
            </div>
          );
        })}

        {/* AI Thinking Indicator */}
        {isThinking && (
          <div className="flex items-start space-x-3 animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-purple-600/40 border border-purple-500 flex items-center justify-center text-purple-300">
              <Bot size={16} />
            </div>
            <div className="bg-slate-800/80 border border-purple-500/30 rounded-2xl rounded-tl-none px-4 py-3 text-xs text-purple-300 flex items-center space-x-2 shadow-md">
              <span className="flex space-x-1">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]"></span>
              </span>
              <span>TRÍ AI đang phân tích dữ liệu và suy nghĩ phản hồi...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-24 right-6 p-2 rounded-full bg-cyan-500 text-slate-900 shadow-xl hover:bg-cyan-400 transition-all animate-bounce z-20"
          title="Cuộn xuống tin nhắn mới nhất"
        >
          <ChevronDown size={18} />
        </button>
      )}

      {/* Quick Prompts Bar */}
      <div className="px-3 py-1.5 bg-slate-900/60 border-t border-slate-800/80 flex items-center space-x-2 overflow-x-auto no-scrollbar">
        <span className="text-[10px] uppercase font-bold text-slate-500 flex-shrink-0">Gợi ý nhanh:</span>
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => onSendMessage(prompt)}
            disabled={isThinking || isStreaming}
            className="flex-shrink-0 text-xs px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-cyan-950/80 hover:text-cyan-300 border border-slate-700/60 hover:border-cyan-700/60 text-slate-300 transition-all disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Box & Send Button */}
      <form onSubmit={handleSubmit} className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-end space-x-2">
        <div className="flex-1 relative bg-slate-800/90 border border-slate-700 focus-within:border-cyan-400/80 rounded-xl transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputText}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Nhập tin nhắn cho TRÍ AI (Hỏi giá, so sánh, đặt mua, để lại SĐT...)"
            className="w-full bg-transparent px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-400 resize-none outline-none max-h-28 custom-scrollbar"
            disabled={isThinking || isStreaming}
          />
        </div>

        <button
          type="submit"
          disabled={!inputText.trim() || isThinking || isStreaming}
          className="p-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold transition-all shadow-lg hover:shadow-cyan-500/30 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          title="Gửi tin nhắn (Enter)"
        >
          <Send size={18} />
        </button>
      </form>

      {/* Micro Disclaimer on consent & policy */}
      <div className="px-3 py-1 bg-slate-950 text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-900">
        <span className="flex items-center space-x-1">
          <ShieldCheck size={11} className="text-emerald-400" />
          <span>Bảo mật dữ liệu • Chỉ kết nối khi có sự đồng ý của khách</span>
        </span>
        <span>Phản hồi trực tiếp từ AI Sales Engine</span>
      </div>
    </div>
  );
};

export default ChatStreamWindow;
