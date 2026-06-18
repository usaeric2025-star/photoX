import React, { useState } from "react";
import { EyeOff, Eye, RefreshCcw } from "lucide-react";
import { ProductFormData, Tag } from "@/types";
import { FormSectionHeader, CategoryGrid } from "@/components/admin/FormShared";
import { ManufacturerTagSelect } from "@/components/admin/ManufacturerTagSelect";
import { PhotoTagSelector } from '@/features/photo-edit';
import { useCategories, useTags, useManufacturers } from "@/hooks";
import { useUIStore } from "@/store/useUIStore";
import { Tabs } from "@/components/shared/Tabs";

interface BatchEditFormProps {
  formState: Partial<ProductFormData>;
  handleUpdateForm: (updates: Partial<ProductFormData>) => void;
  batchIsHiddenApplied: boolean;
  setBatchIsHiddenApplied: (v: boolean) => void;
  quickAddMfr: () => void;
  addTag: (name: string) => Promise<string | null>;
  updateTag: (id: string, name: string) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
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

  const [activeTab, setActiveTab ] = useState('basic');

  const tabs = [
    { id: 'basic', label: appLang === 'zh' ? '基础' : 'BASIC' },
    { id: 'org', label: appLang === 'zh' ? '组织' : 'ORG' },
  ];

  return (
    <Tabs
      tabs={tabs}
      activeTab={activeTab}
      onChange={setActiveTab}
      className="flex-1 flex flex-col overflow-hidden bg-transparent"
      contentClassName="pt-2 no-scrollbar"
    >
      <div className="mx-8 xl:mx-12 mt-4 bg-blue-50 border border-blue-100 p-4 rounded-3xl">
        <p className="text-[11px] text-blue-700 font-medium leading-relaxed flex items-start gap-2">
          <span className="shrink-0 w-1.5 h-1.5 bg-blue-500 rounded-full mt-1"></span>
          注意：僅手動修改的欄位會被套用至所有選取項目。(Only edited fields will be updated).
        </p>
      </div>

      {activeTab === 'basic' && (
        <div className="px-8 xl:px-12 py-6 space-y-6 pb-24">
          <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
            <div className="flex items-center px-0.5 border-b border-slate-200/60 pb-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">产品名称翻译 / TRANSLATIONS</span>
            </div>
            
            <div className="grid grid-cols-[auto_1fr] gap-3 items-center text-xs">
              <div className="text-[9px] font-bold bg-slate-200 text-slate-700 px-1.5 py-1.5 rounded-md uppercase tracking-wider text-center w-10">NAME</div>
              <input 
                type="text" 
                placeholder="统一名称..." 
                value={typeof formState.name === 'object' ? formState.name.zh : ''}
                onChange={(e) => handleUpdateForm({ name: { zh: e.target.value, en: '', ms: '' } })}
                className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl font-bold outline-none focus:border-blue-500 shadow-sm min-w-0" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">统一价格编号 / CODE</h3>
              <input 
                type="text" 
                placeholder="输入统一编号 (如: SK-2024)..." 
                value={formState.manual_code || ''}
                onChange={(e) => handleUpdateForm({ manual_code: e.target.value })}
                className="w-full bg-white border border-slate-200 p-4 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 shadow-sm" 
              />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">统一型號 / MODEL</h3>
              <input 
                type="text" 
                inputMode="numeric"
                placeholder="统一型号编号 (如: MOD-123)" 
                value={formState.model_number || ''}
                onChange={(e) => handleUpdateForm({ model_number: e.target.value })}
                className="w-full bg-white border border-slate-200 p-4 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 shadow-sm" 
              />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">统一價格 / PRICE</h3>
              <input 
                type="text" 
                inputMode="numeric"
                placeholder="输入统一价格..." 
                value={formState.price || ''}
                onChange={(e) => handleUpdateForm({ price: e.target.value })}
                className="w-full bg-white border border-slate-200 p-4 rounded-2xl text-sm font-bold text-blue-600 outline-none focus:border-blue-500 shadow-sm" 
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'org' && (
        <div className="px-8 xl:px-12 py-6 space-y-6 pb-24">
          <VisibilitySection 
            batchIsHiddenApplied={batchIsHiddenApplied} 
            setBatchIsHiddenApplied={setBatchIsHiddenApplied} 
            is_hidden={formState.is_hidden} 
            handleUpdateForm={handleUpdateForm} 
          />

          <section className="space-y-4">
            <FormSectionHeader title="产品目录" subtitle="CATEGORY" />
            <CategoryGrid categories={categories} selectedId={formState.category_id || null} onSelect={(id) => handleUpdateForm({ category_id: id ? String(id) : null })} appLang={appLang} />
          </section>

          <section className="space-y-4">
            <PhotoTagSelector
              name="tags"
              tags={tags}
              value={formState.tags?.map(t => (typeof t === 'object' ? String(t.id) : String(t))) || []}
              onChange={(newTagIds) => {
                const selectedTags = newTagIds.map(id => {
                  const strId = typeof id === 'object' ? String(id.id) : id;
                  return tags.find(t => String(t.id) === strId) || { id: strId, name: '' };
                });
                handleUpdateForm({ tags: selectedTags as Tag[] });
              }}
              addTag={addTag}
              updateTag={updateTag}
              deleteTag={deleteTag}
            />
          </section>

          <section className="space-y-4">
            <FormSectionHeader title="厂商名称" subtitle="MANUFACTURER" onAction={quickAddMfr} />
            <ManufacturerTagSelect manufacturers={manufacturers} selectedId={formState?.manufacturer_id || null} onSelect={(id) => handleUpdateForm({ manufacturer_id: id })} />
          </section>
        </div>
      )}
    </Tabs>
  );
}

interface VisibilitySectionProps {
  batchIsHiddenApplied: boolean;
  setBatchIsHiddenApplied: (v: boolean) => void;
  is_hidden?: boolean;
  handleUpdateForm: (updates: Partial<ProductFormData>) => void;
}

function VisibilitySection({ batchIsHiddenApplied, setBatchIsHiddenApplied, is_hidden, handleUpdateForm }: VisibilitySectionProps) {

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
