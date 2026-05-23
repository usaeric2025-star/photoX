
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { Photo, Category, Tag, Manufacturer, AppSettings, User, DialogData, ProductFormData } from './types';
import { translations } from './lib/translations';

interface StoreState {
  abortAnalysis?: () => void;
  setAbortAnalysis: (fn: () => void) => void;
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
  appLang: 'zh' | 'en' | 'ms';
  setAppLang: (lang: 'zh' | 'en' | 'ms') => void;
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
  // Batch Editing and Groups
  batchEditingIds: string[] | null;
  setBatchEditingIds: (ids: string[] | null) => void;
  groupSettingsOpen: boolean;
  setGroupSettingsOpen: (open: boolean) => void;

  isMultiSelect: boolean;
  setIsMultiSelect: (is: boolean) => void;
  selectedIds: string[];
  setSelectedIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  isStaffMode: boolean;
  setIsStaffMode: (is: boolean) => void;
  photos: Photo[];
  setPhotos: (photos: Photo[]) => void;
  totalCount: number;
  setTotalCount: (count: number) => void;
  isFetching: boolean;
  setIsFetching: (fetching: boolean) => void;
  isFetchingNextPage: boolean;
  setIsFetchingNextPage: (fetching: boolean) => void;
  hasNextPage: boolean;
  setHasNextPage: (has: boolean) => void;
  loadMorePhotos: () => void;
  setLoadMorePhotos: (fn: () => void) => void;
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
  // Metadata and Settings
  settings: any;
  setSettings: (s: any) => void;
  geminiApiKey: string | null;
  setGeminiApiKey: (key: string | null) => void;
  customModel: string | null;
  setCustomModel: (model: string | null) => void;
  accessPasscode: string | null;
  setAccessPasscode: (code: string | null) => void;
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
  setLanguage: (lang: 'zh' | 'en' | 'ms') => void;
  setDebouncedSearchQuery: (q: string) => void;
  debouncedSearchQuery: string;
  isAnalyzing: boolean;
  aiDebugInfo: any;
  resetUI: () => void;
  resetFilters: () => void;
  showWhatsAppChoice: boolean;
  setShowWhatsAppChoice: (show: boolean) => void;
  tagIdToNameMap: Record<string, string>;
  setTagIdToNameMap: (map: Record<string, string>) => void;
  // Photo Editing Form State
  formState: ProductFormData;
  updateForm: (updates: Partial<ProductFormData> | ((prev: ProductFormData) => ProductFormData)) => void;
  newPhotoData: string | null;
  setNewPhotoData: (data: string | null) => void;
  showOtherFields: boolean;
  setShowOtherFields: (show: boolean) => void;
  resetForm: () => void;
}

const defaultForm: ProductFormData = {
  name: '',
  category_id: '',
  tag_ids: [],
  manufacturer_id: '',
  model_number: '',
  manual_code: '',
  description: '',
  is_hidden: false,
  dimensions: [],
  price: '',
  is_group_cover: false
};

