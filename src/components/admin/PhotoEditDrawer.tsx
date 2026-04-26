import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TagEditor } from './TagEditor';
import { Photo, ProductFormData } from '../../types';
import { X as CloseIcon, EyeOff, Eye, RefreshCcw, Sparkles, Save, ChevronRight } from 'lucide-react';

interface Props {
  editPhotoId: string | null;
  resetAddState: () => void;
  saveNewPhoto: () => Promise<void>;
  formState: ProductFormData;
  updateForm: (updates: Partial<ProductFormData>) => void;
  showOtherFields: boolean;
  setShowOtherFields: (s: boolean) => void;
  isSyncing: boolean;
  dbCategories: any[];
  categories: any[];
  appLang: string;
  quickAddSubCategory: () => void;
  quickAddTag: () => void;
  quickAddManufacturer: () => void;
  tags: any[];
  updateTag: (id: string, name: string) => void;
  deleteTag: (id: string) => void;
  photos: Photo[];
  manufacturers: any[];
  editPhotoPreview?: string | null;
  onDelete?: (id: string) => void;
  newPhotoData?: string | null;
  aiDebugInfo: { step: string; message: string; error?: string } | null;
  isAnalyzing?: boolean;
  abortAnalysis?: () => void;
  handleSingleAiAnalyze?: (data: string, catId?: string) => Promise<void>;
}

