import { useState } from 'react';
import { useUI, UIStoreState } from '#lib/store/index.js';
import { useConfirm } from '#src/context/ConfirmContext.js';
import { useTranslation } from '#src/hooks/core/index.js';
import { useCategoryMutations } from '../category/index.js';
import { useTagMutations } from '../tag/index.js';
import { useManufacturerMutations } from '../manufacturer/index.js';

export const useSettingsManagement = () => {
    const patch = useUI((s: UIStoreState) => s.patch);
    const confirm = useConfirm();
    const { uiTranslations: t } = useTranslation();

    const categoryMutations = useCategoryMutations();
    const tagMutations = useTagMutations();
    const manufacturerMutations = useManufacturerMutations();

    const deleteCategory = categoryMutations.remove.mutateAsync;
    const deleteTag = tagMutations.remove.mutateAsync;
    const deleteManufacturer = manufacturerMutations.remove.mutateAsync;
    
    const addCategory = categoryMutations.create.mutateAsync;
    const updateCategory = categoryMutations.edit.mutateAsync;
    
    const addTag = tagMutations.create.mutateAsync;
    const updateTag = tagMutations.edit.mutateAsync;
    
    const addManufacturer = manufacturerMutations.create.mutateAsync;
    const updateManufacturer = manufacturerMutations.edit.mutateAsync;

    const triggerTagDelete = async (id: number) => {
        if (await confirm({
            title: t.confirmDeleteTagTitle || "Delete Tag",
            description: t.confirmDeleteTagDesc || "Are you sure you want to delete this tag?",
            confirmText: t.deleteBtn || "Delete",
            variant: "destructive"
        })) {
            await deleteTag(id);
        }
    };

    const triggerCategoryDelete = async (id: number) => {
        if (await confirm({
            title: t.confirmDeleteCatTitle || "Delete Category",
            description: t.confirmDeleteCatDesc || "Are you sure you want to delete this category?",
            confirmText: t.deleteBtn || "Delete",
            variant: "destructive"
        })) {
            await deleteCategory(id);
        }
    };

    const triggerManufacturerDelete = async (id: string) => {
        if (await confirm({
            title: t.confirmDeleteMfrTitle || "Delete Manufacturer",
            description: t.confirmDeleteMfrTitle || "Are you sure you want to delete this manufacturer?",
            confirmText: t.deleteBtn || "Delete",
            variant: "destructive"
        })) {
            await deleteManufacturer(id);
        }
    };

    return {
        deleteCategory: triggerCategoryDelete,
        deleteTag: triggerTagDelete,
        deleteManufacturer: triggerManufacturerDelete,
        addCategory,
        updateCategory,
        addTag,
        updateTag,
        addManufacturer,
        updateManufacturer
    };
};
