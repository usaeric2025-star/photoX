import { useState } from 'react';
import { useDisclosure } from '@/hooks/core/useDisclosure';
import { useAdminMaintenance } from './useAdminMaintenance';
import { useUIStore } from '@/store/useUIStore';

/**
 * Handle administrative selection actions (批量删除, 批量隐藏, etc.)
 */
export const useAdminSelection = () => {
    const [isDeleteOpen, { open, close, toggle }] = useDisclosure(false);
    const [idsToDelete, setIdsToDelete] = useState<string[]>([]);
    const adminActions = useAdminMaintenance();
    const update = useUIStore(s => s.update);

    const initiateDelete = (ids: string[]) => {
        setIdsToDelete(ids);
        open();
    };

    const confirmDelete = async () => {
        await adminActions.deletePhoto(idsToDelete);
        close();
    };

    const initiateHide = (ids: string[]) => {
        adminActions.batchUpdate.mutateAsync({ ids, updates: { is_hidden: true } });
    };

    const initiateBatchEdit = (ids: string[]) => {
        update({ batchEditingIds: ids });
    };

    return {
        isDeleteOpen,
        idsToDelete,
        deleteDialogControl: { open, close, toggle },
        initiateDelete,
        confirmDelete,
        initiateHide,
        initiateBatchEdit
    };
};
