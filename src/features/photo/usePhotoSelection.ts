import { useUIStore, useShallow } from '@/store/useUIStore';
import { useCallback } from 'react';

/**
 * @hook-contract {
 *   "inputs": {},
 *   "outputs": {
 *     "isMultiSelect": "boolean",
 *     "selectedIds": "string[]",
 *     "enable": "Function",
 *     "disable": "Function",
 *     "toggle": "Function",
 *     "clear": "Function",
 *     "reset": "Function",
 *     "selectAll": "Function",
 *     "deselectAllForList": "Function",
 *     "activeClearSelection": "Function"
 *   },
 *   "invariants": [
 *     "返回具名對象而非數組",
 *     "管理多選狀態的開關及項目清單"
 *   ],
 *   "forbidden": ["禁止直接調用原生 DOM API"],
 *   "ai_maintenance_rule": "修改此 Hook 前必須先讀取並更新 @hook-contract"
 * }
 */
export const useMultiSelect = () => {
  const { isMultiSelect, selectedIds, update } = useUIStore(useShallow((state) => ({
    isMultiSelect: state.isMultiSelect,
    selectedIds: state.selectedIds ?? [],
    update: state.update,
  })));

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

  return {
    isMultiSelect,
    selectedIds,
    enable,
    disable,
    toggle,
    clear,
    reset,
    selectAll,
    deselectAllForList,
    activeClearSelection: clear,
  };
};
