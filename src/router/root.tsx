import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/PageSkeleton';
import { JobResumer } from '@/components/tasks/JobResumer';
import { BackgroundTaskPanel } from '@/components/tasks/BackgroundTaskPanel';
import { Capability } from '@/config/permissions';
import { QueryClient } from '@tanstack/react-query';
import { PhotoLightboxPage } from '@/pages/PhotoLightboxPage';
import { type RouterContext } from './types';

export const rootRoute = createRootRouteWithContext<RouterContext>()({
  beforeLoad: ({ context }) => {
    return {
      user: context?.user || null,
      role: context?.role || 'guest',
      can: context?.can || (() => false),
    };
  },
  component: () => (
    <Suspense fallback={<PageSkeleton />}>
      <Outlet />
      <PhotoLightboxPage />
      <JobResumer />
      <BackgroundTaskPanel />
    </Suspense>
  ),
});
