import { useRouterSafe } from '@/hooks/core/useRouterSafe';

/**
 * Unified hook to get the effective admin mode.
 * Respects both global isAdminMode and the current viewMode (private vs public preview).
 */
export function useAdminMode() {
  const location = useRouterSafe().location;
  return location.pathname.startsWith('/admin');
}
