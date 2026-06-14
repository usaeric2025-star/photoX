import { useFilters } from '../useFilters';

/**
 * @deprecated Use useFilters directly.
 * Legacy compatibility wrapper for useUrlFilters.
 */
export function useUrlFilters() {
  const f = useFilters();

  const dataFilters = {
    categoryId: f.category || null,
    tagId: f.tags?.[0] || null,
    manufacturerId: null,
    searchQuery: f.search || '',
    sortOrder: f.sort || 'newest',
    showGroupsCollapsed: f.showGroupsCollapsed !== false,
    is_hidden: f.status === 'hidden',
    onlyUngrouped: false,
  };

  const uiState = {
    photoId: f.photoId || null,
    groupId: f.groupId || null,
    view: 'grid' 
  };

  const filters = {
    ...dataFilters,
    ...uiState
  };

  return { 
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
  };
}
