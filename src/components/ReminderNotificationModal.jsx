import React, { useState } from 'react';
import { Bell, Check, Clock, AlertTriangle, X, Calendar, CheckCircle2, ChevronRight, RefreshCw } from 'lucide-react';

export default function ReminderNotificationModal({
  isOpen,
  onClose,
  notifications = [],
  unreadCount = 0,
  onMarkAsRead,
  onReschedule,
  isLoading = false
}) {
  const [activeTab, setActiveTab] = useState('unread'); // 'unread' | 'all'

  if (!isOpen) return null;

  const displayList = activeTab === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications;

  const formatDateTime = (isoStr) => {
    if (!isoStr) return 'Không rõ';
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString('vi-VN');
    } catch {
      return isoStr;
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'URGENT':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">Khẩn cấp</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">Ưu tiên cao</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">Bình thường</span>;
    }
  };

  const getTaskStatusLabel = (status) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="text-emerald-400 flex items-center gap-1">✅ Đã hoàn thành</span>;
      case 'IN_PROGRESS':
        return <span className="text-amber-400 flex items-center gap-1">⏳ Đang thực hiện</span>;
      case 'WAITING':
        return <span className="text-blue-400 flex items-center gap-1">🕒 Đang chờ</span>;
      case 'OVERDUE':
        return <span className="text-rose-400 flex items-center gap-1">⚠️ Quá hạn</span>;
      default:
        return <span className="text-slate-300 flex items-center gap-1">📌 Chưa thực hiện</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#08152e] border border-cyan-500/40 rounded-2xl shadow-[0_0_35px_rgba(0,240,255,0.25)] text-slate-100 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cyan-500/20 bg-[#061024]/80">
          <div className="flex items-center space-x-3">
            <div className="relative p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Bell size={20} className={unreadCount > 0 ? 'animate-bounce' : ''} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-md">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Thông báo Nhắc việc
                <span className="text-xs font-normal text-cyan-300/80 px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30">
                  Thư ký riêng Anh Trí
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Toàn bộ lịch nhắc và tiến độ công việc phát sinh tự động từ Thư ký AI
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            title="Đóng cửa sổ"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex items-center px-5 pt-3 border-b border-slate-800 bg-[#071329]">
          <button
            onClick={() => setActiveTab('unread')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold transition-all relative ${
              activeTab === 'unread'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Chưa xem ({notifications.filter(n => !n.is_read).length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold transition-all relative ${
              activeTab === 'all'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tất cả thông báo ({notifications.length})
          </button>
        </div>

        {/* Body Notification List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 custom-scrollbar">
          {displayList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-full bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
                <CheckCircle2 size={26} />
              </div>
              <h3 className="text-sm font-semibold text-white">Tuyệt vời!</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                {activeTab === 'unread'
                  ? 'Hiện tại anh không có thông báo nhắc việc nào chưa xem.'
                  : 'Chưa có thông báo nhắc việc nào được ghi nhận.'}
              </p>
              <p className="text-[11px] text-cyan-400/70 mt-2">
                Anh có thể giao việc mới trong ô chat bất kỳ lúc nào.
              </p>
            </div>
          ) : (
            displayList.map((notif) => {
              const isUnread = !notif.is_read;
              return (
                <div
                  key={notif.notification_id || notif.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isUnread
                      ? 'bg-[#0c1f44] border-cyan-500/40 shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                      : 'bg-[#071329]/70 border-slate-800 text-slate-300 opacity-80'
                  }`}
                >
                  {/* Top info */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-cyan-200">
                        {notif.title}
                      </span>
                      {getPriorityBadge(notif.priority)}
                      {isUnread && (
                        <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 flex-shrink-0">
                      <Clock size={12} />
                      {formatDateTime(notif.created_at)}
                    </div>
                  </div>

                  {/* Content */}
                  <p className="text-xs sm:text-sm text-slate-200 mb-3 leading-relaxed">
                    {notif.content}
                  </p>

                  {/* Metadata strip */}
                  <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 py-2 px-3 rounded-lg bg-black/25 border border-white/5 text-[11px] text-slate-300 mb-3">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400">Ngày giờ nhắc:</span>
                      <strong className="text-amber-300 font-medium">{formatDateTime(notif.remind_at)}</strong>
                    </div>
                    {notif.due_at && (
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">Hạn chót:</span>
                        <strong className="text-rose-300 font-medium">{formatDateTime(notif.due_at)}</strong>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400">Trạng thái:</span>
                      {getTaskStatusLabel(notif.task_status || notif.status)}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/5">
                    {/* Nút ĐÃ XEM */}
                    {isUnread && (
                      <button
                        onClick={() => onMarkAsRead(notif.notification_id || notif.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-medium transition-all active:scale-95"
                        title="Đánh dấu đã xem (không hoàn thành công việc)"
                      >
                        <Check size={14} className="text-emerald-400" />
                        <span>Đã xem</span>
                      </button>
                    )}

                    {/* Nút NHẮC LẠI */}
                    <button
                      onClick={() => onReschedule(notif)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-[0_0_12px_rgba(0,240,255,0.3)] transition-all active:scale-95"
                      title="Mở ô chat để dời lịch nhắc sang thời gian khác"
                    >
                      <Clock size={14} />
                      <span>Nhắc lại</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info notice */}
        <div className="px-5 py-3 border-t border-slate-800 bg-[#061024] text-[11px] text-slate-400 flex items-center justify-between">
          <span>💡 <strong>Đã xem:</strong> ẩn thông báo. <strong>Nhắc lại:</strong> chuyển sang ô chat để chọn giờ mới.</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
}
