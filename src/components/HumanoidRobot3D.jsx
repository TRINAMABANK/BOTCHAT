import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Sparkles, ShieldCheck, Activity, Cpu } from 'lucide-react';

export const HumanoidRobot3D = ({
  botState = 'idle', // 'idle' | 'listening' | 'thinking' | 'speaking' | 'success' | 'error'
  robotModel = 'cyber_valkyrie', // 'cyber_valkyrie' | 'tron_humanoid' | 'quantum_sphere' | 'nano_sentinel'
  botName = 'TRÍ AI SALES ROBOT',
  ownerName = 'Quang Nhựt Trí',
  isSpeakingAudio = false,
  onToggleSound
}) => {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const [fps, setFps] = useState(60);

  // Model color palettes
  const palettes = {
    cyber_valkyrie: {
      primary: '#00f0ff',
      secondary: '#38bdf8',
      accent: '#a855f7',
      hull: '#1e293b',
      hullDark: '#0f172a',
      glow: 'rgba(0, 240, 255, 0.6)'
    },
    tron_humanoid: {
      primary: '#f59e0b',
      secondary: '#fbbf24',
      accent: '#ef4444',
      hull: '#18181b',
      hullDark: '#09090b',
      glow: 'rgba(245, 158, 11, 0.6)'
    },
    quantum_sphere: {
      primary: '#8b5cf6',
      secondary: '#c084fc',
      accent: '#06b6d4',
      hull: '#1e1b4b',
      hullDark: '#0f0e26',
      glow: 'rgba(139, 92, 246, 0.6)'
    },
    nano_sentinel: {
      primary: '#10b981',
      secondary: '#34d399',
      accent: '#3b82f6',
      hull: '#132e27',
      hullDark: '#061a15',
      glow: 'rgba(16, 185, 129, 0.6)'
    }
  };

  const currentPalette = palettes[robotModel] || palettes.cyber_valkyrie;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;
    let lastFrameTime = performance.now();
    let frameCount = 0;
    let lastFpsUpdate = performance.now();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2 for mobile battery efficiency
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    const render = (now) => {
      // FPS measurement
      frameCount++;
      if (now - lastFpsUpdate >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastFpsUpdate)));
        frameCount = 0;
        lastFpsUpdate = now;
      }

      time += 0.035;
      const w = canvas.getBoundingClientRect().width;
      const h = canvas.getBoundingClientRect().height;
      const centerX = w / 2;
      const centerY = h / 2 - 10;

      ctx.clearRect(0, 0, w, h);

      // State-specific behavior & colors
      let stateColor = currentPalette.primary;
      let auraSize = 1;
      let headTilt = Math.sin(time * 0.8) * 0.04;
      let breatheY = Math.sin(time * 1.2) * 5;

      if (botState === 'speaking') {
        stateColor = currentPalette.accent;
        auraSize = 1.3 + Math.sin(time * 6) * 0.2;
        breatheY = Math.sin(time * 4) * 7;
      } else if (botState === 'thinking') {
        stateColor = '#a855f7';
        auraSize = 1.1 + Math.sin(time * 3) * 0.15;
        headTilt = Math.sin(time * 1.5) * 0.08;
      } else if (botState === 'listening') {
        stateColor = '#38bdf8';
        auraSize = 1.2;
        headTilt = 0.06;
      } else if (botState === 'success') {
        stateColor = '#10b981';
        auraSize = 1.5;
        breatheY = Math.sin(time * 2) * 8;
      } else if (botState === 'error') {
        stateColor = '#ef4444';
        auraSize = 1.2 + Math.sin(time * 8) * 0.2;
      }

      // 1. Holographic Halo & Background Glow Ring
      const bgGrad = ctx.createRadialGradient(centerX, centerY + breatheY, 20, centerX, centerY + breatheY, 130 * auraSize);
      bgGrad.addColorStop(0, `${stateColor}33`);
      bgGrad.addColorStop(0.5, `${stateColor}11`);
      bgGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY + breatheY, 130 * auraSize, 0, Math.PI * 2);
      ctx.fill();

      // 2. Rotating Data Halo Rings
      ctx.save();
      ctx.translate(centerX, centerY + breatheY);
      ctx.strokeStyle = `${stateColor}55`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 12]);
      ctx.beginPath();
      ctx.ellipse(0, 45, 95 * auraSize, 28 * auraSize, time * 0.4, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `${currentPalette.secondary}44`;
      ctx.setLineDash([4, 8]);
      ctx.beginPath();
      ctx.ellipse(0, 45, 80 * auraSize, 22 * auraSize, -time * 0.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // 3. Robot Torso & Shoulders
      ctx.save();
      ctx.translate(centerX, centerY + breatheY + 45);

      // Cyber Shoulders
      const shoulderGrad = ctx.createLinearGradient(-70, 0, 70, 50);
      shoulderGrad.addColorStop(0, currentPalette.hullDark);
      shoulderGrad.addColorStop(0.5, currentPalette.hull);
      shoulderGrad.addColorStop(1, currentPalette.hullDark);

      ctx.fillStyle = shoulderGrad;
      ctx.strokeStyle = `${stateColor}88`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-65, 30);
      ctx.lineTo(-40, 0);
      ctx.lineTo(40, 0);
      ctx.lineTo(65, 30);
      ctx.lineTo(55, 65);
      ctx.lineTo(-55, 65);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Chest Energy Core (Arc Reactor)
      const coreY = 32;
      const corePulse = (Math.sin(time * 3) + 1) / 2;
      const coreGrad = ctx.createRadialGradient(0, coreY, 2, 0, coreY, 16);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.3, stateColor);
      coreGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(0, coreY, 15 + corePulse * 3, 0, Math.PI * 2);
      ctx.fill();

      // Core Outer Metallic Ring
      ctx.strokeStyle = stateColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, coreY, 14, 0, Math.PI * 2);
      ctx.stroke();

      // Chest tech detail lines
      ctx.strokeStyle = `${currentPalette.secondary}66`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-25, 10);
      ctx.lineTo(-12, 28);
      ctx.moveTo(25, 10);
      ctx.lineTo(12, 28);
      ctx.stroke();

      ctx.restore();

      // 4. Neck Hydraulics
      ctx.save();
      ctx.translate(centerX, centerY + breatheY + 12);
      ctx.fillStyle = '#334155';
      ctx.fillRect(-10, 0, 20, 20);
      // Neck cyber lines
      ctx.strokeStyle = stateColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-6, 2);
      ctx.lineTo(-6, 18);
      ctx.moveTo(6, 2);
      ctx.lineTo(6, 18);
      ctx.stroke();
      ctx.restore();

      // 5. Robot Head (with tilt & breathing)
      ctx.save();
      ctx.translate(centerX, centerY + breatheY - 20);
      ctx.rotate(headTilt);

      // Head Base / Skull Plate
      const headGrad = ctx.createLinearGradient(-35, -45, 35, 30);
      headGrad.addColorStop(0, currentPalette.hull);
      headGrad.addColorStop(0.7, currentPalette.hullDark);
      headGrad.addColorStop(1, '#090d16');

      ctx.fillStyle = headGrad;
      ctx.strokeStyle = `${stateColor}aa`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-32, -25);
      ctx.quadraticCurveTo(-38, -50, 0, -52);
      ctx.quadraticCurveTo(38, -50, 32, -25);
      ctx.lineTo(30, 10);
      ctx.quadraticCurveTo(22, 32, 0, 34);
      ctx.quadraticCurveTo(-22, 32, -30, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Ear Antennae / Acoustic Pods
      ctx.fillStyle = currentPalette.hull;
      ctx.strokeStyle = stateColor;
      ctx.lineWidth = 1.5;
      // Left Pod
      ctx.fillRect(-38, -18, 7, 24);
      ctx.strokeRect(-38, -18, 7, 24);
      // Right Pod
      ctx.fillRect(31, -18, 7, 24);
      ctx.strokeRect(31, -18, 7, 24);

      // Glowing Antenna Tip Pulse
      ctx.fillStyle = stateColor;
      ctx.beginPath();
      ctx.arc(-35, -23, 2.5, 0, Math.PI * 2);
      ctx.arc(35, -23, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // 6. Cyber Visor / Eye Matrix
      const visorGrad = ctx.createLinearGradient(-26, -15, 26, 5);
      visorGrad.addColorStop(0, '#030712');
      visorGrad.addColorStop(0.5, '#0f172a');
      visorGrad.addColorStop(1, '#030712');

      ctx.fillStyle = visorGrad;
      ctx.strokeStyle = `${stateColor}bb`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-26, -18, 52, 18, 8);
      ctx.fill();
      ctx.stroke();

      // Eye Lights (Blinking & Pulse)
      const isBlinking = (Math.sin(time * 0.7) > 0.96) && (botState === 'idle');
      if (!isBlinking) {
        const eyeW = botState === 'thinking' ? 6 : 10;
        const eyeH = botState === 'thinking' ? 10 : 6;
        const eyePulse = Math.sin(time * 5) * 1.5;

        // Left Eye
        ctx.fillStyle = stateColor;
        ctx.shadowColor = stateColor;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.ellipse(-13, -9, (eyeW / 2) + (botState === 'speaking' ? eyePulse : 0), eyeH / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Right Eye
        ctx.beginPath();
        ctx.ellipse(13, -9, (eyeW / 2) + (botState === 'speaking' ? eyePulse : 0), eyeH / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // reset shadow
      } else {
        // Blinking line
        ctx.strokeStyle = stateColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-18, -9);
        ctx.lineTo(-8, -9);
        ctx.moveTo(8, -9);
        ctx.lineTo(18, -9);
        ctx.stroke();
      }

      // 7. Dynamic Audio-reactive Mouth Equalizer (Speaking State)
      const mouthY = 18;
      if (botState === 'speaking') {
        const bars = 5;
        const barWidth = 3;
        const spacing = 5;
        const startX = -((bars * spacing) / 2) + 2;

        for (let i = 0; i < bars; i++) {
          const barHeight = Math.abs(Math.sin(time * 8 + i * 1.2)) * 14 + 3;
          ctx.fillStyle = stateColor;
          ctx.fillRect(startX + i * spacing, mouthY - barHeight / 2, barWidth, barHeight);
        }
      } else if (botState === 'thinking') {
        // Thinking Progress Dots
        const dotCount = 3;
        for (let i = 0; i < dotCount; i++) {
          const dotAlpha = (Math.sin(time * 6 - i * 1.5) + 1) / 2;
          ctx.fillStyle = `rgba(168, 85, 247, ${dotAlpha})`;
          ctx.beginPath();
          ctx.arc(-8 + i * 8, mouthY, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Subtle Friendly Smile / Mouth Line
        ctx.strokeStyle = `${stateColor}77`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-10, mouthY - 1);
        ctx.quadraticCurveTo(0, mouthY + 3, 10, mouthY - 1);
        ctx.stroke();
      }

      // Forehead Tech Mark / TRÍ AI Insignia
      ctx.fillStyle = stateColor;
      ctx.beginPath();
      ctx.moveTo(0, -42);
      ctx.lineTo(4, -36);
      ctx.lineTo(0, -30);
      ctx.lineTo(-4, -36);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      // 8. Floating Status Particle Aura (Success, Thinking, Error)
      if (botState === 'success') {
        for (let i = 0; i < 8; i++) {
          const pAngle = time * 2 + (i * Math.PI * 2) / 8;
          const pDist = 65 + Math.sin(time * 4 + i) * 15;
          const px = centerX + Math.cos(pAngle) * pDist;
          const py = centerY + Math.sin(pAngle) * pDist;
          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [botState, robotModel]);

  // State badges & descriptions
  const stateLabels = {
    idle: { text: 'Chờ lệnh (Idle)', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    listening: { text: 'Đang lắng nghe (Listening)', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
    thinking: { text: 'Đang suy nghĩ (Thinking)', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
    speaking: { text: 'Đang tư vấn (Speaking)', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    success: { text: 'Ghi nhận Lead (Success)', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
    error: { text: 'Bảo trì kết nối (Error)', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' }
  };

  const currentState = stateLabels[botState] || stateLabels.idle;

  return (
    <div className="relative w-full rounded-2xl bg-gradient-to-b from-[#0b1329] via-[#080d1d] to-[#060b18] border border-cyan-500/20 shadow-2xl p-4 overflow-hidden flex flex-col items-center">
      {/* Background ambient grid effect */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293708_1px,transparent_1px),linear-gradient(to_bottom,#1f293708_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

      {/* Top Status Bar */}
      <div className="w-full flex items-center justify-between z-10 mb-1 px-1">
        <div className="flex items-center space-x-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${botState === 'error' ? 'bg-rose-400' : 'bg-cyan-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${botState === 'error' ? 'bg-rose-500' : 'bg-cyan-500'}`}></span>
          </span>
          <div className="flex flex-col">
            <span className="text-xs font-bold tracking-wider text-cyan-300 font-display uppercase">{botName}</span>
            <span className="text-[10px] text-slate-400">Trợ lý bán hàng của {ownerName}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${currentState.color} transition-all`}>
            {currentState.text}
          </span>
          {onToggleSound && (
            <button
              onClick={onToggleSound}
              className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 hover:text-cyan-300 transition-colors"
              title={isSpeakingAudio ? 'Tắt âm thanh' : 'Bật âm thanh'}
            >
              {isSpeakingAudio ? <Volume2 size={14} className="text-cyan-400" /> : <VolumeX size={14} />}
            </button>
          )}
        </div>
      </div>

      {/* 3D Humanoid Canvas */}
      <div className="relative w-full h-48 md:h-56 flex items-center justify-center my-1">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-pointer transition-transform hover:scale-105 duration-300"
          title="Nhân vật robot Humanoid AI 3D tương tác 60FPS"
        />

        {/* Lightweight FPS & Performance Monitor badge */}
        <div className="absolute bottom-1 right-2 flex items-center space-x-1 text-[10px] font-mono text-slate-500/80 bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800 pointer-events-none">
          <Activity size={10} className="text-emerald-500" />
          <span>{fps} FPS • Canvas 3D</span>
        </div>
      </div>

      {/* Bottom Core Specs Pill */}
      <div className="w-full flex items-center justify-between text-[11px] text-slate-400 px-2 py-1.5 rounded-xl bg-slate-900/40 border border-slate-800/80 mt-1">
        <div className="flex items-center space-x-1.5">
          <Cpu size={12} className="text-cyan-400" />
          <span>Kiến trúc: <strong className="text-slate-200">Neural Sales V8</strong></span>
        </div>
        <div className="flex items-center space-x-1.5">
          <ShieldCheck size={12} className="text-emerald-400" />
          <span>Bảo mật: <strong className="text-emerald-300">Không lưu cookie rác</strong></span>
        </div>
      </div>
    </div>
  );
};

export default HumanoidRobot3D;
