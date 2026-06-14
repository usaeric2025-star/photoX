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

export function OrgTab() {
  const { control, setValue } = usePhotoEditSessionContext();
  const appLang = useUIStore((s) => s.appLang);
  const { data: manufacturers = [] } = useManufacturers();
  
  const { mutateAsync: addManMut } = useManufacturerCreate();
  const { mutateAsync: updateManMut } = useManufacturerEdit();

  const [isAddMfrOpen, setAddMfrOpen] = React.useState(false);

  const t = translations[appLang as keyof typeof translations] || translations.en;

  return (
    <div className="m-0 p-4 space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
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
