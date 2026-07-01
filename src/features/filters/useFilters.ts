import { useCallback, useMemo } from 'react';
import { useQueryStates } from 'nuqs';
import { 
  searchParser, 
  categoryParser, 
  tagsParser, 
  sortParser, 
  statusParser, 
  batchParser, 
  parseAsPhotoId, 
  groupIdParser, 
  modalParser, 
  viewParser,
  anchorParser,
  showGroupsCollapsedParser,
  selectedIdsParser 
} from '#lib/nuqs/parsers';
import { Router } from '#src/router';
import { useUI, uiStore, lightboxCurrentIndex } from '#lib/store';
import { useAppRoute } from '#lib/router';
import type { FilterState, SortOrder } from './types';

export interface UseFiltersOptions {
  enableStatus?: boolean;
  enableBatch?: boolean;
}

export const useFilters = (options: UseFiltersOptions = {}) => {
  const route = useAppRoute();

  const [query, setQuery] = useQueryStates({
    q: searchParser,
    cat: categoryParser,
    tag: tagsParser,
    sort: sortParser,
    status: statusParser,
    batch: batchParser,
    photoId: parseAsPhotoId,
    groupId: groupIdParser,
    modal: modalParser,
    view: viewParser,
    anchor: anchorParser,
    showGroupsCollapsed: showGroupsCollapsedParser,
    selected: selectedIdsParser,
  }, {
    shallow: true, 
    history: 'replace',
  });

  const setSearch = useCallback((val: string) => setQuery({ q: val || null }), [setQuery]);
  const setCategory = useCallback((val: string) => setQuery({ cat: val || null }), [setQuery]);
  const setTags = useCallback((vals: string[]) => setQuery({ tag: vals?.length ? vals : null }), [setQuery]);
  const setSort = useCallback((val: string) => setQuery({ sort: val as any }), [setQuery]);
  const setStatus = useCallback((val: string) => setQuery({ status: val === 'all' ? null : val }), [setQuery]);
  const setBatchFilter = useCallback((val: boolean) => setQuery({ batch: val || null }), [setQuery]);
  
  const setPhotoId = useCallback((val: string | null) => {
      const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
      if (route?.name === 'photo' || pathname.startsWith('/photo/')) {
         if (val) {
            if (val !== query.photoId) Router.push("photo", { photoId: val });
         } else {
            Router.push("home");
         }
         return;
      }
      setQuery({ photoId: val || null, modal: (val === null && query.modal === 'edit') ? null : query.modal });
  }, [route?.name, query.photoId, query.modal, setQuery]);

  const setGroupId = useCallback((val: string | null) => setQuery({ groupId: val || null }), [setQuery]);
  const setModal = useCallback((val: string | null) => setQuery({ modal: val || null }), [setQuery]);
  const setView = useCallback((val: 'grid' | 'list') => setQuery({ view: val === 'grid' ? null : 'list' }), [setQuery]);
  const setAnchor = useCallback((val: boolean) => setQuery({ anchor: val || null }), [setQuery]);
  const setShowGroupsCollapsed = useCallback((val: boolean) => setQuery({ showGroupsCollapsed: val === true ? null : false }), [setQuery]);

  const updateFilters = useCallback((updates: Partial<typeof query>) => {
    setQuery(updates);
  }, [setQuery]);

  const reset = useCallback(() => {
    setQuery({
      q: null, cat: null, tag: null, sort: null, status: null, batch: null,
      photoId: null, groupId: null, modal: null, view: null, anchor: null,
      showGroupsCollapsed: null, selected: null,
    });
  }, [setQuery]);

  // Derived state
  const search = query.q || '';
  const category = query.cat || 'all';
  const tags = query.tag || [];
  const sort = query.sort || 'newest';
  const status = options.enableStatus ? (query.status || 'all') : 'all';
  const batchFilter = options.enableBatch ? !!query.batch : false;

  // SWR Cache Key components (Aligned with PhotoListReqSchema)
  const queryKey = useMemo(() => {
    const catId = (query.cat && query.cat !== 'all') ? Number(query.cat) : undefined;
    return {
      searchQuery: query.q || undefined,
      categoryId: (catId !== undefined && !isNaN(catId)) ? catId : undefined,
      tagId: (query.tag && query.tag.length > 0) ? Number(query.tag[0]) : undefined,
      sortOrder: query.sort || undefined,
      status: options.enableStatus ? query.status : undefined,
      isHidden: options.enableStatus ? (query.status === 'hidden' ? true : (query.status === 'active' ? false : undefined)) : undefined,
      isAdminMode: options.enableStatus || options.enableBatch,
      groupId: query.groupId || undefined,
    };
  }, [query.q, query.cat, query.tag, query.sort, query.status, query.batch, query.groupId, options.enableStatus, options.enableBatch]);

  return useMemo(() => ({
    // ✅ Flattened API for compatibility
    search, setSearch,
    category, setCategory,
    tags, setTags,
    sort, setSort,
    status, setStatus,
    batchFilter, setBatchFilter,
    photoId: query.photoId, setPhotoId,
    groupId: query.groupId, setGroupId,
    modal: query.modal, setModal,
    anchor: query.anchor, setAnchor,
    showGroupsCollapsed: query.showGroupsCollapsed ?? true, setShowGroupsCollapsed,
    view: (query.view || 'grid') as 'grid' | 'list', setView,
    selectedIds: query.selected || [],
    
    // ✅ New structured API
    filters: {
      search,
      category,
      categoryId: (query.cat && query.cat !== 'all' && !isNaN(Number(query.cat))) ? Number(query.cat) : null,
      tagIds: query.tag || [],
      sort: (query.sort || 'newest') as SortOrder,
      status,
      batchFilter,
      photoId: query.photoId,
      groupId: query.groupId,
      modal: query.modal,
      anchor: query.anchor,
      showGroupsCollapsed: query.showGroupsCollapsed ?? true,
      selectedIds: query.selected || [],
    },
    queryKey,
    updateFilters,
    reset,
    setQuery,
    isAdminMode: options.enableStatus || options.enableBatch,
  }), [
    search, setSearch, category, setCategory, tags, setTags, sort, setSort, 
    status, setStatus, batchFilter, setBatchFilter, 
    query.photoId, setPhotoId, query.groupId, setGroupId, query.modal, setModal, 
    query.anchor, setAnchor, query.showGroupsCollapsed, setShowGroupsCollapsed, 
    query.view, setView, query.selected, query.cat, query.sort, query.tag,
    queryKey, updateFilters, reset, setQuery,
    options.enableStatus, options.enableBatch
  ]);
};

