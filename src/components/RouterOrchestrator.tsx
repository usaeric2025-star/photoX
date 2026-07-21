import { useAtomValue } from 'jotai';
import { authLoadingAtom, signIn } from '#src/store/index.js';
import React, { lazy, Suspense, useEffect } from "react";
import { ErrorBoundary } from "#src/components/shared/ErrorBoundary.js";
import { ErrorCapture } from "#lib/error/ErrorCapture.js";
import { motion, AnimatePresence } from "lite-sleek";
import { Switch, Route, useLocation, Router } from "wouter";
import { NotFoundPage } from "#src/pages/NotFoundPage.js";
import { LoadingScreen } from "./ui/LoadingScreen.js";
import { } from "#lib/store/index.js";

import { useNormalizedLocation } from "#src/hooks/core/index.js";
import { DialogContainer } from "./layout/DialogContainer.js";
import { getRouteGroupKey, isAdminRoute } from "#src/lib/routing.js";

import PublicPage from "#src/pages/PublicPage.js";
import { PublicGroupDetailPage } from "#src/features/group/PublicGroupDetail.js";
import { useAdminAccess } from "#src/hooks/core/auth/useAuth.js";
import { LoginScreen } from "./admin/LoginScreen.js";
import AdminPage from "#src/pages/AdminPage/index.js";

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isLoading, isAdmin, user } = useAdminAccess();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return (
      <div className="h-screen w-full bg-slate-50">
        <LoginScreen signIn={signIn} />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="h-screen w-full bg-slate-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-lg shadow-sm border border-slate-100 max-w-md">
          <p className="text-slate-600 font-medium mb-4">您沒有管理權限，無法進入管理後台。</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function RouterOrchestrator() {
  const [location] = useNormalizedLocation();
  const groupKey = getRouteGroupKey(location);
  const isCurrentAdmin = isAdminRoute(location);

  return (
    <ErrorBoundary 
      context="RouterOrchestrator"
      onError={(error) => {
        ErrorCapture.capture(error);
      }}
    >
      <Router hook={useNormalizedLocation}>
        <AnimatePresence>
          {isCurrentAdmin ? (
            <motion.div 
              key="admin-dashboard"
              variant="fade"
              transition="easeOut"
              className="flex-1 flex flex-col h-full w-full"
            >
              <ErrorBoundary context="AdminLayout">
                <AdminGuard>
                  <AdminPage />
                </AdminGuard>
              </ErrorBoundary>
            </motion.div>
          ) : (
            <motion.div
              key={groupKey}
              variant="fade"
              transition="easeOut"
              className="flex-1 flex flex-col h-full w-full"
            >
              <ErrorBoundary context="PublicLayout">
                <Switch>
                  <Route path="/" component={PublicPage} />
                  <Route path="/photo/:photoId" component={PublicPage} />
                  <Route path="/group/:slug" component={PublicGroupDetailPage} />
                  <Route path="/category/:id" component={PublicPage} />
                  <Route path="/tag/:id" component={PublicPage} />
                  <Route component={NotFoundPage} />
                </Switch>
              </ErrorBoundary>
            </motion.div>
          )}
        </AnimatePresence>
        <DialogContainer />
      </Router>
    </ErrorBoundary>
  );
}
