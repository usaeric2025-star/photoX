import { 
  createRootRouteWithContext, 
  createRoute, 
  createRouter,
  Outlet
} from '@tanstack/react-router';
import { ROUTES } from './config/constants';
import { lazy, Suspense } from 'react';
import { FullPageLoading } from './components/FullPageLoading';
import { globalHandleError } from './utils/errorHandler';
import { Capability } from './config/permissions';
import { validateRouteAccess } from './lib/permissions-contract';
import { validateAccess, RouteAccessContract } from './shared/permissionsSchema';
import { QueryClient } from '@tanstack/react-query';
import { photoKeys, groupKeys } from '@/lib/queryKeys';
import { createStaleTime } from '@/shared/freshnessSchema';
import { getGroupById } from '@/services/groupService';

/**
 * [V2.10-ROUTER-PERMISSION-INTEGRATED] Router Context Definition
 * Expanded in v2.13 with queryClient for alignment of route-prefetching.
 */
interface RouterContext {
  user: any;
  role: string;
  can: (cap: Capability) => boolean;
  queryClient?: QueryClient;
}

/**
 * [V2.8-URL-STATE] Search Params Schema
 * Defining the contract for gallery filters.
 */
interface GallerySearchParams {
  q?: string;
  category?: string;
  manufacturer?: string;
  sort?: 'date' | 'name' | 'popularity';
  view?: 'grid' | 'list';
  authError?: string;
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

const PublicView = lazyWithRetry(() => import('./pages/PublicView'), 'PublicView');
const AdminView = lazyWithRetry(() => import('./pages/AdminView'), 'AdminView');

// 1. Root Route
export const rootRoute = createRootRouteWithContext<RouterContext>()({
  beforeLoad: ({ context }) => {
    return {
      user: context?.user || null,
      role: context?.role || 'guest',
      can: context?.can || (() => false),
    };
  },
  component: () => (
    <Suspense fallback={<FullPageLoading />}>
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
      sort: (search.sort as GallerySearchParams['sort']) || 'date',
      view: (search.view as GallerySearchParams['view']) || 'grid',
      authError: (search.authError as string) || undefined,
    };
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
        const { loadAllPhotosFromCloud } = await import('./services/photoService');
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
  component: PublicView,
});

const hashRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/h/$hash',
  component: PublicView,
});

const groupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/group/$groupId',
  validateSearch: (search: Record<string, unknown>): GallerySearchParams => {
    return {
      q: (search.q as string) || undefined,
      category: (search.category as string) || undefined,
      sort: (search.sort as GallerySearchParams['sort']) || 'date',
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
  component: PublicView,
});

// For backward compatibility
const gRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/g/$groupId',
  component: PublicView,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.ADMIN,
  beforeLoad: ({ context }) => {
    validateAccess({ permission: 'admin', fallbackRedirect: ROUTES.HOME }, context);
  },
  component: AdminView,
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
  context: {
    user: null,
    role: 'guest',
    can: () => false,
  },
});

// Type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
