import { useLocation } from '@tanstack/react-router';

/**
 * Unified hook to get the effective admin mode.
 * Respects both global isAdminMode and the current viewMode (private vs public preview).
 */
export function useAdminMode() {
  const location = useLocation();
  return location.pathname.startsWith('/admin');
}
