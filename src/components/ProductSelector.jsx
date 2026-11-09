import React, { useState, useMemo } from 'react';
import {
  Layers,
  Search,
  CheckCircle,
  HelpCircle,
  DollarSign,
  Scale,
  FileSpreadsheet,
  ShoppingCart,
  PhoneCall,
  Sparkles,
  Info,
  ChevronRight,
  ShieldCheck,
  Tag
} from 'lucide-react';

export const ProductSelector = ({
  hierarchy = [],
  products = [],
  selectedProduct = null,
  onSelectProductAction,
  isLoading = false
}) => {
  const [selectedField, setSelectedField] = useState('all');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCardId, setExpandedCardId] = useState(null);

  // Available unique fields
  const fields = useMemo(() => {
    const list = Array.from(new Set(products.map(p => p.field)));
    return list;
  }, [products]);

  // Available groups based on chosen field
  const groups = useMemo(() => {
    if (selectedField === 'all') {
      return Array.from(new Set(products.map(p => p.group_name)));
    }
    return Array.from(new Set(products.filter(p => p.field === selectedField).map(p => p.group_name)));
  }, [products, selectedField]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchField = selectedField === 'all' || p.field === selectedField;
      const matchGroup = selectedGroup === 'all' || p.group_name === selectedGroup;
      const matchSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchField && matchGroup && matchSearch;
    });
  }, [products, selectedField, selectedGroup, searchQuery]);

  // The 6 Customer Action Requirements from Prompt 08
  const actionOptions = [
    {
      key: 'Tìm hiểu sản phẩm',
      label: 'Tìm hiểu sản phẩm',
      icon: <HelpCircle size={14} />,
      color: 'hover:bg-cyan-900/40 hover:text-cyan-300 border-cyan-700/40 text-cyan-200 bg-cyan-950/30'
    },
    {
      key: 'Hỏi giá',
      label: 'Hỏi giá & Ưu đãi',
      icon: <DollarSign size={14} />,
      color: 'hover:bg-emerald-900/40 hover:text-emerald-300 border-emerald-700/40 text-emerald-200 bg-emerald-950/30'
    },
    {
      key: 'So sánh',
      label: 'So sánh đặc tính',
      icon: <Scale size={14} />,
      color: 'hover:bg-indigo-900/40 hover:text-indigo-300 border-indigo-700/40 text-indigo-200 bg-indigo-950/30'
    },
    {
      key: 'Yêu cầu báo giá',
      label: 'Yêu cầu báo giá',
      icon: <FileSpreadsheet size={14} />,
      color: 'hover:bg-amber-900/40 hover:text-amber-300 border-amber-700/40 text-amber-200 bg-amber-950/30'
    },
    {
      key: 'Đặt mua',
      label: 'Đặt mua ngay',
      icon: <ShoppingCart size={14} />,
      color: 'hover:bg-rose-900/40 hover:text-rose-300 border-rose-700/40 text-rose-200 bg-rose-950/30'
    },
    {
      key: 'Yêu cầu chủ nhân liên hệ',
      label: 'Chủ nhân liên hệ',
      icon: <PhoneCall size={14} />,
      color: 'hover:bg-purple-900/40 hover:text-purple-300 border-purple-700/40 text-purple-200 bg-purple-950/30'
    }
  ];

  return (
    <div className="flex flex-col h-full bg-[#091024]/90 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md">
      {/* Header & Hierarchy Tier 1: LĨNH VỰC */}
      <div className="p-4 bg-slate-900/90 border-b border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-slate-950 shadow-md">
              <Layers size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 font-display flex items-center space-x-2">
                <span>CỘT 2: PRODUCT SELECTOR</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-sans">
                  Giá đã duyệt
                </span>
              </h2>
              <p className="text-xs text-slate-400">Chọn sản phẩm & nhu cầu để AI Sales Engine tư vấn ngay</p>
            </div>
          </div>

          {/* Search box */}
          <div className="relative w-44 md:w-56">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm sản phẩm..."
              className="w-full bg-slate-800/80 border border-slate-700 text-xs text-slate-200 pl-8 pr-3 py-1.5 rounded-xl outline-none focus:border-cyan-400 transition-all"
            />
          </div>
        </div>

        {/* 1. LĨNH VỰC TABS */}
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => { setSelectedField('all'); setSelectedGroup('all'); }}
            className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap flex-shrink-0 ${
              selectedField === 'all'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold shadow-lg shadow-cyan-500/20'
                : 'bg-slate-800/70 text-slate-300 hover:bg-slate-700/70 border border-slate-700/60'
            }`}
          >
            Tất cả lĩnh vực ({products.length})
          </button>
          {fields.map((fld) => (
            <button
              key={fld}
              onClick={() => { setSelectedField(fld); setSelectedGroup('all'); }}
              className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                selectedField === fld
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold shadow-lg shadow-cyan-500/20'
                  : 'bg-slate-800/70 text-slate-300 hover:bg-slate-700/70 border border-slate-700/60'
              }`}
            >
              {fld}
            </button>
          ))}
        </div>

        {/* 2. NHÓM SẢN PHẨM PILLS */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar mt-2.5 pt-2 border-t border-slate-800/60 text-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase flex-shrink-0 mr-1">Nhóm SP:</span>
          <button
            onClick={() => setSelectedGroup('all')}
            className={`px-2.5 py-0.5 rounded-lg text-[11px] transition-all whitespace-nowrap ${
              selectedGroup === 'all'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                : 'bg-slate-800/40 text-slate-400 hover:text-slate-200'
            }`}
          >
            Tất cả nhóm
          </button>
          {groups.map((grp) => (
            <button
              key={grp}
              onClick={() => setSelectedGroup(grp)}
              className={`px-2.5 py-0.5 rounded-lg text-[11px] transition-all whitespace-nowrap ${
                selectedGroup === grp
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                  : 'bg-slate-800/40 text-slate-400 hover:text-slate-200'
              }`}
            >
              {grp}
            </button>
          ))}
        </div>
      </div>

      {/* 3. SẢN PHẨM CỤ THỂ (GRID VIEW) */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400">
            <Tag size={28} className="text-slate-600 mb-2" />
            <p className="text-sm">Không tìm thấy sản phẩm phù hợp.</p>
            <p className="text-xs text-slate-500 mt-1">Hãy thử chọn lại Lĩnh vực hoặc từ khóa tìm kiếm.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredProducts.map((prod) => {
              const isSelected = selectedProduct?.id === prod.id;
              const isExpanded = expandedCardId === prod.id;

              // Parse specs
              let specsObj = {};
              try {
                if (prod.specs_json) specsObj = JSON.parse(prod.specs_json);
              } catch (e) {
                specsObj = {};
              }

              return (
                <div
                  key={prod.id}
                  className={`group rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden relative shadow-lg ${
                    isSelected
                      ? 'bg-[#0f1d38] border-cyan-400 shadow-cyan-500/20 ring-1 ring-cyan-400'
                      : 'bg-slate-900/70 border-slate-800/90 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  {/* Selected Indicator Badge */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 z-10 flex items-center space-x-1 px-2 py-0.5 rounded-full bg-cyan-500 text-slate-950 font-bold text-[10px] shadow">
                      <CheckCircle size={11} />
                      <span>Đang chọn tư vấn</span>
                    </div>
                  )}

                  {/* Card Content Top */}
                  <div>
                    {/* Image & Main Info Header */}
                    <div className="flex p-3 space-x-3">
                      <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-950 flex-shrink-0 relative border border-slate-800">
                        <img
                          src={prod.image_url}
                          alt={prod.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          loading="lazy"
                        />
                        <div className="absolute bottom-0 inset-x-0 bg-slate-950/80 backdrop-blur-xs text-[9px] text-center font-mono py-0.5 text-slate-400">
                          {prod.sku || 'SKU-OK'}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-1.5 text-[10px] text-cyan-400/90 font-medium mb-1">
                          <span className="truncate">{prod.field}</span>
                          <span>•</span>
                          <span className="truncate text-slate-400">{prod.group_name}</span>
                        </div>

                        <h3 className="font-bold text-slate-100 text-sm leading-snug line-clamp-2 group-hover:text-cyan-300 transition-colors">
                          {prod.name}
                        </h3>

                        {/* Approved Price Tag */}
                        <div className="mt-2 flex items-center space-x-2">
                          <span className="text-base font-extrabold text-amber-400 font-display">
                            {prod.price_formatted || prod.price?.toLocaleString('vi-VN') + ' ₫'}
                          </span>
                          <span className="flex items-center space-x-0.5 text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/50">
                            <ShieldCheck size={10} />
                            <span>Giá duyệt</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Description & Key Specs */}
                    <div className="px-3 pb-2 text-xs text-slate-400">
                      <p className="line-clamp-2 leading-relaxed">{prod.description}</p>

                      {/* Specs badges */}
                      {Object.keys(specsObj).length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-800/60 flex flex-wrap gap-1.5">
                          {Object.entries(specsObj).slice(0, isExpanded ? 8 : 2).map(([k, v]) => (
                            <span
                              key={k}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/60"
                            >
                              <strong className="text-slate-400">{k}:</strong> {v}
                            </span>
                          ))}
                          {Object.keys(specsObj).length > 2 && (
                            <button
                              onClick={() => setExpandedCardId(isExpanded ? null : prod.id)}
                              className="text-[10px] text-cyan-400 hover:underline ml-1"
                            >
                              {isExpanded ? 'Thu gọn' : `+${Object.keys(specsObj).length - 2} thông số`}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 4. NHU CẦU MUA HÀNG (6 ACTION BUTTONS) */}
                  <div className="p-3 bg-slate-950/70 border-t border-slate-800/90 mt-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                      <span>4. Chọn nhu cầu mua hàng:</span>
                      <span className="text-cyan-400 text-[9px]">Gửi thẳng vào phiên chat AI</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                      {actionOptions.map((act) => (
                        <button
                          key={act.key}
                          onClick={() => onSelectProductAction(prod, act.key)}
                          className={`flex items-center justify-center space-x-1.5 px-2 py-1.5 rounded-lg border text-xs font-medium transition-all shadow-sm active:scale-95 ${act.color}`}
                          title={`Gửi yêu cầu "${act.label}" cho sản phẩm ${prod.name}`}
                        >
                          {act.icon}
                          <span className="truncate">{act.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center space-x-1.5">
          <Sparkles size={13} className="text-cyan-400" />
          <span>Sản phẩm được đồng bộ thời gian thực từ <strong>Product Center</strong></span>
        </span>
        <span className="text-slate-500 font-mono">Total: {filteredProducts.length} items</span>
      </div>
    </div>
  );
};

export default ProductSelector;
