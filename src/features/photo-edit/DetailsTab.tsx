import React from 'react';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { usePhotoEditSessionContext } from './hooks/PhotoEditSession.js';
import { DimensionEditor } from './DimensionEditor.js';
import { Dimension } from '#src/types/index.js';
import { safeArray } from '#lib/utils.js';
import { usePhoto, useFilters, useTranslation } from '#src/hooks/index.js';
import { feedback } from '#lib/feedback.js';
import { usePhotoEditAI } from './hooks/usePhotoAI.js';
import { MultilingualInput } from '#src/components/shared/MultilingualInput.js';
import { copyToClipboard } from '#src/utils/clipboard.js';

/**
 * DetailsTab
 * 
 * 照片編輯對話框中的詳細信息（尺寸、描述）分頁。
 */
export function DetailsTab() {
  const { form, photoId } = usePhotoEditSessionContext();
  const { t } = useTranslation();
  
  const { data: detailPhoto } = usePhoto(photoId);
  const { handleAiAnalyze, isAnalyzing } = usePhotoEditAI();

  const onAiAnalyze = async () => {
    if (detailPhoto?.imageUrl) {
      try {
        await handleAiAnalyze(undefined, detailPhoto.imageUrl);
        feedback.success(t('analysisSent') || '分析請求已發送');
      } catch (e) {
        ErrorFactory.handle(e as Error, { context: t('aiRecognize') || 'AI 識別' });
      }
    }
  };

  const copyId = async () => {
    if (detailPhoto?.id) {
      const success = await copyToClipboard(detailPhoto.id);
      if (success) {
        feedback.success(t('idCopied') || 'ID 已複製');
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

      <form.Field name="dimensions">
        {({ state, handleChange }) => (
          <DimensionEditor 
            dimensions={safeArray<Dimension>(state.value as Dimension[] | null | undefined)}
            onChange={(newDims) => handleChange(newDims)}
            showAiButton={true}
            isAnalyzing={isAnalyzing}
            onAiAnalyze={onAiAnalyze}
            t={t}
          />
        )}
      </form.Field>

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
