
import { useGalleryStore } from '../store';
import { useAuth } from './useAuth';

/**
 * Unified permission and role checking hook.
 */
export function usePermission() {
  const { user } = useAuth();
  const { isAdminMode, isStaffMode } = useGalleryStore();

  const isAdmin = !!user && isAdminMode;
  const isStaff = !!user && (isAdminMode || isStaffMode);
  
  // Basic policies
  const canEdit = isAdmin;
  const canDelete = isAdmin;
  const canBatchEdit = isAdmin;
  const canManageSystem = isAdmin;

  return {
    isAdmin,
    isStaff,
    canEdit,
    canDelete,
    canBatchEdit,
    canManageSystem,
    userId: user?.id
  };
}
