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
  filterSubId: string | null;
  processingIds: string[];
  
  // Interaction state
  selectedIds: string[];
  toggleSelected: (id: string) => void;
  addProcessingIds: (ids: string[]) => void;
  removeProcessingIds: (ids: string[]) => void;
  setDraggedPhoto: (id: string | null) => void;
  updateSelectedIds: (ids: string[]) => void;

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
  editPhotoId: safeGetItem(STORAGE_KEYS.EDIT_PHOTO, null, undefined, true),
  batchEditingIds: safeGetItem(STORAGE_KEYS.BATCH_EDITING, null, undefined, true),
  groupSettingsOpen: safeGetItem(STORAGE_KEYS.GROUP_SETTINGS_OPEN, false, (v) => v === 'true', true),
  viewMode: safeGetItem(STORAGE_KEYS.VIEW_MODE, 'private', (v) => ['private', 'public'].includes(v) ? v : 'private', true) as 'private' | 'public',
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
  processingIds: [],
  alertDialog: null,
  promptDialog: null,
  isMultiSelectMode: false,
  draggedPhotoId: null,
  focusedGroupPhotoId: null,
  toggleSelected: (id) => set((state) => {
    const newSelected = new Set(state.selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    return { selectedIds: Array.from(newSelected) };
  }),
  addProcessingIds: (ids) => set((state) => ({ 
    processingIds: Array.from(new Set([...state.processingIds, ...ids])) 
  })),
  removeProcessingIds: (ids) => set((state) => ({ 
    processingIds: state.processingIds.filter(id => !ids.includes(id)) 
  })),
  setDraggedPhoto: (id) => set({ draggedPhotoId: id }),
  updateSelectedIds: (ids) => set({ selectedIds: ids }),
  resetUI: () => set({
      selectedIds: [],
      processingIds: [],
      isMultiSelect: false,
      editPhotoId: null,
      batchEditingIds: null,
      formState: defaultForm
    }),
  showWhatsAppChoice: false,
  newPhotoData: null,
  showOtherFields: false,
  isInfiniteMode: false,
  filterSubId: null,
  update: (updates) => set((state) => {
    const nextState = typeof updates === 'function' ? updates(state) : updates;
    
    if ('columns' in nextState && nextState.columns !== undefined) {
      safeSetItem(STORAGE_KEYS.COLUMNS, nextState.columns);
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
      safeSetItem(STORAGE_KEYS.VIEW_MODE, nextState.viewMode, true);
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
    
    return nextState as any;
  }),
}));

export const useStore = useUIStore;
export { useShallow };