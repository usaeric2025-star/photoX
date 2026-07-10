import { User } from '#src/types/index.js';

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
  | 'group:view'
  | 'group:manage'
  | 'staff:workspace:access' 
  | 'admin:dashboard:access'; 

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
    'group:view',
    'group:manage',
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
    'group:view',
    'staff:workspace:access',
  ],
  public: [
    'group:view',
  ],
};

export const getEffectiveRole = (user: User | null, isStaffMode: boolean): 'admin' | 'staff' | 'public' => {
  if (user) return 'admin';
  if (isStaffMode) return 'staff';
  return 'public';
};
