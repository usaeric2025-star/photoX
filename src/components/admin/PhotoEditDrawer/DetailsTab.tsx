import React from 'react';
import { DimensionEditor } from '../edit/DimensionEditor';
import { UseFormReturnType } from '@mantine/form';
import { ProductFormData, Dimension, TranslationType } from '../../../types';
import { safeArray } from '../../../lib/utils';

interface Props {
  form: UseFormReturnType<ProductFormData>;
  showAiButton: boolean;
  isAnalyzing: boolean;
  onAiAnalyze: () => void;
  t: TranslationType;
}

export function DetailsTab({
  form, showAiButton, isAnalyzing, onAiAnalyze, t
}: Props) {
  const formState = form.values;
  const updateForm = (updates: Partial<ProductFormData>) => form.setValues(updates);
  return (
    <div className="m-0 p-4 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <DimensionEditor 
        dimensions={safeArray<Dimension>(formState.dimensions)}
        onChange={(newDims) => updateForm({ dimensions: newDims })}
        showAiButton={showAiButton}
        isAnalyzing={isAnalyzing}
        onAiAnalyze={onAiAnalyze}
        t={t}
      />

      <div className="space-y-4">
        <div className="flex items-center justify-between px-1 border-b border-slate-100 pb-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">多语言说明 / MULTI-LANG DESCRIPTIONS</span>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <span className="text-[9px] font-black text-slate-400 uppercase px-1">中文说明 / CHINESE</span>
            <textarea 
              placeholder="输入中文产品说明..." 
              value={formState.description_translations?.zh || formState.description || ''} 
              onChange={e => {
                const val = e.target.value;
                updateForm({ 
                  description: val, 
                  description_translations: { ...(formState.description_translations || {}), zh: val } 
                });
              }} 
              className="w-full p-4 rounded-2xl border border-slate-200 bg-white h-32 text-base sm:text-sm font-medium outline-none focus:border-blue-500 shadow-sm" 
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-[9px] font-black text-slate-400 uppercase px-1">English Description</span>
            <textarea 
              placeholder="Enter English description..." 
              value={formState.description_translations?.en || ''} 
              onChange={e => {
                const val = e.target.value;
                updateForm({ 
                  description_translations: { ...(formState.description_translations || {}), en: val } 
                });
              }} 
              className="w-full p-4 rounded-2xl border border-slate-200 bg-white h-32 text-base sm:text-sm font-medium outline-none focus:border-blue-500 shadow-sm" 
            />
          </div>


          <div className="space-y-1.5">
            <span className="text-[9px] font-black text-slate-400 uppercase px-1">Bahasa Melayu</span>
            <textarea 
              placeholder="Masukkan penerangan Bahasa Melayu..." 
              value={formState.description_translations?.ms || ''} 
              onChange={e => {
                const val = e.target.value;
                updateForm({ 
                  description_translations: { ...(formState.description_translations || {}), ms: val } 
                });
              }} 
              className="w-full p-4 rounded-2xl border border-slate-200 bg-white h-32 text-base sm:text-sm font-medium outline-none focus:border-blue-500 shadow-sm" 
            />
          </div>
        </div>
      </div>
    </div>
  );
};
