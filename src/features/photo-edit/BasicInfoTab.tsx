import React from 'react';
import { usePhotoEditSessionContext } from '@/hooks/photo/usePhotoEditSessionContext';
import { Icon } from '@/components/ui/Icon';
import { useDisclosure } from '@/hooks/core/useDisclosure';
import { useTranslation, useFilters, usePhoto } from '@/hooks';
import { OptimizedImage } from '@/components/shared/OptimizedImage';
import { showToast } from '@/lib/ui/toast';
import { NativeDialog } from '@/components/ui/NativeDialog';
import { Field } from '@tanstack/react-form';
import { copyToClipboard } from '@/utils/clipboard';

export function BasicInfoTab() {
  const { form } = usePhotoEditSessionContext();
  const { uiTranslations: t } = useTranslation();
  const { modal, photoId } = useFilters();
  const { data: detailPhoto } = usePhoto(modal === 'edit' ? photoId : '');
  
  const previewSrc = detailPhoto?.image_url;
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
                <OptimizedImage src={previewSrc} className="w-full h-full object-contain" alt="Preview" />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <Icon name="maximize-2" className="text-white drop-shadow-md" size={20} />
                </div>
             </div>
          </div>
        )}
        <div className="flex-1 space-y-3">
          <div className="space-y-3">
            <div className="space-y-2 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
              <div className="flex items-center px-0.5 border-b border-slate-200/60 pb-1 mb-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">产品名称 / NAME</span>
              </div>
              
              <Field form={form} name="name">
                {({ state, handleChange }) => (
                  <input 
                    type="text" 
                    placeholder="NAME..." 
                    maxLength={200}
                    value={(state.value as string) || ''}
                    onChange={(e) => handleChange(e.target.value.toUpperCase())}
                    className="w-full bg-white border border-slate-200 px-4 py-3 rounded-2xl text-base sm:text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 min-w-0 transition-all" 
                  />
                )}
              </Field>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 xl:gap-4">
        <div className="space-y-1.5 opacity-50 select-none">
          <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter px-1 flex items-center gap-1">
            <Icon name="lock" size={8} className="text-slate-300" />
            SYSTEM CODE
          </h3>
          <div className="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-2xl text-xs font-mono font-medium text-slate-400 cursor-not-allowed truncate">
            {detailPhoto?.item_code || t.systemCodeAuto}
          </div>
        </div>
        <div className="space-y-1.5 opacity-50 select-none">
          <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter px-1 flex items-center gap-1">
            <Icon name="lock" size={8} className="text-slate-300" />
            DATABASE ID
          </h3>
          <div 
            className="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-2xl text-[10px] font-mono font-medium text-slate-400 cursor-help truncate" 
            title={detailPhoto?.id || ''}
            onClick={async () => {
              if (detailPhoto?.id) {
                const success = await copyToClipboard(detailPhoto.id);
                if (success) showToast.success('ID 已复制');
              }
            }}
          >
            {detailPhoto?.id || '---'}
          </div>
        </div>

        <Field form={form} name="manual_code">
          {({ state, handleChange }) => (
            <div className="space-y-1.5">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">CODE</h3>
              <input 
                type="text" 
                placeholder="CODE..."
                value={(state.value as string) || ''}
                onChange={(e) => handleChange(e.target.value)}
                className="w-full bg-white border border-slate-200 px-4 py-3 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all" 
              />
            </div>
          )}
        </Field>
        <Field form={form} name="model_number">
          {({ state, handleChange }) => (
            <div className="space-y-1.5">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">MODEL</h3>
              <input 
                type="text" 
                inputMode="numeric"
                placeholder="MODEL..." 
                value={(state.value as string) || ''}
                onChange={(e) => handleChange(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-white border border-slate-200 px-4 py-3 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all" 
              />
            </div>
          )}
        </Field>
        <Field form={form} name="price">
          {({ state, handleChange }) => (
            <div className="space-y-1.5">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">PRICE</h3>
              <input 
                type="text" 
                inputMode="numeric"
                placeholder="PRICE..." 
                value={(state.value as string) || ''}
                onChange={(e) => handleChange(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-white border border-slate-200 px-4 py-3 rounded-2xl text-sm font-bold text-blue-600 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all" 
              />
            </div>
          )}
        </Field>
      </div>

      <NativeDialog id="photo-zoom-dialog" open={zoomed && !!previewSrc} onClose={closeZoom} size="screen" hidePadding={true} showCloseButton={false}>
          <div className="relative w-full h-full flex items-center justify-center p-4 lg:p-12 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
            <button 
              onClick={closeZoom}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            >
              <Icon name="x" size={24} />
            </button>
            <OptimizedImage 
              src={previewSrc || undefined} 
              eager
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300" 
              alt="Zoomed" 
            />
          </div>
      </NativeDialog>
    </div>
  );
}
