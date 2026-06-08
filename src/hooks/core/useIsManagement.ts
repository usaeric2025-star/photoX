import { useLocation } from '@tanstack/react-router';
import { useMemo } from 'react';

/**
 * useIsManagement
 * Returns true if the current route is within the /admin path.
 * Consolidates window.location or useLocation checks.
 */
export function useIsManagement() {
  const location = useLocation();
  const isManagement = useMemo(() => location.pathname.startsWith('/admin'), [location.pathname]);
  
  return isManagement;
}
