import { useAppRoute } from "@/router";
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
const DiagnosticsDashboard = lazy(() => import("@/features/diagnostics/DiagnosticsDashboard").then(m => ({ default: m.DiagnosticsDashboard })));

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
            <DiagnosticsDashboard />
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
      <Suspense fallback={<LoadingScreen />}>
        {getPage()}
      </Suspense>
      <DialogContainer />
    </>
  );
}
