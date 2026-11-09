import React from 'react';
import { ShoppingBag, X, ChevronUp } from 'lucide-react';
import ProductSelector from './ProductSelector';

export const MobileDrawer = ({
  isOpen = false,
  onClose,
  onOpen,
  hierarchy = [],
  products = [],
  selectedProduct = null,
  onSelectProductAction,
  isLoading = false
}) => {
  return (
    <>
      {/* Floating Bottom Action Pill (Visible on Mobile only when drawer is closed) */}
      {!isOpen && (
        <div className="lg:hidden fixed bottom-4 inset-x-4 z-40 flex justify-center animate-bounce">
          <button
            onClick={onOpen}
            className="flex items-center space-x-2 px-5 py-3 rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 text-white font-bold text-sm shadow-2xl shadow-pink-500/40 border border-pink-300"
          >
            <ShoppingBag size={18} />
            <span>📦 Chọn Hàng Hóa (Cột 2)</span>
            <ChevronUp size={16} />
          </button>
        </div>
      )}

      {/* Slide-up Bottom Panel on Mobile */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="w-full h-[88vh] bg-white border-t-2 border-pink-400 rounded-t-3xl shadow-2xl flex flex-col overflow-hidden text-slate-800 animate-slide-up">
            {/* Drawer Drag Bar & Close */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-pink-50 border-b border-pink-100">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-pink-500 animate-ping"></span>
                <span className="font-bold text-sm text-slate-900 font-display">
                  CỘT 2: PRODUCT SELECTOR (MOBILE PANEL)
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl bg-pink-100 hover:bg-pink-200 text-slate-600 hover:text-slate-900"
              >
                <X size={18} />
              </button>
            </div>

            {/* Inner Product Selector */}
            <div className="flex-1 overflow-hidden p-2">
              <ProductSelector
                hierarchy={hierarchy}
                products={products}
                selectedProduct={selectedProduct}
                onSelectProductAction={(prod, act) => {
                  onSelectProductAction(prod, act);
                  onClose();
                }}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileDrawer;