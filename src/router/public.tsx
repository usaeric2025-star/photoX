import { createRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import { ROUTES } from '@/config/constants';
import { rootRoute } from './root';
import { authGuard } from './guards';
import { GallerySearchParams } from './types';
import { prefetchMainGallery, prefetchGroupDetail } from '@/services/router/loaders';

const PublicPage = lazy(() => import('@/pages/PublicPage'));

const gallerySearchValidator = (search: Record<string, unknown>): GallerySearchParams => {
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
  component: PublicPage,
});

export const hashRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/h/$hash',
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
      showGroupsCollapsed: (search.showGroupsCollapsed as GallerySearchParams['showGroupsCollapsed']) || undefined,
    };
  },
  loader: ({ params: { groupId }, context }) => {
    if (context.queryClient && groupId) {
      // Background prefetch
      void prefetchGroupDetail(context.queryClient, groupId);
    }
  },
  component: lazy(() => import('@/pages/PublicGroupPage')),
});

export const gRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/g/$groupId',
  component: lazy(() => import('@/pages/PublicGroupPage')),
});
