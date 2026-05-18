import { create } from 'zustand';
import { AppSettings, Photo, Tag, Category, Manufacturer, User, AppError, DialogData } from './types';

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
  isInfiniteMode: boolean;
  isStaffMode: boolean;
  user: User | null;
  isAdminMode: boolean;
  settings: AppSettings | null;
  errors: AppError[];
  isAnalyzing: boolean;
  batchProgress: number;
  activeScreen: string;
  alertDialog: DialogData | null;
  promptDialog: DialogData | null;
  appLang: string;
  viewMode: 'public' | 'private';
  isSyncing: boolean;
  loadingType: 'none' | 'global' | 'local';
  withLoading: <T>(type: string, fn: () => Promise<T>) => Promise<T>;
  tagIdToNameMap: Record<string, string>;

  // AI/Settings State
  geminiApiKey: string;
  customModel: string;
  accessPasscode: string;
  aiDebugInfo: { step: string; message: string; error?: string } | null;
  setAiDebugInfo: (info: { step: string; message: string; error?: string } | null) => void;
  setLoadingType: (type: 'none' | 'global' | 'local' | 'analyzing' | 'sync-pull' | 'sync-push') => void;
  editPhotoId: string | null;
  setEditPhotoId: (id: string | null) => void;
  batchEditIds: string[] | null;
  setBatchEditIds: (ids: string[] | null) => void;
  cloudCount: number;
  setCloudCount: (count: number) => void;
  abortAnalysis: () => void;
  onRefresh: () => void;

  // Actions
  setSearchQuery: (query: string) => void;
  setDebouncedSearchQuery: (query: string) => void;
  setFilterCatId: (id: string | null) => void;
  setFilterSubId: (id: string | null) => void;
  setFilterTagIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  setIsMultiSelect: (isMulti: boolean) => void;
  setSelectedIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  togglePhotoSelection: (id: string) => void;
  clearSelection: () => void;
  setShowGroupsCollapsed: (showGroupsCollapsed: boolean) => void;
  setIsInfiniteMode: (isInfinite: boolean) => void;
  setIsStaffMode: (isStaff: boolean) => void;
  setUser: (user: User | null) => void;
  setIsAdminMode: (isAdmin: boolean) => void;
  setSettings: (settings: AppSettings | null) => void;
  setErrors: (errors: AppError[]) => void;
  clearErrors: () => void;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
  setBatchProgress: (progress: number) => void;
  setActiveScreen: (screen: string) => void;
  setAlertDialog: (dialog: DialogData | null) => void;
  setPromptDialog: (dialog: DialogData | null) => void;
  setAppLang: (lang: string) => void;
  setViewMode: (mode: 'public' | 'private') => void;
  setIsSyncing: (isSyncing: boolean) => void;
  setGeminiApiKey: (key: string) => void;
  setCustomModel: (model: string) => void;
  setAccessPasscode: (passcode: string) => void;
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
  appLang: localStorage.getItem('appLang') || 'en',
  viewMode: 'private',
  isSyncing: false,
  
  loadingType: 'none',
  withLoading: async (type, fn) => {
    set({ loadingType: type as 'local' });
    try {
        return await fn();
    } finally {
        set({ loadingType: 'none' });
    }
  },
  tagIdToNameMap: {},
  
  // AI/Settings
  geminiApiKey: localStorage.getItem('gemini_api_key') || '',
  customModel: localStorage.getItem('ai_custom_model') || 'gemini-1.5-flash',
  accessPasscode: localStorage.getItem('access_passcode') || '',
  aiDebugInfo: null,
  setAiDebugInfo: (aiDebugInfo) => set({ aiDebugInfo }),
  setLoadingType: (loadingType) => set({ loadingType: loadingType as 'local' }),
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
  setFilterTagIds: (ids: string[] | ((prev: string[]) => string[])) => set((state) => ({
    filterTagIds: typeof ids === 'function' ? ids(state.filterTagIds) : ids
  })),
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
  setAppLang: (appLang) => {
    localStorage.setItem('appLang', appLang);
    set({ appLang });
  },
  setViewMode: (viewMode) => set({ viewMode }),
  setIsSyncing: (isSyncing) => set({ isSyncing }),
  setGeminiApiKey: (geminiApiKey) => {
    localStorage.setItem('gemini_api_key', geminiApiKey);
    set({ geminiApiKey });
  },
  setCustomModel: (customModel) => {
    localStorage.setItem('ai_custom_model', customModel);
    set({ customModel });
  },
  setAccessPasscode: (accessPasscode) => {
    localStorage.setItem('access_passcode', accessPasscode);
    set({ accessPasscode });
  },
  logout: () => set({ user: null, isAdminMode: false }),
  loginWithGoogle: async () => {}, // Keep only essential placeholder for auth if needed elsewhere
}));