import React from 'react';
import { X as CloseIcon, RefreshCcw, ChevronRight, EyeOff, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { ProductFormData } from '../../types';
import { useAdminPhoto, useAdminSession } from '../../context/AdminContexts';

export const BatchEditScreen = ({
  resetAddState,
  saveBatchEdit,
  batchEditIds,
  formState,
  updateForm,
  batchIsHiddenApplied,
  setBatchIsHiddenApplied,
  showOtherFields,
  setShowOtherFields,
}: {
  resetAddState: () => void;
  saveBatchEdit: (batchIsHiddenApplied: boolean) => Promise<void>;
  batchEditIds: string[] | null;
  formState: ProductFormData;
  updateForm: (updates: Partial<ProductFormData>) => void;
  batchIsHiddenApplied: boolean;
  setBatchIsHiddenApplied: (a: boolean) => void;
  showOtherFields: boolean;
  setShowOtherFields: (s: boolean) => void;
}) => {
  const { 
    quickAddManufacturer: quickAddMfr, 
    quickAddTag: quickAddT,
    dbCategories,
    categories,
    manufacturers,
    tags
  } = useAdminPhoto();
  const { isSyncing, appLang } = useAdminSession();
  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col pt-safe">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shadow-sm relative min-h-[72px]">
        {/* Left Spacer */}
        <div className="flex-1"></div>

        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
            <h2 className="font-bold text-lg text-slate-800 ml-1 tracking-tight leading-tight pointer-events-auto">批量修改 ({batchEditIds?.length})</h2>
            <div 
              onClick={() => {
                setBatchIsHiddenApplied(true);
                updateForm({ isHidden: !formState.isHidden });
              }}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all cursor-pointer mt-1 pointer-events-auto ${batchIsHiddenApplied ? (formState.isHidden ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-green-50 border-green-200 text-green-600') : 'bg-slate-50 border-slate-200 text-slate-400'}`}
            >
              {!batchIsHiddenApplied ? <div className="w-2 h-2 rounded-full bg-slate-300" /> : (formState.isHidden ? <EyeOff size={10} /> : <Eye size={10} />)}
              <span className="text-[8px] font-bold uppercase tracking-widest">{!batchIsHiddenApplied ? '未套用公開狀態' : (formState.isHidden ? '設為屏蔽' : '設為公開')}</span>
            </div>
        </div>

        <div className="flex items-center gap-2 relative z-10">
            <button 
              onClick={() => saveBatchEdit(batchIsHiddenApplied)}
              className={`bg-blue-600 text-white px-8 py-3 rounded-[20px] text-sm font-black shadow-xl shadow-blue-600/30 transition-all active:scale-[0.9] flex items-center gap-3 border-2 border-white/20 ${isSyncing ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {isSyncing ? <RefreshCcw size={18} className="animate-spin" /> : null}
              保存修改
            </button>
            <button 
              onClick={resetAddState} 
              className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors rounded-full active:scale-95 ml-1"
              title="關閉"
            >
              <CloseIcon size={20} />
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar pb-32">
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-3xl">
          <p className="text-[11px] text-blue-700 font-medium leading-relaxed flex items-start gap-2">
            <span className="shrink-0 w-1.5 h-1.5 bg-blue-500 rounded-full mt-1"></span>
            注意：這會更新所有選中照片。僅手動修改的欄位會被套用至所有選取項目。
          </p>
        </div>

        <section className="space-y-4">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">統一产品编号 / Item Code</h3>
            <input 
              type="text" 
              placeholder="输入统一编号 (如: SK-2024)..."
              className="w-full bg-white border border-slate-200 p-5 rounded-3xl text-sm outline-none focus:border-blue-500 transition-all shadow-sm font-bold placeholder:text-slate-300"
              value={formState.manual_code}
              onChange={(e) => updateForm({ manual_code: e.target.value })}
            />
        </section>

        <section className="space-y-4">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">統一型号编号 / Model Number</h3>
            <input 
              type="text" 
              placeholder="输入统一型号编号 (如: MOD-123)..."
              className="w-full bg-white border border-slate-200 p-5 rounded-3xl text-sm outline-none focus:border-blue-500 transition-all shadow-sm font-bold placeholder:text-slate-300"
              value={formState.model_number}
              onChange={(e) => updateForm({ model_number: e.target.value })}
            />
        </section>

        <section className="space-y-4">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">統一价格 / Price</h3>
            <input 
              type="text" 
              placeholder="输入统一价格..."
              className="w-full bg-white border border-slate-200 p-5 rounded-3xl text-sm outline-none focus:border-blue-500 transition-all shadow-sm font-bold placeholder:text-slate-300 text-blue-600"
              value={formState.price}
              onChange={(e) => updateForm({ price: e.target.value })}
            />
        </section>

        <section className="space-y-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">目標主目录 *</h3>
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-4 gap-2">
              {dbCategories.slice(0, 4).map((cat: any) => (
                <button 
                  key={cat.code}
                  onClick={() => { updateForm({ categoryId: cat.code }); }}
                  className={`flex flex-col items-center justify-center py-3.5 px-1 rounded-2xl border-2 transition-all active:scale-[0.95] ${formState.categoryId === cat.code ? 'bg-blue-50 border-blue-600 shadow-lg shadow-blue-600/10' : 'bg-white border-slate-100'}`}
                >
                  <span className={`font-black text-[11px] leading-tight text-center ${formState.categoryId === cat.code ? 'text-blue-700' : 'text-slate-700'}`}>{cat[appLang] || cat.zh}</span>
                  <span className={`text-[7px] uppercase tracking-tighter mt-0.5 font-bold ${formState.categoryId === cat.code ? 'text-blue-500' : 'text-slate-400'}`}>{cat.en}</span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 px-6">
              {dbCategories.slice(4, 7).map((cat: any) => (
                <button 
                  key={cat.code}
                  onClick={() => { updateForm({ categoryId: cat.code }); }}
                  className={`flex flex-col items-center justify-center py-3.5 px-1 rounded-2xl border-2 transition-all active:scale-[0.95] ${formState.categoryId === cat.code ? 'bg-blue-50 border-blue-600 shadow-lg shadow-blue-600/10' : 'bg-white border-slate-100'}`}
                >
                  <span className={`font-black text-[11px] leading-tight text-center ${formState.categoryId === cat.code ? 'text-blue-700' : 'text-slate-700'}`}>{cat[appLang] || cat.zh}</span>
                  <span className={`text-[7px] uppercase tracking-tighter mt-0.5 font-bold ${formState.categoryId === cat.code ? 'text-blue-500' : 'text-slate-400'}`}>{cat.en}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between pl-1">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">統一厂商名称</h3>
            <button onClick={quickAddMfr} className="text-[10px] text-blue-600 font-bold bg-blue-50 px-3 py-1 rounded-full active:scale-95 transition-transform">+ 新增</button>
          </div>
          <div className="flex flex-wrap gap-2 p-1">
            {manufacturers?.map((mfr: any) => (
              <button 
                key={mfr.id}
                onClick={() => updateForm({ subcategoryId: mfr.id })}
                className={`px-5 py-2.5 rounded-full border text-xs font-bold transition-all active:scale-[0.97] ${formState.subcategoryId === mfr.id ? 'bg-slate-800 border-slate-800 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-600 shadow-sm'}`}
              >
                {mfr.name}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between pl-1">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">統一产品标签</h3>
            <button onClick={quickAddT} className="text-[10px] text-purple-600 font-bold bg-purple-50 px-3 py-1 rounded-full active:scale-95 transition-transform">+ 新增</button>
          </div>
          <div className="flex flex-wrap gap-2 p-1">
            {tags.map((tag: any) => (
              <button 
                key={tag.id}
                onClick={() => updateForm({ tagIds: formState.tagIds.includes(tag.id) ? formState.tagIds.filter((tid: string) => tid !== tag.id) : [...formState.tagIds, tag.id] })}
                className={`px-4 py-2 rounded-full border text-xs font-bold transition-all active:scale-[0.97] ${formState.tagIds.includes(tag.id) ? 'bg-purple-500 border-purple-500 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-600 shadow-sm'}`}
              >
                #{tag.name}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <button 
            onClick={() => setShowOtherFields(!showOtherFields)}
            className="w-full flex items-center justify-between p-5 bg-white border border-slate-200 rounded-3xl text-sm font-bold text-slate-800 shadow-sm active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className={`p-1 rounded-full bg-slate-100 text-slate-500 transition-transform duration-300 ${showOtherFields ? 'rotate-90' : ''}`}>
                <ChevronRight size={16} />
              </div>
              <span>其他詳細資訊 (編號、尺寸、备注)</span>
            </div>
            <div className="w-2 h-2 rounded-full bg-slate-200"></div>
          </button>

          <AnimatePresence>
            {showOtherFields && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-4 pt-2"
              >
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">統一尺寸 (長 x 寬 x 高) cm</label>
                  <div className="grid grid-cols-3 gap-3">
                    <input 
                      type="number"
                      placeholder="長"
                      value={formState.dimL}
                      onChange={(e) => updateForm({ dimL: e.target.value })}
                      className="w-full bg-slate-100/50 border border-slate-200 p-3.5 rounded-2xl text-center text-sm font-bold shadow-inner outline-none focus:bg-white focus:border-blue-500"
                    />
                    <input 
                      type="number"
                      placeholder="寬"
                      value={formState.dimW}
                      onChange={(e) => updateForm({ dimW: e.target.value })}
                      className="w-full bg-slate-100/50 border border-slate-200 p-3.5 rounded-2xl text-center text-sm font-bold shadow-inner outline-none focus:bg-white focus:border-blue-500"
                    />
                    <input 
                      type="number"
                      placeholder="高"
                      value={formState.dimH}
                      onChange={(e) => updateForm({ dimH: e.target.value })}
                      className="w-full bg-slate-100/50 border border-slate-200 p-3.5 rounded-2xl text-center text-sm font-bold shadow-inner outline-none focus:bg-white focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">統一產品備註</h3>
                    <textarea 
                      placeholder="輸入統一修改的備註內容..."
                      className="w-full bg-slate-100/50 border border-slate-200 p-5 rounded-3xl text-sm outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner font-medium min-h-[100px]"
                      value={formState.description}
                      onChange={(e) => updateForm({ description: e.target.value })}
                    />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
};
