import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import PublicView from './pages/PublicView';
import AdminView from './pages/AdminView';
import EditorView from './pages/EditorView';
import AdminAdsPage from './pages/AdminAdsPage';
import { useAuth } from './hooks/useAuth';

export default function AppRoutes() {
  const { user, authChecked } = useAuth();
  
  if (!authChecked) return null;

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/admin" replace /> : <PublicView />} />
        <Route path="/admin" element={<AdminView />} />
        <Route path="/admin/ads" element={<AdminAdsPage />} />
        <Route path="/editor" element={<EditorView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
