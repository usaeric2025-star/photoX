import { useRouterSafe } from '@/hooks/core/useRouterSafe';
import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useTasks, 
  useSyncMutation, 
  useCategories, 
  usePhotoUpload } from '@/hooks';
import { logger } from '@/lib/logger';
import { DataLoadingContainer } from '@/components/ui/DataLoadingContainer';
import { BatchEditScreen } from '@/components/admin/BatchEditScreen';
import { StatisticsScreen } from '@/components/admin/StatisticsScreen';
import { SettingsPage } from '@/components/settings/SettingsPage';
import { PhotoEditModal } from '@/components/admin/PhotoEditModal';
import { useAIBatchAnalysis, useAdminPhotos } from '@/hooks';
import { useUIStore, useShallow } from '@/store/useUIStore';
import { Category } from '@/types';
import { AdminHeader } from '@/components/layouts/headers/AdminHeader';
import { AdminAuthGate } from '@/components/admin/AdminAuthGate';
import { AdminContainer } from '@/components/admin/AdminContainer';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { useFilters } from '@/hooks/useFilters';
import { FiltersBar } from '@/components/filters/FiltersBar';

export function AdminPageContent() {
  const filters = useFilters({ enableStatus: true, enableBatch: true });
  const { user } = useAuthStore();
  const { photos, isPending: isPhotosPending } = useAdminPhotos();
  const { uploadFiles } = usePhotoUpload();
  const { handleBatchAiAnalyze } = useAIBatchAnalysis();
  const { mutateAsync: syncMut } = useSyncMutation();
  const { tasks } = useTasks();
  const appLang = useUIStore(s => s.appLang);
  const location = useRouterSafe().location;
  const navigate = useRouterSafe().navigate;
  
  const store = useUIStore(useShallow(s => ({
    update: s.update,
    activeScreen: s.activeScreen,
    editPhotoId: s.editPhotoId,
    newPhotoData: s.newPhotoData,
    batchEditingIds: s.batchEditingIds })));

  // Sync URL to store 
  useEffect(() => {
    const path = location.pathname;
    if (path === '/admin' || path === '/admin/') {
      store.update({ activeScreen: 'gallery' });
    } else if (path === '/admin/tasks') {
      store.update({ activeScreen: 'tasks' });
    } else if (path === '/admin/error-logs') {
      store.update({ activeScreen: 'error-logs' });
    } else if (path === '/admin/diagnose' || path === '/admin/diagnostics') {
      store.update({ activeScreen: 'diagnose' });
    } else if (path === '/admin/settings') {
      store.update({ activeScreen: 'settings' });
    } else if (path === '/admin/batch-edit') {
      store.update({ activeScreen: 'batch' });
    } else if (path === '/admin/statistics') {
      store.update({ activeScreen: 'dashboard' });
    }
  }, [location.pathname, store.update]);

  const currentScreen = store.activeScreen;

  const isSyncing = tasks.some(t => t.status === 'running' && t.name.includes('Sync'));

  return (
    <AdminAuthGate>
      <DataLoadingContainer isPending={isPhotosPending} hasData={true}>
        <div className="flex flex-col h-screen bg-slate-50 overflow-hidden w-full relative">
          {(currentScreen === 'gallery' || currentScreen === 'home') ? (
            <>
              <AdminHeader />
              <FiltersBar filters={filters} showStatus showBatch />
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
