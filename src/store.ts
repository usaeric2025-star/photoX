import { create } from 'zustand';
import { AppSettings, Photo, Tag, Category, Manufacturer } from './types';

interface GalleryState {
  // UI State
  searchQuery: string;
  debouncedSearchQuery: string;
  filterCatId: string | null;
  filterSubId: string | null;
  filterTagIds: string[];
  sortOrder: 'asc' | 'desc';
  selectedIds: string[];
  isMultiSelect: boolean;
  showGroupsCollapsed: boolean;
  visibleCount: number;
  isInfiniteMode: boolean;
  isStaffMode: boolean;
  user: any;
  isAdminMode: boolean;
  settings: AppSettings | null;
  errors: any[];
  isAnalyzing: boolean;
  batchProgress: number;
  activeScreen: string;
  alertDialog: any | null;
  promptDialog: any | null;
  appLang: string;
  viewMode: 'public' | 'private';
  isSyncing: boolean;
  loadingType: 'none' | 'global' | 'local';
  withLoading: <T>(type: string, fn: () => Promise<T>) => Promise<T>;
  gridPhotos: Photo[];
  displayPhotos: Photo[];
  tagIdToNameMap: Record<string, string>;
  totalGridCount: number;

  // AI/Settings State
  geminiApiKey: string;
  customModel: string;
  accessPasscode: string;
  aiDebugInfo: any;
  setAiDebugInfo: (info: any) => void;
  setLoadingType: (type: 'none' | 'global' | 'local' | 'analyzing' | 'sync-pull' | 'sync-push') => void;
  editPhotoId: string | null;
  setEditPhotoId: (id: string | null) => void;
  batchEditIds: string[] | null;
  setBatchEditIds: (ids: string[] | null) => void;
  cloudCount: number;
  setCloudCount: (count: number) => void;
  abortAnalysis: () => void;
  onRefresh: () => void;

  // Data
  photos: Photo[];
  categories: Category[];
  tags: Tag[];
  manufacturers: Manufacturer[];

  // Actions
  setSearchQuery: (query: string) => void;
  setDebouncedSearchQuery: (query: string) => void;
  setFilterCatId: (id: string | null) => void;
  setFilterSubId: (id: string | null) => void;
  setFilterTagIds: (ids: string[]) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  setIsMultiSelect: (isMulti: boolean) => void;
  setSelectedIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  togglePhotoSelection: (id: string) => void;
  clearSelection: () => void;
  setShowGroupsCollapsed: (collapsed: boolean) => void;
  setVisibleCount: (count: number | ((prev: number) => number)) => void;
  setIsInfiniteMode: (isInfinite: boolean) => void;
  setIsStaffMode: (isStaff: boolean) => void;
  setUser: (user: any) => void;
  setIsAdminMode: (isAdmin: boolean) => void;
  setSettings: (settings: AppSettings | null) => void;
  setErrors: (errors: any[]) => void;
  clearErrors: () => void;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
  setBatchProgress: (progress: number) => void;
  setActiveScreen: (screen: string) => void;
  setAlertDialog: (dialog: any | null) => void;
  setPromptDialog: (dialog: any | null) => void;
  setAppLang: (lang: string) => void;
  setViewMode: (mode: 'public' | 'private') => void;
  setIsSyncing: (isSyncing: boolean) => void;
  setGeminiApiKey: (key: string) => void;
  setCustomModel: (model: string) => void;
  setAccessPasscode: (passcode: string) => void;
  
