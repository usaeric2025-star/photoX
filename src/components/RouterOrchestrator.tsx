import { useRoute } from "@/router";
import { lazy, Suspense } from "react";
import PublicPage from "@/pages/PublicPage";
import AdminPage from "@/pages/AdminPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { DiagnosticsDashboard } from "@/features/diagnostics";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { PublicGroupDetailPage } from "@/features/group/public/GroupDetailPage";
import { AdminGroupDetailPage } from "@/features/group/admin/GroupDetailPage";
import { LoadingScreen } from "./ui/LoadingScreen";

const PhotoLightbox = lazy(() => import("@/features/lightbox/PhotoLightbox").then(m => ({ default: m.PhotoLightbox })));
const PhotoEditDialog = lazy(() => import("@/features/photo-edit/PhotoEditDialog").then(m => ({ default: m.PhotoEditDialog })));

export function RouterOrchestrator() {
  const route = useRoute();

  const getPage = () => {
    if (!route) {
      return <NotFoundPage />;
    }

    switch (route.name) {
      case "home":
      case "photo":
        return <PublicPage />;
      case "admin":
        return <AdminPage />;
      case "settings":
      case "adminTasks":
      case "adminDiagnostics":
      case "adminDiagnosticsLogs":
        return <SettingsPage />;
      case "diagnostics":
        return <DiagnosticsDashboard />;
      case "publicGroup":
        return <PublicGroupDetailPage />;
      case "adminGroup":
        return <AdminGroupDetailPage />;
      default:
        return <NotFoundPage />;
    }
  };

  return (
    <>
      {getPage()}
      <Suspense fallback={null}>
        <PhotoLightbox />
        <PhotoEditDialog />
      </Suspense>
    </>
  );
}
