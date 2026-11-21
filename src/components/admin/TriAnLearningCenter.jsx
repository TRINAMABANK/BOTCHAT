import React, { useState, useEffect } from 'react';
import { 
  Brain, BookOpen, AlertTriangle, CheckCircle, Clock, Search, 
  Filter, Upload, Globe, FileText, Check, X, ArrowRight, 
  Download, RefreshCw, Sparkles, Database, ShieldAlert, Award
} from 'lucide-react';

export default function TriAnLearningCenter() {
  const [activeSubTab, setActiveSubTab] = useState('dashboard'); // 'dashboard' | 'queue' | 'studio' | 'testbench'
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    approved: 0,
    waitingData: 0,
    inReview: 0,
    duplicates: 0,
    topTopics: []
  });
  const [top10List, setTop10List] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Filter states
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterReason, setFilterReason] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Teaching Studio Form State
  const [teachingMode, setTeachingMode] = useState('DIRECT_INPUT'); // 'DIRECT_INPUT' | 'FILE_UPLOAD' | 'WEBSITE'
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [studioQuestion, setStudioQuestion] = useState('');
  const [studioAnswer, setStudioAnswer] = useState('');
  const [studioTopic, setStudioTopic] = useState('Thiết bị công nghệ');
  const [studioProductName, setStudioProductName] = useState('');
  const [studioUrl, setStudioUrl] = useState('');
  const [studioFile, setStudioFile] = useState(null);
  const [studioFileBase64, setStudioFileBase64] = useState('');
  const [previewContent, setPreviewContent] = useState('');
  const [ingestSuccessMsg, setIngestSuccessMsg] = useState('');

  // Test Bench State
  const [testQuery, setTestQuery] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [testRunning, setTestRunning] = useState(false);

  // Load KPI Stats & Top 10
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, top10Res] = await Promise.all([
        fetch('/api/learning-center/stats').then(r => r.json()),
        fetch('/api/learning-center/top10-report').then(r => r.json())
      ]);

      if (statsRes.success) setStats(statsRes.stats);
      if (top10Res.success) setTop10List(top10Res.data);
    } catch (err) {
      console.error('Lỗi tải dữ liệu Learning Center:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load Questions Queue
  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: filterStatus,
        failure_reason: filterReason,
        priority: filterPriority,
        search: searchQuery,
        page: pagination.page,
        limit: pagination.limit
      });
      const res = await fetch(`/api/learning-center/questions?${params.toString()}`).then(r => r.json());
      if (res.success) {
        setQuestions(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách câu hỏi:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'queue') {
      fetchQuestions();
    }
  }, [activeSubTab, filterStatus, filterReason, filterPriority, pagination.page]);

  // Handle File Upload & Convert to Base64
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setStudioFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      const base64Str = reader.result.split(',')[1];
      setStudioFileBase64(base64Str);
    };
    reader.readAsDataURL(file);
  };

  // Submit Ingestion (Teaching TRÍ AN)
  const handleIngestKnowledge = async (e) => {
    e.preventDefault();
    setIngestSuccessMsg('');
    try {
      setLoading(true);
      let sourceType = 'DIRECT_INPUT';
      if (teachingMode === 'WEBSITE') sourceType = 'WEBSITE';
      else if (teachingMode === 'FILE_UPLOAD' && studioFile) {
        const ext = studioFile.name.split('.').pop().toUpperCase();
        if (ext === 'PDF') sourceType = 'PDF';
        else if (ext === 'DOCX' || ext === 'DOC') sourceType = 'WORD';
        else if (ext === 'XLSX' || ext === 'XLS') sourceType = 'EXCEL';
        else if (ext === 'CSV') sourceType = 'CSV';
        else sourceType = 'TXT';
      }

      const payload = {
        unansweredQuestionId: selectedQuestion?.id || null,
        entryType: teachingMode === 'WEBSITE' ? 'WEBSITE' : (teachingMode === 'FILE_UPLOAD' ? 'DOCUMENT' : 'QA'),
        standardQuestion: studioQuestion,
        standardAnswer: studioAnswer,
        relatedTopic: studioTopic,
        relatedProductName: studioProductName,
        sourceType,
        sourceFilename: studioFile ? studioFile.name : null,
        sourceUrl: studioUrl,
        fileBase64: studioFileBase64 || null,
        approvedBy: 'Admin'
      };

      const res = await fetch('/api/learning-center/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(r => r.json());

      if (res.success) {
        setIngestSuccessMsg('Đã nạp kiến thức thành công! Kiến thức đã sẵn sàng ở trạng thái READY_TO_TEST.');
        setPreviewContent(res.result.extractedPreview);
        fetchDashboardData();
        // Setup Test Bench
        setTestQuery(studioQuestion);
      } else {
        alert(`Lỗi: ${res.error}`);
      }
    } catch (err) {
      alert(`Lỗi kết nối máy chủ: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Run Before vs After Test Bench
  const handleRunTestBench = async () => {
    if (!testQuery) return;
    try {
      setTestRunning(true);
      const res = await fetch('/api/learning-center/test-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unansweredQuestionId: selectedQuestion?.id || null,
          customQuery: testQuery
        })
      }).then(r => r.json());

      if (res.success) {
        setTestResult(res.testResult);
      } else {
        alert(`Lỗi kiểm thử: ${res.error}`);
      }
    } catch (err) {
      alert(`Lỗi kiểm thử: ${err.message}`);
    } finally {
      setTestRunning(false);
    }
  };

  // Approve Knowledge
  const handleApprove = async () => {
    if (!selectedQuestion?.id) return;
    try {
      setLoading(true);
      // Update status to APPROVED
      await fetch(`/api/learning-center/questions/${selectedQuestion.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED', resolvedAnswer: studioAnswer, resolvedBy: 'Admin' })
      });
      alert('🌟 Đã PHÊ DUYỆT sử dụng! Tri thức này đã chính thức đi vào vận hành trong toàn bộ hệ thống TRÍ AN.');
      fetchDashboardData();
      setActiveSubTab('queue');
    } catch (err) {
      alert(`Lỗi duyệt: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Select Question for Teaching
  const handleSelectQuestionForTeaching = (q) => {
    setSelectedQuestion(q);
    setStudioQuestion(q.original_question || q.question);
    setStudioProductName(q.related_product_name || '');
    setStudioTopic(q.related_topic || 'Thiết bị công nghệ');
    setTestQuery(q.original_question || q.question);
    setActiveSubTab('studio');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0a192f] via-[#0d2847] to-[#112240] p-6 rounded-3xl border border-cyan-500/40 shadow-[0_0_30px_rgba(0,240,255,0.15)] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2.5 bg-cyan-500/20 rounded-2xl border border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.3)]">
              <Brain className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-200 to-indigo-300">
                TRÍ AN LEARNING CENTER
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                Trung tâm tiếp nhận câu hỏi thiếu kiến thức & Huấn luyện tri thức chính thống cho Trí An Level 2.0
              </p>
            </div>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-cyan-500/30">
          <button
            onClick={() => setActiveSubTab('dashboard')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'dashboard'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Brain className="w-4 h-4" />
            <span>Chỉ Số & Báo Cáo</span>
          </button>

          <button
            onClick={() => setActiveSubTab('queue')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'queue'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Hàng Đợi ({stats.new})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('studio')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'studio'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Dạy Trí An (Studio)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('testbench')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'testbench'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                : 'text-purple-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Kiểm Thử Before/After</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: DASHBOARD & REPORT */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-[#081838] p-4 rounded-2xl border border-cyan-500/30 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng Câu Hỏi Lỗi</span>
              <span className="text-2xl font-black text-cyan-300 mt-2">{stats.total}</span>
            </div>
            <div className="bg-[#081838] p-4 rounded-2xl border border-amber-500/30 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">Mới Cần Xử Lý</span>
              <span className="text-2xl font-black text-amber-400 mt-2">{stats.new}</span>
            </div>
            <div className="bg-[#081838] p-4 rounded-2xl border border-rose-500/30 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-rose-300 uppercase tracking-wider">Hỏi Trùng / Tần Suất</span>
              <span className="text-2xl font-black text-rose-400 mt-2">{stats.duplicates}</span>
            </div>
            <div className="bg-[#081838] p-4 rounded-2xl border border-emerald-500/30 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">Đã Phê Duyệt</span>
              <span className="text-2xl font-black text-emerald-400 mt-2">{stats.approved}</span>
            </div>
            <div className="bg-[#081838] p-4 rounded-2xl border border-sky-500/30 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-sky-300 uppercase tracking-wider">Chờ Bổ Sung Data</span>
              <span className="text-2xl font-black text-sky-400 mt-2">{stats.waitingData}</span>
            </div>
            <div className="bg-[#081838] p-4 rounded-2xl border border-purple-500/30 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider">Đang Xem Xét</span>
              <span className="text-2xl font-black text-purple-400 mt-2">{stats.inReview}</span>
            </div>
          </div>

          {/* REPORT F: TOP 10 CÂU HỎI KHÁCH HỎI NHIỀU NHẤT NHƯNG TRÍ AN CHƯA BIẾT */}
          <div className="bg-[#081838] p-6 rounded-3xl border border-cyan-500/30 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-rose-300 flex items-center space-x-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  <span>BÁO CÁO: TOP 10 CÂU HỎI KHÁCH HỎI NHIỀU NHẤT NHƯNG TRÍ AN CHƯA BIẾT</span>
                </h2>
                <p className="text-xs text-slate-400">Danh sách các lỗ hổng tri thức cần ưu tiên bổ sung gấp</p>
              </div>

              <a
                href="/api/learning-center/export-excel"
                download="TOP_10_CAU_HOI_THIEU_KIEN_THUC_TRI_AN.xlsx"
                className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              >
                <Download className="w-4 h-4" />
                <span>Xuất Báo Cáo Excel (.xlsx)</span>
              </a>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-700/60">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-cyan-300 uppercase tracking-wider text-[11px] border-b border-slate-700">
                  <tr>
                    <th className="p-3.5">Hạng</th>
                    <th className="p-3.5">Câu hỏi của khách</th>
                    <th className="p-3.5 text-center">Tần suất hỏi</th>
                    <th className="p-3.5">Sản phẩm / Ngành</th>
                    <th className="p-3.5">Nguyên nhân</th>
                    <th className="p-3.5">Trạng thái</th>
                    <th className="p-3.5 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {top10List.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-slate-500">
                        Chưa có câu hỏi thiếu kiến thức nào được ghi nhận. Hệ thống đang vận hành hoàn hảo!
                      </td>
                    </tr>
                  ) : (
                    top10List.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 font-bold text-amber-400">#{idx + 1}</td>
                        <td className="p-3.5 font-semibold text-white max-w-xs truncate">{item.question}</td>
                        <td className="p-3.5 text-center">
                          <span className="px-2.5 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-full font-bold">
                            {item.frequency} lần
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-300">{item.product || item.topic || 'Chung'}</td>
                        <td className="p-3.5 text-slate-400 text-[11px]">{item.failure_reason}</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                            item.status === 'READY_TO_TEST' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' :
                            'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => handleSelectQuestionForTeaching(item)}
                            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
                          >
                            Dạy Trí An ngay
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: QUESTIONS QUEUE */}
      {activeSubTab === 'queue' && (
        <div className="bg-[#081838] p-6 rounded-3xl border border-cyan-500/30 space-y-5">
          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-700">
            <div>
              <label className="text-[11px] text-slate-400 font-bold block mb-1">Trạng thái</label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full bg-slate-800 text-white text-xs p-2 rounded-xl border border-slate-600 focus:outline-none focus:border-cyan-400"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="NEW">NEW - Mới chưa xử lý</option>
                <option value="IN_REVIEW">IN_REVIEW - Đang xem xét</option>
                <option value="WAITING_DATA">WAITING_DATA - Chờ tài liệu</option>
                <option value="READY_TO_TEST">READY_TO_TEST - Chờ kiểm thử</option>
                <option value="APPROVED">APPROVED - Đã phê duyệt</option>
                <option value="REJECTED">REJECTED - Từ chối</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 font-bold block mb-1">Nguyên nhân</label>
              <select
                value={filterReason}
                onChange={e => setFilterReason(e.target.value)}
                className="w-full bg-slate-800 text-white text-xs p-2 rounded-xl border border-slate-600 focus:outline-none focus:border-cyan-400"
              >
                <option value="all">Tất cả nguyên nhân</option>
                <option value="PRODUCT_NOT_FOUND">Chưa có sản phẩm trong kho</option>
                <option value="MISIDENTIFIED_PRODUCT">Nhận diện nhầm ngành hàng</option>
                <option value="CUSTOMER_COMPLAINT">Khách phàn nàn trả lời sai</option>
                <option value="STAFF_HELP_REQUIRED">Yêu cầu nhân viên hỗ trợ</option>
                <option value="UNCERTAIN_SPEC_PRICE">Thiếu giá / thông số</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 font-bold block mb-1">Độ ưu tiên</label>
              <select
                value={filterPriority}
                onChange={e => setFilterPriority(e.target.value)}
                className="w-full bg-slate-800 text-white text-xs p-2 rounded-xl border border-slate-600 focus:outline-none focus:border-cyan-400"
              >
                <option value="all">Tất cả mức độ</option>
                <option value="HIGH">HIGH - Khẩn cấp</option>
                <option value="MEDIUM">MEDIUM - Trung bình</option>
                <option value="LOW">LOW - Thấp</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 font-bold block mb-1">Tìm kiếm</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm nội dung, sản phẩm..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && fetchQuestions()}
                  className="w-full bg-slate-800 text-white text-xs p-2 pl-8 rounded-xl border border-slate-600 focus:outline-none focus:border-cyan-400"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
              </div>
            </div>
          </div>

          {/* Queue Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-700/60">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-cyan-300 uppercase tracking-wider text-[11px] border-b border-slate-700">
                <tr>
                  <th className="p-3.5">Câu hỏi gốc</th>
                  <th className="p-3.5 text-center">Tần suất</th>
                  <th className="p-3.5">Sản phẩm liên quan</th>
                  <th className="p-3.5">Nguyên nhân</th>
                  <th className="p-3.5">Ưu tiên</th>
                  <th className="p-3.5">Trạng thái</th>
                  <th className="p-3.5 text-right">Xử lý</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {questions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-500">
                      Không có câu hỏi nào khớp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  questions.map(q => (
                    <tr key={q.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-medium text-white max-w-sm truncate">
                        {q.original_question || q.question}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-bold border border-slate-600">
                          {q.hit_count || 1}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-300">{q.related_product_name || q.related_topic || 'Chưa gắn'}</td>
                      <td className="p-3.5 text-[11px] text-slate-400">{q.failure_reason}</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          q.priority === 'HIGH' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                          'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}>
                          {q.priority}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          q.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                          q.status === 'READY_TO_TEST' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' :
                          'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}>
                          {q.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => handleSelectQuestionForTeaching(q)}
                          className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition-all"
                        >
                          Dạy Trí An
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: TEACHING STUDIO */}
      {activeSubTab === 'studio' && (
        <div className="bg-[#081838] p-6 rounded-3xl border border-cyan-500/30 space-y-6">
          <div className="border-b border-slate-700/60 pb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-white flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-cyan-400" />
                <span>XƯỞNG HUẤN LUYỆN TRI THỨC CHO TRÍ AN (STUDIO)</span>
              </h2>
              <p className="text-xs text-slate-400">
                {selectedQuestion ? `Đang huấn luyện cho câu hỏi: "${selectedQuestion.original_question || selectedQuestion.question}"` : 'Thêm mới tri thức chính thức vào hệ thống'}
              </p>
            </div>

            {/* Method Selectors */}
            <div className="flex items-center space-x-2 bg-slate-900 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setTeachingMode('DIRECT_INPUT')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  teachingMode === 'DIRECT_INPUT' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                Nhập QA Trực Tiếp
              </button>
              <button
                type="button"
                onClick={() => setTeachingMode('FILE_UPLOAD')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  teachingMode === 'FILE_UPLOAD' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                Upload File (PDF/Word/Excel)
              </button>
              <button
                type="button"
                onClick={() => setTeachingMode('WEBSITE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  teachingMode === 'WEBSITE' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                Nhập Link Website
              </button>
            </div>
          </div>

          <form onSubmit={handleIngestKnowledge} className="space-y-4 max-w-4xl">
            {/* Input Question */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Câu hỏi chuẩn (User Query / Trigger)</label>
              <input
                type="text"
                required
                value={studioQuestion}
                onChange={e => setStudioQuestion(e.target.value)}
                placeholder="Ví dụ: Điện thoại bàn Panasonic KX-TSC11 có hàng không?"
                className="w-full bg-slate-900 text-white text-xs p-3 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* Teaching Mode: DIRECT INPUT */}
            {teachingMode === 'DIRECT_INPUT' && (
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Câu trả lời chuẩn của Trí An (Approved Standard Answer)</label>
                <textarea
                  rows="4"
                  required
                  value={studioAnswer}
                  onChange={e => setStudioAnswer(e.target.value)}
                  placeholder="Ví dụ: Dạ hiện tại bên em không phân phối dòng điện thoại bàn Panasonic KX-TSC11. Bên em có sẵn các thiết bị vi tính và văn phòng khác tại Cột 2..."
                  className="w-full bg-slate-900 text-white text-xs p-3 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-400"
                />
              </div>
            )}

            {/* Teaching Mode: FILE UPLOAD */}
            {teachingMode === 'FILE_UPLOAD' && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Upload Tài liệu (PDF, Word .docx, Excel .xlsx, CSV, TXT)
                </label>
                <div className="border-2 border-dashed border-slate-700 hover:border-cyan-400 rounded-2xl p-6 text-center cursor-pointer bg-slate-900/60 transition-all">
                  <input
                    type="file"
                    id="docFile"
                    accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="docFile" className="cursor-pointer flex flex-col items-center">
                    <Upload className="w-8 h-8 text-cyan-400 mb-2" />
                    <span className="text-xs font-semibold text-white">
                      {studioFile ? studioFile.name : 'Bấm để chọn file hoặc kéo thả tài liệu vào đây'}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1">Hỗ trợ PDF, Word .docx, Excel .xlsx, CSV, TXT</span>
                  </label>
                </div>
              </div>
            )}

            {/* Teaching Mode: WEBSITE */}
            {teachingMode === 'WEBSITE' && (
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Đường dẫn Website nhà cung cấp / trang sản phẩm</label>
                <input
                  type="url"
                  value={studioUrl}
                  onChange={e => setStudioUrl(e.target.value)}
                  placeholder="https://panasonic.com/vn/products/kx-tsc11..."
                  className="w-full bg-slate-900 text-white text-xs p-3 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-400"
                />
              </div>
            )}

            {/* Bindings: Product & Topic */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Gắn tên sản phẩm liên quan</label>
                <input
                  type="text"
                  value={studioProductName}
                  onChange={e => setStudioProductName(e.target.value)}
                  placeholder="Ví dụ: Điện thoại Panasonic KX-TSC11"
                  className="w-full bg-slate-900 text-white text-xs p-3 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Chủ đề / Ngành hàng</label>
                <input
                  type="text"
                  value={studioTopic}
                  onChange={e => setStudioTopic(e.target.value)}
                  placeholder="Ví dụ: Điện thoại & Viễn thông"
                  className="w-full bg-slate-900 text-white text-xs p-3 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Extracted Preview */}
            {previewContent && (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-700 space-y-1">
                <span className="text-[11px] font-bold text-cyan-300">Xem trước nội dung trích xuất:</span>
                <p className="text-xs text-slate-300 whitespace-pre-wrap">{previewContent}</p>
              </div>
            )}

            {ingestSuccessMsg && (
              <div className="p-3 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-500/40 text-xs font-bold flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>{ingestSuccessMsg}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center space-x-3 pt-3">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 rounded-xl text-xs font-black transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)] disabled:opacity-50"
              >
                {loading ? 'Đang trích xuất & lưu...' : 'Lưu & Đưa Vào Kiểm Thử (Ready to Test)'}
              </button>

              {ingestSuccessMsg && (
                <button
                  type="button"
                  onClick={() => setActiveSubTab('testbench')}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)] flex items-center space-x-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Sang Phòng Kiểm Thử Before/After</span>
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* SUB-TAB 4: TEST BENCH (BEFORE VS AFTER) */}
      {activeSubTab === 'testbench' && (
        <div className="bg-[#081838] p-6 rounded-3xl border border-cyan-500/30 space-y-6">
          <div className="border-b border-slate-700/60 pb-4">
            <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-300 flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span>PHÒNG KIỂM THỬ TRI THỨC (BEFORE VS AFTER TEST BENCH)</span>
            </h2>
            <p className="text-xs text-slate-400">
              Kiểm tra tính đúng đắn của Trí An trước khi chính thức phê duyệt tri thức vào vận hành
            </p>
          </div>

          {/* Test Input Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={testQuery}
              onChange={e => setTestQuery(e.target.value)}
              placeholder="Nhập câu hỏi cần kiểm thử (ví dụ: Điện thoại Panasonic KX-TSC11 có hàng không?)"
              className="flex-1 min-w-[280px] bg-slate-900 text-white text-xs p-3 rounded-xl border border-slate-700 focus:outline-none focus:border-purple-400"
            />
            <button
              onClick={handleRunTestBench}
              disabled={testRunning || !testQuery}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white rounded-xl text-xs font-bold transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] disabled:opacity-50 flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${testRunning ? 'animate-spin' : ''}`} />
              <span>{testRunning ? 'Đang kiểm thử...' : 'Chạy Kiểm Thử Ngay'}</span>
            </button>
          </div>

          {/* Test Result Comparison: 2 Columns */}
          {testResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Column Left: BEFORE */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-rose-500/30 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-black text-rose-400 uppercase tracking-wider">
                      Trước Khi Học (Before)
                    </span>
                    <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 text-[10px] font-bold rounded">
                      Chưa có tri thức
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {testResult.beforeResponse}
                  </p>
                </div>

                {/* Column Right: AFTER */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-emerald-500/40 space-y-3 shadow-[0_0_25px_rgba(16,185,129,0.15)]">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>Sau Khi Học (After)</span>
                    </span>
                    <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded border border-emerald-500/40">
                      Điểm chính xác: {testResult.metrics.accuracyScore}%
                    </span>
                  </div>
                  <p className="text-xs text-white whitespace-pre-wrap leading-relaxed font-medium">
                    {testResult.afterResponse}
                  </p>
                </div>
              </div>

              {/* 4 Automatic Criteria Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-700">
                <div className="flex items-center space-x-2">
                  <div className={`p-1.5 rounded-lg ${testResult.metrics.isCorrectProduct ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {testResult.metrics.isCorrectProduct ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  </div>
                  <span className="text-xs text-slate-300 font-medium">Nhận diện đúng SP</span>
                </div>

                <div className="flex items-center space-x-2">
                  <div className={`p-1.5 rounded-lg ${testResult.metrics.isGrounded ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {testResult.metrics.isGrounded ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  </div>
                  <span className="text-xs text-slate-300 font-medium">Có căn cứ tri thức</span>
                </div>

                <div className="flex items-center space-x-2">
                  <div className={`p-1.5 rounded-lg ${testResult.metrics.brandConfusionFree ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {testResult.metrics.brandConfusionFree ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  </div>
                  <span className="text-xs text-slate-300 font-medium">Không nhầm thương hiệu</span>
                </div>

                <div className="flex items-center space-x-2">
                  <div className={`p-1.5 rounded-lg ${testResult.metrics.hasValidSource ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {testResult.metrics.hasValidSource ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  </div>
                  <span className="text-xs text-slate-300 font-medium">Nguồn dữ liệu hợp lệ</span>
                </div>
              </div>

              {/* Big Approval Button */}
              <div className="flex items-center justify-end pt-2">
                <button
                  onClick={handleApprove}
                  className="px-8 py-3 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 rounded-2xl text-xs font-black transition-all shadow-[0_0_25px_rgba(16,185,129,0.4)] flex items-center space-x-2"
                >
                  <CheckCircle className="w-5 h-5 text-slate-950" />
                  <span>PHÊ DUYỆT KIẾN THỨC NÀY CHO TRÍ AN (APPROVED)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
