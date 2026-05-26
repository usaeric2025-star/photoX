
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { Photo, Category, Tag, Manufacturer, AppSettings, User, DialogData, ProductFormData } from './types';

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
  appLang: (localStorage.getItem('photo_appLang') || 'en') as 'zh' | 'en' | 'ms',
  setAppLang: (appLang) => {
    localStorage.setItem('photo_appLang', appLang);
    set({ appLang });
  },
  // @storage-contract: valid=[2,3,5] default=3
  columns: (() => {
    const saved = localStorage.getItem('photo_columns');
    const cols = saved ? Number(saved) : 3;
    return (cols === 2 || cols === 3 || cols === 5) ? (cols as 2 | 3 | 5) : 3;
  })(),
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
  // @storage-contract: valid=[true, false] default=false
  isStaffMode: localStorage.getItem('isStaffMode') === 'true',
  setIsStaffMode: (isStaffMode) => {
    localStorage.setItem('isStaffMode', String(isStaffMode));
    set({ isStaffMode });
  },
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
  // @storage-contract: valid=['admin', 'public'] default='public'
  viewMode: (localStorage.getItem('photo_viewMode') || 'public') as 'admin' | 'public',
  setViewMode: (viewMode) => {
    localStorage.setItem('photo_viewMode', viewMode);
    set({ viewMode });
  },
  activeScreen: sessionStorage.getItem('photo_activeScreen') || 'gallery',
  setActiveScreen: (activeScreen) => {
    sessionStorage.setItem('photo_activeScreen', activeScreen);
    set({ activeScreen });
  },
  isInfiniteMode: false,
  setIsInfiniteMode: (isInfiniteMode) => set({ isInfiniteMode }),
  resetUI: () => {
    // [SYNC-STORAGE-IN-RENDER] @ src/store.ts:217
    setTimeout(() => {
      sessionStorage.removeItem('photo_edit_form_draft');
      sessionStorage.removeItem('photo_editPhotoId');
      sessionStorage.removeItem('photo_batchEditingIds');
      sessionStorage.removeItem('photo_activeGroupId');
    }, 0);
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
  // @storage-contract: valid=[true, false] default=false
  isSidebarCollapsed: localStorage.getItem('photo_isSidebarCollapsed') === 'true',
  setIsSidebarCollapsed: (isSidebarCollapsed) => {
    localStorage.setItem('photo_isSidebarCollapsed', String(isSidebarCollapsed));
    set({ isSidebarCollapsed });
  },
  showPassPrompt: false,
  setShowPassPrompt: (showPassPrompt) => set({ showPassPrompt }),
}));

export const useStore = useGalleryStore;
