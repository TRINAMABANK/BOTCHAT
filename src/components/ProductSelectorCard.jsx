import React, { useState } from 'react';
import {
  CircleDollarSign,
  Printer,
  Laptop,
  Wrench,
  Package,
  Info,
  Tag,
  Scale,
  ShoppingCart,
  MessageSquare,
  Eye,
  ChevronRight,
  Flame,
  Star,
  Crown,
  Layers
} from 'lucide-react';

export const ProductSelectorCard = ({
  products = [],
  selectedProduct = null,
  onSelectProduct,
  onTriggerAction,
  onViewProductDetail
}) => {
  const [activeCategory, setActiveCategory] = useState('Máy đếm tiền');

  // Categories corresponding directly to the mockup
  const categories = [
    { id: 'Máy đếm tiền', name: 'Máy đếm tiền', icon: <CircleDollarSign size={20} /> },
    { id: 'Thiết bị văn phòng', name: 'Thiết bị văn phòng', icon: <Printer size={20} /> },
    { id: 'Thiết bị công nghệ', name: 'Thiết bị công nghệ', icon: <Laptop size={20} /> },
    { id: 'Dịch vụ bảo trì', name: 'Dịch vụ bảo trì', icon: <Wrench size={20} /> },
    { id: 'Sản phẩm khác', name: 'Sản phẩm khác', icon: <Package size={20} /> }
  ];

  // Filter products by selected category
  const currentCategoryProducts = products.filter(p => p.field === activeCategory);

  // If no products found for category, fallback to all or general
  const displayProducts = currentCategoryProducts.length > 0 ? currentCategoryProducts : products.slice(0, 3);

  // Badges matching mockup: 1: Bán chạy (flame orange), 2: Đề xuất (gold star), 3: Cao cấp (crown)
  const getBadge = (index) => {
    if (index === 0) return { text: 'Bán chạy', icon: <Flame size={12} className="text-amber-400" />, style: 'bg-gradient-to-r from-amber-500/30 to-red-500/30 text-amber-300 border-amber-500/40' };
    if (index === 1) return { text: 'Đề xuất', icon: <Star size={12} className="text-yellow-400" />, style: 'bg-gradient-to-r from-yellow-500/30 to-amber-500/30 text-yellow-300 border-yellow-500/40' };
    return { text: 'Cao cấp', icon: <Crown size={12} className="text-amber-300" />, style: 'bg-gradient-to-r from-purple-500/30 to-amber-500/30 text-amber-200 border-amber-400/40' };
  };

  return (
    <div className="relative rounded-[26px] bg-[#050C1F]/90 border border-cyan-500/40 shadow-[0_0_35px_rgba(0,180,255,0.18)] p-3.5 md:p-4.5 flex flex-col justify-between h-full min-h-[480px] backdrop-blur-xl">
      {/* Background ambient glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

      {/* 1. SECTION 1: CHỌN LĨNH VỰC / SẢN PHẨM */}
      <div className="relative z-10 mb-3">
        <h3 className="text-sm font-bold text-slate-100 font-display flex items-center space-x-2 mb-2.5">
          <Layers size={16} className="text-cyan-400" />
          <span>Chọn lĩnh vực / sản phẩm</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex flex-col items-center justify-center p-2 rounded-2xl border transition-all text-center group ${
                  isActive
                    ? 'bg-gradient-to-b from-cyan-950/90 to-[#0A1A3A] border-cyan-400 shadow-[0_0_18px_rgba(0,240,255,0.4)] scale-[1.02]'
                    : 'bg-[#091530]/80 border-slate-700/60 hover:border-cyan-500/40 hover:bg-[#0c1c40]'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center mb-1.5 transition-colors ${
                    isActive
                      ? 'text-cyan-300 bg-cyan-500/20 shadow-inner'
                      : 'text-slate-400 group-hover:text-cyan-400 bg-slate-800/60'
                  }`}
                >
                  {cat.icon}
                </div>
                <span
                  className={`text-[11px] font-medium leading-tight ${
                    isActive ? 'text-white font-bold' : 'text-slate-300 group-hover:text-slate-100'
                  }`}
                >
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. SECTION 2: SẢN PHẨM NỔI BẬT: MÁY ĐẾM TIỀN */}
      <div className="relative z-10 my-1">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-slate-100 font-display flex items-center space-x-1.5">
            <span className="text-amber-400 text-sm">⭐</span>
            <span>Sản phẩm nổi bật: {activeCategory}</span>
          </h3>
          <button
            onClick={() => {}}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center space-x-0.5 group"
          >
            <span>Xem tất cả</span>
            <span className="text-cyan-400 font-bold group-hover:translate-x-0.5 transition-transform">&gt;&gt;</span>
          </button>
        </div>

        {/* 3 Featured Product Cards Grid with Sub-Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {displayProducts.slice(0, 3).map((prod, idx) => {
            const isSelected = selectedProduct?.id === prod.id;
            const badge = getBadge(idx);
            const priceNumberStr = (prod.price || 0).toLocaleString('vi-VN');

            return (
              <div
                key={prod.id}
                onClick={() => onSelectProduct(prod)}
                className={`relative rounded-2xl p-2.5 sm:p-3 border cursor-pointer transition-all flex flex-col justify-between group overflow-hidden ${
                  isSelected
                    ? 'bg-gradient-to-b from-[#0e214d] to-[#071330] border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.45)] ring-1 ring-cyan-400 scale-[1.02]'
                    : 'bg-[#081533]/85 border-slate-700/70 hover:border-cyan-500/50 hover:bg-[#0c1f4d]'
                }`}
              >
                {/* Product Machine Image */}
                <div className="w-full h-24 rounded-xl bg-slate-950/60 border border-slate-800/80 overflow-hidden flex items-center justify-center p-1.5 mb-2 relative">
                  <img
                    src={prod.image_url}
                    alt={prod.name}
                    className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-md rounded-lg"
                  />
                </div>

                {/* Badge Tag */}
                <div className="flex justify-center mb-1">
                  <span
                    className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.style}`}
                  >
                    {badge.icon}
                    <span>{badge.text}</span>
                  </span>
                </div>

                {/* Title & Subtitle */}
                <div className="text-center">
                  <h4 className="font-bold text-slate-100 text-xs sm:text-sm group-hover:text-cyan-300 transition-colors line-clamp-1">
                    {prod.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                    {prod.description}
                  </p>
                </div>

                {/* Approved Price Tag in bright pinkish-red with underlined đ */}
                <div className="text-center mt-1.5 pt-1.5 border-t border-slate-800/80">
                  <span className="text-sm sm:text-base font-extrabold text-[#ff3864] font-display tracking-tight">
                    {priceNumberStr} <span className="underline decoration-1">đ</span>
                  </span>
                </div>

                {/* 2 SUB-BUTTONS INSIDE PRODUCT CARD MATCHING MOCKUP */}
                <div className="grid grid-cols-2 gap-1.5 mt-2 pt-1 border-t border-slate-800/60">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectProduct(prod);
                      onTriggerAction('Tìm hiểu sản phẩm');
                    }}
                    className="flex items-center justify-center space-x-1 py-1 px-1.5 rounded-lg bg-[#071836] hover:bg-cyan-950/80 border border-cyan-500/30 hover:border-cyan-400 text-cyan-200 text-[10px] font-medium transition-all"
                    title="Yêu cầu AI tư vấn sản phẩm này"
                  >
                    <MessageSquare size={11} className="text-cyan-400" />
                    <span>Tư vấn</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectProduct(prod);
                      if (onViewProductDetail) onViewProductDetail(prod);
                    }}
                    className="flex items-center justify-center space-x-1 py-1 px-1.5 rounded-lg bg-[#071836] hover:bg-blue-950/80 border border-slate-700 hover:border-cyan-400 text-slate-200 text-[10px] font-medium transition-all"
                    title="Xem chi tiết thông số kỹ thuật"
                  >
                    <Eye size={11} className="text-cyan-400" />
                    <span>Xem chi tiết</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. SECTION 3: 4 ACTION BUTTONS ROW */}
      <div className="relative z-10 mt-2.5 pt-2 border-t border-cyan-500/20">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Action 1 */}
          <button
            onClick={() => onTriggerAction('Tìm hiểu sản phẩm')}
            className="flex flex-col items-center justify-center py-2.5 px-1 rounded-xl bg-[#091530] hover:bg-cyan-950/70 border border-slate-700/80 hover:border-cyan-500/50 text-slate-200 hover:text-cyan-300 transition-all text-center group"
          >
            <Info size={17} className="mb-1 text-slate-400 group-hover:text-cyan-300 transition-colors" />
            <span className="text-[11px] font-medium leading-tight">Tìm hiểu sản phẩm</span>
          </button>

          {/* Action 2 */}
          <button
            onClick={() => onTriggerAction('Hỏi giá chi tiết')}
            className="flex flex-col items-center justify-center py-2.5 px-1 rounded-xl bg-[#091530] hover:bg-cyan-950/70 border border-slate-700/80 hover:border-cyan-500/50 text-slate-200 hover:text-cyan-300 transition-all text-center group"
          >
            <Tag size={17} className="mb-1 text-slate-400 group-hover:text-cyan-300 transition-colors" />
            <span className="text-[11px] font-medium leading-tight">Hỏi giá chi tiết</span>
          </button>

          {/* Action 3 */}
          <button
            onClick={() => onTriggerAction('So sánh các mẫu')}
            className="flex flex-col items-center justify-center py-2.5 px-1 rounded-xl bg-[#091530] hover:bg-cyan-950/70 border border-slate-700/80 hover:border-cyan-500/50 text-slate-200 hover:text-cyan-300 transition-all text-center group"
          >
            <Scale size={17} className="mb-1 text-slate-400 group-hover:text-cyan-300 transition-colors" />
            <span className="text-[11px] font-medium leading-tight">So sánh các mẫu</span>
          </button>

          {/* Action 4 */}
          <button
            onClick={() => onTriggerAction('Đặt mua ngay')}
            className="flex flex-col items-center justify-center py-2.5 px-1 rounded-xl bg-[#091530] hover:bg-rose-950/70 border border-slate-700/80 hover:border-rose-500/50 text-slate-200 hover:text-rose-300 transition-all text-center group"
          >
            <ShoppingCart size={17} className="mb-1 text-slate-400 group-hover:text-rose-400 transition-colors" />
            <span className="text-[11px] font-medium leading-tight">Đặt mua ngay</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductSelectorCard;