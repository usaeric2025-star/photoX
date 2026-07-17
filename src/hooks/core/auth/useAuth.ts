import React, { createContext, useContext } from 'react';
import { useNormalizedLocation } from '#src/hooks/core/index.js';
import { useAtomValue } from 'jotai';
import { userAtom, passcodeAtom } from '#src/store/atoms/auth/authAtoms.js';
import { ROLE_PERMISSIONS, getEffectiveRole, Capability } from '#src/config/permissions.js';
import { useSettings } from '../../settings/useSettings.js';

/**
 * AdminMode Context & Provider
 */
const AdminModeContext = createContext<boolean>(false);

export function AdminModeProvider({ children, value }: { children: React.ReactNode, value: boolean }) {
  return React.createElement(AdminModeContext.Provider, { value }, children);
}

/**
 * useAdminMode
 * Resolves whether the current component tree is rendered within the Admin Panel.
 */
export function useAdminMode(): boolean {
  const context = useContext(AdminModeContext);
  const [location] = useNormalizedLocation();
    
  if (!context) {
    return location.startsWith('/admin') || location.startsWith('/settings') || location.startsWith('/diagnostics');
  }
  return context;
}

/**
 * usePermission
 * Unified permission and capability checking hook.
 */
export function usePermission() {
  const user = useAtomValue(userAtom);
  const { settings } = useSettings();
    
  let passcode = useAtomValue(passcodeAtom);
  try {
    if (typeof passcode === 'string' && passcode.startsWith('"')) {
      passcode = JSON.parse(passcode);
    }
  } catch (e) {}

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
