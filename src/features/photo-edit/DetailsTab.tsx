import React from 'react';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { usePhotoEditSessionContext } from '#src/hooks/photo/usePhotoEditSessionContext.js';
import { DimensionEditor } from './DimensionEditor.js';
import { Dimension } from '#src/types/index.js';
import { safeArray } from '#lib/utils.js';
import { useUI, useSignal } from '#lib/store/index.js';
import { usePhoto, useFilters, useTranslation } from '#src/hooks/index.js';
import { showToast } from '#lib/ui/toast.js';
import { usePhotoEditAI } from '#src/hooks/index.js';
import { AppField } from '#lib/forms/AppField.js';
import { MultilingualInput } from '#src/components/shared/MultilingualInput.js';
import { copyToClipboard } from '#src/utils/clipboard.js';

export function DetailsTab() {
  const { form } = usePhotoEditSessionContext();
  const { modal, photoId } = useFilters();
  const appLang = useUI((s) => s.appLang);
  
  
  const { data: detailPhoto } = usePhoto(modal === 'edit' ? photoId : '');
  const { handleAiAnalyze, isAnalyzing } = usePhotoEditAI();

  const { t } = useTranslation();

  const onAiAnalyze = async () => {
    if (detailPhoto?.imageUrl) {
      try {
        await handleAiAnalyze(undefined, detailPhoto.imageUrl);
        showToast.success(t('analysisSent'));
      } catch (e) {
        ErrorFactory.handle(e, { context: t('aiRecognize') });
      }
    }
  };

  const copyId = async () => {
    if (detailPhoto?.id) {
      const success = await copyToClipboard(detailPhoto.id);
      if (success) {
        showToast.success(t('idCopied'));
      }
    }
  };
  
  return (
    <div className="m-0 p-4 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between px-1">
        <div 
          className="flex items-center gap-1.5 cursor-help group" 
          title={detailPhoto?.id || ''}
          onClick={copyId}
        >
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">UUID</span>
          <span className="text-[10px] font-mono text-slate-400 group-hover:text-slate-600 transition-colors">
            {detailPhoto?.id?.slice(0, 8)}...
          </span>
        </div>
      </div>

      <AppField form={form} name="dimensions">
        {({ value, onChange }) => (
          <DimensionEditor 
            dimensions={safeArray<Dimension>(value as Dimension[] | null | undefined)}
            onChange={(newDims) => onChange(newDims)}
            showAiButton={true}
            isAnalyzing={isAnalyzing}
            onAiAnalyze={onAiAnalyze}
            t={t}
          />
        )}
      </AppField>

      <div className="space-y-4">
        <div className="flex items-center px-1 border-b border-slate-100 pb-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">物品说明 / DESCRIPTION</span>
        </div>

        <div className="space-y-4">
          <MultilingualInput form={form} name="description" type="textarea" />
        </div>
      </div>
    </div>
  );
}
