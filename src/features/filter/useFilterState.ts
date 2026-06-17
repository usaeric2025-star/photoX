import { useFilters } from '@/hooks/useFilters';
import { useMemo } from 'react';
import type { FilterState, SortOrder, StatusFilter } from './types';

export function useFilterState() {
  const f = useFilters({ enableStatus: true });

  const filters: FilterState = useMemo(() => ({
    search: f.search || '',
    categoryId: f.category || null,
    tagIds: f.tags || [],
    sort: (f.sort as SortOrder) || 'newest',
    status: (f.status as StatusFilter) || 'all',
  }), [f.search, f.category, f.tags, f.sort, f.status]);

  const updateFilters = (updates: Partial<FilterState>) => {
    if (updates.search !== undefined) f.setSearch(updates.search);
    if (updates.categoryId !== undefined) {
      f.setCategory(updates.categoryId || '');
      // When a specific category is selected, clear tags to avoid aggregation
      if (updates.categoryId) {
        f.setTags([]);
      }
    }
    if (updates.tagIds !== undefined) {
      f.setTags(updates.tagIds);
      // When tags are selected, clear category to avoid aggregation
      if (updates.tagIds && updates.tagIds.length > 0) {
        f.setCategory('');
      }
    }
    if (updates.sort !== undefined) f.setSort(updates.sort);
    if (updates.status !== undefined) f.setStatus(updates.status);
  };

  return { filters, updateFilters };
}
