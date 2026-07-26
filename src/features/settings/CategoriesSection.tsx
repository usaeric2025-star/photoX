import React, { useState } from 'react';
import { Icon } from '#src/components/ui/Icon.js';
import { useDisclosure, useClickOutside, useLongPress } from '#src/hooks/core/index.js';
import { PromptDialog } from "#src/components/ui/PromptDialog.js";
import { Category } from '#src/types/index.js';
import { useFormSubmit } from '#lib/forms/useFormSubmit.js';
import * as v from 'valibot';
import { FormProvider } from '#lib/forms/useFormField.js';
import { useConfirm } from '#src/context/ConfirmContext.js';
import { motion, AnimatePresence } from 'lite-sleek';
import { useCategories, useCategoryMutations, useTranslation } from '#src/hooks/index.js';
import { useSettingsText } from '#src/hooks/useSettingsText.js';

import { NativePopover } from '#src/components/ui/NativePopover.js';

interface CategoriesSectionProps {
  cardClass: string;
  buttonStyles: { [key in "primary" | "secondary" | "accent"]: string };
}

function CategoryItem({
  cat,
  onUpdate,
  onDelete
}: {
  cat: Category;
  onUpdate: (cat: Category) => void;
  onDelete: (id: string | number) => void;
}) {
  const [isEditOpen, editDialog] = useDisclosure(false);
  const confirm = useConfirm();
  const { appLang } = useTranslation();
  const text = useSettingsText();
  
  const displayName = (cat.description as Record<string, string>)?.[appLang] || cat.name || '未命名分类';

  return (
    <NativePopover
      align="center"
      trigger={
        <div
          id={`cat-item-${cat.id}`}
          className={`bg-white border border-brand-navy/10 pl-3 pr-2 py-1 rounded-full flex items-center gap-2 shadow-sm transition-all active:scale-95 relative cursor-pointer hover:bg-brand-navy/[0.02]`}
        >
          <div className="flex flex-col">
            <span className="text-[11px] font-black text-brand-navy uppercase tracking-tight select-none">
              {displayName}
            </span>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-0.5 min-w-[120px] bg-brand-navy rounded-xl p-1">
        <button
          id={`edit-cat-${cat.id}`}
          onClick={(e) => {
            e.stopPropagation();
            editDialog.open();
          }}
          className="px-3 py-2 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 rounded-lg flex items-center gap-2 w-full text-left"
        >
          <Icon name="pencil" size={12} /> {text.common.edit}
        </button>
        <button
          id={`delete-cat-${cat.id}`}
          onClick={async (e) => {
            e.stopPropagation();
            if (await confirm({
              title: "确认删除",
              description: `确定要删除「${displayName}」吗？此操作不可恢复。`,
              confirmText: text.common.delete,
              variant: "destructive"
            })) {
              onDelete(cat.id);
            }
          }}
          className="px-3 py-2 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 rounded-lg flex items-center gap-2 w-full text-left"
        >
          <Icon name="trash-2" size={12} /> {text.common.delete}
        </button>
      </div>

      <PromptDialog
        open={isEditOpen}
        onOpenChange={editDialog.toggle}
        title={text.categories.edit}
        description={text.categories.editPromptDescription}
        defaultValue={displayName}
        placeholder={displayName}
        onConfirm={(name) => {
          if (name) {
            onUpdate({ ...cat, name: name });
          }
        }}
      />
    </NativePopover>
  );
}

export function CategoriesSection({ 
  cardClass, buttonStyles
}: CategoriesSectionProps) {
  const { categories = [] } = useCategories();
  const categoryMutations = useCategoryMutations();
  
  const { appLang } = useTranslation();
  const text = useSettingsText();
  const [isAddOpen, addDialog] = useDisclosure(false);

  const { submit: runUpdateCategory, fieldErrors: updateFieldErrors, clearFieldError: updateClearFieldError } = useFormSubmit({
    schema: v.object({ id: v.number(), updates: v.record(v.string(), v.unknown()) }),
    mutationFn: async ({ id, updates }: { id: number, updates: Record<string, unknown> }) => {
      await categoryMutations.edit.mutateAsync({ id, updates });
    },
    successMessage: text.common.success,
  });

  const { submit: runDeleteCategory } = useFormSubmit({
    schema: v.object({ id: v.number() }),
    mutationFn: async ({ id }: { id: number }) => {
      await categoryMutations.remove.mutateAsync(id);
    },
    successMessage: text.common.success,
  });

  const { submit: runAddCategory, fieldErrors: addFieldErrors, clearFieldError: addClearFieldError } = useFormSubmit({
    schema: v.object({ name: v.pipe(v.string(), v.minLength(1, '分类名称不能为空')) }),
    mutationFn: async ({ name }: { name: string }) => {
      await categoryMutations.create.mutateAsync({ name });
    },
    successMessage: text.common.success,
  });

  return (
    <section className={cardClass} id="section-categories">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-brand-navy text-[10px] uppercase tracking-widest flex items-center gap-2">
          <div className="w-1.5 h-3.5 bg-brand-gold rounded-full"></div>
            {text.categories.title}
        </h3>
        <span className="text-[10px] text-brand-navy/40 font-black uppercase">{categories.length} {text.categories.items}</span>
      </div>

      <div className="flex gap-2">
        <button id="add-category-btn" onClick={addDialog.open} className={buttonStyles.accent}>
          <Icon name="plus" size={16} /> {text.categories.add}
        </button>
      </div>

      <FormProvider fieldErrors={updateFieldErrors} clearFieldError={updateClearFieldError}>
        <div className="flex flex-wrap gap-2 p-3 bg-brand-navy/5 rounded-[28px] border border-brand-navy/10 shadow-inner min-h-[48px]">
          {categories.map(cat => (
            <CategoryItem 
              key={cat.id} 
              cat={cat} 
              onUpdate={async (c) => {
                return await runUpdateCategory({ 
                  id: Number(c.id), 
                  updates: { 
                    name: c.name,
                    description: { ...((cat.description as Record<string, string>) || {}), [appLang]: c.name }
                  } 
                });
              }}
              onDelete={(id) => runDeleteCategory({ id: Number(id) })}
            />
          ))}
        </div>
      </FormProvider>

      <FormProvider fieldErrors={addFieldErrors} clearFieldError={addClearFieldError}>
        <PromptDialog
          open={isAddOpen}
          onOpenChange={addDialog.toggle}
          title={text.categories.add}
          description={text.categories.placeholder}
          onConfirm={async (name: string) => {
            if (!name.trim()) return false;
            await runAddCategory({ name });
            return true;
          }}
        />
      </FormProvider>
    </section>
  );
}
