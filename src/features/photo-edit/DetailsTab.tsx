import React from 'react';
import { useField, useFormContext } from "el-form-react-hooks";
import { DimensionEditor } from './DimensionEditor';
import { Dimension } from '@/types';
import { safeArray } from '@/lib/utils';
import { useUI } from '@/lib/store';
import { usePhoto, useFilters } from '@/hooks';
import { useTaskSelector } from '@/lib/task-queue/store';
import { showToast } from '@/lib/ui/toast';
import { translations } from '@/locales';
import { usePhotoEditAI } from './usePhotoEditAI';

import { MultilingualInput } from '@/components/shared/MultilingualInput';

export function DetailsTab() {
  const { form } = useFormContext();
  const { modal, photoId } = useFilters();
  const editPhotoId = modal === 'edit' ? photoId : null;
  const appLang = useUI((s) => s.appLang);
  const tasks = useTaskSelector(s => Array.from(s.tasks.values()));
  const { data: detailPhoto } = usePhoto(editPhotoId || '');
  const { handleAiAnalyze } = usePhotoEditAI();

  const isAnalyzing = tasks.some(t => t.state?.status === 'processing' && (t.label === 'AI 属性智能识别' || t.label === 'AI 识别'));
  const t = translations[appLang as keyof typeof translations] || translations.en;

  const onAiAnalyze = async () => {
    await handleAiAnalyze(detailPhoto?.image_url, detailPhoto?.image_url);
  };

  const copyId = () => {
    if (detailPhoto?.id) {
      navigator.clipboard.writeText(detailPhoto.id);
      showToast.success(appLang === 'zh' ? 'ID 已复制' : 'ID Copied');
    }
  };

  const { value: dimensions } = useField('dimensions');
  
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

      <DimensionEditor 
        dimensions={safeArray<Dimension>(dimensions as any)}
        onChange={(newDims) => form.setValue('dimensions', newDims)}
        showAiButton={true}
        isAnalyzing={isAnalyzing}
        onAiAnalyze={onAiAnalyze}
        t={t}
      />

      <div className="space-y-4">
        <div className="flex items-center px-1 border-b border-slate-100 pb-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">物品说明 / DESCRIPTION</span>
        </div>

        <div className="space-y-4">
          <MultilingualInput name="description" type="textarea" />
        </div>
      </div>
    </div>
  );
}
