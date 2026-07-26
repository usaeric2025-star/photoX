import React from 'react';
import { createBrowserRouter, Outlet } from 'react-router-dom';
import PublicPage from './pages/PublicPage.js';
import { PublicGroupDetailPage } from './features/group/PublicGroupDetail.js';
import { NotFoundPage } from './pages/NotFoundPage.js';
import { AdminPageContent } from './pages/AdminPage/AdminPageContent.js';
import { BatchEditScreen } from './features/batch-edit/BatchEditScreen.js';
import { DiagDashboard } from './features/diagnostics/DiagDashboard.js';
import { SettingsPage } from './features/settings/SettingsPage.js';
import { AdminGroupDetailPage } from './features/group/AdminGroupDetail.js';
import { AdminHeader } from './components/layout/AdminHeader.js';
import { StaffHeader } from './components/layout/StaffHeader.js';
import { usePermission } from '#src/hooks/index.js';
import { AdminContainer } from './components/admin/AdminContainer.js';
import { FilterBar } from './features/filters/index.js';
import { UploadButton } from './components/shared/UploadButton.js';
import { ScreenWrapper } from './components/admin/ScreenWrapper.js';
import { ADMIN_ROUTES } from './constants/config.js';
import { useAtomValue } from 'jotai';
import { userAtom, authLoadingAtom, signIn } from './store/auth.js';
import { LoadingScreen } from './components/ui/LoadingScreen.js';
import { LoginScreen } from './components/admin/LoginScreen.js';
import { patch } from '#lib/store/index.js';
import { GridProvider } from './context/GridContext.js';
import { RootErrorBoundary } from './components/layout/RootErrorBoundary.js';

function AdminGuard({ children }: { children: React.ReactNode }) {
  const user = useAtomValue(userAtom);
  const isLoading = useAtomValue(authLoadingAtom);

  if (isLoading) {
    return <LoadingScreen message="驗證身份中..." />;
  }

  if (!user) {
    return <LoginScreen signIn={signIn} />;
  }

  return <>{children}</>;
}

import { TopLayer } from './components/ui/TopLayer.js';
import { DialogContainer } from './components/layout/DialogContainer.js';

function AdminGallery() {
  const { role } = usePermission();

  return (
    <>
      {role === 'staff' ? (
        <StaffHeader className="border-b shadow-none" />
      ) : (
        <AdminHeader className="border-b shadow-none" />
      )}
      <div className="flex-1 relative overflow-hidden flex flex-col">
        <FilterBar mode="admin" className="bg-white border-b shadow-none" />
        <div className="flex-1 relative  translate-z-0 overflow-hidden flex flex-col">
          <AdminContainer />
        </div>
        <TopLayer type="popover" className="bottom-8 right-8 top-auto left-auto">
          <UploadButton 
            onAdd={() => patch({ uploadModeDialogOpen: true })}
          />
        </TopLayer>
      </div>
    </>
  );
}

function RootLayout() {
  return (
    <GridProvider>
      <Outlet />
      <DialogContainer />
    </GridProvider>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RootErrorBoundary />,
    children: [
      {
        path: '/',
        element: <PublicPage />,
      },
      {
        path: '/photo/:photoId',
        element: <PublicPage />,
      },
      {
        path: '/group/:slug',
        element: <PublicGroupDetailPage />,
      },
      {
        path: '/admin',
        element: (
          <AdminGuard>
            <AdminPageContent />
          </AdminGuard>
        ),
        children: [
          { index: true, element: <AdminGallery /> },
          { path: 'dashboard', element: <AdminGallery /> },
          { path: 'batch', element: (
            <ScreenWrapper onClose={() => window.location.href = ADMIN_ROUTES.HOME}>
              <BatchEditScreen />
            </ScreenWrapper>
          )},
          { path: 'batch-edit', element: (
            <ScreenWrapper onClose={() => window.location.href = ADMIN_ROUTES.HOME}>
              <BatchEditScreen />
            </ScreenWrapper>
          )},
          { path: 'diagnostics', element: (
            <ScreenWrapper onClose={() => window.location.href = ADMIN_ROUTES.HOME}>
              <DiagDashboard />
            </ScreenWrapper>
          )},
          { path: 'diagnose', element: (
            <ScreenWrapper onClose={() => window.location.href = ADMIN_ROUTES.HOME}>
              <DiagDashboard />
            </ScreenWrapper>
          )},
          { path: 'settings', element: (
            <div className="h-full bg-slate-50  w-full">
              <SettingsPage onClose={() => window.location.href = ADMIN_ROUTES.HOME} />
            </div>
          )},
          { path: 'tasks', element: (
            <ScreenWrapper onClose={() => window.location.href = ADMIN_ROUTES.HOME}>
              <DiagDashboard />
            </ScreenWrapper>
          )},
          { path: 'error-logs', element: (
            <ScreenWrapper onClose={() => window.location.href = ADMIN_ROUTES.HOME}>
              <DiagDashboard />
            </ScreenWrapper>
          )},
          { path: 'group/:id', element: <AdminGroupDetailPage /> },
        ]
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ]
  }
]);
