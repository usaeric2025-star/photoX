import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFeedback } from '../hooks';
import { AdminViewContent } from './AdminView/index';
import { useAdminDataPrep } from './AdminView/useAdminDataPrep';
import { loginWithGoogle } from '../services/supabaseService';
import { LanguageCode } from '../lib/translations';
import { FullPageLoading } from '../components/FullPageLoading';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminView() {
  const { showError } = useFeedback();
  const prep = useAdminDataPrep();
  const { user, authChecked, logout, navigate, t, lang, sessionValue, photoValue, uiValue, infinitePhotosQuery } = prep;

  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [hasInitialLoaded, setHasInitialLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  const isInitialLoading = !authChecked || !minTimeElapsed;

  useEffect(() => {
    if (!isInitialLoading && !hasInitialLoaded) {
      setHasInitialLoaded(true);
    }
  }, [isInitialLoading, hasInitialLoaded]);

  return (
    <div className="flex flex-col fixed inset-0 bg-brand-bg overflow-hidden">
      <AnimatePresence mode="wait">
        {isInitialLoading && !hasInitialLoaded ? (
          <FullPageLoading key="admin-loader" />
        ) : !user && sessionStorage.getItem('isStaffMode') !== 'true' ? (
          <motion.div
            key="login-gate"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full h-full min-h-screen flex items-center justify-center bg-[#FDFBF7]"
          >
            <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-sm text-center border border-slate-100">
               <h2 className="text-xl font-black text-slate-800 tracking-tight leading-tight mb-2">{t.adminTitle}</h2>
               <p className="text-sm text-slate-500 mb-8">{t.adminSub}</p>
               <button 
                 onClick={async () => {
                     try {
                       await loginWithGoogle();
                     } catch(e) {
                       showError(e, t.loginFailedAlert);
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
          </motion.div>
        ) : (
          <motion.div
            key="admin-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col h-full"
          >
            <AdminViewContent 
              user={user} 
              authChecked={authChecked} 
              logout={logout} 
              t={t}
              lang={lang as LanguageCode}
              sessionValue={sessionValue}
              photoValue={photoValue}
              uiValue={uiValue}
              hasNextPage={infinitePhotosQuery.hasNextPage}
              isFetchingNextPage={infinitePhotosQuery.isFetchingNextPage}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
