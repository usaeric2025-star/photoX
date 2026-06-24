import { useState } from 'react';
import { useDisclosure } from '@/hooks/core/useDisclosure';
import { useAdminCategory } from '@/hooks/admin/useAdminCategory';
import { useUI, UIStoreState } from '@/lib/store';

export const useSettingsManagement = () => {
    const patch = useUI((s: UIStoreState) => s.patch);
    const [tagToDelete, setTagToDelete] = useState<number | null>(null);
    const [categoryToDelete, setCategoryToDelete] = useState<number | null>(null);
    const [manufacturerToDelete, setManufacturerToDelete] = useState<number | null>(null);

    const [isTagDeleteOpen, tagDeleteDialog] = useDisclosure(false);
    const [isCategoryDeleteOpen, categoryDeleteDialog] = useDisclosure(false);
    const [isManufacturerDeleteOpen, manufacturerDeleteDialog] = useDisclosure(false);

    const adminActions = useAdminCategory();

    const triggerTagDelete = (id: number) => {
        setTagToDelete(id);
        tagDeleteDialog.open();
    };

    const triggerCategoryDelete = (id: number) => {
        setCategoryToDelete(id);
        categoryDeleteDialog.open();
    };

    const triggerManufacturerDelete = (id: number) => {
        setManufacturerToDelete(id);
        manufacturerDeleteDialog.open();
    };

    const deleteTagRaw = adminActions.deleteTag;
    const deleteCategoryRaw = adminActions.deleteCategory;
    const deleteManufacturerRaw = adminActions.deleteManufacturer;

    return {
        ...adminActions,
        tagToDelete,
        categoryToDelete,
        manufacturerToDelete,
        isTagDeleteOpen,
        tagDeleteDialog,
        isCategoryDeleteOpen,
        categoryDeleteDialog,
        isManufacturerDeleteOpen,
        manufacturerDeleteDialog,
        deleteTag: triggerTagDelete,
        deleteCategory: triggerCategoryDelete,
        deleteManufacturer: triggerManufacturerDelete,
        deleteTagRaw: adminActions.deleteTag,
        deleteCategoryRaw: adminActions.deleteCategory,
        deleteManufacturerRaw: adminActions.deleteManufacturer,
    };
};
