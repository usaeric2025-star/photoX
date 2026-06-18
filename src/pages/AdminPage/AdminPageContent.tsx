import { useParams, useLocation, useNavigate } from '@tanstack/react-router';
import { useRouterSafe } from '@/hooks/core/useRouterSafe';
import React, { useEffect, Suspense, lazy } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useTasks, 
  useSyncMutation } from '@/hooks';
import { usePhotoUpload } from '@/features/upload';
import { logger } from '@/lib/logger';
import { useAIBatchAnalysis } from '@/hooks';
import { useUIStore, useShallow } from '@/store/useUIStore';
import { Category } from '@/types';
import { AdminHeader } from '@/components/layouts/headers/AdminHeader';
import { AdminAuthGate } from '@/components/admin/AdminAuthGate';
import { AdminContainer } from '@/components/admin/AdminContainer';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { useFilters } from '@/hooks/useFilters';
import { FilterBar } from '@/features/filter/FilterBar';

const BatchEditScreen = lazy(() => import('@/features/batch-edit/BatchEditScreen').then(m => ({ default: m.BatchEditScreen })));
const StatisticsScreen = lazy(() => import('@/features/statistics/components/StatisticsScreen').then(m => ({ default: m.StatisticsScreen })));
const DiagnosticsDashboard = lazy(() => import('@/features/diagnostics/DiagnosticsDashboard').then(m => ({ default: m.DiagnosticsDashboard })));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const PhotoEditModal = lazy(() => import('@/features/photo-edit').then(m => ({ default: m.PhotoEditModal })));

export function AdminPageContent() {
  const filters = useFilters({ enableStatus: true, enableBatch: true });
  const { user } = useAuthStore();
  const { uploadFiles } = usePhotoUpload();
  const { handleBatchAiAnalyze } = useAIBatchAnalysis();
  const { mutateAsync: syncMut } = useSyncMutation();
  const { tasks } = useTasks();
  const appLang = useUIStore(s => s.appLang);
  const location = useLocation();
  const navigate = useNavigate();
  
  const store = useUIStore(useShallow(s => ({
    update: s.update,
    newPhotoData: s.newPhotoData,
    batchEditingIds: s.batchEditingIds })));

  const path = location.pathname;
  
  const currentScreen = (() => {
    if (path === '/admin' || path === '/admin/') return 'gallery';
    if (path.startsWith('/admin/tasks')) return 'tasks';
    if (path.startsWith('/admin/error-logs')) return 'error-logs';
    if (path.startsWith('/admin/diagnose') || path.startsWith('/admin/diagnostics')) return 'diagnose';
    if (path.startsWith('/admin/settings')) return 'settings';
    if (path.startsWith('/admin/batch-edit')) return 'batch';
    if (path.startsWith('/admin/statistics')) return 'dashboard';
    if (path.startsWith('/admin/manage') || path.startsWith('/admin/structure') || path.startsWith('/admin/tags') || path.startsWith('/admin/ai_settings') || path.startsWith('/admin/ai')) return 'settings';
    return 'gallery';
  })();

  const isSyncing = tasks.some(t => t.status === 'running' && t.name.includes('Sync'));

  return (
    <AdminAuthGate>
      <div className="flex flex-col h-screen bg-slate-50 overflow-hidden w-full relative">
        {currentScreen === 'gallery' && (
          <>
            <AdminHeader />
            <FilterBar mode="admin" />
          </>
        )}
        
        {/* Gallery is kept alive */}
        <div className={currentScreen === 'gallery' ? 'flex-1 relative overflow-hidden pb-16 sm:pb-0' : 'hidden'}>
          <div key="admin-gallery" className="absolute inset-0 animate-fade-in">
            <AdminContainer />
          </div>
        </div>

        {/* Other screens are lazy mounted */}
        {currentScreen !== 'gallery' && (
          <div className="flex-1 relative overflow-hidden pb-16 sm:pb-0">
            <Suspense fallback={<div className="h-full flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>}>
              {currentScreen === 'dashboard' ? (
                <ScreenWrapper key="admin-dashboard" onClose={() => navigate({ to: '/admin' })}>
                  <StatisticsScreen />
                </ScreenWrapper>
              ) : currentScreen === 'batch' ? (
                <ScreenWrapper key="admin-batch" onClose={() => navigate({ to: '/admin' })}>
                  <BatchEditScreen />
                </ScreenWrapper>
              ) : currentScreen === 'diagnose' ? (
                <ScreenWrapper key="admin-diagnose" onClose={() => navigate({ to: '/admin' })}>
                  <DiagnosticsDashboard />
                </ScreenWrapper>
              ) : ['manage', 'settings', 'structure', 'logs', 'tasks', 'error-logs'].includes(currentScreen) ? (
                <div key="admin-settings-container" className="h-full bg-slate-50 animate-scale-in">
                  <SettingsPage onClose={() => navigate({ to: '/admin' })} />
                </div>
              ) : null}
            </Suspense>
          </div>
        )}

        <input 
          type="file" id="admin-quick-add-input" multiple accept="image/*" className="hidden" 
          onChange={(e) => {
            if (e.target.files) uploadFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {/* Put Modals outside the layout container */}
      <Suspense fallback={null}>
        <PhotoEditModal />
      </Suspense>
    </AdminAuthGate>
  );
}

function ScreenWrapper({ children, onClose }: { children: React.ReactNode, onClose: () => void }) {
  return (
    <div className="h-full bg-slate-50 flex flex-col animate-fade-up">
      <div className="flex justify-end p-4 shrink-0 bg-slate-50 border-b border-slate-100">
        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500 hover:text-slate-900"><X size={24} /></button>
      </div>
      <div className="flex-1 overflow-y-auto w-full no-scrollbar px-8 pb-8">{children}</div>
    </div>
  );
}
