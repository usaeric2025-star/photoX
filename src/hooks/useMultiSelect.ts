import { useGalleryStore } from '../store';
import { useCallback } from 'react';

export const useMultiSelect = () => {
  const isMultiSelect = useGalleryStore((state) => state.isMultiSelect);
  const selectedIds = useGalleryStore((state) => state.selectedIds) ?? [];
  const setIsMultiSelect = useGalleryStore((state) => state.setIsMultiSelect);
  const setSelectedIds = useGalleryStore((state) => state.setSelectedIds);

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
    const current = useGalleryStore.getState().selectedIds;
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
    const current = useGalleryStore.getState().selectedIds;
    const combined = new Set([...current, ...ids]);
    setSelectedIds(Array.from(combined));
  }, [setIsMultiSelect, setSelectedIds]);

  const deselectAllForList = useCallback((ids: string[]) => {
    const current = useGalleryStore.getState().selectedIds;
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
