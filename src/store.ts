
import { create } from 'zustand';
import { Photo, Category, Tag, Manufacturer, AppSettings, User, DialogData } from './types';
import { translations } from './lib/translations';

interface StoreState {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterCatId: string | null;
  setFilterCatId: (id: string | null) => void;
  filterSubId: string | null;
  setFilterSubId: (id: string | null) => void;
  filterTagIds: string[];
  setFilterTagIds: (ids: string[] | ((prev: string[]) => string[])) => void;
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
  // Batch Editing and Groups
  batchEditingIds: string[] | null;
  setBatchEditingIds: (ids: string[] | null) => void;
  groupSettingsOpen: boolean;
  setGroupSettingsOpen: (open: boolean) => void;
  batchAiAnalyzeTrigger: boolean;
  setBatchAiAnalyzeTrigger: (trigger: boolean) => void;

  isMultiSelect: boolean;
  setIsMultiSelect: (is: boolean) => void;
  selectedIds: string[];
  setSelectedIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  isStaffMode: boolean;
  setIsStaffMode: (is: boolean) => void;
  hasLoadedOnce: boolean;
  setHasLoadedOnce: (hasLoaded: boolean) => void;
  hasInitialLoaded: boolean;
  setHasInitialLoaded: (value: boolean) => void;
  alertDialog: DialogData | null;
  setAlertDialog: (dialog: DialogData | null) => void;
  promptDialog: DialogData | null;
  setPromptDialog: (dialog: DialogData | null) => void;
  // Multi-select and Drag-and-drop
  isMultiSelectMode: boolean;
  setIsMultiSelectMode: (is: boolean) => void;
  draggedPhotoId: string | null;
  setDraggedPhotoId: (id: string | null) => void;
  focusedGroupPhotoId: string | null;
  setFocusedGroupPhotoId: (id: string | null) => void;

  // Missing properties from lint errors
  settings: any;
  setSettings: (s: any) => void;
  geminiApiKey: string | null;
  setGeminiApiKey: (key: string | null) => void;
  customModel: string | null;
  setCustomModel: (model: string | null) => void;
  accessPasscode: string | null;
  setAccessPasscode: (code: string | null) => void;
  loadingType: string | null;
  setLoadingType: (type: string | null) => void;
  user: User | null;
  setUser: (user: User | null) => void;
  viewMode: 'admin' | 'public';
  setViewMode: (mode: 'admin' | 'public') => void;
  isSyncing: boolean;
  setIsSyncing: (syncing: boolean) => void;
  activeScreen: string;
  setActiveScreen: (screen: string) => void;
  isInfiniteMode: boolean;
  setIsInfiniteMode: (mode: boolean) => void;
  adminPreviewMode: boolean;
  setAdminPreviewMode: (mode: boolean) => void;
  setLanguage: (lang: 'zh' | 'en') => void;
  errors: any[];
  clearErrors: () => void;
  setDebouncedSearchQuery: (q: string) => void;
  debouncedSearchQuery: string;
  isAnalyzing: boolean;
  aiDebugInfo: any;
  withLoading: <T>(fn: () => Promise<T>) => Promise<T>;
  resetUI: () => void;
  resetFilters: () => void;
  resetFiltersAndRefresh: () => void;
  showWhatsAppChoice: boolean;
  setShowWhatsAppChoice: (show: boolean) => void;
  tagIdToNameMap: Record<string, string>;
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
  showGroupsCollapsed: true,
  setShowGroupsCollapsed: (showGroupsCollapsed) => set({ showGroupsCollapsed }),
  appLang: 'en',
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
  batchEditingIds: null,
  setBatchEditingIds: (batchEditingIds) => set({ batchEditingIds }),
  groupSettingsOpen: false,
  setGroupSettingsOpen: (groupSettingsOpen) => set({ groupSettingsOpen }),
  batchAiAnalyzeTrigger: false,
  setBatchAiAnalyzeTrigger: (batchAiAnalyzeTrigger) => set({ batchAiAnalyzeTrigger }),
  isMultiSelect: false,
  setIsMultiSelect: (isMultiSelect) => set({ isMultiSelect }),
  selectedIds: [],
  setSelectedIds: (updater) => set((state) => ({ 
    selectedIds: typeof updater === 'function' ? updater(state.selectedIds) : updater 
  })),
  isStaffMode: false,
  setIsStaffMode: (isStaffMode) => set({ isStaffMode }),
  hasLoadedOnce: false,
  setHasLoadedOnce: (hasLoadedOnce) => set({ hasLoadedOnce }),
  hasInitialLoaded: false,
  setHasInitialLoaded: (hasInitialLoaded) => set({ hasInitialLoaded }),
  alertDialog: null,
  setAlertDialog: (alertDialog) => set({ alertDialog }),
  promptDialog: null,
  setPromptDialog: (promptDialog) => set({ promptDialog }),
  // Multi-select and Drag-and-drop
  isMultiSelectMode: false,
  setIsMultiSelectMode: (isMultiSelectMode) => set({ isMultiSelectMode }),
  draggedPhotoId: null,
  setDraggedPhotoId: (draggedPhotoId) => set({ draggedPhotoId }),
  focusedGroupPhotoId: null,
  setFocusedGroupPhotoId: (focusedGroupPhotoId) => set({ focusedGroupPhotoId }),
  // Implement missing fields
  settings: {},
  setSettings: (settings) => set({ settings }),
  geminiApiKey: null,
  setGeminiApiKey: (geminiApiKey) => set({ geminiApiKey }),
  customModel: null,
  setCustomModel: (customModel) => set({ customModel }),
  accessPasscode: null,
  setAccessPasscode: (accessPasscode) => set({ accessPasscode }),
  loadingType: null,
  setLoadingType: (loadingType) => set({ loadingType }),
  user: null,
  setUser: (user) => set({ user }),
  viewMode: 'public',
  setViewMode: (viewMode) => set({ viewMode }),
  isSyncing: false,
  setIsSyncing: (isSyncing) => set({ isSyncing }),
  activeScreen: 'gallery',
  setActiveScreen: (activeScreen) => set({ activeScreen }),
  isInfiniteMode: false,
  setIsInfiniteMode: (isInfiniteMode) => set({ isInfiniteMode }),
  adminPreviewMode: false,
  setAdminPreviewMode: (adminPreviewMode) => set({ adminPreviewMode }),
  setLanguage: (appLang: 'zh' | 'en') => set({ appLang }),
  errors: [],
  clearErrors: () => set({ errors: [] }),
  setDebouncedSearchQuery: (debouncedSearchQuery) => set({ debouncedSearchQuery }),
  debouncedSearchQuery: '',
  isAnalyzing: false,
  aiDebugInfo: null,
  withLoading: async (fn) => await fn(),
  resetUI: () => set({}),
  resetFilters: () => set({}),
  resetFiltersAndRefresh: () => set({}),
  showWhatsAppChoice: false,
  setShowWhatsAppChoice: (showWhatsAppChoice) => set({ showWhatsAppChoice }),
  tagIdToNameMap: {},
}));

export const useStore = useGalleryStore;
