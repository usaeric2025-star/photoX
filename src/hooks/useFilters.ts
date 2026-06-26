import { useCallback, useEffect, useMemo } from 'react';
import { useAppRoute } from '@/lib/router';
import { Router, ALL_ROUTES } from '@/router';
import { useUI, isLightboxOpen, lightboxCurrentIndex, uiStore } from '@/lib/store';

export interface UseFiltersOptions {
  enableStatus?: boolean;
  enableBatch?: boolean;
  sortOptions?: { label: string; value: string }[];
}

export const useFilters = (options: UseFiltersOptions = {}) => {
  const route = useAppRoute();
  const params = route ? (route.params as Record<string, string | string[] | undefined>) : {};

  const updateSearch = useCallback((updates: Record<string, unknown>) => {
    if (!route) return;
    const currentRouteName = route.name;

    // Merge updates into current params
    const mergedParams: Record<string, string | string[] | undefined> = { ...(route.params as Record<string, string | string[] | undefined>) };
    for (const key in updates) {
      const val = updates[key];
      if (val === undefined) {
        delete mergedParams[key];
      } else if (Array.isArray(val)) {
        mergedParams[key] = val.map(String);
      } else {
        mergedParams[key] = String(val);
      }
    }

    const push = Router.push as unknown as (name: string, params: Record<string, unknown>) => void;
    push(currentRouteName, mergedParams as Record<string, unknown>);
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
    updateSearch({ tag: (vals && vals.length === 0) ? undefined : vals });
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
      
      // Update Signals directly for instantaneous feedback.
      // useRouteSync will handle the URL update debounced in the background.
      if (val === null) {
        if (uiStore.getState().lightboxIsOpen) {
          isLightboxOpen.set(false);
        }
      } else {
        const state = uiStore.getState();
        const slides = state.lightboxSlides;
        const index = slides.findIndex(s => s.id === val);
        if (index !== -1) {
          // Explicitly guard to prevent redundant signal triggers
          if (index !== state.lightboxCurrentIndex) {
            lightboxCurrentIndex.set(index);
          }
          if (!state.lightboxIsOpen) {
            isLightboxOpen.set(true);
          }
        } else {
          // If slide not found in current lightbox state, update URL manually
          // as it might be a direct link or a jump.
          updateSearch({ photoId: val });
        }
      }
  }, [route?.name, params.photoId, updateSearch]);

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

  return useMemo(() => ({
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
  }), [
    searchVal, setSearch,
    category, setCategory,
    tags, setTags,
    sort, setSort,
    status, setStatus,
    batchFilter, setBatchFilter,
    photoId, setPhotoId,
    anchor, setAnchor,
    groupId, setGroupId,
    modal, setModal,
    showGroupsCollapsed, setShowGroupsCollapsed,
    view, setView,
    reset,
    updateFilters,
    options.enableStatus, options.enableBatch
  ]);
};
