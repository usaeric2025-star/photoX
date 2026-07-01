export { useSignal, useStore } from '@storve/react';

// UI 狀態 (Signals)
export { 
  currentEditingPhoto, 
   appLangSignal as appLang,
  lightboxSlides, lightboxCurrentIndex,
   
  isTaskDrawerOpen, isTaskDrawerOpen as isTaskDrawerOpenSignal,
  gridColumns, 
} from '#src/store/uiStore';

// Import for local usage and re-export
import { 
  uiStore, useUIStore, useAppLang
} from '#src/store/uiStore';
import type { UIStoreState } from '#src/store/uiStore';
import { authStore, useAuthStore, userSignal, authLoadingSignal } from '#src/store/authStore';
import type { AuthState } from '#src/store/authStore';
import { tasksSignal, activeTaskCountSignal, globalTaskStatusSignal, globalTaskProgressSignal } from '#src/services/task/taskService';
import { appStore, appLoadingSignal, appErrorSignal } from '#src/store/appStore';

// Re-exports
export { 
  uiStore,  useUIStore as useUI,
  useAppLang,
  UIStoreState 
};
export {   useAuthStore as useAuth,    };
export { 
  tasksSignal, activeTaskCountSignal,   
};
;

// Direct state getters (for non-React contexts)
export const storeAccessor = {
  get ui() { return uiStore.getState(); },
  get auth() { return authStore.getState(); },
  get task() { return { tasks: tasksSignal.get(), status: globalTaskStatusSignal.get(), progress: globalTaskProgressSignal.get() }; },
};

