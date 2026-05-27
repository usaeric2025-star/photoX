import { useEffect, useRef } from 'react'
import { useRouterState, useNavigate } from '@tanstack/react-router'
import { useGalleryStore as useStore } from '@/store'
import { useAuth } from '@/hooks/core/auth/useAuth'
import { ROUTES } from '@/config/constants'

/**
 * @deprecated This hook is kept as a fallback defense layer.
 * Use declarative root beforeLoad checks with RouteAccessContract instead.
 */
export function useRouteGuard() {
  const state = useRouterState()
  const pathname = state.location.pathname
  const navigate = useNavigate()
  const { user, isLoading } = useAuth()
  const lastPathRef = useRef(pathname)
  
  // 重置 UI 状态（仅在离开合组页面时）
  const resetUI = useStore((state) => state.resetUI)
  const activeGroupId = useStore((state) => state.activeGroupId)
  
  useEffect(() => {
    // 防止在同一个路径重复执行
    if (lastPathRef.current === pathname) {
      return
    }
    lastPathRef.current = pathname
    
    // 离开合组页面时清空 activeGroupId
    if (activeGroupId && !pathname.includes('/group/') && !pathname.includes('/g/')) {
      resetUI()
    }
  }, [pathname, activeGroupId, resetUI]);
  
  const isStaffMode = useStore((state) => state.isStaffMode)
  
  // 认证检查（不触发刷新，只是重定向）
  useEffect(() => {
    if (isLoading) return
    
    const isAdminRoute = pathname.startsWith(ROUTES.ADMIN)
    const isLoginRoute = pathname === ROUTES.LOGIN
    
    if (!user && !isStaffMode && isAdminRoute && !isLoginRoute) {
      navigate({ to: ROUTES.LOGIN, replace: true });
    }
    
    if ((user || isStaffMode) && isLoginRoute) {
      navigate({ to: ROUTES.ADMIN, replace: true });
    }
  }, [user, isStaffMode, isLoading, pathname, navigate])
}