  // Data Actions
  addTag: (name: string) => Promise<any>;
  updateTag: (id: string, name: string) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
  addCategory: (name: string) => Promise<any>;
  updateCategory: (id: string, name: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addManufacturer: (name: string) => Promise<any>;
  updateManufacturer: (id: string, name: string) => Promise<void>;
  deleteManufacturer: (id: string) => Promise<void>;
  removeTagFromPhoto: (photoId: string, tagId: string) => Promise<void>;
  quickAddManufacturer: (name: string) => Promise<void>;
  quickAddTag: (name: string) => Promise<void>;
  handleSingleAiAnalyze: (photoId: string) => Promise<void>;
  handleTranslate: (photoId: string, targetLang: string) => Promise<void>;
  handleSingleAiAnalyzeCallback: (photoId: string, data: any) => void;
  logout: () => void;
  loginWithGoogle: () => Promise<void>;
}

export const useGalleryStore = create<GalleryState>((set) => ({
  searchQuery: '',
  debouncedSearchQuery: '',
  filterCatId: null,
  filterSubId: null,
  filterTagIds: [],
  sortOrder: 'desc',
  selectedIds: [],
  isMultiSelect: false,
  showGroupsCollapsed: true,
  visibleCount: 20,
  isInfiniteMode: false,
  isStaffMode: false,
  user: null,
  isAdminMode: false,
  settings: null,
  errors: [],
  isAnalyzing: false,
  batchProgress: 0,
  activeScreen: 'home',
  alertDialog: null,
  promptDialog: null,
  appLang: 'zh',
  viewMode: 'private',
  isSyncing: false,
  
  // Data State
  photos: [],
  categories: [],
  tags: [],
  manufacturers: [],
  loadingType: 'none',
  withLoading: async (type, fn) => {
    // Basic implementation
    set({ loadingType: type as any });
    try {
        return await fn();
    } finally {
        set({ loadingType: 'none' as any });
    }
  },
  gridPhotos: [],
  displayPhotos: [],
  tagIdToNameMap: {},
  totalGridCount: 0,
  
  // AI/Settings
  geminiApiKey: '',
  customModel: '',
  accessPasscode: '',
  aiDebugInfo: null,
  setAiDebugInfo: (aiDebugInfo) => set({ aiDebugInfo }),
  setLoadingType: (loadingType) => set({ loadingType: loadingType as any }),
  editPhotoId: null,
  setEditPhotoId: (editPhotoId) => set({ editPhotoId }),
  batchEditIds: null,
  setBatchEditIds: (batchEditIds) => set({ batchEditIds }),
  cloudCount: 0,
  setCloudCount: (cloudCount) => set({ cloudCount }),
  abortAnalysis: () => {},
  onRefresh: () => {},

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setDebouncedSearchQuery: (debouncedSearchQuery) => set({ debouncedSearchQuery }),
  setFilterCatId: (filterCatId) => set({ filterCatId }),
  setFilterSubId: (filterSubId) => set({ filterSubId }),
  setFilterTagIds: (filterTagIds) => set({ filterTagIds }),
  setSortOrder: (sortOrder) => set({ sortOrder }),
  setIsMultiSelect: (isMultiSelect) => set({ isMultiSelect }),
  setSelectedIds: (ids) => set((state) => ({
    selectedIds: typeof ids === 'function' ? ids(state.selectedIds) : ids
  })),
  togglePhotoSelection: (id) => set((state) => ({
    selectedIds: state.selectedIds.includes(id) 
      ? state.selectedIds.filter(i => i !== id) 
      : [...state.selectedIds, id]
  })),
  clearSelection: () => set({ selectedIds: [], isMultiSelect: false }),
  setShowGroupsCollapsed: (showGroupsCollapsed) => set({ showGroupsCollapsed }),
  setVisibleCount: (visibleCount) => set((state) => ({
    visibleCount: typeof visibleCount === 'function' ? visibleCount(state.visibleCount) : visibleCount
  })),
  setIsInfiniteMode: (isInfiniteMode) => set({ isInfiniteMode }),
  setIsStaffMode: (isStaffMode) => set({ isStaffMode }),
  setUser: (user) => set({ user }),
  setIsAdminMode: (isAdminMode) => set({ isAdminMode }),
  setSettings: (settings) => set({ settings }),
  setErrors: (errors) => set({ errors }),
  clearErrors: () => set({ errors: [] }),
  setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  setBatchProgress: (batchProgress) => set({ batchProgress }),
  setActiveScreen: (screen) => set({ activeScreen: screen }),
  setAlertDialog: (alertDialog) => set({ alertDialog }),
  setPromptDialog: (promptDialog) => set({ promptDialog }),
  setAppLang: (appLang) => set({ appLang }),
  setViewMode: (viewMode) => set({ viewMode }),
  setIsSyncing: (isSyncing) => set({ isSyncing }),
  setGeminiApiKey: (geminiApiKey) => set({ geminiApiKey }),
  setCustomModel: (customModel) => set({ customModel }),
  setAccessPasscode: (accessPasscode) => set({ accessPasscode }),
  
  // Data actions stubs
  addTag: async () => ({}),
  updateTag: async () => {},
  deleteTag: async () => {},
  addCategory: async () => ({}),
  updateCategory: async () => {},
  deleteCategory: async () => {},
  addManufacturer: async () => ({}),
  updateManufacturer: async () => {},
  deleteManufacturer: async () => {},
  removeTagFromPhoto: async () => {},
  quickAddManufacturer: async () => {},
  quickAddTag: async () => {},
  handleSingleAiAnalyze: async () => {},
  handleTranslate: async () => {},
  handleSingleAiAnalyzeCallback: () => {},
  logout: () => {},
  loginWithGoogle: async () => {},
}));