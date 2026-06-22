import { useUIStore as _useUIStore, type UIStoreState } from '@/store/useUIStore';
import { useAuthStore as _useAuthStore, type AuthState } from '@/store/useAuthStore';
import { useTaskStore as _useTaskStore, type TaskStoreState } from '@/lib/task-queue/store';
import { useShallow } from 'zustand/react/shallow';

/**
 * 統一的 Store Adapter
 * 職責：隱藏底層狀態管理工具的實作細節，提供業務層一致的 API。
 */
export { useUIStore as useUI } from '@/store/useUIStore';
export { useAuthStore as useAuth } from '@/store/useAuthStore';
export { useTaskStore as useTask, useTaskSelector } from '@/lib/task-queue/store';
export { useShallow as useStoreShallow } from 'zustand/react/shallow';

// State types
export type { UIStoreState } from '@/store/useUIStore';
export type { AuthState } from '@/store/useAuthStore';
export type { TaskStoreState } from '@/lib/task-queue/store';

// Direct state getters (for non-React contexts)
export const storeAccessor = {
  get ui() { return _useUIStore.getState(); },
  get auth() { return _useAuthStore.getState(); },
  get task() { return _useTaskStore.getState(); }
};

