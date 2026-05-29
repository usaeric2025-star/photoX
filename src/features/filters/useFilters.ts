import { useSelector } from '@xstate/react';
import { createActor } from 'xstate';
import { filtersMachine } from './filters.machine';

// [V2.8-FILTERS-SYNC] Global service to sync filters across GalleryFilters and UnifiedGallery
export const filtersService = createActor(filtersMachine).start();

export function useFilters() {
  const state = useSelector(filtersService, (s) => s);

  return {
    filters: state.context,
    setCategory: (categoryId: string | null) => filtersService.send({ type: 'SET_CATEGORY', categoryId }),
    setTags: (tagIds: string[]) => filtersService.send({ type: 'SET_TAGS', tagIds }),
    setSearch: (searchQuery: string) => filtersService.send({ type: 'SET_SEARCH', searchQuery }),
    setShowGroupsCollapsed: (showGroupsCollapsed: boolean) => filtersService.send({ type: 'SET_GROUPS_COLLAPSED', showGroupsCollapsed }),
    resetFilters: () => filtersService.send({ type: 'RESET' }),
  };
}
