import { useAuth, useUI } from '#lib/store/index.js';
import { ROLE_PERMISSIONS, getEffectiveRole, Capability } from '#src/config/permissions.js';
import { useSettings } from '#src/hooks/settings/index.js';
import { useLocalStorage } from '#src/hooks/core/useLocalStorage.js';

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
    deserialize: (val) => {
      try {
        const parsed = JSON.parse(val);
        return String(parsed);
      } catch {
        return val;
      }
    }
  });

  const isStaffMode = String(passcode) === settings?.accessPasscode && !!settings?.accessPasscode;
    
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
