import React from 'react';
import { FormSectionHeader, ManufacturerList } from '../FormShared';
import { PhotoEditFormReturn } from '@/hooks/photo/usePhotoEdit';
import { useManufacturers, useManufacturerCreate, useManufacturerEdit, useManufacturerDelete } from '../../../hooks';
import { useUIStore } from '../../../store';
import { useDisclosure } from '@mantine/hooks';
import { PromptDialog } from '../../ui/PromptDialog';
import { translations } from '../../../lib/translations';
import { CategorySelect } from './CategorySelect';
import { TagEditor } from './TagEditor';

interface Props {
  form: PhotoEditFormReturn;
}

export function OrgTab({ form }: Props) {
  const appLang = useUIStore((s) => s.appLang);
  const { data: manufacturers = [] } = useManufacturers();
  
  const { mutateAsync: addManMut } = useManufacturerCreate();
  const { mutateAsync: updateManMut } = useManufacturerEdit();
  const { mutateAsync: deleteManMut } = useManufacturerDelete();

  const [isAddMfrOpen, addMfrDialog] = useDisclosure(false);
  const [isEditMfrOpen, editMfrDialog] = useDisclosure(false);
  const [editingMfr, setEditingMfr] = React.useState<{ id: string; name: string } | null>(null);

  const t = translations[appLang as keyof typeof translations] || translations.en;

  const formState = form.values;
  const updateForm = (updates: any) => form.setValues(updates);

  return (
    <div className="m-0 p-4 space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
      <CategorySelect form={form} />
      
      <TagEditor form={form} />

      <section className="space-y-4">
        <FormSectionHeader 
          title="厂商名称" 
          subtitle="MANUFACTURER" 
          onAction={addMfrDialog.open} 
        />
        <ManufacturerList 
          manufacturers={manufacturers}
          selectedId={formState?.manufacturer_id}
          onSelect={(id) => updateForm({ manufacturer_id: id })}
          onEdit={(mfr) => {
            setEditingMfr(mfr);
            editMfrDialog.open();
          }}
          onDelete={(mfr) => deleteManMut(mfr.id)}
        />
      </section>

      <PromptDialog
        open={isAddMfrOpen}
        onOpenChange={addMfrDialog.toggle}
        title={t.newMfrTitle}
        placeholder={t.mfrNamePlaceholder}
        onConfirm={async (name: string) => {
          await addManMut(name);
        }}
      />

      <PromptDialog
        open={isEditMfrOpen}
        onOpenChange={editMfrDialog.toggle}
        title={t.editMfrTitle}
        placeholder={editingMfr?.name || t.mfrNamePlaceholder}
        onConfirm={async (name: string) => {
          const trimmed = name.trim();
          if (trimmed && editingMfr)
            await updateManMut({ id: editingMfr.id, updates: { name: trimmed } });
          setEditingMfr(null);
        }}
      />
    </div>
  );
};
