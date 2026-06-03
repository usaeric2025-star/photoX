import { 
  createRootRouteWithContext, 
  createRoute, 
  createRouter,
  Outlet,
  redirect
} from '@tanstack/react-router';
import { ROUTES } from './config/constants';
import { lazy, Suspense } from 'react';
import { PageSkeleton } from './components/PageSkeleton';
import { globalHandleError } from './lib/error/errorHandler';
import { Capability } from './config/permissions';
import { validateRouteAccess } from './lib/permissions-contract';
import { validateAccess, RouteAccessContract } from './shared/permissionsSchema';
import { QueryClient } from '@tanstack/react-query';
import { photoKeys, groupKeys } from '@/lib/queryKeys';
import { createStaleTime } from '@/shared/freshnessSchema';
import { getGroupById } from '@/services/group/queries';
import { AdminAuthGuard } from '@/components/AdminAuthGuard';
import { checkPublicAuth } from '@/lib/publicAuth';

/**
 * [V2.10-ROUTER-PERMISSION-INTEGRATED] Router Context Definition
 * Expanded in v2.13 with queryClient for alignment of route-prefetching.
 */
interface RouterContext {
  user: any;
  role: string;
  can: (cap: Capability) => boolean;
  queryClient?: QueryClient;
  availableActions: string[];
}

/**
 * [V2.8-URL-STATE] Search Params Schema
 * Defining the contract for gallery filters.
 */
export interface GallerySearchParams {
  q?: string;
  category?: string;
  manufacturer?: string;
  sort?: 'newest' | 'oldest' | 'name';
  view?: 'grid' | 'list';
  authError?: string;
  
  photoId?: string;      // 灯箱当前照片 ID
  groupId?: string;      // 当前选中的合组 ID
  columns?: string;      // 列数（2/3/4/5）
  showGroupsCollapsed?: 'true' | 'false';  // 合组折叠状态
  preview?: 'true' | 'false';      // 预览模式
}

// Helper for lazy loading with retry
function lazyWithRetry(importFn: () => Promise<any>, pageName: string) {
  return lazy(() => 
    importFn().catch(error => {
      console.error(`[Dynamic Import Error] Failed to load component ${pageName}:`, error);
      const isDynamicImportError = 
        error.message?.includes('Failed to fetch dynamically imported module') ||
        error.name === 'TypeError' ||
        String(error).includes('dynamically imported module') ||
        String(error).includes('loading chunk');

      if (isDynamicImportError) {
        const lastReloadKey = `last_chunk_reload_${pageName}`;
        const lastReload = sessionStorage.getItem(lastReloadKey);
        const now = Date.now();
        if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
          sessionStorage.setItem(lastReloadKey, String(now));
          window.location.reload();
          return new Promise(() => {}); 
        }
      }
      globalHandleError(error, `加载页面组件 (${pageName}) 失败`);
      throw error;
    })
  );
}

const PublicPage = lazyWithRetry(() => import('@/pages/PublicPage'), 'PublicPage');
const AdminPage = lazyWithRetry(() => import('@/pages/AdminPage'), 'AdminPage');

// 1. Root Route
export const rootRoute = createRootRouteWithContext<RouterContext>()({
  beforeLoad: ({ context }) => {
    return {
      user: context?.user || null,
      role: context?.role || 'guest',
      can: context?.can || (() => false),
    };
  },
  /* [CATEGORY-SUSPENSE-UNIFIED] unified route-level suspense fallback */
  component: () => (
    <Suspense fallback={<PageSkeleton />}>
      <Outlet />
    </Suspense>
  ),
});

import { type } from 'arktype';
import { PAGINATION } from '@/constants/config';

