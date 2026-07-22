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

function AdminGallery() {
  return (
    <>
      <AdminHeader className="border-b bg-white shadow-none" />
      <div className="flex-1 relative overflow-hidden flex flex-col">
        <FilterBar mode="admin" className="bg-white border-b shadow-none z-10" />
        <div className="flex-1 relative animate-fade-in translate-z-0 overflow-hidden flex flex-col">
          <AdminContainer />
        </div>
        <div className="absolute bottom-8 right-8 z-[9999]">
          <UploadButton 
            onAdd={() => patch({ uploadModeDialogOpen: true })}
          />
        </div>
      </div>
    </>
  );
}

function RootLayout() {
  return (
    <GridProvider>
      <Outlet />
    </GridProvider>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
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
            <AdminPageContent>
              <AdminGallery />
            </AdminPageContent>
          </AdminGuard>
        ),
      },
      {
        path: '/admin/dashboard',
        element: (
          <AdminGuard>
            <AdminPageContent>
              <AdminGallery />
            </AdminPageContent>
          </AdminGuard>
        ),
      },
      {
        path: '/admin/batch',
        element: (
          <AdminGuard>
            <AdminPageContent>
              <ScreenWrapper onClose={() => window.location.href = ADMIN_ROUTES.HOME}>
                <BatchEditScreen />
              </ScreenWrapper>
            </AdminPageContent>
          </AdminGuard>
        ),
      },
      {
        path: '/admin/batch-edit',
        element: (
          <AdminGuard>
            <AdminPageContent>
              <ScreenWrapper onClose={() => window.location.href = ADMIN_ROUTES.HOME}>
                <BatchEditScreen />
              </ScreenWrapper>
            </AdminPageContent>
          </AdminGuard>
        ),
      },
      {
        path: '/admin/diagnostics',
        element: (
          <AdminGuard>
            <AdminPageContent>
              <ScreenWrapper onClose={() => window.location.href = ADMIN_ROUTES.HOME}>
                <DiagDashboard />
              </ScreenWrapper>
            </AdminPageContent>
          </AdminGuard>
        ),
      },
      {
        path: '/admin/diagnose',
        element: (
          <AdminGuard>
            <AdminPageContent>
              <ScreenWrapper onClose={() => window.location.href = ADMIN_ROUTES.HOME}>
                <DiagDashboard />
              </ScreenWrapper>
            </AdminPageContent>
          </AdminGuard>
        ),
      },
      {
        path: '/admin/settings',
        element: (
          <AdminGuard>
            <AdminPageContent>
              <div className="h-full bg-slate-50 animate-scale-in w-full">
                <SettingsPage onClose={() => window.location.href = ADMIN_ROUTES.HOME} />
              </div>
            </AdminPageContent>
          </AdminGuard>
        ),
      },
      {
        path: '/admin/tasks',
        element: (
          <AdminGuard>
            <AdminPageContent>
              <div className="h-full bg-slate-50 animate-scale-in w-full">
                <SettingsPage onClose={() => window.location.href = ADMIN_ROUTES.HOME} />
              </div>
            </AdminPageContent>
          </AdminGuard>
        ),
      },
      {
        path: '/admin/error-logs',
        element: (
          <AdminGuard>
            <AdminPageContent>
              <div className="h-full bg-slate-50 animate-scale-in w-full">
                <SettingsPage onClose={() => window.location.href = ADMIN_ROUTES.HOME} />
              </div>
            </AdminPageContent>
          </AdminGuard>
        ),
      },
      {
        path: '/admin/group/:id',
        element: (
          <AdminGuard>
            <AdminPageContent>
              <AdminGroupDetailPage />
            </AdminPageContent>
          </AdminGuard>
        ),
      },
      {
        path: '/settings',
        element: (
          <AdminGuard>
            <AdminPageContent>
              <div className="h-full bg-slate-50 animate-scale-in w-full">
                <SettingsPage onClose={() => window.location.href = ADMIN_ROUTES.HOME} />
              </div>
            </AdminPageContent>
          </AdminGuard>
        ),
      },
      {
        path: '/diagnostics',
        element: (
          <AdminGuard>
            <AdminPageContent>
              <ScreenWrapper onClose={() => window.location.href = ADMIN_ROUTES.HOME}>
                <DiagDashboard />
              </ScreenWrapper>
            </AdminPageContent>
          </AdminGuard>
        ),
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ]
  }
]);
