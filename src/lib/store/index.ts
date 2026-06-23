import { uiStore, useUIStore as useUI, type UIStoreState, type UIStoreInstance } from '@/store/uiStore';
import { authStore, useAuthStore as useAuth, type AuthState, type AuthStoreInstance } from '@/store/authStore';
import { taskStore, useTaskStore as useTask, useTaskSelector, type TaskStoreInstance } from '@/store/taskStore';
import { useAppLang } from '@/store/uiStore';

/**
 * 统一的 Store Adapter
 * 职责：隐藏底层状态管理工具的实现细节，提供业务层一致的 API。
 */
export { useUIStore as useUI, useUISelector } from '@/store/uiStore';
export { useAppLang } from '@/store/uiStore';
export { useAuthStore as useAuth, useAuthSelector } from '@/store/authStore';
export { useTaskStore as useTask, useTaskSelector } from '@/store/taskStore';

/**
 * Storve handles fine-grained updates via selectors. 
 * We re-export selectors to maintain a consistent API across components.
 */


// State types
export type { UIStoreState } from '@/store/uiStore';
export type { AuthState } from '@/store/authStore';
export type { TaskStoreState as TaskState } from '@/store/taskStore';

// Direct state getters (for non-React contexts)
export const storeAccessor = {
  get ui() { return uiStore.getState(); },
  get auth() { return authStore.getState(); },
  get task() { return taskStore.getState(); },
};
