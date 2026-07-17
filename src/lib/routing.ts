/**
 * PhotoX 核心路由配置 (長久方案)
 * 用於統一前端導航、權限檢查與 404 誤判過濾
 */

/**
 * 獲取路由分組 Key，用於 AnimatePresence 切換動畫
 */
export function getRouteGroupKey(pathname: string): string {
  const normPath = pathname === '' ? '/' : pathname.toLowerCase();
  
  if (normPath === '/' || normPath.startsWith('/photo/')) return 'public-home';
  
  if (
    normPath.startsWith('/admin') || 
    normPath.startsWith('/settings') || 
    normPath.startsWith('/diagnostics')
  ) {
    return 'admin-dashboard';
  }

  if (normPath.startsWith('/group/')) return 'public-group';
  
  return normPath;
}

/**
 * 判斷是否為管理端路徑 (需特殊佈局或權限)
 */
export function isAdminRoute(pathname: string): boolean {
  const normPath = pathname.toLowerCase();
  return (
    normPath.startsWith('/admin') || 
    normPath.startsWith('/settings') || 
    normPath.startsWith('/diagnostics')
  );
}
