import React from 'react';
import { AppLink } from '#src/components/router/AppLink.js';
import { Icon } from '#src/components/ui/Icon.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { logger } from '#lib/logger.js';
import { useTranslation } from '#src/hooks/index.js';
import { useAppLocation } from '#src/hooks/core/index.js';
import { ADMIN_ROUTES } from '#src/constants/config.js';

export function NotFoundPage() {
  const { t } = useTranslation();
  const [pathname] = useAppLocation();
  const [isOnline, setIsOnline] = React.useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const logPayload = {
      pathname,
      href: typeof window !== 'undefined' ? window.location.href : '',
      timestamp: new Date().toISOString(),
      online: isOnline,
    };

    logger.error('[NotFoundPage] 404 Route not found', logPayload);

    const timer = setTimeout(() => {
      ErrorFactory.capture(new Error(`404: ${pathname}`));
    }, 500);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pathname, isOnline]);

  const isAdminPath = pathname.startsWith('/admin') || pathname.startsWith('/settings') || pathname.startsWith('/diagnostics');

  const config = React.useMemo(() => {
    if (!isOnline) {
      return {
        title: '網絡未連接 (Offline)',
        description: '您的設備似乎斷開了網絡連接，請檢查網絡設置後重試。',
        icon: 'wifi-off',
        badge: 'Offline'
      };
    }
    if (isAdminPath) {
      return {
        title: t('adminNotFoundTitle') || '管理頁面或資源不存在',
        description: t('adminNotFoundDesc', pathname) || `您訪問的管理路徑「${pathname}」不存在或已被移動。`,
        icon: 'shield-alert',
        badge: 'Admin 404'
      };
    }
    return {
      title: t('pathNotFoundTitle') || '頁面未找到',
      description: t('pathNotFoundDesc', pathname) || `請求的頁面路徑「${pathname}」不存在。`,
      icon: 'map-pinned',
      badge: '404'
    };
  }, [pathname, isOnline, isAdminPath, t]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 select-none">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center space-y-6 animate-scale-in">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
          <Icon name={config.icon as any} className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center px-3 py-1 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-full uppercase tracking-wider">
            {config.badge}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {config.title}
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
            {config.description}
          </p>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-mono text-slate-500 break-all">
          {pathname}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-all flex items-center justify-center gap-2"
          >
            <Icon name="refresh-cw" className="w-4 h-4" />
            <span>刷新頁面</span>
          </button>
          
          <AppLink
            to={isAdminPath ? ADMIN_ROUTES.HOME : '/'}
            className="flex-1 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
          >
            <Icon name="home" className="w-4 h-4" />
            <span>返回首頁</span>
          </AppLink>
        </div>
      </div>
    </div>
  );
}
