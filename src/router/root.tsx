import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner';
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
    <Suspense fallback={
      <div className="w-screen h-screen flex items-center justify-center bg-surface-base">
        <LoadingSpinner size="lg" />
      </div>
    }>
      <Outlet />
      <JobResumer />
      <BackgroundTaskPanel />
      <DialogContainer />
    </Suspense>
  ),
});

