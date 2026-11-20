import React, { useState, useEffect, useMemo } from 'react';
import {
  Globe,
  Plus,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Play,
  Square,
  Eye,
  Edit2,
  Trash2,
  TrendingDown,
  TrendingUp,
  Sliders,
  Filter,
  CheckSquare,
  FileText,
  DollarSign,
  Package,
  Layers,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Building,
  Calendar,
  X
} from 'lucide-react';

export const SupplierWebsiteCenter = () => {
  // Navigation sub-tabs
  // 'websites' | 'products' | 'jobs' | 'price_history' | 'quotations' | 'suppliers'
  const [subTab, setSubTab] = useState('websites');

  // Stats
  const [stats, setStats] = useState({
    totalSuppliers: 0,
    totalWebsites: 0,
    totalProducts: 0,
    approvedProducts: 0,
    pendingReviewProducts: 0,
    totalPriceChanges: 0,
    runningCrawlJobs: 0,
    averageConfidence: 0
  });

  // Data states
  const [websites, setWebsites] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [priceHistory, setPriceHistory] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [selectedWebsiteFilter, setSelectedWebsiteFilter] = useState('ALL');
  const [selectedProductIds, setSelectedProductIds] = useState([]);

  // Modals
  const [showAddWebsiteModal, setShowAddWebsiteModal] = useState(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showProductDetailModal, setShowProductDetailModal] = useState(null);
  const [showJobDetailModal, setShowJobDetailModal] = useState(null);
  const [showQuotationModal, setShowQuotationModal] = useState(false);

  // Form states
  const [newWebsite, setNewWebsite] = useState({
    supplier_id: 'supp_default',
    name: '',
    url: '',
    category_hint: '',
    crawl_frequency: 'DAILY',
    auto_crawl: 0
  });

  const [newSupplier, setNewSupplier] = useState({
    name: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    notes: ''
  });

  const [newQuotation, setNewQuotation] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    customer_company: '',
    vat_percent: 10,
    notes: ''
  });

  // Notify helper
  const notify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch stats & current subTab data
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch stats
      const statsRes = await fetch('/api/supplier-websites/stats');
      const statsJson = await statsRes.json();
      if (statsJson.success) setStats(statsJson.data);

      // Fetch suppliers
      const suppRes = await fetch('/api/supplier-websites/suppliers');
      const suppJson = await suppRes.json();
      if (suppJson.success) setSuppliers(suppJson.data);

      if (subTab === 'websites') {
        const res = await fetch('/api/supplier-websites/websites');
        const json = await res.json();
        if (json.success) setWebsites(json.data);
      } else if (subTab === 'products') {
        let url = '/api/supplier-websites/products?limit=100';
        if (selectedStatusFilter !== 'ALL') url += `&status=${selectedStatusFilter}`;
        if (selectedCategoryFilter !== 'ALL') url += `&category=${encodeURIComponent(selectedCategoryFilter)}`;
        if (selectedWebsiteFilter !== 'ALL') url += `&website_id=${selectedWebsiteFilter}`;
        if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.success) setProducts(json.data);
      } else if (subTab === 'jobs') {
        const res = await fetch('/api/supplier-websites/jobs');
        const json = await res.json();
        if (json.success) setJobs(json.data);
      } else if (subTab === 'price_history') {
        const res = await fetch('/api/supplier-websites/price-history');
        const json = await res.json();
        if (json.success) setPriceHistory(json.data);
      } else if (subTab === 'quotations') {
        const res = await fetch('/api/supplier-websites/quotations');
        const json = await res.json();
        if (json.success) setQuotations(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch crawler data:', err);
      notify('Lỗi tải dữ liệu: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [subTab, selectedStatusFilter, selectedCategoryFilter, selectedWebsiteFilter]);

  // Trigger immediate crawl
  const handleTriggerCrawl = async (websiteId, websiteName) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/supplier-websites/websites/${websiteId}/crawl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxUrls: 40 })
      });
      const json = await res.json();
      if (json.success) {
        notify(`Đã khởi động thu thập website "${websiteName}"`);
        fetchData();
      } else {
        notify(json.error || 'Lỗi khi kích hoạt thu thập', 'error');
      }
    } catch (err) {
      notify('Lỗi kết nối máy chủ', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Add Website
  const handleAddWebsite = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const res = await fetch('/api/supplier-websites/websites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWebsite)
      });
      const json = await res.json();
      if (json.success) {
        notify('Thêm website nhà cung cấp thành công!');
        setShowAddWebsiteModal(false);
        setNewWebsite({
          supplier_id: suppliers[0]?.id || 'supp_default',
          name: '',
          url: '',
          category_hint: '',
          crawl_frequency: 'DAILY',
          auto_crawl: 0
        });
        fetchData();
      } else {
        notify(json.error || 'Lỗi thêm website', 'error');
      }
    } catch (err) {
      notify('Lỗi mạng: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Add Supplier
  const handleAddSupplier = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const res = await fetch('/api/supplier-websites/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSupplier)
      });
      const json = await res.json();
      if (json.success) {
        notify('Thêm nhà cung cấp mới thành công!');
        setShowAddSupplierModal(false);
        setNewSupplier({ name: '', contact_email: '', contact_phone: '', address: '', notes: '' });
        fetchData();
      } else {
        notify(json.error, 'error');
      }
    } catch (err) {
      notify('Lỗi mạng', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Batch approve/reject
  const handleBatchApproval = async (status) => {
    if (selectedProductIds.length === 0) {
      notify('Vui lòng chọn ít nhất 1 sản phẩm để kiểm duyệt', 'error');
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch('/api/supplier-websites/products/batch-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: selectedProductIds, approval_status: status })
      });
      const json = await res.json();
      if (json.success) {
        notify(`Đã cập nhật ${json.count} sản phẩm sang trạng thái ${status}`);
        setSelectedProductIds([]);
        fetchData();
      } else {
        notify(json.error, 'error');
      }
    } catch (err) {
      notify('Lỗi duyệt hàng loạt', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle single product selection
  const toggleSelectProduct = (id) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  // Toggle select all products
  const toggleSelectAllProducts = () => {
    if (selectedProductIds.length === products.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(products.map((p) => p.id));
    }
  };

  // Unique categories for filter
  const uniqueCategories = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Format currency
  const formatMoney = (val) => {
    if (!val || val === 0) return 'Liên hệ';
    return Number(val).toLocaleString('vi-VN') + ' ₫';
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* 1. TOP STATS CARDS (Screen 12: Thống kê số lượng sản phẩm & hoạt động) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between text-cyan-400 mb-2">
            <span className="text-xs uppercase font-bold tracking-wider">Website Đối Tác</span>
            <Globe size={18} />
          </div>
          <div className="text-2xl font-black text-white">{stats.totalWebsites}</div>
          <div className="text-xs text-slate-400 mt-1">{stats.totalSuppliers} Nhà cung cấp</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-xs uppercase font-bold tracking-wider">Sản Phẩm Đã Duyệt</span>
            <CheckCircle size={18} />
          </div>
          <div className="text-2xl font-black text-emerald-300">{stats.approvedProducts}</div>
          <div className="text-xs text-slate-400 mt-1">Sẵn sàng AI tư vấn</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-xs uppercase font-bold tracking-wider">Chờ Phê Duyệt</span>
            <Clock size={18} />
          </div>
          <div className="text-2xl font-black text-amber-300">{stats.pendingReviewProducts}</div>
          <div className="text-xs text-slate-400 mt-1">Cần Admin rà soát</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between text-purple-400 mb-2">
            <span className="text-xs uppercase font-bold tracking-wider">Biến Động Giá</span>
            <TrendingUp size={18} />
          </div>
          <div className="text-2xl font-black text-purple-300">{stats.totalPriceChanges}</div>
          <div className="text-xs text-slate-400 mt-1">Lịch sử thay đổi</div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between text-sky-400 mb-2">
            <span className="text-xs uppercase font-bold tracking-wider">Độ Tin Cậy TB</span>
            <ShieldCheck size={18} />
          </div>
          <div className="text-2xl font-black text-sky-300">
            {Math.round(stats.averageConfidence * 100)}%
          </div>
          <div className="text-xs text-slate-400 mt-1">Chuẩn hóa 22 trường</div>
        </div>
      </div>

      {/* 2. SUB-NAVIGATION TABS */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSubTab('websites')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              subTab === 'websites'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Globe size={16} />
            <span>Kho Website ({stats.totalWebsites})</span>
          </button>

          <button
            onClick={() => setSubTab('products')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              subTab === 'products'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Package size={16} />
            <span>Sản Phẩm & Kiểm Duyệt ({stats.totalProducts})</span>
          </button>

          <button
            onClick={() => setSubTab('jobs')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              subTab === 'jobs'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Clock size={16} />
            <span>Lịch Sử Thu Thập</span>
          </button>

          <button
            onClick={() => setSubTab('price_history')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              subTab === 'price_history'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <DollarSign size={16} />
            <span>Lịch Sử Giá ({stats.totalPriceChanges})</span>
          </button>

          <button
            onClick={() => setSubTab('quotations')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              subTab === 'quotations'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <FileText size={16} />
            <span>Báo Giá Đã Lập</span>
          </button>

          <button
            onClick={() => setSubTab('suppliers')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              subTab === 'suppliers'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Building size={16} />
            <span>Nhà Cung Cấp ({stats.totalSuppliers})</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center space-x-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-cyan-400' : ''} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        </div>
      </div>

      {/* 3. NOTIFICATION TOAST */}
      {notification && (
        <div
          className={`p-3 rounded-xl text-sm font-medium flex items-center justify-between border ${
            notification.type === 'error'
              ? 'bg-rose-950/80 border-rose-500 text-rose-200'
              : 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
          }`}
        >
          <span>{notification.msg}</span>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: KHO WEBSITE (Màn hình 1, 2, 3, 10) */}
      {/* ========================================================================= */}
      {subTab === 'websites' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>Danh Sách Website Nhà Cung Cấp</span>
              </h3>
              <p className="text-xs text-slate-400">
                Tự động thu thập sitemap, sản phẩm, thông số kỹ thuật và theo dõi giá hàng ngày
              </p>
            </div>
            <button
              onClick={() => setShowAddWebsiteModal(true)}
              className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs sm:text-sm shadow-lg shadow-cyan-500/20 transition"
            >
              <Plus size={16} />
              <span>Thêm Website Nhà Cung Cấp</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {websites.map((w) => (
              <div
                key={w.id}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 hover:border-cyan-500/40 transition shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-white text-base hover:text-cyan-400 transition">
                        {w.name}
                      </h4>
                      <p className="text-xs text-cyan-400/80 font-mono mt-0.5 truncate max-w-[240px]">
                        {w.url}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        w.last_status === 'SUCCESS'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : w.last_status === 'CRAWLING'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800 animate-pulse'
                          : w.last_status === 'FAILED'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {w.last_status || 'IDLE'}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                    <div>
                      <span className="block text-[10px] text-slate-500 uppercase">Nhà cung cấp</span>
                      <span className="font-medium text-slate-300 truncate block">
                        {w.supplier_name || 'Mặc định'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500 uppercase">Sản phẩm thu thập</span>
                      <span className="font-bold text-cyan-300">{w.products_count || 0} SP</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500 uppercase">Tần suất</span>
                      <span className="font-medium text-slate-300">{w.crawl_frequency || 'DAILY'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500 uppercase">Lần quét cuối</span>
                      <span className="font-medium text-slate-300">
                        {w.last_crawled_at ? new Date(w.last_crawled_at).toLocaleDateString('vi-VN') : 'Chưa quét'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <a
                    href={w.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
                  >
                    <ExternalLink size={14} />
                    <span>Xem website</span>
                  </a>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleTriggerCrawl(w.id, w.name)}
                      disabled={w.last_status === 'CRAWLING' || actionLoading}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-bold transition disabled:opacity-50"
                    >
                      <Play size={12} />
                      <span>{w.last_status === 'CRAWLING' ? 'Đang quét...' : 'Thu thập ngay'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {websites.length === 0 && !loading && (
              <div className="col-span-full py-12 text-center text-slate-500 bg-slate-900/40 border border-slate-800/60 rounded-2xl">
                <Globe size={40} className="mx-auto text-slate-600 mb-2" />
                <p className="font-semibold text-slate-400">Chưa có website nhà cung cấp nào</p>
                <p className="text-xs text-slate-500 mt-1">Bấm "Thêm Website Nhà Cung Cấp" để bắt đầu thu thập tự động</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SẢN PHẨM & KIỂM DUYỆT (Màn hình 5, 6, 7, 8) */}
      {/* ========================================================================= */}
      {subTab === 'products' && (
        <div className="space-y-4">
          {/* Filter Bar & Batch Actions */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2 flex-1 min-w-[240px]">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên sản phẩm, mã SKU, thương hiệu..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchData()}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <button
                  onClick={fetchData}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold"
                >
                  Tìm
                </button>
              </div>

              {/* Batch Actions */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleBatchApproval('APPROVED')}
                  disabled={selectedProductIds.length === 0 || actionLoading}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition disabled:opacity-40"
                >
                  <CheckCircle size={14} />
                  <span>Duyệt ({selectedProductIds.length})</span>
                </button>
                <button
                  onClick={() => handleBatchApproval('REJECTED')}
                  disabled={selectedProductIds.length === 0 || actionLoading}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition disabled:opacity-40"
                >
                  <XCircle size={14} />
                  <span>Từ chối</span>
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-xs">
              <span className="text-slate-400 font-medium">Trạng thái:</span>
              {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg font-bold transition ${
                    selectedStatusFilter === st
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white'
                  }`}
                >
                  {st === 'ALL' ? 'Tất cả' : st === 'PENDING' ? 'Chờ duyệt' : st === 'APPROVED' ? 'Đã duyệt' : 'Từ chối'}
                </button>
              ))}

              <span className="text-slate-400 font-medium ml-2">Website:</span>
              <select
                value={selectedWebsiteFilter}
                onChange={(e) => setSelectedWebsiteFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-300 text-xs"
              >
                <option value="ALL">Tất cả website</option>
                {websites.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedProductIds.length === products.length && products.length > 0}
                        onChange={toggleSelectAllProducts}
                        className="rounded accent-cyan-500 cursor-pointer"
                      />
                    </th>
                    <th className="p-3">Sản Phẩm</th>
                    <th className="p-3">SKU & Hãng</th>
                    <th className="p-3">Danh Mục</th>
                    <th className="p-3">Giá Bán Web</th>
                    <th className="p-3">Độ Tin Cậy</th>
                    <th className="p-3">Trạng Thái</th>
                    <th className="p-3 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedProductIds.includes(p.id)}
                          onChange={() => toggleSelectProduct(p.id)}
                          className="rounded accent-cyan-500 cursor-pointer"
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center space-x-3">
                          {p.image_url ? (
                            <img
                              src={p.image_url}
                              alt={p.name}
                              className="w-10 h-10 object-cover rounded-lg border border-slate-700 bg-slate-950 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 flex-shrink-0">
                              <Package size={16} />
                            </div>
                          )}
                          <div className="min-w-0 max-w-xs sm:max-w-md">
                            <span className="font-bold text-white block truncate hover:text-cyan-400 transition">
                              {p.name}
                            </span>
                            <span className="text-[11px] text-slate-400 block truncate">
                              Nguồn: {p.website_name || 'Website'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="font-mono text-cyan-300 font-medium block">{p.sku || '-'}</span>
                        <span className="text-xs text-slate-400 block">{p.brand || 'Chính hãng'}</span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-800 text-slate-300 border border-slate-700">
                          {p.category || 'Tiêu biểu'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-amber-400 block">{formatMoney(p.sale_price)}</span>
                        {p.original_price > p.sale_price && (
                          <span className="text-[11px] line-through text-slate-500 block">
                            {formatMoney(p.original_price)}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-cyan-500 h-full rounded-full"
                              style={{ width: `${Math.round((p.data_confidence || 0.8) * 100)}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {Math.round((p.data_confidence || 0.8) * 100)}%
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            p.approval_status === 'APPROVED'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : p.approval_status === 'REJECTED'
                              ? 'bg-rose-950 text-rose-400 border border-rose-800'
                              : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}
                        >
                          {p.approval_status === 'APPROVED'
                            ? 'Đã duyệt'
                            : p.approval_status === 'REJECTED'
                            ? 'Từ chối'
                            : 'Chờ duyệt'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setShowProductDetailModal(p)}
                            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                            title="Xem chi tiết & lịch sử giá"
                          >
                            <Eye size={16} />
                          </button>
                          <a
                            href={p.product_url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 rounded-lg transition"
                            title="Mở link gốc"
                          >
                            <ExternalLink size={16} />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {products.length === 0 && !loading && (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-slate-500">
                        Không có sản phẩm nào phù hợp với bộ lọc
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: LỊCH SỬ THU THẬP (Màn hình 4, 11) */}
      {/* ========================================================================= */}
      {subTab === 'jobs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Nhật Ký & Lịch Sử Thu Thập Tự Động</h3>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3">Mã Job</th>
                    <th className="p-3">Website & Nhà Cung Cấp</th>
                    <th className="p-3">Bắt Đầu</th>
                    <th className="p-3">Trạng Thái</th>
                    <th className="p-3 text-center">URL Quét</th>
                    <th className="p-3 text-center">SP Tìm Thấy</th>
                    <th className="p-3 text-center">Mới / Cập Nhật</th>
                    <th className="p-3 text-center">Lỗi</th>
                    <th className="p-3 text-right">Chi Tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {jobs.map((j) => (
                    <tr key={j.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 font-mono text-cyan-400 text-xs">{j.id}</td>
                      <td className="p-3">
                        <span className="font-bold text-white block">{j.website_name}</span>
                        <span className="text-[11px] text-slate-400 block">{j.supplier_name}</span>
                      </td>
                      <td className="p-3 text-slate-400">
                        {j.started_at ? new Date(j.started_at).toLocaleString('vi-VN') : '-'}
                      </td>
                      <td className="p-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            j.status === 'COMPLETED'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : j.status === 'RUNNING'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800 animate-pulse'
                              : 'bg-rose-950 text-rose-400 border border-rose-800'
                          }`}
                        >
                          {j.status}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono">{j.urls_crawled} / {j.urls_discovered}</td>
                      <td className="p-3 text-center font-bold text-cyan-300">{j.products_found}</td>
                      <td className="p-3 text-center">
                        <span className="text-emerald-400 font-bold">+{j.products_new}</span> /{' '}
                        <span className="text-sky-400 font-bold">~{j.products_updated}</span>
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`font-bold ${
                            j.errors_count > 0 ? 'text-rose-400' : 'text-slate-500'
                          }`}
                        >
                          {j.errors_count}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => setShowJobDetailModal(j)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                        >
                          Xem Log
                        </button>
                      </td>
                    </tr>
                  ))}
                  {jobs.length === 0 && !loading && (
                    <tr>
                      <td colSpan="9" className="p-8 text-center text-slate-500">
                        Chưa có lịch sử thu thập nào
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: LỊCH SỬ THAY ĐỔI GIÁ (Màn hình 9) */}
      {/* ========================================================================= */}
      {subTab === 'price_history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Biến Động & Lịch Sử Thay Đổi Giá</h3>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3">Thời Gian</th>
                    <th className="p-3">Sản Phẩm</th>
                    <th className="p-3">Giá Cũ</th>
                    <th className="p-3">Giá Mới</th>
                    <th className="p-3 text-center">Tỷ Lệ Đổi</th>
                    <th className="p-3">Nguồn Website</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {priceHistory.map((h) => {
                    const isDrop = h.change_percent < 0;
                    return (
                      <tr key={h.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3 text-slate-400 text-xs">
                          {new Date(h.changed_at).toLocaleString('vi-VN')}
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-white block">{h.product_name}</span>
                          <span className="text-[11px] font-mono text-cyan-400">{h.sku || '-'}</span>
                        </td>
                        <td className="p-3 line-through text-slate-400">{formatMoney(h.old_price)}</td>
                        <td className="p-3 font-bold text-amber-400">{formatMoney(h.new_price)}</td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                              isDrop
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-rose-950 text-rose-400 border border-rose-800'
                            }`}
                          >
                            {isDrop ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                            <span>{h.change_percent}%</span>
                          </span>
                        </td>
                        <td className="p-3 text-xs text-slate-400">{h.website_name}</td>
                      </tr>
                    );
                  })}
                  {priceHistory.length === 0 && !loading && (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-slate-500">
                        Chưa ghi nhận biến động giá nào từ các nguồn thu thập
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: BÁO GIÁ ĐÃ LẬP (Quotation Management) */}
      {/* ========================================================================= */}
      {subTab === 'quotations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Quản Lý Bảng Báo Giá</h3>
              <p className="text-xs text-slate-400">Danh sách báo giá được Central Brain và Sales Engine tự động thiết lập</p>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3">Mã Báo Giá</th>
                    <th className="p-3">Khách Hàng</th>
                    <th className="p-3">Số Lượng SP</th>
                    <th className="p-3">Tạm Tính</th>
                    <th className="p-3">VAT</th>
                    <th className="p-3">Tổng Cộng</th>
                    <th className="p-3">Trạng Thái</th>
                    <th className="p-3">Ngày Lập</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {quotations.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 font-mono font-bold text-cyan-400">{q.quote_code}</td>
                      <td className="p-3">
                        <span className="font-bold text-white block">{q.customer_name}</span>
                        <span className="text-[11px] text-slate-400 block">{q.customer_phone || q.customer_email || '-'}</span>
                      </td>
                      <td className="p-3 font-mono text-center">{q.items_count || 1}</td>
                      <td className="p-3 text-slate-300">{formatMoney(q.total_amount)}</td>
                      <td className="p-3 text-slate-400">{q.vat_percent}% ({formatMoney(q.vat_amount)})</td>
                      <td className="p-3 font-black text-amber-400">{formatMoney(q.final_amount)}</td>
                      <td className="p-3">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                            q.status === 'CONFIRMED'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : q.status === 'ISSUED'
                              ? 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {q.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400 text-xs">
                        {new Date(q.created_at).toLocaleDateString('vi-VN')}
                      </td>
                    </tr>
                  ))}
                  {quotations.length === 0 && !loading && (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-slate-500">
                        Chưa có báo giá nào được lập
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: NHÀ CUNG CẤP */}
      {/* ========================================================================= */}
      {subTab === 'suppliers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Danh Sách Tổ Chức / Nhà Cung Cấp</h3>
            <button
              onClick={() => setShowAddSupplierModal(true)}
              className="flex items-center space-x-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-xs font-bold border border-cyan-500/30 transition"
            >
              <Plus size={16} />
              <span>Thêm Nhà Cung Cấp</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map((s) => (
              <div
                key={s.id}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition"
              >
                <div className="flex items-start justify-between">
                  <h4 className="font-bold text-white text-base">{s.name}</h4>
                  <Building size={18} className="text-slate-500" />
                </div>
                <div className="mt-3 space-y-1.5 text-xs text-slate-400">
                  <p>Email: <span className="text-slate-300">{s.contact_email || '-'}</span></p>
                  <p>Hotline: <span className="text-slate-300">{s.contact_phone || '-'}</span></p>
                  <p>Địa chỉ: <span className="text-slate-300">{s.address || '-'}</span></p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 text-xs flex justify-between text-slate-500">
                  <span>{s.websites_count || 0} Website</span>
                  <span>{s.products_count || 0} Sản phẩm</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: THÊM WEBSITE NHÀ CUNG CẤP (Screen 2) */}
      {/* ========================================================================= */}
      {showAddWebsiteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl p-6 max-w-lg w-full shadow-2xl relative">
            <button
              onClick={() => setShowAddWebsiteModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <h3 className="text-lg font-bold text-white mb-1 flex items-center space-x-2">
              <Globe className="text-cyan-400" size={20} />
              <span>Thêm Website Bán Hàng Nhà Cung Cấp</span>
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Hệ thống sẽ tự động quét sitemap, đọc danh mục sản phẩm và đồng bộ giá vào kho AI.
            </p>

            <form onSubmit={handleAddWebsite} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Chọn Nhà Cung Cấp</label>
                <select
                  value={newWebsite.supplier_id}
                  onChange={(e) => setNewWebsite({ ...newWebsite, supplier_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Tên Website / Thương Hiệu</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Phong Vũ, Dell Vietnam, FPT Shop..."
                  value={newWebsite.name}
                  onChange={(e) => setNewWebsite({ ...newWebsite, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">URL Website hoặc Trang Sản Phẩm (*)</label>
                <input
                  type="text"
                  required
                  placeholder="https://supplier-example.com/san-pham"
                  value={newWebsite.url}
                  onChange={(e) => setNewWebsite({ ...newWebsite, url: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Ngành Hàng / Danh Mục Gợi Ý</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Laptop & Máy tính để bàn, Máy in & Thiết bị VP..."
                  value={newWebsite.category_hint}
                  onChange={(e) => setNewWebsite({ ...newWebsite, category_hint: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Tần Suất Quét</label>
                  <select
                    value={newWebsite.crawl_frequency}
                    onChange={(e) => setNewWebsite({ ...newWebsite, crawl_frequency: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                  >
                    <option value="MANUAL">Thủ công khi cần</option>
                    <option value="DAILY">Hàng ngày (Daily)</option>
                    <option value="WEEKLY">Hàng tuần (Weekly)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Tự Động Quét</label>
                  <select
                    value={newWebsite.auto_crawl}
                    onChange={(e) => setNewWebsite({ ...newWebsite, auto_crawl: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                  >
                    <option value={0}>Tắt</option>
                    <option value={1}>Bật tự động quét</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddWebsiteModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl shadow-lg shadow-cyan-500/20"
                >
                  {actionLoading ? 'Đang lưu...' : 'Lưu & Khởi tạo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: THÊM NHÀ CUNG CẤP */}
      {/* ========================================================================= */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setShowAddSupplierModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-white mb-4">Thêm Nhà Cung Cấp Mới</h3>
            <form onSubmit={handleAddSupplier} className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Tên Doanh Nghiệp / Đối Tác (*)</label>
                <input
                  type="text"
                  required
                  placeholder="Tên nhà phân phối..."
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-bold mb-1">Email Liên Hệ</label>
                <input
                  type="email"
                  value={newSupplier.contact_email}
                  onChange={(e) => setNewSupplier({ ...newSupplier, contact_email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-bold mb-1">Hotline</label>
                <input
                  type="text"
                  value={newSupplier.contact_phone}
                  onChange={(e) => setNewSupplier({ ...newSupplier, contact_phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                />
              </div>
              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-cyan-500 text-slate-950 font-bold rounded-xl"
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CHI TIẾT SẢN PHẨM & LỊCH SỬ GIÁ (Screen 3, 9) */}
      {/* ========================================================================= */}
      {showProductDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-2xl w-full shadow-2xl relative my-8">
            <button
              onClick={() => setShowProductDetailModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <div className="flex items-start space-x-4 mb-4">
              {showProductDetailModal.image_url ? (
                <img
                  src={showProductDetailModal.image_url}
                  alt={showProductDetailModal.name}
                  className="w-20 h-20 object-cover rounded-xl border border-slate-700 bg-slate-950 flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 flex-shrink-0">
                  <Package size={28} />
                </div>
              )}
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {showProductDetailModal.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  SKU: <span className="font-mono text-cyan-300">{showProductDetailModal.sku || '-'}</span> | Hãng: {showProductDetailModal.brand} | Danh mục: {showProductDetailModal.category}
                </p>
                <p className="text-xs text-amber-400 font-bold mt-1">
                  Giá bán tham khảo: {formatMoney(showProductDetailModal.sale_price)}
                </p>
              </div>
            </div>

            {/* Specs */}
            <div className="mb-4">
              <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-2">
                Thông Số Kỹ Thuật (Chuẩn Hóa Từ Website)
              </h4>
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 max-h-48 overflow-y-auto text-xs space-y-1">
                {(() => {
                  try {
                    const specs = JSON.parse(showProductDetailModal.specs_json || '{}');
                    const entries = Object.entries(specs);
                    if (entries.length === 0) return <span className="text-slate-500">Chưa có thông số chi tiết</span>;
                    return entries.map(([k, v]) => (
                      <div key={k} className="flex justify-between py-1 border-b border-slate-850">
                        <span className="text-slate-400 font-medium">{k}:</span>
                        <span className="text-slate-200 font-mono text-right">{String(v)}</span>
                      </div>
                    ));
                  } catch (e) {
                    return <span className="text-slate-500">Dữ liệu thông số không hợp lệ</span>;
                  }
                })()}
              </div>
            </div>

            {/* Description */}
            <div className="mb-4">
              <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-1">
                Mô Tả Sản Phẩm
              </h4>
              <p className="text-xs text-slate-300 bg-slate-950/80 p-3 rounded-xl border border-slate-800 max-h-28 overflow-y-auto">
                {showProductDetailModal.description || 'Chưa có mô tả'}
              </p>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <a
                href={showProductDetailModal.product_url}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center space-x-1"
              >
                <ExternalLink size={14} />
                <span>Mở link gốc</span>
              </a>
              <button
                onClick={() => setShowProductDetailModal(null)}
                className="px-4 py-2 bg-cyan-500 text-slate-950 rounded-xl text-xs font-bold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CHI TIẾT LOG CỦA CRAWL JOB (Screen 11) */}
      {/* ========================================================================= */}
      {showJobDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl relative">
            <button
              onClick={() => setShowJobDetailModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
            <h3 className="text-base font-bold text-white mb-2 flex items-center space-x-2">
              <Clock className="text-cyan-400" size={18} />
              <span>Chi Tiết Tiến Trình: {showJobDetailModal.id}</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Website: {showJobDetailModal.website_name} | Trạng thái: {showJobDetailModal.status}
            </p>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 max-h-64 overflow-y-auto font-mono text-[11px] text-slate-300">
              <pre className="whitespace-pre-wrap">
                {showJobDetailModal.error_log_json && showJobDetailModal.error_log_json !== '[]'
                  ? JSON.stringify(JSON.parse(showJobDetailModal.error_log_json), null, 2)
                  : 'Tiến trình hoàn tất sạch sẽ, không có lỗi ghi nhận.'}
              </pre>
            </div>

            <div className="mt-4 pt-2 flex justify-end">
              <button
                onClick={() => setShowJobDetailModal(null)}
                className="px-4 py-2 bg-slate-800 text-slate-200 rounded-xl text-xs font-bold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierWebsiteCenter;
