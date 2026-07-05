import React from 'react';
import { usePhotoEditSessionContext } from '#src/hooks/photo/usePhotoEditSessionContext.js';
import { useManufacturers, useManufacturerCreate, useTags } from '#src/hooks/index.js';
import { useTagCreate, useTagEdit, useTagDelete } from '#src/hooks/tag/index.js';
import { useUI } from '#lib/store/index.js';
import { PromptDialog } from '#src/components/ui/PromptDialog.js';
import { translations } from '#src/locales/index.js';
import { CategorySelect } from './CategorySelect.js';
import { PhotoTagSelector } from './PhotoTagSelector.js';
import { ManufacturerSelect } from '#src/components/admin/ManufacturerSelect.js';
import { Icon } from '#src/components/ui/Icon.js';
import { AppField } from '#lib/forms/AppField.js';

import { showToast } from '#lib/ui/toast.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { VisibilityToggle } from './components/VisibilityToggle.js';

export function OrgTab() {
  const { form } = usePhotoEditSessionContext();
  const appLang = useUI((s) => s.appLang);
  const { manufacturers = [] } = useManufacturers();
  const { tags = [] } = useTags();
  
  const { mutateAsync: addManMut } = useManufacturerCreate();
  const { mutateAsync: addTagMut } = useTagCreate();
  const { mutateAsync: updateTagMut } = useTagEdit();
  const { mutateAsync: deleteTagMut } = useTagDelete();

  const [isAddMfrOpen, setAddMfrOpen] = React.useState(false);

  const t = translations[appLang as keyof typeof translations] || translations.en;
  
  return (
    <div className="m-0 p-4 space-y-8 animate-in fade-in slide-in-from-right-2 duration-300 pb-10">
      
      <AppField form={form} name="isHidden">
        {({ value, onChange }) => (
          <VisibilityToggle value={!!value} onChange={(val) => {
            onChange(val);
            showToast.success(val ? (appLang === 'zh' ? '已隐藏' : 'Hidden') : (appLang === 'zh' ? '已公开' : 'Visible'));
          }} />
        )}
      </AppField>

      {/* 1. 分类 */}
      <CategorySelect />
      
      {/* 2. 标签 */}
      <section className="space-y-4">
        <AppField form={form} name="tags">
          {({ value, onChange }) => (
            <PhotoTagSelector 
              selectedTagIds={Array.isArray(value) ? (typeof value[0] === 'object' ? value.map(t => String((t as any).id)) : value as string[]) : []}
              onChange={onChange}
              tags={tags}
              addTag={async (name) => {
                try {
                  const result = await addTagMut(name);
                  showToast.success(appLang === 'zh' ? '标签已创建' : 'Tag created');
                  return result?.id ? String(result.id) : null;
                } catch (e) {
                  ErrorFactory.handle(e, { context: '创建标签' });
                  return null;
                }
              }}
              updateTag={async (id, name) => {
                try {
                  await updateTagMut({ id: Number(id), updates: { name } });
                  showToast.success(appLang === 'zh' ? '标签已更新' : 'Tag updated');
                } catch (e) {
                  ErrorFactory.handle(e, { context: '更新标签' });
                }
              }}
              deleteTag={async (id) => {
                try {
                  await deleteTagMut(Number(id));
                  showToast.success(appLang === 'zh' ? '标签已删除' : 'Tag deleted');
                } catch (e) {
                  ErrorFactory.handle(e, { context: '删除标签' });
                }
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
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">厂商名称 / MANUFACTURER</span>
          </div>
          <button 
            type="button"
            onClick={() => setAddMfrOpen(true)}
            className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-tighter"
          >
            + {appLang === 'zh' ? '新建厂商' : 'NEW'}
          </button>
        </div>
        <ManufacturerSelect form={form} name="manufacturerId" manufacturers={manufacturers} />
      </section>

      <PromptDialog
        open={isAddMfrOpen}
        onOpenChange={setAddMfrOpen}
        title={t.newMfrTitle}
        placeholder={t.mfrNamePlaceholder}
        onConfirm={async (name: string) => {
          try {
            await addManMut(name);
            showToast.success(appLang === 'zh' ? '厂商已创建' : 'Manufacturer created');
          } catch (e) {
            ErrorFactory.handle(e, { context: '创建厂商' });
          }
        }}
      />
    </div>
  );
}
