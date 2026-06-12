import { useState } from 'react';
import { useDisclosure } from '@/hooks/core/useDisclosure';
import { useAdminCategory } from '@/hooks';
import { useUIStore } from '@/store/useUIStore';

export const useSettingsManagement = () => {
    const update = useUIStore((s) => s.update);
    const [tagToDelete, setTagToDelete] = useState<string | null>(null);
    const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
    const [manufacturerToDelete, setManufacturerToDelete] = useState<string | null>(null);

    const [isTagDeleteOpen, tagDeleteDialog] = useDisclosure(false);
    const [isCategoryDeleteOpen, categoryDeleteDialog] = useDisclosure(false);
    const [isManufacturerDeleteOpen, manufacturerDeleteDialog] = useDisclosure(false);

    const adminActions = useAdminCategory({ update });

    const triggerTagDelete = (id: string) => {
        setTagToDelete(id);
        tagDeleteDialog.open();
    };

    const triggerCategoryDelete = (id: string) => {
        setCategoryToDelete(id);
        categoryDeleteDialog.open();
    };

    const triggerManufacturerDelete = (id: string) => {
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
