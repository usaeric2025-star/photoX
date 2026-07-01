import { useAppRoute } from "#lib/router";
import { logger } from "#lib/logger";
import { lazy, Suspense } from "react";
import { motion, AnimatePresence } from "lite-sleek";
import PublicPage from "#src/pages/PublicPage";
import AdminPage from "#src/pages/AdminPage";
import { NotFoundPage } from "#src/pages/NotFoundPage";
import { PublicGroupDetailPage } from "#src/features/group/PublicGroupDetail";
import { AdminGroupDetailPage } from "#src/features/group/AdminGroupDetail";
import { AdminAuthGate } from "./admin/AdminAuthGate";
import { LoadingScreen } from "./ui/LoadingScreen";

const SettingsPage = lazy(() => import("#src/features/settings/SettingsPage").then(m => ({ default: m.SettingsPage })));
const DiagDashboard = lazy(() => import("#src/features/diagnostics/DiagDashboard").then(m => ({ default: m.DiagDashboard })));

export function RouterOrchestrator() {
  const route = useAppRoute();
  logger.debug('[RouterOrchestrator] Current route:', route);

  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  
  // FORCE matching based on pathname for all admin and system pages to avoid any Chicane matching issues or transient state desyncs!
  let routeName = route?.name;
  
  if (pathname.startsWith('/admin/batch-edit')) {
    routeName = 'adminBatchEdit';
  } else if (pathname.startsWith('/admin/group/')) {
    routeName = 'adminGroup';
  } else if (pathname.startsWith('/admin/tasks')) {
    routeName = 'adminTasks';
  } else if (pathname.startsWith('/admin/diagnose')) {
    routeName = 'adminDiagnostics';
  } else if (pathname.startsWith('/admin/error-logs')) {
    routeName = 'adminDiagnosticsLogs';
  } else if (pathname.startsWith('/admin')) {
    routeName = 'admin';
  } else if (pathname.startsWith('/settings')) {
    routeName = 'settings';
  } else if (pathname.startsWith('/diagnostics')) {
    routeName = 'diagnostics';
  } else if (!routeName || routeName === '') {
    // Default fallback for other pages
    if (pathname === '/' || pathname === '') {
      routeName = 'home';
    } else if (pathname.startsWith('/group/')) {
      routeName = 'publicGroup';
    } else if (pathname.startsWith('/photo/')) {
      routeName = 'photo';
    }
  }

  // Group routes to avoid tearing down the entire layout when swapping nested sub-views
  const getPageGroupKey = (rName: string) => {
    if (rName === 'home' || rName === 'photo' || rName === 'photoSlash') {
      return 'public-home';
    }
    if (
      rName === 'admin' || 
      rName === 'adminSlash' || 
      rName === 'adminBatchEdit' || 
      rName === 'adminBatchEditSlash' || 
      rName === 'adminTasks' || 
      rName === 'adminTasksSlash' || 
      rName === 'adminDiagnostics' || 
      rName === 'adminDiagnosticsSlash' || 
      rName === 'adminDiagnosticsLogs' || 
      rName === 'adminDiagnosticsLogsSlash' || 
      rName === 'settings' || 
      rName === 'settingsSlash'
    ) {
      return 'admin-dashboard';
    }
    if (rName === 'diagnostics' || rName === 'diagnosticsSlash') {
      return 'diag-dashboard';
    }
    if (rName === 'publicGroup' || rName === 'publicGroupSlash') {
      return 'public-group';
    }
    if (rName === 'adminGroup' || rName === 'adminGroupSlash') {
      return 'admin-group';
    }
    return rName || 'unknown';
  };

  const groupKey = getPageGroupKey(routeName || '');

  const getPage = () => {
    if (!routeName) {
      logger.warn('[Router] No route matched!', pathname);
      return <NotFoundPage />;
    }
    logger.debug('[Router] Matched route:', routeName);

    switch (routeName) {
      case "home":
      case "photo":
      case "photoSlash":
        return <PublicPage />;
      case "admin":
      case "adminSlash":
      case "adminBatchEdit":
      case "adminBatchEditSlash":
      case "adminTasks":
      case "adminTasksSlash":
      case "adminDiagnostics":
      case "adminDiagnosticsSlash":
      case "adminDiagnosticsLogs":
      case "adminDiagnosticsLogsSlash":
      case "settings":
      case "settingsSlash":
        return <AdminPage />;
      case "diagnostics":
      case "diagnosticsSlash":
        return (
          <AdminAuthGate>
            <DiagDashboard />
          </AdminAuthGate>
        );
      case "publicGroup":
      case "publicGroupSlash":
        return <PublicGroupDetailPage />;
      case "adminGroup":
      case "adminGroupSlash":
        return (
          <AdminAuthGate>
            <AdminGroupDetailPage />
          </AdminAuthGate>
        );
      default:
        return <NotFoundPage />;
    }
  };

  return (
    <>
      <AnimatePresence>
        <motion.div 
          key={groupKey}
          variant="fade"
          transition="easeOut"
          className="flex-1 flex flex-col h-full w-full"
        >
          <Suspense fallback={<LoadingScreen />}>
            {getPage()}
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
