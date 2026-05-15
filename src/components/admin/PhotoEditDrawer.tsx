import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { useFormValidation } from '../../hooks/useFormValidation';
import { useErrorHandler } from '../../utils/errorHandler';
import { Photo, ProductFormData, Dimension, Tag } from '../../types';
import { Skeleton } from '../ui/Skeleton';
import { X as CloseIcon, EyeOff, Eye, RefreshCcw, Sparkles, Save, ChevronRight, Trash2 } from 'lucide-react';
import { useAdminPhoto, useAdminUI, useAdminSession } from '../../context/AdminContexts';
import { FormSectionHeader, CategoryGrid, ManufacturerList } from './FormShared';
import { PhotoTagSelector } from './edit/PhotoTagSelector';
import { DimensionEditor } from './edit/DimensionEditor';
import { Button } from "@/components/ui/button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { cn, safeArray } from '../../lib/utils';

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
  setNewPhotoData?: (data: string | null) => void;
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
    updateManufacturer,
    deleteManufacturer,
    updateTag,
    deleteTag,
    removeTagFromPhoto
  } = useAdminPhoto();
  const { isAnalyzing, aiDebugInfo, setPromptDialog, setAlertDialog } = useAdminUI();
  const { appLang, isSyncing: sessionSyncing } = useAdminSession();
  const { validatePhotoForm } = useFormValidation();
  const { handleError } = useErrorHandler();
  const { editPhotoId, resetAddState, saveNewPhoto, formState, updateForm, showOtherFields, setShowOtherFields, editPhotoPreview, onDelete, newPhotoData, abortAnalysis } = props;  
  const isSyncing = sessionSyncing;

  // 2. 自动触发 AI 识别逻辑
  const isPartOfGroup = useMemo(() => {
    if (!editPhotoId) return false;
    const photo = photos.find(p => p.id === editPhotoId);
    return !!(photo && photo.groupId);
  }, [editPhotoId, photos]);

  const [isProcessingImage, setIsProcessingImage] = useState(false);

  const transformImage = async () => {
    const src = props.newPhotoData || props.editPhotoPreview;
    if (!src) return;

    setIsProcessingImage(true);
    try {
      const img = new Image();
      if (src.startsWith('http')) img.crossOrigin = 'Anonymous';
      img.src = src;
      await img.decode();

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = img.height;
      canvas.height = img.width;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      const newData = canvas.toDataURL('image/jpeg', 0.95);
      if (props.setNewPhotoData) {
        props.setNewPhotoData(newData);
      }
    } catch (err) {
      handleError(err, '图像旋转处理失败');
    } finally {
      setIsProcessingImage(false);
    }
  };

  const rotatePhoto = async () => {
    console.log('DEBUG [PhotoEditDrawer]: Rotate clicked');
    await transformImage();
  };

  return (
    <div className="fixed inset-0 z-[600] bg-slate-50 flex flex-col pt-safe pb-safe">
      <div className="px-4 py-3 border-b border-slate-200 bg-white shadow-sm flex items-center justify-between gap-3 min-h-[72px]">
        {/* Left: AI/Status Info */}
        <div className="flex-none flex items-center gap-2">
          {aiDebugInfo?.error ? (
            <div 
              onClick={() => {
                const fullError = aiDebugInfo.error || '';
                // If it's our internal format, clean it up for the toast
                const readableError = fullError.includes('|') ? fullError.split('|').slice(1).join(': ') : fullError;
                handleError(new Error(readableError), 'AI识别错误');
              }}
              title="點擊查看詳細錯誤"
              className="bg-red-50 border border-red-200 text-red-600 px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 cursor-help max-w-[140px]"
            >
              <Skeleton className="w-1 h-1 rounded-full bg-red-400 shrink-0" />
              <span className="truncate">
                {aiDebugInfo.error.includes('|') 
                  ? (aiDebugInfo.error.split('|')[2] || aiDebugInfo.error.split('|')[1] || '识别失败') 
                  : aiDebugInfo.error}
              </span>
            </div>
          ) : (
            <div 
              onClick={async () => {
                const nextValue = !formState.isHidden;
                updateForm({ isHidden: nextValue });
                
                // If editing an existing photo, attempt immediate persistence for this toggle
                if (props.editPhotoId) {
                  try {
                    const m = await import('../../services/photoMutationService');
                    await m.updatePhotoHidden(props.editPhotoId, nextValue);
                    
                    // Update local context photos as well
                    setPhotos(prev => prev.map(p => p.id === props.editPhotoId ? { ...p, isHidden: nextValue } : p));
                    toast.success(`已${nextValue ? '隐藏' : '显示'}产品`);
                  } catch (e) {
                    handleError(e, '自动保存可见性失败');
                  }
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border cursor-pointer whitespace-nowrap ${formState.isHidden ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-green-50 border-green-200 text-green-600'}`}
            >
              {formState.isHidden ? <EyeOff size={10} /> : <Eye size={10} />}
              <span className="text-[9px] font-bold uppercase tracking-widest leading-none">{formState.isHidden ? '屏蔽' : '显示'}</span>
            </div>
          )}
        </div>

        {/* Center: Title */}
        <div className="flex-1 flex flex-col items-center justify-center min-w-0 px-2">
          <h2 className="font-black text-sm text-slate-800 tracking-tight leading-tight uppercase truncate w-full text-center">
            {props.editPhotoId ? '编辑产品信息' : '分析新产品'}
          </h2>
          <p className="text-[8px] font-bold text-slate-400 tracking-widest uppercase">Product Details</p>
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
                      handleError(new Error('AI识别上下文缺失'), 'AI识别配置错误');
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
            
            {props.editPhotoId && props.onDelete && (
              <button 
                onClick={() => {
                  setAlertDialog({
                    title: '确定要删除此照片吗？',
                    message: '此操作不可撤销，照片将从云端彻底移除。',
                    onConfirm: () => props.onDelete!(props.editPhotoId!),
                    confirmLabel: '删除',
                    type: 'danger'
                  });
                }}
                className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-red-50 text-red-500 border border-red-100 shadow-sm active:bg-red-100 transition-all font-bold"
                title="删除"
              >
                <Trash2 size={18} />
              </button>
            )}

            <button 
              onClick={async () => {
                const { valid, errors } = validatePhotoForm(formState);
                if (!valid) {
                  handleError(new Error(errors[0]), '表單驗證失敗');
                  return;
                }

                if (isPartOfGroup) {
                  const photo = safeArray<Photo>(photos).find(p => p.id === editPhotoId);
                  if (photo && photo.groupId) {
                     setPhotos(prevPhotos => safeArray<Photo>(prevPhotos).map(p => {
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
              className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl border shadow-sm transition-all ${isSyncing ? 'bg-blue-400 text-white border-blue-400 cursor-wait' : 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20 active:bg-blue-700'}`}
              title="保存"
            >
              {isSyncing ? <Skeleton className="bg-transparent text-white"><RefreshCcw size={18} className="animate-spin" /></Skeleton> : <Save size={18}/>}
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

      <div className="flex-1 overflow-hidden flex flex-col pt-2">
        <Tabs defaultValue="basic" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 pb-2 border-b border-slate-100 bg-white">
            <TabsList className="w-full bg-slate-100/50 p-1 rounded-2xl h-12 flex items-center gap-1 border border-slate-200">
              <TabsTrigger 
                value="basic" 
                className="flex-1 rounded-xl text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all h-full"
              >
                基础 / BASIC
              </TabsTrigger>
              <TabsTrigger 
                value="org" 
                className="flex-1 rounded-xl text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all h-full"
              >
                分类 / ORG
              </TabsTrigger>
              <TabsTrigger 
                value="details" 
                className="flex-1 rounded-xl text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all h-full"
              >
                细节 / DETAIL
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar pt-2">
            <TabsContent value="basic" className="m-0 p-4 space-y-5 animate-in fade-in slide-in-from-left-2 duration-300">
              <div className="flex gap-4 items-start">
                {(props.newPhotoData || props.editPhotoPreview) && (
                  <div className="w-1/3 shrink-0 space-y-2">
                     <div className="aspect-square rounded-2xl overflow-hidden bg-slate-900 shadow-lg border-2 border-white relative">
                        {isProcessingImage && (
                          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
                            <RefreshCcw className="text-white animate-spin" size={24} />
                          </div>
                        )}
                        <img src={props.newPhotoData || props.editPhotoPreview || undefined} className="w-full h-full object-contain" alt="Preview" />
                     </div>
                     <div className="flex gap-2">
                       <button 
                         onClick={rotatePhoto}
                         disabled={isProcessingImage}
                         className="flex-1 text-[10px] font-bold bg-white text-slate-600 p-1.5 rounded-xl border border-slate-200 active:bg-slate-50 disabled:opacity-50"
                       >
                         旋转 90°
                       </button>
                     </div>
                  </div>
                )}
                <div className="flex-1 space-y-3">
                  <div className="space-y-1.5">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">产品名称 / PRODUCT NAME</h3>
                    <input 
                      key={editPhotoId || 'new'}
                      type="text" 
                      placeholder="輸入名稱..." 
                      defaultValue={formState.name} 
                      onBlur={e => updateForm({ name: e.target.value.toUpperCase().trim() })} 
                      className="w-full bg-white border border-slate-200 p-4 rounded-2xl text-base md:text-sm font-bold outline-none focus:border-blue-500 shadow-sm" 
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">編號 / CODE</h3>
                  <input 
                    type="text" 
                    placeholder="編號..." 
                    value={formState.manual_code || ''} 
                    onChange={e => updateForm({ manual_code: e.target.value })} 
                    className="w-full bg-white border border-slate-200 p-4 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 shadow-sm" 
                  />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">型號 / MODEL</h3>
                  <input 
                    type="text" 
                    placeholder="型號..." 
                    value={formState.model_number || ''} 
                    onChange={e => updateForm({ model_number: e.target.value })} 
                    className="w-full bg-white border border-slate-200 p-4 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 shadow-sm" 
                  />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">價格 / PRICE</h3>
                  <input 
                    type="text" 
                    placeholder="價格..." 
                    value={formState.price || ''} 
                    onChange={e => updateForm({ price: e.target.value })} 
                    className="w-full bg-white border border-slate-200 p-4 rounded-2xl text-sm font-bold text-blue-600 outline-none focus:border-blue-500 shadow-sm" 
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="org" className="m-0 p-4 space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
              <section className="space-y-4">
                  <FormSectionHeader title="产品目录" subtitle="CATEGORY *" />
                  <CategoryGrid 
                    categories={categories}
                    selectedId={formState.categoryId}
                    onSelect={(id) => updateForm({ categoryId: id })}
                    appLang={appLang}
                  />
              </section>

              <section className="space-y-2">
                   <PhotoTagSelector 
                      tags={tags}
                      selectedTagIds={safeArray<string>(formState.tagIds)}
                      onChange={(newIds) => updateForm({ tagIds: newIds })}
                      addTag={async (name) => { return await addTag(name); }}
                      updateTag={async (id, name) => { await updateTag(id, name); return true; }}
                      deleteTag={async (id) => { await deleteTag(id); return true; }}
                   />
                </section>

              <section className="space-y-4">
                <FormSectionHeader 
                  title="厂商名称" 
                  subtitle="MANUFACTURER" 
                  onAction={() => {
                    setPromptDialog({
                      title: '新增厂商 / New Manufacturer',
                      placeholder: '输入厂商名称',
                      onSubmit: (name) => addManufacturer(name)
                    })
                  }} 
                />
                <ManufacturerList 
                  manufacturers={manufacturers}
                  selectedId={formState.manufacturerId}
                  onSelect={(id) => updateForm({ manufacturerId: id })}
                  onEdit={(mfr) => {
                      setPromptDialog({
                        title: '编辑生产商 / Edit Manufacturer',
                        placeholder: mfr.name,
                        onSubmit: async (name) => {
                          const trimmed = name.trim();
                          if(trimmed) await updateManufacturer(mfr.id, trimmed);
                        }
                      });
                  }}
                  onDelete={(mfr) => {
                      deleteManufacturer(mfr.id);
                  }}
                />
              </section>
            </TabsContent>

            <TabsContent value="details" className="m-0 p-4 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <DimensionEditor 
                dimensions={safeArray<Dimension>(formState.dimensions)}
                onChange={(newDims) => updateForm({ dimensions: newDims })}
                showAiButton={!!handleSingleAiAnalyze}
                isAnalyzing={isAnalyzing}
                onAiAnalyze={() => {
                  const data = newPhotoData || editPhotoPreview;
                  if (!data) return;
                  if (handleSingleAiAnalyzeCallback) {
                    handleSingleAiAnalyzeCallback(data, formState.categoryId || undefined, editPhotoId || undefined, formState, updateForm, handleSingleAiAnalyze);
                  } else if (handleSingleAiAnalyze) {
                    handleSingleAiAnalyze(data, formState.categoryId || undefined);
                  }
                }}
              />

              <div className="space-y-4">
                <div className="flex items-center justify-between px-1 border-b border-slate-100 pb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">多语言说明 / MULTI-LANG DESCRIPTIONS</span>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black text-slate-400 uppercase px-1">中文说明 / CHINESE</span>
                    <textarea 
                      placeholder="输入中文产品说明..." 
                      value={formState.description_translations?.zh || formState.description || ''} 
                      onChange={e => {
                        const val = e.target.value;
                        updateForm({ 
                          description: val, 
                          description_translations: { ...(formState.description_translations || {}), zh: val } 
                        });
                      }} 
                      className="w-full p-4 rounded-2xl border border-slate-200 bg-white h-32 text-sm font-medium outline-none focus:border-blue-500 shadow-sm" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black text-slate-400 uppercase px-1">English Description</span>
                    <textarea 
                      placeholder="Enter English description..." 
                      value={formState.description_translations?.en || ''} 
                      onChange={e => {
                        const val = e.target.value;
                        updateForm({ 
                          description_translations: { ...(formState.description_translations || {}), en: val } 
                        });
                      }} 
                      className="w-full p-4 rounded-2xl border border-slate-200 bg-white h-32 text-sm font-medium outline-none focus:border-blue-500 shadow-sm" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black text-slate-400 uppercase px-1">Bahasa Melayu</span>
                    <textarea 
                      placeholder="Masukkan penerangan Bahasa Melayu..." 
                      value={formState.description_translations?.ms || ''} 
                      onChange={e => {
                        const val = e.target.value;
                        updateForm({ 
                          description_translations: { ...(formState.description_translations || {}), ms: val } 
                        });
                      }} 
                      className="w-full p-4 rounded-2xl border border-slate-200 bg-white h-32 text-sm font-medium outline-none focus:border-blue-500 shadow-sm" 
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Bottom space */}
        <div className="h-10 shrink-0"></div>
      </div>
    </div>
  );
};
