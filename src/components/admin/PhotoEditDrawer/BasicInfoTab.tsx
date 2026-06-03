import React from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { ProductFormData } from '../../../types';

interface Props {
  editPhotoId: string | null;
  formState: ProductFormData;
  updateForm: (updates: Partial<ProductFormData>) => void;
  previewSrc?: string | null;
  isProcessingImage: boolean;
  onRotate: () => void;
}

export function BasicInfoTab({ 
  editPhotoId, formState, updateForm, previewSrc, 
  isProcessingImage, onRotate 
}: Props) {
  return (
    <div className="m-0 p-4 space-y-5 animate-in fade-in slide-in-from-left-2 duration-300">
      <div className="flex gap-4 items-start">
        {previewSrc && (
          <div className="w-1/3 shrink-0 space-y-2">
             <div className="aspect-square rounded-2xl overflow-hidden bg-slate-900 shadow-lg border-2 border-white relative">
                {isProcessingImage && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
                    <Spinner size="md" className="text-white" />
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
          <div className="space-y-1.5">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">产品名称 / PRODUCT NAME</h3>
            <input 
              key={editPhotoId || 'new'}
              type="text" 
              placeholder="輸入名稱..." 
              defaultValue={formState.name} 
              onBlur={e => updateForm({ name: e.target.value.toUpperCase().trim() })} 
              className="w-full bg-white border border-slate-200 p-4 rounded-2xl text-base md:text-sm font-bold outline-none focus:border-blue-500 shadow-sm" 
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <div className="space-y-1.5">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">系统内部编号 / SYSTEM CODE</h3>
          <input 
            type="text" 
            placeholder="系统编号..." 
            value={formState.item_code || ''} 
            onChange={e => updateForm({ item_code: e.target.value })} 
            className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs font-mono font-bold outline-none focus:border-blue-500 shadow-sm opacity-80" 
          />
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
            placeholder="型號..." 
            value={formState.model_number || ''} 
            onChange={e => updateForm({ model_number: e.target.value })} 
            className="w-full bg-white border border-slate-200 p-4 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 shadow-sm" 
          />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">價格 / PRICE</h3>
          <input 
            type="text" 
            placeholder="價格..." 
            value={formState.price || ''} 
            onChange={e => updateForm({ price: e.target.value })} 
            className="w-full bg-white border border-slate-200 p-4 rounded-2xl text-sm font-bold text-blue-600 outline-none focus:border-blue-500 shadow-sm" 
          />
        </div>
      </div>
    </div>
  );
};
