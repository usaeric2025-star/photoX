import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Trash2, RefreshCcw, Plus, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { Category, Tag, DB_Category, ProductFormData } from '../../types';

interface UploadFormProps {
  onClose: () => void;
  editPhotoId: string | null;
  newPhotoData: string | null;
  isAnalyzing: boolean;
  handleSingleAiAnalyze: (imageData: string | null, catId?: string) => void;
  deletePhoto: (id: string) => void;
  saveNewPhoto: () => void;
  isSyncing: boolean;
  formState: ProductFormData;
  updateForm: (updates: Partial<ProductFormData>) => void;
  showOtherFields: boolean;
  setShowOtherFields: (show: boolean) => void;
  dbCategories: DB_Category[];
  appLang: string;
  categories: Category[];
  tags: Tag[];
  quickAddSubCategory: () => void;
  quickAddTag: () => void;
  quickAddManufacturer: () => void;
  manufacturers: any[];
  aiDebugInfo: { step: string; message: string; error?: string } | null;
  abortAnalysis?: () => void;
}

export const UploadForm: React.FC<UploadFormProps> = ({
  onClose, editPhotoId, newPhotoData, isAnalyzing, handleSingleAiAnalyze,
  deletePhoto, saveNewPhoto, isSyncing, formState, updateForm,
  showOtherFields, setShowOtherFields,
  dbCategories, appLang, categories, tags, quickAddSubCategory, quickAddTag, quickAddManufacturer, manufacturers,
  aiDebugInfo, abortAnalysis
}) => {
  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col pt-safe">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shadow-sm relative min-h-[72px]">
        {/* Placeholder for left side to balance flex, or just empty */}
        <div className="flex-1"></div>

        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
            <h2 className="font-bold text-lg text-slate-800 ml-1 tracking-tight leading-tight pointer-events-auto">{editPhotoId ? '編輯產品' : '產品入庫'}</h2>
            <div 
              onClick={() => updateForm({ isHidden: !formState.isHidden })}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all cursor-pointer mt-1 pointer-events-auto ${formState.isHidden ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-green-50 border-green-200 text-green-600'}`}
            >
              {formState.isHidden ? <EyeOff size={10} /> : <Eye size={10} />}
              <span className="text-[8px] font-bold uppercase tracking-widest">{formState.isHidden ? '公开屏蔽中' : '公开显示中'}</span>
            </div>
        </div>

        <div className="flex items-center gap-2 relative z-10">
          {!editPhotoId && newPhotoData && (
            <div className="flex items-center gap-2">
              {isAnalyzing && abortAnalysis && (
                <button 
                  onClick={abortAnalysis}
                  className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center shadow-sm active:scale-90"
                  title="取消识别"
                >
                  <X size={20} />
                </button>
              )}
              <button 
                onClick={() => {
                  if (isAnalyzing) return;
                  handleSingleAiAnalyze(newPhotoData, formState.categoryId || undefined);
                }}
                disabled={isAnalyzing && !abortAnalysis}
                className={`w-10 h-10 rounded-2xl border transition-all flex items-center justify-center shadow-sm active:scale-90 ${isAnalyzing ? 'bg-slate-50 border-slate-100 text-slate-400' : 'bg-purple-50 border-purple-100 text-purple-600 hover:bg-purple-100'}`}
                title="AI 辨識"
              >
                {isAnalyzing ? <RefreshCcw size={20} className="animate-spin" /> : <Sparkles size={20} />}
              </button>
            </div>
          )}
          {editPhotoId && (
            <button 
              onClick={() => { if(window.confirm('確定要刪除這張照片嗎？')) deletePhoto(editPhotoId); }}
              className="w-10 h-10 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-100 transition-all active:scale-90"
              title="刪除照片"
            >
              <Trash2 size={20} />
            </button>
          )}
          <button 
            onClick={saveNewPhoto}
            disabled={isSyncing}
            className={`bg-slate-800 text-white px-6 py-2.5 rounded-2xl text-xs font-bold shadow-lg shadow-slate-800/10 transition-all active:scale-95 flex items-center gap-2 ${isSyncing ? 'opacity-50 pointer-events-none' : ''}`}
          >
            {isSyncing ? <RefreshCcw size={14} className="animate-spin" /> : null}
            完成儲存
          </button>
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors rounded-full active:scale-95 ml-1"
            title="關閉"
          >
            <X size={20} />
          </button>
        </div>
      </div>

       <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar pb-32">
        <div className="aspect-[4/3] rounded-[40px] overflow-hidden bg-slate-900 shadow-2xl flex items-center justify-center border-4 border-white">
          {newPhotoData && <img src={newPhotoData} className="max-w-full max-h-full object-contain" alt="New" />}
          {isAnalyzing && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-20 rounded-[36px]">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="text-center px-4">
                <p className="text-white font-bold text-sm">正在识别中 (AI Analyzing)...</p>
                {aiDebugInfo && <p className="text-blue-300 text-[10px] mt-1 uppercase tracking-widest">{aiDebugInfo.step}: {aiDebugInfo.message}</p>}
              </div>
              {abortAnalysis && (
                <button 
                  onClick={abortAnalysis}
                  className="mt-2 px-6 py-2 bg-red-500 text-white text-[10px] font-bold rounded-full hover:bg-red-600 transition-all uppercase tracking-widest shadow-lg"
                >
                  取消识别 (Skip/Cancel)
                </button>
              )}
            </div>
          )}
        </div>

        <section className="space-y-4">
           <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">手动编号 / Code</h3>
                  <input type="text" placeholder="SK-2024..." value={formState.manual_code} onChange={e => updateForm({ manual_code: e.target.value })} className="w-full bg-white border border-slate-200 p-4 rounded-[20px] text-sm font-bold shadow-sm" />
              </div>
              <div className="space-y-2">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">型号 / Model</h3>
                  <input type="text" placeholder="MOD-123..." value={formState.model_number} onChange={e => updateForm({ model_number: e.target.value })} className="w-full bg-white border border-slate-200 p-4 rounded-[20px] text-sm font-bold shadow-sm" />
              </div>
           </div>
           <div className="space-y-2">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">产品名称 / Product Name</h3>
                <input type="text" placeholder="输入名称..." value={formState.name} onChange={e => updateForm({ name: e.target.value })} className="w-full bg-white border border-slate-200 p-4 rounded-[20px] text-sm font-black shadow-sm" />
           </div>
           <div className="space-y-2">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">产品价格 / Price</h3>
                <input type="text" placeholder="输入价格..." value={formState.price} onChange={e => updateForm({ price: e.target.value })} className="w-full bg-white border border-slate-200 p-4 rounded-[20px] text-sm font-black shadow-sm text-blue-600" />
           </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">目录 / Category *</h3>
          <div className="grid grid-cols-2 gap-3">
            {categories.map(cat => (
              <button 
                key={cat.id}
                onClick={() => { updateForm({ categoryId: cat.id }); }}
                className={`p-4 rounded-3xl border-2 text-left transition-all active:scale-[0.98] ${formState.categoryId === cat.id ? 'bg-white border-slate-800 text-slate-800 shadow-xl' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'}`}
              >
                <span className="font-bold block text-sm tracking-tight">{cat.name}</span>
                <span className="text-[9px] uppercase tracking-wider opacity-60 font-mono"></span>
              </button>
            ))}
            {(dbCategories || []).filter(dbc => !categories.some(c => c.name === dbc.zh)).map(cat => (
              <button 
                key={cat.code}
                onClick={() => { updateForm({ categoryId: cat.code }); }}
                className={`p-4 rounded-3xl border-2 text-left transition-all active:scale-[0.98] ${formState.categoryId === cat.code ? 'bg-white border-slate-800 text-slate-800 shadow-xl' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'}`}
              >
                <span className="font-bold block text-sm tracking-tight">{cat[appLang as keyof DB_Category] || cat.zh}</span>
                <span className="text-[9px] uppercase tracking-wider opacity-60 font-mono">{cat.en}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between pl-1">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">厂商 / Manufacturer</h3>
          </div>
          <div className="flex flex-wrap gap-2 p-1">
            {manufacturers?.map(mfr => (
              <button 
                key={mfr.id}
                onClick={() => updateForm({ subcategoryId: mfr.id })}
                className={`px-5 py-2.5 rounded-full border text-xs font-bold transition-all active:scale-[0.97] ${formState.subcategoryId === mfr.id ? 'bg-slate-800 border-slate-800 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-600 shadow-sm'}`}
              >
                {mfr.name}
              </button>
            ))}
            <button onClick={quickAddManufacturer} className="px-4 py-2 rounded-full border border-dashed border-slate-300 text-slate-400 text-xs flex items-center gap-2 font-bold hover:border-slate-400 hover:text-slate-600 active:scale-95 transition-all">
              <Plus size={14} /> 新增
            </button>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">标签 / Tags</h3>
          <div className="flex flex-wrap gap-2 p-1">
            {tags.map(tag => (
              <button 
                key={tag.id}
                onClick={() => updateForm({ tagIds: formState.tagIds.includes(tag.id) ? formState.tagIds.filter(tid => tid !== tag.id) : [...formState.tagIds, tag.id] })}
                className={`px-4 py-2 rounded-full border text-xs font-bold transition-all active:scale-[0.97] ${formState.tagIds.includes(tag.id) ? 'bg-purple-500 border-purple-500 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-600 shadow-sm'}`}
              >
                #{tag.name}
              </button>
            ))}
            <button onClick={quickAddTag} className="px-4 py-2 rounded-full border border-dashed border-slate-300 text-slate-400 text-xs flex items-center gap-2 font-bold hover:border-slate-400 hover:text-slate-600 active:scale-95 transition-all">
              <Plus size={14} /> 新增
            </button>
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
              <span>其他 / Others (尺寸、说明、备注)</span>
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
                  <div className="flex items-center justify-between pl-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 font-mono tracking-tight">产品尺寸 / DIMENSIONS</label>
                    <button 
                      onClick={() => {
                        const newDims = [...(formState.dimensions || [])];
                        newDims.push({ label: '', length: 0, width: 0, height: 0, unit: 'cm' });
                        updateForm({ dimensions: newDims });
                      }}
                      className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100"
                    >
                      + 增加规格
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {(formState.dimensions && formState.dimensions.length > 0 ? formState.dimensions : [{ label: '', length: parseFloat(formState.dimL||'0')||0, width: parseFloat(formState.dimW||'0')||0, height: parseFloat(formState.dimH||'0')||0, unit: 'cm' }]).map((dim, idx) => (
                      <div key={idx} className="bg-slate-100/30 p-4 rounded-3xl border border-slate-100 space-y-3 relative">
                        { (formState.dimensions && formState.dimensions.length > 1) && (
                          <button 
                            onClick={() => {
                              updateForm({ dimensions: formState.dimensions.filter((_, i) => i !== idx) });
                            }}
                            className="absolute top-3 right-3 p-1 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                           <div className="space-y-1">
                              <div className="flex items-center justify-between pl-1">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">规格名称 / Label</span>
                                {dim.isAI && <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">AI</span>}
                              </div>
                              <input 
                                type="text" 
                                placeholder="如: 3-Seater" 
                                value={dim.label || ''} 
                                onChange={e => {
                                  const newDims = [...((formState.dimensions && formState.dimensions.length > 0) ? formState.dimensions : [{...dim}])];
                                  newDims[idx].label = e.target.value;
                                  updateForm({ dimensions: newDims });
                                }}
                                className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-bold outline-none focus:border-blue-500" 
                              />
                           </div>
                           <div className="space-y-1">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter pl-1">单位 / Unit</span>
                              <div className="flex gap-1 h-[38px]">
                                {['cm', 'inch'].map(u => (
                                  <button 
                                    key={u}
                                    onClick={() => {
                                      const newDims = [...((formState.dimensions && formState.dimensions.length > 0) ? formState.dimensions : [{...dim}])];
                                      newDims[idx].unit = u;
                                      updateForm({ dimensions: newDims });
                                    }}
                                    className={`flex-1 rounded-xl text-[10px] font-bold transition-all border ${dim.unit === u ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-400 border-slate-200'}`}
                                  >
                                    {u}
                                  </button>
                                ))}
                              </div>
                           </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                             <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter pl-1">长 / L</span>
                             <input 
                               type="number" 
                               value={dim.length || ''} 
                               onChange={e => {
                                 const curDims = formState.dimensions;
                                 const newDims = [...((curDims && curDims.length > 0) ? curDims : [{...dim}])];
                                 newDims[idx].length = parseFloat(e.target.value) || 0;
                                 const updates: Partial<ProductFormData> = { dimensions: newDims };
                                 if (idx === 0) updates.dimL = e.target.value;
                                 updateForm(updates);
                               }}
                               className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-center text-sm font-bold outline-none focus:border-blue-500" 
                             />
                          </div>
                          <div className="space-y-1">
                             <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter pl-1">宽 / W</span>
                             <input 
                               type="number" 
                               value={dim.width || ''} 
                               onChange={e => {
                                 const curDims = formState.dimensions;
                                 const newDims = [...((curDims && curDims.length > 0) ? curDims : [{...dim}])];
                                 newDims[idx].width = parseFloat(e.target.value) || 0;
                                 const updates: Partial<ProductFormData> = { dimensions: newDims };
                                 if (idx === 0) updates.dimW = e.target.value;
                                 updateForm(updates);
                               }}
                               className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-center text-sm font-bold outline-none focus:border-blue-500" 
                             />
                          </div>
                          <div className="space-y-1">
                             <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter pl-1">高 / H</span>
                             <input 
                               type="number" 
                               value={dim.height || ''} 
                               onChange={e => {
                                 const curDims = formState.dimensions;
                                 const newDims = [...((curDims && curDims.length > 0) ? curDims : [{...dim}])];
                                 newDims[idx].height = parseFloat(e.target.value) || 0;
                                 const updates: Partial<ProductFormData> = { dimensions: newDims };
                                 if (idx === 0) updates.dimH = e.target.value;
                                 updateForm(updates);
                               }}
                               className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-center text-sm font-bold outline-none focus:border-blue-500" 
                             />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">

                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">产品说明 / 备註</label>
                    <textarea 
                      placeholder="输入产品特色、说明回其他备注..."
                      className="w-full bg-slate-100/50 border border-slate-200 p-5 rounded-3xl text-sm outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner font-medium placeholder:text-slate-400 min-h-[120px]"
                      value={formState.description}
                      onChange={e => updateForm({ description: e.target.value })}
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
