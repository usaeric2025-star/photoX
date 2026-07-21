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
    'admin:dashboard:access',
  ],
  public: [
    'group:view',
  ],
};

export const getEffectiveRole = (user: User | null): 'admin' | 'public' => {
  if (user) return 'admin';
  return 'public';
};
