import { ReactNode } from 'react';
import { Navigate } from '@tanstack/react-router';
import { useAuth } from '@/hooks';
import { FullPageLoading } from '@/components/FullPageLoading';

interface AdminAuthGuardProps {
  children: ReactNode;
}

export function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const { isLoading, isAuthenticated } = useAuth();

  // 1. 等待认证状态返回，避免在初始化拉取时因为 user 为 null 产生误判，直接执行 Navigate 强行踢到首页
  if (isLoading) {
    return <FullPageLoading />;
  }

  // 2. 验证确实未通过，则跳转至首页
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default AdminAuthGuard;
