import { useAtomValue } from 'jotai';
import { authLoadingAtom } from '#src/store/index.js';
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
const PublicPage = lazy(() => import("#src/pages/PublicPage.js"));
const AdminPage = lazy(() => import("#src/pages/AdminPage/index.js"));
const PublicGroupDetailPage = lazy(() => import("#src/features/group/PublicGroupDetail.js").then(m => ({ default: m.PublicGroupDetailPage })));
const AdminAuthGate = lazy(() => import("./admin/AdminAuthGate.js").then(m => ({ default: m.AdminAuthGate })));
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
                  <Suspense fallback={<LoadingScreen />}>
                    <AdminAuthGate>
                      <AdminPage />
                    </AdminAuthGate>
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
                <ErrorBoundary context="PublicLayout">
                  <Suspense fallback={<LoadingScreen />}>
                    <Switch>
                      <Route path="/" component={PublicPage} />
                      <Route path="/photo/:photoId" component={PublicPage} />
                      <Route path="/group/:slug" component={PublicGroupDetailPage} />
                      <Route path="/category/:id" component={PublicPage} />
                      <Route path="/tag/:id" component={PublicPage} />
                      {/* Prevent visual 404 during exit animations to admin routes */}
                      <Route path="/admin" component={() => null} />
                      <Route path="/admin/:any*" component={() => null} />
                      <Route path="/settings" component={() => null} />
                      <Route path="/settings/:any*" component={() => null} />
                      <Route path="/diagnostics" component={() => null} />
                      <Route path="/diagnostics/:any*" component={() => null} />
                      <Route component={NotFoundPage} />
                    </Switch>
                  </Suspense>
                </ErrorBoundary>
              </motion.div>
            )}
          </AnimatePresence>
          <DialogContainer />
      </Router>
    </ErrorBoundary>
  );
}
