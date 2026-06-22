import { useCallback } from 'react';
import { useRoute, routes } from '@/router';

export interface UseFiltersOptions {
  enableStatus?: boolean;
  enableBatch?: boolean;
  sortOptions?: { label: string; value: string }[];
}

export const useFilters = (options: UseFiltersOptions = {}) => {
  const route = useRoute();
  const params = route.params as any;

  const updateSearch = useCallback((updates: Record<string, any>) => {
    const currentRouteName = route.name;

    const cleanParams: Record<string, any> = {};
    for (const key in route.params) {
      if (key !== '~internal' && key !== 'href') {
        cleanParams[key] = (route.params as any)[key];
      }
    }

    // Only update if the route exists in routes and accepts these params
    if (currentRouteName && routes[currentRouteName]) {
      const nextRoute = (routes[currentRouteName] as any)({
        ...cleanParams,
        ...updates
      });
      if (nextRoute && typeof nextRoute.push === 'function') {
        nextRoute.push();
      }
    }
  }, [route]);

  // Expose batch update capability
  const updateFilters = useCallback((updates: Record<string, any>) => {
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

  const photoId = (params.photoId as string) || (route.name === 'photo' ? route.params.photoId : null);
  const setPhotoId = useCallback((val: string | null) => {
      // 如果是 photo 詳情頁，關閉後回到首頁
      if (route.name === 'photo') {
         if (val) {
           routes.photo({ photoId: val }).push();
         } else {
           routes.home().push();
         }
         return;
      }
      // 否則使用 query param 模式以保留過濾條件
      updateSearch({ photoId: val || undefined });
  }, [route.name, updateSearch]);

  const anchor = params.anchor === true || params.anchor === 'true';
  const setAnchor = useCallback((val: boolean) => {
    updateSearch({ anchor: val ? true : undefined });
  }, [updateSearch]);

  const groupId = (params.groupId as string) || null;
  const setGroupId = useCallback((val: string | null) => {
    updateSearch({ groupId: val || undefined });
  }, [updateSearch]);

  const modal = (params.modal as string) || null;
  const setModal = useCallback((val: string | null) => {
    updateSearch({ modal: val || undefined });
  }, [updateSearch]);

  const showGroupsCollapsed = params.showGroupsCollapsed !== false;
  const setShowGroupsCollapsed = useCallback((val: boolean) => {
    updateSearch({ showGroupsCollapsed: val ? undefined : false });
  }, [updateSearch]);

  const view = (params.view as string) || 'grid';
  const setView = useCallback((val: 'grid' | 'list') => {
    updateSearch({ view: val === 'grid' ? undefined : 'list' });
  }, [updateSearch]);

  const reset = useCallback(() => {
    if (route.name === 'admin') {
        routes.admin({}).push();
    } else {
        routes.home({}).push();
    }
  }, [route.name]);

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
