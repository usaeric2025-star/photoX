import React from 'react';
import { AppLink } from '#src/components/router/AppLink.js';
import { Icon } from '#src/components/ui/Icon.js';
import { ErrorFactory } from '#lib/error/index.js';
import { useTranslation } from '#src/hooks/index.js';

export function NotFoundPage() {
  const { t } = useTranslation();
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

  // Detect and bypass transition-induced false positive 404s
  const isTransition = React.useMemo(() => {
    if (!pathname) return false;
    
    // Normalize path to strip trailing slash for matching (unless it's exactly "/")
    const normPath = pathname !== '/' && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
    
    // Public routes
    if (normPath === '/') return true;
    if (normPath.startsWith('/photo/')) return true;
    if (normPath.startsWith('/group/')) return true;

    // Admin, settings, or diagnostics routes (consistent with RouterOrchestrator)
    if (
      normPath.startsWith('/admin') || 
      normPath.startsWith('/settings') || 
      normPath.startsWith('/diagnostics')
    ) {
      return true;
    }

    return false;
  }, [pathname]);

  React.useEffect(() => {
    if (isTransition) return;
    
    // Log diagnostics only for actual invalid pages
    ErrorFactory.capture(new Error(`404: ${pathname}`));
  }, [isTransition, pathname]);

  if (isTransition) {
    return null;
  }

  
  // Decide what kind of 404 this is
  const config = React.useMemo(() => {
    if (pathname.startsWith('/api/')) {
      return {
        title: t('apiNotFoundTitle') || 'API Error',
        description: t('apiNotFoundDesc', pathname) || 'API endpoint not found',
        icon: 'server'
      };
    }
    if (pathname.startsWith('/admin/')) {
      return {
        title: t('adminNotFoundTitle') || 'Admin Error',
        description: t('adminNotFoundDesc', pathname) || 'Admin resource not found',
        icon: 'shield-alert'
      };
    }
    if (pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|pdf)$/i)) {
      return {
        title: t('resourceNotFoundTitle') || 'Resource Not Found',
        description: t('resourceNotFoundDesc', pathname) || 'Image or file not found',
        icon: 'file-warning'
      };
    }
    
    return {
      title: t('pathNotFoundTitle') || 'Page Not Found',
      description: t('pathNotFoundDesc', pathname) || `Path "${pathname}" not found`,
      icon: 'map-pinned'
    };
  }, [pathname, t]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 sm:p-12 text-center border border-slate-100 animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-8 relative">
          <Icon name={config.icon as any} size={40} className="text-slate-300" />
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-4 border-white">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">{config.title}</h1>
        <p className="text-slate-500 leading-relaxed mb-8 text-[15px]">
          {config.description}
        </p>

        <div className="space-y-3">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left overflow-hidden">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">{t('errorDiagnose') || 'Diagnosis'}</p>
            <code className="text-xs text-slate-600 break-all font-mono">
              GET {pathname}
              <br />
              Referer: {document.referrer || 'Direct'}
            </code>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4">
            <AppLink 
              to="/" 
              className="flex items-center justify-center gap-2 h-12 bg-slate-950 text-white rounded-xl text-sm font-semibold hover:bg-black transition-all"
            >
              <Icon name="home" size={16} />
              {t('backToHome') || 'Home'}
            </AppLink>
            <button 
              onClick={() => window.history.back()}
              className="flex items-center justify-center gap-2 h-12 bg-white text-slate-700 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all"
            >
              <Icon name="arrow-left" size={16} />
              {t('goBack') || 'Go Back'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
