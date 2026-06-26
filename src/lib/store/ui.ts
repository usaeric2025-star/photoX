import { signal } from '@storve/core/signals';
import { uiStore } from '@/store/uiStore';
import type { UIStoreState } from '@/store/uiStore';
import type { Photo } from '@/types/photo';

// ============ UI 狀態 Signal (Derived from uiStore) ============
export const isPhotoEditOpen = signal<UIStoreState, 'isPhotoEditOpen'>(uiStore, 'isPhotoEditOpen');
export const currentEditingPhoto = signal<UIStoreState, 'currentEditingPhoto'>(uiStore, 'currentEditingPhoto');
export const appLang = signal<UIStoreState, 'appLang'>(uiStore, 'appLang');

// Sync language to DOM
if (typeof document !== 'undefined') {
  const syncLang = (lang: string) => {
    document.documentElement.dataset.lang = lang;
  };
  appLang.subscribe(syncLang);
  syncLang(appLang.get());
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
export const isDiagnosticsOpen = signal<UIStoreState, 'isDiagnosticsOpen'>(uiStore, 'isDiagnosticsOpen');


