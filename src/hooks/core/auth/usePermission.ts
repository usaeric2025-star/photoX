import { useMemo, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useUIStore, useShallow } from '@/store/useUIStore';
import { ROLE_PERMISSIONS, getEffectiveRole, Capability } from '@/config/permissions';
import { useSettings } from '../infra/useSettings';

/**
 * Unified permission and capability checking hook.
 * Migrated to atomized capabilities (can('scope:action')) for PhotoX v2.0.
 */
export function usePermission() {
  const { user } = useAuth();
  const { settings } = useSettings();
  
  const isStaffMode = typeof window !== 'undefined' && 
    window.localStorage.getItem('ais_mock_auth_passcode') === settings?.access_passcode && 
    !!settings?.access_passcode;
    
  const role = useMemo(() => getEffectiveRole(user || null, isStaffMode), [user, isStaffMode]);
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
