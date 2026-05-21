import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import PublicView from './pages/PublicView';
import AdminView from './pages/AdminView';
import { useAuth } from './hooks/useAuth';
import { useRouteGuard } from './hooks/useRouteGuard';
import { clearExpiredCaches } from './utils/indexedDB';
import { supabase } from './lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { globalHandleError } from './utils/errorHandler';
import { ROUTES } from './config/constants';

function Fallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen p-4 text-center">
      <p className="text-red-500 mb-4">页面出错了: {error.message}</p>
      <button 
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-slate-900 text-white rounded-lg"
      >
        重试
      </button>
    </div>
  );
}

function AnimatedRoutes({ user }: { user: any }) {
  useRouteGuard(); // <--- 使用路由守卫
  const location = useLocation();
  const { hash, groupId } = location.state || {};


  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path={ROUTES.HOME} element={
            user ? <Navigate to={ROUTES.ADMIN} replace /> : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <PublicView />
              </motion.div>
            )
        } />
        <Route path="/h/:hash" element={
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
            <PublicView />
          </motion.div>
        } />
        <Route path={ROUTES.GROUP(":groupId")} element={
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }}>
            <PublicView />
          </motion.div>
        } />
        <Route path={ROUTES.ADMIN} element={
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }}>
            <AdminView />
          </motion.div>
        } />
        <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function AppRoutes() {
  console.log('AppRoutes: Checking auth...', { authChecked: false });
  const { user, authChecked } = useAuth();
  console.log('AppRoutes: Auth checked:', { user: !!user, authChecked });
  
  // App-level initialization logic can stay, but fetchSettings is handled by useSettings hook.

  useEffect(() => {
    // 1. Detect OAuth error in URL hash
    const hash = window.location.hash;
    if (hash && hash.includes('error=')) {
        const params = new URLSearchParams(hash.substring(1));
        
        // Build a detailed message from all parameters
        const details: string[] = [];
        params.forEach((value, key) => {
            details.push(`${key}: ${decodeURIComponent(value.replace(/\+/g, ' '))}`);
        });
        
        globalHandleError(new Error(details.join('\n')), '登录发生错误 (OAuth Error)');
        
        // Clear hash to prevent error showing up on refresh
        window.history.replaceState(null, '', window.location.pathname);
    }

    // 2. Background cache cleanup
    clearExpiredCaches(7).catch(err => globalHandleError(err, '本地缓存自动清理失败', true));
    
    // 3. Supabase Session Health Check
    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) {
        if (!session && user) {
          console.warn('Session 丢失，建议重新登录');
        }
      }
    }).catch((e: any) => {
      if (active) globalHandleError(e, '验证用户会话会话失败', true);
    });

    return () => {
        active = false;
    };
  }, [user]);

  // Handle Global Search Debouncing via local state or query logic
  
  if (!authChecked) return null;

  return (
    <ErrorBoundary FallbackComponent={Fallback}>
      <BrowserRouter>
        <AnimatedRoutes user={user} />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
