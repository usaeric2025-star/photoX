import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { JobResumer } from '@/components/tasks/JobResumer';
import { BackgroundTaskPanel } from '@/components/tasks/BackgroundTaskPanel';
import { QueryClient } from '@tanstack/react-query';
import { type RouterContext } from './types';
import { RouteErrorFallback } from '@/components/ui/RouteErrorFallback';

import { DialogContainer } from '@/components/layout/DialogContainer';

export const rootRoute = createRootRouteWithContext<RouterContext>()({
  beforeLoad: ({ context }) => {
    return {
      user: context?.user || null,
      role: context?.role || 'guest',
      can: context?.can || (() => false),
    };
  },
  errorComponent: ({ error, reset }) => <RouteErrorFallback error={error} reset={reset} />,
  component: () => (
    <Suspense fallback={<PageSkeleton />}>
      <Outlet />
      <JobResumer />
      <BackgroundTaskPanel />
      <DialogContainer />
    </Suspense>
  ),
});

