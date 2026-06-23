import React from 'react';
import { useField, useFormContext } from "el-form-react-hooks";
import { NativeDialog } from '@/components/ui/NativeDialog';
import { usePhotoEditSessionContext } from '@/hooks/photo/usePhotoEditSessionContext';
import { Icon } from '@/components/ui/Icon';
import { useDisclosure } from '@/hooks/core/useDisclosure';
import { useUI } from '@/lib/store';
import { usePhoto, useTaskExecutor, useTranslation, useFilters } from '@/hooks';
import { useTaskSelector } from '@/lib/store';
import { OptimizedImage } from '@/components/shared/OptimizedImage';
import { showToast } from '@/lib/ui/toast';

import { MultilingualInput } from '@/components/shared/MultilingualInput';

export function BasicInfoTab() {
  const { form } = useFormContext();
  const { value: itemCode } = useField('item_code');
  const { value: nameValue = '' } = useField('name');
  const { value: manualCode = '' } = useField('manual_code');
  const { value: modelNumber = '' } = useField('model_number');
  const { value: price = '' } = useField('price');

  const { uiTranslations: t } = useTranslation();
  
  const { modal, photoId } = useFilters();
  const editPhotoId = modal === 'edit' ? photoId : null;
  const { data: detailPhoto } = usePhoto(editPhotoId || '');
  
  const previewSrc = detailPhoto?.image_url;
  
  const [zoomed, { open: openZoom, close: closeZoom }] = useDisclosure(false);

  // Rotation logic removed as it depended on client-side newPhotoData.
  // Future implementation should use server-side rotation or handle existing photo.
  const onRotate = undefined; 

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
              
              <input 
                type="text" 
                placeholder="NAME..." 
                value={nameValue as string}
                onChange={(e) => form.setValue('name', e.target.value.toUpperCase())}
                className="w-full bg-white border border-slate-200 px-4 py-3 rounded-2xl text-base sm:text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 min-w-0 transition-all" 
              />
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
          <div className="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-2xl text-xs font-mono font-medium text-slate-400 cursor-not-allowed truncate" title={(itemCode as string) || ''}>
            {(itemCode as string) || t.systemCodeAuto}
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
            onClick={() => {
              if (detailPhoto?.id) {
                navigator.clipboard.writeText(detailPhoto.id);
                showToast.success('ID 已复制');
              }
            }}
          >
            {detailPhoto?.id || '---'}
          </div>
        </div>
        <div className="space-y-1.5">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">CODE</h3>
          <input 
            type="text" 
            placeholder="CODE..."
            value={manualCode as string}
            onChange={(e) => form.setValue('manual_code', e.target.value)}
            className="w-full bg-white border border-slate-200 px-4 py-3 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all" 
          />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">MODEL</h3>
          <input 
            type="text" 
            inputMode="numeric"
            placeholder="MODEL..." 
            value={modelNumber as string}
            onChange={(e) => form.setValue('model_number', e.target.value.replace(/\D/g, ''))}
            className="w-full bg-white border border-slate-200 px-4 py-3 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all" 
          />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">PRICE</h3>
          <input 
            type="text" 
            inputMode="numeric"
            placeholder="PRICE..." 
            value={price as string}
            onChange={(e) => form.setValue('price', e.target.value.replace(/\D/g, ''))}
            className="w-full bg-white border border-slate-200 px-4 py-3 rounded-2xl text-sm font-bold text-blue-600 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all" 
          />
        </div>
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
