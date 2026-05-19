import { useAuth } from './useAuth';

/**
 * Unified permission and role checking hook.
 */
export function usePermission() {
  const { user } = useAuth();
  // Authenticated users are admins.
  const isAdmin = !!user;
  const isStaff = !!user; // Assuming logged in users can view private gallery/photos

  
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
