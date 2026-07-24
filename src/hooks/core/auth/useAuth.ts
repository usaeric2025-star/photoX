import React, { createContext, useContext } from 'react';
import { useAppLocation } from '#src/hooks/core/index.js';
import { useAtomValue } from 'jotai';
import { userAtom, authLoadingAtom } from '#src/store/index.js';
import { ROLE_PERMISSIONS, getEffectiveRole, Capability } from '#src/config/permissions.js';

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
  const [location] = useAppLocation();
    
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
  const role = getEffectiveRole(user || null);
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

/**
 * useAdminAccess
 * Unified hook for components checking for administrative dashboard/edit capabilities.
 */
export function useAdminAccess() {
  const user = useAtomValue(userAtom);
  const isLoading = useAtomValue(authLoadingAtom);
  const { can } = usePermission();

  return {
    isLoading,
    isAdmin: can('admin:dashboard:access'),
    user,
  };
}
