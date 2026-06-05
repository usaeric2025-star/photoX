import React from 'react';
import { Navigate, useRouterState } from '@tanstack/react-router';
import { useAuth } from '@/hooks/core/auth/useAuth';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ROUTES } from '@/config/constants';

export const RootRouter = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading, isPending } = useAuth();
  const search = useRouterState({ select: (s) => s.location.search as Record<string, any> });
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  
  if (isLoading || isPending) {
    return <LoadingScreen />;
  }

  // Admin routing logic:
  // - ✅ 已登录 + 无 `?preview=true` → `replace` 跳转 `/admin`
  // - ✅ 已登录 + 有 `?preview=true` → 停留公开页
  const isPreviewRoute = pathname.startsWith(ROUTES.PREVIEW) || search.preview === 'true' || search.preview === true;
  const isPublicRootLike = pathname === '/' || pathname === ROUTES.HOME || pathname.startsWith('/group/');

  if (isAuthenticated && !isPreviewRoute && isPublicRootLike) {
    const targetPath = pathname.startsWith('/group/') ? `/admin${pathname}` : ROUTES.ADMIN;
    return <Navigate to={targetPath} replace />;
  }
  
  // Otherwise, render the requested route (e.g. PublicPage)
  return <>{children}</>;
};
