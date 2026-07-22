import React from 'react';
import { AppLink } from '#src/components/router/AppLink.js';
import { Icon } from '#src/components/ui/Icon.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { logger } from '#lib/logger.js';
import { useTranslation } from '#src/hooks/index.js';
import { useNormalizedLocation } from '#src/hooks/core/index.js';

export function NotFoundPage() {
  const { t } = useTranslation();
  const [pathname, setLocation] = useNormalizedLocation();
  const [copied, setCopied] = React.useState(false);
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
      referrer: typeof document !== 'undefined' ? (document.referrer || 'direct') : 'direct',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      timestamp: new Date().toISOString(),
      online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    };

    logger.error('[NotFoundPage] 404 或未找到路由事件被触发', logPayload);

    // Save to session logs for Admin Diagnostic view
    try {
      const existing = JSON.parse(sessionStorage.getItem('photoX_404_logs') || '[]');
      existing.unshift(logPayload);
      sessionStorage.setItem('photoX_404_logs', JSON.stringify(existing.slice(0, 20)));
    } catch {
      // ignore session storage quota errors
    }

    const timer = setTimeout(() => {
      ErrorFactory.capture(new Error(`404: ${pathname}`));
    }, 500);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pathname]);

  const isAdminPath = pathname.startsWith('/admin') || pathname.startsWith('/settings') || pathname.startsWith('/diagnostics');

  // Decide page display style
  const config = React.useMemo(() => {
    if (!isOnline) {
      return {
        title: '網絡未連接 (Offline)',
        description: '您的設備似乎断开了網絡連接，請檢查網絡設置后重試。',
        icon: 'wifi-off',
        badge: 'Offline'
      };
    }
    if (pathname.startsWith('/api/')) {
      return {
        title: t('apiNotFoundTitle') || 'API 接口未找到',
        description: t('apiNotFoundDesc', pathname) || `未找到此 API 路由接口：${pathname}`,
        icon: 'server',
        badge: 'API 404'
      };
    }
    if (isAdminPath) {
      return {
        title: t('adminNotFoundTitle') || '管理頁面或資源不存在',
        description: t('adminNotFoundDesc', pathname) || `您訪問的管理子路徑「${pathname}」不存在或已被移除。`,
        icon: 'shield-alert',
        badge: 'Admin 404'
      };
    }
    if (pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|pdf)$/i)) {
      return {
        title: t('resourceNotFoundTitle') || '文件或資源未找到',
        description: t('resourceNotFoundDesc', pathname) || `請求的媒體文件资源「${pathname}」不存在。`,
        icon: 'file-warning',
        badge: 'Resource 404'
      };
    }
    return {
      title: t('pathNotFoundTitle') || '页面未找到',
      description: t('pathNotFoundDesc', pathname) || `请求的页面路径「${pathname}」不存在或已被移走。`,
      icon: 'map-pinned',
      badge: '404'
    };
  }, [pathname, isOnline, isAdminPath, t]);

  const handleReload = () => {
    window.location.reload();
  };

  const handleClearCacheAndReload = () => {
    try {
      sessionStorage.clear();
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }
    } catch {
      // ignore error
    }
    window.location.href = window.location.pathname + '?reset=' + Date.now();
  };

  const handleCopyDiag = () => {
    const diagText = [
      `[PhotoX 404 Diagnostic Log]`,
      `Time: ${new Date().toLocaleString()}`,
      `Path: ${pathname}`,
      `Full URL: ${window.location.href}`,
      `Referrer: ${document.referrer || 'Direct'}`,
      `Online: ${isOnline}`,
      `User Agent: ${navigator.userAgent}`
    ].join('\n');

    navigator.clipboard.writeText(diagText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-slate-50/80 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-6 sm:p-10 text-center border border-slate-100 animate-in fade-in zoom-in duration-300">
        <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6 relative border border-slate-100 shadow-sm">
          <Icon name={config.icon as any} size={36} className="text-slate-400" />
          <div className="absolute -top-1.5 -right-1.5 px-2 py-0.5 bg-red-500 text-white font-mono text-[10px] font-bold rounded-full border-2 border-white shadow-sm">
            {config.badge}
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">{config.title}</h1>
        <p className="text-slate-500 leading-relaxed mb-6 text-[14px]">
          {config.description}
        </p>

        <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100 text-left mb-6 relative group">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">診斷信息 (Diagnostics)</p>
            <button
              type="button"
              onClick={handleCopyDiag}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs transition-colors"
            >
              <Icon name={copied ? "check" : "copy"} size={12} className={copied ? "text-emerald-500" : ""} />
              {copied ? '已複製' : '複製日誌'}
            </button>
          </div>
          <code className="text-xs text-slate-600 break-all font-mono block leading-relaxed">
            GET {pathname}
            <br />
            <span className="text-slate-400 text-[11px]">Referer: {document.referrer || 'Direct'}</span>
          </code>
        </div>

        {/* Dynamic Nav Actions */}
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleReload}
              className="flex items-center justify-center gap-2 h-11 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-black active:scale-[0.98] transition-all shadow-xs"
            >
              <Icon name="rotate-cw" size={15} />
              刷新重新載入
            </button>

            {isAdminPath ? (
              <AppLink
                to="/admin"
                className="flex items-center justify-center gap-2 h-11 bg-slate-100 text-slate-800 rounded-xl text-xs font-semibold hover:bg-slate-200 active:scale-[0.98] transition-all"
              >
                <Icon name="layout-dashboard" size={15} />
                返回管理首頁
              </AppLink>
            ) : (
              <AppLink
                to="/"
                className="flex items-center justify-center gap-2 h-11 bg-slate-100 text-slate-800 rounded-xl text-xs font-semibold hover:bg-slate-200 active:scale-[0.98] transition-all"
              >
                <Icon name="home" size={15} />
                返回相冊首頁
              </AppLink>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="flex items-center justify-center gap-2 h-10 bg-white text-slate-600 border border-slate-200 rounded-xl text-xs font-medium hover:bg-slate-50 active:scale-[0.98] transition-all"
            >
              <Icon name="arrow-left" size={14} />
              返回上一頁
            </button>
            <button
              type="button"
              onClick={handleClearCacheAndReload}
              className="flex items-center justify-center gap-2 h-10 bg-white text-rose-600 border border-rose-100 hover:border-rose-200 rounded-xl text-xs font-medium hover:bg-rose-50/50 active:scale-[0.98] transition-all"
            >
              <Icon name="refresh-cw" size={14} />
              清理緩存並重試
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

