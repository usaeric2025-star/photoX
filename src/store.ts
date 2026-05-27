
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { Photo, Category, Tag, Manufacturer, AppSettings, User, DialogData, ProductFormData } from './types';
import { STORAGE_KEYS, safeGetItem, safeSetItem } from '@/lib/storage';

interface StoreState {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  debouncedSearchQuery: string;
  setDebouncedSearchQuery: (q: string) => void;
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
  
  batchEditingIds: string[] | null;
  setBatchEditingIds: (ids: string[] | null) => void;
  groupSettingsOpen: boolean;
  setGroupSettingsOpen: (open: boolean) => void;
  isPhotoPickerOpen: boolean;
  setIsPhotoPickerOpen: (open: boolean) => void;
  photoPickerGroupId: string | null;
  setPhotoPickerGroupId: (id: string | null) => void;

  isMultiSelect: boolean;
  setIsMultiSelect: (is: boolean) => void;
  selectedIds: string[];
  setSelectedIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  isStaffMode: boolean;
  setIsStaffMode: (is: boolean) => void;
  alertDialog: DialogData | null;
  setAlertDialog: (dialog: DialogData | null) => void;
  promptDialog: DialogData | null;
  setPromptDialog: (dialog: DialogData | null) => void;
  
  isMultiSelectMode: boolean;
  setIsMultiSelectMode: (is: boolean) => void;
  draggedPhotoId: string | null;
  setDraggedPhotoId: (id: string | null) => void;
  focusedGroupPhotoId: string | null;
  setFocusedGroupPhotoId: (id: string | null) => void;

  viewMode: 'admin' | 'public';
  setViewMode: (mode: 'admin' | 'public') => void;
  activeScreen: string;
  setActiveScreen: (screen: string) => void;
  isInfiniteMode: boolean;
  setIsInfiniteMode: (mode: boolean) => void;

  resetUI: () => void;
  resetFilters: () => void;
  showWhatsAppChoice: boolean;
  setShowWhatsAppChoice: (show: boolean) => void;
  
