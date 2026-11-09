import React, { useState, useEffect } from 'react';
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
  AlertCircle
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
  const [newProd, setNewProd] = useState({
    field: 'Trà Thượng Hạng Đôi Dép',
    group_name: 'Trà Oolong Thượng Hạng',
    name: '',
    price: '',
    specs: '',
    description: '',
    image_url: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=600&auto=format&fit=crop&q=80',
    is_approved: true
  });

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
    show_hotline: '1'
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
      if (dataLeads.success) setLeads(dataLeads.leads);

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
      if (dataProds.success) setProducts(dataProds.products);
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
          field: 'Trà Thượng Hạng Đôi Dép',
          group_name: 'Trà Oolong Thượng Hạng',
          name: '',
          price: '',
          specs: '',
          description: '',
          image_url: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=600&auto=format&fit=crop&q=80',
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-6xl h-[92vh] bg-white border-2 border-pink-200 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-800">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-pink-50 to-rose-50 border-b border-pink-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center text-white font-bold shadow-lg shadow-pink-500/20">
              <Shield size={22} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold text-slate-900 font-display">OWNER DASHBOARD • BẢNG QUẢN TRỊ CHỦ NHÂN</h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 border border-pink-300 font-mono font-semibold">
                  TRÍ AI CRM 2027
                </span>
              </div>
              <p className="text-xs text-slate-500">Chủ nhân: <strong className="text-slate-800">{settings.owner_name || 'Quang Nhựt Trí'}</strong> • Hotline: {settings.hotline || '0982441446'}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-600 hover:text-pink-700 transition-colors border border-pink-200"
              title="Làm mới dữ liệu"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-pink-50 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition-colors border border-pink-200"
              title="Đóng bảng quản trị"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Status Toast Alert */}
        {statusMessage && (
          <div className="px-6 py-2 bg-emerald-500/20 border-b border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between animate-slide-up">
            <span className="flex items-center space-x-2">
              <CheckCircle size={14} />
              <span>{statusMessage}</span>
            </span>
            <button onClick={() => setStatusMessage(null)} className="text-emerald-400 hover:text-white">✕</button>
          </div>
        )}

        {/* KPI Stats Bar (Section V) */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5 p-4 bg-slate-900/40 border-b border-slate-800/80 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/60 flex flex-col">
              <span className="text-slate-400 text-[11px] flex items-center space-x-1">
                <Users size={12} className="text-cyan-400" />
                <span>Tổng Leads</span>
              </span>
              <strong className="text-lg font-bold text-slate-100 font-display mt-0.5">{stats.totalLeads}</strong>
            </div>

            <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-800/60 flex flex-col">
              <span className="text-blue-300 text-[11px] flex items-center space-x-1">
                <Clock size={12} className="text-blue-400" />
                <span>Khách mới</span>
              </span>
              <strong className="text-lg font-bold text-blue-300 font-display mt-0.5">{stats.newLeads}</strong>
            </div>

            <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-800/60 flex flex-col">
              <span className="text-amber-300 text-[11px] flex items-center space-x-1">
                <PhoneCall size={12} className="text-amber-400" />
                <span>Chờ gọi</span>
              </span>
              <strong className="text-lg font-bold text-amber-300 font-display mt-0.5">{stats.waitingCall}</strong>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex flex-col">
              <span className="text-emerald-300 text-[11px] flex items-center space-x-1">
                <CheckCircle size={12} className="text-emerald-400" />
                <span>Đã liên hệ</span>
              </span>
              <strong className="text-lg font-bold text-emerald-300 font-display mt-0.5">{stats.contacted}</strong>
            </div>

            <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/60 flex flex-col">
              <span className="text-rose-300 text-[11px] flex items-center space-x-1">
                <Flame size={12} className="text-rose-400" />
                <span>Quan tâm cao</span>
              </span>
              <strong className="text-lg font-bold text-rose-300 font-display mt-0.5">{stats.highInterest}</strong>
            </div>

            <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-800/60 flex flex-col">
              <span className="text-purple-300 text-[11px] flex items-center space-x-1">
                <ShoppingCart size={12} className="text-purple-400" />
                <span>Yêu cầu mua</span>
              </span>
              <strong className="text-lg font-bold text-purple-300 font-display mt-0.5">{stats.buyRequests}</strong>
            </div>

            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-950/40 to-orange-950/40 border border-amber-600/50 flex flex-col col-span-2 md:col-span-1">
              <span className="text-amber-300 text-[11px] flex items-center space-x-1">
                <TrendingUp size={12} className="text-amber-400" />
                <span>Chuyển đổi</span>
              </span>
              <strong className="text-lg font-bold text-amber-300 font-display mt-0.5">{stats.conversionRate}</strong>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 px-6 pt-3 bg-slate-900/60 border-b border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('leads')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl font-semibold border-b-2 transition-all ${
              activeTab === 'leads'
                ? 'border-cyan-400 text-cyan-300 bg-slate-800/70'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <Users size={15} />
            <span>Danh sách Khách & CRM Leads ({leads.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl font-semibold border-b-2 transition-all ${
              activeTab === 'products'
                ? 'border-cyan-400 text-cyan-300 bg-slate-800/70'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <Layers size={15} />
            <span>Quản trị Sản phẩm & Báo giá ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl font-semibold border-b-2 transition-all ${
              activeTab === 'settings'
                ? 'border-cyan-400 text-cyan-300 bg-slate-800/70'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <Settings size={15} />
            <span>Cấu hình Robot & Kịch bản bán hàng</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {/* TAB 1: LEADS MANAGEMENT */}
          {activeTab === 'leads' && (
            <div className="space-y-4">
              {/* Filter controls */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/70 p-3 rounded-2xl border border-slate-800">
                <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar text-xs">
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
                      className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                        leadFilter === flt.key
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/50'
                      }`}
                    >
                      {flt.label}
                    </button>
                  ))}
                </div>

                <div className="relative w-full md:w-64">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchLead}
                    onChange={(e) => setSearchLead(e.target.value)}
                    placeholder="Tìm theo tên, SĐT, SP..."
                    className="w-full bg-slate-800 border border-slate-700 text-xs text-slate-200 pl-8 pr-3 py-1.5 rounded-xl outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Leads Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/50">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/90 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Thời gian</th>
                      <th className="py-3 px-4">Khách hàng</th>
                      <th className="py-3 px-4">Số điện thoại</th>
                      <th className="py-3 px-4">Sản phẩm quan tâm</th>
                      <th className="py-3 px-4">Nhu cầu</th>
                      <th className="py-3 px-4">Trạng thái</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {leads.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-8 text-center text-slate-500">
                          Chưa có Lead nào phù hợp với bộ lọc hiện tại.
                        </td>
                      </tr>
                    ) : (
                      leads.map((ld) => {
                        return (
                          <tr key={ld.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                              {new Date(ld.created_time).toLocaleString('vi-VN')}
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-100">
                              <div>{ld.customer_name}</div>
                              {ld.email && <div className="text-[10px] text-slate-400">{ld.email}</div>}
                            </td>
                            <td className="py-3 px-4 font-mono font-medium text-cyan-300">
                              {ld.phone}
                            </td>
                            <td className="py-3 px-4 max-w-xs truncate" title={ld.product_name}>
                              {ld.product_name || 'Tư vấn tổng quan'}
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-[11px]">
                                {ld.customer_requirement || 'Tư vấn'}
                              </span>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <select
                                value={ld.lead_status}
                                onChange={(e) => handleUpdateLeadStatus(ld.id, e.target.value)}
                                className="bg-slate-800 border border-slate-700 text-[11px] rounded-lg px-2 py-1 text-slate-200 outline-none focus:border-cyan-400"
                              >
                                <option value="NEW – WAITING FOR OWNER CONTACT">Mới - Chờ chủ nhân gọi</option>
                                <option value="WAITING_CALL">Đang chờ gọi điện</option>
                                <option value="CONTACTED">Đã liên hệ thành công</option>
                                <option value="HIGH_INTEREST">Khách quan tâm cao</option>
                                <option value="CLOSED">Đã hoàn thành</option>
                              </select>
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                              {/* Direct Call / Zalo */}
                              <a
                                href={`tel:${ld.phone}`}
                                className="inline-flex p-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/80"
                                title="Gọi điện thoại trực tiếp cho khách"
                              >
                                <Phone size={13} />
                              </a>
                              <a
                                href={`https://zalo.me/${ld.phone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex px-2 py-1 rounded-lg bg-blue-950/80 hover:bg-blue-900 text-blue-300 border border-blue-800/80 text-[11px] font-bold"
                                title="Mở chat Zalo với khách"
                              >
                                Zalo
                              </a>
                              {/* View Conversation */}
                              {ld.conversation_id && (
                                <button
                                  onClick={() => handleViewConversation(ld.conversation_id, ld)}
                                  className="inline-flex p-1.5 rounded-lg bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-800/80"
                                  title="Xem toàn bộ lịch sử hội thoại của khách với Robot"
                                >
                                  <MessageSquare size={13} />
                                </button>
                              )}
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
              <div className="flex items-center justify-between bg-slate-900/70 p-4 rounded-2xl border border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 font-display">DANH MỤC HÀNG HÓA & PHÊ DUYỆT BÁO GIÁ</h3>
                  <p className="text-xs text-slate-400">Các sản phẩm hiển thị trên Cột 2 (Product Selector) đã qua kiểm duyệt</p>
                </div>
                <button
                  onClick={() => setShowAddProductModal(true)}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs shadow-lg hover:shadow-cyan-500/20"
                >
                  <Plus size={15} />
                  <span>Thêm sản phẩm mới</span>
                </button>
              </div>

              {/* Products Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/50">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/90 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Ảnh</th>
                      <th className="py-3 px-4">Lĩnh vực</th>
                      <th className="py-3 px-4">Nhóm SP</th>
                      <th className="py-3 px-4">Tên sản phẩm</th>
                      <th className="py-3 px-4">Giá phê duyệt</th>
                      <th className="py-3 px-4">Trạng thái duyệt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {products.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4">
                          <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded-lg object-cover border border-slate-700" />
                        </td>
                        <td className="py-3 px-4 text-cyan-400 font-medium">{p.field}</td>
                        <td className="py-3 px-4 text-slate-300">{p.group_name}</td>
                        <td className="py-3 px-4 font-semibold text-slate-100">{p.name}</td>
                        <td className="py-3 px-4 font-bold text-amber-400 font-display">
                          {p.price_formatted || p.price?.toLocaleString('vi-VN') + ' ₫'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px]">
                            <CheckCircle size={10} />
                            <span>Đã phê duyệt</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: ADMIN SETTINGS & SCRIPT CONFIGURATION (Section VII) */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveSettings} className="space-y-6 max-w-4xl mx-auto">
              <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-cyan-300 font-display flex items-center space-x-2">
                  <Bot size={16} />
                  <span>1. CẤU HÌNH NHÂN VẬT ROBOT & CHỦ NHÂN</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Mô hình Robot 3D (Robot Archetype):</label>
                    <select
                      value={settingsForm.robot_model || 'cyber_valkyrie'}
                      onChange={(e) => setSettingsForm({ ...settingsForm, robot_model: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-cyan-400"
                    >
                      <option value="cyber_valkyrie">🤖 Cyber Valkyrie (Cyan Neon & Titanium)</option>
                      <option value="tron_humanoid">⚡ Tron Humanoid (Amber Gold & Obsidian)</option>
                      <option value="quantum_sphere">🔮 Quantum Sphere (Violet & Hologram)</option>
                      <option value="nano_sentinel">🛡️ Nano Sentinel (Emerald Chrome & Armor)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Tên Chatbot mặc định:</label>
                    <input
                      type="text"
                      value={settingsForm.bot_name || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, bot_name: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Tên chủ nhân:</label>
                    <input
                      type="text"
                      value={settingsForm.owner_name || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, owner_name: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Giọng điệu AI (AI Tone):</label>
                    <select
                      value={settingsForm.ai_tone || 'Chuyên nghiệp, thân thiện, lịch thiệp'}
                      onChange={(e) => setSettingsForm({ ...settingsForm, ai_tone: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-cyan-400"
                    >
                      <option value="Chuyên nghiệp, thân thiện, lịch thiệp">Chuyên nghiệp, thân thiện, lịch thiệp</option>
                      <option value="Đẳng cấp VIP, trang trọng">Đẳng cấp VIP, trang trọng</option>
                      <option value="Năng động, hiện đại, thuyết phục">Năng động, hiện đại, thuyết phục</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-slate-400 mb-1">Link Ảnh đại diện Robot (Avatar URL):</label>
                    <input
                      type="text"
                      value={settingsForm.avatar_url || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, avatar_url: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-cyan-300 font-display flex items-center space-x-2">
                  <Phone size={16} />
                  <span>2. KỊCH BẢN THU THẬP SỐ ĐIỆN THOẠI & LIÊN HỆ</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Lời chào mặc định khi mở khung chat:</label>
                    <textarea
                      rows={2}
                      value={settingsForm.greeting || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, greeting: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-cyan-400 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Cấu hình lời mời để lại số điện thoại (Khi khách hỏi SĐT chủ nhân):</label>
                    <textarea
                      rows={2}
                      value={settingsForm.phone_invitation_prompt || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, phone_invitation_prompt: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-cyan-400 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div>
                      <label className="block text-slate-400 mb-1">Email nhận thông báo Lead mới:</label>
                      <input
                        type="email"
                        value={settingsForm.lead_notification_email || ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, lead_notification_email: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Số hotline chủ nhân:</label>
                      <input
                        type="text"
                        value={settingsForm.hotline || ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, hotline: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Bật/tắt công khai số hotline:</label>
                      <select
                        value={settingsForm.show_hotline || '1'}
                        onChange={(e) => setSettingsForm({ ...settingsForm, show_hotline: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-cyan-400"
                      >
                        <option value="1">🟢 Công khai số hotline</option>
                        <option value="0">🔒 Ẩn số hotline (Ưu tiên xin SĐT khách)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="submit"
                  className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg hover:shadow-cyan-500/20"
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
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl h-[75vh] bg-[#0c152e] border border-cyan-500/40 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <MessageSquare size={16} className="text-cyan-400" />
                <h3 className="font-bold text-sm text-slate-100">
                  Lịch sử hội thoại: {selectedLeadConv.customer_name} ({selectedLeadConv.phone})
                </h3>
              </div>
              <button
                onClick={() => setSelectedLeadConv(null)}
                className="text-slate-400 hover:text-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {loadingConv ? (
                <div className="flex justify-center items-center h-32 text-slate-400 text-xs">
                  Đang tải lịch sử hội thoại...
                </div>
              ) : convMessages.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
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
                    <span className="text-[10px] text-slate-500 mb-0.5">
                      {m.senderType === 'user' ? selectedLeadConv.customer_name : 'TRÍ AI Sales Robot'}
                    </span>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                        m.senderType === 'user'
                          ? 'bg-cyan-600 text-white rounded-tr-none'
                          : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 bg-slate-900 border-t border-slate-800 text-right">
              <button
                onClick={() => setSelectedLeadConv(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200"
              >
                Đóng cửa sổ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add Product Form */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-[#0c152e] border border-cyan-500/40 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 border-b border-slate-800">
              <h3 className="font-bold text-sm text-slate-100 flex items-center space-x-2">
                <Plus size={16} className="text-cyan-400" />
                <span>Thêm sản phẩm mới vào Product Center</span>
              </h3>
              <button onClick={() => setShowAddProductModal(false)} className="text-slate-400 hover:text-slate-100">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="p-5 space-y-3.5 text-xs overflow-y-auto max-h-[70vh]">
              <div>
                <label className="block text-slate-400 mb-1">1. Lĩnh vực (*):</label>
                <input
                  type="text"
                  required
                  value={newProd.field}
                  onChange={(e) => setNewProd({ ...newProd, field: e.target.value })}
                  placeholder="Ví dụ: Trà Thượng Hạng Đôi Dép, Bất Động Sản..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">2. Nhóm sản phẩm (*):</label>
                <input
                  type="text"
                  required
                  value={newProd.group_name}
                  onChange={(e) => setNewProd({ ...newProd, group_name: e.target.value })}
                  placeholder="Ví dụ: Trà Oolong, Hoàng trà, Biệt thự nghỉ dưỡng..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">3. Tên sản phẩm (*):</label>
                <input
                  type="text"
                  required
                  value={newProd.name}
                  onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                  placeholder="Ví dụ: 🍵 Trà Oolong Bích Thủy Hoàn Nguyên"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Giá bán phê duyệt (VNĐ) (*):</label>
                <input
                  type="number"
                  required
                  value={newProd.price}
                  onChange={(e) => setNewProd({ ...newProd, price: e.target.value })}
                  placeholder="Ví dụ: 2699000"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Link hình ảnh:</label>
                <input
                  type="url"
                  value={newProd.image_url}
                  onChange={(e) => setNewProd({ ...newProd, image_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Mô tả sản phẩm:</label>
                <textarea
                  rows={2}
                  value={newProd.description}
                  onChange={(e) => setNewProd({ ...newProd, description: e.target.value })}
                  placeholder="Mô tả hương vị, tính năng, cảm xúc..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-cyan-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Thông số kỹ thuật / Đặc tính (JSON hoặc text):</label>
                <input
                  type="text"
                  value={newProd.specs}
                  onChange={(e) => setNewProd({ ...newProd, specs: e.target.value })}
                  placeholder='{"Xuất xứ": "Lâm Đồng", "Quy cách": "Hộp 250g"}'
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-cyan-400 font-mono text-[11px]"
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
                <label htmlFor="approveCheckbox" className="text-slate-300">
                  Phê duyệt giá bán ngay lập tức cho sản phẩm này
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold"
                >
                  Lưu & Đăng bán
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerDashboard;