export const PhotoEditDrawer: React.FC<Props> = (props) => {
  const { formState, updateForm } = props;
  const [isSyncing, setIsSyncing] = useState(false);

  const sortedTags = useMemo(() => {
    console.log("Drawing tags:", props.tags);
    console.log("Current formStates tags:", formState.tagIds);
    return [...props.tags];
  }, [props.tags, formState.tagIds]);
  
  const handleToggleTag = (tag: any) => {
    if (formState.tagIds.includes(tag.id)) {
        updateForm({ tagIds: formState.tagIds.filter(id => id !== tag.id) });
    } else if (formState.tagIds.length < 3) {
        updateForm({ tagIds: [...formState.tagIds, tag.id] });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col pt-safe">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shadow-sm">
        <button onClick={props.resetAddState} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 transition-colors rounded-full active:bg-slate-100">
          <CloseIcon size={24} />
        </button>
        {props.aiDebugInfo?.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-xl text-[10px] font-bold max-w-[50%] animate-pulse">
            AI 错误: {props.aiDebugInfo.error}
          </div>
        )}
        <div className="flex flex-col items-center">
            <h2 className="font-bold text-lg text-slate-800 ml-1 tracking-tight leading-tight">{props.editPhotoId ? '编辑信息' : '新增信息'}</h2>
            <div 
              onClick={() => updateForm({ isHidden: !formState.isHidden })}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all cursor-pointer mt-1 ${formState.isHidden ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-green-50 border-green-200 text-green-600'}`}
            >
              {formState.isHidden ? <EyeOff size={10} /> : <Eye size={10} />}
              <span className="text-[8px] font-bold uppercase tracking-widest">{formState.isHidden ? '公开屏蔽中' : '公开显示中'}</span>
            </div>
        </div>
        <div className="flex items-center gap-2">
            {props.handleSingleAiAnalyze && (
              <div className="flex items-center gap-2">
                {props.isAnalyzing && props.abortAnalysis && (
                  <button 
                    onClick={props.abortAnalysis}
                    className="p-2.5 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 shadow-sm active:scale-95"
                    title="取消识别"
                  >
                    <CloseIcon size={18} />
                  </button>
                )}
                <button 
                  onClick={() => {
                    if (props.isAnalyzing) return;
                    const data = props.newPhotoData || props.editPhotoPreview;
                    if (data) props.handleSingleAiAnalyze!(data, formState.categoryId || undefined);
                  }}
                  disabled={props.isAnalyzing && !props.abortAnalysis}
                  className={`p-2.5 rounded-xl border shadow-sm transition-all active:scale-95 ${props.isAnalyzing ? 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed' : 'bg-purple-50 text-purple-600 border-purple-100'}`}
                >
                  {props.isAnalyzing ? <RefreshCcw size={18} className="animate-spin" /> : <Sparkles size={18} />}
                </button>
              </div>
            )}
            <button 
              onClick={props.saveNewPhoto}
              className={`bg-blue-600 text-white px-6 py-2.5 rounded-2xl text-xs font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-[0.95] flex items-center gap-2 ${props.isSyncing ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {props.isSyncing ? <RefreshCcw size={14} className="animate-spin" /> : <Save size={14}/>}
              保存
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar pb-4">
        <div className="flex gap-4 items-start">
          {(props.newPhotoData || props.editPhotoPreview) && (
            <div className="w-1/3 shrink-0">
               <div className="aspect-square rounded-2xl overflow-hidden bg-slate-900 shadow-lg border-2 border-white">
                  <img src={props.newPhotoData || props.editPhotoPreview || undefined} className="w-full h-full object-contain" alt="Preview" />
               </div>
            </div>
          )}
          <div className="flex-1 space-y-3">
             <div className="space-y-1">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">产品名称 / Product Name</h3>
                <input type="text" placeholder="输入名称..." value={formState.name} onChange={e => updateForm({ name: e.target.value })} className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-bold" />
             </div>
             <div className="flex w-full gap-2 overflow-x-auto">
                <div className="flex-1 min-w-[30%] space-y-1">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 whitespace-nowrap">编号 / Code</h3>
                  <input type="text" placeholder="编号..." value={formState.manual_code} onChange={e => updateForm({ manual_code: e.target.value })} className="w-full p-2 rounded-xl border border-slate-200 text-xs" />
                </div>
                <div className="flex-1 min-w-[30%] space-y-1">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 whitespace-nowrap">型号 / Model</h3>
                  <input type="text" placeholder="型号..." value={formState.model_number} onChange={e => updateForm({ model_number: e.target.value })} className="w-full p-2 rounded-xl border border-slate-200 text-xs" />
                </div>
                <div className="flex-1 min-w-[30%] space-y-1">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 whitespace-nowrap">价格 / Price</h3>
                  <input type="text" placeholder="价格..." value={formState.price||''} onChange={e => updateForm({ price: e.target.value })} className="w-full p-2 rounded-xl border border-slate-200 text-xs font-bold text-blue-600" />
                </div>
             </div>
          </div>
        </div>

        <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">目录 / Category *</h3>
            <div className="grid grid-cols-4 gap-1.5">
                {(props.dbCategories || []).map(cat => {
                    const isSelected = String(formState.categoryId || '') === String(cat.code || '');
                    return (
                  <button 
                    key={cat.code}
                    onClick={() => { updateForm({ categoryId: String(cat.code) }); }}
                    className={`flex flex-col items-center justify-center py-4 px-1 rounded-xl border-2 transition-all active:scale-[0.95] ${isSelected ? 'bg-blue-600 border-blue-600 shadow-md shadow-blue-600/30' : 'bg-white border-slate-100'}`}
                  >
                    <span className={`font-black text-sm leading-tight text-center ${isSelected ? 'text-white' : 'text-slate-700'}`}>{cat[props.appLang] || cat.zh}</span>
                  </button>);
                })}
            </div>
        </div>

        <section className="space-y-2">
             <TagEditor 
                tags={sortedTags} 
                selectedTagIds={formState.tagIds} 
                onToggleTag={handleToggleTag}
                onUpdateTag={props.updateTag}
                onDeleteTag={props.deleteTag}
                onQuickAdd={props.quickAddTag}
             />
          </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between pl-1">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">厂商 / Manufacturer</h3>
            <button onClick={props.quickAddManufacturer} className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">+ 新增</button>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto content-start">
            {(props.manufacturers || []).map((mfr: any) => (
              <button 
                key={mfr.id}
                onClick={() => updateForm({ subcategoryId: mfr.id })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${formState.subcategoryId === mfr.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 text-slate-600'}`}
              >
                {mfr.name}
              </button>
            ))}
          </div>
        </section>

          <section className="space-y-3">
             <button 
               onClick={() => props.setShowOtherFields(!props.showOtherFields)}
               className="w-full flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 active:scale-[0.98] transition-all"
             >
               <span>其他 / Others (尺寸、说明、备注)</span>
               <div className={`transition-transform ${props.showOtherFields ? 'rotate-90' : ''}`}>
                  <ChevronRight size={16} />
               </div>
             </button>
             
             {props.showOtherFields && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between pl-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 leading-none">产品尺寸 / DIMENSIONS</span>
                    <button 
                      onClick={() => {
                        const newDims = [...(formState.dimensions || [])];
                        newDims.push({ label: '', length: 0, width: 0, height: 0, unit: 'cm' });
                        updateForm({ dimensions: newDims });
                      }}
                      className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100"
                    >
                      + 增加规格 / ADD SIZE
                    </button>
                  </div>

                  <div className="space-y-3">
                    {(formState.dimensions && formState.dimensions.length > 0 ? formState.dimensions : [{ label: '', length: parseFloat(formState.dimL||'0')||0, width: parseFloat(formState.dimW||'0')||0, height: parseFloat(formState.dimH||'0')||0, unit: 'cm' }]).map((dim, idx) => (
                      <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3 relative">
                        { (formState.dimensions && formState.dimensions.length > 1) && (
                          <button 
                            onClick={() => {
                              updateForm({ dimensions: formState.dimensions.filter((_, i) => i !== idx) });
                            }}
                            className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <CloseIcon size={14} />
                          </button>
                        )}
                        <div className="grid grid-cols-2 gap-2">
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
                                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold" 
                              />
                           </div>
                           <div className="space-y-1">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter pl-1">单位 / Unit</span>
                              <div className="flex gap-1">
                                {['cm', 'inch'].map(u => (
                                  <button 
                                    key={u}
                                    onClick={() => {
                                      const newDims = [...((formState.dimensions && formState.dimensions.length > 0) ? formState.dimensions : [{...dim}])];
                                      newDims[idx].unit = u;
                                      newDims[idx].isAI = false;
                                      updateForm({ dimensions: newDims });
                                    }}
                                    className={`flex-1 p-2 rounded-xl text-[10px] font-bold transition-all border ${dim.unit === u ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}
                                  >
                                    {u}
                                  </button>
                                ))}
                              </div>
                           </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
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
                               className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-center font-bold text-sm" 
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
                               className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-center font-bold text-sm" 
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
                               className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-center font-bold text-sm" 
                             />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <textarea placeholder="备注信息..." value={formState.description} onChange={e => updateForm({ description: e.target.value })} className="w-full p-4 rounded-2xl border border-slate-200 h-24" />

               </div>
             )}
          </section>

           {props.editPhotoId && props.onDelete && (
            <div className="pt-2 pb-6">
              <button 
                onClick={() => props.onDelete!(props.editPhotoId!)}
                className="w-full py-4 rounded-3xl bg-red-50 text-red-600 text-xs font-bold border border-red-100 active:bg-red-200 transition-all flex items-center justify-center gap-2"
              >
                删除此照片
              </button>
            </div>
           )}
       </div>
    </div>
  );
};
