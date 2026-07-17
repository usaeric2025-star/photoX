import { atom, PrimitiveAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { STORAGE_KEYS } from '#lib/storage.js';
import { ProductFormData } from '#src/types/index.js';
import { LightboxSlide } from '#lib/lightbox/types.js';

// --- Sidebar ---
export const isSidebarOpenAtom = atom<boolean>(false) as PrimitiveAtom<boolean>;

// --- Lightbox ---
export const lightboxSlidesAtom = atom<LightboxSlide[]>([]);
export const lightboxCurrentIndexAtom = atom<number>(0) as PrimitiveAtom<number>;
const lightboxOpenAtom = atom((get) => get(lightboxSlidesAtom).length > 0);
export const closeLightboxAtom = atom(null, (_get, set) => {
  set(lightboxSlidesAtom, []);
  set(lightboxCurrentIndexAtom, 0);
});

// --- Photo Picker ---
export const isPhotoPickerOpenAtom = atom<boolean>(false) as PrimitiveAtom<boolean>;
export const photoPickerGroupIdAtom = atom<string | null>(null) as PrimitiveAtom<string | null>;

// --- Dialogs ---
export const activeDialogCountAtom = atom<number>(0) as PrimitiveAtom<number>;
export const incrementDialogCountAtom = atom(null, (get, set) => {
  set(activeDialogCountAtom, get(activeDialogCountAtom) + 1);
});
export const decrementDialogCountAtom = atom(null, (get, set) => {
  set(activeDialogCountAtom, Math.max(0, get(activeDialogCountAtom) - 1));
});

// --- Auth UI ---
export const showPassPromptAtom = atom<boolean>(false) as PrimitiveAtom<boolean>;

// --- App UI ---
export const isInitialDataLoadingAtom = atom<boolean>(true) as PrimitiveAtom<boolean>;
export const showWhatsAppChoiceAtom = atom<boolean>(false) as PrimitiveAtom<boolean>;
export const uploadModeDialogOpenAtom = atom<boolean>(false) as PrimitiveAtom<boolean>;

// --- Error ---
export const fatalErrorAtom = atom<Error | null>(null) as PrimitiveAtom<Error | null>;

// --- Photo / Group ---
export const totalCountAtom = atom<number>(0) as PrimitiveAtom<number>;
export const focusedGroupPhotoIdAtom = atom<string | null>(null) as PrimitiveAtom<string | null>;
export const groupSettingsOpenAtom = atomWithStorage<boolean>(STORAGE_KEYS.GROUP_SETTINGS_OPEN, false) as unknown as PrimitiveAtom<boolean>;

// --- Upload ---
export const uploadAsGroupAtom = atomWithStorage<boolean>(STORAGE_KEYS.UPLOAD_AS_GROUP, false) as unknown as PrimitiveAtom<boolean>;
export const pendingPhotoIdAtom = atom<string | null>(null) as PrimitiveAtom<string | null>;
export const pendingFilesAtom = atom<FileList | File[] | null>(null) as PrimitiveAtom<FileList | File[] | null>;

// --- Tasks ---
export const isTaskDrawerOpenAtom = atom<boolean>(false) as PrimitiveAtom<boolean>;

// --- Selection ---
export const batchEditingIdsAtom = atom<string[] | null>(null) as PrimitiveAtom<string[] | null>;
export const isAvoidingSelectionAtom = atom<boolean>(false) as PrimitiveAtom<boolean>;

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
export const formStateAtom = atomWithStorage<ProductFormData>(STORAGE_KEYS.EDIT_FORM_CACHE, defaultForm) as unknown as PrimitiveAtom<ProductFormData>;
