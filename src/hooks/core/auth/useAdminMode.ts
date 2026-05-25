import { usePermission } from '@/hooks/core/auth/usePermission';
import { useGalleryStore, useShallow } from '@/store';

/**
 * Unified hook to get the effective admin mode.
 * Respects both global isAdminMode and the current viewMode (private vs public preview).
 */
export function useAdminMode() {
  const { isAdmin } = usePermission();
  const { isStaffMode } = useGalleryStore(useShallow(s => ({
    isStaffMode: s.isStaffMode
  })));
  
  // Effective admin mode: Must be logged in as admin OR in staff mode
  return (isAdmin || isStaffMode);
}
