import React from 'react';

export const AudioWaveform = ({ isSpeaking = false, isListening = false }) => {
  // Symmetric natural voice waveform distribution matching mockup
  const baseHeights = [8, 14, 22, 30, 20, 28, 36, 24, 32, 18, 26, 14, 8];

  return (
    <div className="flex items-center justify-center space-x-1 h-9 px-2 overflow-hidden">
      {baseHeights.map((h, idx) => {
        const animDelay = `${(idx * 0.07).toFixed(2)}s`;
        const animDuration = isSpeaking ? '0.5s' : isListening ? '0.8s' : '1.6s';

        return (
          <span
            key={idx}
            className={`w-[3px] rounded-full transition-all duration-200 ${
              isSpeaking
                ? 'bg-gradient-to-t from-cyan-500 via-sky-300 to-white shadow-[0_0_10px_rgba(0,240,255,0.9)]'
                : isListening
                ? 'bg-gradient-to-t from-blue-400 to-cyan-300 shadow-[0_0_6px_rgba(0,240,255,0.6)]'
                : 'bg-cyan-400/80 shadow-[0_0_6px_rgba(0,240,255,0.4)]'
            }`}
            style={{
              height: isSpeaking
                ? `${Math.max(10, h * 1.15)}px`
                : isListening
                ? `${Math.max(8, h * 0.8)}px`
                : `${Math.max(6, h * 0.55)}px`,
              animation: `audioWave ${animDuration} ease-in-out infinite alternate`,
              animationDelay: animDelay
            }}
          />
        );
      })}
    </div>
  );
};

export default AudioWaveform;