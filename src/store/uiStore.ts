import { createStore } from '@storve/core';
import { useStore } from '@storve/react';
import { signal } from '@storve/core/signals';
import { STORAGE_KEYS, storage } from '@/lib/storage';
import { ProductFormData } from '@/types';
import type { LightboxSlide } from '@/lib/lightbox/types';
import { Photo } from '@/types/photo';

export interface UIStoreState {
  appLang: 'zh' | 'en' | 'ms';
  groupSettingsOpen: boolean;
  uploadAsGroup: boolean;
  formState: ProductFormData;
  showPassPrompt: boolean;
  isPhotoPickerOpen: boolean;
  photoPickerGroupId: string | null;
  isInitialDataLoading: boolean;
  focusedGroupPhotoId: string | null;
  showWhatsAppChoice: boolean;
  uploadModeDialogOpen: boolean;
  isTaskDrawerOpen: boolean;
  isSidebarOpen: boolean;
  pendingPhoto: any | null;
  pendingFiles: FileList | File[] | null;
  activeDialogCount: number;
  fatalError: Error | null;
  currentEditingPhoto: Photo | null;
  gridColumns: number;
  
  // Lightbox 状态 (Data only)
  lightboxSlides: LightboxSlide[];
  lightboxCurrentIndex: number;

  // Actions
  patch: (updates: Partial<UIStoreState> | ((state: UIStoreState) => Partial<UIStoreState>)) => void;
  updateForm: (updates: Partial<ProductFormData> | ((prev: ProductFormData) => Partial<ProductFormData>)) => void;
  resetForm: () => void;
  setInitialDataLoading: (loading: boolean) => void;
  incrementDialogCount: () => void;
  decrementDialogCount: () => void;
  setFatalError: (error: Error | null) => void;
  setGridColumns: (columns: number) => void;
  resetUI: () => void;
  
  // Lightbox Actions
  setLightboxData: (slides: LightboxSlide[], index?: number) => void;
  clearLightboxData: () => void;
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
  groupSettingsOpen: storage.get<string>(STORAGE_KEYS.GROUP_SETTINGS_OPEN, 'false') === 'true',
  uploadAsGroup: storage.get<string>('uploadAsGroup', 'false') === 'true',
  formState: storage.get(STORAGE_KEYS.EDIT_FORM_DRAFT, defaultForm),
  showPassPrompt: false,
  isPhotoPickerOpen: false,
  photoPickerGroupId: null,
  isInitialDataLoading: false,
  focusedGroupPhotoId: null,
  showWhatsAppChoice: false,
  uploadModeDialogOpen: false,
  isTaskDrawerOpen: false,
  isSidebarOpen: false,
  pendingPhoto: null,
  pendingFiles: null,
  activeDialogCount: 0,
  fatalError: null,
  currentEditingPhoto: null,
  gridColumns: 3,
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

  incrementDialogCount: () => uiStore.setState((state: UIStoreState) => ({ activeDialogCount: state.activeDialogCount + 1 })),
  
  decrementDialogCount: () => uiStore.setState((state: UIStoreState) => ({ activeDialogCount: Math.max(0, state.activeDialogCount - 1) })),
  
  setFatalError: (error) => uiStore.setState({ fatalError: error }),
  
  setGridColumns: (columns) => uiStore.setState({ gridColumns: columns }),

  resetUI: () => uiStore.setState({
      formState: defaultForm,
      activeDialogCount: 0,
      lightboxSlides: [], 
      lightboxCurrentIndex: 0
  }),

  setLightboxData: (slides, index = 0) => uiStore.setState({
    lightboxSlides: slides, lightboxCurrentIndex: index
  }),

  clearLightboxData: () => uiStore.setState({
    lightboxSlides: [], lightboxCurrentIndex: 0
  }),

  setLightboxIndex: (index) => uiStore.setState({
    lightboxCurrentIndex: index
  }),

  patch: (updates: Partial<UIStoreState> | ((state: UIStoreState) => Partial<UIStoreState>)) => {
    uiStore.setState((state: UIStoreState) => {
      const nextUpdates = typeof updates === 'function' ? updates(state) : updates;
      const nextState = { ...state, ...nextUpdates };
      
      if ('appLang' in nextUpdates && nextUpdates.appLang !== undefined) {
        storage.set(STORAGE_KEYS.LANG, nextState.appLang);
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

// ============ UI 狀態 Signal (Derived from uiStore) ============
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
export const lightboxSlides = signal<UIStoreState, 'lightboxSlides'>(uiStore, 'lightboxSlides');
export const lightboxCurrentIndex = signal<UIStoreState, 'lightboxCurrentIndex'>(uiStore, 'lightboxCurrentIndex');

// 搜尋與選取
// (Selection moved to selectionService)

// UI 狀態開關
const isSidebarOpen = signal<UIStoreState, 'isSidebarOpen'>(uiStore, 'isSidebarOpen');
export const isTaskDrawerOpen = signal<UIStoreState, 'isTaskDrawerOpen'>(uiStore, 'isTaskDrawerOpen');
export const gridColumns = signal<UIStoreState, 'gridColumns'>(uiStore, 'gridColumns');
