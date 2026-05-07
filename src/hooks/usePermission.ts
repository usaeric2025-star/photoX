
import { useAdminSession } from '../context/AdminContexts';

/**
 * Unified permission and role checking hook.
 */
export function usePermission() {
  const { user, isAdminMode, isStaffMode } = useAdminSession();

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
