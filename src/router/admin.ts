import { createRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import { ROUTES } from '@/config/constants';
import { rootRoute } from './root';
import { authGuard } from './guards';
import { GallerySearchParams } from './types';
import { prefetchGroupDetail } from '@/services/router/loaders';
import { gallerySearchValidator } from './public';

const AdminPage = lazy(() => import('@/pages/AdminPage/index'));

export const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.ADMIN,
  validateSearch: gallerySearchValidator,
  beforeLoad: authGuard,
  component: AdminPage,
});

export const adminDiagnoseRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: '/diagnose',
  component: AdminPage,
});

export const adminDiagnosticsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: '/diagnostics',
  component: AdminPage,
});

export const adminTasksRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: '/tasks',
  component: AdminPage,
});

export const adminErrorLogsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: '/error-logs',
  component: AdminPage,
});

export const adminSettingsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: '/settings',
  component: AdminPage,
});

export const adminBatchEditRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: '/batch-edit',
  component: AdminPage,
});

export const adminStatisticsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: '/statistics',
  component: AdminPage,
});

export const adminGroupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/group/$groupId',
  validateSearch: (search: Record<string, unknown>): GallerySearchParams => {
    return {
      photoId: (search.photoId as string) || undefined,
      columns: (search.columns as string) || undefined,
    } as GallerySearchParams;
  },
  loader: ({ params: { groupId }, context }) => {
    if (context.queryClient && groupId) {
      // Start prefetching in background, don't await to avoid blocking transition
      void prefetchGroupDetail(context.queryClient, groupId, true);
    }
  },
  component: lazy(() => import('@/pages/AdminGroupPage')),
});
