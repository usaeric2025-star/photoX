export { useSignal, useStore } from '@storve/react';

// UI 狀態 (Signals)
export * from './ui';

// Import for local usage and re-export
import { 
  uiStore, useUIStore, searchTermSignal, selectedCountSelector, selectedSetSelector, 
  isAnySelectedSelector, hasActiveFiltersSelector, batchModeSignal, selectedIdsSignal, 
  useAppLang, isTaskDrawerOpenSignal, isDiagnosticsOpenSignal, isSidebarOpenSignal 
} from '@/store/uiStore';
import type { UIStoreState } from '@/store/uiStore';
import { authStore, useAuthStore, useAuthSelector, userSignal, authLoadingSignal } from '@/store/authStore';
import type { AuthState } from '@/store/authStore';
import { taskStore, useTaskStore, useTaskSelector, activeTaskCountSelector, tasksSignal } from '@/store/taskStore';
import type { TaskStoreState } from '@/store/taskStore';
import { appStore, appLoadingSignal, appErrorSignal } from '@/store/appStore';

// Re-exports
export { 
  uiStore, useUIStore, useUIStore as useUI, searchTermSignal, selectedCountSelector, 
  selectedSetSelector, isAnySelectedSelector, hasActiveFiltersSelector, 
  batchModeSignal, selectedIdsSignal, useAppLang,
  isTaskDrawerOpenSignal, isDiagnosticsOpenSignal, isSidebarOpenSignal,
  UIStoreState 
};
export { authStore, useAuthStore, useAuthStore as useAuth, useAuthSelector, userSignal, authLoadingSignal, AuthState };
export { 
  taskStore, useTaskStore, useTaskStore as useTask, useTaskSelector, 
  activeTaskCountSelector, tasksSignal, TaskStoreState, TaskStoreState as TaskState 
};
export { appStore, appLoadingSignal, appErrorSignal };

// Direct state getters (for non-React contexts)
export const storeAccessor = {
  get ui() { return (uiStore as any).state as UIStoreState; },
  get auth() { return (authStore as any).state as AuthState; },
  get task() { return (taskStore as any).state as TaskStoreState; },
};

