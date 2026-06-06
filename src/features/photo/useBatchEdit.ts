import { useState, useCallback } from 'react';
import { useUIStore } from '@/store/useUIStore';
import { useAdminActions } from '@/features/admin/useAdminActions';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { photoKeys } from '@/lib/queryKeys';
import { useErrorHandler } from '@/hooks';

export function useBatchEdit() {
  const queryClient = useQueryClient();
  const batchEditingIds = useUIStore(s => s.batchEditingIds);
  const update = useUIStore(s => s.update);
  const formState = useUIStore(s => s.formState);
  const updateForm = useUIStore(s => s.updateForm);
  const resetForm = useUIStore(s => s.resetForm);

  const { deletePhoto, updatePhoto, batchUpdate } = useAdminActions();
  const { handleError } = useErrorHandler();

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
      update({ batchEditingIds: null });
      resetForm();
    } catch (err) {
      handleError(err as Error, '保存失败');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async () => {
    if (!batchEditingIds || batchEditingIds.length === 0) return;
    
    try {
      await deletePhoto(batchEditingIds);
      update({ batchEditingIds: null });
      resetForm();
    } catch (err) {
      handleError(err as Error, '删除失败');
    }
  };

  return {
    batchEditIds: batchEditingIds || [],
    formState,
    handleUpdateForm: updateForm,
    handleSave,
    handleDelete,
    handleClose: () => {
      update({ batchEditingIds: null });
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
