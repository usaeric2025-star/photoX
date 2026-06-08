import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { useLocation, useNavigate } from '@tanstack/react-router';
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
import { SettingsScreen } from '@/components/SettingsScreen';
import { PhotoEditDrawer } from '@/components/admin/PhotoEditDrawer';
import { GroupDetailPage } from '@/components/GroupDetailPage';
import { useAIBatchAnalysis } from '@/hooks/useAIBatchAnalysis';
import TasksPage from '@/pages/AdminPage/TasksPage';
import MaintenanceHistoryPage from '@/pages/AdminPage/MaintenanceHistoryPage';
import { ErrorLogViewer } from '@/components/admin/ErrorLogViewer';
import { useUIStore, useShallow } from '@/store/useUIStore';
import { usePhotoGallery } from '@/hooks/photo/usePhotoGallery';
import { Category } from '@/types';
import { toast } from 'sonner';
import { AdminHeader } from '@/components/layouts/headers/AdminHeader';
import { AdminAuthGate } from '@/components/admin/AdminAuthGate';
import { AdminScreen } from '@/components/AdminScreen';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export function AdminPageContent() {
  const { user } = useAuth();
  const { photos, isLoading: isPhotosLoading } = usePhotoGallery();
  const { filters: urlFilters } = useUrlFilters();
  const { uploadFiles } = usePhotoUpload();
  const { handleBatchAiAnalyze } = useAIBatchAnalysis();
  const { mutateAsync: syncMut } = useSyncMutation();
  const { tasks } = useTasks();
  const appLang = useUIStore(s => s.appLang);
  const location = useLocation();
  const navigate = useNavigate();
  
  const store = useUIStore(useShallow(s => ({
    update: s.update,
    activeScreen: s.activeScreen,
    editPhotoId: s.editPhotoId,
    newPhotoData: s.newPhotoData,
    batchEditingIds: s.batchEditingIds,
  })));

  // Sync URL to store 
  useEffect(() => {
    const path = location.pathname;
    if (['/admin/error-logs', '/admin/tasks', '/admin/history/maintenance'].includes(path)) {
      store.update({ activeScreen: 'settings' });
    } else if (path === '/admin' && (['error-logs', 'tasks', 'history_maintenance'].includes(store.activeScreen))) {
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
    if (currentScreen === 'history_maintenance') return appLang === 'zh' ? '维护历史' : appLang === 'ms' ? 'Sejarah Penyelenggaraan' : 'Maintenance';
    if (currentScreen === 'error-logs') return appLang === 'zh' ? '系统日志' : appLang === 'ms' ? 'Log Sistem' : 'Logs';
    if (currentCategoryName) return currentCategoryName;
    return appLang === 'zh' ? '全部照片' : appLang === 'ms' ? 'Semua Foto' : 'All Photos';
  })();

  const onRefresh = async () => {
    try {
      await syncMut('pull');
    } catch (e: any) {
      // Error handled by mutationFactory
    }
  };

  const isSyncing = tasks.some(t => t.status === 'running' && t.name.includes('Sync'));

  return (
    <AdminAuthGate isSyncing={isSyncing}>
      <DataLoadingContainer isLoading={isPhotosLoading} hasData={true}>
        <div className="flex flex-col h-screen bg-slate-50 overflow-hidden w-full relative">
          {(currentScreen === 'gallery' || currentScreen === 'home') && <AdminHeader />}
          <main className="flex-1 relative overflow-hidden pb-16 sm:pb-0">
          {(currentScreen === 'home' || currentScreen === 'gallery') && store.batchEditingIds && store.batchEditingIds.length > 0 && <BatchEditScreen />}
          
          <div className="absolute inset-0 transition-all duration-300">
            {(currentScreen === 'home' || currentScreen === 'gallery') && !urlFilters.groupId && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="h-full w-full"
              >
                <AdminScreen />
              </motion.div>
            )}
          </div>

          <AnimatePresence>
            {['manage', 'settings', 'structure', 'logs', 'tasks', 'history_maintenance', 'error-logs'].includes(currentScreen) && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-20 bg-slate-50">
                <SettingsScreen onClose={() => store.update({ activeScreen: 'gallery' })} />
              </motion.div>
            )}

            {currentScreen === 'dashboard' && (
              <ScreenWrapper onClose={() => store.update({ activeScreen: 'gallery' })}><StatisticsScreen /></ScreenWrapper>
            )}
          </AnimatePresence>

          <input 
            type="file" id="admin-quick-add-input" multiple accept="image/*" className="hidden" 
            onChange={(e) => {
              if (e.target.files) uploadFiles(e.target.files);
              e.target.value = '';
            }}
          />
          
          <AnimatePresence>
            {(store.editPhotoId || store.newPhotoData) && <PhotoEditDrawer />}
          </AnimatePresence>
          </main>
        </div>
      </DataLoadingContainer>

      <ErrorBoundary>
        <GroupDetailPage />
      </ErrorBoundary>
    </AdminAuthGate>
  );
}

function ScreenWrapper({ children, onClose }: { children: React.ReactNode, onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute inset-0 z-20 bg-slate-50 flex flex-col">
      <div className="flex justify-end p-4 shrink-0 bg-slate-50/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-100">
        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500 hover:text-slate-900"><X size={24} /></button>
      </div>
      <div className="flex-1 overflow-y-auto w-full no-scrollbar px-8 pb-8">{children}</div>
    </motion.div>
  );
}
