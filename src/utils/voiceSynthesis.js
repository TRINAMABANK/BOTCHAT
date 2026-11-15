/**
 * Voice Synthesis (Text-to-Speech) module for TRÍ AI SALES ROBOT.
 * Uses Browser Web Speech API (speechSynthesis & SpeechSynthesisUtterance).
 * Tuned for Vietnamese (vi-VN), with auto-voice discovery,
 * natural text sanitization, pause/resume keepalive for Chrome, and debounce against duplicate clicks.
 */

let cachedVoices = [];
let keepAliveTimer = null;
let currentSpeakingText = null;

export const isSynthesisSupported = () => {
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
  if (!isSynthesisSupported()) return null;
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
    // Convert common currency & abbreviations to spoken Vietnamese words
    .replace(/(\d+)\s*₫/g, '$1 đồng')
    .replace(/(\d+)\s*đ(?!\w)/gi, '$1 đồng')
    .replace(/\bSĐT\b/gi, 'số điện thoại')
    .replace(/\bCNTT\b/gi, 'công nghệ thông tin')
    .replace(/\bCRM\b/gi, 'quản lý khách hàng')
    .replace(/\bAI\b/gi, 'A I')
    .replace(/\bVND\b/gi, 'Việt Nam đồng')
    .replace(/\bHP\b/g, 'ngựa')
    .replace(/\bFullHD\b/gi, 'Full H D')
    .replace(/\b4K\b/gi, '4 K')
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
 * Stop any ongoing speech immediately and reset timers
 */
export const stopSpeaking = () => {
  if (!isSynthesisSupported()) return;
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
  currentSpeakingText = null;
  try {
    window.speechSynthesis.cancel();
  } catch {}
};

/**
 * Check if the browser is currently speaking
 */
export const isSpeakingNow = () => {
  if (!isSynthesisSupported()) return false;
  try {
    return window.speechSynthesis.speaking;
  } catch {
    return false;
  }
};

/**
 * Speak given text with full Vietnamese voice support and lifecycle events.
 * Prevents overlapping speech and duplicate consecutive triggers of identical content.
 */
export const speakVietnamese = (text, { onStart, onEnd, onError, rate = 1.0, pitch = 1.0 } = {}) => {
  if (!isSynthesisSupported()) {
    if (onError) onError(new Error('Trình duyệt chưa hỗ trợ Text-to-Speech'));
    return;
  }

  // Prevent duplicate concurrent speaking of the exact same content
  if (currentSpeakingText === text && isSpeakingNow()) {
    // If user clicks the same text again while speaking, stop speaking as a toggle action
    stopSpeaking();
    if (onEnd) onEnd();
    return;
  }

  stopSpeaking();

  const clean = cleanTextForVietnameseTTS(text);
  if (!clean) {
    if (onEnd) onEnd();
    return;
  }

  currentSpeakingText = text;

  const utter = new SpeechSynthesisUtterance(clean);
  utter.lang = 'vi-VN';
  utter.rate = rate; // Tốc độ mặc định 1.0 theo yêu cầu
  utter.pitch = pitch; // Pitch mặc định 1.0 theo yêu cầu

  const viVoice = getBestVietnameseVoice();
  if (viVoice) {
    utter.voice = viVoice;
  }

  const handleFinish = () => {
    if (keepAliveTimer) {
      clearInterval(keepAliveTimer);
      keepAliveTimer = null;
    }
    if (currentSpeakingText === text) {
      currentSpeakingText = null;
    }
    if (onEnd) onEnd();
  };

  utter.onstart = () => {
    if (onStart) onStart();
  };

  utter.onend = handleFinish;

  utter.onerror = (e) => {
    console.warn('[VOICE SYNTHESIS ERROR]:', e);
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
    console.error('[VOICE SYNTHESIS SPEAK ERROR]:', err);
    handleFinish();
  }
};

export default {
  isSynthesisSupported,
  getBestVietnameseVoice,
  cleanTextForVietnameseTTS,
  speakVietnamese,
  stopSpeaking,
  isSpeakingNow
};
