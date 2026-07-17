import React from 'react';
import { usePermission } from '#src/hooks/index.js';
import { Capability } from '#src/config/permissions.js';

interface RequirePermissionProps {
  permission: Capability;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}
export function RequirePermission({ permission, children, fallback = null }: RequirePermissionProps) {
  const { can } = usePermission();
  if (!can(permission)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
