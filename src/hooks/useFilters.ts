import { useCallback } from 'react';
import { Router, useAppRoute } from '@/router';

export interface UseFiltersOptions {
  enableStatus?: boolean;
  enableBatch?: boolean;
  sortOptions?: { label: string; value: string }[];
}

export const useFilters = (options: UseFiltersOptions = {}) => {
  const route = useAppRoute();
  const params = route ? (route.params as Record<string, unknown>) : {};

  const updateSearch = useCallback((updates: Record<string, unknown>) => {
    console.log("updateSearch called", { updates, route });
    if (!route) {
      console.warn("updateSearch ignored: route is null", { updates });
      return;
    }
    const currentRouteName = route.name;

    const cleanParams: Record<string, unknown> = {};
    for (const key in route.params) {
      if (key !== '~internal' && key !== 'href') {
        cleanParams[key] = (route.params as Record<string, unknown>)[key];
      }
    }

    // Cast chicane parameters to strings or string[] if defined
    const merged = { ...cleanParams };
    for (const key in updates) {
      const val = updates[key];
      if (val === undefined) {
          delete merged[key];
      } else if (Array.isArray(val)) {
          merged[key] = val.map(String);
      } else {
          merged[key] = String(val);
      }
    }

    console.log("Pushing to Router", { currentRouteName, merged });
    // We can cast merged to Record<string, unknown> because params are mostly optional string|string[]
    Router.push(currentRouteName as never, merged);
  }, [route]);

  // Expose batch update capability
  const updateFilters = useCallback((updates: Record<string, unknown>) => {
    updateSearch(updates);
  }, [updateSearch]);

  const searchVal = (params.q as string) || '';
  const setSearch = useCallback((val: string) => {
    updateSearch({ q: val || undefined });
  }, [updateSearch]);

  const category = (params.cat as string) || '';
  const setCategory = useCallback((val: string) => {
    updateSearch({ cat: val || undefined });
  }, [updateSearch]);

  const tags = Array.isArray(params.tag) ? (params.tag as string[]) : (params.tag ? [params.tag as string] : []);
  const setTags = useCallback((vals: string[]) => {
    updateSearch({ tag: vals.length === 0 ? undefined : vals });
  }, [updateSearch]);

  const sort = (params.sort as string) || options.sortOptions?.[0]?.value || 'newest';
  const setSort = useCallback((val: string) => {
    updateSearch({ sort: val || undefined });
  }, [updateSearch]);

  const status = (params.status as string) || 'all';
  const setStatus = useCallback((val: string) => {
    updateSearch({ status: val === 'all' ? undefined : val });
  }, [updateSearch]);

  const batchFilter = (params.batch as string) || '';
  const setBatchFilter = useCallback((val: string) => {
    updateSearch({ batch: val || undefined });
  }, [updateSearch]);

  const photoId = (params.photoId as string) || (route?.name === 'photo' ? params.photoId as string : null);
  const setPhotoId = useCallback((val: string | null) => {
      // 如果是 photo 詳情頁，關閉後回到首頁
      if (route?.name === 'photo') {
         if (val) {
           if (val !== params.photoId) Router.push("photo", { photoId: val });
         } else {
           Router.push("home");
         }
         return;
      }
      
      // Prevent infinite loops if value is the same
      if (val === photoId) return;
      if (!val && !photoId) return;

      // 否則使用 query param 模式以保留過濾條件
      updateSearch({ photoId: val || undefined });
  }, [route?.name, params.photoId, photoId, updateSearch]);

  const anchor = params.anchor === 'true';
  const setAnchor = useCallback((val: boolean) => {
    updateSearch({ anchor: val ? 'true' : undefined });
  }, [updateSearch]);

  const groupId = (params.groupId as string) || null;
  const setGroupId = useCallback((val: string | null) => {
    updateSearch({ groupId: val || undefined });
  }, [updateSearch]);

  const modal = (params.modal as string) || null;
  const setModal = useCallback((val: string | null) => {
    updateSearch({ modal: val || undefined });
  }, [updateSearch]);

  const showGroupsCollapsed = params.showGroupsCollapsed !== 'false';
  const setShowGroupsCollapsed = useCallback((val: boolean) => {
    updateSearch({ showGroupsCollapsed: val ? undefined : 'false' });
  }, [updateSearch]);

  const view = (params.view as string) || 'grid';
  const setView = useCallback((val: 'grid' | 'list') => {
    updateSearch({ view: val === 'grid' ? undefined : 'list' });
  }, [updateSearch]);

  const reset = useCallback(() => {
    if (route?.name === 'admin') {
        Router.push('admin');
    } else {
        Router.push('home');
    }
  }, [route?.name]);

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
    updateFilters,
    isAdminMode: options.enableStatus || options.enableBatch,
  };
};
