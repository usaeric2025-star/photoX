import React, { useState } from 'react';
import { usePhotoEditSessionContext } from './hooks/PhotoEditSession.js';
import { useManufacturers, useManufacturerMutations, useTags, useTagMutations } from '#src/hooks/index.js';
import { PromptDialog } from '#src/components/ui/PromptDialog.js';
import { CategorySelect } from './CategorySelect.js';
import { PhotoTagSelector } from './PhotoTagSelector.js';
import { ManufacturerSelect } from '#src/components/admin/ManufacturerSelect.js';
import { Icon } from '#src/components/ui/Icon.js';
import { feedback } from '#lib/feedback.js';
import { VisibilityToggle } from './components/VisibilityToggle.js';
import { useTranslation } from '#src/hooks/index.js';

/**
 * OrgTab
 * 
 * 照片編輯對話框中的組織（分類、標籤、廠商）分頁。
 */
export function OrgTab() {
  const { form } = usePhotoEditSessionContext();
  const { manufacturers = [] } = useManufacturers();
  const { tags = [] } = useTags();
  const { t } = useTranslation();
  
  const manufacturerMutations = useManufacturerMutations();
  const tagMutations = useTagMutations();
  
  const addManMut = manufacturerMutations.create.mutateAsync;
  const addTagMut = tagMutations.create.mutateAsync;
  const updateTagMut = tagMutations.edit.mutateAsync;
  const deleteTagMut = tagMutations.remove.mutateAsync;

  const [isAddMfrOpen, setAddMfrOpen] = useState(false);

  return (
    <div className="m-0 p-4 space-y-8 animate-in fade-in slide-in-from-right-2 duration-300 pb-10">
      
      {/* 隱藏狀態切換 */}
      <form.Field name="isHidden">
        {({ state, handleChange }) => (
          <VisibilityToggle 
            value={!!state.value} 
            onChange={(val) => {
              handleChange(val);
              feedback.success(val ? t('hidden') : t('visible'));
            }} 
          />
        )}
      </form.Field>

      {/* 1. 分類選擇 */}
      <CategorySelect />

      {/* 2. 標籤選擇 */}
      <section className="space-y-4">
        <form.Field name="tags">
          {({ state, handleChange }) => (
            <PhotoTagSelector 
              selectedTagIds={Array.isArray(state.value) ? (typeof state.value[0] === 'object' ? (state.value as any[]).map(t => String(t.id)) : state.value as string[]) : []}
              onChange={handleChange}
              tags={tags}
              addTag={async (name) => {
                const result = await addTagMut(name);
                return result && typeof result === 'object' && 'id' in result ? String(result.id) : null;
              }}
              updateTag={async (id, name) => {
                await updateTagMut({ id: Number(id), updates: { name } });
              }}
              deleteTag={async (id) => {
                await deleteTagMut(Number(id));
              }}
            />
          )}
        </form.Field>
      </section>

      {/* 3. 廠商選擇 */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Icon name="factory" size={12} className="text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('manufacturer')}</span>
          </div>
          <button 
            type="button"
            onClick={() => setAddMfrOpen(true)}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 transition-all active:scale-95 shadow-sm"
            title={t('newManufacturer')}
          >
            <Icon name="plus" size={16} />
          </button>
        </div>
        <ManufacturerSelect form={form} name="manufacturerId" manufacturers={manufacturers} />
      </section>

      <PromptDialog
        open={isAddMfrOpen}
        onOpenChange={setAddMfrOpen}
        title={t('newMfrTitle')}
        placeholder={t('mfrNamePlaceholder')}
        onConfirm={async (name: string) => {
          await addManMut(name);
        }}
      />
    </div>
  );
}
