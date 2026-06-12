import React from 'react';
import { DimensionEditor } from '../edit/DimensionEditor';
import { ProductFormData, Dimension } from '../../../types';
import { PhotoEditFormReturn } from '@/hooks/photo/types';
import { safeArray } from '../../../lib/utils';
import { useUIStore } from '../../../store';
import { useTasks, usePhoto, useAdminMaintenance } from '../../../hooks';
import { translations } from '../../../lib/translations';
import { usePhotoEditAI } from './usePhotoEditAI';

interface Props {
  form: PhotoEditFormReturn;
}

export function DetailsTab({ form }: Props) {
  const editPhotoId = useUIStore((s) => s.editPhotoId);
  const appLang = useUIStore((s) => s.appLang);
  const { tasks } = useTasks();
  const { data: detailPhoto } = usePhoto(editPhotoId || '');
  const { handleAiAnalyze } = usePhotoEditAI(form);

  const isAnalyzing = tasks.some(t => t.status === 'running' && (t.name === 'AI 属性智能识别' || t.name === 'AI 识别'));
  const t = translations[appLang as keyof typeof translations] || translations.en;

  const onAiAnalyze = React.useCallback(async () => {
    await handleAiAnalyze(detailPhoto?.image_url, detailPhoto?.image_url);
  }, [handleAiAnalyze, detailPhoto?.image_url]);

  const formState = form.watch();
  const updateForm = React.useCallback((updates: Partial<ProductFormData>) => {
    Object.entries(updates).forEach(([key, value]) => {
      form.setValue(key as any, value);
    });
  }, [form]);
  return (
    <div className="m-0 p-4 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <DimensionEditor 
        dimensions={safeArray<Dimension>(formState.dimensions)}
        onChange={(newDims) => updateForm({ dimensions: newDims })}
        showAiButton={true}
        isAnalyzing={isAnalyzing}
        onAiAnalyze={onAiAnalyze}
        t={t}
      />

      <div className="space-y-4">
        <div className="flex items-center justify-between px-1 border-b border-slate-100 pb-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">物品说明 / DESCRIPTIONS</span>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <span className="text-[9px] font-black text-slate-400 uppercase px-1">中文 / CHINESE</span>
            <textarea 
              placeholder="输入中文说明..." 
              {...form.register('description.zh')}
              className="w-full p-4 rounded-2xl border border-slate-200 bg-white h-32 text-base sm:text-sm font-medium outline-none focus:border-blue-500 shadow-sm" 
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-[9px] font-black text-slate-400 uppercase px-1">ENGLISH</span>
            <textarea 
              placeholder="English description..." 
              {...form.register('description.en')}
              className="w-full p-4 rounded-2xl border border-slate-200 bg-white h-32 text-base sm:text-sm font-medium outline-none focus:border-blue-500 shadow-sm" 
            />
          </div>


          <div className="space-y-1.5">
            <span className="text-[9px] font-black text-slate-400 uppercase px-1">MALAY</span>
            <textarea 
              placeholder="Penerangan Bahasa Melayu..." 
              {...form.register('description.ms')}
              className="w-full p-4 rounded-2xl border border-slate-200 bg-white h-32 text-base sm:text-sm font-medium outline-none focus:border-blue-500 shadow-sm" 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
