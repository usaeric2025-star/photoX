import { useAdminMode } from './auth/useAdminMode.js';

/**
 * useIsManagement
 * Returns true if the current route is within the /admin path.
 * Consolidates window.location or checks.
 */
export function useIsManagement() {
  return useAdminMode();
}