  formState: ProductFormData;
  updateForm: (updates: Partial<ProductFormData> | ((prev: ProductFormData) => ProductFormData)) => void;
  newPhotoData: string | null;
  setNewPhotoData: (data: string | null) => void;
  showOtherFields: boolean;
  setShowOtherFields: (show: boolean) => void;
  resetForm: () => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (is: boolean) => void;
  showPassPrompt: boolean;
  setShowPassPrompt: (show: boolean) => void;
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
  searchQuery: '',
  setSearchQuery: (searchQuery) => set({ searchQuery, debouncedSearchQuery: searchQuery }),
  debouncedSearchQuery: '',
  setDebouncedSearchQuery: (debouncedSearchQuery) => set({ debouncedSearchQuery }),
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
  // @storage-contract: valid=['zh', 'en', 'ms'] default='en'
  appLang: safeGetItem(STORAGE_KEYS.LANG, 'en', (v) => ['zh', 'en', 'ms'].includes(v) ? v : 'en') as 'zh' | 'en' | 'ms',
  setAppLang: (appLang) => {
    safeSetItem(STORAGE_KEYS.LANG, appLang);
    set({ appLang });
  },
  // @storage-contract: valid=[2,3,5] default=3
  columns: safeGetItem(STORAGE_KEYS.COLUMNS, 3, (v) => {
    const n = Number(v);
    return (n === 2 || n === 3 || n === 5) ? n : 3;
  }),
  setColumns: (cols) => {
    safeSetItem(STORAGE_KEYS.COLUMNS, cols);
    set({ columns: cols });
  },
  lightboxIndex: null,
  setLightboxIndex: (lightboxIndex) => set({ lightboxIndex }),
  activeGroupId: safeGetItem(STORAGE_KEYS.ACTIVE_GROUP, null, undefined, true),
  setActiveGroupId: (activeGroupId) => {
    safeSetItem(STORAGE_KEYS.ACTIVE_GROUP, activeGroupId, true);
    set({ activeGroupId });
  },
  activePhotoId: safeGetItem(STORAGE_KEYS.ACTIVE_PHOTO, null, undefined, true),
  setActivePhotoId: (activePhotoId) => {
    safeSetItem(STORAGE_KEYS.ACTIVE_PHOTO, activePhotoId, true);
    set({ activePhotoId });
  },
  editPhotoId: safeGetItem(STORAGE_KEYS.EDIT_PHOTO, null, undefined, true),
  setEditPhotoId: (editPhotoId) => {
    safeSetItem(STORAGE_KEYS.EDIT_PHOTO, editPhotoId, true);
    if (!editPhotoId) {
      sessionStorage.removeItem(STORAGE_KEYS.EDIT_FORM_DRAFT);
    }
    set({ editPhotoId });
  },
  batchEditingIds: safeGetItem(STORAGE_KEYS.BATCH_EDITING, null, undefined, true),
  setBatchEditingIds: (batchEditingIds) => {
    safeSetItem(STORAGE_KEYS.BATCH_EDITING, batchEditingIds, true);
    set({ batchEditingIds });
  },
  groupSettingsOpen: safeGetItem(STORAGE_KEYS.GROUP_SETTINGS_OPEN, false, (v) => v === 'true', true),
  setGroupSettingsOpen: (groupSettingsOpen) => {
    safeSetItem(STORAGE_KEYS.GROUP_SETTINGS_OPEN, String(groupSettingsOpen), true);
    set({ groupSettingsOpen });
  },
  isStaffMode: safeGetItem(STORAGE_KEYS.IS_STAFF_MODE, false, (v) => v === 'true'),
  setIsStaffMode: (isStaffMode) => {
    safeSetItem(STORAGE_KEYS.IS_STAFF_MODE, String(isStaffMode));
    set({ isStaffMode });
  },
  viewMode: safeGetItem(STORAGE_KEYS.VIEW_MODE, 'public', (v) => ['admin', 'public'].includes(v) ? v : 'public') as 'admin' | 'public',
  setViewMode: (viewMode) => {
    safeSetItem(STORAGE_KEYS.VIEW_MODE, viewMode);
    set({ viewMode });
  },
  activeScreen: safeGetItem(STORAGE_KEYS.ACTIVE_SCREEN, 'gallery', undefined, true),
  setActiveScreen: (activeScreen) => {
    safeSetItem(STORAGE_KEYS.ACTIVE_SCREEN, activeScreen, true);
    set({ activeScreen });
  },
  formState: safeGetItem(STORAGE_KEYS.EDIT_FORM_DRAFT, defaultForm, undefined, true),
  updateForm: (updates) => set((state) => {
    const nextFormState = typeof updates === 'function' ? updates(state.formState) : { ...state.formState, ...updates };
    safeSetItem(STORAGE_KEYS.EDIT_FORM_DRAFT, nextFormState, true);
    return { formState: nextFormState };
  }),
  resetForm: () => {
    sessionStorage.removeItem(STORAGE_KEYS.EDIT_FORM_DRAFT);
    set({ formState: defaultForm });
  },
  isSidebarCollapsed: safeGetItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, false, (v) => v === 'true'),
  setIsSidebarCollapsed: (isSidebarCollapsed) => {
    safeSetItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, String(isSidebarCollapsed));
    set({ isSidebarCollapsed });
  },
  showPassPrompt: false,
  setShowPassPrompt: (showPassPrompt) => set({ showPassPrompt }),
  isPhotoPickerOpen: false,
  setIsPhotoPickerOpen: (isPhotoPickerOpen) => set({ isPhotoPickerOpen }),
  photoPickerGroupId: null,
  setPhotoPickerGroupId: (photoPickerGroupId) => set({ photoPickerGroupId }),
  isMultiSelect: false,
  setIsMultiSelect: (isMultiSelect) => set({ isMultiSelect }),
  selectedIds: [],
  setSelectedIds: (updater) => set((state) => ({ 
    selectedIds: typeof updater === 'function' ? updater(state.selectedIds) : updater 
  })),
  alertDialog: null,
  setAlertDialog: (alertDialog) => set({ alertDialog }),
  promptDialog: null,
  setPromptDialog: (promptDialog) => set({ promptDialog }),
  isMultiSelectMode: false,
  setIsMultiSelectMode: (isMultiSelectMode) => set({ isMultiSelectMode }),
  draggedPhotoId: null,
  setDraggedPhotoId: (draggedPhotoId) => set({ draggedPhotoId }),
  focusedGroupPhotoId: null,
  setFocusedGroupPhotoId: (focusedGroupPhotoId) => set({ focusedGroupPhotoId }),
  resetUI: () => set({
      filterCatId: null,
      filterTagIds: [],
      searchQuery: '',
      selectedIds: [],
      isMultiSelect: false,
      editPhotoId: null,
      activeGroupId: null,
      batchEditingIds: null,
      formState: defaultForm
    }),
  resetFilters: () => set({
    filterCatId: null,
    filterTagIds: [],
    searchQuery: '',
    debouncedSearchQuery: ''
  }),
  showWhatsAppChoice: false,
  setShowWhatsAppChoice: (showWhatsAppChoice) => set({ showWhatsAppChoice }),
  newPhotoData: null,
  setNewPhotoData: (newPhotoData) => set({ newPhotoData }),
  showOtherFields: false,
  setShowOtherFields: (showOtherFields) => set({ showOtherFields }),
  isInfiniteMode: false,
  setIsInfiniteMode: (isInfiniteMode) => set({ isInfiniteMode }),
}));

export const useStore = useGalleryStore;
