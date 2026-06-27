import { createStore } from '@storve/core';
import { useStore } from '@storve/react';
import { signal } from '@storve/core/signals';
import { STORAGE_KEYS, storage } from '@/lib/storage';
import { ProductFormData } from '@/types';
import type { LightboxSlide } from '@/lib/lightbox/types';
import { Photo } from '@/types/photo';

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
  isSidebarOpen: boolean;
  isAvoidingSelection: boolean;
  pendingFiles: FileList | File[] | null;
  activeDialogCount: number;
  fatalError: Error | null;
  isPhotoEditOpen: boolean;
  currentEditingPhoto: Photo | null;
  gridColumns: number;
  
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
  setGridColumns: (columns: number) => void;
  resetUI: () => void;
  
  // Lightbox Actions
  openLightbox: (slides: LightboxSlide[], index?: number) => void;
  closeLightbox: () => void;
  setLightboxIndex: (index: number) => void;
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
  isSidebarOpen: false,
  isAvoidingSelection: false,
  pendingFiles: null,
  activeDialogCount: 0,
  fatalError: null,
  isPhotoEditOpen: false,
  currentEditingPhoto: null,
  gridColumns: 3,
  lightboxIsOpen: false,
  lightboxSlides: [],
  lightboxCurrentIndex: 0,

  updateForm: (updates) => uiStore.setState((state: UIStoreState) => {
    const nextFormState = typeof updates === 'function' ? updates(state.formState) : { ...state.formState, ...updates };
    storage.set(STORAGE_KEYS.EDIT_FORM_DRAFT, nextFormState);
    return { formState: nextFormState };
  }),

  resetForm: () => {
    storage.remove(STORAGE_KEYS.EDIT_FORM_DRAFT);
    uiStore.setState({ formState: defaultForm });
  },

  setInitialDataLoading: (loading) => uiStore.setState({ isInitialDataLoading: loading }),

  toggleSelected: (id) => uiStore.setState((state: UIStoreState) => {
    const newSelected = new Set(state.selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    const selectedArray = Array.from(newSelected);
    return { 
      selectedIds: selectedArray,
      isMultiSelect: selectedArray.length > 0 ? true : state.isMultiSelect
    };
  }),

  addProcessingIds: (ids) => uiStore.setState((state: UIStoreState) => ({ 
    processingIds: Array.from(new Set([...state.processingIds, ...ids])) 
  })),

  removeProcessingIds: (ids) => uiStore.setState((state: UIStoreState) => ({ 
    processingIds: state.processingIds.filter((id: string) => !ids.includes(id)) 
  })),

  clearProcessing: (id) => uiStore.setState((state: UIStoreState) => ({
    processingIds: state.processingIds.filter((pid: string) => pid !== id)
  })),

  updateSelectedIds: (ids) => uiStore.setState({ selectedIds: ids }),

  incrementDialogCount: () => uiStore.setState((state: UIStoreState) => ({ activeDialogCount: state.activeDialogCount + 1 })),
  
  decrementDialogCount: () => uiStore.setState((state: UIStoreState) => ({ activeDialogCount: Math.max(0, state.activeDialogCount - 1) })),
  
  setFatalError: (error) => uiStore.setState({ fatalError: error }),
  
  setAvoidingSelection: (isAvoiding) => uiStore.setState({ isAvoidingSelection: isAvoiding }),

  setGridColumns: (columns) => uiStore.setState({ gridColumns: columns }),

  resetUI: () => uiStore.setState({
      selectedIds: [],
      processingIds: [],
      isMultiSelect: false,
      batchEditingIds: null,
      formState: defaultForm,
      activeDialogCount: 0,
      lightboxIsOpen: false, lightboxSlides: [], lightboxCurrentIndex: 0
  }),

  openLightbox: (slides, index = 0) => uiStore.setState({
    lightboxIsOpen: true, lightboxSlides: slides, lightboxCurrentIndex: index
  }),

  closeLightbox: () => uiStore.setState({
    lightboxIsOpen: false
  }),

  setLightboxIndex: (index) => uiStore.setState({
    lightboxCurrentIndex: index
  }),

  patch: (updates: Partial<UIStoreState> | ((state: UIStoreState) => Partial<UIStoreState>)) => {
    uiStore.setState((state: UIStoreState) => {
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

export function useUIStore<T = UIStoreState>(selector?: (state: UIStoreState) => T): T {
  return useStore(uiStore, selector);
}

export const useAppLang = () => useStore(uiStore, (s: UIStoreState) => s.appLang) as 'zh' | 'en' | 'ms';

// Computed selectors
export const selectedCountSelector = (state: UIStoreState) => state.selectedIds.length;
export const selectedSetSelector = (state: UIStoreState) => new Set(state.selectedIds);
export const isAnySelectedSelector = (state: UIStoreState) => state.selectedIds.length > 0;

// ============ UI 狀態 Signal (Derived from uiStore) ============
export const isPhotoEditOpen = signal<UIStoreState, 'isPhotoEditOpen'>(uiStore, 'isPhotoEditOpen');
export const currentEditingPhoto = signal<UIStoreState, 'currentEditingPhoto'>(uiStore, 'currentEditingPhoto');
export const appLangSignal = signal<UIStoreState, 'appLang'>(uiStore, 'appLang');

// Sync language to DOM
if (typeof document !== 'undefined') {
  const syncLang = (lang: string) => {
    document.documentElement.dataset.lang = lang;
  };
  appLangSignal.subscribe(syncLang);
  syncLang(appLangSignal.get());
}

// 燈箱狀態
export const isLightboxOpen = signal<UIStoreState, 'lightboxIsOpen'>(uiStore, 'lightboxIsOpen');
export const lightboxSlides = signal<UIStoreState, 'lightboxSlides'>(uiStore, 'lightboxSlides');
export const lightboxCurrentIndex = signal<UIStoreState, 'lightboxCurrentIndex'>(uiStore, 'lightboxCurrentIndex');

// 搜尋與選取
export const selectedIds = signal<UIStoreState, 'selectedIds'>(uiStore, 'selectedIds');
export const isMultiSelect = signal<UIStoreState, 'isMultiSelect'>(uiStore, 'isMultiSelect');

// UI 狀態開關
export const isSidebarOpen = signal<UIStoreState, 'isSidebarOpen'>(uiStore, 'isSidebarOpen');
export const isTaskDrawerOpen = signal<UIStoreState, 'isTaskDrawerOpen'>(uiStore, 'isTaskDrawerOpen');
export const gridColumns = signal<UIStoreState, 'gridColumns'>(uiStore, 'gridColumns');
