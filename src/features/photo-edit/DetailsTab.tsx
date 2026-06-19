import React from 'react';
import { useWatch } from 'react-hook-form';
import { usePhotoEditSessionContext } from '@/hooks/photo/usePhotoEditSessionContext';
import { DimensionEditor } from './DimensionEditor';
import { ProductFormData, Dimension } from '@/types';
import { safeArray } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { useTasks, usePhoto, useFilters } from '@/hooks';
import { translations } from '@/locales';
import { usePhotoEditAI } from './usePhotoEditAI';

import { MultilingualInput } from '@/components/shared/MultilingualInput';

export function DetailsTab() {
  const { register, control, setValue } = usePhotoEditSessionContext();
  const { modal, photoId } = useFilters();
  const editPhotoId = modal === 'edit' ? photoId : null;
  const appLang = useUIStore((s) => s.appLang);
  const { tasks } = useTasks();
  const { data: detailPhoto } = usePhoto(editPhotoId || '');
  const { handleAiAnalyze } = usePhotoEditAI();

  const isAnalyzing = tasks.some(t => t.status === 'running' && (t.name === 'AI 属性智能识别' || t.name === 'AI 识别'));
  const t = translations[appLang as keyof typeof translations] || translations.en;

  const onAiAnalyze = async () => {
    await handleAiAnalyze(detailPhoto?.image_url, detailPhoto?.image_url);
  };

  const dimensions = useWatch({ control, name: 'dimensions' });
  const updateForm = (updates: Partial<ProductFormData>) => {
    Object.entries(updates).forEach(([key, value]) => {
      setValue(key as any, value, { shouldDirty: true });
    });
  };
  return (
    <div className="m-0 p-4 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <DimensionEditor 
        dimensions={safeArray<Dimension>(dimensions)}
        onChange={(newDims) => updateForm({ dimensions: newDims })}
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
