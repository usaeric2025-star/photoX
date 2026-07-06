import { signal, batch, computed } from '@preact/signals-react';
import { STORAGE_KEYS, storage } from '#lib/storage.js';
import { ProductFormData } from '#src/types/index.js';
import { LightboxSlide } from '#lib/lightbox/types.js';

export interface UIStoreState {
  appLang: 'zh' | 'en' | 'ms';
  descLang: 'zh' | 'en' | 'ms';
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
  pendingPhotoId: string | null;
  pendingFiles: FileList | File[] | null;
  activeDialogCount: number;
  fatalError: Error | null;
  totalCount: number;
  lightboxSlides: LightboxSlide[];
  lightboxCurrentIndex: number;
  patch: (updates: Partial<Omit<UIStoreState, 'patch' | 'updateForm' | 'resetForm' | 'incrementDialogCount' | 'decrementDialogCount' | 'setLightboxData' | 'clearLightboxData'>>) => void;
  updateForm: (updates: Partial<ProductFormData> | ((prev: ProductFormData) => Partial<ProductFormData>)) => void;
  resetForm: () => void;
  incrementDialogCount: () => void;
  decrementDialogCount: () => void;
  setLightboxData: (slides: LightboxSlide[], index?: number) => void;
  setLightboxIndex: (index: number) => void;
  clearLightboxData: () => void;
  setFatalError: (error: Error | null) => void;
}

// Initial state
const defaultForm: ProductFormData = {
  name: '',
  categoryId: '',
  tags: [],
  manufacturerId: '',
  itemCode: '',
  modelNumber: '',
  manualCode: '',
  description: { zh: '', en: '', ms: '' },
  isHidden: false,
  dimensions: [],
  price: '',
  isGroupCover: false
};

// Signals
export const appLang = signal<'zh' | 'en' | 'ms'>(
  (() => {
    const raw = storage.get(STORAGE_KEYS.LANG, 'en');
    if (!raw) return 'en';
    const lower = String(raw).toLowerCase();
    if (lower.startsWith('zh')) return 'zh';
    if (lower.startsWith('ms')) return 'ms';
    return 'en';
  })()
);

export const descLang = signal<'zh' | 'en' | 'ms'>(
  (() => {
    const raw = storage.get(STORAGE_KEYS.DESC_LANG, 'zh');
    if (['zh', 'en', 'ms'].includes(String(raw))) return raw as 'zh' | 'en' | 'ms';
    return 'zh';
  })()
);

export const groupSettingsOpen = signal<boolean>(storage.get<string>(STORAGE_KEYS.GROUP_SETTINGS_OPEN, 'false') === 'true');
export const uploadAsGroup = signal<boolean>(storage.get<string>('uploadAsGroup', 'false') === 'true');
export const formState = signal<ProductFormData>(storage.get(STORAGE_KEYS.EDIT_FORM_CACHE, defaultForm));
export const showPassPrompt = signal<boolean>(false);
export const isPhotoPickerOpen = signal<boolean>(false);
export const photoPickerGroupId = signal<string | null>(null);
export const isInitialDataLoading = signal<boolean>(false);
export const focusedGroupPhotoId = signal<string | null>(null);
export const showWhatsAppChoice = signal<boolean>(false);
export const uploadModeDialogOpen = signal<boolean>(false);
export const isTaskDrawerOpen = signal<boolean>(false);
export const isSidebarOpen = signal<boolean>(false);
export const pendingPhotoId = signal<string | null>(null);
export const pendingFiles = signal<FileList | File[] | null>(null);
export const activeDialogCount = signal<number>(0);
export const fatalError = signal<Error | null>(null);
export const totalCount = signal<number>(0);
export const lightboxSlides = signal<LightboxSlide[]>([]);
export const lightboxCurrentIndex = signal<number>(0);

