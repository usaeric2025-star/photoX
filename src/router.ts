import { createRouter } from "@zoontek/chicane";

export const Router = createRouter({
  home: "/?:q&:cat&:tag[]&:sort&:view&:columns&:showGroupsCollapsed&:photoId&:modal&:groupId&:anchor",
  publicGroup: "/group/:slug?:q&:photoId&:modal&:groupId&:anchor",
  adminGroup: "/admin/group/:id?:q&:photoId&:modal&:groupId&:anchor",
  photo: "/photo/:photoId?:modal",
  admin: "/admin?:q&:cat&:tag[]&:sort&:status&:batch&:view&:columns&:photoId&:modal&:groupId&:anchor",
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

export const useAppRoute = () => Router.useRoute(ALL_ROUTES);

