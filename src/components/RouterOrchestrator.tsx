import { lazy, Suspense } from "react";
import { ErrorBoundary } from "#src/components/shared/ErrorBoundary.js";
import { motion, AnimatePresence } from "lite-sleek";
import { Switch, Route, useLocation } from "wouter";
import { NotFoundPage } from "#src/pages/NotFoundPage.js";
import { LoadingScreen } from "./ui/LoadingScreen.js";
import { useAuth } from "#lib/store/index.js";

const PublicPage = lazy(() => import("#src/pages/PublicPage.js"));
const AdminPage = lazy(() => import("#src/pages/AdminPage/index.js"));
const PublicGroupDetailPage = lazy(() => import("#src/features/group/PublicGroupDetail.js").then(m => ({ default: m.PublicGroupDetailPage })));
const AdminGroupDetailPage = lazy(() => import("#src/features/group/AdminGroupDetail.js").then(m => ({ default: m.AdminGroupDetailPage })));
const AdminAuthGate = lazy(() => import("./admin/AdminAuthGate.js").then(m => ({ default: m.AdminAuthGate })));
const SettingsPage = lazy(() => import("#src/features/settings/SettingsPage.js").then(m => ({ default: m.SettingsPage })));
const DiagDashboard = lazy(() => import("#src/features/diagnostics/DiagDashboard.js").then(m => ({ default: m.DiagDashboard })));

/**
 * ⚠️ 路由配置锁定
 * - ADMIN_PATH 和 PUBLIC_PATH 禁止修改
 * - 新增 Admin 子页面去 AdminPage.tsx 或 AdminPageContent.tsx 添加
 * - 修改前请阅读 AGENTS.md 中的路由规范
 * - 任何修改必须经过 review 并更新文档
 */
const ADMIN_PATH = '/admin/:subpath*';
const PUBLIC_PATH = '/';

const AdminGroupDetailRoute = () => (
  <AdminAuthGate>
    <AdminGroupDetailPage />
  </AdminAuthGate>
);

export function RouterOrchestrator() {
  const [location] = useLocation();
  const { isLoading: isAuthLoading } = useAuth();
  
  const getPageGroupKey = (pathname: string) => {
    if (pathname === '/' || pathname.startsWith('/photo/')) return 'public-home';
    if (pathname.startsWith('/admin')) return 'admin-dashboard';
    if (pathname.startsWith('/group/')) return 'public-group';
    return pathname;
  };

  const groupKey = getPageGroupKey(location);

  if (isAuthLoading) {
    return <LoadingScreen />;
  }

  // Admin 强制守卫 (简化路由匹配，避免 wouter 对子路由的 404)
  if (location.startsWith('/admin') || location.startsWith('/settings') || location.startsWith('/diagnostics')) {
    return (
      <AnimatePresence>
        <motion.div 
          key="admin-dashboard"
          variant="fade"
          transition="easeOut"
          className="flex-1 flex flex-col h-full w-full"
        >
          <ErrorBoundary>
            <Suspense fallback={<LoadingScreen />}>
              <AdminPage />
            </Suspense>
          </ErrorBoundary>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <motion.div 
        key={groupKey}
        variant="fade"
        transition="easeOut"
        className="flex-1 flex flex-col h-full w-full"
      >
        <ErrorBoundary>
          <Suspense fallback={<LoadingScreen />}>
            <Switch>
              <Route path={PUBLIC_PATH} component={PublicPage} />
              <Route path="/photo/:photoId" component={PublicPage} />
              <Route path="/group/:slug" component={PublicGroupDetailPage} />
              
              <Route component={NotFoundPage} />
            </Switch>
          </Suspense>
        </ErrorBoundary>
      </motion.div>
    </AnimatePresence>
  );
}
