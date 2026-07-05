import React from 'react';
import { AppLink } from '#src/components/router/AppLink.js';
import { Icon } from '#src/components/ui/Icon.js';
import { useUI } from '#lib/store/index.js';
import { translations } from '#src/locales/index.js';
import { api } from '#src/lib/api.js';

export const NotFoundPage = () => {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const appLang = useUI(s => s?.appLang) || 'en';
  
  // Extremely safe translation access
  let t: any = {};
  try {
    t = (translations as any)[appLang] || translations.en;
  } catch (e) {
    t = translations.en;
  }
  
  const [copied, setCopied] = React.useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(`Path not found: ${pathname}\nURL: ${window.location.href}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  React.useEffect(() => {
    // Report frontend 404 to backend system logs
    if (pathname && pathname !== '/') {
      api.system['log-error'].$post({
        json: {
          message: `[Client 404] Page Not Found: ${pathname}`,
          level: 'error',
          operation: 'client.404',
          metadata: {
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
          }
        }
      }).catch((err) => {
        console.warn('Failed to report client 404 to server:', err);
      });
    }
  }, [pathname]);
  
  // Categorize the 404 cause based on the current pathname
  const getCauseDetails = () => {
    try {
      if (!pathname) {
        return {
          title: t.notFoundDefaultTitle || 'Page Not Found',
          description: t.notFoundDefaultDesc || 'The page you are looking for does not exist.',
          icon: 'file-question',
          colorClass: 'text-slate-400 bg-slate-100',
        };
      }
      
      if (pathname.startsWith('/api')) {
        return {
          title: t.apiNotFoundTitle || 'API Error',
          description: typeof t.apiNotFoundDesc === 'function' ? t.apiNotFoundDesc(pathname) : (t.apiNotFoundDesc || 'API endpoint not found'),
          icon: 'server-crash',
          colorClass: 'text-red-500 bg-red-50 border border-red-100',
        };
      }
      
      if (pathname.startsWith('/admin')) {
        return {
          title: t.adminNotFoundTitle || 'Admin Error',
          description: typeof t.adminNotFoundDesc === 'function' ? t.adminNotFoundDesc(pathname) : (t.adminNotFoundDesc || 'Admin resource not found'),
          icon: 'shield-alert',
          colorClass: 'text-amber-500 bg-amber-50 border border-amber-100',
        };
      }
      
      if (/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(pathname)) {
        return {
          title: t.resourceNotFoundTitle || 'Resource Not Found',
          description: typeof t.resourceNotFoundDesc === 'function' ? t.resourceNotFoundDesc(pathname) : (t.resourceNotFoundDesc || 'Image or file not found'),
          icon: 'image',
          colorClass: 'text-blue-500 bg-blue-50 border border-blue-100',
        };
      }
      
      return {
        title: t.pathNotFoundTitle || 'Page Not Found',
        description: typeof t.pathNotFoundDesc === 'function' ? t.pathNotFoundDesc(pathname) : (t.pathNotFoundDesc || `Path "${pathname}" not found`),
        icon: 'map-pin-off',
        colorClass: 'text-slate-500 bg-slate-100',
      };
    } catch (e) {
      return {
        title: 'Error',
        description: 'An unexpected error occurred.',
        icon: 'alert-triangle',
        colorClass: 'text-red-500 bg-red-50',
      };
    }
  };

  const details = getCauseDetails();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-800 p-6">
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center text-center max-w-lg w-full animate-scale-in">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-transform duration-500 hover:scale-105 ${details.colorClass}`}>
          <Icon name={details.icon} size={36} />
        </div>
        
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">
          {details.title}
        </h1>
        
        <div className="w-full bg-slate-50 rounded-2xl p-4 mb-8 text-left border border-slate-100">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">{t.errorDiagnose || 'Diagnosis'}</p>
          <p className="text-sm text-slate-600 leading-relaxed">
            {details.description}
          </p>
          {pathname && (
            <div className="mt-3 pt-3 border-t border-slate-200/60 font-mono text-xs text-slate-400 break-all flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                <span>URI: {pathname}</span>
              </div>
              <button 
                onClick={handleCopy}
                className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                title="複製連結 / Copy Link"
              >
                <Icon name={copied ? "check" : "copy"} size={12} className={copied ? "text-emerald-500" : "text-slate-400"} />
                <span className="text-[10px]">{copied ? "已複製" : "複製"}</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
          <AppLink 
            to="/"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm tracking-wide hover:bg-black transition-all active:scale-[0.98]"
          >
            <Icon name="home" size={16} />
            {t.backToHome || 'Home'}
          </AppLink>
          
          <button 
            onClick={() => window.history.back()}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-slate-100 text-slate-700 hover:bg-slate-200 px-6 py-3 rounded-xl font-bold text-sm tracking-wide transition-all active:scale-[0.98]"
          >
            <Icon name="arrow-left" size={16} />
            {t.goBack || 'Go Back'}
          </button>
        </div>
      </div>
    </div>
  );
};
