import React, { useState } from 'react';
import { Icon } from '#src/components/ui/Icon.js';
import { useDisclosure } from '#src/hooks/core/index.js';
import { useClickOutside } from '#src/hooks/core/index.js';
import { PromptDialog } from "#src/components/ui/PromptDialog.js";
import { useLongPress } from "#src/hooks/core/index.js";
import { Category } from '#src/types/index.js';
import { useUI } from '#lib/store/index.js';
import { useFormSubmit } from '#lib/forms/useFormSubmit.js';
import * as v from 'valibot';
import { FormProvider } from '#lib/forms/useFormField.js';
import { useConfirm } from '#src/context/ConfirmContext.js';
import { motion, AnimatePresence } from 'lite-sleek';
import { useCategories, useCategoryMutations, useTranslation } from '#src/hooks/index.js';

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
  const [activeMenuId, setActiveMenuId] = useState<string | number | null>(null);
  const [isEditOpen, editDialog] = useDisclosure(false);
  const confirm = useConfirm();
  const { appLang, t } = useTranslation();

  const menuRef = useClickOutside<HTMLDivElement>(() => {
    if (activeMenuId === cat.id) setActiveMenuId(null);
  });

  const longPress = useLongPress<HTMLDivElement>({
    delay: 800,
    onLongPress: () => {
      setActiveMenuId(cat.id);
    }
  });

  const displayName = (cat.description as any)?.[appLang] || cat.name || '未命名分类';

  return (
      <div
      ref={longPress.ref}
      onMouseDown={longPress.onMouseDown}
      onMouseMove={longPress.onMouseMove}
      onMouseUp={longPress.onMouseUp}
      onMouseLeave={longPress.onMouseLeave}
      onTouchStart={longPress.onTouchStart}
      onTouchMove={longPress.onTouchMove}
      onTouchEnd={longPress.onTouchEnd}
      onTouchCancel={longPress.onTouchCancel}
      className={`bg-white border border-brand-navy/10 pl-3 pr-2 py-1 rounded-full flex items-center gap-2 shadow-sm transition-all active:scale-95 relative ${activeMenuId === cat.id ? "bg-brand-gold/10 border-brand-gold/30 scale-95" : ""}`}
    >
      <div className="flex flex-col">
        <span className="text-[11px] font-black text-brand-navy uppercase tracking-tight select-none">
          {displayName}
        </span>
      </div>

      <AnimatePresence>
        {activeMenuId === cat.id && (
          <motion.div 
            variant="scale"
            transition="easeOut"
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-brand-navy rounded-xl shadow-xl p-1 flex flex-col gap-0.5 min-w-[120px]"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                editDialog.open();
                setActiveMenuId(null);
              }}
              className="px-3 py-2 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 rounded-lg flex items-center gap-2"
            >
              <Icon name="pencil" size={12} /> {t('edit')}
            </button>
            <button
              onClick={async (e) => {
                e.stopPropagation();
                if (await confirm({
                  title: t('confirmDelete') || "确认删除",
                  description: t('confirmDeleteCategoryMsg', { name: displayName }) || `确定要删除「${displayName}」吗？此操作不可恢复。`,
                  confirmText: t('delete') || "删除",
                  variant: "destructive"
                })) {
                  onDelete(cat.id);
                }
                setActiveMenuId(null);
              }}
              className="px-3 py-2 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 rounded-lg flex items-center gap-2"
            >
              <Icon name="trash-2" size={12} /> {t('delete')}
            </button>
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-brand-navy rotate-45 -mt-1" />
          </motion.div>
        )}
      </AnimatePresence>

      <PromptDialog
        open={isEditOpen}
        onOpenChange={editDialog.toggle}
        title={t('editCategory') || "编辑分类名称 / Edit Category"}
        description={t('enterNewName') || "输入新的名称 / Enter new name:"}
        defaultValue={displayName}
        placeholder={displayName}
        onConfirm={(name) => {
          if (name) {
            onUpdate({ ...cat, name: name });
          }
        }}
      />
    </div>
  );
}

export function CategoriesSection({ 
  cardClass, buttonStyles
}: CategoriesSectionProps) {
  const { categories = [] } = useCategories();
  const categoryMutations = useCategoryMutations();
  const addCategory = categoryMutations.create.mutateAsync;
  const updateCategory = categoryMutations.edit.mutateAsync;
  const deleteCategory = categoryMutations.remove.mutateAsync;
  
  const { t, appLang } = useTranslation();
  const [isAddOpen, addDialog] = useDisclosure(false);

  const { submit: runUpdateCategory, fieldErrors: updateFieldErrors, clearFieldError: updateClearFieldError } = useFormSubmit({
    schema: v.object({ id: v.number(), updates: v.record(v.string(), v.unknown()) }),
    mutationFn: async ({ id, updates }: { id: number, updates: Record<string, unknown> }) => {
      await updateCategory({ id, updates });
      return true;
    },
    successMessage: t('updateSuccess'),
    errorMessage: t('updateFailed')
  });

  const { submit: runDeleteCategory } = useFormSubmit({
    schema: v.object({ id: v.number() }),
    mutationFn: async ({ id }: { id: number }) => {
      await deleteCategory(id);
      return true;
    },
    successMessage: t('deleteSuccess'),
    errorMessage: t('deleteFailed')
  });

  const { submit: runAddCategory, fieldErrors: addFieldErrors, clearFieldError: addClearFieldError } = useFormSubmit({
    schema: v.object({ name: v.pipe(v.string(), v.minLength(1)) }),
    mutationFn: async ({ name }: { name: string }) => {
      await addCategory(name);
      return true;
    },
    successMessage: t('createSuccess'),
    errorMessage: t('createFailed')
  });

  return (
    <section className={cardClass} id="section-categories">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-brand-navy text-[10px] uppercase tracking-widest flex items-center gap-2">
          <div className="w-1.5 h-3.5 bg-brand-gold rounded-full"></div>
            分类列表 / Category List
        </h3>
        <span className="text-[10px] text-brand-navy/40 font-black uppercase">{categories.length} Items</span>
      </div>

      <div className="flex gap-2">
        <button onClick={addDialog.open} className={buttonStyles.accent}>
          <Icon name="plus" size={16} /> {t('addCategory') || '新增分类'}
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
                  id: c.id, 
                  updates: { 
                    name: c.name,
                    description: { ...((cat.description as any) || {}), [appLang]: c.name }
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
          title={t('addCategory') || "新增分类"}
          description={t('enterCategoryName') || "输入分类名称："}
          onConfirm={async (name: string) => {
            if (!name.trim()) return false;
            return await runAddCategory({ name });
          }}
        />
      </FormProvider>
    </section>
  );
};
