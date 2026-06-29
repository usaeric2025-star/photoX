import { createRouter } from "@zoontek/chicane";

export const Router = createRouter({
  home: "/",
  publicGroup: "/group/:slug",
  publicGroupSlash: "/group/:slug/",
  adminGroup: "/admin/group/:id",
  adminGroupSlash: "/admin/group/:id/",
  photo: "/photo/:photoId",
  photoSlash: "/photo/:photoId/",
  admin: "/admin",
  adminSlash: "/admin/",
  adminTasks: "/admin/tasks",
  adminTasksSlash: "/admin/tasks/",
  adminDiagnostics: "/admin/diagnose",
  adminDiagnosticsSlash: "/admin/diagnose/",
  adminDiagnosticsLogs: "/admin/error-logs",
  adminDiagnosticsLogsSlash: "/admin/error-logs/",
  adminBatchEdit: "/admin/batch-edit",
  adminBatchEditSlash: "/admin/batch-edit/",
  settings: "/settings",
  settingsSlash: "/settings/",
  diagnostics: "/diagnostics",
  diagnosticsSlash: "/diagnostics/"
});

export const ALL_ROUTES = [
  "home", "publicGroup", "publicGroupSlash", "adminGroup", "adminGroupSlash", 
  "photo", "photoSlash", "admin", "adminSlash", "adminTasks", "adminTasksSlash",
  "adminDiagnostics", "adminDiagnosticsSlash", "adminDiagnosticsLogs", "adminDiagnosticsLogsSlash", 
  "adminBatchEdit", "adminBatchEditSlash", "settings", "settingsSlash", "diagnostics", "diagnosticsSlash"
] as const;



