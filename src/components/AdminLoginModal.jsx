import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Lock, User, Eye, EyeOff, X, ArrowRight, AlertCircle, KeyRound } from 'lucide-react';

export const AdminLoginModal = ({ isOpen = false, onClose, onSuccess }) => {
  const [username, setUsername] = useState('Admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const passInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setError('');
      setPassword('');
      setTimeout(() => {
        passInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!username.trim()) {
      setError('Vui lòng nhập Tên đăng nhập.');
      return;
    }
    if (!password.trim()) {
      setError('Vui lòng nhập Mật khẩu.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Tên đăng nhập hoặc mật khẩu không chính xác.');
      }

      // Save token into sessionStorage
      sessionStorage.setItem('triai_admin_token', data.token || 'admin_logged_in');
      sessionStorage.setItem('triai_admin_user', data.user?.username || 'Admin');

      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-md bg-gradient-to-b from-[#091b3e] to-[#040e24] border-2 border-cyan-500/60 rounded-3xl p-6 sm:p-7 shadow-[0_0_50px_rgba(0,240,255,0.25)] text-slate-100 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/60 transition-all cursor-pointer"
          title="Đóng"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 border border-cyan-400 flex items-center justify-center text-white shadow-[0_0_15px_rgba(0,240,255,0.4)]">
            <ShieldCheck size={24} className="text-cyan-200" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg sm:text-xl text-white tracking-tight font-display flex items-center gap-1.5">
              XÁC THỰC CHỦ NHÂN
            </h3>
            <p className="text-xs text-cyan-300/80 font-medium">
              Vui lòng nhập tài khoản để vào Bảng Quản trị
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-200 text-xs sm:text-sm flex items-start gap-2.5 animate-shake">
            <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <div className="leading-tight">{error}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Username Field */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <User size={13} className="text-cyan-400" /> Tên đăng nhập (User)
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Admin"
                className="w-full bg-[#030b1c] border border-cyan-500/40 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all font-medium"
                autoComplete="username"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <KeyRound size={13} className="text-cyan-400" /> Mật khẩu (Password)
            </label>
            <div className="relative">
              <input
                ref={passInputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu..."
                className="w-full bg-[#030b1c] border border-cyan-500/40 rounded-xl pl-4 pr-11 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all font-mono"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-300 p-1 cursor-pointer transition-colors"
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Notice */}
          <div className="text-[11px] text-slate-400/80 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800">
            💡 Tài khoản mặc định: <span className="text-cyan-300 font-bold">Admin</span> / Mật khẩu: <span className="text-cyan-300 font-bold font-mono">0982441446</span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm border border-slate-700 transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm shadow-[0_0_20px_rgba(0,240,255,0.35)] hover:shadow-[0_0_25px_rgba(0,240,255,0.5)] transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang xác thực...</span>
                </>
              ) : (
                <>
                  <span>Đăng nhập</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminLoginModal;
