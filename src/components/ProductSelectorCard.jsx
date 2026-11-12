import React, { useState, useRef, useEffect } from 'react';
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
  ChevronLeft,
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
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [allFilterField, setAllFilterField] = useState('Tất cả');

  const carouselRef = useRef(null);
  const cardRefs = useRef({});
  const dragState = useRef({ isDown: false, startX: 0, scrollLeft: 0, moved: false });
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const categories = [
    { id: 'Máy đếm tiền', name: 'Máy đếm tiền', icon: <CircleDollarSign size={20} /> },
    { id: 'Thiết bị văn phòng', name: 'Thiết bị văn phòng', icon: <Printer size={20} /> },
    { id: 'Thiết bị công nghệ', name: 'Thiết bị công nghệ', icon: <Laptop size={20} /> },
    { id: 'Dịch vụ bảo trì', name: 'Dịch vụ bảo trì', icon: <Wrench size={20} /> },
    { id: 'Sản phẩm khác', name: 'Sản phẩm khác', icon: <Package size={20} /> }
  ];

  const allDynamicFields = ['Tất cả', ...Array.from(new Set(products.map(p => p.field)))];

  // Prioritize active category products; in "Xem tất cả" show filtered or entire catalog in horizontal carousel
  const categoryProducts = products.filter(p => p.field === activeCategory);
  const displayProducts = showAllProducts
    ? (allFilterField === 'Tất cả' ? products : products.filter(p => p.field === allFilterField))
    : (categoryProducts.length > 0 ? categoryProducts : products);

  const updateScrollButtons = () => {
    const el = carouselRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    const timer = setTimeout(updateScrollButtons, 60);
    window.addEventListener('resize', updateScrollButtons);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [displayProducts.length, activeCategory, showAllProducts, allFilterField]);

  // Auto-sync category & scroll selected card into view when AI picks a product
  useEffect(() => {
    if (!selectedProduct) return;
    const isInMainCategories = categories.some(c => c.id === selectedProduct.field);
    if (!showAllProducts && selectedProduct.field && selectedProduct.field !== activeCategory) {
      if (isInMainCategories) {
        setActiveCategory(selectedProduct.field);
      } else {
        setShowAllProducts(true);
        setAllFilterField(selectedProduct.field);
      }
    }
    const cardEl = cardRefs.current[selectedProduct.id];
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [selectedProduct?.id]);

  const scrollCarousel = (direction) => {
    const el = carouselRef.current;
    if (!el) return;
    const step = 220;
    el.scrollBy({ left: direction === 'left' ? -step : step, behavior: 'smooth' });
  };

  // Mouse click-and-drag swipe support (left <-> right)
  const handleMouseDown = (e) => {
    const el = carouselRef.current;
    if (!el) return;
    dragState.current = {
      isDown: true,
      startX: e.pageX - el.offsetLeft,
      scrollLeft: el.scrollLeft,
      moved: false
    };
  };

  const handleMouseMove = (e) => {
    if (!dragState.current.isDown) return;
    const el = carouselRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = x - dragState.current.startX;
    if (Math.abs(walk) > 6) {
      dragState.current.moved = true;
    }
    el.scrollLeft = dragState.current.scrollLeft - walk;
  };

  const handleMouseUpOrLeave = () => {
    dragState.current.isDown = false;
  };

  const handleWheelScroll = (e) => {
    const el = carouselRef.current;
    if (!el) return;
    if (el.scrollWidth > el.clientWidth && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    }
  };

  const getBadge = (index) => {
    if (index % 3 === 0) return { text: 'Bán chạy', icon: <Flame size={12} className="text-amber-400" />, style: 'bg-gradient-to-r from-amber-500/30 to-red-500/30 text-amber-300 border-amber-500/40' };
    if (index % 3 === 1) return { text: 'Đề xuất', icon: <Star size={12} className="text-yellow-400" />, style: 'bg-gradient-to-r from-yellow-500/30 to-amber-500/30 text-yellow-300 border-yellow-500/40' };
    return { text: 'Cao cấp', icon: <Crown size={12} className="text-amber-300" />, style: 'bg-gradient-to-r from-purple-500/30 to-amber-500/30 text-amber-200 border-amber-400/40' };
  };

  return (
    <div className="relative rounded-[26px] bg-[#050C1F]/90 border border-cyan-500/40 shadow-[0_0_35px_rgba(0,180,255,0.18)] p-3.5 md:p-4.5 flex flex-col justify-between h-full min-h-[480px] backdrop-blur-xl">
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

      {/* 1. SECTION 1: CHỌN LĨNH VỰC / SẢN PHẨM */}
      <div className="relative z-10 mb-2.5">
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
                onClick={() => {
                  setActiveCategory(cat.id);
                  setShowAllProducts(false);
                  if (carouselRef.current) carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
                }}
                className={`flex flex-col items-center justify-center p-2 rounded-2xl border transition-all text-center group ${
                  !showAllProducts && isActive
                    ? 'bg-gradient-to-b from-cyan-950/90 to-[#0A1A3A] border-cyan-400 shadow-[0_0_18px_rgba(0,240,255,0.4)] scale-[1.02]'
                    : 'bg-[#091530]/80 border-slate-700/60 hover:border-cyan-500/40 hover:bg-[#0c1c40]'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center mb-1.5 transition-colors ${
                    !showAllProducts && isActive
                      ? 'text-cyan-300 bg-cyan-500/20 shadow-inner'
                      : 'text-slate-400 group-hover:text-cyan-400 bg-slate-800/60'
                  }`}
                >
                  {cat.icon}
                </div>
                <span
                  className={`text-[11px] font-medium leading-tight ${
                    !showAllProducts && isActive ? 'text-white font-bold' : 'text-slate-300 group-hover:text-slate-100'
                  }`}
                >
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. SECTION 2: HORIZONTAL SWIPEABLE PRODUCT CAROUSEL */}
      <div className="relative z-10 my-1">
        <div className="flex items-center justify-between mb-2 gap-2">
          <h3 className="text-sm font-bold text-slate-100 font-display flex items-center space-x-1.5 truncate">
            <span className="text-amber-400 text-sm">⭐</span>
            <span className="truncate">
              {showAllProducts ? `Tất cả danh mục (${displayProducts.length} SP)` : `Sản phẩm nổi bật: ${activeCategory}`}
            </span>
          </h3>

          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Compact Left / Right Carousel Arrows */}
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => scrollCarousel('left')}
                disabled={!canScrollLeft}
                className="w-7 h-7 rounded-full bg-[#091a3d] hover:bg-cyan-500 hover:text-slate-950 border border-cyan-500/40 text-cyan-300 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                title="Lướt sang trái"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                type="button"
                onClick={() => scrollCarousel('right')}
                disabled={!canScrollRight}
                className="w-7 h-7 rounded-full bg-[#091a3d] hover:bg-cyan-500 hover:text-slate-950 border border-cyan-500/40 text-cyan-300 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                title="Lướt sang phải"
              >
                <ChevronRight size={15} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowAllProducts((v) => !v);
                if (carouselRef.current) carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
              }}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center space-x-0.5 group whitespace-nowrap"
            >
              <span>{showAllProducts ? 'Thu gọn' : 'Xem tất cả'}</span>
              <span className="text-cyan-400 font-bold group-hover:translate-x-0.5 transition-transform">&gt;&gt;</span>
            </button>
          </div>
        </div>

        {/* Dynamic Field Filter Bar when viewing all products */}
        {showAllProducts && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2 mb-1">
            {allDynamicFields.map((fld) => (
              <button
                key={fld}
                type="button"
                onClick={() => {
                  setAllFilterField(fld);
                  if (carouselRef.current) carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
                }}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap border transition-all ${
                  allFilterField === fld
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                    : 'bg-[#091530] text-slate-300 border-slate-700 hover:border-cyan-500/40'
                }`}
              >
                {fld}
              </button>
            ))}
          </div>
        )}

        {/* Horizontal Swipe / Drag Carousel Container */}
        <div className="relative group/carousel">
          {/* Floating Left Overlay Button */}
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scrollCarousel('left')}
              className="hidden sm:flex absolute left-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-[#06142e]/90 hover:bg-cyan-400 hover:text-slate-950 text-cyan-300 border border-cyan-400/60 shadow-[0_0_15px_rgba(0,240,255,0.45)] items-center justify-center transition-all backdrop-blur-md"
              title="Lướt qua trái"
            >
              <ChevronLeft size={18} />
            </button>
          )}

          {/* Floating Right Overlay Button */}
          {canScrollRight && (
            <button
              type="button"
              onClick={() => scrollCarousel('right')}
              className="hidden sm:flex absolute right-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-[#06142e]/90 hover:bg-cyan-400 hover:text-slate-950 text-cyan-300 border border-cyan-400/60 shadow-[0_0_15px_rgba(0,240,255,0.45)] items-center justify-center transition-all backdrop-blur-md"
              title="Lướt qua phải"
            >
              <ChevronRight size={18} />
            </button>
          )}

          <div
            ref={carouselRef}
            onScroll={updateScrollButtons}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            onWheel={handleWheelScroll}
            className="flex gap-3 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory py-2 px-1 cursor-grab active:cursor-grabbing select-none"
          >
            {displayProducts.map((prod, idx) => {
              const isSelected = selectedProduct?.id === prod.id;
              const badge = getBadge(idx);
              const priceNumberStr = (prod.price || 0).toLocaleString('vi-VN');

              return (
                <div
                  key={prod.id}
                  ref={(el) => { cardRefs.current[prod.id] = el; }}
                  onClick={() => {
                    if (dragState.current.moved) return;
                    onSelectProduct(prod);
                  }}
                  className={`product-hover-card relative flex-shrink-0 w-[198px] sm:w-[205px] snap-start rounded-2xl p-2.5 sm:p-3 border cursor-pointer transition-all flex flex-col justify-between group overflow-hidden ${
                    isSelected
                      ? 'bg-gradient-to-b from-[#0e214d] to-[#071330] border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.45)] ring-1 ring-cyan-400'
                      : 'bg-[#081533]/85 border-slate-700/70 hover:border-transparent hover:bg-[#0c1f4d]'
                  }`}
                >
                  {/* Animated running hover border (Tím - Đỏ - Đen - Sáng trắng nhẹ) */}
                  <span aria-hidden="true" className="product-hover-ring" />
                  {/* Product Machine Image */}
                  <div className="w-full h-24 rounded-xl bg-slate-950/60 border border-slate-800/80 overflow-hidden flex items-center justify-center p-1.5 mb-2 relative">
                    <img
                      src={prod.image_url}
                      alt={prod.name}
                      draggable={false}
                      className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-md rounded-lg pointer-events-none"
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

                  {/* Approved Price Tag */}
                  <div className="text-center mt-1.5 pt-1.5 border-t border-slate-800/80">
                    <span className="text-sm sm:text-base font-extrabold text-[#ff3864] font-display tracking-tight">
                      {priceNumberStr} <span className="underline decoration-1">đ</span>
                    </span>
                  </div>

                  {/* 2 SUB-BUTTONS INSIDE PRODUCT CARD */}
                  <div className="grid grid-cols-2 gap-1.5 mt-2 pt-1 border-t border-slate-800/60">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProduct(prod);
                        onTriggerAction('Tìm hiểu sản phẩm', prod);
                      }}
                      className="flex items-center justify-center space-x-1 py-1.5 px-1.5 rounded-lg bg-[#071836] hover:bg-cyan-950/80 border border-cyan-500/30 hover:border-cyan-400 text-cyan-200 text-[10px] font-medium whitespace-nowrap transition-all"
                      title="Yêu cầu AI tư vấn sản phẩm này"
                    >
                      <MessageSquare size={11} className="text-cyan-400 flex-shrink-0" />
                      <span>Tư vấn</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProduct(prod);
                        if (onViewProductDetail) onViewProductDetail(prod);
                      }}
                      className="flex items-center justify-center space-x-1 py-1.5 px-1.5 rounded-lg bg-[#071836] hover:bg-blue-950/80 border border-slate-700 hover:border-cyan-400 text-slate-200 text-[10px] font-medium whitespace-nowrap transition-all"
                      title="Xem chi tiết thông số kỹ thuật"
                    >
                      <Eye size={11} className="text-cyan-400 flex-shrink-0" />
                      <span>Xem chi tiết</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. SECTION 3: 4 ACTION BUTTONS ROW */}
      <div className="relative z-10 mt-2.5 pt-2 border-t border-cyan-500/20">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => onTriggerAction('Tìm hiểu sản phẩm')}
            className="flex flex-col items-center justify-center py-2.5 px-1 rounded-xl bg-[#091530] hover:bg-cyan-950/70 border border-slate-700/80 hover:border-cyan-500/50 text-slate-200 hover:text-cyan-300 transition-all text-center group"
          >
            <Info size={17} className="mb-1 text-slate-400 group-hover:text-cyan-300 transition-colors" />
            <span className="text-[11px] font-medium leading-tight">Tìm hiểu sản phẩm</span>
          </button>

          <button
            onClick={() => onTriggerAction('Hỏi giá chi tiết')}
            className="flex flex-col items-center justify-center py-2.5 px-1 rounded-xl bg-[#091530] hover:bg-cyan-950/70 border border-slate-700/80 hover:border-cyan-500/50 text-slate-200 hover:text-cyan-300 transition-all text-center group"
          >
            <Tag size={17} className="mb-1 text-slate-400 group-hover:text-cyan-300 transition-colors" />
            <span className="text-[11px] font-medium leading-tight">Hỏi giá chi tiết</span>
          </button>

          <button
            onClick={() => onTriggerAction('So sánh các mẫu')}
            className="flex flex-col items-center justify-center py-2.5 px-1 rounded-xl bg-[#091530] hover:bg-cyan-950/70 border border-slate-700/80 hover:border-cyan-500/50 text-slate-200 hover:text-cyan-300 transition-all text-center group"
          >
            <Scale size={17} className="mb-1 text-slate-400 group-hover:text-cyan-300 transition-colors" />
            <span className="text-[11px] font-medium leading-tight">So sánh các mẫu</span>
          </button>

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
