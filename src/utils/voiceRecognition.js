/**
 * Voice Recognition (Speech-to-Text) module for TRÍ AI SALES ROBOT.
 * Uses Browser Web Speech API (SpeechRecognition / webkitSpeechRecognition).
 * Tuned for Vietnamese (vi-VN), with real-time interim recognition,
 * permission error handling, and single-turn delivery to AI engine.
 */

export const isRecognitionSupported = () => {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
  );
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

    this._initRecognizer();
  }

  _initRecognizer() {
    if (!isRecognitionSupported()) return;

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRec();
    this.recognition.lang = 'vi-VN';
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;
    this.recognition.continuous = false;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.hasSentFinal = false;
      this.finalTranscript = '';
      if (this.onStart) this.onStart();
    };

    this.recognition.onresult = (event) => {
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

    this.recognition.onerror = (event) => {
      let friendlyMsg = 'Không thể nhận diện giọng nói.';
      const errCode = event.error;

      switch (errCode) {
        case 'not-allowed':
        case 'service-not-allowed':
          friendlyMsg =
            'Chưa được cấp quyền Microphone. Bạn vui lòng bấm vào biểu tượng ổ khóa trên thanh địa chỉ trình duyệt và chọn "Cho phép" (Allow) Microphone nhé!';
          break;
        case 'no-speech':
          friendlyMsg = 'Chưa nghe thấy bạn nói. Hãy bấm micro và thử nói lại nhé!';
          break;
        case 'audio-capture':
          friendlyMsg = 'Không tìm thấy microphone trên thiết bị của bạn. Vui lòng kiểm tra thiết bị thu âm.';
          break;
        case 'network':
          friendlyMsg = 'Lỗi kết nối mạng dịch vụ nhận diện giọng nói.';
          break;
        case 'aborted':
          // User aborted, no need to alert
          friendlyMsg = '';
          break;
        default:
          friendlyMsg = `Lỗi nhận diện âm thanh: ${errCode || 'Không xác định'}`;
      }

      this.isListening = false;
      if (friendlyMsg && this.onError) {
        this.onError(friendlyMsg, errCode);
      }
    };

    this.recognition.onend = () => {
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
  }

  start() {
    if (!isRecognitionSupported()) {
      if (this.onError) {
        this.onError(
          'Trình duyệt này chưa hỗ trợ nhận diện giọng nói Web Speech. Bạn nên dùng Google Chrome hoặc Microsoft Edge nhé!',
          'not-supported'
        );
      }
      return false;
    }

    if (this.isListening) {
      this.stop();
      return false;
    }

    this.userManuallyStopped = false;
    this.hasSentFinal = false;
    this.finalTranscript = '';

    try {
      this.recognition.start();
      return true;
    } catch (e) {
      // If already started or aborting, abort and retry
      try {
        this.recognition.abort();
        setTimeout(() => {
          try {
            this.recognition.start();
          } catch {}
        }, 100);
      } catch {}
      return true;
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
    this.hasSentFinal = true; // Prevent delivery if aborted explicitly
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {}
    }
    this.isListening = false;
  }
}

export default VoiceRecognizer;
