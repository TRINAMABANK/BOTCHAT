/**
 * Voice Recognition (Speech-to-Text) module for TRÍ AI SALES ROBOT.
 * Uses Browser Web Speech API (SpeechRecognition / webkitSpeechRecognition).
 * Tuned for Vietnamese (vi-VN), with real-time interim recognition,
 * microphone pre-check, browser-specific detection (Cốc Cốc, Brave, Chrome, Edge),
 * auto-retry for transient network errors, and single-turn delivery to AI engine.
 */

export const getBrowserEngine = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { name: 'unknown', isSupported: false };
  }
  const ua = navigator.userAgent || '';
  const isCocCoc = /coc_coc|coccoc/i.test(ua);
  const isBrave = Boolean(navigator.brave) || /brave/i.test(ua);
  const isEdge = /edg\//i.test(ua);
  const isChrome = /chrome|crios/i.test(ua) && !isCocCoc && !isBrave && !isEdge;
  const isSafari = /safari/i.test(ua) && !isChrome && !isEdge && !isCocCoc;
  const isFirefox = /firefox|fxios/i.test(ua);

  return {
    isCocCoc,
    isBrave,
    isEdge,
    isChrome,
    isSafari,
    isFirefox,
    ua
  };
};

export const isRecognitionSupported = () => {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
  );
};

/**
 * Pre-checks or requests microphone permission via getUserMedia so browser
 * shows native permission prompt if not yet allowed, and activates the audio hardware.
 */
export const requestMicrophonePermission = async () => {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return { ok: true };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Immediately release tracks so device isn't locked
    stream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {}
    });
    return { ok: true };
  } catch (err) {
    const name = err.name || '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return {
        ok: false,
        error: 'not-allowed',
        message:
          'Bạn chưa cấp quyền sử dụng Microphone. Vui lòng bấm vào biểu tượng ổ khóa 🔒 trên thanh địa chỉ trình duyệt và chọn "Cho phép" (Allow) Microphone nhé!'
      };
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return {
        ok: false,
        error: 'audio-capture',
        message:
          'Không tìm thấy microphone trên thiết bị của bạn. Vui lòng cắm tai nghe hoặc kiểm tra thiết bị thu âm.'
      };
    }
    return { ok: true };
  }
};

export class VoiceRecognizer {
  constructor({ onStart, onInterim, onFinal, onError, onEnd } = {}) {
    this.onStart = onStart;
    this.onInterim = onInterim;
    this.onFinal = onFinal;
    this.onError = onError;
    this.onEnd = onEnd;

    this.recognition = null;
    this.isListening = false;
    this.hasSentFinal = false;
    this.userManuallyStopped = false;
    this.finalTranscript = '';
    this.retryCount = 0;
  }

  _cleanupCurrentInstance() {
    if (this.recognition) {
      try {
        this.recognition.onstart = null;
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.abort();
      } catch {}
      this.recognition = null;
    }
  }

  async start() {
    if (!isRecognitionSupported()) {
      if (this.onError) {
        this.onError(
          'Trình duyệt này chưa hỗ trợ nhận diện giọng nói Web Speech. Bạn nên dùng Google Chrome hoặc Microsoft Edge nhé!',
          'not-supported'
        );
      }
      return false;
    }

    const browser = getBrowserEngine();

    // Cốc Cốc uses Chromium but lacks Google Cloud Speech API credentials, which always throws 'network' error
    if (browser.isCocCoc) {
      if (this.onError) {
        this.onError(
          'Trình duyệt Cốc Cốc hiện không được Google hỗ trợ dịch vụ nhận diện giọng nói. Bạn vui lòng mở website trên Google Chrome hoặc Microsoft Edge để nói tiếng Việt nhé!',
          'unsupported-browser'
        );
      }
      return false;
    }

    // Brave blocks Google Speech telemetry by default
    if (browser.isBrave) {
      if (this.onError) {
        this.onError(
          'Trình duyệt Brave mặc định chặn dịch vụ giọng nói Google. Bạn vui lòng mở website trên Google Chrome hoặc Microsoft Edge nhé!',
          'unsupported-browser'
        );
      }
      return false;
    }

    if (this.isListening) {
      this.stop();
      return false;
    }

    // Kiểm tra và xin quyền microphone trước
    const perm = await requestMicrophonePermission();
    if (!perm.ok) {
      if (this.onError) {
        this.onError(perm.message, perm.error);
      }
      return false;
    }

    return this._startRecognitionInstance();
  }

