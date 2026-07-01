import { useState } from 'react';
import { useAdminCategory } from '#src/hooks/admin/useAdminCategory';
import { useUI, UIStoreState } from '#lib/store';
import { useConfirm } from '#src/context/ConfirmContext';
import { useTranslation } from '#src/hooks/core/useTranslation';

export const useSettingsManagement = () => {
    const patch = useUI((s: UIStoreState) => s.patch);
    const confirm = useConfirm();
    const { uiTranslations: t } = useTranslation();

    const adminActions = useAdminCategory();

    const triggerTagDelete = async (id: number) => {
        if (await confirm({
            title: t.confirmDeleteTagTitle || "Delete Tag",
            description: t.confirmDeleteTagDesc || "Are you sure you want to delete this tag?",
            confirmText: t.deleteBtn || "Delete",
            variant: "destructive"
        })) {
            await adminActions.deleteTag(id);
        }
    };

    const triggerCategoryDelete = async (id: number) => {
        if (await confirm({
            title: t.confirmDeleteCatTitle || "Delete Category",
            description: t.confirmDeleteCatDesc || "Are you sure you want to delete this category?",
            confirmText: t.deleteBtn || "Delete",
            variant: "destructive"
        })) {
            await adminActions.deleteCategory(id);
        }
    };

    const triggerManufacturerDelete = async (id: string) => {
        if (await confirm({
            title: t.confirmDeleteMfrTitle || "Delete Manufacturer",
            description: t.confirmDeleteMfrTitle || "Are you sure you want to delete this manufacturer?",
            confirmText: t.deleteBtn || "Delete",
            variant: "destructive"
        })) {
            await adminActions.deleteManufacturer(id);
        }
    };

    return {
        ...adminActions,
        deleteTag: triggerTagDelete,
        deleteCategory: triggerCategoryDelete,
        deleteManufacturer: triggerManufacturerDelete,
    };
};
