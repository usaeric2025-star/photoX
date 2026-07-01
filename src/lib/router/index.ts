import { Router, ALL_ROUTES } from '#src/router';
import { useCallback } from 'react';
import { ErrorFactory } from '#lib/error/ErrorFactory';

// ✅ 唯一出口：永遠不傳參數
export function useAppRoute() {
  try {
    const route = Router.useRoute(ALL_ROUTES);
    return route || { query: {}, params: {}, name: '' };
  } catch (e) {
    ErrorFactory.handle(e, { context: 'useAppRoute.useRoute' });
    return { query: {}, params: {}, name: '' };
  }
}

// ✅ 統一的路由 Hook
export function useAppRouter() {
  const route = useAppRoute();
  const navigate = useNavigation();

  return { 
    route, 
    params: route?.params || {}, 
    navigate 
  };
}
export function useNavigation() {
    return {
      home: useCallback(() => Router.push("home"), []),
      photo: useCallback((photoId: string) => Router.push("photo", { photoId }), []),
      publicGroup: useCallback((slug: string) => Router.push("publicGroup", { slug }), []),
      adminGroup: useCallback((id: string) => Router.push("adminGroup", { id }), []),
      admin: useCallback(() => Router.push("admin"), []),
      adminTasks: useCallback(() => Router.push("adminTasks"), []),
      adminDiagnostics: useCallback(() => Router.push("adminDiagnostics"), []),
      adminDiagnosticsLogs: useCallback(() => Router.push("adminDiagnosticsLogs"), []),
      adminBatchEdit: useCallback(() => Router.push("adminBatchEdit"), []),
      settings: useCallback(() => Router.push("settings"), []),
      diagnostics: useCallback(() => Router.push("diagnostics"), []),
    };
}

export type Navigation = ReturnType<typeof useNavigation>;
