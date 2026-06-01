import { create } from 'zustand';
import { useShallow } from 'zustand/shallow';
import { STORAGE_KEYS, safeGetItem, safeSetItem } from '@/lib/storage';
import { ProductFormData } from '../types';

export interface AlertDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  confirmLabel?: string;
  onCancel?: () => void;
  cancelLabel?: string;
  type?: 'danger' | 'info';
  secondaryAction?: {
    label: string;
    onClick: () => void;
    type?: 'danger' | 'info';
  };
}

export interface PromptDialogProps {
  title: string;
  message?: string;
  placeholder?: string;
  onSubmit: (val: string) => void | Promise<void>;
  initialValue?: string;
  onCancel?: () => void;
}

export interface GalleryStoreState {
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
  alertDialog: AlertDialogProps | null; 
  setAlertDialog: (dialog: AlertDialogProps | null) => void;
  promptDialog: PromptDialogProps | null; 
  setPromptDialog: (dialog: PromptDialogProps | null) => void;
  isMultiSelectMode: boolean;
  setIsMultiSelectMode: (is: boolean) => void;
  draggedPhotoId: string | null;
  setDraggedPhotoId: (id: string | null) => void;
  focusedGroupPhotoId: string | null;
  setFocusedGroupPhotoId: (id: string | null) => void;
  viewMode: 'private' | 'public';
  setViewMode: (mode: 'private' | 'public') => void;
  activeScreen: string;
  setActiveScreen: (screen: string) => void;
  isInfiniteMode: boolean;
  setIsInfiniteMode: (mode: boolean) => void;
  sortOrder: 'newest' | 'oldest' | 'name';
  setSortOrder: (order: 'newest' | 'oldest' | 'name') => void;
  filterSubId: string | null;
  setFilterSubId: (id: string | null) => void;
  resetUI: () => void;
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
  appLang: string;
  setAppLang: (lang: string) => void;
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

export const useGalleryStore = create<GalleryStoreState>()((set) => ({
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
    const updates: any = { activeGroupId };
    if (activeGroupId === null) {
      safeSetItem(STORAGE_KEYS.ACTIVE_PHOTO, null, true);
      updates.activePhotoId = null;
    }
    set(updates);
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
  viewMode: safeGetItem(STORAGE_KEYS.VIEW_MODE, 'public', (v) => ['private', 'public'].includes(v) ? v : 'public') as 'private' | 'public',
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
  appLang: safeGetItem(STORAGE_KEYS.LANG, 'en'),
  setAppLang: (appLang) => {
    safeSetItem(STORAGE_KEYS.LANG, appLang);
    set({ appLang });
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
      selectedIds: [],
      isMultiSelect: false,
      editPhotoId: null,
      activeGroupId: null,
      batchEditingIds: null,
      formState: defaultForm
    }),
  showWhatsAppChoice: false,
  setShowWhatsAppChoice: (showWhatsAppChoice) => set({ showWhatsAppChoice }),
  newPhotoData: null,
  setNewPhotoData: (newPhotoData) => set({ newPhotoData }),
  showOtherFields: false,
  setShowOtherFields: (showOtherFields) => set({ showOtherFields }),
  isInfiniteMode: false,
  setIsInfiniteMode: (isInfiniteMode) => set({ isInfiniteMode }),
  sortOrder: safeGetItem(STORAGE_KEYS.SORT_ORDER, 'newest', (v) => ['newest', 'oldest', 'name'].includes(v) ? v : 'newest') as 'newest' | 'oldest' | 'name',
  setSortOrder: (sortOrder) => {
    safeSetItem(STORAGE_KEYS.SORT_ORDER, sortOrder);
    set({ sortOrder });
  },
  filterSubId: null,
  setFilterSubId: (filterSubId) => set({ filterSubId }),
}));

export const useStore = useGalleryStore;
export { useShallow };
