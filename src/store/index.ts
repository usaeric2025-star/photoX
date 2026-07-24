import { atom, getDefaultStore } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { STORAGE_KEYS, jotaiStorage } from '#lib/storage.js';
import { ProductFormData, Category, Tag } from '#src/types/index.js';
import { LightboxSlide } from '#lib/lightbox/types.js';
import { queryClient } from '#lib/query/index.js';
import { queryKeys } from '#lib/query/keys.js';
import { logger } from '#lib/logger.js';
import { api } from '#lib/api.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { initAuthListener, initAuth, setAuthLoading } from './auth.js';

// --- Re-exports from Auth (Keeping Auth logic separate due to complexity) ---
export { 
  userAtom, 
  authLoadingAtom, 
  authInitializedAtom,
  tokenAtom, 
  initAuth, 
  initAuthListener, 
  signIn,
  staffLogin,
  signOut, 
  setAuthLoading 
} from './auth.js';

const store = getDefaultStore();

// ==========================================
// 1. App Level State (Theme, Language, Init)
// ==========================================

export const appLangAtom = atomWithStorage<'zh' | 'en' | 'ms'>(STORAGE_KEYS.LANG, 'en', jotaiStorage);
export const descLangAtom = atomWithStorage<'zh' | 'en' | 'ms'>(STORAGE_KEYS.DESC_LANG, 'zh', jotaiStorage);
export const appErrorAtom = atom(null as Error | null);

export const setAppError = (error: Error | null) => store.set(appErrorAtom, error);

export const initApp = async () => {
  setAuthLoading(true);

  // Initialize auth
  const cleanupAuth = initAuthListener();
  await initAuth();

  // Prefetch critical data
  try {
    // Invalidate existing cached categories and tags so we don't use stale empty arrays from IndexedDB
    queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });

    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: queryKeys.categories.all,
        queryFn: async () => {
          const res = await api.categories.$get();
          const data = await ErrorFactory.unwrap<Category[]>(res, 'Prefetch categories failed');
          return data.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        },
        staleTime: 0
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.tags.all,
        queryFn: async () => {
          const res = await api.tags.$get();
          return await ErrorFactory.unwrap<Tag[]>(res, 'Prefetch tags failed');
        },
        staleTime: 0
      })
    ]);
  } catch (err) {
    logger.warn('[App] Prefetch failed during init:', err);
  }

  setAuthLoading(false);
  return { cleanupAuth };
};

// ==========================================
// 2. UI Status State (Lightbox, Dialogs, Modes)
// ==========================================

// --- Sidebar ---
export const isSidebarOpenAtom = atom(false);

// --- Lightbox ---
export const lightboxSlidesAtom = atom([] as LightboxSlide[]);
export const lightboxCurrentIndexAtom = atom(0);
export const lightboxOpenAtom = atom((get) => get(lightboxSlidesAtom).length > 0);
export const lightboxShowInfoAtom = atom(false);
export const lightboxShowControlsAtom = atom(true);

/**
 * Action: Open Lightbox
 * 一键设置幻灯片数据并开启灯箱
 */
export const openLightboxAtom = atom(
  null,
  (_get, set, { slides, index = 0 }: { slides: LightboxSlide[], index?: number }) => {
    set(lightboxSlidesAtom, slides);
    set(lightboxCurrentIndexAtom, index);
    set(lightboxShowInfoAtom, false);
    set(lightboxShowControlsAtom, true);
  }
);

export const closeLightboxAtom = atom(null, (_get, set) => {
  set(lightboxSlidesAtom, []);
  set(lightboxCurrentIndexAtom, 0);
  set(lightboxShowInfoAtom, false);
  set(lightboxShowControlsAtom, true);
});

// --- Photo Picker ---
// ... (keep existing)
export const isPhotoPickerOpenAtom = atom(false);
export const photoPickerGroupIdAtom = atom(null as string | null);

// --- Dialogs ---
// ... (keep existing)
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

// --- Photo / Group Stats ---
export const totalCountAtom = atom(0);
export const focusedGroupPhotoIdAtom = atom(null as string | null);
export const groupSettingsOpenAtom = atomWithStorage(STORAGE_KEYS.GROUP_SETTINGS_OPEN, false, jotaiStorage);

// --- Upload ---
export const uploadAsGroupAtom = atomWithStorage(STORAGE_KEYS.UPLOAD_AS_GROUP, false, jotaiStorage);
export const pendingPhotoIdAtom = atom(null as string | null);
export const pendingFilesAtom = atom(null as FileList | File[] | null);

// --- Tasks ---
export const isTaskDrawerOpenAtom = atom(false);

// --- Form Cache ---
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

// ==========================================
// 3. Selection Mode State (High Performance)
// ==========================================

// 核心 Selection 原子 (内存状态)
export const selectedIdsSetAtom = atom<Set<string>>(new Set<string>());

// 派生：已选数量
export const selectedCountAtom = atom((get) => get(selectedIdsSetAtom).size);

// 派生：是否处于选择模式
export const isSelectingAtom = atom((get) => get(selectedIdsSetAtom).size > 0);

// 派生：只读的已选 IDs 数组
export const selectedIdsAtom = atom(
  (get) => Array.from(get(selectedIdsSetAtom)),
  (_get, set, newIds: string[]) => {
    set(selectedIdsSetAtom, new Set(newIds));
  }
);

/**
 * Action: Toggle Selection
 * 切换某个 ID 的选中状态
 */
export const toggleSelectionAtom = atom(
  null,
  (get, set, id: string) => {
    const current = new Set(get(selectedIdsSetAtom));
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    set(selectedIdsSetAtom, current);
  }
);

/**
 * Action: Clear Selection
 * 清空所有选中项，并根据需要重置退出锁
 */
export const clearSelectionAtom = atom(
  null,
  (_get, set) => {
    set(selectedIdsSetAtom, new Set());
    set(isExitingSelectionAtom, false);
  }
);

// 退出锁 (Exit Lock) - 防止关闭选择栏时点击穿透下层卡片
export const isExitingSelectionAtom = atom<boolean>(false);
export const isAvoidingSelectionAtom = atom(false);

