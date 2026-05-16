import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Trash2, RefreshCcw, Plus, ChevronRight, Eye, EyeOff, Save } from 'lucide-react';
import { Category, Tag, ProductFormData, Manufacturer, Dimension } from '../../types';
import { useAdminSession, useAdminPhoto, useAdminUI } from '../../context/AdminContexts';
import { PhotoTagSelector } from './edit/PhotoTagSelector';
import { DimensionEditor } from './edit/DimensionEditor';
import { safeArray } from '../../lib/utils';

interface UploadFormProps {
  onClose: () => void;
  editPhotoId: string | null;
  newPhotoData: string | null;
  isAnalyzing: boolean;
  handleSingleAiAnalyze: (imageData: string | null, catId?: string) => Promise<any>;
  deletePhoto: (id: string) => void;
  saveNewPhoto: () => void;
  isSyncing: boolean;
  formState: ProductFormData;
  updateForm: (updates: Partial<ProductFormData>) => void;
  showOtherFields: boolean;
  setShowOtherFields: (show: boolean) => void;
  categories: Category[];
  tags: Tag[];
  quickAddSubCategory: () => void;
  quickAddTag: () => void;
  quickAddManufacturer: () => void;
  manufacturers: Manufacturer[];
  aiDebugInfo: { step: string; message: string; error?: string } | null;
  abortAnalysis?: () => void;
}

