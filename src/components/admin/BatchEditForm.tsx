import React from "react";
import { EyeOff, Eye, RefreshCcw } from "lucide-react";
import { ProductFormData } from "@/types";
import { FormSectionHeader, CategoryGrid, ManufacturerList } from "./FormShared";
import { PhotoTagSelector } from "./edit/PhotoTagSelector";
import { getTagIds, getTagsFromIds } from "@/services/photo/utils";
import { useCategories, useTags, useManufacturers } from "@/hooks";
import { useUIStore } from "@/store/useUIStore";

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
  deleteTag,
}: BatchEditFormProps) {
  const { data: categories = [] } = useCategories();
  const { data: manufacturers = [] } = useManufacturers();
  const { data: tags = [] } = useTags();
  const appLang = useUIStore((s) => s.appLang);

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-3xl">
        <p className="text-[11px] text-blue-700 font-medium leading-relaxed flex items-start gap-2">
          <span className="shrink-0 w-1.5 h-1.5 bg-blue-500 rounded-full mt-1"></span>
          注意：這會更新所有選中照片。僅手動修改的欄位會被套用至所有選取項目。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ProductInputSection label="产品名称 / PRODUCT NAME" placeholder="输入统一产品名称..." value={typeof formState.name === 'object' ? (formState.name.zh || '') : (formState.name || '')} onChange={(v) => handleUpdateForm({ name: { zh: v, en: v, ms: v } })} />
        <ProductInputSection label="产品编号 / ITEM CODE" placeholder="输入统一编号 (如: SK-2024)..." value={formState.manual_code} onChange={(v) => handleUpdateForm({ manual_code: v })} />
        <ProductInputSection label="型號 / MODEL NUMBER" placeholder="输入统一型号编号 (如: MOD-123)..." value={formState.model_number} onChange={(v) => handleUpdateForm({ model_number: v })} />
        <ProductInputSection label="價格 / PRICE" placeholder="输入统一价格..." value={formState.price} onChange={(v) => handleUpdateForm({ price: v })} className="text-blue-600" />
      </div>

      <VisibilitySection 
        batchIsHiddenApplied={batchIsHiddenApplied} 
        setBatchIsHiddenApplied={setBatchIsHiddenApplied} 
        is_hidden={formState.is_hidden} 
        handleUpdateForm={handleUpdateForm} 
      />

      <section className="space-y-4">
        <FormSectionHeader title="产品目录" subtitle="CATEGORY *" />
        <CategoryGrid categories={categories} selectedId={formState.category_id || null} onSelect={(id) => handleUpdateForm({ category_id: id ? String(id) : null })} appLang={appLang} />
      </section>

      <section className="space-y-4">
        <FormSectionHeader title="厂商名称" subtitle="MANUFACTURER" onAction={quickAddMfr} />
        <ManufacturerList manufacturers={manufacturers} selectedId={formState?.manufacturer_id || null} onSelect={(id) => handleUpdateForm({ manufacturer_id: id ? String(id) : null })} />
      </section>

      <section className="space-y-4">
        <PhotoTagSelector
          name="tags"
          tags={tags}
          value={formState.tags?.map(t => typeof t === 'object' ? t.id : t) || []}
          onChange={(newTagIds) => handleUpdateForm({ tags: newTagIds as any })}
          addTag={addTag}
          updateTag={updateTag}
          deleteTag={deleteTag}
        />
      </section>
    </div>
  );
}

function ProductInputSection({ label, placeholder, value, onChange, className = "" }: { label: string, placeholder: string, value: any, onChange: (v: string) => void, className?: string }) {
  return (
    <section className="space-y-4">
      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{label}</h3>
      <input
        type="text"
        placeholder={placeholder}
        className={`w-full bg-white border border-slate-200 p-5 rounded-3xl text-sm outline-none focus:border-blue-500 shadow-sm font-bold placeholder:text-slate-300 ${className}`}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </section>
  );
}

function VisibilitySection({ batchIsHiddenApplied, setBatchIsHiddenApplied, is_hidden, handleUpdateForm }: any) {
  return (
    <section className="space-y-4">
      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">显示状态 / VISIBILITY</h3>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => { setBatchIsHiddenApplied(true); handleUpdateForm({ is_hidden: false }); }}
          className={`flex-1 flex flex-col items-center justify-center gap-1 p-4 rounded-2xl border-2 transition-all ${batchIsHiddenApplied && !is_hidden ? "bg-green-50 border-green-500 text-green-700" : "bg-white border-slate-50 text-slate-400 border-slate-100"}`}
        >
          <Eye size={16} /><span className="text-[10px] font-black uppercase">全部显示</span>
        </button>
        <button
          type="button"
          onClick={() => { setBatchIsHiddenApplied(true); handleUpdateForm({ is_hidden: true }); }}
          className={`flex-1 flex flex-col items-center justify-center gap-1 p-4 rounded-2xl border-2 transition-all ${batchIsHiddenApplied && is_hidden ? "bg-orange-50 border-orange-500 text-orange-700" : "bg-white border-slate-50 text-slate-400 border-slate-100"}`}
        >
          <EyeOff size={16} /><span className="text-[10px] font-black uppercase">全部屏蔽</span>
        </button>
        <button
          type="button"
          onClick={() => setBatchIsHiddenApplied(false)}
          className={`flex-1 flex flex-col items-center justify-center gap-1 p-4 rounded-2xl border-2 transition-all ${!batchIsHiddenApplied ? "bg-slate-100 border-slate-400 text-slate-700" : "bg-white border-slate-50 text-slate-400 border-slate-100"}`}
        >
          <RefreshCcw size={14} /><span className="text-[10px] font-black uppercase">保持现状</span>
        </button>
      </div>
    </section>
  );
}
