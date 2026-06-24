import { Router, useAppRoute } from '@/router';
import { useCallback } from 'react';

// ✅ 統一的路由 Hook，元件只使用這個
export function useAppRouter() {
  const route = useAppRoute();

  if (!route) {
    return {
      route: undefined,
      params: {},
      navigate: {} as Record<string, (...args: unknown[]) => void>,
      currentUrl: typeof window !== 'undefined' ? window.location.href : '',
    };
  }

  // 取得當前路由名稱
  const currentRoute = route.name;

  // 取得路由參數 (型別安全)
  const params = route.params;

  // 統一導航方法
  const navigate = {
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

  // 取得當前 URL（用於分享、日誌）
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  return {
    route: currentRoute,
    params,
    navigate,
    currentUrl,
  };
}
