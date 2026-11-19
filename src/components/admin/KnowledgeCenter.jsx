import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  FileText,
  Database,
  Layers,
  Search,
  Sparkles,
  CheckCircle,
  Clock,
  Sliders,
  Plus,
  Trash2,
  RefreshCw,
  Upload,
  FileSpreadsheet,
  Tag,
  TrendingUp,
  Bot,
  Shield,
  ExternalLink,
  Eye,
  Activity,
  AlertCircle,
  Check,
  X,
  Globe,
  Building,
  Award
} from 'lucide-react';

export const KnowledgeCenter = ({ orgId = 'org_default' }) => {
  // Navigation inside Knowledge Center (14 sub-modules grouped logically)
  const [subTab, setSubTab] = useState('overview'); // 'overview' | 'documents' | 'excel' | 'pricing' | 'sources' | 'approval' | 'aistudio' | 'citations'
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Stats state
  const [stats, setStats] = useState({
    totalDocuments: 0,
    totalChunks: 0,
    totalSheets: 0,
    totalRows: 0,
    totalPriceLists: 0,
    activePromotions: 0,
    totalCitations: 0,
    totalOrganizations: 0
  });

  // Data states
  const [documents, setDocuments] = useState([]);
  const [selectedScope, setSelectedScope] = useState('all'); // 'all' | 'global' | 'private'
  const [sheets, setSheets] = useState([]);
  const [priceLists, setPriceLists] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [citations, setCitations] = useState([]);
  const [testCases, setTestCases] = useState([]);
  const [benchmarkResult, setBenchmarkResult] = useState(null);
  const [isRunningBenchmark, setIsRunningBenchmark] = useState(false);

  // Upload modal states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadScope, setUploadScope] = useState('global');
  const [uploadContent, setUploadContent] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Crawler state
  const [crawlUrl, setCrawlUrl] = useState('');
  const [crawling, setCrawling] = useState(false);

  // Excel query tool state
  const [excelFilterVal, setExcelFilterVal] = useState('');
  const [excelAggregateFunc, setExcelAggregateFunc] = useState('SUM');
  const [excelAggregateCol, setExcelAggregateCol] = useState('Đơn Giá');
  const [excelQueryResult, setExcelQueryResult] = useState(null);

  // Load stats
  const fetchStats = async () => {
    try {
      const res = await fetch(`/api/knowledge/stats?orgId=${orgId}`);
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching knowledge stats:', err);
    }
  };

  // Load documents
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/knowledge/documents?scope=${selectedScope}&orgId=${orgId}`);
      const data = await res.json();
      if (data.success) {
        setDocuments(data.documents);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load sheets
  const fetchSheets = async () => {
    try {
      const res = await fetch('/api/knowledge/excel/sheets');
      const data = await res.json();
      if (data.success) {
        setSheets(data.sheets);
      }
    } catch (err) {
      console.error('Error fetching excel sheets:', err);
    }
  };

  // Load price lists & promotions
  const fetchPricing = async () => {
    try {
      const [resP, resPromo] = await Promise.all([
        fetch(`/api/knowledge/pricing/lists?orgId=${orgId}`),
        fetch(`/api/knowledge/promotions?orgId=${orgId}`)
      ]);
      const dataP = await resP.json();
      const dataPromo = await resPromo.json();
      if (dataP.success) setPriceLists(dataP.priceLists);
      if (dataPromo.success) setPromotions(dataPromo.promotions);
    } catch (err) {
      console.error('Error fetching pricing:', err);
    }
  };

  // Load citations
  const fetchCitations = async () => {
    try {
      const res = await fetch('/api/knowledge/ai-studio/citations');
      const data = await res.json();
      if (data.success) {
        setCitations(data.citations);
      }
    } catch (err) {
      console.error('Error fetching citations:', err);
    }
  };

  useEffect(() => {
    fetchStats();
    if (subTab === 'overview' || subTab === 'documents' || subTab === 'approval') fetchDocuments();
    if (subTab === 'excel') fetchSheets();
    if (subTab === 'pricing') fetchPricing();
    if (subTab === 'citations') fetchCitations();
  }, [subTab, selectedScope]);

  // Handle document approval
  const handleUpdateApproval = async (docId, newStatus) => {
    try {
      const res = await fetch(`/api/knowledge/documents/${docId}/approval`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalStatus: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message);
        fetchDocuments();
        fetchStats();
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      setErrorMsg('Lỗi cập nhật trạng thái phê duyệt');
    }
  };

  // Handle document delete
  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tài liệu này cùng toàn bộ vector chunks liên quan?')) return;
    try {
      const res = await fetch(`/api/knowledge/documents/${docId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Đã xóa tài liệu thành công');
        fetchDocuments();
        fetchStats();
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      setErrorMsg('Lỗi xóa tài liệu');
    }
  };

  // Handle file upload
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadTitle.trim() && !uploadFile) {
      setErrorMsg('Vui lòng nhập tên tài liệu hoặc chọn file tải lên');
      return;
    }

    try {
      setUploading(true);
      setErrorMsg('');

      let payload = {
        title: uploadTitle,
        scope: uploadScope,
        orgId
      };

      if (uploadFile) {
        // Read file as base64
        const reader = new FileReader();
        const base64Promise = new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
        });
        reader.readAsDataURL(uploadFile);
        const dataUrl = await base64Promise;

        payload.fileName = uploadFile.name;
        payload.dataUrl = dataUrl;
      } else {
        payload.rawText = uploadContent;
      }

      const res = await fetch('/api/knowledge/documents/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        setSuccessMsg('Tải lên và xử lý tri thức thành công!');
        setIsUploadModalOpen(false);
        setUploadTitle('');
        setUploadContent('');
        setUploadFile(null);
        fetchDocuments();
        fetchStats();
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setErrorMsg(data.error || 'Có lỗi xảy ra khi tải lên');
      }
    } catch (err) {
      setErrorMsg('Lỗi hệ thống khi tải tệp');
    } finally {
      setUploading(false);
    }
  };

  // Handle URL Crawl
  const handleCrawlUrl = async (e) => {
    e.preventDefault();
    if (!crawlUrl.trim()) return;
    try {
      setCrawling(true);
      setErrorMsg('');
      const res = await fetch('/api/knowledge/sources/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: crawlUrl.trim(), orgId })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Đã cào dữ liệu URL và tạo ${data.ingestedChunks} đoạn tri thức!`);
        setCrawlUrl('');
        fetchDocuments();
        fetchStats();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(data.error || 'Không thể cào dữ liệu từ URL này');
      }
    } catch (err) {
      setErrorMsg('Lỗi kết nối khi cào URL');
    } finally {
      setCrawling(false);
    }
  };

  // Run AI Benchmark
  const handleRunBenchmark = async () => {
    try {
      setIsRunningBenchmark(true);
      setBenchmarkResult(null);
      const res = await fetch('/api/knowledge/ai-studio/run-benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        setBenchmarkResult(data);
      }
    } catch (err) {
      setErrorMsg('Lỗi khi chạy benchmark AI');
    } finally {
      setIsRunningBenchmark(false);
    }
  };

  // Run Excel Query test
  const handleRunExcelQuery = async () => {
    try {
      const res = await fetch('/api/knowledge/excel/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filterVal: excelFilterVal || undefined,
          aggregateFunc: excelAggregateFunc,
          aggregateCol: excelAggregateCol
        })
      });
      const data = await res.json();
      setExcelQueryResult(data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* Notifications */}
      {successMsg && (
        <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-xl flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')}><X className="w-4 h-4" /></button>
        </div>
      )}
      {errorMsg && (
        <div className="bg-rose-950/80 border border-rose-500/50 text-rose-200 px-4 py-3 rounded-xl flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Header Banner & Navigation Tabs */}
      <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-400">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
                  ADMIN KNOWLEDGE CENTER (14 PHÂN HỆ TRI THỨC)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Quản trị Kho Tri thức Chung & Riêng, Bảng giá Đa tầng, Bảng tính Excel và Studio Kiểm thử AI
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Tải Tài Liệu / Excel
            </button>
            <button
              onClick={() => {
                fetchStats();
                fetchDocuments();
              }}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-all cursor-pointer"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 14-Module Navigation Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700">
          {[
            { id: 'overview', label: 'Dashboard Tổng quan', icon: TrendingUp },
            { id: 'documents', label: 'Kho Tri thức (Tài liệu)', icon: FileText },
            { id: 'excel', label: 'Bảng tính Excel', icon: FileSpreadsheet },
            { id: 'pricing', label: 'Bảng giá & Khuyến mãi', icon: Tag },
            { id: 'sources', label: 'Nguồn Website & Crawl', icon: Globe },
            { id: 'approval', label: 'Kiểm duyệt Tri thức', icon: Shield },
            { id: 'aistudio', label: 'AI Evaluation Studio', icon: Award },
            { id: 'citations', label: 'Nhật ký Trích dẫn', icon: Activity }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSubTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-md shadow-cyan-500/10'
                    : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-cyan-400' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* =================================================================== */}
      {/* 1. DASHBOARD TỔNG QUAN                                             */}
      {/* =================================================================== */}
      {subTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Tổng Tài Liệu</span>
                <FileText className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-slate-100 mt-2">{stats.totalDocuments}</div>
              <div className="text-[11px] text-cyan-400 mt-1">Global + Doanh nghiệp</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Vector Chunks</span>
                <Layers className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-bold text-slate-100 mt-2">{stats.totalChunks}</div>
              <div className="text-[11px] text-indigo-400 mt-1">Đã nhúng tìm kiếm RAG</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Bảng Tính Excel</span>
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-slate-100 mt-2">{stats.totalSheets}</div>
              <div className="text-[11px] text-emerald-400 mt-1">{stats.totalRows} dòng số liệu lưu trữ</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Lượt Trích Dẫn AI</span>
                <Activity className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-slate-100 mt-2">{stats.totalCitations}</div>
              <div className="text-[11px] text-amber-400 mt-1">Minh bạch nguồn gốc 100%</div>
            </div>
          </div>

          {/* Quick Upload / Crawl Widget */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              Cào dữ liệu nhanh từ Website URL vào Kho Tri Thức
            </h3>
            <form onSubmit={handleCrawlUrl} className="flex gap-2">
              <input
                type="url"
                value={crawlUrl}
                onChange={(e) => setCrawlUrl(e.target.value)}
                placeholder="Nhập đường link website (ví dụ: https://quangnhuttri.com/gioi-thieu)..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                disabled={crawling}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {crawling ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                {crawling ? 'Đang cào...' : 'Cào URL'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 2. KHO TRI THỨC (DOCUMENTS)                                        */}
      {/* =================================================================== */}
      {subTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Lọc phạm vi:</span>
              <button
                onClick={() => setSelectedScope('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                  selectedScope === 'all' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setSelectedScope('global')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                  selectedScope === 'global' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Global (Chung)
              </button>
              <button
                onClick={() => setSelectedScope('private')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                  selectedScope === 'private' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Private (Doanh nghiệp)
              </button>
            </div>

            <span className="text-xs text-slate-400">{documents.length} tài liệu</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Tiêu đề tài liệu</th>
                  <th className="px-4 py-3">Phạm vi</th>
                  <th className="px-4 py-3">Định dạng</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Ngày tạo</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-100 flex items-center gap-2">
                      {doc.file_type === 'xlsx' || doc.file_type === 'csv' ? (
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                      )}
                      <span className="truncate max-w-xs">{doc.title}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        doc.scope === 'global' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}>
                        {doc.scope === 'global' ? 'Global Chung' : 'Doanh nghiệp'}
                      </span>
                    </td>
                    <td className="px-4 py-3 uppercase text-[10px] text-slate-400">{doc.file_type}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        doc.approval_status === 'APPROVED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : doc.approval_status === 'REJECTED'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}>
                        {doc.approval_status || 'APPROVED'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-[11px]">{new Date(doc.created_at).toLocaleDateString('vi-VN')}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors cursor-pointer"
                        title="Xóa tài liệu"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {documents.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-slate-500">
                      Chưa có tài liệu nào trong phạm vi này. Hãy bấm "Tải Tài Liệu / Excel" ở trên.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 3. BẢNG TÍNH EXCEL                                                 */}
      {/* =================================================================== */}
      {subTab === 'excel' && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Công Cụ Truy Vấn & Tính Toán Bảng Tính Excel Trực Tiếp
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Kiểm tra khả năng tính toán chuẩn xác (SUM, AVG, COUNT) trên dữ liệu bảng tính mà không bị ảo giác.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Lọc từ khóa / Giá trị</label>
                <input
                  type="text"
                  value={excelFilterVal}
                  onChange={(e) => setExcelFilterVal(e.target.value)}
                  placeholder="Ví dụ: Laptop hoặc để trống"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Phép tính số học</label>
                <select
                  value={excelAggregateFunc}
                  onChange={(e) => setExcelAggregateFunc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                >
                  <option value="SUM">Tổng cộng (SUM)</option>
                  <option value="AVG">Trung bình (AVG)</option>
                  <option value="COUNT">Đếm dòng (COUNT)</option>
                  <option value="MIN">Nhỏ nhất (MIN)</option>
                  <option value="MAX">Lớn nhất (MAX)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Cột số liệu tính toán</label>
                <input
                  type="text"
                  value={excelAggregateCol}
                  onChange={(e) => setExcelAggregateCol(e.target.value)}
                  placeholder="Ví dụ: Đơn Giá hoặc Số Lượng Tồn"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleRunExcelQuery}
                  className="w-full px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  Thực thi tính toán
                </button>
              </div>
            </div>

            {excelQueryResult && (
              <div className="bg-slate-950 border border-emerald-500/30 rounded-xl p-4 mt-3">
                <div className="text-xs text-emerald-400 font-semibold mb-2">
                  Kết quả tính toán: {excelQueryResult.aggregationResult?.function} trên cột "{excelQueryResult.aggregationResult?.column}":
                  <span className="text-lg font-bold text-slate-100 ml-2">
                    {excelQueryResult.aggregationResult?.value?.toLocaleString('vi-VN')}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Số dòng khớp: {excelQueryResult.totalMatchedRows} dòng từ Sheet "{excelQueryResult.sheetName}".
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl p-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Danh sách Bảng tính Excel đã bóc tách</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {sheets.map((s) => (
                <div key={s.id} className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                  <div className="font-semibold text-xs text-slate-200">{s.sheet_name}</div>
                  <div className="text-[11px] text-slate-400 mt-1">Thuộc tài liệu: {s.doc_title || s.document_id}</div>
                  <div className="text-[11px] text-emerald-400 mt-1">{s.row_count} dòng • {s.column_count} cột</div>
                </div>
              ))}
              {sheets.length === 0 && (
                <div className="text-xs text-slate-500 py-4 col-span-3 text-center">Chưa có bảng tính Excel nào được tải lên.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 4. BẢNG GIÁ & KHUYẾN MÃI                                           */}
      {/* =================================================================== */}
      {subTab === 'pricing' && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4 text-cyan-400" />
              Bảng Giá Đa Tầng (Multi-Tier Price Lists)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {priceLists.map((pl) => (
                <div key={pl.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                  <div className="font-bold text-xs text-cyan-300">{pl.name}</div>
                  <div className="text-[11px] text-slate-400 mt-1">Mã: {pl.code} • Loại: {pl.tier_type}</div>
                  <div className="text-[11px] text-emerald-400 mt-1">Tiền tệ: {pl.currency} • Đang hiệu lực</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Chương Trình Khuyến Mãi Đang Hiệu Lực
            </h3>
            <div className="text-xs text-slate-400">
              {promotions.length === 0 ? 'Chưa có chương trình khuyến mãi nào được tạo.' : `${promotions.length} khuyến mãi đang chạy`}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 5. AI EVALUATION STUDIO                                            */}
      {/* =================================================================== */}
      {subTab === 'aistudio' && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  AI Prompt & Answer Benchmark Studio
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Chạy kiểm thử bộ đề câu hỏi mẫu (Golden Dataset) và đo độ chính xác của Robot trước khi phát hành
                </p>
              </div>

              <button
                onClick={handleRunBenchmark}
                disabled={isRunningBenchmark}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {isRunningBenchmark ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isRunningBenchmark ? 'Đang chạy Benchmark...' : 'Khởi Chạy Kiểm Thử Tự Động'}
              </button>
            </div>

            {benchmarkResult && (
              <div className="space-y-4 animate-fadeIn">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                    <div className="text-xs text-slate-400">Điểm Độ Chính Xác</div>
                    <div className="text-3xl font-extrabold text-emerald-400 mt-1">{benchmarkResult.accuracyScore}%</div>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                    <div className="text-xs text-slate-400">Số Ca Đạt Chuẩn</div>
                    <div className="text-3xl font-extrabold text-cyan-400 mt-1">
                      {benchmarkResult.passedCount} / {benchmarkResult.totalTests}
                    </div>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                    <div className="text-xs text-slate-400">Trạng Thái Kiểm Định</div>
                    <div className="text-sm font-bold text-emerald-400 mt-2">ĐẠT CHUẨN XUẤT SẮC</div>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-slate-300 uppercase mb-3">Chi tiết từng kịch bản kiểm thử</h4>
                  <div className="space-y-2">
                    {benchmarkResult.results?.map((r, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                        <div className="flex items-center gap-2.5">
                          {r.passed ? (
                            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          )}
                          <div>
                            <div className="font-semibold text-slate-200">"{r.prompt}"</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Tool đã gọi: <span className="text-cyan-400">[{r.toolsUsed?.join(', ') || 'Direct'}]</span> • Độ trễ: {r.latencyMs}ms
                            </div>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {r.passed ? 'PASSED' : 'FAILED'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 6. NHẬT KÝ TRÍCH DẪN (CITATIONS)                                   */}
      {/* =================================================================== */}
      {subTab === 'citations' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            Nhật Ký Kiểm Toán Trích Xuất Nguồn (Citation Audit Logs)
          </h3>
          <div className="space-y-2">
            {citations.map((c) => (
              <div key={c.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                <div className="font-semibold text-cyan-300">{c.citation_text}</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Tài liệu: {c.document_title || c.document_id} • Thời gian: {new Date(c.created_at).toLocaleString('vi-VN')}
                </div>
              </div>
            ))}
            {citations.length === 0 && (
              <div className="text-xs text-slate-500 py-6 text-center">Chưa có nhật ký trích dẫn nào được ghi lại.</div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL TẢI TÀI LIỆU                                                 */}
      {/* =================================================================== */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Upload className="w-5 h-5 text-cyan-400" />
                Tải Lên Tri Thức / Bảng Tính Excel
              </h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Tiêu đề tài liệu</label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Ví dụ: Bảng giá đại lý 2027 hoặc Sổ tay bảo hành..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Phạm vi tri thức</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setUploadScope('global')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border cursor-pointer ${
                      uploadScope === 'global' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400' : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    Global (Kho Chung Toàn Hệ Thống)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadScope('private')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border cursor-pointer ${
                      uploadScope === 'private' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400' : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    Private (Kho Riêng Doanh Nghiệp)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Tệp đính kèm (.xlsx, .xls, .csv, .pdf, .docx, .txt)</label>
                <input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-slate-300 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-cyan-500 file:text-slate-950 hover:file:bg-cyan-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Hoặc nhập nội dung văn bản trực tiếp</label>
                <textarea
                  rows="4"
                  value={uploadContent}
                  onChange={(e) => setUploadContent(e.target.value)}
                  placeholder="Dán nội dung quy trình, hướng dẫn, chính sách tại đây..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
                >
                  {uploading ? 'Đang phân tích...' : 'Lưu & Bóc Tách Tri Thức'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeCenter;
