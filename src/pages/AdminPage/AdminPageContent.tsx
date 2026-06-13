import { useRouterSafe } from '@/hooks/core/useRouterSafe';
import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { 
  useAuth, 
  useTasks, 
  useSyncMutation, 
  useUrlFilters, 
  useCategories, 
  usePhotoUpload 
} from '@/hooks';
import { logger } from '@/lib/logger';
import { DataLoadingContainer } from '@/components/ui/DataLoadingContainer';
import { BatchEditScreen } from '@/components/admin/BatchEditScreen';
import { StatisticsScreen } from '@/components/admin/StatisticsScreen';
import { SettingsPage } from '@/components/settings/SettingsPage';
import { PhotoEditModal } from '@/components/admin/PhotoEditModal';
import { useAIBatchAnalysis } from '@/hooks';
import { useUIStore, useShallow } from '@/store/useUIStore';
import { usePhotoGallery } from '@/hooks/photo/usePhotoGallery';
import { Category } from '@/types';
import { AdminHeader } from '@/components/layouts/headers/AdminHeader';
import { AdminAuthGate } from '@/components/admin/AdminAuthGate';
import { AdminContainer } from '@/components/admin/AdminContainer';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

export function AdminPageContent() {
  const { user } = useAuth();
  const { photos, isLoading: isPhotosLoading } = usePhotoGallery();
  const { filters: urlFilters } = useUrlFilters();
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
    if (path === '/admin/tasks') {
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
    } else if (path === '/admin' && (['error-logs', 'tasks', 'diagnose', 'settings', 'batch', 'dashboard'].includes(store.activeScreen))) {
      store.update({ activeScreen: 'gallery' });
    }
  }, [location.pathname, store.update]);

  const currentScreen = store.activeScreen;

  const { data: categories = [] } = useCategories();
  const currentCategoryName = urlFilters.categoryId 
    ? categories.find(c => c.id === urlFilters.categoryId)?.[appLang as keyof Category] as string
    : null;

  const pageTitle = (() => {
    if (urlFilters.groupId) return appLang === 'zh' ? '合组详情' : appLang === 'ms' ? 'Butiran Kumpulan' : 'Group Details';
    if (currentScreen === 'dashboard') return appLang === 'zh' ? '数据看板' : appLang === 'ms' ? 'Papan Pemuka' : 'Dashboard';
    if (currentScreen === 'tasks') return appLang === 'zh' ? '任务中心' : appLang === 'ms' ? 'Pusat Tugasan' : 'Task Center';
    if (currentScreen === 'error-logs') return appLang === 'zh' ? '系统日志' : appLang === 'ms' ? 'Log Sistem' : 'Logs';
    if (currentCategoryName) return currentCategoryName;
    return appLang === 'zh' ? '全部照片' : appLang === 'ms' ? 'Semua Foto' : 'All Photos';
  })();

  const onRefresh = async () => {
    try {
      await syncMut('pull');
    } catch (e) {
      // Error handled by mutationFactory
    }
  };

  const isSyncing = tasks.some(t => t.status === 'running' && t.name.includes('Sync'));

  return (
    <AdminAuthGate isSyncing={isSyncing}>
      <DataLoadingContainer isLoading={isPhotosLoading} hasData={true}>
        <div className="flex flex-col h-screen bg-slate-50 overflow-hidden w-full relative">
          {(currentScreen === 'gallery' || currentScreen === 'home') && <AdminHeader />}
          <div className="flex-1 relative overflow-hidden pb-16 sm:pb-0">
            {(currentScreen === 'home' || currentScreen === 'gallery') && !urlFilters.groupId ? (
              <div key="admin-gallery" className="absolute inset-0 animate-fade-in">
                <AdminContainer />
              </div>
            ) : currentScreen === 'dashboard' ? (
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

          <input 
            type="file" id="admin-quick-add-input" multiple accept="image/*" className="hidden" 
            onChange={(e) => {
              if (e.target.files) uploadFiles(e.target.files);
              e.target.value = '';
            }}
          />
          
            {(store.editPhotoId || store.newPhotoData) && <PhotoEditModal />}
          </div>
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
