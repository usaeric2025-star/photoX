import { ErrorFactory } from '@/lib/error/ErrorFactory';
import React from "react";
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { useDisclosure } from '@/hooks/core/useDisclosure';
import { Manufacturer } from "../../types";
import { ManufacturerItem } from '@/components/admin/ManufacturerItem';
import { PromptDialog } from "@/components/ui/PromptDialog";

import { normalizeManufacturerName } from "@/lib/utils";
import { useUI } from '@/lib/store';
import { translations } from "@/locales";
import { useFormSubmit } from '@/lib/forms/useFormSubmit';
import * as v from 'valibot';
import { FormProvider } from '@/lib/forms/useFormField';

interface ManufacturersSectionProps {
  manufacturers: Manufacturer[];
  addManufacturer: (name: string) => Promise<Manufacturer>;
  updateManufacturer: (
    id: number,
    data: Partial<Manufacturer>,
  ) => Promise<boolean>;
  deleteManufacturer: (id: number) => void;
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
  const t = translations[appLang as keyof typeof translations] || translations.en;

  const { submit: runAddManufacturer, isLoading: isAdding, fieldErrors: addFieldErrors, clearFieldError: addClearFieldError } = useFormSubmit({
    schema: v.object({ name: v.pipe(v.string(), v.minLength(1)) }),
    mutationFn: async ({ name }: { name: string }) => {
      const normalized = normalizeManufacturerName(name);
      if (!normalized) return null;
      return await rawAddManufacturer(normalized);
    },
    successMessage: appLang === 'zh' ? '已新增生產商' : 'Manufacturer added',
    errorMessage: appLang === 'zh' ? '新增失敗' : 'Add failed'
  });

  const { submit: runUpdateManufacturer, isLoading: isUpdating, fieldErrors: updateFieldErrors, clearFieldError: updateClearFieldError } = useFormSubmit({
    schema: v.object({ id: v.number(), name: v.pipe(v.string(), v.minLength(1)) }),
    mutationFn: async ({ id, name }: { id: number, name: string }) => {
      await rawUpdateManufacturer(id, { name });
      return true;
    },
    successMessage: appLang === 'zh' ? '已更新' : 'Updated',
    errorMessage: appLang === 'zh' ? '更新失敗' : 'Update failed'
  });

  return (
    <section className={cardClass} id="section-manufacturers">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-brand-navy text-[10px] uppercase tracking-widest flex items-center gap-2">
          <div className="w-1.5 h-3.5 bg-brand-navy rounded-full"></div>
          {appLang === 'zh' ? '生產商設定 / MANUFACTURERS' : 'Manufacturers Setting'}
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
          {appLang === 'zh' ? '新增生產商' : 'Add New'}
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
              onDelete={(id) => deleteManufacturer(Number(id))}
            />
          ))}
        </div>
      </FormProvider>

      <FormProvider fieldErrors={addFieldErrors} clearFieldError={addClearFieldError}>
        <PromptDialog
          open={isAddOpen}
          onOpenChange={addDialog.toggle}
          loading={isAdding}
          title={t.newMfrTitle}
          description={t.mfrNamePlaceholder}
          onConfirm={async (name: string) => {
            if (!name.trim()) return false;
            return await runAddManufacturer({ name });
          }}
        />
      </FormProvider>
    </section>
  );
}
