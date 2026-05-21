import { useGalleryStore } from '../store';
import { useCallback, useEffect } from 'react';

export const useMultiSelect = () => {
  const isMultiSelect = useGalleryStore((state) => state.isMultiSelect);
  const selectedIds = useGalleryStore((state) => state.selectedIds);
  const setIsMultiSelect = useGalleryStore((state) => state.setIsMultiSelect);
  const setSelectedPhotoIds = useGalleryStore((state) => state.setSelectedPhotoIds);

  // Automatically exit multi-select mode if selection becomes empty
  useEffect(() => {
    if (isMultiSelect && (selectedIds ?? []).length === 0) {
      setIsMultiSelect(false);
    }
  }, [isMultiSelect, (selectedIds ?? []).length, setIsMultiSelect]);

  const enable = useCallback((initialId?: string) => {
    setIsMultiSelect(true);
    if (initialId) {
      setSelectedPhotoIds([initialId]);
    }
  }, [setIsMultiSelect, setSelectedPhotoIds]);

  const disable = useCallback(() => {
    setIsMultiSelect(false);
    setSelectedPhotoIds([]);
  }, [setIsMultiSelect, setSelectedPhotoIds]);

  const toggle = useCallback((id: string) => {
    setSelectedPhotoIds((prev: string[]) =>
      prev.includes(id) ? prev.filter((i: string) => i !== id) : [...prev, id]
    );
  }, [setSelectedPhotoIds]);

  const clear = useCallback(() => {
    setSelectedPhotoIds([]);
  }, [setSelectedPhotoIds]);

  const reset = useCallback(() => {
    setIsMultiSelect(false);
    setSelectedPhotoIds([]);
  }, [setIsMultiSelect, setSelectedPhotoIds]);

  const selectAll = useCallback((ids: string[]) => {
    setIsMultiSelect(true);
    setSelectedPhotoIds((prev: string[]) => {
      const combined = new Set([...prev, ...ids]);
      return Array.from(combined);
    });
  }, [setIsMultiSelect, setSelectedPhotoIds]);

  const deselectAllForList = useCallback((ids: string[]) => {
    setSelectedPhotoIds((prev: string[]) => prev.filter(id => !ids.includes(id)));
  }, [setSelectedPhotoIds]);

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
