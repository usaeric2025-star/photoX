import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import React from "react";
import { Icon } from '#src/components/ui/Icon.js';
import { Button } from '#src/components/ui/Button.js';
import { useDisclosure } from '#src/hooks/core/useDisclosure.js';
import { Manufacturer } from '#src/types/index.js';
import { ManufacturerItem } from '#src/components/admin/ManufacturerItem.js';
import { PromptDialog } from "#src/components/ui/PromptDialog.js";

import { normalizeManufacturerName } from "#lib/utils.js";
import { useUI, useTranslation } from '#src/hooks/index.js';
import { useFormSubmit } from '#lib/forms/useFormSubmit.js';
import * as v from 'valibot';
import { FormProvider } from '#lib/forms/useFormField.js';

interface ManufacturersSectionProps {
  manufacturers: Manufacturer[];
  addManufacturer: (name: string) => Promise<Manufacturer>;
  updateManufacturer: (
    id: string,
    data: Partial<Manufacturer>,
  ) => Promise<boolean>;
  deleteManufacturer: (id: string) => void;
  cardClass: string;
  buttonStyles: { [key in "primary" | "secondary" | "accent"]: string };
}

export function ManufacturersSection({
  manufacturers,
  addManufacturer: rawAddManufacturer,
  updateManufacturer: rawUpdateManufacturer,
  deleteManufacturer,
  cardClass,
  buttonStyles,
}: ManufacturersSectionProps) {
  
  const [isAddOpen, addDialog] = useDisclosure(false);
  const appLang = useUI(s => s.appLang);
  const { t } = useTranslation();

  const { submit: runAddManufacturer, isLoading: isAdding, fieldErrors: addFieldErrors, clearFieldError: addClearFieldError } = useFormSubmit({
    schema: v.object({ name: v.pipe(v.string(), v.minLength(1)) }),
    mutationFn: async ({ name }: { name: string }) => {
      const normalized = normalizeManufacturerName(name);
      if (!normalized) return null;
      return await rawAddManufacturer(normalized);
    },
    successMessage: t('addMfrSuccess'),
    errorMessage: t('addMfrError')
  });

  const { submit: runUpdateManufacturer, isLoading: isUpdating, fieldErrors: updateFieldErrors, clearFieldError: updateClearFieldError } = useFormSubmit({
    schema: v.object({ id: v.string(), name: v.pipe(v.string(), v.minLength(1)) }),
    mutationFn: async ({ id, name }: { id: string, name: string }) => {
      await rawUpdateManufacturer(id, { name });
      return true;
    },
    successMessage: t('updateSuccess'),
    errorMessage: t('updateError')
  });

  return (
    <section className={cardClass} id="section-manufacturers">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-brand-navy text-[10px] uppercase tracking-widest flex items-center gap-2">
          <div className="w-1.5 h-3.5 bg-brand-navy rounded-full"></div>
          {t('manufacturersSettingsTitle')}
        </h3>
        <span className="text-[10px] text-brand-navy/40 font-black uppercase">
          {(manufacturers || []).length} Items
        </span>
      </div>
      <div className="flex gap-2">
        <Button 
           onClick={addDialog.open} 
           loading={isAdding} 
           className={buttonStyles.accent}
           leftIcon={!isAdding && <Icon name="plus" size={16} />}
           variant="primary"
        >
          {t('addManufacturer')}
        </Button>
      </div>
      <FormProvider fieldErrors={updateFieldErrors} clearFieldError={updateClearFieldError}>
        <div className="flex flex-wrap gap-2 p-3 bg-brand-navy/5 rounded-[28px] border border-brand-navy/10 shadow-inner min-h-[48px]">
          {(manufacturers || []).map((sub) => (
            <ManufacturerItem
              key={sub.id}
              manufacturer={sub}
              onUpdate={async (mfr) => {
                return await runUpdateManufacturer({ id: mfr.id, name: mfr.name });
              }}
              onDelete={(id) => deleteManufacturer(String(id))}
            />
          ))}
        </div>
      </FormProvider>

      <FormProvider fieldErrors={addFieldErrors} clearFieldError={addClearFieldError}>
        <PromptDialog
          open={isAddOpen}
          onOpenChange={addDialog.toggle}
          loading={isAdding}
          title={t('newMfrTitle')}
          description={t('mfrNamePlaceholder')}
          onConfirm={async (name: string) => {
            if (!name.trim()) return false;
            return await runAddManufacturer({ name });
          }}
        />
      </FormProvider>
    </section>
  );
}
