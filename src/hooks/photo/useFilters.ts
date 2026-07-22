import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo, useTransition } from 'react';
import { useModalActions } from '../ui/useUI.js';

const QUERY_PARAMS = {
  SEARCH: 'q',
  CATEGORY: 'category',
  CATEGORIES: 'categories',
  TAGS: 'tags',
  SORT: 'sort',
  GROUP_ID: 'groupId',
  GROUPS: 'groups',
  BATCH: 'batch',
  SELECTED: 'selected',
  COLLAPSED: 'collapsed',
  ANCHOR: 'anchor',
} as const;

/**
 * useFilters
 * Manages photo gallery filtering state synced with URL
 */
export function useFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { modal, photoId, setPhotoId, openModal, closeModal, setModal } = useModalActions();

  const search = searchParams.get(QUERY_PARAMS.SEARCH) || '';
  const category = searchParams.get(QUERY_PARAMS.CATEGORY) || '';
  const categories = searchParams.get(QUERY_PARAMS.CATEGORIES)?.split(',').filter(Boolean) || [];
  const tags = searchParams.get(QUERY_PARAMS.TAGS)?.split(',').filter(Boolean) || [];
  const sort = searchParams.get(QUERY_PARAMS.SORT) || 'newest';
  const batch = searchParams.get(QUERY_PARAMS.BATCH) === 'true';
  const selected = searchParams.get(QUERY_PARAMS.SELECTED)?.split(',').filter(Boolean) || [];
  const showGroupsCollapsed = searchParams.get(QUERY_PARAMS.COLLAPSED) !== 'false';
  const anchor = searchParams.get(QUERY_PARAMS.ANCHOR) || '';
  const groupId = searchParams.get(QUERY_PARAMS.GROUP_ID) || '';
  const groups = searchParams.get(QUERY_PARAMS.GROUPS)?.split(',').filter(Boolean) || [];

  const updateFilters = useCallback((updates: {
    search?: string | null;
    category?: string | null;
    categories?: string[] | null;
    categoryId?: string | null;
    tags?: string[] | null;
    tagIds?: string[] | null;
    sort?: string | null;
    groupId?: string | null;
    groups?: string[] | null;
    batch?: boolean | null;
    selected?: string[] | null;
    collapsed?: boolean | null;
    anchor?: string | null;
  }) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      
      const cleanArray = (arr: string[] | null | undefined) => {
        if (!arr) return null;
        const filtered = arr.filter(v => typeof v === 'string' && v.trim() !== '');
        return filtered.length ? Array.from(new Set(filtered)) : null;
      };

      if (updates.search !== undefined) {
        if (updates.search?.trim()) next.set(QUERY_PARAMS.SEARCH, updates.search.trim());
        else next.delete(QUERY_PARAMS.SEARCH);
      }
      
      if (updates.category !== undefined) {
        if (updates.category) next.set(QUERY_PARAMS.CATEGORY, updates.category);
        else next.delete(QUERY_PARAMS.CATEGORY);
      }
      
      if (updates.categoryId !== undefined) {
        if (updates.categoryId) next.set(QUERY_PARAMS.CATEGORY, updates.categoryId);
        else next.delete(QUERY_PARAMS.CATEGORY);
      }
      
      if (updates.categories !== undefined) {
        const cleaned = cleanArray(updates.categories);
        if (cleaned) next.set(QUERY_PARAMS.CATEGORIES, cleaned.join(','));
        else next.delete(QUERY_PARAMS.CATEGORIES);
      }
      
      if (updates.tags !== undefined || updates.tagIds !== undefined) {
        const cleaned = cleanArray(updates.tags || updates.tagIds);
        if (cleaned) next.set(QUERY_PARAMS.TAGS, cleaned.join(','));
        else next.delete(QUERY_PARAMS.TAGS);
      }
      
      if (updates.sort !== undefined) {
        if (updates.sort && updates.sort !== 'newest') next.set(QUERY_PARAMS.SORT, updates.sort);
        else next.delete(QUERY_PARAMS.SORT);
      }
      
      if (updates.groupId !== undefined) {
        if (updates.groupId) next.set(QUERY_PARAMS.GROUP_ID, updates.groupId);
        else next.delete(QUERY_PARAMS.GROUP_ID);
      }
      
      if (updates.groups !== undefined) {
        const cleaned = cleanArray(updates.groups);
        if (cleaned) next.set(QUERY_PARAMS.GROUPS, cleaned.join(','));
        else next.delete(QUERY_PARAMS.GROUPS);
      }

      if (updates.batch !== undefined) {
        if (updates.batch) next.set(QUERY_PARAMS.BATCH, 'true');
        else next.delete(QUERY_PARAMS.BATCH);
      }

      if (updates.selected !== undefined) {
        const cleaned = cleanArray(updates.selected);
        if (cleaned) next.set(QUERY_PARAMS.SELECTED, cleaned.join(','));
        else next.delete(QUERY_PARAMS.SELECTED);
      }

      if (updates.collapsed !== undefined) {
        if (updates.collapsed === false) next.set(QUERY_PARAMS.COLLAPSED, 'false');
        else next.delete(QUERY_PARAMS.COLLAPSED);
      }

      if (updates.anchor !== undefined) {
        if (updates.anchor) next.set(QUERY_PARAMS.ANCHOR, updates.anchor);
        else next.delete(QUERY_PARAMS.ANCHOR);
      }

      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Specific setters for compatibility
  const setSearch = useCallback((val: string | null) => updateFilters({ search: val }), [updateFilters]);
  const setCategory = useCallback((val: string | null) => updateFilters({ category: val }), [updateFilters]);
  const setCategories = useCallback((val: string[] | null) => updateFilters({ categories: val }), [updateFilters]);
  const setTags = useCallback((val: string[] | null) => updateFilters({ tags: val }), [updateFilters]);
  const setSort = useCallback((val: string | null) => updateFilters({ sort: val }), [updateFilters]);
  const setBatch = useCallback((val: boolean | null) => updateFilters({ batch: val }), [updateFilters]);
  const setSelected = useCallback((val: string[] | null) => updateFilters({ selected: val }), [updateFilters]);
  const setShowGroupsCollapsed = useCallback((val: boolean | null) => updateFilters({ collapsed: val }), [updateFilters]);
  const setAnchor = useCallback((val: string | null) => updateFilters({ anchor: val }), [updateFilters]);
  const setGroupId = useCallback((val: string | null) => updateFilters({ groupId: val }), [updateFilters]);
  const setGroups = useCallback((val: string[] | null) => updateFilters({ groups: val }), [updateFilters]);

  const filters = useMemo(() => ({ 
    search, 
    category,
    categories,
    categoryId: category ? Number(category) : null, 
    tags, tagIds: tags || [], 
    sort: sort as any,
    groupId,
    groups
  }), [search, category, categories, tags, sort, groupId, groups]);

  return {
    search, setSearch,
    category, setCategory,
    categories, setCategories,
    tags, setTags,
    sort, setSort,
    modal, setModal,
    photoId, setPhotoId,
    batch, setBatch,
    selected, setSelected,
    showGroupsCollapsed, setShowGroupsCollapsed,
    anchor, setAnchor,
    groupId, setGroupId,
    groups, setGroups,
    updateFilters,
    openModal,
    closeModal,
    filters
  };
}

/**
 * useSearchTransition
 * Optimizes UI response for search input using React Transitions.
 */
export const useSearchTransition = (onUpdate: (value: string) => void) => {
  const [isPending, startTransition] = useTransition();
  const updateSearch = useCallback((searchTerm: string) => {
    startTransition(() => {
      onUpdate(searchTerm);
    });
  }, [onUpdate]);

  return { isPending, updateSearch };
};
