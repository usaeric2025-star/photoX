import { useAppRoute } from "@/lib/router";
import { logger } from "@/lib/logger";
import { lazy, Suspense } from "react";
import { motion, AnimatePresence } from "lite-sleek";
import PublicPage from "@/pages/PublicPage";
import AdminPage from "@/pages/AdminPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { PublicGroupDetailPage } from "@/features/group/PublicGroupDetail";
import { AdminGroupDetailPage } from "@/features/group/AdminGroupDetail";
import { AdminAuthGate } from "./admin/AdminAuthGate";
import { LoadingScreen } from "./ui/LoadingScreen";

const SettingsPage = lazy(() => import("@/features/settings/SettingsPage").then(m => ({ default: m.SettingsPage })));
const DiagDashboard = lazy(() => import("@/features/diagnostics/DiagDashboard").then(m => ({ default: m.DiagDashboard })));

export function RouterOrchestrator() {
  const route = useAppRoute();
  logger.debug('[RouterOrchestrator] Current route:', route);

  const getPage = () => {
    let routeName = route?.name;
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

    // Fix for nuqs + chicane interaction: 
    // Nuqs updates query string, Chicane might momentarily fail to match
    // resulting in a transient 404 page. We fallback based on pathname.
    if (!routeName) {
      if (pathname === '/' || pathname === '') {
        routeName = 'home';
      } else if (pathname.startsWith('/admin/batch-edit')) {
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
      } else if (pathname.startsWith('/group/')) {
        routeName = 'publicGroup';
      } else if (pathname.startsWith('/photo/')) {
        routeName = 'photo';
      } else if (pathname.startsWith('/settings')) {
        routeName = 'settings';
      } else if (pathname.startsWith('/diagnostics')) {
        routeName = 'diagnostics';
      }
    }

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
          key={route?.name || 'unknown'}
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
