import { useAtomValue } from 'jotai';
import { authLoadingAtom, userAtom, signIn } from '#src/store/index.js';
import React from "react";
import { ErrorBoundary } from "#src/components/shared/ErrorBoundary.js";
import { ErrorCapture } from "#lib/error/ErrorCapture.js";
import { Switch, Route } from "wouter";
import { NotFoundPage } from "#src/pages/NotFoundPage.js";
import { LoadingScreen } from "./ui/LoadingScreen.js";
import { DialogContainer } from "./layout/DialogContainer.js";

import PublicPage from "#src/pages/PublicPage.js";
import { PublicGroupDetailPage } from "#src/features/group/PublicGroupDetail.js";
import { LoginScreen } from "./admin/LoginScreen.js";
import AdminPage from "#src/pages/AdminPage/index.js";

function AdminGuard({ children }: { children: React.ReactNode }) {
  const user = useAtomValue(userAtom);
  const isLoading = useAtomValue(authLoadingAtom);

  if (isLoading) {
    return <LoadingScreen message="驗證身份中..." />;
  }

  if (!user) {
    return (
      <div className="h-screen w-full bg-slate-50">
        <LoginScreen signIn={signIn} />
      </div>
    );
  }

  return <>{children}</>;
}

export function RouterOrchestrator() {
  return (
    <ErrorBoundary 
      context="RouterOrchestrator"
      onError={(error) => {
        ErrorCapture.capture(error);
      }}
    >
      <Switch>
        {/* Admin 路由与包含子路径的统一捕获 */}
        <Route path="/admin/">
          {() => (
            <AdminGuard>
              <AdminPage />
            </AdminGuard>
          )}
        </Route>
        <Route path="/admin/:subpath*">
          {() => (
            <AdminGuard>
              <AdminPage />
            </AdminGuard>
          )}
        </Route>
        <Route path="/admin">
          {() => (
            <AdminGuard>
              <AdminPage />
            </AdminGuard>
          )}
        </Route>
        <Route path="/settings/">
          {() => (
            <AdminGuard>
              <AdminPage />
            </AdminGuard>
          )}
        </Route>
        <Route path="/settings/:subpath*">
          {() => (
            <AdminGuard>
              <AdminPage />
            </AdminGuard>
          )}
        </Route>
        <Route path="/settings">
          {() => (
            <AdminGuard>
              <AdminPage />
            </AdminGuard>
          )}
        </Route>
        <Route path="/diagnostics/">
          {() => (
            <AdminGuard>
              <AdminPage />
            </AdminGuard>
          )}
        </Route>
        <Route path="/diagnostics/:subpath*">
          {() => (
            <AdminGuard>
              <AdminPage />
            </AdminGuard>
          )}
        </Route>
        <Route path="/diagnostics">
          {() => (
            <AdminGuard>
              <AdminPage />
            </AdminGuard>
          )}
        </Route>

        {/* 公开页面路由 */}
        <Route path="/" component={PublicPage} />
        <Route path="/photo/:photoId" component={PublicPage} />
        <Route path="/group/:slug" component={PublicGroupDetailPage} />
        <Route path="/category/:id" component={PublicPage} />
        <Route path="/tag/:id" component={PublicPage} />

        {/* 兜底 404 */}
        <Route component={NotFoundPage} />
      </Switch>
      <DialogContainer />
    </ErrorBoundary>
  );
}
