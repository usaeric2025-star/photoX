import { createRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import { ROUTES } from '@/config/constants';
import { rootRoute } from './root';
import { authGuard } from './guards';
import { GallerySearchParams } from './types';
import { prefetchMainGallery, prefetchGroupDetail } from '@/services/router/loaders';
import { PublicGroupDetailPage } from '@/features/group/public/GroupDetailPage';
import { RouteErrorFallback } from '@/components/ui/RouteErrorFallback';

const PublicPage = lazy(() => import('@/pages/PublicPage'));

export const gallerySearchValidator = (search: Record<string, unknown>): GallerySearchParams => {
  return {
    q: (search.q as string) || undefined,
    category: (search.category as string) || undefined,
    cat: (search.cat as string) || undefined,
    tag: (search.tag as string | string[]) || undefined,
    manufacturer: (search.manufacturer as string) || undefined,
    sort: (search.sort as GallerySearchParams['sort']) || undefined,
    view: (search.view as GallerySearchParams['view']) || undefined,
    authError: (search.authError as string) || undefined,
    photoId: (search.photoId as string) || undefined,
    groupId: (search.groupId as string) || undefined,
    columns: (search.columns as string) || undefined,
    showGroupsCollapsed: search.showGroupsCollapsed === false || search.showGroupsCollapsed === 'false' ? false : (search.showGroupsCollapsed === true || search.showGroupsCollapsed === 'true' ? true : undefined),
    onlyUngrouped: search.onlyUngrouped === true || search.onlyUngrouped === 'true' ? true : (search.onlyUngrouped === false || search.onlyUngrouped === 'false' ? false : undefined),
    hidden: search.hidden === true || search.hidden === 'true' ? true : (search.hidden === false || search.hidden === 'false' ? false : undefined),
    status: (search.status as string) || undefined,
    batch: (search.batch as string) || undefined,
    modal: (search.modal as string) || undefined,
    anchor: search.anchor === true || search.anchor === 'true' ? true : (search.anchor === false || search.anchor === 'false' ? false : undefined),
  };
};

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.HOME,
  validateSearch: gallerySearchValidator,
  beforeLoad: authGuard,
  loader: ({ context }) => {
    if (context.queryClient) {
      prefetchMainGallery(context.queryClient);
    }
  },
  errorComponent: ({ error, reset }) => <RouteErrorFallback error={error} reset={reset} />,
  component: PublicPage,
});

export const previewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/preview',
  validateSearch: gallerySearchValidator,
  loader: ({ context }) => {
    if (context.queryClient) {
      prefetchMainGallery(context.queryClient);
    }
  },
  errorComponent: ({ error, reset }) => <RouteErrorFallback error={error} reset={reset} />,
  component: PublicPage,
});

export const hashRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/h/$hash',
  validateSearch: gallerySearchValidator,
  errorComponent: ({ error, reset }) => <RouteErrorFallback error={error} reset={reset} />,
  component: PublicPage,
});

export const groupRoute = createRoute({
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
      showGroupsCollapsed: search.showGroupsCollapsed === false || search.showGroupsCollapsed === 'false' ? false : (search.showGroupsCollapsed === true || search.showGroupsCollapsed === 'true' ? true : undefined),
      anchor: search.anchor === true || search.anchor === 'true' ? true : (search.anchor === false || search.anchor === 'false' ? false : undefined),
    };
  },
  loader: ({ params: { groupId }, context }) => {
    if (context.queryClient && groupId) {
      // Background prefetch
      void prefetchGroupDetail(context.queryClient, groupId);
    }
  },
  errorComponent: ({ error, reset }) => <RouteErrorFallback error={error} reset={reset} />,
  component: PublicGroupDetailPage,
});

export const gRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/g/$groupId',
  validateSearch: gallerySearchValidator,
  errorComponent: ({ error, reset }) => <RouteErrorFallback error={error} reset={reset} />,
  component: PublicGroupDetailPage,
});
