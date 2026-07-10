import { useAuth, useUI } from '#lib/store/index.js';
import { ROLE_PERMISSIONS, getEffectiveRole, Capability } from '#src/config/permissions.js';
import { useSettings } from '../../settings/useSettings.js';
import { useLocalStorage } from '#src/hooks/core/index.js';

/**
 * Unified permission and capability checking hook.
 * Migrated to atomized capabilities (can('scope:action')) for PhotoX v2.0.
 */
export function usePermission() {
  const user = useAuth(s => s.user);
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
    userId: user?.id
  };
}
