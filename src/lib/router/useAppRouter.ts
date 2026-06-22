import { useRoute, routes } from '@/router';
import { useCallback } from 'react';

// ✅ 統一的路由 Hook，元件只使用這個
export function useAppRouter() {
  const route = useRoute();

  if (!route) {
    return {
      route: undefined,
      params: {},
      navigate: {} as any,
      currentUrl: typeof window !== 'undefined' ? window.location.href : '',
    };
  }

  // 取得當前路由名稱
  const currentRoute = route.name;

  // 取得路由參數 (型別安全)
  const params = route.params;

  // 統一導航方法
  const navigate = {
    home: useCallback(() => routes.home().push(), []),
    photo: useCallback((photoId: string) => routes.photo({ photoId }).push(), []),
    publicGroup: useCallback((slug: string) => routes.publicGroup({ slug }).push(), []),
    adminGroup: useCallback((id: string) => routes.adminGroup({ id }).push(), []),
    admin: useCallback(() => routes.admin().push(), []),
    adminTasks: useCallback(() => routes.adminTasks().push(), []),
    adminDiagnostics: useCallback(() => routes.adminDiagnostics().push(), []),
    adminDiagnosticsLogs: useCallback(() => routes.adminDiagnosticsLogs().push(), []),
    adminBatchEdit: useCallback(() => routes.adminBatchEdit().push(), []),
    settings: useCallback(() => routes.settings().push(), []),
    diagnostics: useCallback(() => routes.diagnostics().push(), []),
  };

  // 取得當前 URL（用於分享、日誌）
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  return {
    route: currentRoute,
    params,
    navigate,
    currentUrl,
  };
}
