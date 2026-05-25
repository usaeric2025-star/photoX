import { useMemo, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useGalleryStore } from '@/store';
import { ROLE_PERMISSIONS, getEffectiveRole, Capability } from '@/config/permissions';

/**
 * Unified permission and capability checking hook.
 * Migrated to atomized capabilities (can('scope:action')) for PhotoX v2.0.
 */
export function usePermission() {
  const { user } = useAuth();
  const isStaffMode = useGalleryStore(s => s.isStaffMode);
  
  const role = useMemo(() => getEffectiveRole(user, isStaffMode), [user, isStaffMode]);
  const permissions = useMemo(() => ROLE_PERMISSIONS[role] || [], [role]);

  /**
   * Check if the current context has a specific capability.
   */
  const can = useCallback((capability: Capability): boolean => {
    return permissions.includes(capability);
  }, [permissions]);

  return useMemo(() => ({
    role,
    can,
    // Legacy flags for backward compatibility during migration
    isAdmin: role === 'admin',
    isStaff: role === 'staff' || role === 'admin',
    canEdit: permissions.includes('photo:edit'),
    canDelete: permissions.includes('photo:delete'),
    canBatchEdit: permissions.includes('photo:batch-edit'),
    canManageSystem: permissions.includes('system:settings'),
    userId: user?.id
  }), [role, permissions, can, user?.id]);
}
