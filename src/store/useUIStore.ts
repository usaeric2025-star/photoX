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
  batchEditingIds: string[] | null;
  groupSettingsOpen: boolean;
  uploadAsGroup: boolean;
  formState: ProductFormData;
  updateForm: (updates: Partial<ProductFormData> | ((prev: ProductFormData) => Partial<ProductFormData>)) => void;
  resetForm: () => void;
  showPassPrompt: boolean;
  isPhotoPickerOpen: boolean;
  photoPickerGroupId: string | null;
  isInitialDataLoading: boolean;
  setInitialDataLoading: (loading: boolean) => void;
  isMultiSelect: boolean;
  draggedPhotoId: string | null;
  focusedGroupPhotoId: string | null;
  resetUI: () => void;
  showWhatsAppChoice: boolean;
  processingIds: string[];
  activeDialogCount: number;
  fatalError: Error | null;
  setFatalError: (error: Error | null) => void;
  
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
  batchEditingIds: storage.get(STORAGE_KEYS.BATCH_EDITING, null),
  groupSettingsOpen: storage.get<string>(STORAGE_KEYS.GROUP_SETTINGS_OPEN, 'false') === 'true',
  uploadAsGroup: storage.get<string>('uploadAsGroup', 'false') === 'true',
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
  isInitialDataLoading: false,
  setInitialDataLoading: (loading) => set({ isInitialDataLoading: loading }),
  isMultiSelect: false,
  selectedIds: [],
  processingIds: [],
  draggedPhotoId: null,
  focusedGroupPhotoId: null,
  toggleSelected: (id) => set((state) => {
    const newSelected = new Set(state.selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    const selectedArray = Array.from(newSelected);
    return { 
      selectedIds: selectedArray,
      isMultiSelect: selectedArray.length > 0 ? true : state.isMultiSelect
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
      batchEditingIds: null,
      formState: defaultForm,
      activeDialogCount: 0
    }),
  showWhatsAppChoice: false,
  activeDialogCount: 0,
  fatalError: null,
  setFatalError: (error) => set({ fatalError: error }),
  incrementDialogCount: () => set((state) => ({ activeDialogCount: state.activeDialogCount + 1 })),
  decrementDialogCount: () => set((state) => ({ activeDialogCount: Math.max(0, state.activeDialogCount - 1) })),
  update: (updates) => set((state) => {
    const nextUpdates = typeof updates === 'function' ? updates(state) : updates;
    const nextState = { ...state, ...nextUpdates };

    if ('isMultiSelect' in nextUpdates && nextUpdates.isMultiSelect === false) {
      nextState.selectedIds = [];
    }
    
    if ('appLang' in nextUpdates && nextUpdates.appLang !== undefined) {
      storage.set(STORAGE_KEYS.LANG, nextState.appLang);
    }
    if ('batchEditingIds' in nextUpdates) {
      storage.set(STORAGE_KEYS.BATCH_EDITING, nextState.batchEditingIds);
    }
    if ('groupSettingsOpen' in nextUpdates && nextUpdates.groupSettingsOpen !== undefined) {
      storage.set(STORAGE_KEYS.GROUP_SETTINGS_OPEN, String(nextState.groupSettingsOpen));
    }
    if ('uploadAsGroup' in nextUpdates && nextUpdates.uploadAsGroup !== undefined) {
      storage.set('uploadAsGroup', String(nextState.uploadAsGroup));
    }
    
    return nextState as any;
  }),
}));

export const useStore = useUIStore;
export { useShallow };