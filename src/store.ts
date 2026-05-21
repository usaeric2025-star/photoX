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
  settings: AppSettings | null;
  errors: AppError[];
  isAnalyzing: boolean;
  batchProgress: number;
  activeScreen: string;
  alertDialog: DialogData | null;
  promptDialog: DialogData | null;
  appLang: string;
  viewMode: 'public' | 'private';
  tagStats: Record<string, number>;
  setTagStats: (stats: Record<string, number>) => void;
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
  hasLoadedOnce: boolean;
  setHasLoadedOnce: (val: boolean) => void;

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
  settings: null,
  errors: [],
  isAnalyzing: false,
  batchProgress: 0,
  activeScreen: 'home',
  alertDialog: null,
  promptDialog: null,
  appLang: localStorage.getItem('appLang') || 'en',
  viewMode: (sessionStorage.getItem('viewMode') as any) || 'private',
  tagStats: {},
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
  hasLoadedOnce: false,
  setHasLoadedOnce: (hasLoadedOnce) => set({ hasLoadedOnce }),

  setSearchQuery: (searchQuery) => {
    set({ searchQuery });
  },
  setDebouncedSearchQuery: (debouncedSearchQuery) => set({ debouncedSearchQuery }),
  setFilterCatId: (filterCatId) => {
    set({ filterCatId });
  },
  setFilterSubId: (filterSubId) => {
    set({ filterSubId });
  },
  setFilterTagIds: (ids: string[] | ((prev: string[]) => string[])) => set((state) => {
    const nextIds = typeof ids === 'function' ? ids(state.filterTagIds) : ids;
    return { filterTagIds: nextIds };
  }),
  setSortOrder: (sortOrder) => {
    sessionStorage.setItem('sortOrder', sortOrder); // Optional: sort order is fine to keep, or we can clear
    set({ sortOrder });
  },
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
  setSettings: (settings) => {
    if (settings) {
      set({ 
        settings,
        geminiApiKey: settings.gemini_api_key || localStorage.getItem('gemini_api_key') || '',
        customModel: settings.custom_model || localStorage.getItem('ai_custom_model') || 'gemini-1.5-flash',
        accessPasscode: settings.access_passcode || localStorage.getItem('access_passcode') || ''
      });
    } else {
      set({ settings: null });
    }
  },
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
  setViewMode: (viewMode) => {
    sessionStorage.setItem('viewMode', viewMode);
    set({ viewMode });
  },
  setTagStats: (tagStats) => set({ tagStats }),
  setIsSyncing: (isSyncing) => set({ isSyncing }),
  setGeminiApiKey: (geminiApiKey) => {
    localStorage.setItem('gemini_api_key', geminiApiKey);
    set((state) => ({ 
      geminiApiKey,
      settings: state.settings ? { ...state.settings, gemini_api_key: geminiApiKey } : { gemini_api_key: geminiApiKey } as AppSettings
    }));
  },
  setCustomModel: (customModel) => {
    localStorage.setItem('ai_custom_model', customModel);
    set((state) => ({ 
      customModel,
      settings: state.settings ? { ...state.settings, custom_model: customModel } : { custom_model: customModel } as AppSettings
    }));
  },
  setAccessPasscode: (accessPasscode) => {
    localStorage.setItem('access_passcode', accessPasscode);
    set((state) => ({ 
      accessPasscode,
      settings: state.settings ? { ...state.settings, access_passcode: accessPasscode } : { access_passcode: accessPasscode } as AppSettings
    }));
  },
  logout: () => set({ user: null }),
  loginWithGoogle: async () => {}, // Keep only essential placeholder for auth if needed elsewhere
}));