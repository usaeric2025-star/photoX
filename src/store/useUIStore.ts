import { create } from 'zustand';
import { useShallow } from 'zustand/shallow';
import { STORAGE_KEYS, safeGetItem, safeSetItem } from '@/lib/storage';
import { ProductFormData } from '../types';

export interface AlertDialogProps {
  title: string;
  message: React.ReactNode;
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

export interface UIStoreState {
  columns: 2 | 3 | 5;
  lightboxIndex: number | null;
  activeGroupId: string | null;
  activePhotoId: string | null;
  editPhotoId: string | null;
  batchEditingIds: string[] | null;
  groupSettingsOpen: boolean;
  viewMode: 'private' | 'public';
  activeScreen: string;
  formState: ProductFormData;
  updateForm: (updates: Partial<ProductFormData> | ((prev: ProductFormData) => Partial<ProductFormData>)) => void;
  resetForm: () => void;
  isSidebarCollapsed: boolean;
  showPassPrompt: boolean;
  appLang: string;
  isPhotoPickerOpen: boolean;
  photoPickerGroupId: string | null;
  isMultiSelect: boolean;
  selectedIds: string[];
  alertDialog: AlertDialogProps | null;
  promptDialog: PromptDialogProps | null;
  isMultiSelectMode: boolean;
  draggedPhotoId: string | null;
  focusedGroupPhotoId: string | null;
  resetUI: () => void;
  showWhatsAppChoice: boolean;
  newPhotoData: string | null;
  showOtherFields: boolean;
  isInfiniteMode: boolean;
  sortOrder: 'newest' | 'oldest' | 'name';
  filterSubId: string | null;
  update: (updates: Partial<UIStoreState> | ((state: UIStoreState) => Partial<UIStoreState>)) => void;
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

export const useUIStore = create<UIStoreState>()((set) => ({
  columns: safeGetItem(STORAGE_KEYS.COLUMNS, 3, (v) => {
    const n = Number(v);
    return (n === 2 || n === 3 || n === 5) ? n : 3;
  }),
  lightboxIndex: null,
  activeGroupId: safeGetItem(STORAGE_KEYS.ACTIVE_GROUP, null, undefined, true),
  activePhotoId: safeGetItem(STORAGE_KEYS.ACTIVE_PHOTO, null, undefined, true),
  editPhotoId: safeGetItem(STORAGE_KEYS.EDIT_PHOTO, null, undefined, true),
  batchEditingIds: safeGetItem(STORAGE_KEYS.BATCH_EDITING, null, undefined, true),
  groupSettingsOpen: safeGetItem(STORAGE_KEYS.GROUP_SETTINGS_OPEN, false, (v) => v === 'true', true),
  viewMode: safeGetItem(STORAGE_KEYS.VIEW_MODE, 'public', (v) => ['private', 'public'].includes(v) ? v : 'public') as 'private' | 'public',
  activeScreen: safeGetItem(STORAGE_KEYS.ACTIVE_SCREEN, 'gallery', undefined, true),
  formState: safeGetItem(STORAGE_KEYS.EDIT_FORM_DRAFT, defaultForm, undefined, true),
  updateForm: (updates) => set((state) => {
    const nextFormState = typeof updates === 'function' ? updates(state.formState) : { ...state.formState, ...updates };
    safeSetItem(STORAGE_KEYS.EDIT_FORM_DRAFT, nextFormState, true);
    return { formState: nextFormState as ProductFormData };
  }),
  resetForm: () => {
    sessionStorage.removeItem(STORAGE_KEYS.EDIT_FORM_DRAFT);
    set({ formState: defaultForm });
  },
  isSidebarCollapsed: safeGetItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, false, (v) => v === 'true'),
  showPassPrompt: false,
  appLang: safeGetItem(STORAGE_KEYS.LANG, 'en'),
  isPhotoPickerOpen: false,
  photoPickerGroupId: null,
  isMultiSelect: false,
  selectedIds: [],
  alertDialog: null,
  promptDialog: null,
  isMultiSelectMode: false,
  draggedPhotoId: null,
  focusedGroupPhotoId: null,
  resetUI: () => set({
      selectedIds: [],
      isMultiSelect: false,
      editPhotoId: null,
      activeGroupId: null,
      batchEditingIds: null,
      formState: defaultForm
    }),
  showWhatsAppChoice: false,
  newPhotoData: null,
  showOtherFields: false,
  isInfiniteMode: false,
  sortOrder: safeGetItem(STORAGE_KEYS.SORT_ORDER, 'newest', (v) => ['newest', 'oldest', 'name'].includes(v) ? v : 'newest') as 'newest' | 'oldest' | 'name',
  filterSubId: null,
  update: (updates) => set((state) => {
    const nextState = typeof updates === 'function' ? updates(state) : updates;
    
    if ('columns' in nextState && nextState.columns !== undefined) {
      safeSetItem(STORAGE_KEYS.COLUMNS, nextState.columns);
    }
    if ('activeGroupId' in nextState) {
      safeSetItem(STORAGE_KEYS.ACTIVE_GROUP, nextState.activeGroupId, true);
      if (nextState.activeGroupId === null) {
        safeSetItem(STORAGE_KEYS.ACTIVE_PHOTO, null, true);
        nextState.activePhotoId = null;
      }
    }
    if ('activePhotoId' in nextState) {
      safeSetItem(STORAGE_KEYS.ACTIVE_PHOTO, nextState.activePhotoId, true);
    }
    if ('editPhotoId' in nextState) {
      safeSetItem(STORAGE_KEYS.EDIT_PHOTO, nextState.editPhotoId, true);
      if (!nextState.editPhotoId) {
        sessionStorage.removeItem(STORAGE_KEYS.EDIT_FORM_DRAFT);
      }
    }
    if ('batchEditingIds' in nextState) {
      safeSetItem(STORAGE_KEYS.BATCH_EDITING, nextState.batchEditingIds, true);
    }
    if ('groupSettingsOpen' in nextState && nextState.groupSettingsOpen !== undefined) {
      safeSetItem(STORAGE_KEYS.GROUP_SETTINGS_OPEN, String(nextState.groupSettingsOpen), true);
    }
    if ('viewMode' in nextState && nextState.viewMode !== undefined) {
      safeSetItem(STORAGE_KEYS.VIEW_MODE, nextState.viewMode);
    }
    if ('activeScreen' in nextState && nextState.activeScreen !== undefined) {
      safeSetItem(STORAGE_KEYS.ACTIVE_SCREEN, nextState.activeScreen, true);
    }
    if ('isSidebarCollapsed' in nextState && nextState.isSidebarCollapsed !== undefined) {
      safeSetItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, String(nextState.isSidebarCollapsed));
    }
    if ('appLang' in nextState && nextState.appLang !== undefined) {
      safeSetItem(STORAGE_KEYS.LANG, nextState.appLang);
    }
    if ('sortOrder' in nextState && nextState.sortOrder !== undefined) {
      safeSetItem(STORAGE_KEYS.SORT_ORDER, nextState.sortOrder);
    }
    
    return nextState as any;
  }),
}));

export const useStore = useUIStore;
export { useShallow };