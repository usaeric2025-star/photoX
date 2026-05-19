import { usePermission } from '../hooks/usePermission';
import { useGalleryStore } from '../store';

/**
 * Unified hook to get the effective admin mode.
 * Respects both global isAdminMode and the current viewMode (private vs public preview).
 */
export function useAdminMode() {
  const { isAdmin } = usePermission();
  const { viewMode } = useGalleryStore();
  
  // Effective admin mode: Must be in admin mode AND NOT in visitor preview mode
  return isAdmin && viewMode === 'private';
}