export { useShallow };
export const useGalleryStore = create<StoreState>()((set) => ({
  setAbortAnalysis: (abortAnalysis) => set({ abortAnalysis }),
  searchQuery: '',
  setSearchQuery: (searchQuery) => set({ searchQuery, debouncedSearchQuery: searchQuery }),
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
  appLang: (localStorage.getItem('photo_appLang') as any) || 'en',
  setAppLang: (appLang) => {
    localStorage.setItem('photo_appLang', appLang);
    set({ appLang });
  },
  columns: Number(localStorage.getItem('photo_columns') || 3) as 2 | 3 | 5,
  setColumns: (columns) => {
    localStorage.setItem('photo_columns', String(columns));
    set({ columns });
  },
  lightboxIndex: null,
  setLightboxIndex: (lightboxIndex) => set({ lightboxIndex }),
  activeGroupId: sessionStorage.getItem('photo_activeGroupId') || null,
  setActiveGroupId: (activeGroupId) => {
    if (activeGroupId === null) {
      sessionStorage.removeItem('photo_activeGroupId');
    } else {
      sessionStorage.setItem('photo_activeGroupId', activeGroupId);
    }
    set({ activeGroupId });
  },
  activePhotoId: sessionStorage.getItem('photo_activePhotoId') || null,
  setActivePhotoId: (activePhotoId) => {
    if (activePhotoId === null) {
      sessionStorage.removeItem('photo_activePhotoId');
    } else {
      sessionStorage.setItem('photo_activePhotoId', activePhotoId);
    }
    set({ activePhotoId });
  },
  editPhotoId: sessionStorage.getItem('photo_editPhotoId') || null,
  setEditPhotoId: (editPhotoId) => {
    if (editPhotoId === null) {
      sessionStorage.removeItem('photo_editPhotoId');
      sessionStorage.removeItem('photo_edit_form_draft');
    } else {
      sessionStorage.setItem('photo_editPhotoId', editPhotoId);
    }
    set({ editPhotoId });
  },
  batchEditingIds: (() => {
    try {
      const saved = sessionStorage.getItem('photo_batchEditingIds');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })(),
  setBatchEditingIds: (batchEditingIds) => {
    if (batchEditingIds === null) {
      sessionStorage.removeItem('photo_batchEditingIds');
    } else {
      sessionStorage.setItem('photo_batchEditingIds', JSON.stringify(batchEditingIds));
    }
    set({ batchEditingIds });
  },
  groupSettingsOpen: sessionStorage.getItem('photo_groupSettingsOpen') === 'true',
  setGroupSettingsOpen: (groupSettingsOpen) => {
    sessionStorage.setItem('photo_groupSettingsOpen', String(groupSettingsOpen));
    set({ groupSettingsOpen });
  },
  isMultiSelect: false,
  setIsMultiSelect: (isMultiSelect) => set({ isMultiSelect }),
  selectedIds: [],
  setSelectedIds: (updater) => set((state) => ({ 
    selectedIds: typeof updater === 'function' ? updater(state.selectedIds) : updater 
  })),
  isStaffMode: sessionStorage.getItem('isStaffMode') === 'true',
  setIsStaffMode: (isStaffMode) => {
    sessionStorage.setItem('isStaffMode', String(isStaffMode));
    set({ isStaffMode });
  },
  photos: [],
  setPhotos: (photos) => set({ photos }),
  totalCount: 0,
  setTotalCount: (totalCount) => set({ totalCount }),
  isFetching: false,
  setIsFetching: (isFetching) => set({ isFetching }),
  isFetchingNextPage: false,
  setIsFetchingNextPage: (isFetchingNextPage) => set({ isFetchingNextPage }),
  hasNextPage: false,
  setHasNextPage: (hasNextPage) => set({ hasNextPage }),
  loadMorePhotos: () => {},
  setLoadMorePhotos: (loadMorePhotos) => set({ loadMorePhotos }),
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
  // Metadata and Settings
  settings: {},
  setSettings: (settings) => set({ settings }),
  geminiApiKey: null,
  setGeminiApiKey: (geminiApiKey) => set({ geminiApiKey }),
  customModel: null,
  setCustomModel: (customModel) => set({ customModel }),
  accessPasscode: null,
  setAccessPasscode: (accessPasscode) => set({ accessPasscode }),
  user: null,
  setUser: (user) => set({ user }),
  viewMode: (localStorage.getItem('photo_viewMode') as any) || 'public',
  setViewMode: (viewMode) => {
    localStorage.setItem('photo_viewMode', viewMode);
    set({ viewMode });
  },
  isSyncing: false,
  setIsSyncing: (isSyncing) => set({ isSyncing }),
  activeScreen: sessionStorage.getItem('photo_activeScreen') || 'gallery',
  setActiveScreen: (activeScreen) => {
    sessionStorage.setItem('photo_activeScreen', activeScreen);
    set({ activeScreen });
  },
  isInfiniteMode: false,
  setIsInfiniteMode: (isInfiniteMode) => set({ isInfiniteMode }),
  setLanguage: (appLang: 'zh' | 'en' | 'ms') => {
    localStorage.setItem('photo_appLang', appLang);
    set({ appLang });
  },
  setDebouncedSearchQuery: (debouncedSearchQuery) => set({ debouncedSearchQuery }),
  debouncedSearchQuery: '',
  isAnalyzing: false,
  aiDebugInfo: null,
  resetUI: () => {
    sessionStorage.removeItem('photo_edit_form_draft');
    sessionStorage.removeItem('photo_editPhotoId');
    sessionStorage.removeItem('photo_batchEditingIds');
    sessionStorage.removeItem('photo_activeGroupId');
    set({
      filterCatId: null,
      filterTagIds: [],
      searchQuery: '',
      selectedIds: [],
      isMultiSelect: false,
      editPhotoId: null,
      activeGroupId: null,
      batchEditingIds: null,
      formState: defaultForm
    });
  },
  resetFilters: () => set({
    filterCatId: null,
    filterTagIds: [],
    searchQuery: '',
    debouncedSearchQuery: ''
  }),
  showWhatsAppChoice: false,
  setShowWhatsAppChoice: (showWhatsAppChoice) => set({ showWhatsAppChoice }),
  tagIdToNameMap: {},
  setTagIdToNameMap: (tagIdToNameMap) => set({ tagIdToNameMap }),
  formState: (() => {
    try {
      const saved = sessionStorage.getItem('photo_edit_form_draft');
      return saved ? JSON.parse(saved) : defaultForm;
    } catch {
      return defaultForm;
    }
  })(),
  updateForm: (updates: Partial<ProductFormData> | ((prev: ProductFormData) => ProductFormData)) => set((state) => {
    const nextFormState = typeof updates === 'function' ? updates(state.formState) : { ...state.formState, ...updates };
    sessionStorage.setItem('photo_edit_form_draft', JSON.stringify(nextFormState));
    return { formState: nextFormState };
  }),
  resetForm: () => {
    sessionStorage.removeItem('photo_edit_form_draft');
    set({ formState: defaultForm });
  },
  newPhotoData: null,
  setNewPhotoData: (newPhotoData) => set({ newPhotoData }),
  showOtherFields: false,
  setShowOtherFields: (showOtherFields) => set({ showOtherFields }),
}));


export const useStore = useGalleryStore;
