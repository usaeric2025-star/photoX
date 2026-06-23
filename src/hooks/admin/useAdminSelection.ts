import { useState } from 'react';
import { useDisclosure } from '@/hooks/core/useDisclosure';
import { useAdminMaintenance } from './useAdminMaintenance';
import { useUI, UIStoreState } from '@/lib/store';
import { useAppRouter } from '@/lib/router/useAppRouter';

/**
 * Handle administrative selection actions (批量删除, 批量隐藏, etc.)
 */
export const useAdminSelection = () => {
    const [isDeleteOpen, { open, close, toggle }] = useDisclosure(false);
    const [idsToDelete, setIdsToDelete] = useState<string[]>([]);
    const adminActions = useAdminMaintenance();
    const patch = useUI((s: UIStoreState) => s.patch);
    const { navigate } = useAppRouter();

    const initiateDelete = (ids: string[]) => {
        setIdsToDelete(ids);
        open();
    };

    const confirmDelete = async () => {
        await adminActions.deletePhoto.mutateAsync(idsToDelete);
        close();
    };

    const initiateHide = (ids: string[]) => {
        adminActions.batchUpdate.mutateAsync({ ids, updates: { is_hidden: true } });
    };

    const initiateBatchEdit = (ids: string[]) => {
        patch({ batchEditingIds: ids });
        navigate.adminBatchEdit();
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
