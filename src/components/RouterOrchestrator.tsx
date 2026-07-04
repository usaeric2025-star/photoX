import { lazy, Suspense } from "react";
import { motion, AnimatePresence } from "lite-sleek";
import { Switch, Route, useLocation } from "wouter";
import PublicPage from "#src/pages/PublicPage.js";
import AdminPage from '#src/pages/AdminPage/index.js';
import { NotFoundPage } from "#src/pages/NotFoundPage.js";
import { PublicGroupDetailPage } from "#src/features/group/PublicGroupDetail.js";
import { AdminGroupDetailPage } from "#src/features/group/AdminGroupDetail.js";
import { AdminAuthGate } from "./admin/AdminAuthGate.js";
import { LoadingScreen } from "./ui/LoadingScreen.js";

const SettingsPage = lazy(() => import("#src/features/settings/SettingsPage.js").then(m => ({ default: m.SettingsPage })));
const DiagDashboard = lazy(() => import("#src/features/diagnostics/DiagDashboard.js").then(m => ({ default: m.DiagDashboard })));

export function RouterOrchestrator() {
  const [location] = useLocation();

  const getPageGroupKey = (pathname: string) => {
    if (pathname === '/' || pathname.startsWith('/photo/')) return 'public-home';
    if (pathname.startsWith('/admin')) return 'admin-dashboard';
    if (pathname.startsWith('/diagnostics')) return 'diag-dashboard';
    if (pathname.startsWith('/group/')) return 'public-group';
    return pathname;
  };

  const groupKey = getPageGroupKey(location);

  return (
    <AnimatePresence>
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
            <Route path="/admin/group/:id" component={() => (
                <AdminAuthGate>
                  <AdminGroupDetailPage />
                </AdminAuthGate>
            )} />
            <Route path="/admin" component={AdminPage} />
            <Route path="/admin/batch" component={AdminPage} />
            <Route path="/admin/batch-edit" component={AdminPage} />
            <Route path="/admin/tasks" component={AdminPage} />
            <Route path="/admin/error-logs" component={AdminPage} />
            <Route path="/admin/diagnose" component={AdminPage} />
            <Route path="/admin/diagnostics" component={AdminPage} />
            <Route path="/settings" component={AdminPage} />
            <Route path="/diagnostics" component={() => (
                <AdminAuthGate>
                  <DiagDashboard />
                </AdminAuthGate>
            )} />
            <Route component={NotFoundPage} />
          </Switch>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}
