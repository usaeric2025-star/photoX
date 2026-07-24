import React from "react";
import { Icon } from '#src/components/ui/Icon.js';
import { Button } from '#src/components/ui/Button.js';
import { useDisclosure } from '#src/hooks/core/index.js';
import { Manufacturer } from '#src/types/index.js';
import { ManufacturerItem } from '#src/components/admin/ManufacturerItem.js';
import { PromptDialog } from "#src/components/ui/PromptDialog.js";
import { normalizeManufacturerName } from "#lib/utils.js";
import { useTranslation, useManufacturers, useManufacturerMutations } from '#src/hooks/index.js';
import { useFormSubmit } from '#lib/forms/useFormSubmit.js';
import * as v from 'valibot';
import { FormProvider } from '#lib/forms/useFormField.js';

interface ManufacturersSectionProps {
  cardClass: string;
  buttonStyles: { [key in "primary" | "secondary" | "accent"]: string };
}

/**
 * ManufacturersSection
 * 
 * 整合廠商列表的管理。
 */
export function ManufacturersSection({
  cardClass,
  buttonStyles,
}: ManufacturersSectionProps) {
  const { manufacturers = [] } = useManufacturers();
  const manufacturerMutations = useManufacturerMutations();
  
  const [isAddOpen, addDialog] = useDisclosure(false);
  const { t } = useTranslation();

  const { submit: runAddManufacturer, isLoading: isAdding, fieldErrors: addFieldErrors, clearFieldError: addClearFieldError } = useFormSubmit({
    schema: v.object({ name: v.pipe(v.string(), v.minLength(1, t('manufacturerNameEmpty') || '廠商名稱不能為空')) }),
    mutationFn: async ({ name }: { name: string }) => {
      const normalized = normalizeManufacturerName(name);
      if (!normalized) return;
      await manufacturerMutations.create.mutateAsync({ name: normalized });
    },
    successMessage: t('addMfrSuccess'),
  });

  const { submit: runUpdateManufacturer, fieldErrors: updateFieldErrors, clearFieldError: updateClearFieldError } = useFormSubmit({
    schema: v.object({ id: v.string(), name: v.pipe(v.string(), v.minLength(1, t('manufacturerNameEmpty') || '廠商名稱不能為空')) }),
    mutationFn: async ({ id, name }: { id: string, name: string }) => {
      await manufacturerMutations.edit.mutateAsync({ id, updates: { name } });
    },
    successMessage: t('updateSuccess'),
  });

  return (
    <section className={cardClass} id="section-manufacturers">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-brand-navy text-[10px] uppercase tracking-widest flex items-center gap-2">
          <div className="w-1.5 h-3.5 bg-brand-navy rounded-full"></div>
          {t('manufacturersSettingsTitle') || '厂商列表 / Manufacturer List'}
        </h3>
        <span className="text-[10px] text-brand-navy/40 font-black uppercase">
          {manufacturers.length} Items
        </span>
      </div>

      <div className="flex gap-2">
        <Button 
           id="add-mfr-btn"
           onClick={addDialog.open} 
           loading={isAdding} 
           className={buttonStyles.accent}
           leftIcon={!isAdding && <Icon name="plus" size={16} />}
           variant="primary"
        >
          {t('addManufacturer') || '新增厂商'}
        </Button>
      </div>

      <FormProvider fieldErrors={updateFieldErrors} clearFieldError={updateClearFieldError}>
        <div className="flex flex-wrap gap-2 p-3 bg-brand-navy/5 rounded-[28px] border border-brand-navy/10 shadow-inner min-h-[48px]">
          {manufacturers.map((sub) => (
            <ManufacturerItem
              key={sub.id}
              manufacturer={sub}
              onUpdate={async (mfr) => {
                return await runUpdateManufacturer({ id: String(mfr.id), name: mfr.name });
              }}
              onDelete={(id) => manufacturerMutations.remove.mutateAsync(String(id))}
            />
          ))}
        </div>
      </FormProvider>

      <FormProvider fieldErrors={addFieldErrors} clearFieldError={addClearFieldError}>
        <PromptDialog
          open={isAddOpen}
          onOpenChange={addDialog.toggle}
          loading={isAdding}
          title={t('newMfrTitle') || "新增厂商"}
          description={t('mfrNamePlaceholder') || "输入厂商名称："}
          onConfirm={async (name: string) => {
            if (!name.trim()) return false;
            await runAddManufacturer({ name });
            return true;
          }}
        />
      </FormProvider>
    </section>
  );
}
