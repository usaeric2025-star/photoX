import React from 'react';
import { useField, useFormContext } from "el-form-react-hooks";
import { FormSectionHeader } from '@/components/admin/FormShared';
import { useManufacturers, useManufacturerCreate, useTags } from '@/hooks';
import { useTagCreate, useTagEdit, useTagDelete } from '@/hooks/admin/useTagMutations';
import { useUIStore } from '@/store/useUIStore';
import { PromptDialog } from '@/components/ui/PromptDialog';
import { translations } from '@/locales';
import { CategorySelect } from './CategorySelect';
// import { TagEditor } from './TagEditor'; // Previously imported
import { PhotoTagSelector } from './PhotoTagSelector';
import { ManufacturerSelect } from '@/components/admin/ManufacturerSelect';
import { Eye, EyeOff } from '@/components/ui/Icon';

export function OrgTab() {
  const { form } = useFormContext();
  const appLang = useUIStore((s) => s.appLang);
  const { data: manufacturers = [] } = useManufacturers();
  const { data: tags = [] } = useTags();
  
  const { mutateAsync: addManMut } = useManufacturerCreate();
  const { mutateAsync: addTagMut } = useTagCreate();
  const { mutateAsync: updateTagMut } = useTagEdit();
  const { mutateAsync: deleteTagMut } = useTagDelete();

  const [isAddMfrOpen, setAddMfrOpen] = React.useState(false);

  const t = translations[appLang as keyof typeof translations] || translations.en;
  
  const { value: isHidden } = useField('is_hidden');

  return (
    <div className="m-0 p-4 space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
      
      <section className="space-y-4">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">显示状态 / VISIBILITY</h3>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => form.setValue('is_hidden', false)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 p-4 rounded-2xl border-2 transition-all ${!isHidden ? "bg-green-50 border-green-500 text-green-700" : "bg-white border-slate-50 text-slate-400 border-slate-100"}`}
          >
            <Eye size={16} /><span className="text-[10px] font-black uppercase">显示 (VISIBLE)</span>
          </button>
          <button
            type="button"
            onClick={() => form.setValue('is_hidden', true)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 p-4 rounded-2xl border-2 transition-all ${isHidden ? "bg-orange-50 border-orange-500 text-orange-700" : "bg-white border-slate-50 text-slate-400 border-slate-100"}`}
          >
            <EyeOff size={16} /><span className="text-[10px] font-black uppercase">屏蔽 (HIDDEN)</span>
          </button>
        </div>
      </section>

      <CategorySelect />
      
      <section className="space-y-4">
        <PhotoTagSelector 
          name="tags"
          tags={tags}
          addTag={async (name) => {
            const result = await addTagMut(name);
            return result?.id ? String(result.id) : null;
          }}
          updateTag={async (id, name) => updateTagMut({ id: String(id), updates: { name } })}
          deleteTag={async (id) => deleteTagMut(String(id))}
        />
      </section>

      <section className="space-y-4">
        <FormSectionHeader 
          title="厂商名称" 
          subtitle="MANUFACTURER" 
          onAction={() => setAddMfrOpen(true)} 
        />
        <ManufacturerSelect name="manufacturer_id" manufacturers={manufacturers} />
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
