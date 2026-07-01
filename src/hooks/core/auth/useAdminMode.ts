import { useAppRouter } from '#lib/router';

/**
 * Unified hook to get the effective admin mode.
 * Respects both global isAdminMode and the current viewMode (private vs public preview).
 */
export function useAdminMode() {
  const { route } = useAppRouter();
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  return (typeof route?.name === 'string' && route?.name?.startsWith('admin')) || pathname.startsWith('/admin');
}
