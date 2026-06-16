import { Capability } from '@/config/permissions';
import { QueryClient } from '@tanstack/react-query';
import { User } from '@supabase/supabase-js';

export interface RouterContext {
  user: User | null;
  role: string;
  can: (cap: Capability) => boolean;
  queryClient?: QueryClient;
  availableActions: string[];
}

export interface GallerySearchParams {
  q?: string;
  category?: string;
  cat?: string;
  tag?: string | string[];
  manufacturer?: string;
  sort?: 'newest' | 'oldest' | 'name';
  view?: 'grid' | 'list';
  authError?: string;
  photoId?: string;
  groupId?: string;
  columns?: string;
  showGroupsCollapsed?: boolean;
  onlyUngrouped?: boolean;
  hidden?: boolean;
  status?: string;
  batch?: string;
  modal?: string;
}
