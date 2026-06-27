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
} from '@/lib/nuqs/parsers';
import { Router } from '@/router';
import { useUI, isLightboxOpen, lightboxCurrentIndex, uiStore } from '@/lib/store';
import { useAppRoute } from '@/lib/router';

export interface UseFiltersOptions {
  enableStatus?: boolean;
  enableBatch?: boolean;
  sortOptions?: { label: string; value: string }[];
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
    shallow: true, // Use shallow routing to avoid full page reloads
    history: 'replace', // Use replace to avoid history bloat
  });

  const searchVal = query.q;
  const setSearch = useCallback((val: string) => {
    setQuery({ q: val || null });
  }, [setQuery]);

  const category = query.cat;
  const setCategory = useCallback((val: string) => {
    setQuery({ cat: val || null });
  }, [setQuery]);

  const tags = query.tag || [];
  const setTags = useCallback((vals: string[]) => {
    setQuery({ tag: (vals && vals.length === 0) ? null : vals });
  }, [setQuery]);

  const sort = query.sort || options.sortOptions?.[0]?.value || 'newest';
  const setSort = useCallback((val: string) => {
    setQuery({ sort: val || null });
  }, [setQuery]);

  const status = query.status;
  const setStatus = useCallback((val: string) => {
    setQuery({ status: val === 'all' ? null : val });
  }, [setQuery]);

  const batchFilter = query.batch;
  const setBatchFilter = useCallback((val: boolean) => {
    setQuery({ batch: val || null });
  }, [setQuery]);

  const photoId = query.photoId;
  const setPhotoId = useCallback((val: string | null) => {
      if (route?.name === 'photo') {
         if (val) {
            if (val !== query.photoId) Router.push("photo", { photoId: val });
         } else {
            Router.push("home");
         }
         return;
      }
      
      setQuery({ photoId: val || null, modal: (val === null && query.modal === 'edit') ? null : query.modal });
      
      // We still update index for instant lightbox response
      if (val !== null) {
        const state = uiStore.getState();
        const slides = state.lightboxSlides;
        const index = slides.findIndex(s => s.id === val);
        if (index !== -1 && index !== state.lightboxCurrentIndex) {
          lightboxCurrentIndex.set(index);
        }
      }
  }, [route?.name, query.photoId, query.modal, setQuery]);

  const groupId = query.groupId;
  const setGroupId = useCallback((val: string | null) => {
    setQuery({ groupId: val || null });
  }, [setQuery]);

  const modal = query.modal;
  const setModal = useCallback((val: string | null) => {
    setQuery({ modal: val || null });
  }, [setQuery]);

  const view = query.view as 'grid' | 'list';
  const setView = useCallback((val: 'grid' | 'list') => {
    setQuery({ view: val === 'grid' ? null : 'list' });
  }, [setQuery]);

  const anchor = query.anchor;
  const setAnchor = useCallback((val: boolean) => {
    setQuery({ anchor: val || null });
  }, [setQuery]);

  const showGroupsCollapsed = query.showGroupsCollapsed;
  const setShowGroupsCollapsed = useCallback((val: boolean) => {
    setQuery({ showGroupsCollapsed: val === true ? null : false });
  }, [setQuery]);

  const reset = useCallback(() => {
    setQuery({
      q: null,
      cat: null,
      tag: null,
      sort: null,
      status: null,
      batch: null,
      photoId: null,
      groupId: null,
      modal: null,
      view: null,
      anchor: null,
      showGroupsCollapsed: null,
      selected: null,
    });
  }, [setQuery]);

  const updateFilters = useCallback((updates: Partial<typeof query>) => {
    setQuery(updates);
  }, [setQuery]);

  return useMemo(() => ({
    search: searchVal, setSearch,
    category, setCategory,
    tags, setTags,
    sort, setSort,
    status: options.enableStatus ? status : 'all', setStatus,
    batchFilter: options.enableBatch ? batchFilter : false, setBatchFilter,
    photoId, setPhotoId,
    groupId, setGroupId,
    modal, setModal,
    anchor, setAnchor,
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
