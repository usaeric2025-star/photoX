import { createRouter } from "@zoontek/chicane";
import { uiStore } from "./store/uiStore";

const q = "?q&:cat&:tag[]&:sort&:status&:batch&:view&:columns&:showGroupsCollapsed&:photoId&:modal&:groupId&:anchor&:selected";

export const Router = createRouter({
  home: `/${q}`,
  publicGroup: `/group/:slug${q}`,
  adminGroup: `/admin/group/:id${q}`,
  photo: `/photo/:photoId${q}`,
  admin: `/admin${q}`,
  adminTasks: `/admin/tasks${q}`,
  adminDiagnostics: `/admin/diagnose${q}`,
  adminDiagnosticsLogs: `/admin/error-logs${q}`,
  adminBatchEdit: `/admin/batch-edit${q}`,
  settings: `/settings${q}`,
  diagnostics: `/diagnostics${q}`
});

export const ALL_ROUTES = [
  "home", "publicGroup", "adminGroup", "photo", "admin", "adminTasks",
  "adminDiagnostics", "adminDiagnosticsLogs", "adminBatchEdit", "settings", "diagnostics"
] as const;



