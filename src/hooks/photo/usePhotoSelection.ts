import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { useUI, storeAccessor } from '@/lib/store';
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
  const isMultiSelect = useUI((state) => state.isMultiSelect);
  const selectedIds = useUI((state) => state.selectedIds) || [];
  const batchEditingIds = useUI(s => s.batchEditingIds);
  const formState = useUI(s => s.formState);
  const update = useUI((state) => state.update);
  const updateForm = useUI(s => s.updateForm);
  const resetForm = useUI(s => s.resetForm);

  const { deletePhoto, batchUpdate } = useAdminMaintenance();
  const { navigate, route } = useAppRouter();
  

  const [batchIsHiddenApplied, setBatchIsHiddenApplied] = useState(false);

  // --- 狀態切換邏輯 (來自 useMultiSelect) ---

  const enable = useCallback((initialId?: string) => {
    update({ 
      isMultiSelect: true, 
      selectedIds: initialId ? [initialId] : [] 
    });
  }, [update]);

  const disable = () => {
    update({ 
      isMultiSelect: false, 
      selectedIds: [] 
    });
  };

  const toggle = useCallback((id: string) => {
    const current = (storeAccessor.ui.selectedIds) ?? [];
    const next = current.includes(id) 
      ? current.filter((i: string) => i !== id) 
      : [...current, id];
    update({ selectedIds: next });
  }, [update]);

  const clear = () => {
    update({ selectedIds: [] });
  };

  const reset = () => {
    update({ 
      isMultiSelect: false, 
      selectedIds: [] 
    });
  };

  const selectAll = useCallback((ids: string[]) => {
    const current = (storeAccessor.ui.selectedIds) ?? [];
    const combined = new Set([...current, ...ids]);
    update({ 
      isMultiSelect: true, 
      selectedIds: Array.from(combined) 
    });
  }, [update]);

  const deselectAllForList = useCallback((ids: string[]) => {
    const current = (storeAccessor.ui.selectedIds) ?? [];
    update(state => ({ selectedIds: current.filter((id: string) => !ids.includes(id)) }));
  }, [update]);

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
    update({ batchEditingIds: null, isMultiSelect: false, selectedIds: [] });
    resetForm();
    if (route === 'adminBatchEdit') {
      navigate.admin();
    }
  };

  const handleDelete = async () => {
    const ids = batchEditingIds || selectedIds;
    if (!ids || ids.length === 0) return;
    
    await deletePhoto.mutateAsync(ids);
    update({ batchEditingIds: null, isMultiSelect: false, selectedIds: [] });
    resetForm();
    if (route === 'adminBatchEdit') {
      navigate.admin();
    }
  };

  const handleClose = () => {
    update({ batchEditingIds: null });
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
    isSyncing: batchUpdate.isPending,
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
