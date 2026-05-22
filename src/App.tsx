import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { FullPageLoading } from '@/components/FullPageLoading';
import { User } from './types';
import { useAuth } from './hooks/useAuth';
import { useRouteGuard } from './hooks/useRouteGuard';
import { clearExpiredCaches } from './utils/indexedDB';
import { supabase } from './lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { globalHandleError } from './utils/errorHandler';
import { ROUTES } from './config/constants';

const PublicView = lazy(() => import('@/pages/PublicView'));
const AdminView = lazy(() => import('@/pages/AdminView'));

/* Removed Fallback component */

function AnimatedRoutes({ user }: { user: User | null }) {
  useRouteGuard(); // <--- 使用路由守卫
  const location = useLocation();
  const { hash, groupId } = location.state || {};


  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path={ROUTES.HOME} element={
            user ? <Navigate to={ROUTES.ADMIN} replace /> : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <Suspense fallback={<FullPageLoading />}>
                  <PublicView />
                </Suspense>
              </motion.div>
            )
        } />
        <Route path="/h/:hash" element={
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
            <Suspense fallback={<FullPageLoading />}>
              <PublicView />
            </Suspense>
          </motion.div>
        } />
        <Route path={ROUTES.GROUP(":groupId")} element={
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }}>
            <Suspense fallback={<FullPageLoading />}>
              <PublicView />
            </Suspense>
          </motion.div>
        } />
        <Route path={ROUTES.ADMIN} element={
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }}>
            <Suspense fallback={<FullPageLoading />}>
              <AdminView />
            </Suspense>
          </motion.div>
        } />
        <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function AppRoutes() {
  const { user, isLoading } = useAuth();
  
  // App-level initialization logic can stay, but fetchSettings is handled by useSettings hook.

  useEffect(() => {
    // 1. Detect OAuth error in URL hash OR query params
    const hash = window.location.hash;
    const search = window.location.search;
    const hasError = hash.includes('error=') || search.includes('error=');
    
    if (hasError) {
        const errorParams = new URLSearchParams(hash.includes('error=') ? hash.substring(1) : search.substring(1));
        const errorCode = errorParams.get('error_code') || errorParams.get('error');
        const errorDesc = errorParams.get('error_description') || '未知错误';
        
        // Suppress benign PKCE "already used" errors after first success
        if (errorDesc.includes('Unable to exchange external code') && user) {
            console.debug('Suppressed duplicate OAuth exchange error after login success');
        } else {
            globalHandleError(new Error(`${errorCode}: ${errorDesc}`), '登录发生错误 (OAuth Error)');
        }
        
        // Clear hash and query params to prevent error showing up on refresh
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
  
  if (isLoading) return null;

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AnimatedRoutes user={user} />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
