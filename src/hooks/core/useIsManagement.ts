import { useRouterSafe } from '@/hooks/core/useRouterSafe';

/**
 * useIsManagement
 * Returns true if the current route is within the /admin path.
 * Consolidates window.location or checks.
 */
export function useIsManagement() {
  const location = useRouterSafe().location;
  const isManagement = location.pathname.startsWith('/admin');
  
  return isManagement;
}
