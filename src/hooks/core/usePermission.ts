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

    return {
      isAdmin,
      isStaff,
      canEdit: isStaff,
      canDelete: isStaff,
      canBatchEdit: isStaff,
      canManageSystem: isStaff,
      userId: user?.id
    };
  }, [user, isStaffMode]);
}
