import { useParams, useLocation, useNavigate } from '@tanstack/react-router';
import { useRouterSafe } from '@/hooks/core/useRouterSafe';
import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useTasks, 
  useSyncMutation, 
  useCategories } from '@/hooks';
import { usePhotoUpload } from '@/features/upload';
import { logger } from '@/lib/logger';
import { DataLoadingContainer } from '@/components/ui/DataLoadingContainer';
import { BatchEditScreen } from '@/features/batch-edit/BatchEditScreen';
import { StatisticsScreen } from '@/components/admin/StatisticsScreen';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { PhotoEditModal } from '@/components/admin/PhotoEditModal';
import { useAIBatchAnalysis, useAdminPhotos } from '@/hooks';
import { useUIStore, useShallow } from '@/store/useUIStore';
import { Category } from '@/types';
import { AdminHeader } from '@/components/layouts/headers/AdminHeader';
import { AdminAuthGate } from '@/components/admin/AdminAuthGate';
import { AdminContainer } from '@/components/admin/AdminContainer';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { useFilters } from '@/hooks/useFilters';
import { FilterBar } from '@/features/filter/components/FilterBar';

export function AdminPageContent() {
  const filters = useFilters({ enableStatus: true, enableBatch: true });
  const { user } = useAuthStore();
  const { photos, isPending: isPhotosPending } = useAdminPhotos();
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
    if (path === '/admin/tasks') return 'tasks';
    if (path === '/admin/error-logs') return 'error-logs';
    if (path === '/admin/diagnose' || path === '/admin/diagnostics') return 'diagnose';
    if (path === '/admin/settings') return 'settings';
    if (path === '/admin/batch-edit') return 'batch';
    if (path === '/admin/statistics') return 'dashboard';
    return 'gallery';
  })();

  const isSyncing = tasks.some(t => t.status === 'running' && t.name.includes('Sync'));

  return (
    <AdminAuthGate>
      <DataLoadingContainer isPending={isPhotosPending} hasData={true}>
        <div className="flex flex-col h-screen bg-slate-50 overflow-hidden w-full relative">
          {(currentScreen === 'gallery') ? (
            <>
              <AdminHeader />
              <FilterBar mode="admin" />
              <div className="flex-1 relative overflow-hidden pb-16 sm:pb-0">
                <div key="admin-gallery" className="absolute inset-0 animate-fade-in">
                  <AdminContainer />
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 relative overflow-hidden pb-16 sm:pb-0">
              {currentScreen === 'dashboard' ? (
                <ScreenWrapper key="admin-dashboard" onClose={() => navigate({ to: '/admin' })}>
                  <StatisticsScreen />
                </ScreenWrapper>
              ) : currentScreen === 'batch' ? (
                <ScreenWrapper key="admin-batch" onClose={() => navigate({ to: '/admin' })}>
                  <BatchEditScreen />
                </ScreenWrapper>
              ) : ['manage', 'settings', 'structure', 'logs', 'tasks', 'error-logs', 'diagnose'].includes(currentScreen) ? (
                <div key="admin-settings-container" className="h-full bg-slate-50 animate-scale-in">
                  <SettingsPage onClose={() => navigate({ to: '/admin' })} />
                </div>
              ) : null}
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
      </DataLoadingContainer>

      {/* Put Modals outside the layout container */}
      <PhotoEditModal />
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
