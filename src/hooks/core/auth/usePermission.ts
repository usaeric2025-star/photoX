import { useAuth } from './useAuth';
import { useUIStore, useShallow } from '@/store/useUIStore';
import { ROLE_PERMISSIONS, getEffectiveRole, Capability } from '@/config/permissions';
import { useSettings } from '../../settings';
import { useLocalStorage } from '@/hooks/core/useLocalStorage';

/**
 * Unified permission and capability checking hook.
 * Migrated to atomized capabilities (can('scope:action')) for PhotoX v2.0.
 */
export function usePermission() {
  const { user } = useAuth();
  const { settings } = useSettings();
  
  const [passcode] = useLocalStorage({
    key: 'ais_mock_auth_passcode',
    defaultValue: '',
  });

  const isStaffMode = passcode === settings?.access_passcode && !!settings?.access_passcode;
    
  const role = getEffectiveRole(user || null, isStaffMode);
  const permissions = ROLE_PERMISSIONS[role] || [];

  /**
   * Check if the current context has a specific capability.
   */
  const can = (capability: Capability): boolean => {
    return permissions.includes(capability);
  };

  return {
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
  };
}
