import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Activity,
  Layers,
  Database,
  ShieldCheck,
  Zap,
  Play,
  RotateCw,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  Search,
  ExternalLink,
  Sliders,
  DollarSign,
  Server
} from 'lucide-react';

export const CentralBrainManagement = ({ orgId = 'org_default' }) => {
  const [subTab, setSubTab] = useState('overview'); // 'overview' | 'tools' | 'memory' | 'telemetry' | 'playground'
  const [loading, setLoading] = useState(false);
  const [statusData, setStatusData] = useState(null);
  const [toolsList, setToolsList] = useState([]);
  const [memories, setMemories] = useState([]);
  const [telemetryLogs, setTelemetryLogs] = useState([]);
  
  // Playground state
  const [playgroundInput, setPlaygroundInput] = useState('Báo giá cho tôi 5 chiếc máy in Brother');
  const [playgroundLoading, setPlaygroundLoading] = useState(false);
  const [playgroundResult, setPlaygroundResult] = useState(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/central-brain/status');
      const data = await res.json();
      if (data.success) {
        setStatusData(data.data);
      }
    } catch (e) {
      console.error('Error fetching brain status:', e);
    }
  };

  const fetchTools = async () => {
    try {
      const res = await fetch('/api/central-brain/tools');
      const data = await res.json();
      if (data.success) {
        setToolsList(data.data);
      }
    } catch (e) {
      console.error('Error fetching tools:', e);
    }
  };

  const fetchMemory = async () => {
    try {
      const res = await fetch(`/api/central-brain/memory?orgId=${orgId}&limit=50`);
      const data = await res.json();
      if (data.success) {
        setMemories(data.data);
      }
    } catch (e) {
      console.error('Error fetching memories:', e);
    }
  };

  const fetchTelemetry = async () => {
    try {
      const res = await fetch('/api/central-brain/telemetry?limit=50');
      const data = await res.json();
      if (data.success) {
        setTelemetryLogs(data.data);
      }
    } catch (e) {
      console.error('Error fetching telemetry:', e);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchTools();
  }, []);

  useEffect(() => {
    if (subTab === 'memory') fetchMemory();
    if (subTab === 'telemetry') fetchTelemetry();
  }, [subTab]);

  const handleDeleteMemory = async (id) => {
    if (!confirm('Bạn có chắc chắn muốn xóa mục ghi nhớ này của khách hàng?')) return;
    try {
      const res = await fetch(`/api/central-brain/memory/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setMemories(prev => prev.filter(m => m.id !== id));
      }
    } catch (e) {
      alert('Lỗi xóa mục ghi nhớ: ' + e.message);
    }
  };

  const handleRunPlayground = async () => {
    if (!playgroundInput.trim()) return;
    setPlaygroundLoading(true);
    setPlaygroundResult(null);

    try {
      const res = await fetch('/api/central-brain/playground', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: playgroundInput.trim(),
          orgId
        })
      });
      const data = await res.json();
      if (data.success) {
        setPlaygroundResult(data.data);
      } else {
        alert('Lỗi: ' + data.error);
      }
    } catch (e) {
      alert('Lỗi playground: ' + e.message);
    } finally {
      setPlaygroundLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#0c224a] via-[#091b3e] to-[#051126] border border-cyan-500/40 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
              <Cpu size={28} />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-xl font-black text-white font-display tracking-wide">
                  TRÍ AI CENTRAL BRAIN & SMART ORCHESTRATOR 2.0
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  {statusData?.intelligenceLevel || '2.0-ULTIMATE'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Hệ điều phối thông minh thống nhất 6 Engine: Hiểu ý định (Intent), Phân tích suy luận (Reasoning), Điều phối công cụ (Tools), Kiểm chứng sống (Verification), Trí nhớ có kiểm soát (Memory) và Định dạng phản hồi (Response).
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                fetchStatus();
                fetchTools();
                if (subTab === 'memory') fetchMemory();
                if (subTab === 'telemetry') fetchTelemetry();
              }}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-all"
            >
              <RotateCw size={14} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        {/* SUB-TABS NAVIGATION */}
        <div className="flex items-center space-x-2 mt-6 pt-4 border-t border-cyan-500/20 overflow-x-auto no-scrollbar text-xs font-bold">
          {[
            { id: 'overview', label: 'Tổng Quan & 6 Engine', icon: Activity },
            { id: 'tools', label: 'Bộ Điều Phối Công Cụ (8 Tools)', icon: Layers },
            { id: 'memory', label: 'Trí Nhớ Khách Hàng (Memory)', icon: Database },
            { id: 'telemetry', label: 'Nhật Ký Telemetry & Độ Trễ', icon: Clock },
            { id: 'playground', label: 'Sân Thử Nghiệm AI (Playground)', icon: Play }
          ].map(tab => {
            const Icon = tab.icon;
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSubTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                  active
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                    : 'bg-slate-900/60 text-slate-300 hover:text-white hover:bg-slate-800/70 border border-slate-800'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. OVERVIEW TAB */}
      {subTab === 'overview' && (
        <div className="space-y-6">
          {/* STATS METRICS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[#091b3e] border border-cyan-500/30 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
                <span>Lượt điều phối Tools</span>
                <Zap size={16} className="text-amber-400" />
              </div>
              <div className="text-2xl font-black text-white font-mono">
                {statusData?.telemetry?.totalCalls || 0}
              </div>
              <p className="text-[11px] text-cyan-300 mt-1">Đã ghi nhận telemetry</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#091b3e] border border-cyan-500/30 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
                <span>Độ trễ trung bình</span>
                <Clock size={16} className="text-cyan-400" />
              </div>
              <div className="text-2xl font-black text-cyan-300 font-mono">
                {statusData?.telemetry?.avgLatencyMs || 0} <span className="text-sm font-normal text-slate-400">ms</span>
              </div>
              <p className="text-[11px] text-emerald-400 mt-1">Tối ưu hóa thời gian thực</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#091b3e] border border-cyan-500/30 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
                <span>Tỷ lệ thành công</span>
                <CheckCircle size={16} className="text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                {statusData?.telemetry?.successRate || 100}%
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Không timeout, fallback an toàn</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#091b3e] border border-cyan-500/30 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
                <span>Bộ nhớ khách hàng</span>
                <Database size={16} className="text-fuchsia-400" />
              </div>
              <div className="text-2xl font-black text-fuchsia-300 font-mono">
                {statusData?.memory?.totalEntries || 0}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Tenant: {orgId}</p>
            </div>
          </div>

          {/* 6 ACTIVE ENGINES GRID */}
          <div className="bg-[#091b3e] border border-cyan-500/30 rounded-3xl p-6 shadow-md">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center space-x-2">
              <Cpu size={16} className="text-cyan-400" />
              <span>Trạng thái 6 Phân Hệ Cốt Lõi (Architecture 2.0)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  title: '1. Intent Engine',
                  status: 'ACTIVE',
                  desc: 'Phân loại ý định tự nhiên, chuẩn hóa lỗi gõ tiếng Việt, bóc tách số lượng, ngân sách và sản phẩm.'
                },
                {
                  title: '2. Reasoning Engine',
                  status: 'ACTIVE',
                  desc: 'Đánh giá độ phức tạp, kiểm tra đủ dữ liệu, hỏi lại 1 câu duy nhất khi thiếu thông tin, ẩn 100% Chain-of-Thought.'
                },
                {
                  title: '3. Tool Orchestrator',
                  status: 'ACTIVE',
                  desc: 'Điều phối thông minh 8 công cụ, kiểm soát timeout 2.5s-6s, tự động ghi nhận độ trễ & fallback.'
                },
                {
                  title: '4. Verification Engine',
                  status: 'ACTIVE',
                  desc: 'Phân loại 5 cấp độ tin cậy, kiểm chứng URL sống HTTP 200, loại bỏ hoàn toàn link DuckDuckGo & rác.'
                },
                {
                  title: '5. Memory Engine',
                  status: 'ACTIVE',
                  desc: 'Trí nhớ 4 tầng, cô lập tuyệt đối theo Tenant (org_id), hỗ trợ khách hàng lệnh quên thông tin (GDPR).'
                },
                {
                  title: '6. Response Engine',
                  status: 'ACTIVE',
                  desc: 'Tạo phản hồi chuẩn mực, không lặp ý, đồng bộ hoàn hảo với Cột 2 (Product Selector & Quotation).'
                }
              ].map((engine, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-[#06132c] border border-cyan-500/20 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-200 text-xs">{engine.title}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {engine.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{engine.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. TOOLS TAB */}
      {subTab === 'tools' && (
        <div className="space-y-4">
          <div className="bg-[#091b3e] border border-cyan-500/30 rounded-3xl p-6 shadow-md">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">
              Danh Sách Công Cụ Được Central Brain Điều Phối
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Các công cụ chỉ được kích hoạt khi Intent Engine & Reasoning Engine xác định rõ mục tiêu tác vụ. Không bao giờ gọi đồng loạt tất cả công cụ.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {toolsList.map(tool => (
                <div key={tool.id} className="p-4 rounded-2xl bg-[#06132c] border border-cyan-500/20 hover:border-cyan-400/50 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <h4 className="font-bold text-white text-xs">{tool.name}</h4>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        {tool.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
                      {tool.description}
                    </p>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between border-t border-slate-800 pt-2">
                    <span>ID: {tool.id}</span>
                    <span className="text-emerald-400 font-semibold">Đang hoạt động</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. MEMORY TAB */}
      {subTab === 'memory' && (
        <div className="space-y-4">
          <div className="bg-[#091b3e] border border-cyan-500/30 rounded-3xl p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Trí Nhớ Khách Hàng Có Kiểm Soát (Customer Memory)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tenant: <span className="text-cyan-300 font-mono">{orgId}</span> • Tuân thủ chính sách bảo vệ dữ liệu cá nhân & lệnh xóa theo yêu cầu
                </p>
              </div>
              <button
                onClick={fetchMemory}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-cyan-300 text-xs hover:bg-slate-700"
              >
                <RotateCw size={13} />
                <span>Cập nhật</span>
              </button>
            </div>

            {memories.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Chưa có dữ liệu ghi nhớ nào cho người dùng trong tổ chức này.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-cyan-500/20 text-slate-400 uppercase text-[10px] font-bold">
                      <th className="py-2.5 px-3">User ID</th>
                      <th className="py-2.5 px-3">Loại nhớ</th>
                      <th className="py-2.5 px-3">Khóa (Key)</th>
                      <th className="py-2.5 px-3">Giá trị lưu trữ</th>
                      <th className="py-2.5 px-3">Độ tin cậy</th>
                      <th className="py-2.5 px-3">Cập nhật</th>
                      <th className="py-2.5 px-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {memories.map(mem => (
                      <tr key={mem.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-mono text-cyan-300 font-bold">{mem.user_id}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-fuchsia-500/20 text-fuchsia-300">
                            {mem.memory_type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-white">{mem.key}</td>
                        <td className="py-2.5 px-3 text-slate-300 max-w-xs truncate">{mem.value}</td>
                        <td className="py-2.5 px-3 font-mono text-emerald-400">{mem.confidence || 1.0}</td>
                        <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                          {new Date(mem.updated_at || mem.created_at).toLocaleString('vi-VN')}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleDeleteMemory(mem.id)}
                            className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all"
                            title="Xóa ghi nhớ"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. TELEMETRY TAB */}
      {subTab === 'telemetry' && (
        <div className="space-y-4">
          <div className="bg-[#091b3e] border border-cyan-500/30 rounded-3xl p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Nhật Ký Thực Thi Điều Phối Công Cụ (Telemetry)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Đo lường thời gian thực độ trễ (ms), chi phí và trạng thái kết nối
                </p>
              </div>
              <button
                onClick={fetchTelemetry}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-cyan-300 text-xs hover:bg-slate-700"
              >
                <RotateCw size={13} />
                <span>Làm mới</span>
              </button>
            </div>

            {telemetryLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Chưa có nhật ký telemetry nào được ghi nhận.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-cyan-500/20 text-slate-400 uppercase text-[10px] font-bold">
                      <th className="py-2.5 px-3">Thời điểm</th>
                      <th className="py-2.5 px-3">Tên Công Cụ</th>
                      <th className="py-2.5 px-3">Độ trễ (ms)</th>
                      <th className="py-2.5 px-3">Trạng thái</th>
                      <th className="py-2.5 px-3">Mã hội thoại</th>
                      <th className="py-2.5 px-3">Chi tiết lỗi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {telemetryLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                          {new Date(log.created_at).toLocaleTimeString('vi-VN')}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-cyan-300">{log.tool_name}</td>
                        <td className="py-2.5 px-3 font-mono text-white">
                          <span className={log.execution_time_ms > 3000 ? 'text-amber-400 font-bold' : 'text-slate-200'}>
                            {log.execution_time_ms} ms
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.status === 'SUCCESS'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px] truncate max-w-[120px]">
                          {log.conversation_id}
                        </td>
                        <td className="py-2.5 px-3 text-rose-300 text-[11px]">
                          {log.error_message || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. PLAYGROUND TAB */}
      {subTab === 'playground' && (
        <div className="space-y-6">
          <div className="bg-[#091b3e] border border-cyan-500/30 rounded-3xl p-6 shadow-md">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">
              Sân Thử Nghiệm & Phân Tích Luồng Trí Tuệ (Brain Playground)
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Nhập bất kỳ câu hỏi nào từ khách hàng để kiểm tra từng công đoạn: Nhận diện Ý định (Intent) ➔ Lập kế hoạch (Reasoning) ➔ Gọi Tool ➔ Phản hồi cuối cùng.
            </p>

            <div className="flex gap-3">
              <input
                type="text"
                value={playgroundInput}
                onChange={(e) => setPlaygroundInput(e.target.value)}
                placeholder="Nhập câu hỏi test: ví dụ 'Báo giá 3 máy in', 'laptop dell i7', 'hãy quên tôi đi'..."
                className="flex-1 bg-[#06132c] border border-cyan-500/30 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-400"
              />
              <button
                onClick={handleRunPlayground}
                disabled={playgroundLoading}
                className="flex items-center space-x-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-bold text-sm shadow-lg hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all"
              >
                {playgroundLoading ? <RotateCw className="animate-spin" size={16} /> : <Play size={16} />}
                <span>Chạy thử</span>
              </button>
            </div>

            {/* Quick Prompt Presets */}
            <div className="flex flex-wrap gap-2 mt-3 text-xs">
              <span className="text-slate-400 self-center">Mẫu thử nhanh:</span>
              {[
                'Báo giá cho tôi 5 chiếc máy in Brother',
                'Có laptop Dell nào dưới 15 triệu không?',
                'Quy chế 409 về xử lý tài sản quy định thế nào?',
                'Hãy quên số điện thoại và thông tin tôi đi',
                'Tôi muốn mua 10 máy tính'
              ].map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => setPlaygroundInput(p)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-cyan-300 hover:bg-slate-700 transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {playgroundResult && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* STAGE 1: INTENT */}
              <div className="bg-[#091b3e] border border-cyan-500/30 rounded-3xl p-5 shadow-md">
                <div className="flex items-center space-x-2 mb-3 text-cyan-300 text-xs font-bold uppercase tracking-wider">
                  <Sparkles size={15} />
                  <span>1. Intent Engine</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400">Ý định chính (Primary Intent):</span>
                    <div className="font-mono font-bold text-emerald-400 mt-0.5">
                      {playgroundResult.intentResult?.primaryIntent}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Độ tin cậy:</span>
                    <div className="font-mono text-cyan-300 mt-0.5">
                      {playgroundResult.intentResult?.confidence}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Entities & Slots:</span>
                    <pre className="p-2.5 rounded-xl bg-[#06132c] text-slate-300 font-mono text-[11px] mt-1 overflow-x-auto">
                      {JSON.stringify(playgroundResult.intentResult?.slots || {}, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>

              {/* STAGE 2: REASONING & TOOLS */}
              <div className="bg-[#091b3e] border border-cyan-500/30 rounded-3xl p-5 shadow-md">
                <div className="flex items-center space-x-2 mb-3 text-cyan-300 text-xs font-bold uppercase tracking-wider">
                  <Cpu size={15} />
                  <span>2. Reasoning & Tools</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400">Độ phức tạp (Complexity):</span>
                    <div className="font-mono font-bold text-amber-400 mt-0.5">
                      {playgroundResult.plan?.complexity}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Đủ dữ liệu (Data Sufficient):</span>
                    <div className="font-mono text-emerald-400 mt-0.5">
                      {playgroundResult.plan?.dataSufficient ? 'YES' : 'NO (Cần hỏi lại)'}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Công cụ đã thực thi (Tools Used):</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {(playgroundResult.executionResult?.toolsUsed || []).map((t, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* STAGE 3: FINAL CLIENT RESPONSE */}
              <div className="bg-[#091b3e] border border-cyan-500/30 rounded-3xl p-5 shadow-md">
                <div className="flex items-center space-x-2 mb-3 text-cyan-300 text-xs font-bold uppercase tracking-wider">
                  <ShieldCheck size={15} />
                  <span>3. Response & Verification</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400">Stage:</span>
                    <span className="ml-2 font-mono text-cyan-300">
                      {playgroundResult.executionResult?.stage}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Mở Cột 2 (revealCatalog):</span>
                    <span className="ml-2 font-mono text-emerald-400 font-bold">
                      {playgroundResult.executionResult?.revealCatalog ? 'TRUE' : 'FALSE'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Nội dung phản hồi khách hàng:</span>
                    <div className="p-3 rounded-xl bg-[#06132c] border border-cyan-500/20 text-slate-200 text-xs leading-relaxed mt-1 whitespace-pre-wrap max-h-60 overflow-y-auto">
                      {playgroundResult.executionResult?.reply}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CentralBrainManagement;
