import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { AdminViewContent } from './AdminView/index';
import { useAdminDataPrep } from './AdminView/useAdminDataPrep';
import { loginWithGoogle } from '../services/supabaseService';
import { LanguageCode } from '../lib/translations';

export default function AdminView() {
  const prep = useAdminDataPrep();
  const { user, authChecked, logout, navigate, t, lang, sessionValue, photoValue, uiValue, infinitePhotosQuery } = prep;

  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      setPageError(e.message);
      console.error(`[Runtime] ${e.message}`);
    };
    const handleRejection = (e: PromiseRejectionEvent) => {
      const msg = String(e.reason?.message || e.reason);
      setPageError(msg);
      console.error(`[UncaughtRejection] ${msg}`);
    };
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  const errorContent = pageError ? (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white p-4 font-bold overflow-auto max-h-[30vh]">
      <div className="flex justify-between">
        <span>Error: {pageError}</span>
        <button onClick={() => setPageError(null)} className="underline">Dismiss</button>
      </div>
    </div>
  ) : null;

  if (!authChecked) {
    return (
       <ErrorBoundary key="auth-verifying">
        {errorContent}
        <div className="w-full h-full min-h-screen flex flex-col bg-[#FDFBF7] overflow-hidden">
           <div className="h-16 px-6 border-b border-slate-100 flex items-center justify-between">
              <div className="h-6 w-32 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-8 w-8 bg-slate-100 rounded-full animate-pulse" />
           </div>
           <div className="flex-1 p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="aspect-[4/5] bg-white rounded-2xl border border-slate-100 animate-pulse relative overflow-hidden">
                   <div className="absolute inset-0 bg-slate-50" />
                   <div className="absolute bottom-0 left-0 right-0 p-3 bg-white/80 backdrop-blur-sm space-y-2">
                       <div className="h-3 w-3/4 bg-slate-100 rounded" />
                       <div className="h-2 w-1/2 bg-slate-50 rounded" />
                   </div>
                </div>
              ))}
           </div>
           <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-sm border border-slate-100 z-50 flex items-center gap-3">
              <div className="w-3 h-3 border-2 border-brand-gold/20 border-t-brand-gold rounded-full animate-spin"></div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-brand-gold">Session Check</p>
           </div>
        </div>
       </ErrorBoundary>
    );
  }

  if (!user && sessionStorage.getItem('isStaffMode') !== 'true') {
    return (
             <ErrorBoundary key="login-gate">
              {errorContent}
              <div className="w-full h-full min-h-screen flex items-center justify-center bg-[#FDFBF7]">
                 <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-sm text-center border border-slate-100">
                    <h2 className="text-xl font-black text-slate-800 tracking-tight leading-tight mb-2">{t.adminTitle}</h2>
                    <p className="text-sm text-slate-500 mb-8">{t.adminSub}</p>
                    <button 
                      onClick={async () => {
                          try {
                            await loginWithGoogle();
                          } catch(e) {
                            const error = e instanceof Error ? e : new Error(String(e));
                            toast.error(`${t.loginFailedAlert} ${error.message || JSON.stringify(e)}`);
                          }
                      }}
                      className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20 active:scale-[0.98] hover:bg-blue-700 transition-all mb-4"
                    >
                      {t.googleLoginBtn}
                    </button>
                    <button
                      onClick={() => {
                        try { sessionStorage.removeItem('isStaffMode'); } catch {}
                        navigate('/');
                      }}
                      className="text-sm text-slate-400 hover:text-slate-600 font-medium"
                    >
                      {t.backToGallery}
                    </button>
                 </div>
              </div>
             </ErrorBoundary>
    );
  }

  return (
    <AdminViewContent 
      user={user} 
      authChecked={authChecked} 
      logout={logout} 
      errorContent={errorContent}
      t={t}
      lang={lang as LanguageCode}
      sessionValue={sessionValue}
      photoValue={photoValue}
      uiValue={uiValue}
      hasNextPage={infinitePhotosQuery.hasNextPage}
      isFetchingNextPage={infinitePhotosQuery.isFetchingNextPage}
    />
  );
}
