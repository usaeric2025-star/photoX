import React from 'react';
import { EyeOff, Eye, RefreshCcw } from 'lucide-react';
import { ProductFormData, Photo } from '@/types';
import { PhotoTagSelector } from './PhotoTagSelector';
import { FormSectionHeader, CategoryGrid, ManufacturerList } from '../FormShared';
import { useCategoryList, useTagList, useManufacturerList } from '@/hooks';
import { safeArray } from '@/lib/utils';
import { useGalleryStore, useShallow } from '@/store/galleryStore';

interface BatchEditFormProps {
  formState: Partial<ProductFormData>;
  handleUpdateForm: (updates: Partial<ProductFormData>) => void;
  batchIsHiddenApplied: boolean;
  setBatchIsHiddenApplied: (v: boolean) => void;
  quickAddMfr: () => void;
  addTag: (name: string) => Promise<void | string | number | { id: string }>;
  updateTag: (id: string, name: string) => Promise<boolean | void>;
  deleteTag: (id: string) => Promise<boolean | void>;
}

export function BatchEditForm({
  formState,
  handleUpdateForm,
  batchIsHiddenApplied,
  setBatchIsHiddenApplied,
  quickAddMfr,
  addTag,
  updateTag,
  deleteTag
}: BatchEditFormProps) {
  const { data: categories = [] } = useCategoryList();
  const { data: manufacturers = [] } = useManufacturerList();
  const { data: tags = [] } = useTagList();
  const { appLang } = useGalleryStore(useShallow(s => ({ appLang: s.appLang })));

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-3xl">
        <p className="text-[11px] text-blue-700 font-medium leading-relaxed flex items-start gap-2">
          <span className="shrink-0 w-1.5 h-1.5 bg-blue-500 rounded-full mt-1"></span>
          注意：這會更新所有選中照片。僅手動修改的欄位會被套用至所有選取項目。
        </p>
      </div>

      <section className="space-y-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">产品名称 / PRODUCT NAME</h3>
          <input 
            type="text" 
            placeholder="输入统一产品名称..."
            className="w-full bg-white border border-slate-200 p-5 rounded-3xl text-sm outline-none focus:border-blue-500 shadow-sm font-bold placeholder:text-slate-300"
            value={formState.name}
            onChange={(e) => handleUpdateForm({ name: e.target.value })}
          />
      </section>

      <section className="space-y-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">产品编号 / ITEM CODE</h3>
          <input 
            type="text" 
            placeholder="输入统一编号 (如: SK-2024)..."
            className="w-full bg-white border border-slate-200 p-5 rounded-3xl text-sm outline-none focus:border-blue-500 shadow-sm font-bold placeholder:text-slate-300"
            value={formState.manual_code}
            onChange={(e) => handleUpdateForm({ manual_code: e.target.value })}
          />
      </section>

      <section className="space-y-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">型號 / MODEL NUMBER</h3>
          <input 
            type="text" 
            placeholder="输入统一型号编号 (如: MOD-123)..."
            className="w-full bg-white border border-slate-200 p-5 rounded-3xl text-sm outline-none focus:border-blue-500 shadow-sm font-bold placeholder:text-slate-300"
            value={formState.model_number}
            onChange={(e) => handleUpdateForm({ model_number: e.target.value })}
          />
      </section>

      <section className="space-y-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">價格 / PRICE</h3>
          <input 
            type="text" 
            placeholder="输入统一价格..."
            className="w-full bg-white border border-slate-200 p-5 rounded-3xl text-sm outline-none focus:border-blue-500 shadow-sm font-bold placeholder:text-slate-300 text-blue-600"
            value={formState.price}
            onChange={(e) => handleUpdateForm({ price: e.target.value })}
          />
      </section>

      <section className="space-y-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">显示状态 / VISIBILITY</h3>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setBatchIsHiddenApplied(true);
                handleUpdateForm({ is_hidden: false });
              }}
              className={`flex-1 flex flex-col items-center justify-center gap-1 p-4 rounded-2xl border-2 transition-all ${batchIsHiddenApplied && !formState.is_hidden ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-slate-50 text-slate-400 border-slate-100'}`}
            >
              <Eye size={16} />
              <span className="text-[10px] font-black uppercase">全部显示</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setBatchIsHiddenApplied(true);
                handleUpdateForm({ is_hidden: true });
              }}
              className={`flex-1 flex flex-col items-center justify-center gap-1 p-4 rounded-2xl border-2 transition-all ${batchIsHiddenApplied && formState.is_hidden ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-white border-slate-50 text-slate-400 border-slate-100'}`}
            >
              <EyeOff size={16} />
              <span className="text-[10px] font-black uppercase">全部屏蔽</span>
            </button>
            <button
              type="button"
              onClick={() => setBatchIsHiddenApplied(false)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 p-4 rounded-2xl border-2 transition-all ${!batchIsHiddenApplied ? 'bg-slate-100 border-slate-400 text-slate-700' : 'bg-white border-slate-50 text-slate-400 border-slate-100'}`}
            >
              <RefreshCcw size={14} />
              <span className="text-[10px] font-black uppercase">保持现状</span>
            </button>
          </div>
      </section>

      <section className="space-y-4">
        <FormSectionHeader title="产品目录" subtitle="CATEGORY *" />
        <CategoryGrid 
          categories={categories}
          selectedId={formState.category_id || null}
          onSelect={(id) => handleUpdateForm({ category_id: id })}
          appLang={appLang}
        />
      </section>

      <section className="space-y-4">
        <FormSectionHeader 
          title="厂商名称" 
          subtitle="MANUFACTURER" 
          onAction={quickAddMfr} 
        />
        <ManufacturerList 
          manufacturers={manufacturers}
          selectedId={formState?.manufacturer_id || null}
          onSelect={(id) => handleUpdateForm({ manufacturer_id: id })}
        />
      </section>

       <section className="space-y-4">
        <PhotoTagSelector 
          tags={tags}
          selectedTagIds={safeArray<string>(formState.tag_ids)}
          onChange={(newIds) => handleUpdateForm({ tag_ids: newIds })}
          addTag={addTag}
          updateTag={updateTag}
          deleteTag={deleteTag}
        />
      </section>
    </div>
  );
};
