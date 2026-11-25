import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Bell,
  AlertTriangle,
  Repeat,
  Settings,
  Plus,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Search,
  ExternalLink,
  Shield,
  Send,
  Zap,
  CalendarCheck
} from 'lucide-react';

export default function AssistantManager() {
  const [subTab, setSubTab] = useState('calendar'); // 'calendar', 'tasks', 'reminders', 'overdue', 'recurring', 'settings'
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Data states
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [recurringSchedules, setRecurringSchedules] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [preferences, setPreferences] = useState({
    enable_in_app: 1,
    enable_push: 1,
    enable_email: 0,
    enable_telegram: 0,
    telegram_chat_id: '',
    email_address: '',
    quiet_hours_start: '22:00',
    quiet_hours_end: '07:00'
  });

  // Event modal state
  const [showEventModal, setShowEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    location: '',
    startTime: '',
    endTime: '',
    priority: 'MEDIUM'
  });

  // Task modal state
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    dueAt: '',
    priority: 'NORMAL'
  });

  const token = localStorage.getItem('ownerToken') || localStorage.getItem('token');
  const authHeaders = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchEvents(),
        fetchTasks(),
        fetchRecurring(),
        fetchFollowUps(),
        fetchPreferences()
      ]);
    } catch (err) {
      console.error('Error loading assistant data:', err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, isError = false) => {
    setMessage({ text: msg, isError });
    setTimeout(() => setMessage(null), 4000);
  };

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/assistant/calendar', { headers: authHeaders });
      const data = await res.json();
      if (data.success) setEvents(data.events || []);
    } catch (e) {
      console.error('Failed to fetch events', e);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks?limit=50', { headers: authHeaders });
      const data = await res.json();
      if (data.success) setTasks(data.tasks || []);
    } catch (e) {
      console.error('Failed to fetch tasks', e);
    }
  };

  const fetchRecurring = async () => {
    try {
      const res = await fetch('/api/assistant/recurring', { headers: authHeaders });
      const data = await res.json();
      if (data.success) setRecurringSchedules(data.schedules || []);
    } catch (e) {
      console.error('Failed to fetch recurring', e);
    }
  };

  const fetchFollowUps = async () => {
    try {
      const res = await fetch('/api/assistant/follow-ups', { headers: authHeaders });
      const data = await res.json();
      if (data.success) setFollowUps(data.rules || []);
    } catch (e) {
      console.error('Failed to fetch follow-ups', e);
    }
  };

  const fetchPreferences = async () => {
    try {
      const res = await fetch('/api/assistant/preferences', { headers: authHeaders });
      const data = await res.json();
      if (data.success && data.preferences) setPreferences(data.preferences);
    } catch (e) {
      console.error('Failed to fetch preferences', e);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.startTime || !newEvent.endTime) {
      showToast('Vui lòng điền đủ tiêu đề và thời gian sự kiện', true);
      return;
    }

    try {
      const res = await fetch('/api/assistant/calendar', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(newEvent)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Đã thêm sự kiện vào lịch thành công!');
        setShowEventModal(false);
        setNewEvent({ title: '', description: '', location: '', startTime: '', endTime: '', priority: 'MEDIUM' });
        fetchEvents();
      } else {
        showToast(data.error || 'Thất bại khi thêm sự kiện', true);
      }
    } catch (err) {
      showToast('Lỗi kết nối khi tạo sự kiện', true);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title) {
      showToast('Tiêu đề công việc không được để trống', true);
      return;
    }

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(newTask)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Đã thêm công việc mới vào To-do List!');
        setShowTaskModal(false);
        setNewTask({ title: '', description: '', dueAt: '', priority: 'NORMAL' });
        fetchTasks();
      } else {
        showToast(data.error || 'Thất bại khi thêm công việc', true);
      }
    } catch (err) {
      showToast('Lỗi kết nối khi tạo công việc', true);
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status: 'COMPLETED' })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Đã cập nhật hoàn thành công việc!');
        fetchTasks();
      }
    } catch (err) {
      showToast('Không thể cập nhật công việc', true);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!confirm('Anh có chắc muốn hủy sự kiện này trên lịch?')) return;
    try {
      const res = await fetch(`/api/assistant/calendar/${eventId}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      const data = await res.json();
      if (data.success) {
        showToast('Đã hủy sự kiện trên lịch.');
        fetchEvents();
      }
    } catch (err) {
      showToast('Không thể hủy sự kiện', true);
    }
  };

  const handleDeleteRecurring = async (scheduleId) => {
    if (!confirm('Anh có chắc muốn dừng lịch lặp định kỳ này?')) return;
    try {
      const res = await fetch(`/api/assistant/recurring/${scheduleId}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      const data = await res.json();
      if (data.success) {
        showToast('Đã dừng lịch lặp định kỳ.');
        fetchRecurring();
      }
    } catch (err) {
      showToast('Không thể xóa lịch định kỳ', true);
    }
  };

  const handleCancelFollowUp = async (ruleId) => {
    if (!confirm('Anh có muốn hủy theo dõi đối tượng này?')) return;
    try {
      const res = await fetch(`/api/assistant/follow-ups/${ruleId}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      const data = await res.json();
      if (data.success) {
        showToast('Đã hủy quy tắc theo dõi.');
        fetchFollowUps();
      }
    } catch (err) {
      showToast('Không thể hủy theo dõi', true);
    }
  };

  const handleSavePreferences = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/assistant/preferences', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(preferences)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Đã lưu cấu hình thông báo đa kênh thành công!');
        setPreferences(data.preferences);
      } else {
        showToast(data.error || 'Lỗi khi lưu cấu hình', true);
      }
    } catch (err) {
      showToast('Lỗi kết nối khi lưu cài đặt', true);
    }
  };

  // Filter overdue tasks
  const overdueTasks = tasks.filter(t => {
    if (t.status === 'COMPLETED' || t.status === 'CANCELLED') return false;
    if (!t.due_at) return false;
    return new Date(t.due_at) < new Date();
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative">
      {/* Toast Banner */}
      {message && (
        <div className={`mb-6 p-4 rounded-2xl flex items-center justify-between text-sm font-semibold transition-all shadow-lg ${
          message.isError
            ? 'bg-rose-500/20 border border-rose-500/50 text-rose-300'
            : 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs underline hover:opacity-80">Đóng</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Zap className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-cyan-400">
                TRỢ LÝ THƯ KÝ & LỊCH TRÌNH THÔNG MINH
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Quản lý công việc, lịch trình, nhắc việc đa kênh và quy tắc theo dõi thông minh của Anh Trí
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAllData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all border border-slate-700"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Đồng bộ</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap gap-2 mt-6 pb-2 border-b border-slate-800/80">
        <button
          onClick={() => setSubTab('calendar')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
            subTab === 'calendar'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Calendar size={16} />
          <span>Lịch của tôi ({events.length})</span>
        </button>

        <button
          onClick={() => setSubTab('tasks')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
            subTab === 'tasks'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <CheckCircle2 size={16} />
          <span>Công việc của tôi ({tasks.length})</span>
        </button>

        <button
          onClick={() => setSubTab('overdue')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all relative ${
            subTab === 'overdue'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <AlertTriangle size={16} className={overdueTasks.length > 0 ? 'text-rose-400' : ''} />
          <span>Quá hạn</span>
          {overdueTasks.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
              {overdueTasks.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setSubTab('recurring')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
            subTab === 'recurring'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Repeat size={16} />
          <span>Lịch định kỳ & Theo dõi ({recurringSchedules.length + followUps.length})</span>
        </button>

        <button
          onClick={() => setSubTab('settings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
            subTab === 'settings'
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Settings size={16} />
          <span>Cài đặt thông báo</span>
        </button>
      </div>

      {/* Tab 1: CALENDAR */}
      {subTab === 'calendar' && (
        <div className="mt-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
              <CalendarCheck size={18} className="text-cyan-400" />
              Sự kiện & Cuộc họp đã lên lịch
            </h3>
            <button
              onClick={() => setShowEventModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition-all shadow-md"
            >
              <Plus size={14} />
              <span>Thêm sự kiện</span>
            </button>
          </div>

          {events.length === 0 ? (
            <div className="p-8 text-center bg-slate-800/30 rounded-2xl border border-slate-800 text-slate-400 text-sm">
              Chưa có sự kiện nào trong lịch. Anh có thể thêm sự kiện hoặc giao việc trực tiếp trong ô chat:
              <br />
              <span className="text-cyan-300 font-medium">"Ngày mai 8 giờ nhắc tôi họp với nhà cung cấp"</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {events.map((evt) => (
                <div key={evt.eventId} className="p-4 bg-slate-800/50 border border-slate-700/60 rounded-2xl hover:border-cyan-500/40 transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-white text-sm sm:text-base">{evt.title}</h4>
                      {evt.location && (
                        <p className="text-xs text-slate-400 mt-0.5">📍 {evt.location}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteEvent(evt.eventId)}
                      title="Hủy sự kiện"
                      className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-800/50 font-mono">
                      🕒 {new Date(evt.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(evt.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ({new Date(evt.startTime).toLocaleDateString('vi-VN')})
                    </span>
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                      evt.priority === 'URGENT' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                      evt.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                      'bg-slate-700 text-slate-300'
                    }`}>
                      {evt.priority}
                    </span>
                  </div>
                  {evt.description && (
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2">{evt.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: TASKS */}
      {subTab === 'tasks' && (
        <div className="mt-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-400" />
              To-do List & Danh sách công việc
            </h3>
            <button
              onClick={() => setShowTaskModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md"
            >
              <Plus size={14} />
              <span>Thêm công việc</span>
            </button>
          </div>

          {tasks.length === 0 ? (
            <div className="p-8 text-center bg-slate-800/30 rounded-2xl border border-slate-800 text-slate-400 text-sm">
              Không có công việc nào trong danh sách.
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div key={task.task_id || task.id} className="p-4 bg-slate-800/40 border border-slate-700/50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleCompleteTask(task.task_id || task.id)}
                      disabled={task.status === 'COMPLETED'}
                      className={`mt-0.5 rounded-lg p-1.5 transition-all ${
                        task.status === 'COMPLETED'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-slate-700/60 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400'
                      }`}
                    >
                      <CheckCircle2 size={16} />
                    </button>
                    <div>
                      <h4 className={`text-sm font-bold ${task.status === 'COMPLETED' ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                        {task.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                        {task.due_at && (
                          <span className="text-slate-400">
                            Hạn: {new Date(task.due_at).toLocaleString('vi-VN')}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          task.priority === 'URGENT' ? 'bg-rose-500/20 text-rose-300' :
                          task.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-300' :
                          'bg-slate-700/60 text-slate-400'
                        }`}>
                          {task.priority}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${
                          task.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300' :
                          task.status === 'IN_PROGRESS' ? 'bg-cyan-500/20 text-cyan-300' :
                          'bg-slate-700/40 text-slate-400'
                        }`}>
                          {task.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: OVERDUE */}
      {subTab === 'overdue' && (
        <div className="mt-6 space-y-4">
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-300 text-sm">
            <AlertTriangle size={20} className="text-rose-400 shrink-0" />
            <div>
              <span className="font-bold">Khu vực cảnh báo quá hạn:</span> Các công việc chưa hoàn thành đã vượt quá thời hạn chót cam kết. Anh nên ưu tiên xử lý hoặc dời lịch nhắc.
            </div>
          </div>

          {overdueTasks.length === 0 ? (
            <div className="p-8 text-center bg-slate-800/30 rounded-2xl border border-slate-800 text-emerald-300 text-sm font-bold">
              🎉 Tuyệt vời! Hiện tại anh không có công việc nào bị quá hạn.
            </div>
          ) : (
            <div className="space-y-3">
              {overdueTasks.map((task) => (
                <div key={task.task_id || task.id} className="p-4 bg-slate-800/60 border border-rose-500/30 rounded-2xl flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-rose-200 text-sm sm:text-base">{task.title}</h4>
                    <p className="text-xs text-rose-400/80 mt-0.5">
                      Đã quá hạn từ: {new Date(task.due_at).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCompleteTask(task.task_id || task.id)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shrink-0"
                  >
                    Hoàn thành
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: RECURRING & FOLLOW-UP */}
      {subTab === 'recurring' && (
        <div className="mt-6 space-y-6">
          {/* Recurring section */}
          <div>
            <h3 className="text-base font-bold text-indigo-300 flex items-center gap-2 mb-3">
              <Repeat size={18} />
              Lịch Lặp Định Kỳ (Recurring Schedules)
            </h3>
            {recurringSchedules.length === 0 ? (
              <div className="p-4 text-center bg-slate-800/30 rounded-xl text-slate-400 text-xs">
                Chưa có lịch lặp định kỳ nào. Anh có thể nói trong chat:
                <br />
                <span className="text-indigo-300">"Thứ Hai hằng tuần lúc 9 giờ nhắc tôi kiểm tra PO"</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recurringSchedules.map((rec) => (
                  <div key={rec.scheduleId} className="p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-white text-xs sm:text-sm">{rec.title}</h4>
                      <p className="text-[11px] font-mono text-indigo-300 mt-1">Quy tắc: {rec.recurrenceRule}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Lần chạy tiếp: {new Date(rec.nextRunAt).toLocaleString('vi-VN')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteRecurring(rec.scheduleId)}
                      title="Dừng lịch lặp"
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Follow-up section */}
          <div>
            <h3 className="text-base font-bold text-cyan-300 flex items-center gap-2 mb-3">
              <Shield size={18} />
              Quy Tắc Theo Dõi Có Điều Kiện (Smart Follow-Ups)
            </h3>
            {followUps.length === 0 ? (
              <div className="p-4 text-center bg-slate-800/30 rounded-xl text-slate-400 text-xs">
                Chưa có quy tắc theo dõi nào đang chạy. Anh có thể nói trong chat:
                <br />
                <span className="text-cyan-300">"Nhắc tôi sau 3 ngày nếu nhà cung cấp chưa xác nhận"</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {followUps.map((fol) => (
                  <div key={fol.ruleId} className="p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                          {fol.conditionType}
                        </span>
                        <span className="text-xs font-bold text-slate-200">{fol.targetRef}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Thời hạn chờ: {fol.maxWaitHours} giờ (Kiểm tra mỗi {fol.checkIntervalHours}h)
                      </p>
                      <p className="text-[10px] text-emerald-400 font-medium mt-0.5">
                        Trạng thái: {fol.status}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCancelFollowUp(fol.ruleId)}
                      title="Hủy theo dõi"
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: SETTINGS */}
      {subTab === 'settings' && (
        <form onSubmit={handleSavePreferences} className="mt-6 max-w-2xl space-y-6">
          <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
            <Settings size={18} className="text-teal-400" />
            Cấu Hình Thông Báo Đa Kênh & Giờ Yên Lặng
          </h3>

          <div className="space-y-4 bg-slate-800/40 p-5 rounded-2xl border border-slate-700/60">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kênh thông báo</h4>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-200">Thông báo trên WebApp</p>
                <p className="text-xs text-slate-400">Hiển thị badge số lượng và danh sách tại nút "Nhắc việc"</p>
              </div>
              <input
                type="checkbox"
                checked={Boolean(preferences.enable_in_app)}
                onChange={(e) => setPreferences({ ...preferences, enable_in_app: e.target.checked ? 1 : 0 })}
                className="w-5 h-5 accent-cyan-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-200">Web Push Notification</p>
                <p className="text-xs text-slate-400">Gửi thông báo đẩy về trình duyệt máy tính / điện thoại</p>
              </div>
              <input
                type="checkbox"
                checked={Boolean(preferences.enable_push)}
                onChange={(e) => setPreferences({ ...preferences, enable_push: e.target.checked ? 1 : 0 })}
                className="w-5 h-5 accent-cyan-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-200">Telegram Bot Alert</p>
                <p className="text-xs text-slate-400">Gửi tin nhắn cảnh báo tới Telegram của Anh Trí</p>
              </div>
              <input
                type="checkbox"
                checked={Boolean(preferences.enable_telegram)}
                onChange={(e) => setPreferences({ ...preferences, enable_telegram: e.target.checked ? 1 : 0 })}
                className="w-5 h-5 accent-cyan-500"
              />
            </div>

            {Boolean(preferences.enable_telegram) && (
              <div className="pt-2">
                <label className="text-xs text-slate-400 block mb-1">Telegram Chat ID:</label>
                <input
                  type="text"
                  placeholder="Ví dụ: 123456789"
                  value={preferences.telegram_chat_id || ''}
                  onChange={(e) => setPreferences({ ...preferences, telegram_chat_id: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-200">Email SMTP Alert</p>
                <p className="text-xs text-slate-400">Gửi bản tin và nhắc việc quan trọng qua Email</p>
              </div>
              <input
                type="checkbox"
                checked={Boolean(preferences.enable_email)}
                onChange={(e) => setPreferences({ ...preferences, enable_email: e.target.checked ? 1 : 0 })}
                className="w-5 h-5 accent-cyan-500"
              />
            </div>

            {Boolean(preferences.enable_email) && (
              <div className="pt-2">
                <label className="text-xs text-slate-400 block mb-1">Địa chỉ Email nhận:</label>
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={preferences.email_address || ''}
                  onChange={(e) => setPreferences({ ...preferences, email_address: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            )}
          </div>

          <div className="space-y-4 bg-slate-800/40 p-5 rounded-2xl border border-slate-700/60">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Giờ yên lặng (Quiet Hours)</h4>
            <p className="text-xs text-slate-400">
              Trong khung giờ này, hệ thống sẽ tạm hoãn các thông báo thông thường, chỉ phát thông báo khẩn cấp (URGENT).
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Bắt đầu từ:</label>
                <input
                  type="time"
                  value={preferences.quiet_hours_start || '22:00'}
                  onChange={(e) => setPreferences({ ...preferences, quiet_hours_start: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Kết thúc lúc:</label>
                <input
                  type="time"
                  value={preferences.quiet_hours_end || '07:00'}
                  onChange={(e) => setPreferences({ ...preferences, quiet_hours_end: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-black text-sm shadow-lg hover:opacity-90 transition-all"
          >
            Lưu Cấu Hình Thông Báo
          </button>
        </form>
      )}

      {/* Modal Thêm sự kiện */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-cyan-300">Thêm sự kiện / cuộc họp mới</h3>
            <form onSubmit={handleCreateEvent} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Tiêu đề cuộc hẹn / sự kiện *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Họp với nhà cung cấp máy in"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Bắt đầu *</label>
                  <input
                    type="datetime-local"
                    required
                    value={newEvent.startTime}
                    onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Kết thúc *</label>
                  <input
                    type="datetime-local"
                    required
                    value={newEvent.endTime}
                    onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Địa điểm</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Phòng họp 1 hoặc Online Zoom"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Mô tả chi tiết</label>
                <textarea
                  rows="2"
                  placeholder="Nội dung trao đổi..."
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-black"
                >
                  Thêm vào lịch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Thêm công việc */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-emerald-300">Thêm công việc mới</h3>
            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Tiêu đề công việc *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Kiểm tra tiến độ đơn hàng PO"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Thời hạn (Due Date)</label>
                <input
                  type="datetime-local"
                  value={newTask.dueAt}
                  onChange={(e) => setNewTask({ ...newTask, dueAt: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Mức độ ưu tiên</label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="LOW">LOW - Ưu tiên thấp</option>
                  <option value="NORMAL">NORMAL - Bình thường</option>
                  <option value="HIGH">HIGH - Ưu tiên cao</option>
                  <option value="URGENT">URGENT - Khẩn cấp</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-black"
                >
                  Lưu công việc
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