// 2. Main Routes
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.HOME,
  validateSearch: (search: Record<string, unknown>): GallerySearchParams => {
    return {
      q: (search.q as string) || undefined,
      category: (search.category as string) || undefined,
      manufacturer: (search.manufacturer as string) || undefined,
      sort: (search.sort as GallerySearchParams['sort']) || undefined,
      view: (search.view as GallerySearchParams['view']) || undefined,
      authError: (search.authError as string) || undefined,
      photoId: (search.photoId as string) || undefined,
      groupId: (search.groupId as string) || undefined,
      columns: (search.columns as string) || undefined,
      showGroupsCollapsed: (search.showGroupsCollapsed as GallerySearchParams['showGroupsCollapsed']) || undefined,
      preview: (search.preview as GallerySearchParams['preview']) || undefined,
    };
  },
  beforeLoad: async ({ search }) => {
    if (search.authError || search.preview === 'true') return;
    


    // [INSURANCE] Synchronous session key presence check for high-speed instant redirect
    const hasSessionKey = typeof window !== 'undefined' && 
      Object.keys(window.localStorage || {}).some(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
    
    if (hasSessionKey || localStorage.getItem('ais_mock_auth_passcode')) {
      throw redirect({
        to: ROUTES.ADMIN,
      });
    }

    try {
      const res = await checkPublicAuth();
      if (res.isAuthenticated) {
        throw redirect({
          to: ROUTES.ADMIN,
        });
      }
    } catch (err) {
      if (err && typeof err === 'object' && ('to' in err || 'isRedirect' in err || 'statusCode' in err)) {
        throw err;
      }
      console.warn('[indexRoute/beforeLoad] Auth check for redirection skipped:', err);
    }
  },
  loader: async ({ context }) => {
    const { queryClient } = context;
    if (!queryClient) return;
    const queryKey = photoKeys.infinite({ 
      category_id: null,
      tag_id: null,
      searchQuery: null,
      sortOrder: null,
      isAdminMode: false,
      onlyUngrouped: false,
      limit: PAGINATION.PUBLIC_PAGE_SIZE
    }, 'REALTIME');

    queryClient.prefetchInfiniteQuery({
      queryKey,
      queryFn: async () => {
        const { loadAllPhotosFromCloud } = await import('./services/photo/queries');
        const photos = await loadAllPhotosFromCloud(
          undefined,
          0,
          PAGINATION.PUBLIC_PAGE_SIZE,
          undefined,
          undefined,
          undefined,
          false
        );
        return {
          photos: photos || [],
          nextPage: undefined
        };
      },
      initialPageParam: 1,
      staleTime: createStaleTime('REALTIME'),
    });
  },
  component: PublicPage,
});

const hashRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/h/$hash',
  component: PublicPage,
});

const groupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/group/$groupId',
  validateSearch: (search: Record<string, unknown>): GallerySearchParams => {
    return {
      q: (search.q as string) || undefined,
      category: (search.category as string) || undefined,
      sort: (search.sort as GallerySearchParams['sort']) || undefined,
      photoId: (search.photoId as string) || undefined,
      groupId: (search.groupId as string) || undefined,
      columns: (search.columns as string) || undefined,
      showGroupsCollapsed: (search.showGroupsCollapsed as GallerySearchParams['showGroupsCollapsed']) || undefined,
    };
  },
  loader: async ({ params: { groupId }, context }) => {
    const { queryClient } = context;
    if (!queryClient || !groupId) return;
    const queryKey = groupKeys.detail(groupId, 'STABLE');
    queryClient.prefetchQuery({
      queryKey,
      queryFn: () => getGroupById(groupId),
      staleTime: createStaleTime('STABLE'),
    });
  },
  component: PublicPage,
});

// For backward compatibility
const gRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/g/$groupId',
  component: PublicPage,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.ADMIN,
  component: () => (
    <AdminAuthGuard>
      <AdminPage />
    </AdminAuthGuard>
  ),
});

// 3. Route Tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  hashRoute,
  groupRoute,
  gRoute,
  adminRoute,
]);

// 4. Create Router
export const router = createRouter({ 
  routeTree,
  defaultPreload: 'intent',
  parseSearch: (searchStr) => {
    const params = new URLSearchParams(searchStr);
    const result: Record<string, any> = {};
    params.forEach((value, key) => {
      if (value === 'true' || value === 'false') {
        result[key] = value;
        return;
      }
      if (value.startsWith('"') && value.endsWith('"')) {
        try {
          result[key] = JSON.parse(value);
          return;
        } catch (_) {}
      }
      try {
        if (value.startsWith('{') || value.startsWith('[')) {
          result[key] = JSON.parse(value);
          return;
        }
      } catch (_) {}
      result[key] = value;
    });
    return result;
  },
  stringifySearch: (search) => {
    const params = new URLSearchParams();
    Object.entries(search).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (typeof value === 'object') {
        params.set(key, JSON.stringify(value));
      } else {
        params.set(key, String(value));
      }
    });
    const str = params.toString();
    return str ? `?${str}` : '';
  },
  context: {
    user: null,
    role: 'guest',
    can: () => false,
    availableActions: [],
  },
});

// Type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
