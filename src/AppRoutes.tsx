import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import PublicView from './pages/PublicView';
import AdminView from './pages/AdminView';

export default function AppRoutes() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<PublicView />} />
        <Route path="/admin" element={<AdminView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
