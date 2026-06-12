import { useRouterSafe } from '@/hooks/core/useRouterSafe';
import { useMemo } from 'react';

/**
 * useIsManagement
 * Returns true if the current route is within the /admin path.
 * Consolidates window.location or checks.
 */
export function useIsManagement() {
  const location = useRouterSafe().location;
  const isManagement = useMemo(() => location.pathname.startsWith('/admin'), [location.pathname]);
  
  return isManagement;
}
