import { proxy, useSnapshot } from 'valtio';
import { useMemo } from 'react';

/**
 * Valtio Filter Store
 * 用于存放高频瞬态 UI 状态（筛选、选中项、滚动位置）
 */
export const filterState = proxy({
  searchQuery: '',
  selectedCategoryIds: [] as string[],
  selectedTagIds: [] as string[],
  selectedManufacturerIds: [] as string[],
  isMultiSelect: false,
  selectedPhotoIds: new Set<string>(),
  scrollOffset: 0,
});

/**
 * 封装 useValtioAtom
 * 内部 useMemo 稳定引用，对 React Compiler 友好
 */
export function useFilterState() {
  const snapshot = useSnapshot(filterState);
  return useMemo(() => ({
    ...snapshot,
    // Actions
    setSearchQuery: (query: string) => { filterState.searchQuery = query; },
    toggleCategoryId: (id: string) => {
      const index = filterState.selectedCategoryIds.indexOf(id);
      if (index > -1) filterState.selectedCategoryIds.splice(index, 1);
      else filterState.selectedCategoryIds.push(id);
    },
    toggleTagId: (id: string) => {
      const index = filterState.selectedTagIds.indexOf(id);
      if (index > -1) filterState.selectedTagIds.splice(index, 1);
      else filterState.selectedTagIds.push(id);
    },
    setMultiSelect: (enabled: boolean) => {
      filterState.isMultiSelect = enabled;
      if (!enabled) filterState.selectedPhotoIds.clear();
    },
    togglePhotoSelection: (id: string) => {
      if (filterState.selectedPhotoIds.has(id)) {
        filterState.selectedPhotoIds.delete(id);
      } else {
        filterState.selectedPhotoIds.add(id);
      }
    },
    clearSelection: () => {
      filterState.selectedPhotoIds.clear();
    },
    setScrollOffset: (offset: number) => {
      filterState.scrollOffset = offset;
    }
  }), [snapshot]);
}
