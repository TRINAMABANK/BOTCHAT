import React, { useState, useEffect } from 'react';
import {
  Brain,
  Layers,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  RefreshCw,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  ListTodo
} from 'lucide-react';

export default function HumanBrainMemoryCenter() {
  const [activeSubTab, setActiveSubTab] = useState('overview'); // 'overview', 'memories', 'timeline', 'contradictions', 'planning'
  const [stats, setStats] = useState(null);
  const [memories, setMemories] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [contradictions, setContradictions] = useState([]);
  const [plans, setPlans] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [creatingGoal, setCreatingGoal] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/memory/stats');
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMemories = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType !== 'ALL') params.append('type', filterType);
      if (search) params.append('search', search);
      const res = await fetch(`/api/memory/list?${params.toString()}`);
      const data = await res.json();
      if (data.success) setMemories(data.memories || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeline = async () => {
    try {
      const res = await fetch('/api/memory/timeline');
      const data = await res.json();
      if (data.success) setTimeline(data.timeline || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchContradictions = async () => {
    try {
      const res = await fetch('/api/memory/contradictions');
      const data = await res.json();
      if (data.success) setContradictions(data.contradictions || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/memory/plans');
      const data = await res.json();
      if (data.success) setPlans(data.plans || null);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchMemories();
    fetchTimeline();
    fetchContradictions();
    fetchPlans();
  }, [filterType]);

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;
    setCreatingGoal(true);
    try {
      const res = await fetch('/api/memory/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalTitle: newGoalTitle.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setNewGoalTitle('');
        await fetchPlans();
        await fetchStats();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreatingGoal(false);
    }
  };

  const handleDeleteMemory = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn lưu trữ/xóa ký ức này không?')) return;
    try {
      await fetch(`/api/memory/${id}`, { method: 'DELETE' });
      await fetchMemories();
      await fetchStats();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      {/* Top Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-[#0a1a3a] via-[#0d2757] to-[#091838] border border-cyan-500/30 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300">
            <Brain size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white font-display flex items-center gap-2">
              <span>TRÍ AI – HUMAN BRAIN & MEMORY CENTER</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-400/50 text-cyan-300 font-bold uppercase">
                5-Tier Active
              </span>
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Hệ thống trí nhớ 5 tầng: Working, Episodic, Semantic, Procedural, Prospective & Lập kế hoạch
            </p>
          </div>
        </div>

        <button
          onClick={() => { fetchStats(); fetchMemories(); fetchTimeline(); fetchContradictions(); fetchPlans(); }}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#0b2046] hover:bg-[#0e2a5c] border border-cyan-500/40 text-xs font-bold text-cyan-300 transition-all active:scale-95"
        >
          <RefreshCw size={13} />
          <span>Làm mới bộ não</span>
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-cyan-500/20 pb-3">
        {[
          { id: 'overview', label: 'Tổng quan Bộ não', icon: Brain },
          { id: 'memories', label: 'Kho ký ức 5 tầng', icon: Layers },
          { id: 'timeline', label: 'Dòng thời gian (Episodic)', icon: Clock },
          { id: 'contradictions', label: `Phát hiện Mâu thuẫn (${stats?.contradictionsCount || 0})`, icon: AlertTriangle },
          { id: 'planning', label: 'Lập kế hoạch & Nhiệm vụ', icon: ListTodo }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md'
                  : 'bg-[#081838] text-slate-300 hover:text-white hover:bg-[#0c2452] border border-cyan-500/20'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW METRICS */}
      {activeSubTab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Tổng số ký ức', val: stats?.totalMemories || 0, color: 'text-cyan-300', bg: 'border-cyan-500/30' },
              { label: 'Working (Làm việc)', val: stats?.countsByType?.WORKING || 0, color: 'text-blue-300', bg: 'border-blue-500/30' },
              { label: 'Episodic (Sự kiện)', val: stats?.countsByType?.EPISODIC || 0, color: 'text-purple-300', bg: 'border-purple-500/30' },
              { label: 'Semantic (Kiến thức)', val: stats?.countsByType?.SEMANTIC || 0, color: 'text-emerald-300', bg: 'border-emerald-500/30' },
              { label: 'Procedural (Kỹ năng)', val: stats?.countsByType?.PROCEDURAL || 0, color: 'text-amber-300', bg: 'border-amber-500/30' },
              { label: 'Prospective (Tương lai)', val: stats?.countsByType?.PROSPECTIVE || 0, color: 'text-rose-300', bg: 'border-rose-500/30' }
            ].map((card, idx) => (
              <div key={idx} className={`p-4 rounded-2xl bg-[#081838] border ${card.bg} shadow-md`}>
                <span className="text-[11px] text-slate-400 block font-medium leading-tight">{card.label}</span>
                <span className={`text-2xl font-black font-mono block mt-1.5 ${card.color}`}>
                  {card.val}
                </span>
              </div>
            ))}
          </div>

          {/* Quick Memory Info Card */}
          <div className="p-5 rounded-3xl bg-[#081838] border border-cyan-500/30">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Sparkles size={16} className="text-cyan-400" />
              <span>Cơ Chế Trí Nhớ Giống Con Người Đang Hoạt Động</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              TRÍ AI tự động vận hành quy trình nhận thức: <strong>Tiếp nhận → Phân loại → Kiểm tra mâu thuẫn → Mã hóa băm SHA-256 → Lưu trữ → Củng cố lặp lại</strong>. Mọi sự kiện trao đổi bán hàng, sở thích khách hàng và cam kết thời hạn đều được lưu trữ phân tầng và bảo vệ phân quyền chặt chẽ.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: 5-TIER MEMORIES LIST */}
      {activeSubTab === 'memories' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#081838] p-3 rounded-2xl border border-cyan-500/20">
            <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
              <Search size={14} className="text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm nội dung ký ức, thực thể, chủ đề..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchMemories()}
                className="w-full bg-transparent text-xs text-white placeholder-slate-400 outline-none"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-[#0b2046] border border-cyan-500/40 text-xs rounded-xl px-2.5 py-1.5 text-white font-bold outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả tầng trí nhớ</option>
              <option value="WORKING">Working Memory</option>
              <option value="EPISODIC">Episodic Memory</option>
              <option value="SEMANTIC">Semantic Memory</option>
              <option value="PROCEDURAL">Procedural Memory</option>
              <option value="PROSPECTIVE">Prospective Memory</option>
            </select>
          </div>

          {loading ? (
            <div className="text-center py-10 text-cyan-300 text-xs font-bold">Đang tải kho ký ức...</div>
          ) : memories.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs bg-[#081838] rounded-2xl border border-cyan-500/20">
              Chưa có ký ức nào phù hợp với bộ lọc.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {memories.map((m) => (
                <div key={m.memory_id} className="p-4 rounded-2xl bg-[#081838] border border-cyan-500/20 flex flex-col justify-between hover:border-cyan-400/50 transition-all">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-950 text-blue-300 border border-blue-500/30">
                        {m.memory_type}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Củng cố: x{m.reinforcement_count || 1}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-white leading-relaxed break-words">{m.content}</div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap text-[10px] text-slate-400">
                      <span>Chủ đề: <strong className="text-cyan-300">{m.subject}</strong></span>
                      {m.entity_id && <span>Thực thể: <strong className="text-purple-300">{m.entity_id}</strong></span>}
                      <span>Độ tin cậy: <strong className="text-emerald-300">{Math.round((m.confidence || 1) * 100)}%</strong></span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-cyan-500/10 text-[10px] text-slate-400">
                    <span>{new Date(m.created_at).toLocaleString('vi-VN')}</span>
                    <button
                      onClick={() => handleDeleteMemory(m.memory_id)}
                      className="text-rose-400 hover:text-rose-300 p-1 rounded"
                      title="Lưu trữ ký ức này"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: TIMELINE (EPISODIC) */}
      {activeSubTab === 'timeline' && (
        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-[#081838] border border-cyan-500/20">
            <h4 className="text-xs font-bold text-white mb-3">Dòng thời gian sự kiện & Tương tác khách hàng</h4>
            {timeline.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">Chưa có sự kiện nào được ghi nhận.</div>
            ) : (
              <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-cyan-500/30 pl-7">
                {timeline.map((evt, idx) => (
                  <div key={idx} className="relative">
                    <span className="absolute -left-7 top-1.5 w-2.5 h-2.5 rounded-full bg-cyan-400 border-2 border-[#081838]" />
                    <div className="p-3 rounded-xl bg-[#0b2046] border border-cyan-500/20 text-xs">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span className="font-bold text-cyan-300">{evt.event_category || evt.subject}</span>
                        <span>{new Date(evt.event_time || evt.created_at).toLocaleString('vi-VN')}</span>
                      </div>
                      <div className="text-white font-semibold leading-relaxed">{evt.content}</div>
                      {evt.outcome && <div className="text-[10px] text-emerald-300 mt-1">Kết quả: {evt.outcome}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: CONTRADICTIONS */}
      {activeSubTab === 'contradictions' && (
        <div className="p-4 rounded-2xl bg-[#081838] border border-cyan-500/20 space-y-3">
          <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-amber-400" />
            <span>Lịch sử Phát hiện Mâu thuẫn & Tự động Cập nhật</span>
          </h4>
          <p className="text-xs text-slate-300 mb-3">
            Hệ thống không ghi đè âm thầm. Mọi sự thay đổi thông tin (ngân sách, số điện thoại, ngày hẹn) đều được ghi nhận vào bảng mâu thuẫn để theo dõi tiến trình.
          </p>
          {contradictions.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">Chưa có mâu thuẫn nào phát sinh.</div>
          ) : (
            <div className="space-y-2.5">
              {contradictions.map((c, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-[#0b2046] border border-amber-500/30 text-xs">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span className="font-bold text-amber-300 uppercase">Chủ đề: {c.subject}</span>
                    <span>{new Date(c.created_at).toLocaleString('vi-VN')}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    <div className="p-2 rounded bg-rose-950/40 border border-rose-500/20 text-rose-200">
                      <span className="text-[10px] text-rose-400 block font-medium">Giá trị cũ (Superseded)</span>
                      <span className="font-semibold">{c.old_value}</span>
                    </div>
                    <div className="p-2 rounded bg-emerald-950/40 border border-emerald-500/20 text-emerald-200">
                      <span className="text-[10px] text-emerald-400 block font-medium">Giá trị mới (Active)</span>
                      <span className="font-semibold">{c.new_value}</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-300 mt-2 italic">Lý do: {c.detection_reason}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: PLANNING & PROSPECTIVE */}
      {activeSubTab === 'planning' && (
        <div className="space-y-4">
          {/* Create Goal Form */}
          <form onSubmit={handleCreateGoal} className="p-4 rounded-2xl bg-[#081838] border border-cyan-500/30 space-y-3">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Plus size={14} className="text-cyan-400" />
              <span>Giao Mục Tiêu Mới Cho Planning Engine Phân Rã</span>
            </h4>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Nhập mục tiêu lớn (VD: Lên kế hoạch mua sắm thiết bị văn phòng, Chăm sóc 5 khách tiềm năng...)"
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                className="flex-1 bg-[#050c1f] border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                disabled={creatingGoal}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold text-xs shadow-md active:scale-95 disabled:opacity-50"
              >
                {creatingGoal ? 'Đang phân rã...' : 'Phân rã kế hoạch'}
              </button>
            </div>
          </form>

          {/* Prospective & Tasks List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Owner Tasks */}
            <div className="p-4 rounded-2xl bg-[#081838] border border-cyan-500/20 space-y-3">
              <h4 className="text-xs font-bold text-cyan-300 flex items-center justify-between">
                <span>Nhiệm vụ Owner Tasks ({plans?.tasks?.length || 0})</span>
              </h4>
              <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                {(plans?.tasks || []).map((t, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-[#0b2046] border border-cyan-500/20 text-xs">
                    <div className="font-bold text-white">{t.title}</div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                      <span>Thời hạn: {t.time_spec || 'Cần làm'}</span>
                      <span className={`font-bold ${t.status === 'COMPLETED' ? 'text-emerald-300' : 'text-amber-300'}`}>
                        {t.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Prospective Commitments */}
            <div className="p-4 rounded-2xl bg-[#081838] border border-cyan-500/20 space-y-3">
              <h4 className="text-xs font-bold text-purple-300 flex items-center justify-between">
                <span>Cam kết Trí nhớ Tương lai ({plans?.prospectiveTasks?.length || 0})</span>
              </h4>
              <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                {(plans?.prospectiveTasks || []).map((p, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-[#0b2046] border border-purple-500/20 text-xs">
                    <div className="font-bold text-white">{p.task_title}</div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                      <span>Kích hoạt: {new Date(p.trigger_time).toLocaleString('vi-VN')}</span>
                      <span className="text-purple-300 font-bold uppercase">{p.priority}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
