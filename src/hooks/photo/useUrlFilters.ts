import { useFilters } from '../useFilters';
import { useMemo } from 'react';

/**
 * @deprecated Use useFilters directly.
 * Legacy compatibility wrapper for useUrlFilters.
 */
export function useUrlFilters() {
  const f = useFilters();

  const tagsString = Array.isArray(f.tags) ? f.tags.join(',') : '';

  const dataFilters = useMemo(() => ({
    categoryId: f.category || null,
    tagId: f.tags?.[0] || null,
    manufacturerId: null,
    searchQuery: f.search || '',
    sortOrder: f.sort || 'newest',
    showGroupsCollapsed: f.showGroupsCollapsed !== false,
    is_hidden: f.status === 'hidden',
    onlyUngrouped: false,
  }), [f.category, tagsString, f.search, f.sort, f.showGroupsCollapsed, f.status]);

  const uiState = useMemo(() => ({
    photoId: f.photoId || null,
    groupId: f.groupId || null,
    view: 'grid' 
  }), [f.photoId, f.groupId]);

  const filters = useMemo(() => ({
    ...dataFilters,
    ...uiState
  }), [dataFilters, uiState]);

  return useMemo(() => ({ 
    filters, 
    dataFilters,
    uiState,
    setCategory: f.setCategory, 
    setTagId: (id: string | null) => f.setTags(id ? [id] : []), 
    setSearchQuery: f.setSearch, 
    setSortOrder: f.setSort, 
    setGroupId: f.setGroupId, 
    setPhotoId: f.setPhotoId, 
    setShowGroupsCollapsed: f.setShowGroupsCollapsed, 
    setView: () => {} // No-op
  }), [filters, dataFilters, uiState, f.setCategory, f.setTags, f.setSearch, f.setSort, f.setGroupId, f.setPhotoId, f.setShowGroupsCollapsed]);
}
