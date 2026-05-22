import { usePermission } from '../hooks/usePermission';
import { useGalleryStore } from '../store';

/**
 * Unified hook to get the effective admin mode.
 * Respects both global isAdminMode and the current viewMode (private vs public preview).
 */
export function useAdminMode() {
  const { isAdmin } = usePermission();
  const { adminPreviewMode, isStaffMode } = useGalleryStore();
  
  // Effective admin mode: (Must be logged in as admin OR in staff mode) AND NOT in visitor preview mode
  return (isAdmin || isStaffMode) && adminPreviewMode === 'private';
}
