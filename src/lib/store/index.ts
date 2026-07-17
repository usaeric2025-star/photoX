import { useMemo } from 'react';
import { useAtomValue, getDefaultStore } from 'jotai';
import { 
  appLangAtom, 
  descLangAtom, 
  groupSettingsOpenAtom, 
  uploadAsGroupAtom, 
  formStateAtom, 
  showPassPromptAtom, 
  isPhotoPickerOpenAtom, 
  photoPickerGroupIdAtom, 
  isInitialDataLoadingAtom, 
  focusedGroupPhotoIdAtom, 
  showWhatsAppChoiceAtom, 
  uploadModeDialogOpenAtom, 
  isTaskDrawerOpenAtom, 
  isSidebarOpenAtom, 
  pendingPhotoIdAtom, 
  pendingFilesAtom, 
  activeDialogCountAtom, 
  fatalErrorAtom, 
  totalCountAtom, 
  lightboxSlidesAtom, 
  lightboxCurrentIndexAtom,
  incrementDialogCountAtom,
  decrementDialogCountAtom,
  closeLightboxAtom,
  defaultForm
} from '#src/store/index.js';

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
  patch: (update: Partial<UIStoreState>) => void;
  updateForm: (updates: Partial<ProductFormData>) => void;
  resetForm: () => void;
  incrementDialogCount: () => void;
  decrementDialogCount: () => void;
  setLightboxData: (slides: LightboxSlide[]) => void;
  setLightboxIndex: (index: number) => void;
  clearLightboxData: () => void;
  setFatalError: (error: Error | null) => void;
}

const store = getDefaultStore();

const patch = (update: Partial<UIStoreState>) => {
  if (update.appLang !== undefined) store.set(appLangAtom, update.appLang);
  if (update.descLang !== undefined) store.set(descLangAtom, update.descLang);
  if (update.groupSettingsOpen !== undefined) store.set(groupSettingsOpenAtom, update.groupSettingsOpen);
  if (update.uploadAsGroup !== undefined) store.set(uploadAsGroupAtom, update.uploadAsGroup);
  if (update.showPassPrompt !== undefined) store.set(showPassPromptAtom, update.showPassPrompt);
  if (update.isPhotoPickerOpen !== undefined) store.set(isPhotoPickerOpenAtom, update.isPhotoPickerOpen);
  if (update.photoPickerGroupId !== undefined) store.set(photoPickerGroupIdAtom, update.photoPickerGroupId);
  if (update.isInitialDataLoading !== undefined) store.set(isInitialDataLoadingAtom, update.isInitialDataLoading);
  if (update.focusedGroupPhotoId !== undefined) store.set(focusedGroupPhotoIdAtom, update.focusedGroupPhotoId);
  if (update.showWhatsAppChoice !== undefined) store.set(showWhatsAppChoiceAtom, update.showWhatsAppChoice);
  if (update.uploadModeDialogOpen !== undefined) store.set(uploadModeDialogOpenAtom, update.uploadModeDialogOpen);
  if (update.isTaskDrawerOpen !== undefined) store.set(isTaskDrawerOpenAtom, update.isTaskDrawerOpen);
  if (update.isSidebarOpen !== undefined) store.set(isSidebarOpenAtom, update.isSidebarOpen);
  if (update.pendingPhotoId !== undefined) store.set(pendingPhotoIdAtom, update.pendingPhotoId);
  if (update.pendingFiles !== undefined) store.set(pendingFilesAtom, update.pendingFiles);
  if (update.fatalError !== undefined) store.set(fatalErrorAtom, update.fatalError);
  if (update.totalCount !== undefined) store.set(totalCountAtom, update.totalCount);
  if (update.lightboxSlides !== undefined) store.set(lightboxSlidesAtom, update.lightboxSlides);
  if (update.lightboxCurrentIndex !== undefined) store.set(lightboxCurrentIndexAtom, update.lightboxCurrentIndex);
};

const updateForm = (updates: Partial<ProductFormData>) => {
  store.set(formStateAtom as any, { ...store.get(formStateAtom), ...updates });
};

const resetForm = () => {
  store.set(formStateAtom as any, defaultForm);
};

const incrementDialogCount = () => {
  store.set(incrementDialogCountAtom as any);
};

const decrementDialogCount = () => {
  store.set(decrementDialogCountAtom as any);
};

const setLightboxData = (slides: LightboxSlide[]) => {
  store.set(lightboxSlidesAtom as any, slides);
};

const setLightboxIndex = (index: number) => {
  store.set(lightboxCurrentIndexAtom as any, index);
};

const clearLightboxData = () => {
  store.set(closeLightboxAtom as any);
};

const setFatalError = (error: Error | null) => {
  store.set(fatalErrorAtom as any, error);
};

export { patch, updateForm, resetForm, setLightboxData, setLightboxIndex, clearLightboxData, setFatalError, incrementDialogCount, decrementDialogCount };
export const fatalError = fatalErrorAtom;
export const descLang = descLangAtom;
export const isTaskDrawerOpen = isTaskDrawerOpenAtom;

export const useAppLang = () => useAtomValue(appLangAtom);
export const useDescLang = () => useAtomValue(descLangAtom);

// Tasks
import { tasksAtom, activeTaskCountAtom } from '#src/lib/task-queue/taskStore.js';
export { tasksAtom, activeTaskCountAtom };
