import React, { lazy, Suspense, useEffect } from "react";
import { ErrorBoundary } from "#src/components/shared/ErrorBoundary.js";
import { motion, AnimatePresence } from "lite-sleek";
import { Switch, Route, useLocation, Router } from "wouter";
import { NotFoundPage } from "#src/pages/NotFoundPage.js";
import { LoadingScreen } from "./ui/LoadingScreen.js";
import { useAuth } from "#lib/store/index.js";

import { useNormalizedLocation } from "#src/hooks/core/index.js";
import { DialogContainer } from "./layout/DialogContainer.js";
import { SelectionProvider } from "#src/hooks/selection/useSelection.js";
import { getRouteGroupKey, isAdminRoute } from "#src/lib/routing.js";
const PublicPage = lazy(() => import("#src/pages/PublicPage.js"));
const AdminPage = lazy(() => import("#src/pages/AdminPage/index.js"));
const PublicGroupDetailPage = lazy(() => import("#src/features/group/PublicGroupDetail.js").then(m => ({ default: m.PublicGroupDetailPage })));
const AdminAuthGate = lazy(() => import("./admin/AdminAuthGate.js").then(m => ({ default: m.AdminAuthGate })));
export function RouterOrchestrator() {
  const [location] = useNormalizedLocation();
  const isAuthLoading = useAuth(s => s.isLoading);
  
  const groupKey = getRouteGroupKey(location);
  if (isAuthLoading) {
    return <LoadingScreen />;
  }
  // Admin 强制守卫 (针对管理端路径进行特殊布局处理)
  const isCurrentAdmin = isAdminRoute(location);
  return (
    <Router hook={useNormalizedLocation}>
      <SelectionProvider>
        <AnimatePresence>
          {isCurrentAdmin ? (
            <motion.div 
              key="admin-dashboard"
              variant="fade"
              transition="easeOut"
              className="flex-1 flex flex-col h-full w-full"
            >
              <ErrorBoundary>
                <Suspense fallback={<LoadingScreen />}>
                  <AdminPage />
                </Suspense>
              </ErrorBoundary>
            </motion.div>
          ) : (
            <motion.div
              key={groupKey}
              variant="fade"
              transition="easeOut"
              className="flex-1 flex flex-col h-full w-full"
            >
              <Suspense fallback={<LoadingScreen />}>
                <Switch>
                  <Route path="/" component={PublicPage} />
                  <Route path="/photo/:photoId" component={PublicPage} />
                  <Route path="/group/:slug" component={PublicGroupDetailPage} />
                  <Route path="/category/:id" component={PublicPage} />
                  <Route path="/tag/:id" component={PublicPage} />
                  <Route component={NotFoundPage} />
                </Switch>
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>
        <DialogContainer />
      </SelectionProvider>
    </Router>
  );
}
