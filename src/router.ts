import { createRouter } from "@zoontek/chicane";
import { uiStore } from "./store/uiStore";

export const Router = createRouter({
  home: "/?q&:cat&:tag[]&:sort&:view&:columns&:showGroupsCollapsed&:photoId&:modal&:groupId&:anchor&:batch&:selected",
  publicGroup: "/group/:slug?:q&:photoId&:modal&:groupId&:anchor&:batch&:selected",
  adminGroup: "/admin/group/:id?:q&:photoId&:modal&:groupId&:anchor&:batch&:selected",
  photo: "/photo/:photoId?:modal",
  admin: "/admin?:q&:cat&:tag[]&:sort&:status&:batch&:view&:columns&:photoId&:modal&:groupId&:anchor&:selected",
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



