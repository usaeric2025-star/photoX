import { createStore } from '@storve/core';
import { useStore } from '@storve/react';
import { signal } from '@storve/core/signals';
import { computed } from '@storve/core/computed';
import { STORAGE_KEYS, storage } from '@/lib/storage';
import { ProductFormData } from '@/types';
import type { LightboxSlide } from '@/lib/lightbox/types';

export interface UIStoreState {
  appLang: 'zh' | 'en' | 'ms';
  batchEditingIds: string[] | null;
  groupSettingsOpen: boolean;
  uploadAsGroup: boolean;
  formState: ProductFormData;
  showPassPrompt: boolean;
  isPhotoPickerOpen: boolean;
  photoPickerGroupId: string | null;
  isInitialDataLoading: boolean;
  isMultiSelect: boolean;
  selectedIds: string[];
  processingIds: string[];
  focusedGroupPhotoId: string | null;
  showWhatsAppChoice: boolean;
  uploadModeDialogOpen: boolean;
  isTaskDrawerOpen: boolean;
  isAvoidingSelection: boolean;
  pendingFiles: FileList | File[] | null;
  isDiagnosticsOpen: boolean;
  activeDialogCount: number;
  fatalError: Error | null;
  filters: { category: string; tags: string[]; q: string };
  
  // Lightbox 状态
  lightboxIsOpen: boolean;
  lightboxSlides: LightboxSlide[];
  lightboxCurrentIndex: number;

  // Actions
  patch: (updates: Partial<UIStoreState> | ((state: UIStoreState) => Partial<UIStoreState>)) => void;
  updateForm: (updates: Partial<ProductFormData> | ((prev: ProductFormData) => Partial<ProductFormData>)) => void;
  resetForm: () => void;
  setInitialDataLoading: (loading: boolean) => void;
  toggleSelected: (id: string) => void;
  addProcessingIds: (ids: string[]) => void;
  removeProcessingIds: (ids: string[]) => void;
  clearProcessing: (id: string) => void;
  updateSelectedIds: (ids: string[]) => void;
  incrementDialogCount: () => void;
  decrementDialogCount: () => void;
  setFatalError: (error: Error | null) => void;
  setAvoidingSelection: (isAvoiding: boolean) => void;
  resetUI: () => void;
  
  // Lightbox Actions
  openLightbox: (slides: LightboxSlide[], index?: number) => void;
  closeLightbox: () => void;
  setLightboxIndex: (index: number) => void;
}

// Internal store reference with setState exposed to avoid repeating casts
export type UIStoreInstance = ReturnType<typeof createStore<UIStoreState>> & { 
  setState: (updates: Partial<UIStoreState> | ((state: UIStoreState) => Partial<UIStoreState>)) => void 
};

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

