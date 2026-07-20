import React from 'react';
import { usePhotoEditSessionContext } from './hooks/PhotoEditSession.js';
import { Icon } from '#src/components/ui/Icon.js';
import { useDisclosure } from '#src/hooks/core/index.js';
import { useTranslation, useFilters, usePhoto } from '#src/hooks/index.js';
import { showToast } from '#lib/ui/toast.js';
import { Field } from '@tanstack/react-form';
import { copyToClipboard } from '#src/utils/clipboard.js';
import { PhotoPreviewSection } from './components/PhotoPreviewSection.js';
import { PhotoZoomOverlay } from './components/PhotoZoomOverlay.js';

/**
 * BasicInfoTab
 * 
 * 照片編輯對話框中的基礎信息分頁。
 */
export function BasicInfoTab() {
  const { form, photoId } = usePhotoEditSessionContext();
  const { t } = useTranslation();
  const { data: detailPhoto } = usePhoto(photoId);
  
  const previewSrc = detailPhoto?.imageUrl;
  const [zoomed, { open: openZoom, close: closeZoom }] = useDisclosure(false);

  return (
    <div className="m-0 p-4 space-y-5 animate-in fade-in slide-in-from-left-2 duration-300">
      <div className="flex gap-4 items-start">
        <PhotoPreviewSection 
          previewSrc={previewSrc} 
          imageHash={detailPhoto?.imageHash} 
          onZoom={openZoom} 
        />
        
        <div className="flex-1 space-y-3">
          <div className="space-y-3">
            <div className="space-y-2 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
              <div className="flex items-center px-0.5 border-b border-slate-200/60 pb-1 mb-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{t('productName')}</span>
              </div>
              
              <form.Field name="name">
                {({ state, handleChange }) => (
                  <input 
                    type="text" 
                    placeholder="NAME..." 
                    maxLength={200}
                    value={(state.value as string) || ''}
                    onChange={(e) => handleChange(e.target.value.toUpperCase())}
                    className="w-full bg-white border border-slate-200 h-11 px-4 rounded-xl text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 min-w-0 transition-all" 
                  />
                )}
              </form.Field>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 xl:gap-4">
        {/* SYS CODE */}
        <div className="space-y-1.5 opacity-50 select-none">
          <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter px-1 flex items-center gap-1">
            <Icon name="lock" size={8} className="text-slate-300" />
            SYS CODE
          </h3>
          <div className="w-full bg-slate-50 border border-slate-100 h-11 px-4 rounded-xl text-xs font-mono font-medium text-slate-400 cursor-not-allowed truncate flex items-center">
            {detailPhoto?.itemCode || t('systemCodeAuto')}
          </div>
        </div>

        {/* DB ID */}
        <div className="space-y-1.5 opacity-50">
          <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter px-1 flex items-center gap-1">
            <Icon name="database" size={8} className="text-slate-300" />
            DB ID
          </h3>
          <div 
            className="w-full bg-slate-50 border border-slate-100 h-11 px-4 rounded-xl text-[10px] font-mono font-medium text-slate-400 cursor-help truncate flex items-center" 
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

        {/* Manual Code */}
        <form.Field name="manualCode">
          {({ state, handleChange }) => (
            <div className="space-y-1.5">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">CODE</h3>
              <input 
                type="text" 
                placeholder="CODE..."
                value={(state.value as string) || ''}
                onChange={(e) => handleChange(e.target.value)}
                className="w-full bg-white border border-slate-200 h-11 px-4 rounded-xl text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all" 
              />
            </div>
          )}
        </form.Field>

        {/* Model Number */}
        <form.Field name="modelNumber">
          {({ state, handleChange }) => (
            <div className="space-y-1.5">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">MODEL</h3>
              <input 
                type="text"
                inputMode="numeric"
                placeholder="MODEL..." 
                value={(state.value as string) || ''}
                onChange={(e) => handleChange(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-white border border-slate-200 h-11 px-4 rounded-xl text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all" 
              />
            </div>
          )}
        </form.Field>

        {/* Price */}
        <form.Field name="price">
          {({ state, handleChange }) => (
            <div className="space-y-1.5">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">PRICE</h3>
              <input 
                type="number"
                placeholder="PRICE..." 
                value={(state.value as string) || ''}
                onChange={(e) => handleChange(e.target.value)}
                className="w-full bg-white border border-slate-200 h-11 px-4 rounded-xl text-sm font-bold text-blue-600 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all" 
              />
            </div>
          )}
        </form.Field>
      </div>

      <PhotoZoomOverlay 
        isOpen={zoomed} 
        onClose={closeZoom} 
        previewSrc={previewSrc} 
        imageHash={detailPhoto?.imageHash} 
      />
    </div>
  );
}
