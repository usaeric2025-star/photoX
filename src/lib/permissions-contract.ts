import { redirect } from '@tanstack/react-router';
import { type } from 'arktype';
import { Capability } from '@/config/permissions';

/**
 * [V2.9-PERMISSION-CONTRACT] Permission Boundary Schema
 */
export const RoutePermissionSchema = type({
  "requireCapability?": "string",
  "requireAdmin?": "boolean",
  "requireAuth?": "boolean",
  "redirect?": "string",
});

export type RoutePermission = typeof RoutePermissionSchema.infer;

/**
 * Validates route access before load
 */
export function validateRouteAccess(permission: RoutePermission, context: any) {
  const { user, role, can } = context;
  const targetRedirect = permission.redirect || '/';

  // 1. Auth check
  if (permission.requireAuth && !user) {
    throw redirect({ to: targetRedirect });
  }

  // 2. Admin check
  if (permission.requireAdmin && role !== 'admin') {
    throw redirect({ to: targetRedirect });
  }

  // 3. Capability check
  if (permission.requireCapability && !can(permission.requireCapability as Capability)) {
    throw redirect({ to: targetRedirect });
  }
}
