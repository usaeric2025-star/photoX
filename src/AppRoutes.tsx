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
  
  if (!authChecked) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-red-100 z-[99999]">
        <div className="text-4xl text-red-600 font-bold mb-4">Initializing App...</div>
        <div className="text-xl text-slate-800">Please wait. If this stays forever, there's a routing or auth crash.</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full border-4 border-blue-500">
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
    </div>
  );
}
