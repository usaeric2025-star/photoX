import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useGalleryStore as useStore } from '@/store'
import { useAuth } from './useAuth'
import { ROUTES } from '@/config/constants'

export function useRouteGuard() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, isLoading } = useAuth()
  const lastPathRef = useRef(location.pathname)
  
  // 重置 UI 状态（仅在离开合组页面时）
  const resetUI = useStore((state) => state.resetUI)
  const activeGroupId = useStore((state) => state.activeGroupId)
  
  useEffect(() => {
    // 防止在同一个路径重复执行
    if (lastPathRef.current === location.pathname) {
      return
    }
    lastPathRef.current = location.pathname
    
    // 离开合组页面时清空 activeGroupId
    if (activeGroupId && !location.pathname.includes('/group/') && !location.pathname.includes('/g/')) {
      resetUI()
    }
  }, [location.pathname, activeGroupId, resetUI]);
  
  const isStaffMode = useStore((state) => state.isStaffMode)
  
  // 认证检查（不触发刷新，只是重定向）
  useEffect(() => {
    if (isLoading) return
    
    const isAdminRoute = location.pathname.startsWith(ROUTES.ADMIN)
    const isLoginRoute = location.pathname === ROUTES.LOGIN
    
    if (!user && !isStaffMode && isAdminRoute && !isLoginRoute) {
      navigate(ROUTES.LOGIN, { replace: true })
    }
    
    if ((user || isStaffMode) && isLoginRoute) {
      navigate(ROUTES.ADMIN, { replace: true })
    }
  }, [user, isStaffMode, isLoading, location.pathname, navigate])
}
