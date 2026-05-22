
import { create } from 'zustand';
import { Photo, Category, Tag, Manufacturer, AppSettings, User } from './types';
import { translations } from './lib/translations';

interface StoreState {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterCatId: string | null;
  setFilterCatId: (id: string | null) => void;
  filterSubId: string | null;
  setFilterSubId: (id: string | null) => void;
  filterTagIds: string[];
  setFilterTagIds: (ids: string[] | (prev: string[]) => string[]) => void;
  sortOrder: 'newest' | 'oldest';
  setSortOrder: (order: 'newest' | 'oldest') => void;
  showGroupsCollapsed: boolean;
  setShowGroupsCollapsed: (show: boolean) => void;
  appLang: 'zh' | 'en';
  setAppLang: (lang: 'zh' | 'en') => void;
  columns: 2 | 3 | 5;
  setColumns: (cols: 2 | 3 | 5) => void;
  lightboxIndex: number | null;
  setLightboxIndex: (index: number | null) => void;
  activeGroupId: string | null;
  setActiveGroupId: (id: string | null) => void;
  activePhotoId: string | null;
  setActivePhotoId: (id: string | null) => void;
  editPhotoId: string | null;
  setEditPhotoId: (id: string | null) => void;
  editingPhotoId: string | null;
  setEditingPhotoId: (id: string | null) => void;
  batchEditIds: string[] | null;
  setBatchEditIds: (ids: string[] | null) => void;
  groupSettingsOpen: boolean;
  setGroupSettingsOpen: (open: boolean) => void;
  batchEditingIds: string[] | null;
  setBatchEditingIds: (ids: string[] | null) => void;
  batchAiAnalyzeTrigger: boolean;
  setBatchAiAnalyzeTrigger: (trigger: boolean) => void;
  isMultiSelect: boolean;
  setIsMultiSelect: (is: boolean) => void;
  selectedIds: string[];
  setSelectedIds: (ids: string[] | (prev: string[]) => string[]) => void;
  hasLoadedOnce: boolean;
  setHasLoadedOnce: (hasLoaded: boolean) => void;
  hasInitialLoaded: boolean;
  setHasInitialLoaded: (value: boolean) => void;
  alertDialog: {
    title: string;
    description: string;
    onConfirm: () => void;
  } | null;
  setAlertDialog: (dialog: { title: string; description: string; onConfirm: () => void } | null) => void;
  promptDialog: {
    title: string;
    defaultValue: string;
    onConfirm: (val: string) => void;
  } | null;
  setPromptDialog: (dialog: { title: string; defaultValue: string; onConfirm: (val: string) => void } | null) => void;
}

export const useGalleryStore = create<StoreState>()((set) => ({
  searchQuery: '',
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  filterCatId: null,
  setFilterCatId: (filterCatId) => set({ filterCatId }),
  filterSubId: null,
  setFilterSubId: (filterSubId) => set({ filterSubId }),
  filterTagIds: [],
  setFilterTagIds: (updater) => set((state) => ({ 
    filterTagIds: typeof updater === 'function' ? updater(state.filterTagIds) : updater 
  })),
  sortOrder: 'newest',
  setSortOrder: (sortOrder) => set({ sortOrder }),
  showGroupsCollapsed: false,
  setShowGroupsCollapsed: (showGroupsCollapsed) => set({ showGroupsCollapsed }),
  appLang: 'zh',
  setAppLang: (appLang) => set({ appLang }),
  columns: 3,
  setColumns: (columns) => set({ columns }),
  lightboxIndex: null,
  setLightboxIndex: (lightboxIndex) => set({ lightboxIndex }),
  activeGroupId: null,
  setActiveGroupId: (activeGroupId) => set({ activeGroupId }),
  activePhotoId: null,
  setActivePhotoId: (activePhotoId) => set({ activePhotoId }),
  editPhotoId: null,
  setEditPhotoId: (editPhotoId) => set({ editPhotoId }),
  editingPhotoId: null,
  setEditingPhotoId: (editingPhotoId) => set({ editingPhotoId }),
  batchEditIds: null,
  setBatchEditIds: (batchEditIds) => set({ batchEditIds }),
  groupSettingsOpen: false,
  setGroupSettingsOpen: (groupSettingsOpen) => set({ groupSettingsOpen }),
  batchEditingIds: null,
  setBatchEditingIds: (batchEditingIds) => set({ batchEditingIds }),
  batchAiAnalyzeTrigger: false,
  setBatchAiAnalyzeTrigger: (batchAiAnalyzeTrigger) => set({ batchAiAnalyzeTrigger }),
  isMultiSelect: false,
  setIsMultiSelect: (isMultiSelect) => set({ isMultiSelect }),
  selectedIds: [],
  setSelectedIds: (updater) => set((state) => ({ 
    selectedIds: typeof updater === 'function' ? updater(state.selectedIds) : updater 
  })),
  hasLoadedOnce: false,
  setHasLoadedOnce: (hasLoadedOnce) => set({ hasLoadedOnce }),
  hasInitialLoaded: false,
  setHasInitialLoaded: (hasInitialLoaded) => set({ hasInitialLoaded }),
  alertDialog: null,
  setAlertDialog: (alertDialog) => set({ alertDialog }),
  promptDialog: null,
  setPromptDialog: (promptDialog) => set({ promptDialog }),
}));

export const useStore = useGalleryStore;
