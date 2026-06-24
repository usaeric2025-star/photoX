import { useFilters } from '@/hooks/useFilters';
import { useMemo } from 'react';
import type { FilterState, SortOrder } from './types';

export function useFilterState() {
  const f = useFilters({ enableStatus: false });

  const filters: FilterState = useMemo(() => ({
    search: f.search || '',
    categoryId: f.category ? Number(f.category) : null,
    tagIds: f.tags || [],
    sort: (f.sort as SortOrder) || 'newest',
  }), [f.search, f.category, f.tags, f.sort]);

  const updateFilters = (updates: Partial<FilterState>) => {
    const routeUpdates: Record<string, unknown> = {};
    if (updates.search !== undefined) routeUpdates.q = updates.search || undefined;
    if (updates.categoryId !== undefined) {
      routeUpdates.cat = updates.categoryId || undefined;
      // When a specific category is selected, clear tags to avoid aggregation
      if (updates.categoryId) {
        routeUpdates.tag = undefined;
      }
    }
    if (updates.tagIds !== undefined) {
      routeUpdates.tag = updates.tagIds.length === 0 ? undefined : updates.tagIds;
      // When tags are selected, clear category to avoid aggregation
      if (updates.tagIds && updates.tagIds.length > 0) {
        routeUpdates.cat = undefined;
      }
    }
    if (updates.sort !== undefined) routeUpdates.sort = updates.sort || undefined;
    
    f.updateFilters(routeUpdates);
  };

  return { filters, updateFilters };
}
