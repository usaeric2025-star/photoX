import { useGalleryStore } from '../store';
import { useCallback, useEffect } from 'react';

export const useMultiSelect = () => {
  const isMultiSelect = useGalleryStore((state) => state.isMultiSelect);
  const selectedIds = useGalleryStore((state) => state.selectedIds);
  const setIsMultiSelect = useGalleryStore((state) => state.setIsMultiSelect);
  const setSelectedIds = useGalleryStore((state) => state.setSelectedIds);

  // Automatically exit multi-select mode if selection becomes empty
  useEffect(() => {
    if (isMultiSelect && selectedIds.length === 0) {
      setIsMultiSelect(false);
    }
  }, [isMultiSelect, selectedIds.length, setIsMultiSelect]);

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

  const clear = useCallback(() => {
    setSelectedIds([]);
  }, [setSelectedIds]);

  const reset = useCallback(() => {
    setIsMultiSelect(false);
    setSelectedIds([]);
  }, [setIsMultiSelect, setSelectedIds]);

  const selectAll = useCallback((ids: string[]) => {
    setIsMultiSelect(true);
    setSelectedIds((prev: string[]) => {
      const combined = new Set([...prev, ...ids]);
      return Array.from(combined);
    });
  }, [setIsMultiSelect, setSelectedIds]);

  const deselectAllForList = useCallback((ids: string[]) => {
    setSelectedIds((prev: string[]) => prev.filter(id => !ids.includes(id)));
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
  };
};
