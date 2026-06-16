import React from 'react';
import { useWatch } from 'react-hook-form';
import { usePhotoEditSessionContext } from '@/hooks/photo/usePhotoEditSessionContext';
import { FormSectionHeader } from '../FormShared';
import { useManufacturers, useManufacturerCreate, useManufacturerEdit, useManufacturerDelete } from '../../../hooks';
import { useUIStore } from '../../../store';
import { PromptDialog } from '../../ui/PromptDialog';
import { translations } from '@/locales';
import { CategorySelect } from './CategorySelect';
import { TagEditor } from './TagEditor';
import { ManufacturerSelect } from '../ManufacturerSelect';
import { Eye, EyeOff } from 'lucide-react';

export function OrgTab() {
  const { control, setValue } = usePhotoEditSessionContext();
  const appLang = useUIStore((s) => s.appLang);
  const { data: manufacturers = [] } = useManufacturers();
  
  const { mutateAsync: addManMut } = useManufacturerCreate();
  const { mutateAsync: updateManMut } = useManufacturerEdit();

  const [isAddMfrOpen, setAddMfrOpen] = React.useState(false);

  const t = translations[appLang as keyof typeof translations] || translations.en;
  
  const isHidden = useWatch({ control, name: 'is_hidden' });
  const l = {
    hidden: appLang === 'zh' ? '屏蔽' : appLang === 'ms' ? 'Sembunyi' : 'Hide',
    visible: appLang === 'zh' ? '显示' : appLang === 'ms' ? 'Tunjuk' : 'Show',
  };

  return (
    <div className="m-0 p-4 space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
      
      <section className="space-y-4">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">显示状态 / VISIBILITY</h3>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setValue('is_hidden', false, { shouldDirty: true })}
            className={`flex-1 flex flex-col items-center justify-center gap-1 p-4 rounded-2xl border-2 transition-all ${!isHidden ? "bg-green-50 border-green-500 text-green-700" : "bg-white border-slate-50 text-slate-400 border-slate-100"}`}
          >
            <Eye size={16} /><span className="text-[10px] font-black uppercase">显示 (VISIBLE)</span>
          </button>
          <button
            type="button"
            onClick={() => setValue('is_hidden', true, { shouldDirty: true })}
            className={`flex-1 flex flex-col items-center justify-center gap-1 p-4 rounded-2xl border-2 transition-all ${isHidden ? "bg-orange-50 border-orange-500 text-orange-700" : "bg-white border-slate-50 text-slate-400 border-slate-100"}`}
          >
            <EyeOff size={16} /><span className="text-[10px] font-black uppercase">屏蔽 (HIDDEN)</span>
          </button>
        </div>
      </section>

      <CategorySelect />
      
      <TagEditor />

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
