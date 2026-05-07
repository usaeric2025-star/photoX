import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import PublicView from './pages/PublicView';
import AdminView from './pages/AdminView';
import { useAuth } from './hooks/useAuth';
import { clearExpiredCaches } from './utils/indexedDB';

export default function AppRoutes() {
  const { user, authChecked } = useAuth();
  
  useEffect(() => {
    // Background cache cleanup
    clearExpiredCaches(7).catch(err => console.error('[IndexedDB] Cleanup failed:', err));
  }, []);
  
  if (!authChecked) return null;

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/admin" replace /> : <PublicView />} />
        <Route path="/admin" element={<AdminView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
