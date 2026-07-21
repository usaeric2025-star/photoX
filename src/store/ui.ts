import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { STORAGE_KEYS, jotaiStorage } from '#lib/storage.js';
import { ProductFormData } from '#src/types/index.js';
import { LightboxSlide } from '#lib/lightbox/types.js';

// --- Sidebar ---
export const isSidebarOpenAtom = atom(false);

// --- Lightbox ---
export const lightboxSlidesAtom = atom([] as LightboxSlide[]);
export const lightboxCurrentIndexAtom = atom(0);
export const lightboxOpenAtom = atom((get) => get(lightboxSlidesAtom).length > 0);
export const closeLightboxAtom = atom(null, (_get, set) => {
  set(lightboxSlidesAtom, []);
  set(lightboxCurrentIndexAtom, 0);
});

// --- Photo Picker ---
export const isPhotoPickerOpenAtom = atom(false);
export const photoPickerGroupIdAtom = atom(null as string | null);

// --- Dialogs ---
export const activeDialogCountAtom = atom(0);
export const incrementDialogCountAtom = atom(null, (get, set) => {
  set(activeDialogCountAtom, get(activeDialogCountAtom) + 1);
});
export const decrementDialogCountAtom = atom(null, (get, set) => {
  set(activeDialogCountAtom, Math.max(0, get(activeDialogCountAtom) - 1));
});

// --- Auth UI ---
export const showPassPromptAtom = atom(false);

// --- App UI ---
export const isInitialDataLoadingAtom = atom(true);
export const showWhatsAppChoiceAtom = atom(false);
export const uploadModeDialogOpenAtom = atom(false);

// --- Error ---
export const fatalErrorAtom = atom(null as Error | null);

// --- Photo / Group ---
export const totalCountAtom = atom(0);
export const focusedGroupPhotoIdAtom = atom(null as string | null);
export const groupSettingsOpenAtom = atomWithStorage(STORAGE_KEYS.GROUP_SETTINGS_OPEN, false, jotaiStorage);

// --- Upload ---
export const uploadAsGroupAtom = atomWithStorage(STORAGE_KEYS.UPLOAD_AS_GROUP, false, jotaiStorage);
export const pendingPhotoIdAtom = atom(null as string | null);
export const pendingFilesAtom = atom(null as FileList | File[] | null);

// --- Tasks ---
export const isTaskDrawerOpenAtom = atom(false);

// --- Selection UI Status ---
export const isAvoidingSelectionAtom = atom(false);

// --- Form ---
export const defaultForm: ProductFormData = {
  name: '',
  description: { zh: '', en: '', ms: '' },
  categoryId: '',
  manufacturerId: '',
  tags: [],
  itemCode: '',
  modelNumber: '',
  manualCode: '',
  isHidden: false,
  dimensions: [],
  price: '',
  isGroupCover: false
};
export const formStateAtom = atomWithStorage<ProductFormData>(STORAGE_KEYS.EDIT_FORM_CACHE, defaultForm, jotaiStorage);
