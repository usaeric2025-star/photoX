import React from 'react';
import { Navigate, useNavigate, useRouterState } from '@tanstack/react-router';
import { useAuth } from '@/hooks/core/auth/useAuth';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ROUTES } from '@/config/constants';
import { useStore } from '@tanstack/react-store';

export const RootRouter = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading, isPending } = useAuth();
  
  if (isLoading || isPending) {
    return <LoadingScreen />;
  }

  // If logged in, redirect to admin page
  if (isAuthenticated) {
    return <Navigate to={ROUTES.ADMIN} replace />;
  }

  // Otherwise, render the requested route (e.g. PublicPage)
  return <>{children}</>;
};
