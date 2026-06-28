import { useAppRoute } from "@/lib/router";
import { lazy, Suspense } from "react";
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

  const getPage = () => {
    if (!route) {
      console.warn('[Router] No route matched!', window.location.pathname);
      return <NotFoundPage />;
    }
    console.log('[Router] Matched route:', route.name);

    switch (route.name) {
      case "home":
      case "photo":
        return <PublicPage />;
      case "admin":
      case "adminBatchEdit":
      case "adminTasks":
      case "adminDiagnostics":
      case "adminDiagnosticsLogs":
      case "settings":
        return <AdminPage />;
      case "diagnostics":
        return (
          <AdminAuthGate>
            <DiagDashboard />
          </AdminAuthGate>
        );
      case "publicGroup":
        return <PublicGroupDetailPage />;
      case "adminGroup":
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
      <div className="flex-1 flex flex-col h-full w-full animate-fade-in">
        <Suspense fallback={<LoadingScreen />}>
          {getPage()}
        </Suspense>
      </div>
    </>
  );
}
