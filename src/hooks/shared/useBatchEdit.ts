import { useState, useCallback } from 'react';
import { useGalleryStore, useShallow } from '@/store';
import { useAdminActions } from '@/features/admin/useAdminActions';
import { useFeedback } from '@/hooks/shared/useFeedback';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { photoKeys } from '@/lib/queryKeys';
import * as photos from '@/services/photos';

export function useBatchEdit() {
  const queryClient = useQueryClient();
  const { 
    batchEditingIds, setBatchEditingIds,
    formState, updateForm, resetForm
  } = useGalleryStore(useShallow(s => ({
    batchEditingIds: s.batchEditingIds,
    setBatchEditingIds: s.setBatchEditingIds,
    formState: s.formState,
    updateForm: s.updateForm,
    resetForm: s.resetForm
  })));

  const { deletePhoto, updatePhoto, batchUpdate } = useAdminActions();
  const { showError, showSuccess } = useFeedback();

  const [batchIsHiddenApplied, setBatchIsHiddenApplied] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSave = async () => {
    if (!batchEditingIds || batchEditingIds.length === 0) return;
    
    setIsSyncing(true);
    try {
      const updates: any = { ...formState };
      if (!batchIsHiddenApplied) {
        delete updates.is_hidden;
      }
      
      // Filter out empty fields to avoid overwriting with empty values
      const cleanUpdates: any = {};
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== '' && value !== undefined && value !== null) {
          if (Array.isArray(value) && value.length === 0) return;
          cleanUpdates[key] = value;
        }
      });

      await batchUpdate.mutateAsync({ ids: batchEditingIds, updates: cleanUpdates });
      setBatchEditingIds(null);
      resetForm();
    } catch (err) {
      showError(err as Error, '保存失败');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async () => {
    if (!batchEditingIds || batchEditingIds.length === 0) return;
    try {
      await deletePhoto(batchEditingIds);
      setBatchEditingIds(null);
      resetForm();
    } catch (err) {
      showError(err as Error, '删除失败');
    }
  };

  return {
    batchEditIds: batchEditingIds || [],
    formState,
    handleUpdateForm: updateForm,
    handleSave,
    handleDelete,
    handleClose: () => {
      setBatchEditingIds(null);
      resetForm();
    },
    isLocalSaving: false,
    isSyncing,
    batchIsHiddenApplied,
    setBatchIsHiddenApplied,
    logic: {
      handleDeletePhotos: true, // Marker for UI
      quickAddManufacturer: () => {},
      addTag: async () => {},
      updateTag: async () => {},
      deleteTag: async () => {},
    }
  };
}
