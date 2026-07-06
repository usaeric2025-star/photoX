import { useState } from 'react';
import { useUI, UIStoreState } from '#lib/store/index.js';
import { useConfirm } from '#src/context/ConfirmContext.js';
import { useTranslation } from '#src/hooks/core/useTranslation.js';
import { useCategoryCreate, useCategoryEdit, useCategoryDelete } from '#src/hooks/category/index.js';
import { useTagCreate, useTagEdit, useTagDelete } from '#src/hooks/tag/index.js';
import { useManufacturerCreate, useManufacturerEdit, useManufacturerDelete } from '#src/hooks/manufacturer/index.js';

export const useSettingsManagement = () => {
    const patch = useUI((s: UIStoreState) => s.patch);
    const confirm = useConfirm();
    const { uiTranslations: t } = useTranslation();

    const { mutateAsync: deleteCategory } = useCategoryDelete();
    const { mutateAsync: deleteTag } = useTagDelete();
    const { mutateAsync: deleteManufacturer } = useManufacturerDelete();
    
    const { mutateAsync: addCategory } = useCategoryCreate();
    const { mutateAsync: updateCategory } = useCategoryEdit();
    
    const { mutateAsync: addTag } = useTagCreate();
    const { mutateAsync: updateTag } = useTagEdit();
    
    const { mutateAsync: addManufacturer } = useManufacturerCreate();
    const { mutateAsync: updateManufacturer } = useManufacturerEdit();

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