export const patch = (updates: Partial<Omit<UIStoreState, 'patch' | 'updateForm' | 'resetForm' | 'incrementDialogCount' | 'decrementDialogCount' | 'setLightboxData' | 'clearLightboxData'>>) => {
  batch(() => {
    if (updates.appLang !== undefined) appLang.value = updates.appLang;
    if (updates.descLang !== undefined) descLang.value = updates.descLang;
    if (updates.groupSettingsOpen !== undefined) groupSettingsOpen.value = updates.groupSettingsOpen;
    if (updates.uploadAsGroup !== undefined) uploadAsGroup.value = updates.uploadAsGroup;
    if (updates.formState !== undefined) formState.value = updates.formState;
    if (updates.showPassPrompt !== undefined) showPassPrompt.value = updates.showPassPrompt;
    if (updates.isPhotoPickerOpen !== undefined) isPhotoPickerOpen.value = updates.isPhotoPickerOpen;
    if (updates.photoPickerGroupId !== undefined) photoPickerGroupId.value = updates.photoPickerGroupId;
    if (updates.isInitialDataLoading !== undefined) isInitialDataLoading.value = updates.isInitialDataLoading;
    if (updates.focusedGroupPhotoId !== undefined) focusedGroupPhotoId.value = updates.focusedGroupPhotoId;
    if (updates.showWhatsAppChoice !== undefined) showWhatsAppChoice.value = updates.showWhatsAppChoice;
    if (updates.uploadModeDialogOpen !== undefined) uploadModeDialogOpen.value = updates.uploadModeDialogOpen;
    if (updates.isTaskDrawerOpen !== undefined) isTaskDrawerOpen.value = updates.isTaskDrawerOpen;
    if (updates.isSidebarOpen !== undefined) isSidebarOpen.value = updates.isSidebarOpen;
    if (updates.pendingPhotoId !== undefined) pendingPhotoId.value = updates.pendingPhotoId;
    if (updates.pendingFiles !== undefined) pendingFiles.value = updates.pendingFiles;
    if (updates.activeDialogCount !== undefined) activeDialogCount.value = updates.activeDialogCount;
    if (updates.fatalError !== undefined) fatalError.value = updates.fatalError;
    if (updates.totalCount !== undefined) totalCount.value = updates.totalCount;
    if (updates.lightboxSlides !== undefined) lightboxSlides.value = updates.lightboxSlides;
    if (updates.lightboxCurrentIndex !== undefined) lightboxCurrentIndex.value = updates.lightboxCurrentIndex;
  });
};

export const updateForm = (updates: Partial<ProductFormData> | ((prev: ProductFormData) => Partial<ProductFormData>)) => {
  const nextFormState = typeof updates === 'function' ? updates(formState.value) : { ...formState.value, ...updates };
  if (nextFormState.name === undefined) nextFormState.name = '';
  storage.set(STORAGE_KEYS.EDIT_FORM_CACHE, nextFormState);
  formState.value = nextFormState as ProductFormData;
};

export const resetForm = () => {
  storage.remove(STORAGE_KEYS.EDIT_FORM_CACHE);
  formState.value = defaultForm;
};

export const incrementDialogCount = () => {
  activeDialogCount.value += 1;
};

export const decrementDialogCount = () => {
  activeDialogCount.value = Math.max(0, activeDialogCount.value - 1);
};

export const setLightboxData = (slides: LightboxSlide[], index: number = 0) => {
  batch(() => {
    lightboxSlides.value = slides;
    lightboxCurrentIndex.value = index;
  });
};

export const setLightboxIndex = (index: number) => {
  lightboxCurrentIndex.value = index;
};

export const clearLightboxData = () => {
  batch(() => {
    lightboxSlides.value = [];
    lightboxCurrentIndex.value = 0;
  });
};

export const setFatalError = (error: Error | null) => {
  fatalError.value = error;
};

// Sync language to DOM
appLang.subscribe((lang) => {
  storage.set(STORAGE_KEYS.LANG, lang);
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.lang = lang;
  }
});

descLang.subscribe(l => storage.set(STORAGE_KEYS.DESC_LANG, l));
