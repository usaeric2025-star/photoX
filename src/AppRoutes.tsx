import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import PublicView from './pages/PublicView';
import EditorView from './pages/EditorView';
import { AdminLayout } from './pages/AdminLayout';
import { AdminPhotos } from './pages/AdminPhotos';
import { AdminGroups } from './pages/AdminGroups';
import { AdminAds } from './pages/AdminAds';
import { AdminSettings } from './pages/AdminSettings';
import { useAuth } from './hooks/useAuth';

export default function AppRoutes() {
  const { user, authChecked } = useAuth();
  
  if (!authChecked) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/admin/photos" replace /> : <PublicView />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="photos" element={<AdminPhotos />} />
          <Route path="groups" element={<AdminGroups />} />
          <Route path="ads" element={<AdminAds />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route index element={<Navigate to="photos" replace />} />
        </Route>
        <Route path="/editor" element={<EditorView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
