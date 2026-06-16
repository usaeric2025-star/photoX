import { Capability } from '@/config/permissions';
import { QueryClient } from '@tanstack/react-query';

export interface RouterContext {
  user: any;
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
