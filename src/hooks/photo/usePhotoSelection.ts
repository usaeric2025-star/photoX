import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { useUIStore } from '@/store/useUIStore';
import { useCallback, useState } from 'react';
import { useAdminMaintenance } from '@/hooks/admin/useAdminMaintenance';
import { useRouterSafe } from '@/hooks/core/useRouterSafe';


/**
 * usePhotoSelection
 * 合併了多選狀態管理與批量操作邏輯。
 * 替換了原有的 useMultiSelect 與 useBatchEdit。
 */
export const usePhotoSelection = () => {
  const isMultiSelect = useUIStore((state) => state.isMultiSelect);
  const selectedIds = useUIStore((state) => state.selectedIds) || [];
  const batchEditingIds = useUIStore(s => s.batchEditingIds);
  const formState = useUIStore(s => s.formState);
  const update = useUIStore((state) => state.update);
  const updateForm = useUIStore(s => s.updateForm);
  const resetForm = useUIStore(s => s.resetForm);

  const { deletePhoto, batchUpdate } = useAdminMaintenance();
  const navigate = useRouterSafe().navigate;
  

  const [batchIsHiddenApplied, setBatchIsHiddenApplied] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // --- 狀態切換邏輯 (來自 useMultiSelect) ---

  const enable = useCallback((initialId?: string) => {
    update({ 
      isMultiSelect: true, 
      selectedIds: initialId ? [initialId] : [] 
    });
  }, [update]);

  const disable = useCallback(() => {
    update({ 
      isMultiSelect: false, 
      selectedIds: [] 
    });
  }, [update]);

  const toggle = useCallback((id: string) => {
    const current = (useUIStore.getState().selectedIds) ?? [];
    const next = current.includes(id) 
      ? current.filter((i: string) => i !== id) 
      : [...current, id];
    update({ selectedIds: next });
  }, [update]);

  const clear = useCallback(() => {
    update({ selectedIds: [] });
  }, [update]);

  const reset = useCallback(() => {
    update({ 
      isMultiSelect: false, 
      selectedIds: [] 
    });
  }, [update]);

  const selectAll = useCallback((ids: string[]) => {
    const current = (useUIStore.getState().selectedIds) ?? [];
    const combined = new Set([...current, ...ids]);
    update({ 
      isMultiSelect: true, 
      selectedIds: Array.from(combined) 
    });
  }, [update]);

  const deselectAllForList = useCallback((ids: string[]) => {
    const current = (useUIStore.getState().selectedIds) ?? [];
    update(state => ({ selectedIds: current.filter(id => !ids.includes(id)) }));
  }, [update]);

  // --- 批量操作邏輯 (來自 useBatchEdit) ---

  const handleSave = async () => {
    const ids = batchEditingIds || selectedIds;
    if (!ids || ids.length === 0) return;
    
    setIsSyncing(true);
    try {
      const updates: any = { ...formState };
      if (!batchIsHiddenApplied) {
        delete updates.is_hidden;
      }
      
      const cleanUpdates: any = {};
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== '' && value !== undefined && value !== null) {
          if (Array.isArray(value) && value.length === 0) return;
          cleanUpdates[key] = value;
        }
      });

      await batchUpdate.mutateAsync({ ids, updates: cleanUpdates });
      update({ batchEditingIds: null, isMultiSelect: false, selectedIds: [] });
      resetForm();
      if (window.location.pathname === '/admin/batch-edit') {
        navigate({ to: '/admin' });
      }
    } catch (e: unknown) {
      ErrorFactory.handle(e, '批量保存失敗');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async () => {
    const ids = batchEditingIds || selectedIds;
    if (!ids || ids.length === 0) return;
    await deletePhoto(ids);
    update({ batchEditingIds: null, isMultiSelect: false, selectedIds: [] });
    resetForm();
    if (window.location.pathname === '/admin/batch-edit') {
      navigate({ to: '/admin' });
    }
  };

  const handleClose = useCallback(() => {
    update({ batchEditingIds: null });
    resetForm();
    if (window.location.pathname === '/admin/batch-edit') {
      navigate({ to: '/admin' });
    }
  }, [update, resetForm, navigate]);

  return {
    // 狀態
    isMultiSelect,
    selectedIds,
    batchEditIds: batchEditingIds || [],
    formState,
    isSyncing,
    batchIsHiddenApplied,
    
    // 操作
    enable,
    disable,
    toggle,
    clear,
    reset,
    selectAll,
    deselectAllForList,
    activeClearSelection: clear,
    
    // 批量編輯
    setBatchIsHiddenApplied,
    handleUpdateForm: updateForm,
    handleSave,
    handleDelete,
    handleClose,
    
    // 兼容層
    logic: {
      handleDeletePhotos: true,
      quickAddManufacturer: () => {},
      addTag: async () => {},
      updateTag: async () => {},
      deleteTag: async () => {},
    }
  };
};
