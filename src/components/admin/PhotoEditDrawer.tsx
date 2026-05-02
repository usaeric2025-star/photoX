import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TagEditor } from './TagEditor';
import { Photo, ProductFormData } from '../../types';
import { X as CloseIcon, EyeOff, Eye, RefreshCcw, Sparkles, Save, ChevronRight } from 'lucide-react';
import { useAdminPhoto, useAdminUI, useAdminSession } from '../../context/AdminContexts';
import { FormSectionHeader, CategoryGrid, ManufacturerList } from './FormShared';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

interface Props {
  editPhotoId: string | null;
  resetAddState: () => void;
  saveNewPhoto: () => Promise<void>;
  formState: ProductFormData;
  updateForm: (updates: Partial<ProductFormData>) => void;
  showOtherFields: boolean;
  setShowOtherFields: (s: boolean) => void;
  editPhotoPreview?: string | null;
  onDelete?: (id: string) => void;
  newPhotoData?: string | null;
  abortAnalysis?: () => void;
}

export const PhotoEditDrawer: React.FC<Props> = (props) => {
  const { 
    handleSingleAiAnalyze, 
    handleTranslate,
    handleSingleAiAnalyzeCallback,
    categories, 
    tags, 
    photos, 
    setPhotos,
    manufacturers, 
    addTag,
    addManufacturer,
    updateTag,
    deleteTag,
    removeTagFromPhoto
  } = useAdminPhoto();
  const { isAnalyzing, aiDebugInfo, setPromptDialog } = useAdminUI();
  const { appLang, isSyncing: sessionSyncing } = useAdminSession();
  const { editPhotoId, resetAddState, saveNewPhoto, formState, updateForm, showOtherFields, setShowOtherFields, editPhotoPreview, onDelete, newPhotoData, abortAnalysis } = props;  const isSyncing = sessionSyncing;

  const isPartOfGroup = useMemo(() => {
    if (!editPhotoId) return false;
    const photo = photos.find(p => p.id === editPhotoId);
    return !!(photo && photo.groupId);
  }, [editPhotoId, photos]);

  const sortedTags = useMemo(() => {
    return tags;
  }, [tags]);
  
  const handleToggleTag = (tag: any) => {
    if (formState.tagIds.includes(tag.id)) {
        updateForm({ tagIds: formState.tagIds.filter(id => id !== tag.id) });
    } else if (formState.tagIds.length < 3) {
        updateForm({ tagIds: [...formState.tagIds, tag.id] });
    }
  };

  return (
    <div className="fixed inset-0 z-[600] bg-slate-50 flex flex-col pt-safe pb-safe">
      <div className="px-4 py-3 border-b border-slate-200 bg-white shadow-sm flex items-center justify-between gap-3 min-h-[72px]">
        {/* Left: AI/Status Info */}
        <div className="flex-1 flex items-center gap-2 overflow-hidden">
          {aiDebugInfo?.error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 rounded-xl text-[10px] font-bold truncate">
              AI: {aiDebugInfo.error}
            </div>
          ) : (
            <div 
              onClick={() => updateForm({ isHidden: !formState.isHidden })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all cursor-pointer whitespace-nowrap ${formState.isHidden ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-green-50 border-green-200 text-green-600'}`}
            >
              {formState.isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
              <span className="text-[9px] font-bold uppercase tracking-widest leading-none">{formState.isHidden ? '公开屏蔽' : '公开显示'}</span>
            </div>
          )}
        </div>

            {/* Center: Title */}
        <div className="flex-shrink-0 flex flex-col items-center">
          <h2 className="font-black text-sm text-slate-800 tracking-tight leading-tight uppercase">
            {props.editPhotoId ? '編輯產品信息' : '分析新產品'}
          </h2>
          <p className="text-[8px] font-bold text-slate-400 tracking-widest uppercase">Product Individual Details</p>
        </div>

        {/* Right: Actions */}
        <div className="flex-1 flex items-center justify-end gap-2">
            {handleSingleAiAnalyze && (
              <div className="flex items-center gap-1.5">
                {isAnalyzing && props.abortAnalysis && (
                  <button 
                    onClick={props.abortAnalysis}
                    className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-orange-50 text-orange-600 border border-orange-100 shadow-sm"
                    title="取消识别"
                  >
                    <CloseIcon size={18} />
                  </button>
                )}
                <button 
                  onClick={() => {
                    console.log('AI Identify Clicked', { isAnalyzing, hasNewData: !!props.newPhotoData, hasPreview: !!props.editPhotoPreview });
                    if (isAnalyzing) return;
                    const data = props.newPhotoData || props.editPhotoPreview;
                    if (!data) {
                      console.warn('AI Identify failed: No image data found');
                      return;
                    }
                    
                    if (handleSingleAiAnalyzeCallback) {
                      console.log('Calling handleSingleAiAnalyzeCallback');
                      handleSingleAiAnalyzeCallback(
                        data, 
                        formState.categoryId || undefined, 
                        editPhotoId || undefined, 
                        formState, 
                        updateForm, 
                        handleSingleAiAnalyze
                      );
                    } else if (handleSingleAiAnalyze) {
                      console.log('Calling handleSingleAiAnalyze');
                      handleSingleAiAnalyze(data, formState.categoryId || undefined);
                    } else {
                      console.error('AI Identification methods are missing from context');
                    }
                  }}
                  disabled={isAnalyzing && !props.abortAnalysis}
                  className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl border shadow-sm transition-all ${isAnalyzing ? 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed' : 'bg-purple-50 text-purple-600 border-purple-100 active:bg-purple-200'}`}
                >
                  {isAnalyzing ? <RefreshCcw size={18} className="animate-spin" /> : <Sparkles size={18} />}
                </button>
              </div>
            )}
            {isPartOfGroup && (
              <button 
                onClick={() => updateForm({ isGroupCover: !formState.isGroupCover })}
                className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl border shadow-sm transition-all ${formState.isGroupCover ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-500 border-slate-200 active:bg-slate-100'}`}
                title="设为封面"
              >
                <div className="text-[10px] font-bold">封面</div>
              </button>
            )}
            <button 
              onClick={async () => {
                if (isPartOfGroup) {
                  const photo = photos.find(p => p.id === editPhotoId);
                  if (photo && photo.groupId) {
                     setPhotos(prevPhotos => prevPhotos.map(p => {
                         if (p.groupId === photo.groupId) {
                             return { ...p, tagIds: formState.tagIds, categoryId: formState.categoryId };
                         }
                         return p;
                     }));
                  }
                }
                await props.saveNewPhoto();
              }}
              disabled={isSyncing}
              className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl border shadow-sm transition-all ${isSyncing ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed' : 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20 active:bg-blue-700'}`}
              title="保存"
            >
              {isSyncing ? <RefreshCcw size={18} className="animate-spin" /> : <Save size={18}/>}
            </button>
            <button 
              onClick={props.resetAddState} 
              className="w-10 h-10 flex-shrink-0 flex items-center justify-center text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors rounded-full ml-1"
              title="關閉"
            >
              <CloseIcon size={20} />
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
             <div className="space-y-1.5">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">產品名稱 / PRODUCT NAME</h3>
                <input 
                  key={editPhotoId || 'new'}
                  type="text" 
                  placeholder="輸入名稱..." 
                  defaultValue={formState.name} 
                  onBlur={e => updateForm({ name: e.target.value.toUpperCase().trim() })} 
                  className="w-full bg-white border border-slate-200 p-4 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 transition-all shadow-sm" 
                />
             </div>
             <div className="flex w-full gap-2 pt-1">
                <div className="flex-1 space-y-1.5">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">編號 / CODE</h3>
                  <input type="text" placeholder="編號..." value={formState.manual_code} onChange={e => updateForm({ manual_code: e.target.value })} className="w-full bg-white border border-slate-200 p-3 rounded-2xl text-[11px] font-bold outline-none focus:border-blue-500" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">型號 / MODEL</h3>
                  <input type="text" placeholder="型號..." value={formState.model_number} onChange={e => updateForm({ model_number: e.target.value })} className="w-full bg-white border border-slate-200 p-3 rounded-2xl text-[11px] font-bold outline-none focus:border-blue-500" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">價格 / PRICE</h3>
                  <input type="text" placeholder="價格..." value={formState.price||''} onChange={e => updateForm({ price: e.target.value })} className="w-full bg-white border border-slate-200 p-3 rounded-2xl text-[11px] font-bold text-blue-600 outline-none focus:border-blue-500" />
                </div>
             </div>
          </div>
        </div>

        <section className="space-y-4">
            <FormSectionHeader title="產品目錄" subtitle="CATEGORY *" />
            <CategoryGrid 
              categories={categories}
              selectedId={formState.categoryId}
              onSelect={(id) => updateForm({ categoryId: id })}
              appLang={appLang}
            />
        </section>

        <section className="space-y-2">
             <TagEditor 
                tags={sortedTags} 
                selectedTagIds={formState.tagIds} 
                onToggleTag={handleToggleTag}
                onUpdateTag={updateTag}
                onDeleteTag={(tagId) => deleteTag(tagId)}
                onQuickAdd={() => {
                  setPromptDialog({
                    title: '新增标签',
                    message: '输入标签名称',
                    onSubmit: async (name) => {
                      const trimmed = name.trim();
                      if (!trimmed) return;
                      const saved = await addTag(trimmed);
                      if (saved) {
                         const nextTagIds = [...new Set([...(formState.tagIds || []), String(saved.id)])];
                         updateForm({ tagIds: nextTagIds });
                         if (props.editPhotoId) {
                           // If we are editing, we also want to persist this specifically to the photo
                           // but Save button will handle it.
                         }
                      }
                    }
                  });
                }}
                onRenameTagRequest={(tag) => {
                  setPromptDialog({
                    title: '编辑标签 / Edit Tag',
                    message: "输入标签名称 / Enter Tag Name:",
                    placeholder: tag.name,
                    onSubmit: (n) => {
                      if(n && n.trim()) { 
                        updateTag(tag.id, n.trim()); 
                      }
                    }
                  });
                }}
                showHotEffects={false}
             />
          </section>

        <section className="space-y-4">
          <FormSectionHeader 
            title="廠商名稱" 
            subtitle="MANUFACTURER" 
            onAction={() => {
              setPromptDialog({
                title: '新增廠商 / New Manufacturer',
                placeholder: '輸入廠商名稱',
                onSubmit: (name) => addManufacturer(name)
              })
            }} 
          />
          <ManufacturerList 
            manufacturers={manufacturers}
            selectedId={formState.manufacturerId}
            onSelect={(id) => updateForm({ manufacturerId: id })}
          />
        </section>

          <section className="space-y-3">
             <button 
               onClick={() => props.setShowOtherFields(!props.showOtherFields)}
               className="w-full flex items-center justify-between p-5 bg-white border border-slate-200 rounded-3xl text-sm font-bold text-slate-800 shadow-sm transition-all"
             >
               <div className="flex items-center gap-3">
                 <div className={`p-1 rounded-full bg-slate-100 text-slate-500 transition-transform duration-300 ${props.showOtherFields ? 'rotate-90' : ''}`}>
                    <ChevronRight size={16} />
                 </div>
                 <span>其他詳細資訊 (編號、尺寸、備註)</span>
               </div>
               <div className="w-2 h-2 rounded-full bg-slate-200"></div>
             </button>
             
             {props.showOtherFields && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between pl-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 leading-none">产品尺寸 / DIMENSIONS</span>
                    <div className="flex items-center gap-2">
                      {handleSingleAiAnalyze && (
                        <button 
                          onClick={() => {
                            if (isAnalyzing) return;
                            const data = props.newPhotoData || props.editPhotoPreview;
                            if (!data) return;

                            if (handleSingleAiAnalyzeCallback) {
                              handleSingleAiAnalyzeCallback(
                                data, 
                                formState.categoryId || undefined, 
                                editPhotoId || undefined, 
                                formState, 
                                updateForm, 
                                handleSingleAiAnalyze
                              );
                            } else {
                              handleSingleAiAnalyze!(data, formState.categoryId || undefined);
                            }
                          }}
                          disabled={isAnalyzing}
                          className={`text-[9px] font-black px-2 py-1 rounded-lg border flex items-center gap-1 transition-all ${isAnalyzing ? 'bg-slate-50 text-slate-400 border-slate-100' : 'bg-purple-50 text-purple-600 border-purple-100'}`}
                        >
                          <Sparkles size={10} className={isAnalyzing ? 'animate-spin' : ''} /> 
                          {isAnalyzing ? '识别中...' : 'AI 识别尺寸'}
                        </button>
                      )}
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
                  </div>

                  <div className="space-y-3">
                    {(formState.dimensions && formState.dimensions.length > 0 ? formState.dimensions : [{ label: '', length: parseFloat(formState.dimL||'0')||0, width: parseFloat(formState.dimW||'0')||0, height: parseFloat(formState.dimH||'0')||0, unit: 'cm' }]).map((dim, idx) => (
                      <div key={`dim-${idx}`} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3 relative">
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
                                {['cm', 'mm', 'inch'].map(u => (
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

                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">多语言说明 / MULTI-LANG DESCRIPTIONS</span>
                      <button 
                        onClick={async () => {
                          const zhText = formState.description_translations?.zh || formState.description;
                          if (!zhText) return;
                          try {
                             const res = await handleTranslate(zhText);
                             updateForm({
                               description_translations: { 
                                 ...formState.description_translations, 
                                 zh: zhText,
                                 en: res.en, 
                                 ms: res.ms 
                               }
                             });
                          } catch (e: any) {
                             console.error('Translation failed:', e);
                          }
                        }}
                        className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 flex items-center gap-1"
                      >
                        <Sparkles size={10} /> 自動翻譯 / AUTO TRANSLATE
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 px-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">中文说明</span>
                        <div className="flex-1 h-[1px] bg-slate-100"></div>
                      </div>
                      <textarea 
                        placeholder="输入中文产品说明..." 
                        value={formState.description_translations?.zh || ''} 
                        onChange={e => {
                          const zh = e.target.value;
                          updateForm({ 
                            description: zh, 
                            description_translations: { ...(formState.description_translations || {}), zh } 
                          });
                        }} 
                        className="w-full p-4 rounded-2xl border border-slate-200 h-24 text-sm font-medium" 
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 px-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">English Description</span>
                        <div className="flex-1 h-[1px] bg-slate-100"></div>
                      </div>
                      <textarea 
                        placeholder="Enter English description..." 
                        value={formState.description_translations?.en || ''} 
                        onChange={e => {
                          const en = e.target.value;
                          updateForm({ 
                            description_translations: { ...(formState.description_translations || {}), en } 
                          });
                        }} 
                        className="w-full p-4 rounded-2xl border border-slate-200 h-24 text-sm font-medium" 
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 px-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Penerangan Bahasa Melayu</span>
                        <div className="flex-1 h-[1px] bg-slate-100"></div>
                      </div>
                      <textarea 
                        placeholder="Masukkan penerangan Bahasa Melayu..." 
                        value={formState.description_translations?.ms || ''} 
                        onChange={e => {
                          const ms = e.target.value;
                          updateForm({ 
                            description_translations: { ...(formState.description_translations || {}), ms } 
                          });
                        }} 
                        className="w-full p-4 rounded-2xl border border-slate-200 h-24 text-sm font-medium" 
                      />
                    </div>
                  </div>

               </div>
             )}
          </section>

           {props.editPhotoId && props.onDelete && (
            <div className="pt-2 pb-6">
                <Button 
                  variant="destructive" 
                  className="w-full py-4 rounded-3xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                  onClick={() => props.onDelete!(props.editPhotoId!)}
                >
                   删除此照片
                </Button>
            </div>
           )}
       </div>
    </div>
  );
};
