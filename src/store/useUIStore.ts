import { create } from 'zustand';
import { useShallow } from 'zustand/shallow';
import { STORAGE_KEYS, safeGetItem, safeSetItem } from '@/lib/storage';
import { ProductFormData } from '../types';
import { useLocalStorage } from '@mantine/hooks';

export function useAppLang(): [string, (val: 'zh' | 'en' | 'ms') => void] {
  const lang = useUIStore(s => s.appLang);
  const setLang = (val: 'zh' | 'en' | 'ms') => useUIStore.getState().update({ appLang: val });
  return [lang, setLang];
}

export function useSidebarCollapsed() {
  return useLocalStorage<boolean>({ key: STORAGE_KEYS.SIDEBAR_COLLAPSED, defaultValue: false });
}

export function useColumns() {
  return useLocalStorage<2 | 3 | 5>({ key: STORAGE_KEYS.COLUMNS, defaultValue: 3 });
}

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
  appLang: 'zh' | 'en' | 'ms';
  lightboxIndex: number | null;
  editPhotoId: string | null;
  batchEditingIds: string[] | null;
  groupSettingsOpen: boolean;
  activeScreen: string;
  formState: ProductFormData;
  updateForm: (updates: Partial<ProductFormData> | ((prev: ProductFormData) => Partial<ProductFormData>)) => void;
  resetForm: () => void;
  showPassPrompt: boolean;
  isPhotoPickerOpen: boolean;
  photoPickerGroupId: string | null;
  isMultiSelect: boolean;
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
  activeDialogCount: number;
  
  // Interaction state
  selectedIds: string[];
  toggleSelected: (id: string) => void;
  addProcessingIds: (ids: string[]) => void;
  removeProcessingIds: (ids: string[]) => void;
  setDraggedPhoto: (id: string | null) => void;
  updateSelectedIds: (ids: string[]) => void;
  incrementDialogCount: () => void;
  decrementDialogCount: () => void;

  update: (updates: Partial<UIStoreState> | ((state: UIStoreState) => Partial<UIStoreState>)) => void;
}

const defaultForm: ProductFormData = {
  name: { zh: '' },
  category_id: '',
  tag_ids: [],
  manufacturer_id: '',
  item_code: '',
  model_number: '',
  manual_code: '',
  description: { zh: '' },
  is_hidden: false,
  dimensions: [],
  price: '',
  is_group_cover: false
};

export const useIsAnyDialogOpen = () => useUIStore((s) => s.activeDialogCount > 0);

export const useUIStore = create<UIStoreState>()((set) => ({
  appLang: (() => {
    const raw = safeGetItem(STORAGE_KEYS.LANG, 'en', undefined, false);
    if (!raw) return 'en';
    const lower = String(raw).toLowerCase();
    if (lower.startsWith('zh')) return 'zh';
    if (lower.startsWith('ms')) return 'ms';
    return 'en';
  })() as 'zh' | 'en' | 'ms',
  lightboxIndex: null,
  editPhotoId: safeGetItem(STORAGE_KEYS.EDIT_PHOTO, null, undefined, true),
  batchEditingIds: safeGetItem(STORAGE_KEYS.BATCH_EDITING, null, undefined, true),
  groupSettingsOpen: safeGetItem(STORAGE_KEYS.GROUP_SETTINGS_OPEN, false, (v) => v === 'true', true),
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
  showPassPrompt: false,
  isPhotoPickerOpen: false,
  photoPickerGroupId: null,
  isMultiSelect: false,
  selectedIds: [],
  processingIds: [],
  isMultiSelectMode: false,
  draggedPhotoId: null,
  focusedGroupPhotoId: null,
  toggleSelected: (id) => set((state) => {
    const newSelected = new Set(state.selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    const selectedArray = Array.from(newSelected);
    return { 
      selectedIds: selectedArray,
      isMultiSelect: selectedArray.length > 0 ? state.isMultiSelect : false
    };
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
      formState: defaultForm,
      activeDialogCount: 0
    }),
  showWhatsAppChoice: false,
  newPhotoData: null,
  showOtherFields: false,
  isInfiniteMode: false,
  filterSubId: null,
  activeDialogCount: 0,
  incrementDialogCount: () => set((state) => ({ activeDialogCount: state.activeDialogCount + 1 })),
  decrementDialogCount: () => set((state) => ({ activeDialogCount: Math.max(0, state.activeDialogCount - 1) })),
  update: (updates) => set((state) => {
    const nextState = typeof updates === 'function' ? updates(state) : updates;
    
    if ('appLang' in nextState && nextState.appLang !== undefined) {
      safeSetItem(STORAGE_KEYS.LANG, nextState.appLang, false);
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
    if ('activeScreen' in nextState && nextState.activeScreen !== undefined) {
      safeSetItem(STORAGE_KEYS.ACTIVE_SCREEN, nextState.activeScreen, true);
    }
    
    return nextState as any;
  }),
}));

export const useStore = useUIStore;
export { useShallow };