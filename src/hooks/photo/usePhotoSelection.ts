import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { useUI, storeAccessor, UIStoreState } from '@/lib/store';
import { useCallback, useState } from 'react';
import { useAdminMaintenance } from '@/hooks/admin/useAdminMaintenance';
import { useAppRouter } from '@/lib/router/useAppRouter';


/**
 * usePhotoSelection
 * 合併了多選狀態管理與批量操作邏輯。
 * 替換了原有的 useMultiSelect 與 useBatchEdit。
 * 
 * @hook-contract
 * inputs: none
 * outputs: { isMultiSelect: boolean, selectedIds: string[], ... }
 * invariants: stateless (delegates to UIStore)
 * 
 * @deps-contract: static=[useUI, useAdminMaintenance, useRouterSafe, useCallback, useState] dynamic=[]
 */
export const usePhotoSelection = () => {
  const isMultiSelect = useUI((state: UIStoreState) => state.isMultiSelect);
  const selectedIds = useUI((state: UIStoreState) => state.selectedIds) || [];
  const batchEditingIds = useUI((s: UIStoreState) => s.batchEditingIds);
  const formState = useUI((s: UIStoreState) => s.formState);
  const patch = useUI((state: UIStoreState) => state.patch);
  const updateForm = useUI((s: UIStoreState) => s.updateForm);
  const resetForm = useUI((s: UIStoreState) => s.resetForm);

  const { deletePhoto, batchUpdate } = useAdminMaintenance();
  const { navigate, route } = useAppRouter();
  

  const [batchIsHiddenApplied, setBatchIsHiddenApplied] = useState(false);

  // --- 狀態切換邏輯 (來自 useMultiSelect) ---

  const enable = useCallback((initialId?: string) => {
    patch({ 
      isMultiSelect: true, 
      selectedIds: initialId ? [initialId] : [] 
    });
  }, [patch]);

  const disable = () => {
    patch({ 
      isMultiSelect: false, 
      selectedIds: [] 
    });
  };

  const toggle = useCallback((id: string) => {
    const current = (storeAccessor.ui.selectedIds) ?? [];
    const next = current.includes(id) 
      ? current.filter((i: string) => i !== id) 
      : [...current, id];
    patch({ selectedIds: next });
  }, [patch]);

  const clear = () => {
    patch({ selectedIds: [] });
  };

  const reset = () => {
    patch({ 
      isMultiSelect: false, 
      selectedIds: [] 
    });
  };

  const selectAll = useCallback((ids: string[]) => {
    const current = (storeAccessor.ui.selectedIds) ?? [];
    const combined = new Set([...current, ...ids]);
    patch({ 
      isMultiSelect: true, 
      selectedIds: Array.from(combined) 
    });
  }, [patch]);

  const deselectAllForList = useCallback((ids: string[]) => {
    const current = (storeAccessor.ui.selectedIds) ?? [];
    patch((state: UIStoreState) => ({ selectedIds: current.filter((id: string) => !ids.includes(id)) }));
  }, [patch]);

  // --- 批量操作邏輯 (來自 useBatchEdit) ---

  const handleSave = async () => {
    const ids = batchEditingIds || selectedIds;
    if (!ids || ids.length === 0) return;
    
    const updates = { ...formState } as Record<string, unknown>;
    if (!batchIsHiddenApplied) {
      delete updates.is_hidden;
    }
    
    const cleanUpdates: Record<string, unknown> = {};
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== '' && value !== undefined && value !== null) {
        if (Array.isArray(value) && value.length === 0) return;
        cleanUpdates[key] = value;
      }
    });

    await batchUpdate.mutateAsync({ ids, updates: cleanUpdates });
    patch({ batchEditingIds: null, isMultiSelect: false, selectedIds: [] });
    resetForm();
    if (route === 'adminBatchEdit') {
      navigate.admin();
    }
  };

  const handleDelete = async () => {
    const ids = batchEditingIds || selectedIds;
    if (!ids || ids.length === 0) return;
    
    await deletePhoto.mutateAsync(ids);
    patch({ batchEditingIds: null, isMultiSelect: false, selectedIds: [] });
    resetForm();
    if (route === 'adminBatchEdit') {
      navigate.admin();
    }
  };

  const handleClose = () => {
    patch({ batchEditingIds: null });
    resetForm();
    if (route === 'adminBatchEdit') {
      navigate.admin();
    }
  };

  return {
    // 狀態
    isMultiSelect,
    selectedIds,
    batchEditIds: batchEditingIds || [],
    formState,
    isSyncing: batchUpdate.isMutating,
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
