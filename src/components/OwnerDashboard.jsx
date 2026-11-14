import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  PhoneCall,
  CheckCircle,
  Clock,
  Flame,
  FileSpreadsheet,
  ShoppingCart,
  TrendingUp,
  Settings,
  Plus,
  RefreshCw,
  Search,
  MessageSquare,
  X,
  Save,
  Phone,
  Mail,
  Sliders,
  Bot,
  Shield,
  Layers,
  Check,
  AlertCircle,
  Upload,
  Image,
  Trash2,
  Globe,
  Sparkles,
  ExternalLink,
  Loader2,
  Link2
} from 'lucide-react';

export const OwnerDashboard = ({
  isOpen = false,
  onClose,
  onRefreshData
}) => {
  const [activeTab, setActiveTab] = useState('leads'); // 'leads' | 'stats' | 'products' | 'settings'
  const [leadFilter, setLeadFilter] = useState('all');
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [settings, setSettings] = useState({});
  const [products, setProducts] = useState([]);
  const [searchLead, setSearchLead] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedLeadConv, setSelectedLeadConv] = useState(null);
  const [convMessages, setConvMessages] = useState([]);
  const [loadingConv, setLoadingConv] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // New Product Modal Form State
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingProductId, setUploadingProductId] = useState(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [newProd, setNewProd] = useState({
    field: 'Máy đếm tiền',
    group_name: 'Dòng máy phổ thông',
    name: '',
    price: '',
    specs: '',
    description: '',
    image_url: '/assets/machine_2166.png',
    is_approved: true
  });

  // URL Product Import & Analysis State
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [analyzingUrl, setAnalyzingUrl] = useState(false);
  const [analyzedProduct, setAnalyzedProduct] = useState(null);
  const [urlError, setUrlError] = useState(null);
  const [testingGemini, setTestingGemini] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState(null);
  const [searchProduct, setSearchProduct] = useState('');

  const filteredProducts = useMemo(() => {
    if (!searchProduct.trim()) return products;
    const q = searchProduct.toLowerCase().trim();
    return products.filter((p) =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.field || '').toLowerCase().includes(q) ||
      (p.group_name || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (p.price_formatted || '').toLowerCase().includes(q)
    );
  }, [products, searchProduct]);

  // Settings State Form
  const [settingsForm, setSettingsForm] = useState({
    bot_name: 'TRÍ AI SALES ROBOT',
    owner_name: 'Quang Nhựt Trí',
    robot_model: 'cyber_valkyrie',
    avatar_url: '',
    greeting: '',
    ai_tone: '',
    phone_invitation_prompt: '',
    lead_notification_email: '',
    hotline: '',
    show_hotline: '1',
    gemini_api_key: '',
    gemini_model: 'gemini-1.5-flash',
    llm_provider: 'gemini',
    openai_api_key: '',
    openai_model: 'gpt-4o-mini',
    openai_base_url: 'https://api.openai.com/v1'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Stats
      const resStats = await fetch('/api/crm/stats');
      const dataStats = await resStats.json();
      if (dataStats.success) setStats(dataStats.stats);

      // 2. Fetch Leads
      const resLeads = await fetch(`/api/crm/leads?status=${leadFilter}&search=${encodeURIComponent(searchLead)}`);
      const dataLeads = await resLeads.json();
      if (dataLeads.success) {
        setLeads(dataLeads.leads);
        const leadIdSet = new Set(dataLeads.leads.map((l) => l.id));
        setSelectedLeadIds((prev) => prev.filter((id) => leadIdSet.has(id)));
      }

      // 3. Fetch Settings
      const resSettings = await fetch('/api/settings');
      const dataSettings = await resSettings.json();
      if (dataSettings.success) {
        setSettings(dataSettings.settings);
        setSettingsForm(dataSettings.settings);
      }

      // 4. Fetch Products
      const resProds = await fetch('/api/products');
      const dataProds = await resProds.json();
      if (dataProds.success) {
        setProducts(dataProds.products);
        const prodIdSet = new Set(dataProds.products.map((p) => p.id));
        setSelectedProductIds((prev) => prev.filter((id) => prodIdSet.has(id)));
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, leadFilter, searchLead]);

  const handleUpdateLeadStatus = async (leadId, newStatus) => {
    try {
      const res = await fetch(`/api/crm/leads/${leadId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        showMessage('Đã cập nhật trạng thái Lead thành công!');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewConversation = async (convId, lead) => {
    if (!convId) return;
    setSelectedLeadConv(lead);
    setLoadingConv(true);
    try {
      const res = await fetch(`/api/chat/conversations/${convId}`);
      const data = await res.json();
      if (data.success) {
        setConvMessages(data.messages || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingConv(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsForm)
      });
      const data = await res.json();
      if (data.success) {
        showMessage('Đã lưu toàn bộ cấu hình hệ thống thành công!');
        fetchData();
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      let specsObj = {};
      if (newProd.specs.trim()) {
        try {
          specsObj = JSON.parse(newProd.specs);
        } catch {
          specsObj = { 'Thông số': newProd.specs };
        }
      }

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field: newProd.field,
          group_name: newProd.group_name,
          name: newProd.name,
          price: parseInt(newProd.price, 10),
          specs_json: specsObj,
          description: newProd.description,
          image_url: newProd.image_url,
          is_approved: newProd.is_approved
        })
      });

      const data = await res.json();
      if (data.success) {
        showMessage('Đã thêm sản phẩm mới vào Product Center thành công!');
        setShowAddProductModal(false);
        setNewProd({
          field: 'Máy đếm tiền',
          group_name: 'Dòng máy phổ thông',
          name: '',
          price: '',
          specs: '',
          description: '',
          image_url: '/assets/machine_2166.png',
          is_approved: true
        });
        fetchData();
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const showMessage = (msg) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // Analyze Product from Website URL using Google Gemini LLM
  const handleAnalyzeUrl = async (e) => {
    e?.preventDefault();
    if (!urlInput.trim()) {
      setUrlError('Vui lòng nhập đường dẫn website sản phẩm.');
      return;
    }
    setUrlError(null);
    setAnalyzingUrl(true);
    setAnalyzedProduct(null);

    try {
      const res = await fetch('/api/products/analyze-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim() })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Không thể phân tích trang web này.');
      }
      setAnalyzedProduct(data.product);
      showMessage(`Đã phân tích thành công: "${data.product.name}"!`);
    } catch (err) {
      console.error(err);
      setUrlError(err.message || 'Lỗi phân tích URL website');
    } finally {
      setAnalyzingUrl(false);
    }
  };

  // Save Analyzed Product to Catalog
  const handleSaveAnalyzedProduct = async () => {
    if (!analyzedProduct) return;
    try {
      const payload = {
        field: analyzedProduct.field || 'Thiết bị & Sản phẩm',
        group_name: analyzedProduct.group_name || 'Sản phẩm chọn lọc',
        name: analyzedProduct.name,
        price: parseInt(analyzedProduct.price, 10) || 0,
        description: analyzedProduct.description || '',
        specs_json: analyzedProduct.specs_json || {},
        image_url: analyzedProduct.image_url || '/assets/machine_2166.png',
        is_approved: true
      };

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Lỗi lưu sản phẩm');
      }

      showMessage(`Đã lưu "${analyzedProduct.name}" vào danh mục sản phẩm (Cột 2) thành công!`);
      setShowUrlModal(false);
      setAnalyzedProduct(null);
      setUrlInput('');
      fetchData();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error(err);
      setUrlError(err.message || 'Lỗi khi lưu sản phẩm vào danh mục');
    }
  };

  // Test Gemini Connection
  const handleTestGemini = async () => {
    setTestingGemini(true);
    setGeminiTestResult(null);
    try {
      const res = await fetch('/api/settings/test-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: settingsForm.gemini_api_key,
          model: settingsForm.gemini_model || 'gemini-1.5-flash'
        })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Kết nối Gemini thất bại');
      }
      setGeminiTestResult({ success: true, message: data.message });
      showMessage(data.message);
    } catch (err) {
      console.error(err);
      setGeminiTestResult({ success: false, message: err.message || 'Không thể kết nối Gemini' });
    } finally {
      setTestingGemini(false);
    }
  };

  /**
   * Đọc file ảnh từ máy tính và upload lên /api/upload/image, trả về URL công khai.
   */
  const uploadImageFileToServer = async (file) => {
    if (!file) return null;
    if (!file.type || !file.type.startsWith('image/')) {
      showMessage('Vui lòng chọn file hình ảnh hợp lệ (PNG, JPG, WEBP, GIF).');
      return null;
    }
    if (file.size > 5 * 1024 * 1024) {
      showMessage('Kích thước ảnh vượt quá 5MB. Vui lòng chọn ảnh nhẹ hơn.');
      return null;
    }

    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Không đọc được file ảnh từ máy tính.'));
      reader.readAsDataURL(file);
    });

    const res = await fetch('/api/upload/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: file.name, dataUrl })
    });
    const data = await res.json();
    if (!data.success || !data.url) {
      throw new Error(data.error || 'Tải ảnh lên thất bại.');
    }
    return data.url;
  };

  const handleSelectNewProdImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setUploadingImage(true);
      const url = await uploadImageFileToServer(file);
      if (url) {
        setNewProd((prev) => ({ ...prev, image_url: url }));
        showMessage('Đã tải ảnh sản phẩm từ máy tính lên thành công!');
      }
    } catch (err) {
      console.error(err);
      showMessage(err.message || 'Lỗi khi tải ảnh lên.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleUpdateProductImage = async (productId, file) => {
    if (!file) return;
    try {
      setUploadingProductId(productId);
      const url = await uploadImageFileToServer(file);
      if (!url) return;

      const res = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: url })
      });
      const data = await res.json();
      if (data.success) {
        showMessage('Đã cập nhật hình ảnh sản phẩm từ máy tính!');
        fetchData();
        if (onRefreshData) onRefreshData();
      } else {
        showMessage(data.error || 'Không thể lưu URL ảnh cho sản phẩm.');
      }
    } catch (err) {
      console.error(err);
      showMessage(err.message || 'Lỗi khi đổi ảnh sản phẩm.');
    } finally {
      setUploadingProductId(null);
    }
  };

  const toggleSelectOne = (id, setSelected) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleSelectAll = (items, selectedIds, setSelected) => {
    if (items.length === 0) return;
    const allSelected = items.every((item) => selectedIds.includes(item.id));
    setSelected(allSelected ? [] : items.map((item) => item.id));
  };

  const DELETE_ENDPOINTS = {
    lead: { baseUrl: '/api/crm/leads', clearSelected: () => setSelectedLeadIds([]), label: 'khách hàng' },
    product: { baseUrl: '/api/products', clearSelected: () => setSelectedProductIds([]), label: 'sản phẩm' }
  };

  const requestDeleteConfirmation = ({ entity, mode, item = null, selectedIds = [], totalCount = 0 }) => {
    const entityLabel = DELETE_ENDPOINTS[entity].label;
    if (mode === 'single' && item) {
      const name = entity === 'lead' ? `${item.customer_name} (${item.phone})` : item.name;
      setConfirmDelete({
        entity,
        mode,
        id: item.id,
        title: `Xóa ${entityLabel}?`,
        description: `Bạn có chắc muốn xóa ${entityLabel} "${name}"? Thao tác này không thể hoàn tác.`
      });
      return;
    }

    if (mode === 'selected') {
      if (selectedIds.length === 0) return;
      setConfirmDelete({
        entity,
        mode,
        ids: selectedIds,
        title: `Xóa ${selectedIds.length} ${entityLabel} đã chọn?`,
        description: `Toàn bộ ${selectedIds.length} ${entityLabel} đang được tick chọn sẽ bị xóa vĩnh viễn khỏi hệ thống.`
      });
      return;
    }

    if (mode === 'all') {
      setConfirmDelete({
        entity,
        mode,
        title: `Xóa toàn bộ danh sách ${entityLabel}?`,
        description: `Cảnh báo: Tất cả ${totalCount} ${entityLabel} hiện có trong hệ thống sẽ bị xóa vĩnh viễn.`
      });
    }
  };

  const executeConfirmDelete = async () => {
    if (!confirmDelete) return;
    const config = DELETE_ENDPOINTS[confirmDelete.entity];
    try {
      setDeleting(true);
      let res;
      if (confirmDelete.mode === 'single') {
        res = await fetch(`${config.baseUrl}/${confirmDelete.id}`, { method: 'DELETE' });
      } else {
        res = await fetch(`${config.baseUrl}/bulk-delete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            confirmDelete.mode === 'all' ? { deleteAll: true } : { ids: confirmDelete.ids }
          )
        });
      }
      const data = await res.json();
      if (!res.ok || !data.success) {
        showMessage(data.error || `Không thể xóa ${config.label}.`);
        return;
      }

      config.clearSelected();
      setConfirmDelete(null);
      showMessage(data.message || `Đã xóa ${config.label} thành công!`);
      await fetchData();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error(err);
      showMessage(err.message || `Lỗi khi xóa ${config.label}.`);
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      {/* EXPANDED FULL-WIDTH MODAL CONTAINER: RỘNG RÃI & SẮC NÉT */}
      <div className="relative w-[98vw] max-w-[1600px] h-[95vh] bg-[#07132c] border-2 border-cyan-500/50 rounded-3xl shadow-[0_0_80px_rgba(0,240,255,0.3)] flex flex-col overflow-hidden text-slate-100">
        
        {/* 1. TOP HEADER */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#091b3e] border-b border-cyan-500/30 flex-shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-cyan-500/30">
              <Shield size={24} />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-xl font-black text-white font-display tracking-wide">
                  OWNER DASHBOARD • BẢNG QUẢN TRỊ CHỦ NHÂN
                </h1>
                <span className="text-xs px-3 py-1 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-400 font-mono font-bold shadow-xs">
                  TRÍ AI CRM 2027
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 font-medium">
                Chủ nhân: <strong className="text-white font-bold">{settings.owner_name || 'Quang Nhựt Trí'}</strong> • Hotline: <span className="text-amber-400 font-bold font-mono text-sm">{settings.hotline || '0982441446'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#0c244d] hover:bg-[#12336c] text-cyan-200 border border-cyan-500/40 font-bold text-xs transition-colors shadow-sm"
              title="Làm mới dữ liệu"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              <span>Làm mới</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/80 text-slate-300 hover:text-white transition-colors border border-slate-700"
              title="Đóng bảng quản trị"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Status Toast Alert */}
        {statusMessage && (
          <div className="px-6 py-2.5 bg-emerald-950 border-b border-emerald-500/50 text-emerald-200 text-xs font-semibold flex items-center justify-between animate-slide-up">
            <span className="flex items-center space-x-2">
              <CheckCircle size={15} className="text-emerald-400" />
              <span>{statusMessage}</span>
            </span>
            <button onClick={() => setStatusMessage(null)} className="text-emerald-400 hover:text-white font-bold">✕</button>
          </div>
        )}

        {/* 2. KPI STATS BAR (CLEAR, HIGH CONTRAST, BIG NUMBERS) */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 p-4 bg-[#061026] border-b border-cyan-500/20 text-xs flex-shrink-0">
            {/* Stat 1 */}
            <div className="p-3 rounded-2xl bg-[#0a214d]/90 border border-cyan-500/40 flex flex-col justify-between shadow-sm">
              <span className="text-cyan-200 text-xs font-semibold flex items-center space-x-1.5">
                <Users size={14} className="text-cyan-400" />
                <span>Tổng Leads</span>
              </span>
              <strong className="text-2xl font-black text-cyan-300 font-display mt-1">{stats.totalLeads}</strong>
            </div>

            {/* Stat 2 */}
            <div className="p-3 rounded-2xl bg-[#0d2a5e]/90 border border-blue-400/50 flex flex-col justify-between shadow-sm">
              <span className="text-blue-200 text-xs font-semibold flex items-center space-x-1.5">
                <Clock size={14} className="text-blue-400" />
                <span>Khách mới</span>
              </span>
              <strong className="text-2xl font-black text-blue-300 font-display mt-1">{stats.newLeads}</strong>
            </div>

            {/* Stat 3 */}
            <div className="p-3 rounded-2xl bg-[#332107]/90 border border-amber-400/50 flex flex-col justify-between shadow-sm">
              <span className="text-amber-200 text-xs font-semibold flex items-center space-x-1.5">
                <PhoneCall size={14} className="text-amber-400" />
                <span>Chờ gọi</span>
              </span>
              <strong className="text-2xl font-black text-amber-300 font-display mt-1">{stats.waitingCall}</strong>
            </div>

            {/* Stat 4 */}
            <div className="p-3 rounded-2xl bg-[#062e1c]/90 border border-emerald-400/50 flex flex-col justify-between shadow-sm">
              <span className="text-emerald-200 text-xs font-semibold flex items-center space-x-1.5">
                <CheckCircle size={14} className="text-emerald-400" />
                <span>Đã liên hệ</span>
              </span>
              <strong className="text-2xl font-black text-emerald-300 font-display mt-1">{stats.contacted}</strong>
            </div>

            {/* Stat 5 */}
            <div className="p-3 rounded-2xl bg-[#330f1d]/90 border border-rose-400/50 flex flex-col justify-between shadow-sm">
              <span className="text-rose-200 text-xs font-semibold flex items-center space-x-1.5">
                <Flame size={14} className="text-rose-400" />
                <span>Quan tâm cao</span>
              </span>
              <strong className="text-2xl font-black text-rose-300 font-display mt-1">{stats.highInterest}</strong>
            </div>

            {/* Stat 6 */}
            <div className="p-3 rounded-2xl bg-[#291147]/90 border border-purple-400/50 flex flex-col justify-between shadow-sm">
              <span className="text-purple-200 text-xs font-semibold flex items-center space-x-1.5">
                <ShoppingCart size={14} className="text-purple-400" />
                <span>Yêu cầu mua</span>
              </span>
              <strong className="text-2xl font-black text-purple-300 font-display mt-1">{stats.buyRequests}</strong>
            </div>

            {/* Stat 7 */}
            <div className="p-3 rounded-2xl bg-[#2d2906]/90 border border-yellow-400/50 flex flex-col justify-between shadow-sm col-span-2 md:col-span-1">
              <span className="text-yellow-200 text-xs font-semibold flex items-center space-x-1.5">
                <TrendingUp size={14} className="text-yellow-400" />
                <span>Chuyển đổi</span>
              </span>
              <strong className="text-2xl font-black text-yellow-300 font-display mt-1">{stats.conversionRate}</strong>
            </div>
          </div>
        )}

        {/* 3. TAB NAVIGATION */}
        <div className="flex items-center space-x-2 px-6 pt-3 bg-[#081735] border-b border-cyan-500/20 text-xs flex-shrink-0">
          <button
            onClick={() => setActiveTab('leads')}
            className={`flex items-center space-x-2 px-5 py-3 rounded-t-2xl font-bold transition-all text-xs sm:text-sm ${
              activeTab === 'leads'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Users size={16} />
            <span>Danh sách Khách & CRM Leads ({leads.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center space-x-2 px-5 py-3 rounded-t-2xl font-bold transition-all text-xs sm:text-sm ${
              activeTab === 'products'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Layers size={16} />
            <span>Quản trị Sản phẩm & Báo giá ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center space-x-2 px-5 py-3 rounded-t-2xl font-bold transition-all text-xs sm:text-sm ${
              activeTab === 'settings'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Settings size={16} />
            <span>Cấu hình Robot & Kịch bản bán hàng</span>
          </button>
        </div>

        {/* 4. TAB CONTENT BODY */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar bg-[#050c1f]">
          {/* TAB 1: LEADS MANAGEMENT */}
          {activeTab === 'leads' && (
            <div className="space-y-4">
              {/* Filter controls */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#081838] p-3.5 rounded-2xl border border-cyan-500/30 shadow-sm">
                <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar text-xs">
                  {[
                    { key: 'all', label: 'Tất cả' },
                    { key: 'NEW – WAITING FOR OWNER CONTACT', label: 'Khách mới' },
                    { key: 'WAITING_CALL', label: 'Đang chờ gọi' },
                    { key: 'CONTACTED', label: 'Đã liên hệ' },
                    { key: 'HIGH_INTEREST', label: 'Quan tâm cao' }
                  ].map((flt) => (
                    <button
                      key={flt.key}
                      onClick={() => setLeadFilter(flt.key)}
                      className={`px-4 py-2 rounded-xl whitespace-nowrap font-bold transition-all ${
                        leadFilter === flt.key
                          ? 'bg-cyan-400 text-slate-950 shadow-[0_0_12px_rgba(0,240,255,0.5)]'
                          : 'bg-[#0a2047] text-slate-200 hover:text-white hover:bg-[#0e2a5c] border border-cyan-500/30'
                      }`}
                    >
                      {flt.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                  <div className="relative flex-1 md:w-72">
                    <Search size={16} className="absolute left-3 top-3 text-cyan-400" />
                    <input
                      type="text"
                      value={searchLead}
                      onChange={(e) => setSearchLead(e.target.value)}
                      placeholder="Tìm theo tên, SĐT, Sản phẩm..."
                      className="w-full bg-[#0a1f44] border border-cyan-500/40 text-sm text-white placeholder-slate-400 pl-9 pr-4 py-2 rounded-xl outline-none focus:border-cyan-400 shadow-inner"
                    />
                  </div>

                  {selectedLeadIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        requestDeleteConfirmation({
                          entity: 'lead',
                          mode: 'selected',
                          selectedIds: selectedLeadIds
                        })
                      }
                      className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 whitespace-nowrap"
                    >
                      <Trash2 size={14} />
                      <span>Xóa đã chọn ({selectedLeadIds.length})</span>
                    </button>
                  )}

                  {leads.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        requestDeleteConfirmation({
                          entity: 'lead',
                          mode: 'all',
                          totalCount: stats?.totalLeads || leads.length
                        })
                      }
                      className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-rose-950/70 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 font-bold text-xs transition-all active:scale-95 whitespace-nowrap"
                      title="Xóa toàn bộ danh sách khách hàng"
                    >
                      <Trash2 size={14} />
                      <span>Xóa tất cả</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Leads Table - THẤY HẾT Ô GRID, XUỐNG DÒNG, KHÔNG CUỘN NGANG */}
              <div className="w-full rounded-2xl border-2 border-cyan-500/30 bg-[#071530] shadow-xl overflow-hidden">
                <table className="w-full text-left text-xs sm:text-sm text-slate-200 table-fixed border-collapse">
                  <colgroup>
                    <col className="w-[4%]" />
                    <col className="w-[10%]" />
                    <col className="w-[13%]" />
                    <col className="w-[12%]" />
                    <col className="w-[23%]" />
                    <col className="w-[11%]" />
                    <col className="w-[13%]" />
                    <col className="w-[14%]" />
                  </colgroup>
                  <thead className="bg-[#0a214d] text-cyan-300 font-bold uppercase text-[11px] sm:text-xs tracking-wider border-b-2 border-cyan-500/40">
                    <tr>
                      <th className="py-3.5 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={leads.length > 0 && leads.every((ld) => selectedLeadIds.includes(ld.id))}
                          onChange={() => toggleSelectAll(leads, selectedLeadIds, setSelectedLeadIds)}
                          title="Chọn tất cả khách hàng đang hiển thị"
                          className="w-4 h-4 rounded accent-cyan-400 cursor-pointer"
                        />
                      </th>
                      <th className="py-3.5 px-3">Thời gian</th>
                      <th className="py-3.5 px-3">Khách hàng</th>
                      <th className="py-3.5 px-3">Số điện thoại</th>
                      <th className="py-3.5 px-3">Sản phẩm quan tâm</th>
                      <th className="py-3.5 px-3">Nhu cầu</th>
                      <th className="py-3.5 px-3">Trạng thái</th>
                      <th className="py-3.5 px-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {leads.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="py-12 text-center text-slate-400 text-sm">
                          Chưa có khách hàng nào phù hợp với bộ lọc hiện tại.
                        </td>
                      </tr>
                    ) : (
                      leads.map((ld, idx) => {
                        return (
                          <tr
                            key={ld.id}
                            className={`hover:bg-[#0c2452] transition-colors ${
                              idx % 2 === 0 ? 'bg-[#071530]' : 'bg-[#051126]'
                            }`}
                          >
                            {/* Checkbox chọn dòng */}
                            <td className="py-3 px-2 align-middle text-center">
                              <input
                                type="checkbox"
                                checked={selectedLeadIds.includes(ld.id)}
                                onChange={() => toggleSelectOne(ld.id, setSelectedLeadIds)}
                                className="w-4 h-4 rounded accent-cyan-400 cursor-pointer"
                              />
                            </td>
                            {/* Thời gian */}
                            <td className="py-3 px-3 align-middle font-mono text-[11px] text-slate-300">
                              <div className="font-bold text-cyan-300">
                                {new Date(ld.created_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </div>
                              <div className="text-slate-400 text-[10px]">
                                {new Date(ld.created_time).toLocaleDateString('vi-VN')}
                              </div>
                            </td>

                            {/* Khách hàng */}
                            <td className="py-3 px-3 align-middle">
                              <div className="font-bold text-white text-xs sm:text-sm leading-snug break-words whitespace-normal">
                                {ld.customer_name}
                              </div>
                              {ld.email && (
                                <div className="text-[11px] text-cyan-300/80 break-all leading-tight mt-0.5">
                                  {ld.email}
                                </div>
                              )}
                            </td>

                            {/* Số điện thoại */}
                            <td className="py-3 px-3 align-middle">
                              <span className="font-mono font-bold text-cyan-300 text-xs sm:text-sm tracking-wide block">
                                {ld.phone}
                              </span>
                            </td>

                            {/* Sản phẩm quan tâm: XUỐNG DÒNG TỰ NHIÊN, KHÔNG TRUNCATE, THẤY TOÀN BỘ CHỮ */}
                            <td className="py-3 px-3 align-middle">
                              <div className="text-white font-semibold text-xs sm:text-sm leading-relaxed break-words whitespace-normal">
                                {ld.product_name || 'Tư vấn tổng quan'}
                              </div>
                            </td>

                            {/* Nhu cầu: XUỐNG DÒNG, KHÔNG BỊ CẮT */}
                            <td className="py-3 px-3 align-middle">
                              <span className="inline-block px-2.5 py-1 rounded-lg bg-[#0c2654] border border-cyan-500/40 text-cyan-200 text-[11px] sm:text-xs font-semibold break-words whitespace-normal leading-snug">
                                {ld.customer_requirement || 'Tư vấn'}
                              </span>
                            </td>

                            {/* Trạng thái */}
                            <td className="py-3 px-3 align-middle">
                              <select
                                value={ld.lead_status}
                                onChange={(e) => handleUpdateLeadStatus(ld.id, e.target.value)}
                                className="w-full bg-[#0b2046] border border-cyan-500/40 text-[11px] sm:text-xs font-bold rounded-xl px-2 py-1.5 text-white outline-none focus:border-cyan-300 shadow-sm cursor-pointer"
                              >
                                <option value="NEW – WAITING FOR OWNER CONTACT">Mới - Chờ gọi</option>
                                <option value="WAITING_CALL">Đang chờ gọi</option>
                                <option value="CONTACTED">Đã liên hệ</option>
                                <option value="HIGH_INTEREST">Quan tâm cao</option>
                                <option value="CLOSED">Hoàn thành</option>
                              </select>
                            </td>

                            {/* Thao tác */}
                            <td className="py-3 px-3 align-middle text-right">
                              <div className="flex items-center justify-end gap-1 flex-wrap">
                                {/* Direct Call */}
                                <a
                                  href={`tel:${ld.phone}`}
                                  className="inline-flex items-center space-x-0.5 px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm transition-all active:scale-95"
                                  title="Gọi điện thoại trực tiếp cho khách"
                                >
                                  <Phone size={11} />
                                  <span>Gọi</span>
                                </a>

                                {/* Zalo */}
                                <a
                                  href={`https://zalo.me/${ld.phone}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] shadow-sm transition-all active:scale-95"
                                  title="Mở chat Zalo với khách"
                                >
                                  <span>Zalo</span>
                                </a>

                                {/* View Conversation */}
                                {ld.conversation_id && (
                                  <button
                                    onClick={() => handleViewConversation(ld.conversation_id, ld)}
                                    className="inline-flex items-center space-x-0.5 px-2 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] shadow-sm transition-all active:scale-95"
                                    title="Xem toàn bộ lịch sử hội thoại của khách với Robot"
                                  >
                                    <MessageSquare size={11} />
                                    <span>Chat</span>
                                  </button>
                                )}

                                {/* Delete Lead */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    requestDeleteConfirmation({
                                      entity: 'lead',
                                      mode: 'single',
                                      item: ld
                                    })
                                  }
                                  className="inline-flex items-center space-x-0.5 px-2 py-1 rounded-lg bg-rose-600/90 hover:bg-rose-500 text-white font-bold text-[11px] shadow-sm transition-all active:scale-95"
                                  title="Xóa khách hàng này khỏi danh sách"
                                >
                                  <Trash2 size={11} />
                                  <span>Xóa</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: PRODUCT MANAGEMENT & PRODUCT CENTER */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#081838] p-4 rounded-2xl border border-cyan-500/30">
                <div>
                  <h3 className="text-base font-bold text-white font-display">DANH MỤC HÀNG HÓA & PHÊ DUYỆT BÁO GIÁ</h3>
                  <p className="text-xs text-slate-300 mt-0.5">Các sản phẩm hiển thị trên Cột 2 (Product Selector) đã qua kiểm duyệt</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {selectedProductIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        requestDeleteConfirmation({
                          entity: 'product',
                          mode: 'selected',
                          selectedIds: selectedProductIds
                        })
                      }
                      className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                    >
                      <Trash2 size={15} />
                      <span>Xóa đã chọn ({selectedProductIds.length})</span>
                    </button>
                  )}

                  {products.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        requestDeleteConfirmation({
                          entity: 'product',
                          mode: 'all',
                          totalCount: products.length
                        })
                      }
                      className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-rose-950/70 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 font-bold text-xs transition-all active:scale-95"
                      title="Xóa toàn bộ sản phẩm hiện có"
                    >
                      <Trash2 size={15} />
                      <span>Xóa tất cả</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setShowUrlModal(true);
                      setUrlError(null);
                      setAnalyzedProduct(null);
                    }}
                    className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-500 text-white font-bold text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all border border-purple-400/40"
                  >
                    <Globe size={16} />
                    <span>🌐 Nhập link Website (AI Gemini)</span>
                  </button>

                  <button
                    onClick={() => setShowAddProductModal(true)}
                    className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-bold text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all"
                  >
                    <Plus size={16} />
                    <span>Thêm sản phẩm mới</span>
                  </button>
                </div>
              </div>

              {/* Product Search & Counter Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#081838] p-3 rounded-2xl border border-cyan-500/30">
                <div className="relative flex-1 max-w-md">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400" />
                  <input
                    type="text"
                    value={searchProduct}
                    onChange={(e) => setSearchProduct(e.target.value)}
                    placeholder="Tìm kiếm sản phẩm theo tên, lĩnh vực, giá..."
                    className="w-full bg-[#0a1f44] border border-cyan-500/40 text-xs sm:text-sm text-white placeholder-slate-400 pl-10 pr-8 py-2 rounded-xl outline-none focus:border-cyan-400 shadow-inner"
                  />
                  {searchProduct && (
                    <button
                      type="button"
                      onClick={() => setSearchProduct('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <div className="flex items-center space-x-2 text-xs text-slate-300">
                  <span>
                    Hiển thị: <strong className="text-cyan-300">{filteredProducts.length}</strong> / {products.length} sản phẩm
                  </span>
                </div>
              </div>

              {/* Products Table - THẤY HẾT Ô GRID, XUỐNG DÒNG, KHÔNG CUỘN NGANG */}
              <div className="w-full rounded-2xl border-2 border-cyan-500/30 bg-[#071530] shadow-xl overflow-hidden">
                <table className="w-full text-left text-xs sm:text-sm text-slate-200 table-fixed border-collapse">
                  <colgroup>
                    <col className="w-[4%]" />
                    <col className="w-[9%]" />
                    <col className="w-[14%]" />
                    <col className="w-[15%]" />
                    <col className="w-[25%]" />
                    <col className="w-[13%]" />
                    <col className="w-[11%]" />
                    <col className="w-[9%]" />
                  </colgroup>
                  <thead className="bg-[#0a214d] text-cyan-300 font-bold uppercase text-[11px] sm:text-xs tracking-wider border-b-2 border-cyan-500/40">
                    <tr>
                      <th className="py-3.5 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={filteredProducts.length > 0 && filteredProducts.every((p) => selectedProductIds.includes(p.id))}
                          onChange={() => toggleSelectAll(filteredProducts, selectedProductIds, setSelectedProductIds)}
                          title="Chọn tất cả sản phẩm đang hiển thị"
                          className="w-4 h-4 rounded accent-cyan-400 cursor-pointer"
                        />
                      </th>
                      <th className="py-3.5 px-3">Ảnh</th>
                      <th className="py-3.5 px-3">Lĩnh vực</th>
                      <th className="py-3.5 px-3">Nhóm SP</th>
                      <th className="py-3.5 px-3">Tên sản phẩm</th>
                      <th className="py-3.5 px-3">Giá phê duyệt</th>
                      <th className="py-3.5 px-3">Trạng thái duyệt</th>
                      <th className="py-3.5 px-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="py-12 text-center text-slate-400 text-sm">
                          {searchProduct ? `Không tìm thấy sản phẩm nào khớp với "${searchProduct}".` : 'Chưa có sản phẩm nào trong danh mục.'}
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((p, idx) => (
                        <tr
                          key={p.id}
                          className={`hover:bg-[#0c2452] transition-colors ${
                            idx % 2 === 0 ? 'bg-[#071530]' : 'bg-[#051126]'
                          }`}
                        >
                          <td className="py-3 px-2 align-middle text-center">
                            <input
                              type="checkbox"
                              checked={selectedProductIds.includes(p.id)}
                              onChange={() => toggleSelectOne(p.id, setSelectedProductIds)}
                              className="w-4 h-4 rounded accent-cyan-400 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-3 align-middle">
                            <div className="flex flex-col items-center gap-1.5 w-16">
                              <img
                                src={p.image_url}
                                alt={p.name}
                                className="w-14 h-14 rounded-xl object-cover bg-slate-950 border border-cyan-500/40 shadow-sm"
                              />
                              <label
                                className={`inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer border transition-colors ${
                                  uploadingProductId === p.id
                                    ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/50 cursor-wait'
                                    : 'bg-[#0a1f44] hover:bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                }`}
                                title="Chọn ảnh mới từ máy tính"
                              >
                                <Upload className="w-3 h-3" />
                                <span>{uploadingProductId === p.id ? 'Đang tải...' : 'Đổi ảnh'}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  disabled={uploadingProductId === p.id}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    e.target.value = '';
                                    if (file) handleUpdateProductImage(p.id, file);
                                  }}
                                  className="hidden"
                                />
                              </label>
                            </div>
                          </td>
                          <td className="py-3 px-3 align-middle text-cyan-300 font-bold break-words whitespace-normal">{p.field}</td>
                          <td className="py-3 px-3 align-middle text-slate-200 break-words whitespace-normal">{p.group_name}</td>
                          <td className="py-3 px-3 align-middle font-bold text-white text-xs sm:text-sm break-words whitespace-normal leading-relaxed">{p.name}</td>
                          <td className="py-3 px-3 align-middle font-extrabold text-[#ff3864] font-display text-sm sm:text-base break-words whitespace-normal">
                            {p.price_formatted || `${(p.price || 0).toLocaleString('vi-VN')} ₫`}
                          </td>
                          <td className="py-3 px-3 align-middle">
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold">
                              <CheckCircle size={12} className="text-emerald-400" />
                              <span>Đã duyệt</span>
                            </span>
                          </td>
                          <td className="py-3 px-3 align-middle text-right">
                            <button
                              type="button"
                              onClick={() =>
                                requestDeleteConfirmation({
                                  entity: 'product',
                                  mode: 'single',
                                  item: p
                                })
                              }
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-500 text-white font-bold text-[11px] shadow-sm transition-all active:scale-95"
                              title="Xóa sản phẩm này"
                            >
                              <Trash2 size={12} />
                              <span>Xóa</span>
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

          {/* TAB 3: ADMIN SETTINGS & SCRIPT CONFIGURATION */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveSettings} className="space-y-6 max-w-5xl mx-auto">
              <div className="bg-[#081838] p-6 rounded-2xl border border-cyan-500/30 space-y-5">
                <h3 className="text-base font-bold text-cyan-300 font-display flex items-center space-x-2">
                  <Bot size={18} />
                  <span>1. CẤU HÌNH NHÂN VẬT ROBOT & CHỦ NHÂN</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1.5">Tên Robot bán hàng:</label>
                    <input
                      type="text"
                      value={settingsForm.bot_name || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, bot_name: e.target.value })}
                      className="w-full bg-[#0a1f44] border border-cyan-500/40 rounded-xl px-4 py-2.5 text-white font-semibold text-sm outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1.5">Tên chủ nhân shop:</label>
                    <input
                      type="text"
                      value={settingsForm.owner_name || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, owner_name: e.target.value })}
                      className="w-full bg-[#0a1f44] border border-cyan-500/40 rounded-xl px-4 py-2.5 text-white font-semibold text-sm outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1.5">Hotline hỗ trợ:</label>
                    <input
                      type="text"
                      value={settingsForm.hotline || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, hotline: e.target.value })}
                      className="w-full bg-[#0a1f44] border border-cyan-500/40 rounded-xl px-4 py-2.5 text-amber-300 font-bold font-mono text-sm outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1.5">Email nhận thông báo Lead:</label>
                    <input
                      type="email"
                      value={settingsForm.lead_notification_email || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, lead_notification_email: e.target.value })}
                      className="w-full bg-[#0a1f44] border border-cyan-500/40 rounded-xl px-4 py-2.5 text-white font-semibold text-sm outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-slate-300 font-bold mb-1.5">
                    Kịch bản mời để lại số điện thoại (Chuẩn Master Script):
                  </label>
                  <textarea
                    rows={3}
                    value={settingsForm.phone_invitation_prompt || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, phone_invitation_prompt: e.target.value })}
                    className="w-full bg-[#0a1f44] border border-cyan-500/40 rounded-xl p-3 text-white text-sm outline-none focus:border-cyan-400 leading-relaxed resize-none"
                  />
                </div>
              </div>

              {/* SECTION 2: AI ENGINE & GOOGLE GEMINI LLM CONFIGURATION */}
              <div className="bg-[#081838] p-6 rounded-2xl border border-cyan-500/30 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-cyan-300 font-display flex items-center space-x-2">
                    <Sparkles size={18} className="text-cyan-400" />
                    <span>2. CẤU HÌNH BỘ NÃO GOOGLE GEMINI AI (LLM) & BÁN HÀNG</span>
                  </h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center space-x-1.5 ${
                      settings.has_gemini_key === '1'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                        : 'bg-cyan-950 text-cyan-300 border-cyan-500/40'
                    }`}
                  >
                    <span>{settings.has_gemini_key === '1' ? '🟢' : '🟡'}</span>
                    <span>
                      {settings.has_gemini_key === '1'
                        ? `Google Gemini AI (${settings.gemini_model || 'gemini-1.5-flash'}) Đang kích hoạt`
                        : 'Chưa gắn Gemini API Key (Đang dùng Heuristic & Smart Engine)'}
                    </span>
                  </span>
                </div>

                {/* Gemini Settings Box */}
                <div className="p-4 rounded-xl bg-[#06122d] border border-cyan-500/40 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white uppercase tracking-wider flex items-center space-x-2">
                      <Bot size={15} className="text-cyan-400" />
                      <span>Google Gemini AI (Phân tích Website & Báo giá thông minh)</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleTestGemini}
                      disabled={testingGemini}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold text-xs border border-cyan-500/50 transition-all disabled:opacity-50"
                    >
                      {testingGemini ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                      <span>{testingGemini ? 'Đang kiểm tra...' : 'Kiểm tra kết nối Gemini'}</span>
                    </button>
                  </div>

                  {geminiTestResult && (
                    <div
                      className={`p-3 rounded-xl text-xs font-medium border flex items-start space-x-2 ${
                        geminiTestResult.success
                          ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                          : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
                      }`}
                    >
                      {geminiTestResult.success ? <Check size={16} className="shrink-0 mt-0.5 text-emerald-400" /> : <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />}
                      <span>{geminiTestResult.message}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1.5">
                        Google Gemini API Key (Lấy từ Google AI Studio):
                      </label>
                      <input
                        type="password"
                        value={settingsForm.gemini_api_key || ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, gemini_api_key: e.target.value })}
                        placeholder={settings.has_gemini_key === '1' ? '•••••••• (Đã lưu - nhập để đổi mới)' : 'AIzaSy... (Nhập Gemini API Key)'}
                        className="w-full bg-[#0a1f44] border border-cyan-500/40 rounded-xl px-4 py-2.5 text-white font-mono text-sm outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1.5">
                        Model Google Gemini:
                      </label>
                      <select
                        value={settingsForm.gemini_model || 'gemini-flash-lite-latest'}
                        onChange={(e) => setSettingsForm({ ...settingsForm, gemini_model: e.target.value })}
                        className="w-full bg-[#0a1f44] border border-cyan-500/40 rounded-xl px-4 py-2.5 text-cyan-300 font-semibold text-sm outline-none focus:border-cyan-400"
                      >
                        <option value="gemini-flash-lite-latest">gemini-flash-lite-latest (Khuyên dùng - Siêu tốc & ổn định)</option>
                        <option value="gemini-flash-latest">gemini-flash-latest (Đa năng & thông minh)</option>
                        <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (Thế hệ 3.5)</option>
                        <option value="gemini-3.7-flash">gemini-3.7-flash (Phiên bản cao cấp mới nhất)</option>
                        <option value="gemini-pro-latest">gemini-pro-latest (Chuyên sâu phân tích đa nhiệm)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1.5">
                        Bộ não AI ưu tiên:
                      </label>
                      <select
                        value={settingsForm.llm_provider || 'gemini'}
                        onChange={(e) => setSettingsForm({ ...settingsForm, llm_provider: e.target.value })}
                        className="w-full bg-[#0a1f44] border border-cyan-500/40 rounded-xl px-4 py-2.5 text-amber-300 font-semibold text-sm outline-none focus:border-cyan-400"
                      >
                        <option value="gemini">Google Gemini AI (Khuyên dùng)</option>
                        <option value="openai">OpenAI (GPT-4o / Compatible)</option>
                        <option value="auto">Tự động (Ưu tiên Gemini, dự phòng OpenAI)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Optional OpenAI Settings */}
                <div className="p-4 rounded-xl bg-[#06122d]/60 border border-slate-700/60 space-y-3">
                  <div className="font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center space-x-2">
                    <Sliders size={14} />
                    <span>Cấu hình dự phòng OpenAI / Endpoint khác (Tùy chọn)</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">
                        OpenAI API Key:
                      </label>
                      <input
                        type="password"
                        value={settingsForm.openai_api_key || ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, openai_api_key: e.target.value })}
                        placeholder={settings.has_openai_key === '1' ? '•••••••• (Đã lưu)' : 'sk-...'}
                        className="w-full bg-[#0a1f44] border border-slate-700 rounded-xl px-4 py-2 text-white font-mono text-xs outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">
                        OpenAI Model:
                      </label>
                      <input
                        type="text"
                        value={settingsForm.openai_model || 'gpt-4o-mini'}
                        onChange={(e) => setSettingsForm({ ...settingsForm, openai_model: e.target.value })}
                        placeholder="gpt-4o-mini"
                        className="w-full bg-[#0a1f44] border border-slate-700 rounded-xl px-4 py-2 text-slate-200 font-mono text-xs outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">
                        OpenAI Base URL:
                      </label>
                      <input
                        type="text"
                        value={settingsForm.openai_base_url || 'https://api.openai.com/v1'}
                        onChange={(e) => setSettingsForm({ ...settingsForm, openai_base_url: e.target.value })}
                        placeholder="https://api.openai.com/v1"
                        className="w-full bg-[#0a1f44] border border-slate-700 rounded-xl px-4 py-2 text-slate-200 font-mono text-xs outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-400">
                  🔒 Bảo mật tuyệt đối: Toàn bộ API Key chỉ được lưu trữ và mã hóa an toàn phía server, không bao giờ lộ ra trình duyệt của khách hàng.
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="flex items-center space-x-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-bold text-sm shadow-lg hover:brightness-110 active:scale-95 transition-all"
                >
                  <Save size={16} />
                  <span>Lưu toàn bộ cấu hình</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Modal View Conversation History */}
      {selectedLeadConv && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-3xl h-[80vh] bg-[#07132c] border-2 border-cyan-500/40 rounded-3xl flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 bg-[#091b3e] border-b border-cyan-500/30">
              <div className="flex items-center space-x-2.5">
                <MessageSquare size={18} className="text-cyan-400" />
                <h3 className="font-bold text-base text-white font-display">
                  Lịch sử hội thoại: {selectedLeadConv.customer_name} ({selectedLeadConv.phone})
                </h3>
              </div>
              <button
                onClick={() => setSelectedLeadConv(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3.5 custom-scrollbar bg-[#050c1f]">
              {loadingConv ? (
                <div className="flex justify-center items-center h-32 text-cyan-300 text-sm font-semibold">
                  Đang tải lịch sử hội thoại...
                </div>
              ) : convMessages.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">
                  Không tìm thấy tin nhắn nào trong phiên này.
                </div>
              ) : (
                convMessages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${
                      m.senderType === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <span className="text-[11px] text-slate-400 mb-1 font-semibold">
                      {m.senderType === 'user' ? selectedLeadConv.customer_name : 'TRÍ AI Sales Robot'}
                    </span>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        m.senderType === 'user'
                          ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-tr-none shadow-md'
                          : 'bg-[#0a2046] text-slate-100 border border-cyan-500/30 rounded-tl-none shadow-md'
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-[#091b3e] border-t border-cyan-500/20 text-right">
              <button
                onClick={() => setSelectedLeadConv(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-white font-bold"
              >
                Đóng cửa sổ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal URL Product Import & Analysis with Google Gemini LLM */}
      {showUrlModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-2xl bg-[#07132c] border-2 border-purple-500/50 rounded-3xl flex flex-col overflow-hidden shadow-[0_0_50px_rgba(168,85,247,0.3)]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-purple-950/80 to-[#091b3e] border-b border-purple-500/40">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-400/40 text-purple-300">
                  <Globe size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white font-display flex items-center space-x-2">
                    <span>Nhập Link Website Sản Phẩm & Phân Tích Gemini AI</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/40 uppercase">
                      Gemini LLM
                    </span>
                  </h3>
                  <p className="text-xs text-purple-200/70 mt-0.5">
                    Tự động đọc nội dung web, trích xuất tên, lĩnh vực, báo giá và thông số kỹ thuật
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowUrlModal(false);
                  setUrlError(null);
                  setAnalyzedProduct(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 text-xs overflow-y-auto max-h-[75vh] bg-[#050c1f]">
              {/* URL Input Form */}
              <form onSubmit={handleAnalyzeUrl} className="space-y-3">
                <label className="block text-slate-200 font-bold">
                  Dán địa chỉ website sản phẩm (URL):
                </label>
                <div className="flex flex-col sm:flex-row items-stretch gap-2">
                  <div className="relative flex-1">
                    <Link2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="url"
                      required
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://tiki.vn/... hoặc https://dienmayxanh.com/... hoặc website bất kỳ"
                      className="w-full bg-[#0a1f44] border border-purple-500/40 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-purple-400 font-mono shadow-inner"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={analyzingUrl || !urlInput.trim()}
                    className="flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 shrink-0"
                  >
                    {analyzingUrl ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        <span>Đang phân tích AI...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={15} />
                        <span>Phân tích bằng Gemini AI</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  💡 Hỗ trợ: Các trang bán hàng, thương mại điện tử, bài viết đánh giá, landing page sản phẩm.
                </p>
              </form>

              {/* Error Message */}
              {urlError && (
                <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 flex items-start space-x-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
                  <span>{urlError}</span>
                </div>
              )}

              {/* Loading State Animation */}
              {analyzingUrl && (
                <div className="p-8 rounded-2xl bg-[#081838] border border-purple-500/30 flex flex-col items-center justify-center text-center space-y-3 animate-pulse">
                  <div className="p-3 rounded-full bg-purple-500/20 text-purple-300">
                    <Loader2 size={32} className="animate-spin" />
                  </div>
                  <h4 className="font-bold text-white text-sm">Đang tải trang web & kết nối Google Gemini AI...</h4>
                  <p className="text-xs text-slate-300 max-w-md">
                    Gemini đang đọc toàn bộ văn bản HTML, nhận diện cấu trúc giá bán, trích xuất thông số kỹ thuật và tạo mô tả bán hàng tối ưu.
                  </p>
                </div>
              )}

              {/* Result Preview Form */}
              {analyzedProduct && (
                <div className="p-5 rounded-2xl bg-[#081838] border-2 border-emerald-500/40 space-y-4 shadow-xl">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-700/60">
                    <div className="flex items-center space-x-2">
                      <CheckCircle size={18} className="text-emerald-400" />
                      <span className="font-bold text-emerald-300 text-sm">KẾT QUẢ PHÂN TÍCH THÀNH CÔNG</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-purple-950 text-purple-300 border border-purple-500/40 text-[11px] font-semibold">
                      ✨ {analyzedProduct.analyzed_by || 'Google Gemini AI'}
                    </span>
                  </div>

                  {/* Form fields to tweak before saving */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Tên sản phẩm (*):</label>
                      <input
                        type="text"
                        value={analyzedProduct.name || ''}
                        onChange={(e) => setAnalyzedProduct({ ...analyzedProduct, name: e.target.value })}
                        className="w-full bg-[#0a1f44] border border-cyan-500/40 rounded-xl px-3.5 py-2 text-white font-bold text-sm outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Giá bán (VND) (*):</label>
                      <input
                        type="number"
                        value={analyzedProduct.price || 0}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 0;
                          setAnalyzedProduct({
                            ...analyzedProduct,
                            price: val,
                            price_formatted: val > 0 ? `${val.toLocaleString('vi-VN')} ₫` : 'Liên hệ'
                          });
                        }}
                        className="w-full bg-[#0a1f44] border border-cyan-500/40 rounded-xl px-3.5 py-2 text-amber-300 font-mono font-bold text-sm outline-none focus:border-cyan-400"
                      />
                      <span className="text-[11px] text-amber-400/80 mt-0.5 block">
                        Hiển thị: {analyzedProduct.price_formatted}
                      </span>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Lĩnh vực (*):</label>
                      <input
                        type="text"
                        value={analyzedProduct.field || ''}
                        onChange={(e) => setAnalyzedProduct({ ...analyzedProduct, field: e.target.value })}
                        className="w-full bg-[#0a1f44] border border-cyan-500/40 rounded-xl px-3.5 py-2 text-white text-xs outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Nhóm phân khúc (*):</label>
                      <input
                        type="text"
                        value={analyzedProduct.group_name || ''}
                        onChange={(e) => setAnalyzedProduct({ ...analyzedProduct, group_name: e.target.value })}
                        className="w-full bg-[#0a1f44] border border-cyan-500/40 rounded-xl px-3.5 py-2 text-white text-xs outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Mô tả bán hàng chuẩn AI:</label>
                    <textarea
                      rows={3}
                      value={analyzedProduct.description || ''}
                      onChange={(e) => setAnalyzedProduct({ ...analyzedProduct, description: e.target.value })}
                      className="w-full bg-[#0a1f44] border border-cyan-500/40 rounded-xl p-3 text-white text-xs outline-none focus:border-cyan-400 leading-relaxed resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Link ảnh sản phẩm trích xuất được:</label>
                    <div className="flex items-center space-x-3">
                      <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                        <img
                          src={analyzedProduct.image_url || '/assets/machine_2166.png'}
                          alt="preview"
                          className="w-full h-full object-contain"
                          onError={(e) => (e.target.src = '/assets/machine_2166.png')}
                        />
                      </div>
                      <input
                        type="text"
                        value={analyzedProduct.image_url || ''}
                        onChange={(e) => setAnalyzedProduct({ ...analyzedProduct, image_url: e.target.value })}
                        className="flex-1 bg-[#0a1f44] border border-cyan-500/40 rounded-xl px-3.5 py-2 text-slate-300 text-xs font-mono outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  {/* Highlights */}
                  {analyzedProduct.key_highlights && analyzedProduct.key_highlights.length > 0 && (
                    <div className="p-3 rounded-xl bg-[#06122d] border border-slate-700/80">
                      <span className="font-bold text-[11px] text-cyan-300 uppercase tracking-wide block mb-1.5">
                        Điểm nổi bật do Gemini phát hiện:
                      </span>
                      <ul className="list-disc list-inside space-y-1 text-slate-300 text-xs">
                        {analyzedProduct.key_highlights.map((h, i) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-slate-700">
                    <button
                      type="button"
                      onClick={() => setAnalyzedProduct(null)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold text-xs"
                    >
                      Phân tích lại
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveAnalyzedProduct}
                      className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all"
                    >
                      <Save size={16} />
                      <span>Lưu vào Danh mục sản phẩm (Cột 2)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Add Product Form */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl bg-[#07132c] border-2 border-cyan-500/40 rounded-3xl flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 bg-[#091b3e] border-b border-cyan-500/30">
              <h3 className="font-bold text-base text-white flex items-center space-x-2 font-display">
                <Plus size={18} className="text-cyan-400" />
                <span>Thêm sản phẩm mới vào Product Center</span>
              </h3>
              <button onClick={() => setShowAddProductModal(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="p-6 space-y-4 text-xs overflow-y-auto max-h-[75vh] bg-[#050c1f]">
              <div>
                <label className="block text-slate-300 font-bold mb-1">1. Lĩnh vực (*):</label>
                <input
                  type="text"
                  required
                  value={newProd.field}
                  onChange={(e) => setNewProd({ ...newProd, field: e.target.value })}
                  placeholder="Ví dụ: Máy đếm tiền, Thiết bị văn phòng..."
                  className="w-full bg-[#0a1f44] border border-cyan-500/40 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">2. Nhóm sản phẩm (*):</label>
                <input
                  type="text"
                  required
                  value={newProd.group_name}
                  onChange={(e) => setNewProd({ ...newProd, group_name: e.target.value })}
                  placeholder="Ví dụ: Dòng máy phổ thông, Cao cấp, Đa ngoại tệ..."
                  className="w-full bg-[#0a1f44] border border-cyan-500/40 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">3. Tên sản phẩm (*):</label>
                <input
                  type="text"
                  required
                  value={newProd.name}
                  onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                  placeholder="Ví dụ: Xiudun XD-2166"
                  className="w-full bg-[#0a1f44] border border-cyan-500/40 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none focus:border-cyan-400 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Giá bán phê duyệt (VNĐ) (*):</label>
                <input
                  type="number"
                  required
                  value={newProd.price}
                  onChange={(e) => setNewProd({ ...newProd, price: e.target.value })}
                  placeholder="Ví dụ: 4290000"
                  className="w-full bg-[#0a1f44] border border-cyan-500/40 rounded-xl px-3.5 py-2.5 text-amber-300 text-sm font-bold font-mono outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">Hình ảnh sản phẩm (Tải từ máy tính):</label>
                <div className="flex items-center gap-3 bg-[#050c1f] border border-cyan-500/30 rounded-xl p-2.5">
                  <div className="w-16 h-16 rounded-xl bg-slate-950 border border-cyan-500/40 flex items-center justify-center overflow-hidden shrink-0">
                    {newProd.image_url ? (
                      <img
                        src={newProd.image_url}
                        alt="Xem trước ảnh"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Image className="w-6 h-6 text-slate-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <label
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold cursor-pointer border transition-all shadow-sm ${
                        uploadingImage
                          ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/50 cursor-wait'
                          : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border-cyan-400/50'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingImage ? 'Đang tải ảnh lên...' : 'Chọn ảnh từ máy tính'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingImage}
                        onChange={handleSelectNewProdImage}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="text"
                      value={newProd.image_url}
                      onChange={(e) => setNewProd({ ...newProd, image_url: e.target.value })}
                      placeholder="Hoặc dán đường dẫn ảnh (/uploads/..., https://...)"
                      className="w-full bg-[#0a1f44] border border-cyan-500/30 rounded-lg px-2.5 py-1.5 text-slate-200 text-[11px] outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Mô tả sản phẩm:</label>
                <textarea
                  rows={2}
                  value={newProd.description}
                  onChange={(e) => setNewProd({ ...newProd, description: e.target.value })}
                  placeholder="Đếm tiền nhanh, chính xác, phát hiện tiền giả..."
                  className="w-full bg-[#0a1f44] border border-cyan-500/40 rounded-xl p-3 text-white text-xs outline-none focus:border-cyan-400 resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="approveCheckbox"
                  checked={newProd.is_approved}
                  onChange={(e) => setNewProd({ ...newProd, is_approved: e.target.checked })}
                  className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
                />
                <label htmlFor="approveCheckbox" className="text-slate-200 font-semibold">
                  Phê duyệt giá bán ngay lập tức cho sản phẩm này
                </label>
              </div>

              <div className="flex justify-end space-x-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-bold text-xs shadow-md hover:brightness-110 active:scale-95 transition-all"
                >
                  Lưu & Đăng bán
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#071530] border-2 border-rose-500/50 rounded-2xl shadow-[0_0_50px_rgba(244,63,94,0.3)] overflow-hidden p-5 space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-xl bg-rose-950 border border-rose-500/50 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white font-display">{confirmDelete.title}</h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{confirmDelete.description}</p>
              </div>
            </div>

            <div className="flex justify-end space-x-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={executeConfirmDelete}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-60"
              >
                <Trash2 size={14} />
                <span>{deleting ? 'Đang xóa...' : 'Xác nhận xóa'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerDashboard;