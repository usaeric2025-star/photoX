import { User } from '#src/types/index.js';

/**
 * Capability identifiers for the PhotoX ecosystem.
 * Follows the pattern 'scope:action' or 'scope:sub-scope:action'.
 */
export type Capability =
  | 'photo:view-hidden'
  | 'photo:view-internal-info'
  | 'photo:edit'
  | 'photo:delete'
  | 'photo:batch-edit'
  | 'photo:ai-analyze'
  | 'photo:manage-groups'
  | 'photo:toggle-pinned'
  | 'category:manage'
  | 'tag:manage'
  | 'manufacturer:manage'
  | 'system:settings'
  | 'staff:workspace:access' // Access to the staff dashboard
  | 'admin:dashboard:access'; // Access to the full admin console

/**
 * Permission Map defining which capabilities are enabled for each mode.
 */
export const ROLE_PERMISSIONS: Record<string, Capability[]> = {
  admin: [
    'photo:view-hidden',
    'photo:view-internal-info',
    'photo:edit',
    'photo:delete',
    'photo:batch-edit',
    'photo:ai-analyze',
    'photo:manage-groups',
    'photo:toggle-pinned',
    'category:manage',
    'tag:manage',
    'manufacturer:manage',
    'system:settings',
    'staff:workspace:access',
    'admin:dashboard:access',
  ],
  staff: [
    'photo:view-hidden',
    'photo:view-internal-info',
    'photo:edit',
    'photo:delete',
    'photo:ai-analyze',
    'photo:manage-groups',
    'photo:toggle-pinned',
    'staff:workspace:access',
  ],
  public: [],
};

/**
 * Utility to determine mode from context
 */
export const getEffectiveRole = (user: User | null, isStaffMode: boolean): 'admin' | 'staff' | 'public' => {
  if (user) return 'admin';
  if (isStaffMode) return 'staff';
  return 'public';
};