/**
 * useFilterState
 * Simplified filter state for UI components
 */
export function useFilterState() {
  const f = useFilters({ enableStatus: false });

  const filters: FilterState = useMemo(() => ({
    search: f.search || '',
    categoryId: f.category !== 'all' ? Number(f.category) : null,
    tagIds: f.tags || [],
    sort: (f.sort as SortOrder) || 'newest',
  }), [f.search, f.category, f.tags, f.sort]);

  const updateFilters = (updates: Partial<FilterState>) => {
    const routeUpdates: Record<string, unknown> = {};
    if (updates.search !== undefined) {
      routeUpdates.q = updates.search || null;
    }
    if (updates.categoryId !== undefined) {
      routeUpdates.cat = updates.categoryId ? String(updates.categoryId) : null;
      if (updates.categoryId) {
        routeUpdates.tag = null;
      }
    }
    if (updates.tagIds !== undefined) {
      routeUpdates.tag = updates.tagIds.length === 0 ? null : updates.tagIds;
      if (updates.tagIds && updates.tagIds.length > 0) {
        routeUpdates.cat = null;
      }
    }
    if (updates.sort !== undefined) {
      routeUpdates.sort = updates.sort || null;
    }
    
    f.updateFilters(routeUpdates);
  };

  return { filters, updateFilters };
}
