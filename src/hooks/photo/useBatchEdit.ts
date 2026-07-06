import { useSelectionActions } from '../../services/selection/selectionService.js';
import { selectionStore } from '#src/services/selection/selectionService.js';
import { useSignal, useUI, UIStoreState } from '#lib/store/index.js';
import { batchEditingIdsSignal } from '#src/services/selection/selectionService.js';
import { useAppRouter } from '#lib/router/index.js';
import { usePhotoMutations } from '#src/hooks/photo/usePhotoMutations.js';

export function useBatchEdit() {
  const batchEditingIds = useSignal(batchEditingIdsSignal);
  const { patch: patchSelection } = useSelectionActions();
  const formState = useUI((s: UIStoreState) => s.formState);
  const patch = useUI((state: UIStoreState) => state.patch);
  const updateForm = useUI((s: UIStoreState) => s.updateForm);
  const resetForm = useUI((s: UIStoreState) => s.resetForm);

  const { batchEditAsync, deletePhotoAsync, isBatchEditing, isDeleting } = usePhotoMutations();
  const isPending = isBatchEditing || isDeleting;
  const { navigate, route } = useAppRouter();

  const handleSave = async (selectedIds: string[]) => {
    const ids = batchEditingIds || selectedIds;
    if (!ids || ids.length === 0) return;
    
    const updates = { ...formState } as Record<string, unknown>;
    
    const cleanUpdates: Record<string, unknown> = {};
    Object.entries(updates).forEach(([key, value]) => {
      // 只有當值不是 undefined 且不是空字串時才發送 (null 是有效的，代表清空)
      if (value !== '' && value !== undefined) {
        if (Array.isArray(value) && value.length === 0) return;
        cleanUpdates[key] = value;
      }
    });

    await batchEditAsync({ ids, updates: cleanUpdates });
    patchSelection({ batchEditingIds: null });
    resetForm();
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    if (route?.name === 'adminBatchEdit' || pathname.startsWith('/admin/batch-edit')) {
      navigate.admin();
    }
  };

  const handleDelete = async (selectedIds: string[]) => {
    const ids = batchEditingIds || selectedIds;
    if (!ids || ids.length === 0) return;
    
    await deletePhotoAsync(ids);
    patchSelection({ batchEditingIds: null, selectedIds: [] });
    resetForm();
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    if (route?.name === 'adminBatchEdit' || pathname.startsWith('/admin/batch-edit')) {
      navigate.admin();
    }
  };

  const handleClose = () => {
    patchSelection({ batchEditingIds: null });
    resetForm();
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    if (route?.name === 'adminBatchEdit' || pathname.startsWith('/admin/batch-edit')) {
      navigate.admin();
    }
  };

  return {
    batchEditIds: batchEditingIds || [],
    formState,
    handleUpdateForm: updateForm,
    handleSave,
    handleDelete,
    handleClose,
    isSyncing: isPending,
  };
}
