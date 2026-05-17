import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronRight, Plus, Eye, EyeOff } from 'lucide-react';
import { Category, Tag, ProductFormData, Manufacturer, Dimension } from '../../types';
import { useGalleryStore } from '../../store';
import { useUpdateTagMutation, useDeleteTagMutation, useAddTagMutation } from '../../hooks';
import { PhotoTagSelector } from './edit/PhotoTagSelector';
import { DimensionEditor } from './edit/DimensionEditor';
import { safeArray } from '../../lib/utils';
import { translations, LanguageCode } from '../../lib/translations';

// Subcomponents
import { FormHeader } from './UploadForm/FormHeader';
import { PhotoPreview } from './UploadForm/PhotoPreview';
import { OtherFields } from './UploadForm/OtherFields';

interface UploadFormProps {
  onClose: () => void;
  editPhotoId: string | null;
  newPhotoData: string | null;
  isAnalyzing: boolean;
  handleSingleAiAnalyze: (imageData: string | null, catId?: string) => Promise<any>;
  deletePhoto: (id: string) => void;
  saveNewPhoto: () => void;
  isSyncing: boolean;
  formState: ProductFormData;
  updateForm: (updates: Partial<ProductFormData>) => void;
  showOtherFields: boolean;
  setShowOtherFields: (show: boolean) => void;
  categories: Category[];
  tags: Tag[];
  quickAddSubCategory: () => void;
  quickAddTag: () => void;
  quickAddManufacturer: () => void;
  manufacturers: Manufacturer[];
  aiDebugInfo: { step: string; message: string; error?: string } | null;
  abortAnalysis?: () => void;
}

export const UploadForm: React.FC<UploadFormProps> = (props) => {
  const { appLang, setPromptDialog, setAlertDialog, withLoading } = useGalleryStore();
  const t = translations[appLang as LanguageCode] || translations['zh'];
  const { mutateAsync: addTagMut } = useAddTagMutation();
  const { mutateAsync: updateTagMut } = useUpdateTagMutation();
  const { mutateAsync: deleteTagMut } = useDeleteTagMutation();
  
  const { formState, updateForm, categories, manufacturers, tags, showOtherFields, setShowOtherFields, isAnalyzing, editPhotoId, newPhotoData } = props;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col pt-safe">
      <FormHeader {...props} withLoading={withLoading} setAlertDialog={setAlertDialog} t={t} />

       <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar pb-32">
        <PhotoPreview {...props} />

        <section className="space-y-4">
           <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{t.code} / CODE</h3>
                  <input type="text" placeholder={`${t.code}...`} value={formState.manual_code} onChange={e => updateForm({ manual_code: e.target.value })} className="w-full bg-white border border-slate-200 p-4 rounded-[20px] text-sm font-bold shadow-sm" />
              </div>
              <div className="space-y-2">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{t.model} / MODEL</h3>
                  <input type="text" placeholder={t.aiAnalyzing} value={formState.model_number} onChange={e => updateForm({ model_number: e.target.value })} className="w-full bg-white border border-slate-200 p-4 rounded-[20px] text-sm font-bold shadow-sm" />
              </div>
           </div>
           <div className="space-y-2">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{t.productName} / NAME</h3>
                <input type="text" placeholder={t.productName} value={formState.name} onChange={e => updateForm({ name: e.target.value.toUpperCase() })} className="w-full bg-white border border-slate-200 p-4 rounded-[20px] text-sm font-black shadow-sm" />
           </div>
           <div className="space-y-2">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{t.price} / PRICE</h3>
                <input type="text" placeholder={t.price} value={formState.price} onChange={e => updateForm({ price: e.target.value })} className="w-full bg-white border border-slate-200 p-4 rounded-[20px] text-sm font-black shadow-sm text-blue-600" />
           </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{t.category} / CATEGORY *</h3>
          <div className="grid grid-cols-3 gap-2">
            {safeArray(categories).filter(c => c.name && c.name.trim()).map((cat: Category) => {
              const displayName = appLang === 'zh' ? (cat.zh || cat.name) : appLang === 'ms' ? (cat.ms || cat.name) : (cat.en || cat.name);
              return (
              <button 
                key={cat.id}
                onClick={() => { updateForm({ categoryId: cat.id }); }}
                className={`p-3 rounded-2xl border-2 text-center transition-all ${formState.categoryId === cat.id ? 'bg-blue-600 border-blue-600 shadow-lg' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200 active:bg-slate-50'}`}
              >
                <span className={`font-black block text-xs tracking-tight ${formState.categoryId === cat.id ? 'text-white' : 'text-slate-800'}`}>{displayName}</span>
              </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between pl-1">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{t.manufacturer} / MANUFACTURER</h3>
          </div>
          <div className="flex flex-wrap gap-2 p-1">
            {safeArray(manufacturers).map((mfr: Manufacturer) => (
              <button 
                key={mfr.id}
                onClick={() => updateForm({ manufacturerId: String(mfr.id) })}
                className={`px-5 py-2.5 rounded-full border text-xs font-bold transition-all ${String(formState?.manufacturerId) === String(mfr.id) ? 'bg-slate-800 border-slate-800 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-600 shadow-sm active:bg-slate-50'}`}
              >
                {mfr.name}
              </button>
            ))}
            <button onClick={props.quickAddManufacturer} className="px-4 py-2 rounded-full border border-dashed border-slate-300 text-slate-400 text-xs flex items-center gap-2 font-bold hover:border-slate-400 hover:text-slate-600 transition-all active:bg-slate-50">
              <Plus size={14} /> 新增
            </button>
          </div>
        </section>

        <section className="space-y-4">
          <PhotoTagSelector 
            tags={tags}
            selectedTagIds={safeArray<string>(formState.tagIds)}
            onChange={(newIds) => updateForm({ tagIds: newIds })}
            addTag={async (name) => { return await addTagMut(name); }}
            updateTag={async (id, name) => { await updateTagMut({ id, name }); return true; }}
            deleteTag={async (id) => { await deleteTagMut(id); return true; }}
          />
        </section>

        <section className="space-y-4">
          <button 
            onClick={() => setShowOtherFields(!showOtherFields)}
            className="w-full flex items-center justify-between p-5 bg-white border border-slate-200 rounded-3xl text-sm font-bold text-slate-800 shadow-sm active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className={`p-1 rounded-full bg-slate-100 text-slate-500 transition-transform duration-300 ${showOtherFields ? 'rotate-90' : ''}`}>
                <ChevronRight size={16} />
              </div>
              <span>{t.others} / OTHERS</span>
            </div>
            <div className="w-2 h-2 rounded-full bg-slate-200"></div>
          </button>
          <OtherFields {...props} withLoading={withLoading} t={t} />
        </section>
      </div>
    </div>
  );
};
