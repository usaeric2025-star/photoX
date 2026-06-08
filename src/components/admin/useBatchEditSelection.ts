import { usePhotoSelection } from '@/hooks';

/**
 * useBatchEditSelection
 * Specialized selection and action logic for the Batch Edit Screen.
 * Wraps the generic usePhotoSelection hook.
 */
export const useBatchEditSelection = () => {
  const selection = usePhotoSelection();

  return {
    batchEditIds: selection.batchEditIds,
    formState: selection.formState,
    handleUpdateForm: selection.handleUpdateForm,
    handleSave: selection.handleSave,
    handleDelete: selection.handleDelete,
    handleClose: selection.handleClose,
    isSyncing: selection.isSyncing,
    batchIsHiddenApplied: selection.batchIsHiddenApplied,
    setBatchIsHiddenApplied: selection.setBatchIsHiddenApplied,
    logic: selection.logic,
  };
};
