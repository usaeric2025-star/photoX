import { create } from 'zustand';
import { useShallow } from 'zustand/shallow';
import { STORAGE_KEYS, storage } from '@/lib/storage';
import { ProductFormData } from '../types';
import { useLocalStorage } from '@/hooks/core/useLocalStorage';

export function useAppLang(): [string, (val: 'zh' | 'en' | 'ms') => void] {
  const lang = useUIStore(s => s.appLang);
  const setLang = (val: 'zh' | 'en' | 'ms') => useUIStore.getState().update({ appLang: val });
  return [lang, setLang];
}

export function useSidebarCollapsed() {
  return useLocalStorage<boolean>({ key: STORAGE_KEYS.SIDEBAR_COLLAPSED, defaultValue: false });
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
  clearProcessing: (id: string) => void;
  setDraggedPhoto: (id: string | null) => void;
  updateSelectedIds: (ids: string[]) => void;
  incrementDialogCount: () => void;
  decrementDialogCount: () => void;

  update: (updates: Partial<UIStoreState> | ((state: UIStoreState) => Partial<UIStoreState>)) => void;
}

const defaultForm: ProductFormData = {
  name: { zh: '', en: '', ms: '' },
  category_id: '',
  tags: [],
  manufacturer_id: '',
  item_code: '',
  model_number: '',
  manual_code: '',
  description: { zh: '', en: '', ms: '' },
  is_hidden: false,
  dimensions: [],
  price: '',
  is_group_cover: false
};

export const useIsAnyDialogOpen = () => useUIStore((s) => s.activeDialogCount > 0);

export const useUIStore = create<UIStoreState>()((set) => ({
  appLang: (() => {
    const raw = storage.get(STORAGE_KEYS.LANG, 'en');
    if (!raw) return 'en';
    const lower = String(raw).toLowerCase();
    if (lower.startsWith('zh')) return 'zh';
    if (lower.startsWith('ms')) return 'ms';
    return 'en';
  })() as 'zh' | 'en' | 'ms',
  lightboxIndex: null,
  editPhotoId: storage.get(STORAGE_KEYS.EDIT_PHOTO, null),
  batchEditingIds: storage.get(STORAGE_KEYS.BATCH_EDITING, null),
  groupSettingsOpen: storage.get<string>(STORAGE_KEYS.GROUP_SETTINGS_OPEN, 'false') === 'true',
  activeScreen: storage.get(STORAGE_KEYS.ACTIVE_SCREEN, 'gallery'),
  formState: storage.get(STORAGE_KEYS.EDIT_FORM_DRAFT, defaultForm),
  updateForm: (updates) => set((state) => {
    const nextFormState = typeof updates === 'function' ? updates(state.formState) : { ...state.formState, ...updates };
    storage.set(STORAGE_KEYS.EDIT_FORM_DRAFT, nextFormState);
    return { formState: nextFormState as ProductFormData };
  }),
  resetForm: () => {
    storage.remove(STORAGE_KEYS.EDIT_FORM_DRAFT);
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
  clearProcessing: (id) => set((state) => ({
    processingIds: state.processingIds.filter(pid => pid !== id)
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
      storage.set(STORAGE_KEYS.LANG, nextState.appLang);
    }
    if ('editPhotoId' in nextState) {
      storage.set(STORAGE_KEYS.EDIT_PHOTO, nextState.editPhotoId);
      if (!nextState.editPhotoId) {
        storage.remove(STORAGE_KEYS.EDIT_FORM_DRAFT);
      }
    }
    if ('batchEditingIds' in nextState) {
      storage.set(STORAGE_KEYS.BATCH_EDITING, nextState.batchEditingIds);
    }
    if ('groupSettingsOpen' in nextState && nextState.groupSettingsOpen !== undefined) {
      storage.set(STORAGE_KEYS.GROUP_SETTINGS_OPEN, String(nextState.groupSettingsOpen));
    }
    if ('activeScreen' in nextState && nextState.activeScreen !== undefined) {
      storage.set(STORAGE_KEYS.ACTIVE_SCREEN, nextState.activeScreen);
    }
    
    return nextState as any;
  }),
}));

export const useStore = useUIStore;
export { useShallow };