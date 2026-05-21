import { useGalleryStore } from '../store';
import { useCallback } from 'react';

export const useMultiSelect = () => {
  const isMultiSelect = useGalleryStore((state) => state.isMultiSelect);
  const selectedIds = useGalleryStore((state) => state.selectedIds);
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
    setSelectedIds((prev: string[]) =>
      prev.includes(id) ? prev.filter((i: string) => i !== id) : [...prev, id]
    );
  }, [setSelectedIds]);

  const clear = useCallback(() => setSelectedIds([]), [setSelectedIds]);

  const reset = useCallback(() => {
    setIsMultiSelect(false);
    setSelectedIds([]);
  }, [setIsMultiSelect, setSelectedIds]);

  return {
    isMultiSelect,
    selectedIds,
    enable,
    disable,
    toggle,
    clear,
    reset,
  };
};
