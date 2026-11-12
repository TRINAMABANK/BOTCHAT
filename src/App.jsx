import React, { useState, useEffect } from 'react';
import HumanoidChatCard from './components/HumanoidChatCard';
import ProductSelectorCard from './components/ProductSelectorCard';
import BottomControls from './components/BottomControls';
import PhoneContactModal from './components/PhoneContactModal';
import OwnerDashboard from './components/OwnerDashboard';
import MobileDrawer from './components/MobileDrawer';
import ProductDetailModal from './components/ProductDetailModal';
import GuideModal from './components/GuideModal';
import NotificationDropdown from './components/NotificationDropdown';
import {
  HelpCircle,
  Bell,
  User,
  Shield,
  ShoppingCart
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const App = () => {
  // Chat & Conversation States
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [botState, setBotState] = useState('idle'); // 'idle' | 'listening' | 'thinking' | 'speaking' | 'success' | 'error'
  const [isThinking, setIsThinking] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [orderStep, setOrderStep] = useState(null);
  const [inputFocusTick, setInputFocusTick] = useState(0);

  // Products & Hierarchy
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [detailProduct, setDetailProduct] = useState(null);

  // Bot & System Settings
  const [settings, setSettings] = useState({
    bot_name: 'TRÍ AI SALES ROBOT',
    owner_name: 'Quang Nhựt Trí',
    hotline: '0982441446',
    show_hotline: '1'
  });

  // UI Modals & Drawers
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isProductDetailOpen, setIsProductDetailOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [unreadLeadsCount, setUnreadLeadsCount] = useState(0);

  // Initialize Session
  useEffect(() => {
    let currentConvId = localStorage.getItem('triai_conversation_id');
    if (!currentConvId) {
      currentConvId = `conv_${Date.now()}`;
      localStorage.setItem('triai_conversation_id', currentConvId);
    }
    setConversationId(currentConvId);

    // Initial mock demo messages matching the approved mockup exactly
    const saved = localStorage.getItem('triai_chat_history');
    if (!saved || JSON.parse(saved).length === 0) {
      const initialMessages = [
        {
          id: 'msg_init_1',
          senderType: 'assistant',
          content: 'Xin chào anh/chị! 👋\nTôi là TRÍ AI SALES ROBOT, trợ lý bán hàng của chủ nhân.\nTôi có thể giúp anh/chị:\n✅ Tư vấn sản phẩm phù hợp\n✅ Cung cấp thông tin, báo giá\n✅ So sánh các mẫu\n✅ Ghi nhận yêu cầu để chủ nhân liên hệ trực tiếp.',
          createdAt: new Date(Date.now() - 120000).toISOString()
        },
        {
          id: 'msg_init_2',
          senderType: 'user',
          content: 'Tôi muốn tìm máy đếm tiền.',
          createdAt: new Date(Date.now() - 60000).toISOString()
        },
        {
          id: 'msg_init_3',
          senderType: 'assistant',
          content: 'Dạ, anh/chị đang quan tâm đến máy đếm tiền. Bên em có nhiều dòng máy chính hãng, phát hiện tiền giả, đếm nhanh và chính xác. Anh/chị muốn xem các mẫu nổi bật hay cần tư vấn theo nhu cầu sử dụng?',
          createdAt: new Date().toISOString()
        }
      ];
      setMessages(initialMessages);
      localStorage.setItem('triai_chat_history', JSON.stringify(initialMessages));
    } else {
      setMessages(JSON.parse(saved));
    }

    fetchSettings();
    fetchProducts();
    fetchStats();
  }, []);

  // Fetch Settings
  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Products
  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success) {
        setProducts(data.products || []);
        // Pre-select Xiudun XD-2166 as default matching mockup
        const xiudun = data.products.find(p => p.slug === 'xiudun-xd-2166') || data.products[0];
        setSelectedProduct(xiudun);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Stats
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/crm/stats');
      const data = await res.json();
      if (data.success && data.stats) {
        setUnreadLeadsCount(data.stats.newLeads || 0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Persist Messages
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('triai_chat_history', JSON.stringify(messages));
    }
  }, [messages]);

  // Send Message to AI Sales Engine
  const handleSendMessage = async (text, overrideProduct = null, actionType = null) => {
    if (!text.trim() || isThinking || isStreaming) return;

    const prodToUse = overrideProduct !== undefined ? overrideProduct : selectedProduct;

    // 1. Add User Message
    const userMsg = {
      id: `msg_u_${Date.now()}`,
      senderType: 'user',
      content: text,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);

    setBotState('thinking');
    setIsThinking(true);

    try {
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          message: text,
          selectedProduct: prodToUse,
          actionType
        })
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Lỗi xử lý tin nhắn');
      }

      setIsThinking(false);
      setIsStreaming(true);
      setBotState('speaking');

      if (data.recommendedProduct) {
        setSelectedProduct(data.recommendedProduct);
      }
      setOrderStep(data.orderFlow?.step || null);

      const fullReply = data.reply;
      const replyWords = fullReply.split(' ');
      const assistantMsgId = data.messageId || `msg_a_${Date.now()}`;

      if (voiceEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
          const plain = fullReply.replace(/[*_`#]/g, '');
          const utter = new SpeechSynthesisUtterance(plain);
          utter.lang = 'vi-VN';
          utter.rate = 1.05;
          window.speechSynthesis.speak(utter);
        } catch {}
      }

      setMessages(prev => [
        ...prev,
        {
          id: assistantMsgId,
          senderType: 'assistant',
          content: '',
          metadata: { leadCreated: data.leadCreated },
          createdAt: new Date().toISOString()
        }
      ]);

      let accumulated = '';
      for (let i = 0; i < replyWords.length; i++) {
        accumulated += (i > 0 ? ' ' : '') + replyWords[i];
        setMessages(prev =>
          prev.map(m => (m.id === assistantMsgId ? { ...m, content: accumulated } : m))
        );
        await new Promise(r => setTimeout(r, 14));
      }

      setIsStreaming(false);

      if (data.leadCreated) {
        setBotState('success');
        confetti({ particleCount: 90, spread: 60, origin: { y: 0.7 } });
        fetchStats();
        setTimeout(() => setBotState('idle'), 4500);
      } else {
        setBotState('idle');
      }
    } catch (err) {
      console.error(err);
      setIsThinking(false);
      setIsStreaming(false);
      setBotState('error');

      setMessages(prev => [
        ...prev,
        {
          id: `msg_err_${Date.now()}`,
          senderType: 'assistant',
          content: `⚠️ Xin lỗi anh/chị, kết nối với AI Sales Engine tạm thời gián đoạn. Anh/chị có thể gọi hotline: ${settings.hotline}.`,
          createdAt: new Date().toISOString()
        }
      ]);
      setTimeout(() => setBotState('idle'), 4000);
    }
  };

  // Real Vietnamese Speech-to-Text voice capture
  const handleVoiceInput = () => {
    if (botState === 'listening') {
      setBotState('idle');
      return;
    }
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      alert('Trình duyệt hiện tại chưa hỗ trợ nhận diện giọng nói. Anh/chị vui lòng gõ câu hỏi vào ô bên dưới hoặc dùng Chrome/Edge.');
      return;
    }
    const recognition = new SpeechRec();
    recognition.lang = 'vi-VN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setBotState('listening');

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) {
        handleSendMessage(transcript, selectedProduct, null);
      } else {
        setBotState('idle');
      }
    };
    recognition.onerror = () => setBotState('idle');
    recognition.onend = () => {
      setBotState((prev) => (prev === 'listening' ? 'idle' : prev));
    };
    try {
      recognition.start();
    } catch {
      setBotState('idle');
    }
  };

  // When customer clicks a product card
  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
  };

  // When customer clicks an action button
  const handleTriggerAction = (actionKey, overrideProd = null) => {
    const targetProd = overrideProd || selectedProduct;
    const prodName = targetProd ? targetProd.name : 'máy đếm tiền';

    if (actionKey === 'Yêu cầu chủ nhân gọi lại') {
      if (overrideProd) setSelectedProduct(overrideProd);
      setIsPhoneModalOpen(true);
      return;
    }

    const promptMessage =
      actionKey === 'Đặt mua ngay'
        ? `Tôi muốn đặt mua sản phẩm ${prodName}.`
        : `Tôi quan tâm ${prodName} và muốn: ${actionKey}.`;
    if (actionKey === 'Đặt mua ngay') {
      setInputFocusTick((t) => t + 1);
    }
    handleSendMessage(promptMessage, targetProd, actionKey);
  };

  // When customer clicks `👁️ Xem chi tiết`
  const handleViewProductDetail = (prod) => {
    setDetailProduct(prod || selectedProduct);
    setIsProductDetailOpen(true);
  };

  // Quick Phone Form Submission
  const handlePhoneFormSubmit = async ({ name, phone, note, consent }) => {
    try {
      const prodName = selectedProduct ? selectedProduct.name : 'Máy đếm tiền & Thiết bị';
      const promptText = `Tôi tên là ${name}, số điện thoại của tôi là ${phone}. Tôi quan tâm sản phẩm "${prodName}". ${note ? `Ghi chú: ${note}. ` : ''}Tôi đồng ý để chủ nhân trực tiếp liên hệ lại.`;
      
      handleSendMessage(promptText, selectedProduct, 'Yêu cầu chủ nhân gọi lại');
    } catch (err) {
      console.error(err);
    }
  };

  // Reset conversation handler
  const handleResetChat = async () => {
    if (window.confirm('Bạn có muốn làm mới cuộc trò chuyện này không?')) {
      if (conversationId) {
        try {
          await fetch(`/api/chat/conversations/${conversationId}`, { method: 'DELETE' });
        } catch (e) {}
      }
      const newConvId = `conv_${Date.now()}`;
      setConversationId(newConvId);
      localStorage.setItem('triai_conversation_id', newConvId);
      localStorage.removeItem('triai_chat_history');

      const initialWelcome = {
        id: `msg_init_${Date.now()}`,
        senderType: 'assistant',
        content: 'Xin chào anh/chị! 👋\nTôi là TRÍ AI SALES ROBOT, trợ lý bán hàng của chủ nhân.\nTôi có thể giúp anh/chị:\n✅ Tư vấn sản phẩm phù hợp\n✅ Cung cấp thông tin, báo giá\n✅ So sánh các mẫu\n✅ Ghi nhận yêu cầu để chủ nhân liên hệ trực tiếp.',
        createdAt: new Date().toISOString()
      };
      setMessages([initialWelcome]);
      setBotState('idle');
      setOrderStep(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#040914] text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* 1. TOP HEADER NAVIGATION BAR MATCHING APPROVED MOCKUP */}
      <header className="w-full bg-[#050C1F]/90 border-b border-cyan-500/25 px-4 md:px-8 py-3 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Branding */}
          <div className="flex items-center space-x-3.5">
            {/* AI Chip Icon (Click to open Owner Dashboard) */}
            <div
              onClick={() => setIsDashboardOpen(true)}
              className="relative w-11 h-11 rounded-2xl bg-[#091838] border-2 border-cyan-400 flex items-center justify-center text-cyan-300 shadow-[0_0_18px_rgba(0,240,255,0.5)] cursor-pointer hover:scale-105 transition-all"
              title="Nhấn để mở Bảng Quản trị Chủ nhân"
            >
              <span className="font-extrabold text-sm font-mono tracking-tighter">AI</span>
              {/* Circuit Corner Dots */}
              <span className="absolute -top-1 -left-1 w-1.5 h-1.5 rounded-full bg-cyan-300"></span>
              <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-cyan-300"></span>
              <span className="absolute -bottom-1 -left-1 w-1.5 h-1.5 rounded-full bg-cyan-300"></span>
              <span className="absolute -bottom-1 -right-1 w-1.5 h-1.5 rounded-full bg-cyan-300"></span>
            </div>

            <div>
              <h1 className="text-lg md:text-xl font-black text-white tracking-wide font-display flex items-center space-x-2">
                <span>{settings.bot_name}</span>
              </h1>
              <p className="text-[11px] md:text-xs text-cyan-200/90 font-medium">
                Trợ lý bán hàng thông minh của chủ nhân • Tư vấn - Báo giá - Hỗ trợ mua hàng
              </p>
            </div>
          </div>

          {/* Right Action Tools matching Mockup: 24/7 pill + Hướng dẫn + Bell(3) + User Avatar */}
          <div className="flex items-center space-x-2.5 relative">
            {/* Status Pill: Đang hoạt động 24/7 */}
            <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs shadow-[0_0_12px_rgba(16,185,129,0.25)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-medium text-[11px] md:text-xs">Đang hoạt động 24/7</span>
            </div>

            {/* Guide Button: [?] Hướng dẫn */}
            <button
              onClick={() => setIsGuideOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-[#0C1B3E] hover:bg-[#102454] border border-cyan-500/30 text-cyan-200 text-xs font-semibold shadow-md transition-all active:scale-95"
            >
              <HelpCircle size={14} className="text-cyan-400" />
              <span>Hướng dẫn</span>
            </button>

            {/* Notification Bell with Badge (3) */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="relative p-2 rounded-full bg-[#0C1B3E] hover:bg-[#102454] border border-cyan-500/30 text-cyan-200 text-xs transition-all active:scale-95"
                title="Thông báo hệ thống"
              >
                <Bell size={16} className="text-cyan-300" />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white font-bold text-[9px] flex items-center justify-center shadow-md">
                  3
                </span>
              </button>

              <NotificationDropdown
                isOpen={isNotificationOpen}
                onClose={() => setIsNotificationOpen(false)}
              />
            </div>

            {/* User Avatar Circle (Opens Owner Dashboard) */}
            <button
              onClick={() => setIsDashboardOpen(true)}
              className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 border border-cyan-400 flex items-center justify-center text-white shadow-[0_0_10px_rgba(0,240,255,0.4)] hover:scale-105 transition-all"
              title="Quản trị chủ nhân / Tài khoản"
            >
              <User size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN TWO-COLUMN ARENA (50% - 50% Desktop Layout) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 md:p-6 flex flex-col justify-between">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 items-stretch">
          {/* CỘT 1: HUMANOID AI ROBOT & CHAT TƯ VẤN (Exact 50% width on Desktop) */}
          <section className="flex flex-col h-full min-w-0">
            <HumanoidChatCard
              messages={messages}
              isThinking={isThinking}
              isStreaming={isStreaming}
              botState={botState}
              voiceEnabled={voiceEnabled}
              onToggleVoice={() => {
                if (voiceEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
                  window.speechSynthesis.cancel();
                }
                setVoiceEnabled(!voiceEnabled);
              }}
              onQuickPrompt={(prompt) => handleSendMessage(prompt, selectedProduct, null)}
              onResetChat={handleResetChat}
              onMicClick={handleVoiceInput}
            />
          </section>

          {/* CỘT 2: PRODUCT SELECTOR & NHU CẦU (Exact 50% width on Desktop) */}
          <section className="hidden lg:flex flex-col h-full min-w-0">
            <ProductSelectorCard
              products={products}
              selectedProduct={selectedProduct}
              onSelectProduct={handleSelectProduct}
              onTriggerAction={handleTriggerAction}
              onViewProductDetail={handleViewProductDetail}
            />
          </section>
        </div>

        {/* 3. SYMMETRICAL BOTTOM CONTROLS (Input Left + Royal Purple CTA Right) */}
        <BottomControls
          onSendMessage={handleSendMessage}
          onOpenPhoneModal={() => setIsPhoneModalOpen(true)}
          onMicClick={handleVoiceInput}
          isListening={botState === 'listening'}
          isThinking={isThinking}
          isStreaming={isStreaming}
          orderStep={orderStep}
          focusTick={inputFocusTick}
        />
      </main>

      {/* Mobile Bottom Responsive Drawer */}
      <MobileDrawer
        isOpen={isMobileDrawerOpen}
        onOpen={() => setIsMobileDrawerOpen(true)}
        onClose={() => setIsMobileDrawerOpen(false)}
        products={products}
        selectedProduct={selectedProduct}
        onSelectProduct={handleSelectProduct}
        onTriggerAction={handleTriggerAction}
        onViewProductDetail={handleViewProductDetail}
      />

      {/* Product Detail Specifications Modal */}
      <ProductDetailModal
        isOpen={isProductDetailOpen}
        onClose={() => setIsProductDetailOpen(false)}
        product={detailProduct || selectedProduct}
        onConsult={(prod) => {
          handleSendMessage(`Tôi muốn tư vấn chi tiết về máy ${prod.name}`, prod, 'Tìm hiểu sản phẩm');
        }}
        onOrder={(prod) => {
          handleSendMessage(`Tôi muốn đặt mua ${prod.name}`, prod, 'Đặt mua');
        }}
        onCallOwner={(prod) => {
          setSelectedProduct(prod);
          setIsPhoneModalOpen(true);
        }}
      />

      {/* Guide Modal */}
      <GuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      {/* Quick Phone Contact Modal */}
      <PhoneContactModal
        isOpen={isPhoneModalOpen}
        onClose={() => setIsPhoneModalOpen(false)}
        onSubmit={handlePhoneFormSubmit}
        selectedProduct={selectedProduct}
        ownerName={settings.owner_name}
      />

      {/* Owner Dashboard Modal */}
      <OwnerDashboard
        isOpen={isDashboardOpen}
        onClose={() => setIsDashboardOpen(false)}
        onRefreshData={() => {
          fetchSettings();
          fetchProducts();
          fetchStats();
        }}
      />
    </div>
  );
};

export default App;