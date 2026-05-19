import { useAuth } from './useAuth';

/**
 * Unified permission and role checking hook.
 */
export function usePermission() {
  const { user } = useAuth();
  console.log('DEBUG: user', user);

  // Define admin emails. This is a simple, effective way to define admin role without store coupling.
  const ADMIN_EMAILS = ['leehuanrui@gmail.com']; 
  const email = (user as any)?.email || (user as any)?.user_metadata?.email;
  const isAdmin = !!user && ADMIN_EMAILS.includes(email || '');
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
