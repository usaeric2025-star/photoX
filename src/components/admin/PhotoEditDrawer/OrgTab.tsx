import React from 'react';
import { usePhotoEditSessionContext } from '@/hooks/photo/usePhotoEditSessionContext';
import { FormSectionHeader, ManufacturerList } from '../FormShared';
import { useManufacturers, useManufacturerCreate, useManufacturerEdit, useManufacturerDelete } from '../../../hooks';
import { useUIStore } from '../../../store';
import { PromptDialog } from '../../ui/PromptDialog';
import { translations } from '@/locales';
import { CategorySelect } from './CategorySelect';
import { TagEditor } from './TagEditor';

export function OrgTab() {
  const { watch, setValue } = usePhotoEditSessionContext();
  const appLang = useUIStore((s) => s.appLang);
  const { data: manufacturers = [] } = useManufacturers();
  
  const { mutateAsync: addManMut } = useManufacturerCreate();
  const { mutateAsync: updateManMut } = useManufacturerEdit();
  const { mutateAsync: deleteManMut } = useManufacturerDelete();

  const [isAddMfrOpen, setAddMfrOpen] = React.useState(false);
  const [isEditMfrOpen, setEditMfrOpen] = React.useState(false);
  const [editingMfr, setEditingMfr] = React.useState<{ id: string; name: string } | null>(null);

  const t = translations[appLang as keyof typeof translations] || translations.en;

  const formState = watch();
  const manufacturerId = formState?.manufacturer_id;

  const updateForm = React.useCallback((updates: any) => {
    Object.entries(updates).forEach(([key, value]) => {
      (setValue as any)(key as any, value, { shouldDirty: true });
    });
  }, [setValue]);

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
        <ManufacturerList 
          manufacturers={manufacturers}
          selectedId={manufacturerId ?? null}
          onSelect={(id) => updateForm({ manufacturer_id: id })}
          onEdit={(mfr) => {
            setEditingMfr(mfr);
            setEditMfrOpen(true);
          }}
          onDelete={(mfr) => deleteManMut(mfr.id)}
        />
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

      <PromptDialog
        open={isEditMfrOpen}
        onOpenChange={setEditMfrOpen}
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
}
