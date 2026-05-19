import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import PublicView from './pages/PublicView';
import AdminView from './pages/AdminView';
import { useAuth } from './hooks/useAuth';
import { useGalleryStore } from './store';
import { clearExpiredCaches } from './utils/indexedDB';
import { fetchSettings } from './services/settingService';
import { supabase } from './lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { globalHandleError } from './utils/errorHandler';

function AnimatedRoutes({ user }: { user: any }) {
  const location = useLocation();
  const { hash, groupId } = location.state || {};


  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={
            user ? <Navigate to="/admin" replace /> : (
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
        <Route path="/g/:groupId" element={
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }}>
            <PublicView />
          </motion.div>
        } />
        <Route path="/admin" element={
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }}>
            <AdminView />
          </motion.div>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function AppRoutes() {
  const { user, authChecked } = useAuth();
  const { setSettings } = useGalleryStore();
  
  useEffect(() => {
    fetchSettings().then(s => {
      if (s) setSettings(s as any);
    }).catch(e => console.error("fetchSettings in App", e));
  }, [setSettings]);

  useEffect(() => {
    // 1. Global Error Handlers (console only)
    const handleGlobalError = (event: ErrorEvent) => {
        console.error('Global Error: ', event.message || 'Unhandled Error');
    };
    const handlePromiseRejection = (event: PromiseRejectionEvent) => {
        console.error('Unhandled Promise Rejection: ', event.reason);
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handlePromiseRejection);
    
    // Detect OAuth error in URL hash
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
    clearExpiredCaches(7).catch(err => console.error('IndexedDB Cleanup: ', String(err)));
    
    // 3. Supabase Session Health Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session && user) {
        console.warn('Session 丢失，建议重新登录');
      }
    }).catch(e => console.error("getSession error", e));

    return () => {
        window.removeEventListener('error', handleGlobalError);
        window.removeEventListener('unhandledrejection', handlePromiseRejection);
    };
  }, [user]);

  // Handle Global Search Debouncing
  const { searchQuery, setDebouncedSearchQuery } = useGalleryStore();
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 400); // 400ms debounce
    return () => clearTimeout(timer);
  }, [searchQuery, setDebouncedSearchQuery]);
  
  if (!authChecked) return null;

  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors />
      <AnimatedRoutes user={user} />
    </BrowserRouter>
  );
}
