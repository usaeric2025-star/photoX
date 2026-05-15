import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import PublicView from './pages/PublicView';
import AdminView from './pages/AdminView';
import { useAuth } from './hooks/useAuth';
import { clearExpiredCaches } from './utils/indexedDB';
import { supabase } from './lib/supabase';

export default function AppRoutes() {
  const { user, authChecked } = useAuth();
  
  useEffect(() => {
    // 1. Background cache cleanup
    clearExpiredCaches(7).catch(err => console.error('[IndexedDB] Cleanup failed:', err));
    
    // 2. Supabase Session Health Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session && user) {
        console.warn('⚠️ Session 丢失，建议重新登录');
      }
    });
  }, []);
  
  if (!authChecked) return null;

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/admin" replace /> : <PublicView />} />
        <Route path="/h/:hash" element={<PublicView />} />
        <Route path="/g/:groupId" element={<PublicView />} />
        <Route path="/admin" element={<AdminView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
