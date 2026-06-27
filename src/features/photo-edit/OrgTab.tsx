import React from 'react';
import { usePhotoEditSessionContext } from '@/hooks/photo/usePhotoEditSessionContext';
import { FormSectionHeader } from '@/components/admin/FormShared';
import { useManufacturers, useManufacturerCreate, useTags } from '@/hooks';
import { useTagCreate, useTagEdit, useTagDelete } from '@/hooks/admin/useTagMutations';
import { useUI } from '@/lib/store';
import { PromptDialog } from '@/components/ui/PromptDialog';
import { translations } from '@/locales';
import { CategorySelect } from './CategorySelect';
import { PhotoTagSelector } from './PhotoTagSelector';
import { ManufacturerSelect } from '@/components/admin/ManufacturerSelect';
import { Icon } from '@/components/ui/Icon';
import { AppField } from '@/lib/forms/AppField';

export function OrgTab() {
  const { form } = usePhotoEditSessionContext();
  const appLang = useUI((s) => s.appLang);
  const { data: manufacturers = [] } = useManufacturers();
  const { data: tags = [] } = useTags();
  
  const { mutateAsync: addManMut } = useManufacturerCreate();
  const { mutateAsync: addTagMut } = useTagCreate();
  const { mutateAsync: updateTagMut } = useTagEdit();
  const { mutateAsync: deleteTagMut } = useTagDelete();

  const [isAddMfrOpen, setAddMfrOpen] = React.useState(false);

  const t = translations[appLang as keyof typeof translations] || translations.en;
  
  return (
    <div className="m-0 p-4 space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
      
      <AppField form={form} name="is_hidden">
        {({ value, onChange }) => (
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">显示状态 / VISIBILITY</h3>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => onChange(false)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 p-4 rounded-2xl border-2 transition-all ${value === false ? "bg-green-50 border-green-500 text-green-700" : "bg-white border-slate-50 text-slate-400 border-slate-100"}`}
              >
                <Icon name="eye" size={16} /><span className="text-[10px] font-black uppercase">显示 (VISIBLE)</span>
              </button>
              <button
                type="button"
                onClick={() => onChange(true)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 p-4 rounded-2xl border-2 transition-all ${value === true ? "bg-orange-50 border-orange-500 text-orange-700" : "bg-white border-slate-50 text-slate-400 border-slate-100"}`}
              >
                <Icon name="eye-off" size={16} /><span className="text-[10px] font-black uppercase">屏蔽 (HIDDEN)</span>
              </button>
            </div>
          </section>
        )}
      </AppField>

      <CategorySelect />
      
      <section className="space-y-4">
        <AppField form={form} name="tags">
          {({ value, onChange }) => (
            <PhotoTagSelector 
              selectedTagIds={(value as string[]) || []}
              onChange={onChange}
              tags={tags}
              addTag={async (name) => {
                const result = await addTagMut(name);
                return result?.id ? String(result.id) : null;
              }}
              updateTag={async (id, name) => updateTagMut({ id: Number(id), updates: { name } })}
              deleteTag={async (id) => deleteTagMut(Number(id))}
            />
          )}
        </AppField>
      </section>

      <section className="space-y-4">
        <FormSectionHeader 
          title="厂商名称" 
          subtitle="MANUFACTURER" 
          onAction={() => setAddMfrOpen(true)} 
        />
        <ManufacturerSelect form={form} name="manufacturer_id" manufacturers={manufacturers} />
      </section>

      <PromptDialog
        open={isAddMfrOpen}
        onOpenChange={setAddMfrOpen}
        title={t.newMfrTitle}
        placeholder={t.mfrNamePlaceholder}
        onConfirm={async (name: string) => {
          await addManMut(name);
        }}
      />
    </div>
  );
}
