import { useAppRouter } from '@/lib/router/useAppRouter';
import React, { useEffect, Suspense, lazy } from 'react';
import { Icon } from '@/components/ui/Icon';
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner';
import { useAuth } from '@/lib/store';
import { useSyncMutation } from '@/hooks';
const UploadModeDialog = lazy(() => import('@/features/upload/components/UploadModeDialog').then(m => ({ default: m.UploadModeDialog })));

import { usePhotoUpload } from '@/features/upload';
import { UploadButton } from '@/components/shared/UploadButton';
import { logger } from '@/lib/logger';
import { useAIBatchAnalysis } from '@/hooks';
import { useTaskSelector } from '@/lib/task-queue/store';
import { useUI, useStoreShallow } from '@/lib/store';
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
const PhotoEditDialog = lazy(() => import('@/features/photo-edit/index').then(m => ({ default: m.PhotoEditDialog })));

export function AdminPageContent() {
  const filters = useFilters({ enableStatus: true, enableBatch: true });
  const { user } = useAuth();
  const { uploadFiles } = usePhotoUpload();
  const uploadModeDialogOpen = useUI(s => s.uploadModeDialogOpen);
  const pendingFiles = useUI(s => s.pendingFiles);
  const { handleBatchAiAnalyze } = useAIBatchAnalysis();
  const { mutateAsync: syncMut } = useSyncMutation();
  const tasksMap = useTaskSelector(s => s.tasks);
  const tasks = React.useMemo(() => Array.from(tasksMap.values()), [tasksMap]);
  const appLang = useUI(s => s.appLang);
  const { navigate, route } = useAppRouter();

  const store = useUI(useStoreShallow(s => ({
    update: s.update,
    batchEditingIds: s.batchEditingIds })));
  
  const currentScreen = (() => {
    if (route === 'admin') return 'gallery';
    if (route === 'adminTasks') return 'tasks';
    if (route === 'adminDiagnosticsLogs') return 'error-logs';
    if (route === 'adminDiagnostics') return 'diagnose';
    if (route === 'settings') return 'settings';
    if (route === 'adminBatchEdit') return 'batch';
    return 'gallery' as const;
  })();

  const isSyncing = tasks.some(t => t.state?.status === 'processing' && t.label.includes('Sync'));
  const isUploadRunning = tasks.some(t => t.state?.status === 'processing' && t.label.includes('上传'));

  return (
    <AdminAuthGate>
      <div className="flex flex-col h-screen bg-slate-50 overflow-hidden w-full relative">
        {/* Gallery is kept alive */}
        <div className={currentScreen === 'gallery' ? 'flex-1 relative overflow-hidden order-0' : 'hidden'}>
          <div key="admin-gallery" className="absolute inset-0 animate-fade-in translate-z-0">
            <AdminContainer />
          </div>
          
          <div className="absolute bottom-8 right-8">
            <UploadButton 
              onAdd={() => {
                const input = document.getElementById('admin-quick-add-input') as HTMLInputElement;
                if (input) input.click();
              }}
            />
          </div>
        </div>

        {/* Other screens are lazy mounted */}
        {currentScreen !== 'gallery' && (
          <div className="flex-1 relative overflow-hidden pb-16 sm:pb-0 order-0">
            <Suspense fallback={<div className="h-full flex items-center justify-center bg-slate-50"><LoadingSpinner size="lg" /></div>}>
              {currentScreen === 'batch' ? (
                <ScreenWrapper key="admin-batch" onClose={navigate.admin}>
                  <BatchEditScreen />
                </ScreenWrapper>
              ) : currentScreen === 'diagnose' ? (
                <ScreenWrapper key="admin-diagnose" onClose={navigate.admin}>
                  <DiagnosticsDashboard />
                </ScreenWrapper>
              ) : ['settings', 'tasks', 'error-logs'].includes(currentScreen) ? (
                <div key="admin-settings-container" className="h-full bg-slate-50 animate-scale-in">
                  <SettingsPage onClose={navigate.admin} />
                </div>
              ) : null}
            </Suspense>
          </div>
        )}

        {currentScreen === 'gallery' && (
          <>
            <FilterBar mode="admin" className="order-[-1]" />
            <AdminHeader className="order-first" />
          </>
        )}
        

        <input 
          type="file" id="admin-quick-add-input" multiple accept="image/*" className="hidden" 
          onChange={(e) => {
            if (e.target.files) {
              const files = e.target.files;
              if (files.length > 1) {
                store.update({ uploadModeDialogOpen: true, pendingFiles: files });
              } else {
                store.update({ uploadAsGroup: false });
                uploadFiles(files);
              }
            }
            e.target.value = '';
          }}
        />
      </div>

      {/* Put Modals outside the layout container */}
      <Suspense fallback={null}>
        <UploadModeDialog 
          open={uploadModeDialogOpen}
          onOpenChange={(open) => store.update({ uploadModeDialogOpen: open })}
          onSelectMode={(mode) => {
            if (pendingFiles) {
              store.update({ uploadAsGroup: mode === 'group' });
              uploadFiles(pendingFiles);
            }
            store.update({ uploadModeDialogOpen: false, pendingFiles: null });
          }}
        />
        <PhotoEditDialog />
      </Suspense>
    </AdminAuthGate>
  );
}

function ScreenWrapper({ children, onClose }: { children: React.ReactNode, onClose: () => void }) {
  return (
    <div className="h-full bg-slate-50 flex flex-col animate-fade-up">
      <div className="flex justify-end p-4 shrink-0 bg-slate-50 border-b border-slate-100">
        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500 hover:text-slate-900"><Icon name="x" size={24} /></button>
      </div>
      <div className="flex-1 overflow-y-auto w-full no-scrollbar px-8 pb-8">{children}</div>
    </div>
  );
}
