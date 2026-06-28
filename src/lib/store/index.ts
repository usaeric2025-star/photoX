export { useSignal, useStore } from '@storve/react';

// UI 狀態 (Signals)
export { 
  isPhotoEditOpen, currentEditingPhoto, 
  appLangSignal, appLangSignal as appLang,
  isLightboxOpen, lightboxSlides, lightboxCurrentIndex,
  isSidebarOpen, 
  isTaskDrawerOpen, isTaskDrawerOpen as isTaskDrawerOpenSignal,
  gridColumns, gridColumns as gridColumnsSignal
} from '@/store/uiStore';

// Import for local usage and re-export
import { 
  uiStore, useUIStore, useAppLang
} from '@/store/uiStore';
import type { UIStoreState } from '@/store/uiStore';
import { authStore, useAuthStore, userSignal, authLoadingSignal } from '@/store/authStore';
import type { AuthState } from '@/store/authStore';
import { taskStore, useTaskStore, activeTaskCountSelector, tasksSignal } from '@/store/taskStore';
import type { TaskStoreState } from '@/store/taskStore';
import { appStore, appLoadingSignal, appErrorSignal } from '@/store/appStore';

// Re-exports
export { 
  uiStore, useUIStore, useUIStore as useUI,
  useAppLang,
  UIStoreState 
};
export { authStore, useAuthStore, useAuthStore as useAuth, userSignal, authLoadingSignal, AuthState };
export { 
  taskStore, useTaskStore, useTaskStore as useTask, 
  activeTaskCountSelector, tasksSignal, TaskStoreState, TaskStoreState as TaskState 
};
export { appStore, appLoadingSignal, appErrorSignal };

// Direct state getters (for non-React contexts)
export const storeAccessor = {
  get ui() { return uiStore.getState(); },
  get auth() { return authStore.getState(); },
  get task() { return taskStore.getState(); },
};

