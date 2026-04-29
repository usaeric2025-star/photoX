import React from 'react';
import { X as CloseIcon, RefreshCcw, ChevronRight, EyeOff, Eye, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { ProductFormData } from '../../types';
import { useAdminPhoto, useAdminSession } from '../../context/AdminContexts';
import { TagEditor } from './TagEditor';

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
    categories,
    manufacturers,
    tags,
    updateTag,
    deleteTag
  } = useAdminPhoto();
  const { isSyncing, appLang } = useAdminSession();
  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col pt-safe">
      <div className="px-4 py-3 border-b border-slate-200 
        bg-white flex items-center justify-between gap-3">
        
        <h2 className="font-black text-base text-slate-800">
          批量修改
        </h2>
        
        <div className="flex items-center gap-2">
          <button onClick={() => saveBatchEdit(batchIsHiddenApplied)}
            className={`w-10 h-10 bg-blue-600 text-white 
            rounded-xl flex items-center justify-center 
            shadow-md active:scale-95 ${isSyncing ? 'opacity-50 pointer-events-none' : ''}`}>
            {isSyncing ? <RefreshCcw size={18} className="animate-spin" /> : <Save size={18} />}
          </button>
          <button onClick={resetAddState}
            className="w-10 h-10 bg-slate-100 text-slate-600 
            rounded-xl flex items-center justify-center 
            active:scale-95">
            <CloseIcon size={18} />
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
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">統一产品名称 / Product Name</h3>
            <input 
              type="text" 
              placeholder="输入统一产品名称..."
              className="w-full bg-white border border-slate-200 p-5 rounded-3xl text-sm outline-none focus:border-blue-500 transition-all shadow-sm font-bold placeholder:text-slate-300"
              value={formState.name}
              onChange={(e) => updateForm({ name: e.target.value })}
            />
        </section>

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
              {categories.map((cat: any) => {
                const displayName = appLang === 'zh' ? (cat.zh || cat.name) : appLang === 'ms' ? (cat.ms || cat.name) : (cat.en || cat.name);
                return (
                  <button 
                    key={cat.id}
                    onClick={() => { updateForm({ categoryId: cat.id }); }}
                    className={`flex flex-col items-center justify-center py-3.5 px-1 rounded-2xl border-2 transition-all active:scale-[0.95] ${formState.categoryId === cat.id ? 'bg-blue-50 border-blue-600 shadow-lg shadow-blue-600/10' : 'bg-white border-slate-100'}`}
                  >
                    <span className={`font-black text-[11px] leading-tight text-center ${formState.categoryId === cat.id ? 'text-blue-700' : 'text-slate-700'}`}>{displayName}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between pl-1">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">統一厂商名称</h3>
            <button onClick={quickAddMfr} className="text-[10px] text-blue-600 font-bold bg-blue-50 px-3 py-1 rounded-full active:scale-95 transition-transform">+ 新增</button>
          </div>
          <div className="flex flex-wrap gap-2 p-1">
            {(manufacturers || []).map((mfr: any) => (
              <button 
                key={mfr.id}
                onClick={() => updateForm({ subcategoryId: mfr.id })}
                className={`px-5 py-2.5 rounded-full border text-xs font-bold transition-all active:scale-[0.97] ${String(formState.subcategoryId) === String(mfr.id) ? 'bg-slate-800 border-slate-800 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-600 shadow-sm'}`}
              >
                {mfr.name}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <TagEditor 
            tags={tags}
            selectedTagIds={formState.tagIds}
            onToggleTag={(tag) => {
              const tagIdStr = String(tag.id);
              const exists = formState.tagIds.map(String).includes(tagIdStr);
              updateForm({ 
                tagIds: exists 
                  ? formState.tagIds.filter((tid: string) => String(tid) !== tagIdStr) 
                  : [...formState.tagIds, tagIdStr] 
              });
            }}
            onUpdateTag={updateTag}
            onDeleteTag={deleteTag}
            onQuickAdd={quickAddT}
          />
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
