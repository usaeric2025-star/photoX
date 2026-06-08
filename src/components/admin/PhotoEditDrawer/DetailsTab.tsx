import React from 'react';
import { DimensionEditor } from '../edit/DimensionEditor';
import { ProductFormData, Dimension } from '../../../types';
import { PhotoEditFormReturn } from '@/hooks/photo/usePhotoEdit';
import { safeArray } from '../../../lib/utils';
import { useUIStore } from '../../../store';
import { useTasks, useSettings, useTaskExecutor, usePhotoDetail, useAdminActions } from '../../../hooks';
import { translations } from '../../../lib/translations';
import { analyzePhoto } from '@/services/ai/commands';
import { toast } from 'sonner';

interface Props {
  form: PhotoEditFormReturn;
}

export function DetailsTab({ form }: Props) {
  const editPhotoId = useUIStore((s) => s.editPhotoId);
  const appLang = useUIStore((s) => s.appLang);
  const { tasks } = useTasks();
  const { settings } = useSettings();
  const { runTask } = useTaskExecutor();
  const { data: detailPhoto } = usePhotoDetail(editPhotoId || '');
  const { updatePhoto: { mutateAsync: updatePhoto } } = useAdminActions();

  const isAnalyzing = tasks.some(t => t.status === 'running' && t.name === 'AI 属性智能识别');
  const t = translations[appLang as keyof typeof translations] || translations.en;

  const onAiAnalyze = async () => {
    if (!editPhotoId || !settings?.gemini_api_key) {
      toast.error("Google Gemini API Key is required.");
      return;
    }
    await runTask("AI 属性智能识别", async () => {
      const resp = await analyzePhoto(editPhotoId);
      if (resp.ok && resp.data) {
        let result = resp.data;
        if (Array.isArray(result) && result.length > 0) {
          result = result[0];
        }
        
        if (result && typeof result === 'object') {
          const updates: any = {};
          
          if (result.name) {
            updates.name = typeof result.name === 'object' ? result.name : { zh: String(result.name), en: '', ms: '' };
          }
          if (result.category_id !== undefined && result.category_id !== null) {
            const cat = result.category_id;
            if (Array.isArray(cat) && cat.length > 0) {
              const first = cat[0];
              updates.category_id = String(first.id ?? first.category_id ?? first);
            } else if (typeof cat === 'object' && cat !== null) {
              updates.category_id = String(cat.id ?? cat.category_id ?? '');
            } else {
              updates.category_id = String(cat);
            }
            if (updates.category_id === 'undefined' || updates.category_id === 'null' || updates.category_id === '[object Object]') {
              delete updates.category_id;
            }
          }
          if (Array.isArray(result.tag_ids)) {
            updates.tag_ids = result.tag_ids.slice(0, 5).map((id: any) => {
              if (id && typeof id === 'object') {
                return String(id.id ?? id.tag_id ?? id.name ?? '');
              }
              return String(id);
            }).filter((id: string) => id && id !== 'undefined' && id !== 'null' && id !== '[object Object]');
          }
          if (result.description) {
            updates.description = typeof result.description === 'object' ? result.description : { zh: String(result.description), en: '', ms: '' };
          }
          if (Array.isArray(result.dimensions)) {
            updates.dimensions = result.dimensions;
          }
          if (result.price !== undefined && result.price !== null) {
            updates.price = String(result.price);
          }

          form.setValues({ ...form.values, ...updates });

          try {
            await updatePhoto({ id: editPhotoId, updates });
            toast.success(
              appLang === 'zh' 
                ? 'AI 识别完成，已自动保存修改！' 
                : 'AI analysis completed and changes auto-saved!'
            );
          } catch (saveError: any) {
            console.error("Auto-save failed:", saveError);
            toast.warning(
              appLang === 'zh' 
                ? 'AI 识别成功，但自动保存失败（已临时更新至表单）' 
                : 'AI analysis completed but auto-save failed (form values populated).'
            );
          }
        } else {
          throw new Error('AI 返回的格式异常');
        }
      } else {
        throw new Error((resp as any).message || 'AI 属性智能识别失败');
      }
    });
  };

  const formState = form.values;
  const updateForm = (updates: Partial<ProductFormData>) => form.setValues(updates);
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
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">多语言说明 / MULTI-LANG DESCRIPTIONS</span>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <span className="text-[9px] font-black text-slate-400 uppercase px-1">中文说明 / CHINESE</span>
            <textarea 
              placeholder="输入中文产品说明..." 
              value={formState.description?.zh || ''} 
              onChange={e => {
                const val = e.target.value;
                updateForm({ 
                  description: { ...formState.description, zh: val } 
                });
              }} 
              className="w-full p-4 rounded-2xl border border-slate-200 bg-white h-32 text-base sm:text-sm font-medium outline-none focus:border-blue-500 shadow-sm" 
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-[9px] font-black text-slate-400 uppercase px-1">English Description</span>
            <textarea 
              placeholder="Enter English description..." 
              value={formState.description?.en || ''} 
              onChange={e => {
                const val = e.target.value;
                updateForm({ 
                  description: { ...formState.description, en: val } 
                });
              }} 
              className="w-full p-4 rounded-2xl border border-slate-200 bg-white h-32 text-base sm:text-sm font-medium outline-none focus:border-blue-500 shadow-sm" 
            />
          </div>


          <div className="space-y-1.5">
            <span className="text-[9px] font-black text-slate-400 uppercase px-1">Bahasa Melayu</span>
            <textarea 
              placeholder="Masukkan penerangan Bahasa Melayu..." 
              value={formState.description?.ms || ''} 
              onChange={e => {
                const val = e.target.value;
                updateForm({ 
                  description: { ...formState.description, ms: val } 
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
