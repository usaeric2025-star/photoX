import React from 'react';
import { usePhotoEditSessionContext } from '@/hooks/photo/usePhotoEditSessionContext';
import { DimensionEditor } from './DimensionEditor';
import { Dimension } from '@/types';
import { safeArray } from '@/lib/utils';
import { useUI } from '@/lib/store';
import { usePhoto, useFilters } from '@/hooks';
import { useTaskSelector } from '@/lib/store';
import { showToast } from '@/lib/ui/toast';
import { translations } from '@/locales';
import { usePhotoEditAI } from './usePhotoEditAI';
import { AIStatusBadge } from '@/components/ui/AIStatusBadge';
import { AppField } from '@/lib/form/AppField';
import { MultilingualInput } from '@/components/shared/MultilingualInput';

export function DetailsTab() {
  const { form } = usePhotoEditSessionContext();
  const { modal, photoId } = useFilters();
  const appLang = useUI((s) => s.appLang);
  const tasksMap = useTaskSelector(s => s.tasks);
  const tasks = React.useMemo(() => Array.from(tasksMap.values()), [tasksMap]);
  const { data: detailPhoto } = usePhoto(modal === 'edit' ? photoId : '');
  const { handleAiAnalyze } = usePhotoEditAI();

  const isAnalyzing = tasks.some(t => t.state?.status === 'processing' && (t.label === 'AI 属性智能识别' || t.label === 'AI 识别'));
  const t = translations[appLang as keyof typeof translations] || translations.en;

  const onAiAnalyze = async () => {
    if (detailPhoto?.image_url) {
      await handleAiAnalyze(undefined, detailPhoto.image_url);
    }
  };

  const copyId = () => {
    if (detailPhoto?.id) {
      navigator.clipboard.writeText(detailPhoto.id);
      showToast.success(appLang === 'zh' ? 'ID 已复制' : 'ID Copied');
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
        <AIStatusBadge />
      </div>

      <AppField name="dimensions">
        {({ value, onChange }) => (
          <DimensionEditor 
            dimensions={safeArray<Dimension>(value as any)}
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
