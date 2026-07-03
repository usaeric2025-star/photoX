import { navigate } from "wouter/use-browser-location";

export const ALL_ROUTES = {
  home: "/",
  photo: "/photo/:photoId",
  publicGroup: "/group/:slug",
  adminGroup: "/admin/group/:id",
  admin: "/admin",
  adminTasks: "/admin/tasks",
  adminDiagnostics: "/diagnostics",
  adminDiagnosticsLogs: "/diagnostics/logs",
  adminBatchEdit: "/admin/batch",
  settings: "/settings",
  diagnostics: "/diagnostics",
} as const;

export const Router = {
  push: (name: string, params?: Record<string, any>) => {
    let path = ALL_ROUTES[name as keyof typeof ALL_ROUTES] as string;
    if (!path) {
      console.warn(`Route ${name} not found`);
      return;
    }
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        path = path.replace(`:${key}`, String(value));
      });
    }
    
    navigate(path);
  },
  
  // Minimal useRoute for compatibility
  useRoute: (routes: Record<string, string>) => {
    const pathname = window.location.pathname;
    for (const [name, path] of Object.entries(routes)) {
      const regexPath = path.replace(/:[^\/]+/g, "([^/]+)");
      const match = pathname.match(new RegExp(`^${regexPath}$`));
      if (match) {
        // Extract params
        const paramNames = (path.match(/:[^\/]+/g) || []).map(s => s.slice(1));
        const params: Record<string, string> = {};
        paramNames.forEach((name, i) => {
          params[name] = match[i + 1];
        });
        return { name, params, query: {} };
      }
    }
    return null;
  }
};
