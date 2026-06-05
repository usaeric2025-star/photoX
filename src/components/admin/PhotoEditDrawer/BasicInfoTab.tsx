import React from 'react';
import { Lock, Loader2 } from 'lucide-react';
import { UseFormReturnType } from '@mantine/form';
import { ProductFormData } from '../../../types';

interface Props {
  editPhotoId: string | null;
  form: UseFormReturnType<ProductFormData>;
  previewSrc?: string | null;
  isProcessingImage: boolean;
  onRotate: () => void;
}

export function BasicInfoTab({ 
  editPhotoId, form, previewSrc, 
  isProcessingImage, onRotate 
}: Props) {
  const formState = form.values;
  const updateForm = (updates: Partial<ProductFormData>) => form.setValues(updates);
  return (
    <div className="m-0 p-4 space-y-5 animate-in fade-in slide-in-from-left-2 duration-300">
      <div className="flex gap-4 items-start">
        {previewSrc && (
          <div className="w-1/3 shrink-0 space-y-2">
             <div className="aspect-square rounded-2xl overflow-hidden bg-slate-900 shadow-lg border-2 border-white relative">
                {isProcessingImage && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
                    <Loader2 size={24} className="text-white animate-spin" />
                  </div>
                )}
                <img src={previewSrc} className="w-full h-full object-contain" alt="Preview" />
             </div>
             <div className="flex gap-2">
               <button 
                 onClick={onRotate}
                 disabled={isProcessingImage}
                 className="flex-1 text-[10px] font-bold bg-white text-slate-600 p-1.5 rounded-xl border border-slate-200 active:bg-slate-50 disabled:opacity-50"
               >
                 旋转 90°
               </button>
             </div>
          </div>
        )}
        <div className="flex-1 space-y-3">
          <div className="space-y-3">
            {/* ZH Name */}
            <div className="space-y-1.5">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">产品名称 (中文 / ZH)</h3>
              <input 
                key={editPhotoId || 'new'}
                type="text" 
                placeholder="輸入名稱..." 
                value={formState.name?.zh || ""} 
                onChange={e => updateForm({ name: { ...formState.name, zh: e.target.value.toUpperCase().trim() } })} 
                className="w-full bg-white border border-slate-200 p-4 rounded-2xl text-base md:text-sm font-bold outline-none focus:border-blue-500 shadow-sm" 
              />
            </div>

            {/* EN Name */}
            <div className="space-y-1.5">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Product Name (EN)</h3>
              <input 
                type="text" 
                placeholder="Enter name..." 
                value={formState.name?.en || ""} 
                onChange={e => updateForm({ name: { ...formState.name, en: e.target.value.toUpperCase().trim() } })} 
                className="w-full bg-white border border-slate-200 p-4 rounded-2xl text-base md:text-sm font-bold outline-none focus:border-blue-500 shadow-sm" 
              />
            </div>

            {/* MS Name */}
            <div className="space-y-1.5">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Nama Produk (MS)</h3>
              <input 
                type="text" 
                placeholder="Masukkan nama..." 
                value={formState.name?.ms || ""} 
                onChange={e => updateForm({ name: { ...formState.name, ms: e.target.value.toUpperCase().trim() } })} 
                className="w-full bg-white border border-slate-200 p-4 rounded-2xl text-base md:text-sm font-bold outline-none focus:border-blue-500 shadow-sm" 
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <div className="space-y-1.5 opacity-50 select-none">
          <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter px-1 flex items-center gap-1">
            <Lock size={8} className="text-slate-300" />
            系统内部编号 / SYSTEM CODE
          </h3>
          <div className="w-full bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[10px] font-mono font-medium text-slate-400 shadow-sm cursor-not-allowed">
            {formState.item_code || '自动生成中...'}
          </div>
        </div>
        <div className="space-y-1.5">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">价格编号 / CODE</h3>
          <input 
            type="text" 
            placeholder="編號..." 
            value={formState.manual_code || ''} 
            onChange={e => updateForm({ manual_code: e.target.value })} 
            className="w-full bg-white border border-slate-200 p-4 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 shadow-sm" 
          />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">型號 / MODEL</h3>
          <input 
            type="text" 
            inputMode="numeric"
            placeholder="仅限数字..." 
            value={formState.model_number || ''} 
            onChange={e => {
              const val = e.target.value.replace(/\D/g, '');
              updateForm({ model_number: val });
            }} 
            className="w-full bg-white border border-slate-200 p-4 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 shadow-sm" 
          />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">價格 / PRICE</h3>
          <input 
            type="text" 
            inputMode="numeric"
            placeholder="0" 
            value={formState.price || ''} 
            onChange={e => {
              const val = e.target.value.replace(/\D/g, '');
              updateForm({ price: val });
            }} 
            className="w-full bg-white border border-slate-200 p-4 rounded-2xl text-sm font-bold text-blue-600 outline-none focus:border-blue-500 shadow-sm" 
          />
        </div>
      </div>
    </div>
  );
};
