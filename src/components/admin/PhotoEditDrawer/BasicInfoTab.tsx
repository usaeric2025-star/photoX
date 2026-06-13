import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { usePhotoEditSessionContext } from '@/hooks/photo/usePhotoEditSessionContext';
import { Lock, Loader2, Maximize2, X } from 'lucide-react';
import { useDisclosure } from '@/hooks/core/useDisclosure';
import { useUIStore } from '../../../store';
import { usePhoto, useTaskExecutor, useTasks, useTranslation } from '../../../hooks';
import { OptimizedImage } from '@/components/shared/OptimizedImage';

export function BasicInfoTab() {
  const { register, watch, setValue } = usePhotoEditSessionContext();
  const formState = watch();
  const { uiTranslations: t } = useTranslation();
  
  const editPhotoId = useUIStore((s) => s.editPhotoId);
  const newPhotoData = useUIStore((s) => s.newPhotoData);
  const update = useUIStore((s) => s.update);
  const { data: detailPhoto } = usePhoto(editPhotoId || '');
  const { runTask } = useTaskExecutor();
  const { tasks } = useTasks();
  
  const previewSrc = newPhotoData || detailPhoto?.image_url;
  const isProcessingImage = tasks.some(t => t.status === 'running' && t.name === '旋转图片');

  const onRotate = React.useCallback(async () => {
    if (!previewSrc) return;

    await runTask('旋转图片', async () => {
      const img = new Image();
      let finalSrc = previewSrc;
      if (previewSrc.startsWith('http')) {
        img.crossOrigin = 'anonymous';
        finalSrc = previewSrc + (previewSrc.indexOf('?') >= 0 ? '&' : '?') + 't=' + Date.now();
      }
      img.src = finalSrc;
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('图片加载失败'));
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = img.height;
      canvas.height = img.width;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      const newData = canvas.toDataURL('image/jpeg', 0.95);
      update({ newPhotoData: newData });
    }, { silent: true });
  }, [previewSrc, runTask, update]);

  const [zoomed, { open: openZoom, close: closeZoom }] = useDisclosure(false);

  return (
    <div className="m-0 p-4 space-y-5 animate-in fade-in slide-in-from-left-2 duration-300">
      <div className="flex gap-4 items-start">
        {previewSrc && (
          <div className="w-1/3 shrink-0 space-y-2">
             <div 
               className="aspect-square rounded-2xl overflow-hidden bg-slate-900 shadow-lg border-2 border-white relative group cursor-zoom-in"
               onClick={openZoom}
             >
                {isProcessingImage && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Loader2 size={24} className="text-white animate-spin" />
                  </div>
                )}
                <OptimizedImage src={previewSrc} className="w-full h-full object-contain" alt="Preview" />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Maximize2 className="text-white drop-shadow-md" size={20} />
                </div>
             </div>
             <div className="flex gap-2">
               <button 
                 onClick={onRotate}
                 disabled={isProcessingImage}
                 className="flex-1 text-[10px] font-bold bg-white text-slate-600 p-1.5 rounded-xl border border-slate-200 active:bg-slate-50 disabled:opacity-50"
               >
                 旋转 90°
               </button>
             </div>
          </div>
        )}
        <div className="flex-1 space-y-3">
          <div className="space-y-3">
            <div className="space-y-2 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
              <div className="flex items-center px-0.5 border-b border-slate-200/60 pb-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">产品名称翻译 / TRANSLATIONS</span>
              </div>
              
              <div className="grid grid-cols-[auto_1fr] gap-2 items-center text-xs">
                {/* Chinese */}
                <div className="text-[9px] font-bold bg-slate-200 text-slate-700 px-1.5 py-1 rounded-md uppercase tracking-wider text-center w-10">ZH</div>
                <input 
                  type="text" 
                  placeholder={t.productNamePlaceholderZh} 
                  {...register('name.zh', {
                    setValueAs: (value) => value?.toUpperCase()
                  })}
                  className="w-full bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg font-bold outline-none focus:border-blue-500 shadow-sm min-w-0" 
                />

                {/* English */}
                <div className="text-[9px] font-bold bg-blue-50 text-blue-600 px-1.5 py-1 rounded-md uppercase tracking-wider text-center w-10 border border-blue-100/50">EN</div>
                <input 
                  type="text" 
                  placeholder={t.productNamePlaceholderEn} 
                  {...register('name.en', {
                    setValueAs: (value) => value?.toUpperCase()
                  })}
                  className="w-full bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg font-bold outline-none focus:border-blue-500 shadow-sm min-w-0" 
                />

                {/* Malay */}
                <div className="text-[9px] font-bold bg-emerald-50 text-emerald-600 px-1.5 py-1 rounded-md uppercase tracking-wider text-center w-10 border border-emerald-100/50">MS</div>
                <input 
                  type="text" 
                  placeholder={t.productNamePlaceholderMs} 
                  {...register('name.ms', {
                    setValueAs: (value) => value?.toUpperCase()
                  })}
                  className="w-full bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg font-bold outline-none focus:border-blue-500 shadow-sm min-w-0" 
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 xl:gap-4">
        <div className="space-y-1.5 opacity-50 select-none">
          <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter px-1 flex items-center gap-1">
            <Lock size={8} className="text-slate-300" />
            系统内部编号 / SYSTEM CODE
          </h3>
          <div className="w-full bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[10px] font-mono font-medium text-slate-400 shadow-sm cursor-not-allowed">
            {formState.item_code || t.systemCodeAuto}
          </div>
        </div>
        <div className="space-y-1.5">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">价格编号 / CODE</h3>
          <input 
            type="text" 
            placeholder={t.itemCodePlaceholder} 
            {...register('item_code')}
            className="w-full bg-white border border-slate-200 p-4 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 shadow-sm" 
          />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">型號 / MODEL</h3>
          <input 
            type="text" 
            inputMode="numeric"
            placeholder={t.modelNumberPlaceholder} 
            {...register('model_number', {
              setValueAs: (value) => value?.replace(/\D/g, '')
            })}
            className="w-full bg-white border border-slate-200 p-4 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 shadow-sm" 
          />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">價格 / PRICE</h3>
          <input 
            type="text" 
            inputMode="numeric"
            placeholder={t.pricePlaceholder} 
            {...register('price', {
              setValueAs: (value) => value?.replace(/\D/g, '')
            })}
            className="w-full bg-white border border-slate-200 p-4 rounded-2xl text-sm font-bold text-blue-600 outline-none focus:border-blue-500 shadow-sm" 
          />
        </div>
      </div>

      <Modal open={zoomed && !!previewSrc} onClose={closeZoom} size="screen" hidePadding={true}>
          <div className="relative w-full h-full flex items-center justify-center p-4 lg:p-12 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
            <button 
              onClick={closeZoom}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            >
              <X size={24} />
            </button>
            <OptimizedImage 
              src={previewSrc || ''} 
              eager
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300" 
              alt="Zoomed" 
            />
          </div>
      </Modal>
    </div>
  );
}
