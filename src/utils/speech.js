/**
 * Speech synthesis & voice utilities for Vietnamese TRÍ AI Humanoid Assistant.
 * Provides robust Web Speech API wrapper with auto Vietnamese voice discovery,
 * natural text sanitization, and Chrome long-utterance keepalive.
 */

let cachedVoices = [];
let keepAliveTimer = null;

export const isSpeechSupported = () => {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof SpeechSynthesisUtterance !== 'undefined'
  );
};

// Initialize voice listener early to populate cached voices
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  cachedVoices = window.speechSynthesis.getVoices() || [];
  window.speechSynthesis.onvoiceschanged = () => {
    try {
      cachedVoices = window.speechSynthesis.getVoices() || [];
    } catch {}
  };
}

/**
 * Finds the highest quality Vietnamese voice available in the current browser.
 * Prioritizes Microsoft HoaiMy/NamMinh (Edge/Windows), Google Tiếng Việt (Chrome), or any 'vi' voice.
 */
export const getBestVietnameseVoice = () => {
  if (!isSpeechSupported()) return null;
  const voices =
    (cachedVoices && cachedVoices.length ? cachedVoices : window.speechSynthesis.getVoices()) || [];
  if (!voices.length) return null;

  const viVoices = voices.filter((v) => {
    const lang = (v.lang || '').toLowerCase().replace('_', '-');
    const name = (v.name || '').toLowerCase();
    return lang.startsWith('vi') || name.includes('vietnam') || name.includes('tiếng việt');
  });

  if (viVoices.length > 0) {
    // 1. Prioritize natural neural voices
    const naturalVoice = viVoices.find((v) => {
      const n = v.name.toLowerCase();
      return (
        n.includes('natural') ||
        n.includes('hoaimy') ||
        n.includes('namminh') ||
        n.includes('google')
      );
    });
    if (naturalVoice) return naturalVoice;
    return viVoices[0];
  }

  return null;
};

/**
 * Clean formatted assistant message for natural Vietnamese TTS pronunciation.
 */
export const cleanTextForVietnameseTTS = (text) => {
  if (!text) return '';
  return text
    // Remove code blocks and inline code
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`.*?`/g, ' ')
    // Remove links
    .replace(/https?:\/\/\S+/g, ' ')
    // Convert common currency & abbreviations to spoken words
    .replace(/(\d+)\s*₫/g, '$1 đồng')
    .replace(/(\d+)\s*đ(?!\w)/gi, '$1 đồng')
    .replace(/\bSĐT\b/gi, 'số điện thoại')
    .replace(/\bCNTT\b/gi, 'công nghệ thông tin')
    .replace(/\bCRM\b/gi, 'quản lý khách hàng')
    .replace(/\bAI\b/gi, 'A I')
    .replace(/\bVND\b/gi, 'Việt Nam đồng')
    // Remove markdown characters
    .replace(/[*_#~>]/g, ' ')
    // Replace bullet points and arrows with commas or pauses
    .replace(/[•\-\–—]/g, ', ')
    .replace(/→/g, ' sang ')
    // Strip emojis (Unicode ranges)
    .replace(
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
      ' '
    )
    // Collapse extra spaces and newlines
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Cancel any ongoing speech
 */
export const stopSpeaking = () => {
  if (!isSpeechSupported()) return;
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
  try {
    window.speechSynthesis.cancel();
  } catch {}
};

/**
 * Speak given text with full Vietnamese voice support and lifecycle events.
 */
export const speakVietnamese = (text, { onStart, onEnd, onError } = {}) => {
  if (!isSpeechSupported()) {
    if (onError) onError(new Error('Speech synthesis is not supported on this browser'));
    return;
  }

  stopSpeaking();

  const clean = cleanTextForVietnameseTTS(text);
  if (!clean) {
    if (onEnd) onEnd();
    return;
  }

  const utter = new SpeechSynthesisUtterance(clean);
  utter.lang = 'vi-VN';
  utter.rate = 1.0;
  utter.pitch = 1.02;

  const viVoice = getBestVietnameseVoice();
  if (viVoice) {
    utter.voice = viVoice;
  }

  const handleFinish = () => {
    if (keepAliveTimer) {
      clearInterval(keepAliveTimer);
      keepAliveTimer = null;
    }
    if (onEnd) onEnd();
  };

  utter.onstart = () => {
    if (onStart) onStart();
  };

  utter.onend = handleFinish;
  utter.onerror = (e) => {
    console.warn('Speech synthesis utterance error:', e);
    handleFinish();
    if (onError) onError(e);
  };

  // Prevent Chrome GC bug by attaching to window
  if (typeof window !== 'undefined') {
    window.__activeUtterance = utter;
  }

  // Chrome 14s silence bug workaround: periodic pause/resume
  keepAliveTimer = setInterval(() => {
    try {
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      } else {
        clearInterval(keepAliveTimer);
        keepAliveTimer = null;
      }
    } catch {
      clearInterval(keepAliveTimer);
      keepAliveTimer = null;
    }
  }, 10000);

  try {
    window.speechSynthesis.speak(utter);
  } catch (err) {
    console.error('Failed to trigger speech synthesis:', err);
    handleFinish();
  }
};
