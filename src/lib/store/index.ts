import { useComputed, type Signal } from '@preact/signals-react';
import { 
  uiState, 
  type UIStoreState,
  appLang, descLang, groupSettingsOpen, uploadAsGroup, formState, showPassPrompt, 
  isPhotoPickerOpen, photoPickerGroupId, isInitialDataLoading, focusedGroupPhotoId, 
  showWhatsAppChoice, uploadModeDialogOpen, isTaskDrawerOpen, isSidebarOpen, 
  pendingPhotoId, pendingFiles, activeDialogCount, fatalError, totalCount,
  lightboxSlides, lightboxCurrentIndex,
  updateForm, resetForm, incrementDialogCount, decrementDialogCount, setLightboxData, setLightboxIndex, clearLightboxData, patch, setFatalError
} from '#src/store/uiStore.js';

// UI 狀態 (Signals)
export {
  appLang, descLang, groupSettingsOpen, uploadAsGroup, formState, showPassPrompt, 
  isPhotoPickerOpen, photoPickerGroupId, isInitialDataLoading, focusedGroupPhotoId, 
  showWhatsAppChoice, uploadModeDialogOpen, isTaskDrawerOpen, isSidebarOpen, 
  pendingPhotoId, pendingFiles, activeDialogCount, fatalError, totalCount,
  lightboxSlides, lightboxCurrentIndex
};

// UI Actions
export { updateForm, resetForm, incrementDialogCount, decrementDialogCount, setLightboxData, setLightboxIndex, clearLightboxData, patch, setFatalError };

// Export uiStore shim
export const uiStore = { getState: () => uiState.value };

// Export Signals hooks for compatibility
export function useSignal<T>(sig: Signal<T>): T {
  return useComputed(() => sig.value).value;
}

// Compatibility shim for useStore/useUI/useAppLang/useDescLang
export function useStore<S, T = S>(store: { getState: () => S }, selector?: (state: S) => T): T {
    return useComputed(() => {
      const state = store.getState();
      return selector ? selector(state) : (state as unknown as T);
    }).value as T;
}
export function useAppLang() { return appLang.value; }
export function useDescLang() { return descLang.value; }

// Compatibility shim for signals
export const isTaskDrawerOpenSignal = isTaskDrawerOpen;

export type { UIStoreState };

// Compatible useUI hook
export function useUI<T = UIStoreState>(selector?: (state: UIStoreState) => T): T {
  return useComputed(() => selector ? selector(uiState.value) : (uiState.value as unknown as T)).value;
}

// Auth and other stores
import { authStore, useAuthStore } from '#src/store/authStore.js';
import { tasksSignal, activeTaskCountSignal } from '#src/services/task/taskService.js';

// Re-exports
export {
  useAuthStore as useAuth,
};
export {
  tasksSignal, activeTaskCountSignal,
};

// Direct state getters
export const storeAccessor = {
  get ui() { return uiState.value; },
  get auth() { return authStore.getState(); },
  get task() { return { tasks: tasksSignal.value, status: 'idle', progress: 0 }; },
  // Compatibility shim for patch
  patch: (fn: (s: UIStoreState) => Partial<UIStoreState>) => {
    console.warn('Patch is deprecated, please use direct signal updates');
  }
};


