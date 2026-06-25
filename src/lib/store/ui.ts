import { signal } from '@storve/core/signals';
import { uiStore } from '@/store/uiStore';
import type { UIStoreState } from '@/store/uiStore';

// ============ UI 狀態 Signal (Derived from uiStore) ============

export const appLang = signal<UIStoreState, 'appLang'>(uiStore, 'appLang');

// Sync language to DOM
if (typeof document !== 'undefined') {
  const syncLang = (lang: string) => {
    document.documentElement.dataset.lang = lang;
  };
  appLang.subscribe(syncLang);
  syncLang(appLang.get());
}
export const batchEditingIds = signal<UIStoreState, 'batchEditingIds'>(uiStore, 'batchEditingIds');
export const formState = signal<UIStoreState, 'formState'>(uiStore, 'formState');

// 燈箱狀態
export const isLightboxOpen = signal<UIStoreState, 'lightboxIsOpen'>(uiStore, 'lightboxIsOpen');
export const lightboxSlides = signal<UIStoreState, 'lightboxSlides'>(uiStore, 'lightboxSlides');
export const lightboxCurrentIndex = signal<UIStoreState, 'lightboxCurrentIndex'>(uiStore, 'lightboxCurrentIndex');

// 搜尋與選取
export const searchTerm = signal<UIStoreState, any>(uiStore, 'filters.q' as any);
export const searchCategory = signal<UIStoreState, any>(uiStore, 'filters.category' as any);
export const searchTags = signal<UIStoreState, any>(uiStore, 'filters.tags' as any);
export const selectedIds = signal<UIStoreState, 'selectedIds'>(uiStore, 'selectedIds');
export const isMultiSelect = signal<UIStoreState, 'isMultiSelect'>(uiStore, 'isMultiSelect');
export const processingIds = signal<UIStoreState, 'processingIds'>(uiStore, 'processingIds');

// UI 狀態開關
export const isSidebarOpen = signal<UIStoreState, 'isSidebarOpen'>(uiStore, 'isSidebarOpen');
export const isTaskDrawerOpen = signal<UIStoreState, 'isTaskDrawerOpen'>(uiStore, 'isTaskDrawerOpen');
export const isDiagnosticsOpen = signal<UIStoreState, 'isDiagnosticsOpen'>(uiStore, 'isDiagnosticsOpen');
export const showWhatsAppChoice = signal<UIStoreState, 'showWhatsAppChoice'>(uiStore, 'showWhatsAppChoice');

// Actions
export const updateFormState = (updates: any) => {
  (uiStore as any).updateForm(updates);
};

