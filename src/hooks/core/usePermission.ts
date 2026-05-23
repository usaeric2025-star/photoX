import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { useGalleryStore } from '../../store';

/**
 * Unified permission and role checking hook.
 */
export function usePermission() {
  const { user } = useAuth();
  const isStaffMode = useGalleryStore(s => s.isStaffMode);
  
  return useMemo(() => {
    // Authenticated users are admins.
    const isAdmin = !!user;
    
    // Staff mode unlocked or logged in admin is staff
    const isStaff = isStaffMode || isAdmin;

    // Staff mode with no logged in user is read-only staff
    const isReadOnlyStaff = isStaffMode && !user;

    return {
      isAdmin,
      isStaff,
      canEdit: isAdmin && !isReadOnlyStaff,
      canDelete: isAdmin && !isReadOnlyStaff,
      canBatchEdit: isAdmin && !isReadOnlyStaff,
      canManageSystem: isAdmin && !isReadOnlyStaff,
      userId: user?.id
    };
  }, [user, isStaffMode]);
}