  _startRecognitionInstance() {
    this._cleanupCurrentInstance();

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return false;

    this.userManuallyStopped = false;
    this.hasSentFinal = false;
    this.finalTranscript = '';

    const rec = new SpeechRec();
    rec.lang = 'vi-VN';
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.continuous = false;

    rec.onstart = () => {
      this.isListening = true;
      this.hasSentFinal = false;
      this.finalTranscript = '';
      if (this.onStart) this.onStart();
    };

    rec.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        const text = item[0]?.transcript || '';
        if (item.isFinal) {
          final += text;
        } else {
          interim += text;
        }
      }

      if (interim && this.onInterim) {
        this.onInterim(interim);
      }

      if (final) {
        this.finalTranscript = (this.finalTranscript ? `${this.finalTranscript} ` : '') + final.trim();
        if (this.onInterim) {
          this.onInterim(this.finalTranscript);
        }
      }
    };

    rec.onerror = (event) => {
      const errCode = event.error;

      // 1. Nếu đã ghi nhận kết quả cuối hoặc người dùng chủ động bấm dừng, bỏ qua lỗi teardown của socket
      if (this.hasSentFinal || this.userManuallyStopped) {
        return;
      }

      // 2. Nếu là lỗi network tạm thời ở lần đầu tiên (thường do socket cũ chưa giải phóng xong), thử tự động retry 1 lần sau 350ms
      if (errCode === 'network' && this.retryCount === 0 && !this.userManuallyStopped) {
        this.retryCount++;
        this._cleanupCurrentInstance();
        setTimeout(() => {
          if (!this.userManuallyStopped && !this.hasSentFinal) {
            this._startRecognitionInstance();
          }
        }, 350);
        return;
      }

      let friendlyMsg = 'Không thể nhận diện giọng nói.';

      switch (errCode) {
        case 'not-allowed':
        case 'service-not-allowed':
          friendlyMsg =
            'Chưa được cấp quyền Microphone. Bạn vui lòng bấm vào biểu tượng ổ khóa 🔒 trên thanh địa chỉ trình duyệt và chọn "Cho phép" (Allow) Microphone nhé!';
          break;
        case 'no-speech':
          friendlyMsg = 'Chưa nghe thấy bạn nói. Hãy bấm nút micro và thử nói lại nhé!';
          break;
        case 'audio-capture':
          friendlyMsg = 'Không tìm thấy microphone trên thiết bị của bạn. Vui lòng kiểm tra thiết bị thu âm.';
          break;
        case 'network':
          friendlyMsg =
            'Không thể kết nối đến máy chủ nhận diện giọng nói (do mạng chậm hoặc bị chặn bởi VPN/chặn quảng cáo). Bạn hãy bấm "Thử lại" hoặc dùng Google Chrome / Microsoft Edge nhé!';
          break;
        case 'aborted':
          // User aborted, no need to alert
          friendlyMsg = '';
          break;
        default:
          friendlyMsg = `Lỗi nhận diện âm thanh (${errCode || 'Không xác định'}). Vui lòng thử lại.`;
      }

      this.isListening = false;
      if (friendlyMsg && this.onError) {
        this.onError(friendlyMsg, errCode);
      }
    };

    rec.onend = () => {
      const wasListening = this.isListening;
      this.isListening = false;

      // Deliver final transcript exactly once if captured and not yet delivered
      if (!this.hasSentFinal && this.finalTranscript.trim()) {
        this.hasSentFinal = true;
        const textToDeliver = this.finalTranscript.trim();
        this.finalTranscript = '';
        if (this.onFinal) {
          this.onFinal(textToDeliver);
        }
      }

      if (this.onEnd) {
        this.onEnd(wasListening);
      }
    };

    this.recognition = rec;
    try {
      rec.start();
      return true;
    } catch (err) {
      console.warn('SpeechRecognition start error:', err);
      return false;
    }
  }

  stop() {
    this.userManuallyStopped = true;
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {
        try {
          this.recognition.abort();
        } catch {}
      }
    }
    this.isListening = false;
  }

  abort() {
    this.userManuallyStopped = true;
    this.hasSentFinal = true;
    this._cleanupCurrentInstance();
    this.isListening = false;
  }
}

export default VoiceRecognizer;
