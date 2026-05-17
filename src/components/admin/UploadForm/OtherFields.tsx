import React from 'react';
import { motion } from 'motion/react';
import { DimensionEditor } from '../edit/DimensionEditor';

export const OtherFields: React.FC<{
  showOtherFields: boolean;
  formState: any;
  updateForm: (updates: any) => void;
  isAnalyzing: boolean;
  editPhotoId: string | null;
  newPhotoData: string | null;
  withLoading: (type: string, fn: () => Promise<any>) => void;
  handleSingleAiAnalyze: (data: string | null, catId?: string) => Promise<any>;
  t: any;
}> = ({ showOtherFields, formState, updateForm, isAnalyzing, editPhotoId, newPhotoData, withLoading, handleSingleAiAnalyze, t }) => {
  return (
    <AnimatePresence>
      {showOtherFields && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden space-y-4 pt-2"
        >
          <DimensionEditor 
            dimensions={formState.dimensions}
            onChange={(newDims: any) => updateForm({ dimensions: newDims })}
            showAiButton={!editPhotoId && !!newPhotoData}
            isAnalyzing={isAnalyzing}
            onAiAnalyze={() => withLoading('analyzing', () => handleSingleAiAnalyze(newPhotoData, formState.categoryId || undefined))}
            t={t}
          />

          <div className="space-y-4">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{t.multiLangDesc}</label>
              {[
                { lang: 'zh', label: t.zhDesc, key: 'zh', val: formState.description_translations?.zh || formState.description || '' },
                { lang: 'en', label: t.enDesc, key: 'en', val: formState.description_translations?.en || '' },
                { lang: 'ms', label: t.msDesc, key: 'ms', val: formState.description_translations?.ms || '' }
              ].map(item => (
                <div key={item.lang} className="space-y-1.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase px-1">{item.label}</span>
                  <textarea 
                    placeholder={t.description} 
                    className="w-full bg-white border border-slate-200 p-4 rounded-2xl text-sm font-medium outline-none focus:border-blue-500 shadow-sm min-h-[60px]"
                    value={item.val}
                    onChange={e => {
                        const val = e.target.value;
                        const updates: any = { description_translations: { ...(formState.description_translations || {}), [item.key]: val } };
                        if (item.key === 'zh') updates.description = val;
                        updateForm(updates);
                    }}
                  />
                </div>
              ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
