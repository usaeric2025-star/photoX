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

  // [V2.10-REMOVED-FORCED-REDIRECT]
  // Allow admins to see the public home page for smooth transitions
  // If they want to go to admin, they can use the sidebar/header links.
  
  // Otherwise, render the requested route (e.g. PublicPage)
  return <>{children}</>;
};
