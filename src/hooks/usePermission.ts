import { useMemo } from 'react';
import { useAuth } from './useAuth';

/**
 * Unified permission and role checking hook.
 */
export function usePermission() {
  const { user } = useAuth();
  
  return useMemo(() => {
    // Authenticated users are admins.
    const isAdmin = !!user;
    const isStaff = !!user; // Assuming logged in users can view private gallery/photos

    return {
      isAdmin,
      isStaff,
      canEdit: isAdmin,
      canDelete: isAdmin,
      canBatchEdit: isAdmin,
      canManageSystem: isAdmin,
      userId: user?.id
    };
  }, [user]);
}
