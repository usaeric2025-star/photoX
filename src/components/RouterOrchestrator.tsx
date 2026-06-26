import { useAppRoute } from "@/lib/router";
import { lazy, Suspense } from "react";
import PublicPage from "@/pages/PublicPage";
import AdminPage from "@/pages/AdminPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { PublicGroupDetailPage } from "@/features/group/public/GroupDetailPage";
import { AdminGroupDetailPage } from "@/features/group/admin/GroupDetailPage";
import { AdminAuthGate } from "@/components/admin/AdminAuthGate";
import { LoadingScreen } from "./ui/LoadingScreen";
import { DialogContainer } from "./layout/DialogContainer";

const SettingsPage = lazy(() => import("@/features/settings/SettingsPage").then(m => ({ default: m.SettingsPage })));
const DiagDashboard = lazy(() => import("@/features/diagnostics/DiagDashboard").then(m => ({ default: m.DiagDashboard })));

export function RouterOrchestrator() {
  const route = useAppRoute();

  const getPage = () => {
    if (!route) {
      return <NotFoundPage />;
    }

    switch (route.name) {
      case "home":
      case "photo":
        return <PublicPage />;
      case "admin":
      case "adminBatchEdit":
        return <AdminPage />;
      case "settings":
      case "adminTasks":
      case "adminDiagnostics":
      case "adminDiagnosticsLogs":
        return (
          <AdminAuthGate>
            <SettingsPage />
          </AdminAuthGate>
        );
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
      <div key={route?.name || '404'} className="flex-1 flex flex-col h-full w-full animate-fade-in">
        <Suspense fallback={<LoadingScreen />}>
          {getPage()}
        </Suspense>
      </div>
      <DialogContainer />
    </>
  );
}
