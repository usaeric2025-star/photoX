/**
 * PhotoX 核心路由配置 (長久方案)
 * 用於統一前端導航、權限檢查與 404 誤判過濾
 */

export const SYSTEM_PATHS = {
  HOME: '/',
  ADMIN: '/admin',
  SETTINGS: '/settings',
  DIAGNOSTICS: '/diagnostics',
  LOGIN: '/admin', // 目前 AdminAuthGate 處理登錄
  PHOTO_DETAIL: '/photo/:id',
  GROUP_DETAIL: '/group/:id',
};

// 用於 wouter 的匹配模式 (轉換 :id 為正則或通配)
export const PUBLIC_ROUTES = [
  '/',
  '/photo/:id',
  '/group/:id',
  '/category/:id',
  '/tag/:id'
];

export const ADMIN_ROUTES = [
  '/admin',
  '/admin/:any*',
  '/settings',
  '/settings/:any*',
  '/diagnostics',
  '/diagnostics/:any*'
];

/**
 * 判斷當前路徑是否屬於系統已定義的合法入口
 * 用於防止 OAuth 回跳或動態加載時的 404 誤判
 */
export function isSystemPath(path: string): boolean {
  const normPath = path === '' ? '/' : path.toLowerCase();
  
  // 1. 精確匹配
  if (normPath === '/' || normPath === '/admin' || normPath === '/settings' || normPath === '/diagnostics') {
    return true;
  }

  // 2. 子路徑匹配 (基於 prefix)
  const prefixes = [
    '/admin/', 
    '/settings/', 
    '/diagnostics/',
    '/photo/',
    '/group/',
    '/category/',
    '/tag/'
  ];

  return prefixes.some(p => normPath.startsWith(p));
}

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