export const uiStore = createStore<UIStoreState>({
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
  showPassPrompt: false,
  isPhotoPickerOpen: false,
  photoPickerGroupId: null,
  isInitialDataLoading: false,
  isMultiSelect: false,
  selectedIds: [],
  processingIds: [],
  focusedGroupPhotoId: null,
  showWhatsAppChoice: false,
  uploadModeDialogOpen: false,
  isTaskDrawerOpen: false,
  isAvoidingSelection: false,
  pendingFiles: null,
  isDiagnosticsOpen: false,
  activeDialogCount: 0,
  fatalError: null,
  filters: { category: '', tags: [], q: '' },
  lightboxIsOpen: false,
  lightboxSlides: [],
  lightboxCurrentIndex: 0,

  updateForm: (updates) => (uiStore as unknown as UIStoreInstance).setState((state: UIStoreState) => {
    const nextFormState = typeof updates === 'function' ? updates(state.formState) : { ...state.formState, ...updates };
    storage.set(STORAGE_KEYS.EDIT_FORM_DRAFT, nextFormState);
    return { formState: nextFormState };
  }),

  resetForm: () => {
    storage.remove(STORAGE_KEYS.EDIT_FORM_DRAFT);
    (uiStore as unknown as UIStoreInstance).setState({ formState: defaultForm });
  },

  setInitialDataLoading: (loading) => (uiStore as unknown as UIStoreInstance).setState({ isInitialDataLoading: loading }),

  toggleSelected: (id) => (uiStore as unknown as UIStoreInstance).setState((state: UIStoreState) => {
    const newSelected = new Set(state.selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    const selectedArray = Array.from(newSelected);
    return { 
      selectedIds: selectedArray,
      isMultiSelect: selectedArray.length > 0 ? true : state.isMultiSelect
    };
  }),

  addProcessingIds: (ids) => (uiStore as unknown as UIStoreInstance).setState((state: UIStoreState) => ({ 
    processingIds: Array.from(new Set([...state.processingIds, ...ids])) 
  })),

  removeProcessingIds: (ids) => (uiStore as unknown as UIStoreInstance).setState((state: UIStoreState) => ({ 
    processingIds: state.processingIds.filter((id: string) => !ids.includes(id)) 
  })),

  clearProcessing: (id) => (uiStore as unknown as UIStoreInstance).setState((state: UIStoreState) => ({
    processingIds: state.processingIds.filter((pid: string) => pid !== id)
  })),

  updateSelectedIds: (ids) => (uiStore as unknown as UIStoreInstance).setState({ selectedIds: ids }),

  incrementDialogCount: () => (uiStore as unknown as UIStoreInstance).setState((state: UIStoreState) => ({ activeDialogCount: state.activeDialogCount + 1 })),
  
  decrementDialogCount: () => (uiStore as unknown as UIStoreInstance).setState((state: UIStoreState) => ({ activeDialogCount: Math.max(0, state.activeDialogCount - 1) })),
  
  setFatalError: (error) => (uiStore as unknown as UIStoreInstance).setState({ fatalError: error }),
  
  setAvoidingSelection: (isAvoiding) => (uiStore as unknown as UIStoreInstance).setState({ isAvoidingSelection: isAvoiding }),

  resetUI: () => (uiStore as unknown as UIStoreInstance).setState({
      selectedIds: [],
      processingIds: [],
      isMultiSelect: false,
      batchEditingIds: null,
      formState: defaultForm,
      activeDialogCount: 0,
      lightboxIsOpen: false, lightboxSlides: [], lightboxCurrentIndex: 0
  }),

  openLightbox: (slides, index = 0) => (uiStore as unknown as UIStoreInstance).setState({
    lightboxIsOpen: true, lightboxSlides: slides, lightboxCurrentIndex: index
  }),

  closeLightbox: () => (uiStore as unknown as UIStoreInstance).setState({
    lightboxIsOpen: false
  }),

  setLightboxIndex: (index) => (uiStore as unknown as UIStoreInstance).setState({
    lightboxCurrentIndex: index
  }),

  patch: (updates: Partial<UIStoreState> | ((state: UIStoreState) => Partial<UIStoreState>)) => {
    (uiStore as unknown as UIStoreInstance).setState((state: UIStoreState) => {
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
      
      return nextState;
    });
  },
});

export function useUIStore<T>(selector?: (state: UIStoreState) => T): T {
  return useStore(uiStore, selector || ((s: UIStoreState) => s as unknown as T));
}
export const useUISelector = useUIStore;
export const useAppLang = () => useStore(uiStore, (s) => s.appLang);
export const currentIndexSignal = signal(uiStore, 'lightboxCurrentIndex');
export const isOpenSignal = signal(uiStore, 'lightboxIsOpen');
export const slidesSignal = signal(uiStore, 'lightboxSlides');
export const selectedIdsSignal = signal(uiStore, 'selectedIds');
export const isMultiSelectSignal = signal(uiStore, 'isMultiSelect');
export const searchTermSignal = signal(uiStore, 'filters.q');

export const selectedCount = computed(() => uiStore.getState().selectedIds.length);
export const isAnySelected = computed(() => uiStore.getState().selectedIds.length > 0);

export const hasActiveFilters = computed(() => {
  const { category, tags, q } = uiStore.getState().filters;
  return !!category || tags.length > 0 || !!q;
});
