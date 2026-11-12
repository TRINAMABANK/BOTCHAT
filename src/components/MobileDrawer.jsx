import React from 'react';
import { ShoppingBag, X, ChevronUp } from 'lucide-react';
import ProductSelectorCard from './ProductSelectorCard';

export const MobileDrawer = ({
  isOpen = false,
  isCatalogRevealed = false,
  onClose,
  onOpen,
  products = [],
  selectedProduct = null,
  externalField = null,
  externalFieldTick = 0,
  onSelectProduct,
  onTriggerAction,
  onViewProductDetail
}) => {
  return (
    <>
      {/* Floating Bottom Action Pill (Visible on Mobile once catalog is revealed by chat/field choice) */}
      {!isOpen && isCatalogRevealed && (
        <div className="lg:hidden fixed bottom-4 inset-x-4 z-40 flex justify-center">
          <button
            onClick={onOpen}
            className="flex items-center space-x-2 px-5 py-3 rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 text-slate-950 font-bold text-sm shadow-[0_0_24px_rgba(0,240,255,0.5)] border border-cyan-300 active:scale-95 transition-all"
          >
            <ShoppingBag size={18} />
            <span>Chọn Sản Phẩm & Tư Vấn</span>
            <ChevronUp size={16} />
          </button>
        </div>
      )}

      {/* Slide-up Bottom Panel on Mobile (Luxury Tech 3D) */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="w-full max-h-[88vh] bg-[#061128] border-t-2 border-cyan-500/60 rounded-t-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100 animate-slide-up">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#091a3d] border-b border-cyan-500/30">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="font-bold text-sm text-white font-display">
                  CHỌN SẢN PHẨM & NHU CẦU
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            {/* Inner Horizontal Swipe ProductSelectorCard */}
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
              <ProductSelectorCard
                products={products}
                selectedProduct={selectedProduct}
                externalField={externalField}
                externalFieldTick={externalFieldTick}
                onSelectProduct={onSelectProduct}
                onTriggerAction={(act, prod) => {
                  onClose();
                  if (onTriggerAction) onTriggerAction(act, prod);
                }}
                onViewProductDetail={(prod) => {
                  onClose();
                  if (onViewProductDetail) onViewProductDetail(prod);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileDrawer;
