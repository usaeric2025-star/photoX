import { lazy, Suspense } from "react";
import { motion, AnimatePresence } from "lite-sleek";
import { Switch, Route, useLocation } from "wouter";
import { NotFoundPage } from "#src/pages/NotFoundPage.js";
import { LoadingScreen } from "./ui/LoadingScreen.js";
import { useAuth } from "#lib/store/index.js";

const PublicPage = lazy(() => import("#src/pages/PublicPage.js"));
const AdminPage = lazy(() => import("#src/pages/AdminPage/index.js"));
const PublicGroupDetailPage = lazy(() => import("#src/features/group/PublicGroupDetail.js").then(m => ({ default: m.PublicGroupDetailPage })));
const AdminGroupDetailPage = lazy(() => import("#src/features/group/AdminGroupDetail.js").then(m => ({ default: m.AdminGroupDetailPage })));
const AdminAuthGate = lazy(() => import("./admin/AdminAuthGate.js").then(m => ({ default: m.AdminAuthGate })));
const SettingsPage = lazy(() => import("#src/features/settings/SettingsPage.js").then(m => ({ default: m.SettingsPage })));
const DiagDashboard = lazy(() => import("#src/features/diagnostics/DiagDashboard.js").then(m => ({ default: m.DiagDashboard })));

const AdminGroupDetailRoute = () => (
  <AdminAuthGate>
    <AdminGroupDetailPage />
  </AdminAuthGate>
);

const DiagnosticsRoute = () => (
  <AdminAuthGate>
    <DiagDashboard />
  </AdminAuthGate>
);

export function RouterOrchestrator() {
  const [location] = useLocation();
  const { isLoading: isAuthLoading } = useAuth();
  
  const getPageGroupKey = (pathname: string) => {
    if (pathname === '/' || pathname.startsWith('/photo/')) return 'public-home';
    if (pathname.startsWith('/admin')) return 'admin-dashboard';
    if (pathname.startsWith('/diagnostics')) return 'diag-dashboard';
    if (pathname.startsWith('/group/')) return 'public-group';
    return pathname;
  };

  const groupKey = getPageGroupKey(location);

  if (isAuthLoading) {
    return <LoadingScreen />;
  }

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
            
            <Route path="/admin/group/:id" component={AdminGroupDetailRoute} />
            
            <Route path="/admin/:subpath*" component={AdminPage} />
            
            <Route path="/settings" component={AdminPage} />
            
            <Route path="/diagnostics" component={DiagnosticsRoute} />
            
            <Route component={NotFoundPage} />
          </Switch>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}
