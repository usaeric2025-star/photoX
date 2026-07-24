import { useAtomValue } from 'jotai';
import { formStateAtom } from '#src/store/index.js';
import { resetForm, updateForm } from '#lib/store/index.js';
import { useTranslation, useAppLocation } from '#src/hooks/core/index.js';
import { usePhotoMutations } from '#src/hooks/photo/index.js';
import { useSelectionActions, useSelectedIds } from '#src/hooks/index.js';
import { useLocation } from 'react-router-dom';

/**
 * useBatchEdit
 * 專用於批量編輯畫面的邏輯控制 Hook。
 * 遵循「就近整合」與「反過度拆分」規範，作為 BatchEdit 特有的 Local Hook。
 */
export function useBatchEdit() {
  const { t } = useTranslation();
  const globalSelectedIds = useSelectedIds();
  const locationObj = useLocation();
  const stateSelectedIds = locationObj.state?.selectedIds as string[] | undefined;
  
  const selectedIds = stateSelectedIds || globalSelectedIds;
  const { patch: patchSelection } = useSelectionActions();
  const formState = useAtomValue(formStateAtom);
  const { batchEditAsync, deletePhotoAsync, isBatchEditing, isDeleting } = usePhotoMutations();
  const [location, setLocation] = useAppLocation();

  const handleSave = async () => {
    if (!selectedIds || selectedIds.length === 0) return;
    
    const updates = { ...formState } as Record<string, unknown>;
    const cleanUpdates: Record<string, unknown> = {};
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== '' && value !== undefined) {
        if (Array.isArray(value) && value.length === 0) return;
        cleanUpdates[key] = value;
      }
    });

    await batchEditAsync({ ids: selectedIds, updates: cleanUpdates });
    patchSelection({ selectedIds: [] });
    resetForm();
    if (location.startsWith('/admin/batch-edit')) {
      setLocation('/admin');
    }
  };

  const handleDelete = async () => {
    if (!selectedIds || selectedIds.length === 0) return;
    await deletePhotoAsync(selectedIds);
    patchSelection({ selectedIds: [] });
    if (location.startsWith('/admin/batch-edit')) {
      setLocation('/admin');
    }
  };

  const handleClose = () => {
    patchSelection({ selectedIds: [] });
    resetForm();
    if (location.startsWith('/admin/batch-edit')) {
      setLocation('/admin');
    }
  };

  return {
    batchEditIds: selectedIds,
    formState,
    handleUpdateForm: updateForm,
    handleSave,
    handleDelete,
    handleClose,
    isSyncing: isBatchEditing || isDeleting,
  };
}
