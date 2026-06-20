import { useCallback } from 'react';
import { useSearch, useNavigate } from '@tanstack/react-router';

export interface UseFiltersOptions {
  enableStatus?: boolean;
  enableBatch?: boolean;
  sortOptions?: { label: string; value: string }[];
}

export const useFilters = (options: UseFiltersOptions = {}) => {
  const search = useSearch({ strict: false }) as Record<string, any>;
  const navigate = useNavigate();

  const updateSearch = useCallback((updates: Record<string, any>) => {
    navigate({
      search: ((prev: any) => ({
        ...prev,
        ...updates
      })) as any
    } as any);
  }, [navigate]);

  const searchVal = search.q || '';
  const setSearch = useCallback((val: string) => {
    updateSearch({ q: val || undefined });
  }, [updateSearch]);

  const category = search.cat || search.category || '';
  const setCategory = useCallback((val: string) => {
    updateSearch({ cat: val || undefined, category: undefined });
  }, [updateSearch]);

  const tags = Array.isArray(search.tag) ? search.tag : (search.tag ? [search.tag] : []);
  const setTags = useCallback((vals: string[]) => {
    updateSearch({ tag: vals.length === 0 ? undefined : vals });
  }, [updateSearch]);

  const sort = search.sort || options.sortOptions?.[0]?.value || 'newest';
  const setSort = useCallback((val: string) => {
    updateSearch({ sort: val || undefined });
  }, [updateSearch]);

  const status = search.status || 'all';
  const setStatus = useCallback((val: string) => {
    updateSearch({ status: val === 'all' ? undefined : val });
  }, [updateSearch]);

  const batchFilter = search.batch || '';
  const setBatchFilter = useCallback((val: string) => {
    updateSearch({ batch: val || undefined });
  }, [updateSearch]);

  const photoId = search.photoId || null;
  const setPhotoId = useCallback((val: string | null) => {
    updateSearch({ photoId: val || undefined });
  }, [updateSearch]);

  const anchor = search.anchor === true || search.anchor === 'true';
  const setAnchor = useCallback((val: boolean) => {
    updateSearch({ anchor: val ? true : undefined });
  }, [updateSearch]);

  const groupId = search.groupId || null;
  const setGroupId = useCallback((val: string | null) => {
    updateSearch({ groupId: val || undefined });
  }, [updateSearch]);

  const modal = search.modal || null;
  const setModal = useCallback((val: string | null) => {
    updateSearch({ modal: val || undefined });
  }, [updateSearch]);

  const showGroupsCollapsed = search.showGroupsCollapsed !== 'false' && search.showGroupsCollapsed !== false;
  const setShowGroupsCollapsed = useCallback((val: boolean) => {
    updateSearch({ showGroupsCollapsed: val ? undefined : false });
  }, [updateSearch]);

  const view = search.view || 'grid';
  const setView = useCallback((val: 'grid' | 'list') => {
    updateSearch({ view: val === 'grid' ? undefined : 'list' });
  }, [updateSearch]);

  const reset = useCallback(() => {
    navigate({
      search: ((prev: any) => ({
        photoId: prev.photoId, 
        groupId: prev.groupId,
      })) as any
    } as any);
  }, [navigate]);

  return {
    search: searchVal, setSearch,
    category, setCategory,
    tags, setTags,
    sort, setSort,
    status: options.enableStatus ? status : 'all', setStatus,
    batchFilter: options.enableBatch ? batchFilter : '', setBatchFilter,
    photoId, setPhotoId,
    anchor, setAnchor,
    groupId, setGroupId,
    modal, setModal,
    showGroupsCollapsed, setShowGroupsCollapsed,
    view, setView,
    reset,
    isAdminMode: options.enableStatus || options.enableBatch,
  };
};