export const UploadForm: React.FC<UploadFormProps> = ({
  onClose, editPhotoId, newPhotoData, isAnalyzing, handleSingleAiAnalyze,
  deletePhoto, saveNewPhoto, isSyncing, formState, updateForm,
  showOtherFields, setShowOtherFields,
  categories, tags, quickAddSubCategory, quickAddTag, quickAddManufacturer, manufacturers,
  aiDebugInfo, abortAnalysis
}) => {
  const { appLang } = useAdminSession();
  const { updateTag, deleteTag } = useAdminPhoto();
  const { setPromptDialog, setAlertDialog, withLoading } = useAdminUI();
  
  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col pt-safe">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shadow-sm relative min-h-[72px]">
        {/* Placeholder for left side to balance flex, or just empty */}
        <div className="flex-1"></div>

        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
            <h2 className="font-bold text-lg text-slate-800 ml-1 tracking-tight leading-tight pointer-events-auto">{editPhotoId ? '编辑产品' : '产品入库'}</h2>
            <div 
              onClick={() => updateForm({ isHidden: !formState.isHidden })}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border cursor-pointer mt-1 pointer-events-auto ${formState.isHidden ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-green-50 border-green-200 text-green-600'}`}
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
                  className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center shadow-sm"
                  title="取消识别"
                >
                  <X size={20} />
                </button>
              )}
              <button 
                onClick={() => {
                  if (isAnalyzing) return;
                  withLoading('analyzing', () => handleSingleAiAnalyze(newPhotoData, formState.categoryId || undefined));
                }}
                disabled={isAnalyzing && !abortAnalysis}
                className={`w-10 h-10 rounded-2xl border transition-all flex items-center justify-center shadow-sm ${isAnalyzing ? 'bg-slate-50 border-slate-100 text-slate-400' : 'bg-purple-50 border-purple-100 text-purple-600 hover:bg-purple-100 active:bg-purple-200'}`}
                title="AI 辨識"
              >
                {isAnalyzing ? <RefreshCcw size={20} className="animate-spin" /> : <Sparkles size={20} />}
              </button>
            </div>
          )}
          {editPhotoId && (
            <button 
              onClick={() => {
                setAlertDialog({
                  title: '确认删除产品',
                  message: '确定要删除这张照片吗？此操作无法撤销。',
                  onConfirm: () => {
                    if (editPhotoId) {
                      deletePhoto(editPhotoId);
                    }
                  },
                  confirmLabel: '确认删除',
                  type: 'danger'
                });
              }}
              className="w-10 h-10 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-100 transition-all active:bg-red-200"
              title="删除照片"
            >
              <Trash2 size={20} />
            </button>
          )}
          <button 
            onClick={saveNewPhoto}
            disabled={isSyncing}
            className={`bg-slate-800 text-white w-10 h-10 rounded-2xl shadow-lg shadow-slate-800/10 transition-all flex items-center justify-center ${isSyncing ? 'opacity-50 pointer-events-none' : 'active:bg-slate-700'}`}
            title="完成儲存"
          >
            {isSyncing ? <RefreshCcw size={18} className="animate-spin" /> : <Save size={18} />}
          </button>
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors rounded-full ml-1 active:bg-slate-300"
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
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">编号 / Code</h3>
                  <input type="text" placeholder="编号..." value={formState.manual_code} onChange={e => updateForm({ manual_code: e.target.value })} className="w-full bg-white border border-slate-200 p-4 rounded-[20px] text-sm font-bold shadow-sm" />
              </div>
              <div className="space-y-2">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">型号 / Model</h3>
                  <input type="text" placeholder="识别到的型号..." value={formState.model_number} onChange={e => updateForm({ model_number: e.target.value })} className="w-full bg-white border border-slate-200 p-4 rounded-[20px] text-sm font-bold shadow-sm" />
              </div>
           </div>
           <div className="space-y-2">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">产品名称 / Product Name</h3>
                <input type="text" placeholder="输入名称..." value={formState.name} onChange={e => updateForm({ name: e.target.value.toUpperCase() })} className="w-full bg-white border border-slate-200 p-4 rounded-[20px] text-sm font-black shadow-sm" />
           </div>
           <div className="space-y-2">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">产品价格 / Price</h3>
                <input type="text" placeholder="输入价格..." value={formState.price} onChange={e => updateForm({ price: e.target.value })} className="w-full bg-white border border-slate-200 p-4 rounded-[20px] text-sm font-black shadow-sm text-blue-600" />
           </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">目录 / Category *</h3>
          <div className="grid grid-cols-3 gap-2">
            {safeArray(categories).filter(c => c.name && c.name.trim()).map((cat: Category) => {
              const displayName = appLang === 'zh' ? (cat.zh || cat.name) : appLang === 'ms' ? (cat.ms || cat.name) : (cat.en || cat.name);
              return (
              <button 
                key={cat.id}
                onClick={() => { updateForm({ categoryId: cat.id }); }}
                className={`p-3 rounded-2xl border-2 text-center transition-all ${formState.categoryId === cat.id ? 'bg-blue-600 border-blue-600 shadow-lg' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200 active:bg-slate-50'}`}
              >
                <span className={`font-black block text-xs tracking-tight ${formState.categoryId === cat.id ? 'text-white' : 'text-slate-800'}`}>{displayName}</span>
              </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between pl-1">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">厂商 / Manufacturer</h3>
          </div>
          <div className="flex flex-wrap gap-2 p-1">
            {safeArray(manufacturers).map((mfr: Manufacturer) => (
              <button 
                key={mfr.id}
                onClick={() => updateForm({ manufacturerId: String(mfr.id) })}
                className={`px-5 py-2.5 rounded-full border text-xs font-bold transition-all ${String(formState?.manufacturerId) === String(mfr.id) ? 'bg-slate-800 border-slate-800 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-600 shadow-sm active:bg-slate-50'}`}
              >
                {mfr.name}
              </button>
            ))}
            <button onClick={quickAddManufacturer} className="px-4 py-2 rounded-full border border-dashed border-slate-300 text-slate-400 text-xs flex items-center gap-2 font-bold hover:border-slate-400 hover:text-slate-600 transition-all active:bg-slate-50">
              <Plus size={14} /> 新增
            </button>
          </div>
        </section>

        <section className="space-y-4">
          <PhotoTagSelector 
            tags={tags}
            selectedTagIds={safeArray<string>(formState.tagIds)}
            onChange={(newIds) => updateForm({ tagIds: newIds })}
            addTag={async (name) => { return await useAdminPhoto().addTag(name); }}
            updateTag={async (id, name) => { await updateTag(id, name); return true; }}
            deleteTag={async (id) => { await deleteTag(id); return true; }}
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
                <DimensionEditor 
                  dimensions={safeArray<Dimension>(formState.dimensions)}
                  onChange={(newDims) => updateForm({ dimensions: newDims })}
                  showAiButton={!editPhotoId && !!newPhotoData}
                  isAnalyzing={isAnalyzing}
                  onAiAnalyze={() => withLoading('analyzing', () => handleSingleAiAnalyze(newPhotoData, formState.categoryId || undefined))}
                />

                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 leading-none">多语言说明 / MULTI-LANG DESCRIPTIONS</label>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-black text-slate-400 uppercase px-1">中文说明</span>
                      <textarea 
                        placeholder="输入中文产品说明..." 
                        className="w-full bg-white border border-slate-200 p-4 rounded-2xl text-sm font-medium outline-none focus:border-blue-500 shadow-sm min-h-[80px]"
                        value={formState.description_translations?.zh || formState.description || ''}
                        onChange={e => {
                          const val = e.target.value;
                          updateForm({ 
                            description: val, 
                            description_translations: { ...(formState.description_translations || {}), zh: val } 
                          });
                        }}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[9px] font-black text-slate-400 uppercase px-1">English Description</span>
                      <textarea 
                        placeholder="Enter English description..." 
                        className="w-full bg-white border border-slate-200 p-4 rounded-2xl text-sm font-medium outline-none focus:border-blue-500 shadow-sm min-h-[80px]"
                        value={formState.description_translations?.en || ''}
                        onChange={e => {
                          const val = e.target.value;
                          updateForm({ 
                            description_translations: { ...(formState.description_translations || {}), en: val } 
                          });
                        }}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[9px] font-black text-slate-400 uppercase px-1">Bahasa Melayu</span>
                      <textarea 
                        placeholder="Masukkan penerangan Bahasa Melayu..." 
                        className="w-full bg-white border border-slate-200 p-4 rounded-2xl text-sm font-medium outline-none focus:border-blue-500 shadow-sm min-h-[80px]"
                        value={formState.description_translations?.ms || ''}
                        onChange={e => {
                          const val = e.target.value;
                          updateForm({ 
                            description_translations: { ...(formState.description_translations || {}), ms: val } 
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
};
