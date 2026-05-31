import { useGalleryStore, useShallow } from '@/store/galleryStore';
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
  const { isMultiSelect, selectedIds, setIsMultiSelect, setSelectedIds } = useGalleryStore(useShallow((state) => ({
    isMultiSelect: state.isMultiSelect,
    selectedIds: state.selectedIds ?? [],
    setIsMultiSelect: state.setIsMultiSelect,
    setSelectedIds: state.setSelectedIds,
  })));

  const enable = useCallback((initialId?: string) => {
    setIsMultiSelect(true);
    if (initialId) {
      setSelectedIds([initialId]);
    }
  }, [setIsMultiSelect, setSelectedIds]);

  const disable = useCallback(() => {
    setIsMultiSelect(false);
    setSelectedIds([]);
  }, [setIsMultiSelect, setSelectedIds]);

  const toggle = useCallback((id: string) => {
    const current = (useGalleryStore.getState().selectedIds) ?? [];
    const next = current.includes(id) 
      ? current.filter((i: string) => i !== id) 
      : [...current, id];
    setSelectedIds(next);
  }, [setSelectedIds]);

  const clear = useCallback(() => {
    setSelectedIds([]);
  }, [setSelectedIds]);

  const reset = useCallback(() => {
    setIsMultiSelect(false);
    setSelectedIds([]);
  }, [setIsMultiSelect, setSelectedIds]);

  const selectAll = useCallback((ids: string[]) => {
    setIsMultiSelect(true);
    const current = (useGalleryStore.getState().selectedIds) ?? [];
    const combined = new Set([...current, ...ids]);
    setSelectedIds(Array.from(combined));
  }, [setIsMultiSelect, setSelectedIds]);

  const deselectAllForList = useCallback((ids: string[]) => {
    const current = (useGalleryStore.getState().selectedIds) ?? [];
    setSelectedIds(current.filter(id => !ids.includes(id)));
  }, [setSelectedIds]);

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
