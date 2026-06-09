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
import { handleError } from './lib/error/errorHandler';
import { Capability } from './config/permissions';
import { QueryClient } from '@tanstack/react-query';
import { photoKeys, groupKeys } from '@/lib/queryKeys';
import { createStaleTime } from '@/shared/freshnessSchema';
import { prefetchMainGallery, prefetchGroupDetail } from '@/services/router/loaders';
import { GlobalStatus } from './components/shared/GlobalStatus';
import { authGuard } from './lib/router/routeGuards';
import { GallerySearchParams } from './types/router';

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
      handleError(error, `加载页面组件 (${pageName}) 失败`);
      throw error;
    })
  );
}

const PublicPage = lazyWithRetry(() => import('./pages/PublicPage'), 'PublicPage');
const AdminPage = lazyWithRetry(() => import('./pages/AdminPage/index'), 'AdminPage');
const PhotoLightboxPage = lazy(() => import('./pages/PhotoLightboxPage'));

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
      <PhotoLightboxPage />
      <GlobalStatus />
    </Suspense>
  ),
});

import { type } from 'arktype';
import { PAGINATION } from '@/constants/config';
import { PHOTO_QUERY_CONFIG } from '@/lib/photoQueryConfig';

// 2. Main Routes
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.HOME,
  validateSearch: (search: Record<string, unknown>): GallerySearchParams => {
    return {
      q: (search.q as string) || undefined,
      category: (search.category as string) || undefined,
      tag: (search.tag as string) || undefined,
      manufacturer: (search.manufacturer as string) || undefined,
      sort: (search.sort as GallerySearchParams['sort']) || undefined,
      view: (search.view as GallerySearchParams['view']) || undefined,
      authError: (search.authError as string) || undefined,
      photoId: (search.photoId as string) || undefined,
      groupId: (search.groupId as string) || undefined,
      columns: (search.columns as string) || undefined,
      showGroupsCollapsed: (search.showGroupsCollapsed as GallerySearchParams['showGroupsCollapsed']) || undefined,
      onlyUngrouped: (search.onlyUngrouped as GallerySearchParams['onlyUngrouped']) || undefined,
      hidden: (search.hidden as GallerySearchParams['hidden']) || undefined,
    };
  },
  beforeLoad: authGuard,
  loader: async ({ context }) => {
    if (context.queryClient) {
      await prefetchMainGallery(context.queryClient);
    }
  },
  component: PublicPage,
});

const previewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/preview', // Explicitly set to /preview
  validateSearch: (search: Record<string, unknown>): GallerySearchParams => {
    return {
      q: (search.q as string) || undefined,
      category: (search.category as string) || undefined,
      tag: (search.tag as string) || undefined,
      manufacturer: (search.manufacturer as string) || undefined,
      sort: (search.sort as GallerySearchParams['sort']) || undefined,
      view: (search.view as GallerySearchParams['view']) || undefined,
      photoId: (search.photoId as string) || undefined,
      groupId: (search.groupId as string) || undefined,
      columns: (search.columns as string) || undefined,
      showGroupsCollapsed: (search.showGroupsCollapsed as GallerySearchParams['showGroupsCollapsed']) || undefined,
      onlyUngrouped: (search.onlyUngrouped as GallerySearchParams['onlyUngrouped']) || undefined,
      hidden: (search.hidden as GallerySearchParams['hidden']) || undefined,
    };
  },
  loader: async ({ context }) => {
    if (context.queryClient) {
      await prefetchMainGallery(context.queryClient);
    }
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
  beforeLoad: authGuard,
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
    if (context.queryClient && groupId) {
      await prefetchGroupDetail(context.queryClient, groupId);
    }
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
  beforeLoad: authGuard,
  component: AdminPage,
});

const adminDiagnoseRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: '/diagnose',
  component: AdminPage,
});

const adminHistoryRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: '/history/maintenance',
  component: AdminPage,
});

const adminTasksRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: '/tasks',
  component: AdminPage,
});

const adminErrorLogsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: '/error-logs',
  component: AdminPage,
});

const adminGroupRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: '/group/$groupId',
  validateSearch: (search: Record<string, unknown>): GallerySearchParams => {
    return {
      photoId: (search.photoId as string) || undefined,
      columns: (search.columns as string) || undefined,
    };
  },
  loader: async ({ params: { groupId }, context }) => {
    if (context.queryClient && groupId) {
      await prefetchGroupDetail(context.queryClient, groupId);
    }
  },
  component: AdminPage, // AdminPage handles the layout
});

// 3. Route Tree
export const routeTree = rootRoute.addChildren([
  indexRoute,
  previewRoute,
  hashRoute,
  groupRoute,
  gRoute,
  adminRoute.addChildren([
    adminDiagnoseRoute, 
    adminHistoryRoute, 
    adminTasksRoute, 
    adminErrorLogsRoute, 
    adminGroupRoute
  ]),
]);

import { NotFoundPage } from './pages/NotFoundPage';

// 4. Create Router
export const router = createRouter({ 
  routeTree,
  defaultNotFoundComponent: NotFoundPage,
  defaultErrorComponent: ({ error, reset }) => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-800 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center max-w-md w-full">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">路由错误 / Route Error</h1>
        <p className="text-slate-500 mb-8 max-w-xs break-words">
          {error instanceof Error ? error.message : '发生了未知的路由错误'}
        </p>
        <button 
          onClick={reset}
          className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-medium tracking-wide hover:bg-slate-800 transition-all active:scale-[0.98]"
        >
          重试 / Retry
        </button>
      </div>
    </div>
  ),
  defaultPreload: 'intent',
  parseSearch: (searchStr) => {
    const params = new URLSearchParams(searchStr);
    const result: Record<string, any> = {};
    params.forEach((value, key) => {
      if (!value) return;
      try {
        if (value === 'true' || value === 'false') {
          result[key] = value === 'true';
          return;
        }
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith('{') && value.endsWith('}')) || 
            (value.startsWith('[') && value.endsWith(']'))) {
          result[key] = JSON.parse(value);
        } else {
          result[key] = value;
        }
      } catch (_) {
        result[key] = value;
      }
    });
    return result;
  },
  stringifySearch: (search) => {
    const params = new URLSearchParams();
    if (search && typeof search === 'object') {
      Object.entries(search).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        if (typeof value === 'object') {
          try {
            params.set(key, JSON.stringify(value));
          } catch (_) {
            params.set(key, String(value));
          }
        } else {
          params.set(key, String(value));
        }
      });
    }
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
