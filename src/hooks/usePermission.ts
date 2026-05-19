import { useAuth } from './useAuth';

/**
 * Unified permission and role checking hook.
 */
export function usePermission() {
  const { user } = useAuth();

  // Define admin emails. This is a simple, effective way to define admin role without store coupling.
  const ADMIN_EMAILS = ['leehuanrui@gmail.com']; 
  const isAdmin = !!user && ADMIN_EMAILS.includes(user.email || '');
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
