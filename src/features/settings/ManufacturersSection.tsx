import React from "react";
import { Icon } from '#src/components/ui/Icon.js';
import { Button } from '#src/components/ui/Button.js';
import { useDisclosure } from '#src/hooks/core/index.js';
import { Manufacturer } from '#src/types/index.js';
import { ManufacturerItem } from '#src/components/admin/ManufacturerItem.js';
import { PromptDialog } from "#src/components/ui/PromptDialog.js";
import { normalizeManufacturerName } from "#lib/utils.js";
import { useManufacturers, useManufacturerMutations } from '#src/hooks/index.js';
import { useSettingsText } from '#src/hooks/useSettingsText.js';
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
 * 整合厂商列表的管理。
 */
export function ManufacturersSection({
  cardClass,
  buttonStyles,
}: ManufacturersSectionProps) {
  const { manufacturers = [] } = useManufacturers();
  const manufacturerMutations = useManufacturerMutations();
  
  const [isAddOpen, addDialog] = useDisclosure(false);
  const text = useSettingsText();

  const { submit: runAddManufacturer, isLoading: isAdding, fieldErrors: addFieldErrors, clearFieldError: addClearFieldError } = useFormSubmit({
    schema: v.object({ name: v.pipe(v.string(), v.minLength(1, '厂商名称不能为空')) }),
    mutationFn: async ({ name }: { name: string }) => {
      const normalized = normalizeManufacturerName(name);
      if (!normalized) return;
      await manufacturerMutations.create.mutateAsync({ name: normalized });
    },
    successMessage: text.common.success,
  });

  const { submit: runUpdateManufacturer, fieldErrors: updateFieldErrors, clearFieldError: updateClearFieldError } = useFormSubmit({
    schema: v.object({ id: v.string(), name: v.pipe(v.string(), v.minLength(1, '厂商名称不能为空')) }),
    mutationFn: async ({ id, name }: { id: string, name: string }) => {
      await manufacturerMutations.edit.mutateAsync({ id, updates: { name } });
    },
    successMessage: text.common.success,
  });

  return (
    <section className={cardClass} id="section-manufacturers">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-brand-navy text-[10px] uppercase tracking-widest flex items-center gap-2">
          <div className="w-1.5 h-3.5 bg-brand-navy rounded-full"></div>
          {text.manufacturers.title}
        </h3>
        <span className="text-[10px] text-brand-navy/40 font-black uppercase">
          {manufacturers.length} {text.categories.items}
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
          {text.manufacturers.add}
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
          title={text.manufacturers.add}
          description={text.manufacturers.placeholder}
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
