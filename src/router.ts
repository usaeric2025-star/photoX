import { createRouter } from "@zoontek/chicane";

export const Router = createRouter({
  home: "/",
  publicGroup: "/group/:slug",
  adminGroup: "/admin/group/:id",
  photo: "/photo/:photoId",
  admin: "/admin",
  adminTasks: "/admin/tasks",
  adminDiagnostics: "/admin/diagnose",
  adminDiagnosticsLogs: "/admin/error-logs",
  adminBatchEdit: "/admin/batch-edit",
  settings: "/settings",
  diagnostics: "/diagnostics"
});

export const ALL_ROUTES = [
  "home", "publicGroup", "adminGroup", "photo", "admin", "adminTasks",
  "adminDiagnostics", "adminDiagnosticsLogs", "adminBatchEdit", "settings", "diagnostics"
] as const;



