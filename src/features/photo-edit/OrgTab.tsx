import React from 'react';
import { usePhotoEditSessionContext } from '#src/hooks/photo/usePhotoEditSessionContext.js';
import { useManufacturers, useManufacturerMutations, useTags, useTagMutations } from '#src/hooks/index.js';
import { useUI } from '#lib/store/index.js';
import { PromptDialog } from '#src/components/ui/PromptDialog.js';
import { CategorySelect } from './CategorySelect.js';
import { PhotoTagSelector } from './PhotoTagSelector.js';
import { ManufacturerSelect } from '#src/components/admin/ManufacturerSelect.js';
import { Icon } from '#src/components/ui/Icon.js';
import { AppField } from '#lib/forms/AppField.js';

import { showToast } from '#lib/ui/toast.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { VisibilityToggle } from './components/VisibilityToggle.js';

import { useTranslation } from '#src/hooks/index.js';

export function OrgTab() {
  const { form } = usePhotoEditSessionContext();
  const appLang = useUI((s) => s.appLang);
  const { manufacturers = [] } = useManufacturers();
  const { tags = [] } = useTags();
  
  const manufacturerMutations = useManufacturerMutations();
  const tagMutations = useTagMutations();
  
  const addManMut = manufacturerMutations.create.mutateAsync;
  const addTagMut = tagMutations.create.mutateAsync;
  const updateTagMut = tagMutations.edit.mutateAsync;
  const deleteTagMut = tagMutations.remove.mutateAsync;

  const [isAddMfrOpen, setAddMfrOpen] = React.useState(false);

  const { t } = useTranslation();
  
  return (
    <div className="m-0 p-4 space-y-8 animate-in fade-in slide-in-from-right-2 duration-300 pb-10">
      
      <AppField form={form} name="isHidden">
        {({ state, handleChange }) => (
          <VisibilityToggle value={!!state.value} onChange={(val) => {
            handleChange(val);
            showToast.success(val ? t('hidden') : t('visible'));
          }} />
        )}
      </AppField>

      {/* 1. 分类 */}
      <CategorySelect />
      
      {/* 2. 标签 */}
      <section className="space-y-4">
        <AppField form={form} name="tags">
          {({ state, handleChange }) => (
            <PhotoTagSelector 
              selectedTagIds={Array.isArray(state.value) ? (typeof state.value[0] === 'object' ? (state.value as any[]).map(t => String(t.id)) : state.value as string[]) : []}
              onChange={handleChange}
              tags={tags}
              addTag={async (name) => {
                const result = await addTagMut(name);
                return result?.id ? String(result.id) : null;
              }}
              updateTag={async (id, name) => {
                await updateTagMut({ id: Number(id), updates: { name } });
              }}
              deleteTag={async (id) => {
                await deleteTagMut(Number(id));
              }}
            />
          )}
        </AppField>
      </section>

      {/* 3. 厂商 */}
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
