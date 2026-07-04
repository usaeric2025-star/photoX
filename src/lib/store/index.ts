export { useSignal, useStore } from '@storve/react';

// UI 狀態 (Signals)
export { 
   appLangSignal as appLang,
  lightboxSlides, lightboxCurrentIndex,
   
  isTaskDrawerOpen, isTaskDrawerOpen as isTaskDrawerOpenSignal,
} from '#src/store/uiStore.js';

// Import for local usage and re-export
import { 
  uiStore, useUIStore, useAppLang, useDescLang
} from '#src/store/uiStore.js';
import type { UIStoreState } from '#src/store/uiStore.js';
import { authStore, useAuthStore, userSignal, authLoadingSignal } from '#src/store/authStore.js';
import type { AuthState } from '#src/store/authStore.js';
import { tasksSignal, activeTaskCountSignal, globalTaskStatusSignal, globalTaskProgressSignal } from '#src/services/task/taskService.js';
import { appStore, appLoadingSignal, appErrorSignal } from '#src/store/appStore.js';

// Re-exports
export { 
  uiStore,  useUIStore as useUI,
  useAppLang, useDescLang,
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

