import { usePermission } from '@/hooks/core/auth/usePermission';
import { useUIStore, useShallow } from '@/store/useUIStore';

/**
 * Unified hook to get the effective admin mode.
 * Respects both global isAdminMode and the current viewMode (private vs public preview).
 */
export function useAdminMode() {
  const { isAdmin } = usePermission();
  
  // Effective admin mode: Must be logged in as admin
  return isAdmin;
}
