import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import PublicView from './pages/PublicView';
import AdminView from './pages/AdminView';
import { useAuth } from './hooks/useAuth';
import { clearExpiredCaches } from './utils/indexedDB';
import { supabase } from './lib/supabase';
import { useError } from './context/ErrorContext';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster } from 'sonner';

function AnimatedRoutes() {
  const location = useLocation();
  const { user } = useAuth();
  const { hash, groupId } = location.state || {}; // Not really used this way with Routes, but for keying

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            {user ? <Navigate to="/admin" replace /> : <PublicView />}
          </motion.div>
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
  const { addLog } = useError();
  
  useEffect(() => {
    // 1. Global Error Handlers
    const handleGlobalError = (event: ErrorEvent) => {
        addLog(event.message || 'Unhandled Error', 'Global', 'error');
    };
    const handlePromiseRejection = (event: PromiseRejectionEvent) => {
        addLog(String(event.reason) || 'Unhandled Promise Rejection', 'Promise', 'error');
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handlePromiseRejection);

    // 2. Background cache cleanup
    clearExpiredCaches(7).catch(err => addLog(String(err), 'IndexedDB Cleanup'));
    
    // 3. Supabase Session Health Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session && user) {
        addLog('Session 丢失，建议重新登录', 'Auth', 'warning');
      }
    });

    return () => {
        window.removeEventListener('error', handleGlobalError);
        window.removeEventListener('unhandledrejection', handlePromiseRejection);
    };
  }, [user, addLog]);
  
  if (!authChecked) return null;

  return (
    <HashRouter>
      <Toaster position="top-center" richColors />
      <AnimatedRoutes />
    </HashRouter>
  );
}
