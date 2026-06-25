import { useAppRouter } from '@/lib/router';

/**
 * Unified hook to get the effective admin mode.
 * Respects both global isAdminMode and the current viewMode (private vs public preview).
 */
export function useAdminMode() {
  const { route } = useAppRouter();
  return typeof route?.name === 'string' && route?.name?.startsWith('admin');
}
