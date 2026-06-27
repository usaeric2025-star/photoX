import { useAppRouter } from '@/lib/router';
import React, { Suspense, lazy } from 'react';
import { Icon } from '@/components/ui/Icon';
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner';
import { useAuth } from '@/lib/store';
const UploadModeDialog = lazy(() => import('@/features/upload/components/UploadModeDialog').then(m => ({ default: m.UploadModeDialog })));

import { usePhotoUpload } from '@/features/upload';
import { UploadButton } from '@/components/shared/UploadButton';
import { SelectionToolbar } from '@/features/selection';
import { useAIBatchAnalysis } from '@/hooks';
import { useTask, useUI } from '@/lib/store';
import { AdminHeader } from '@/components/layouts/headers/AdminHeader';
import { AdminAuthGate } from '@/components/admin/AdminAuthGate';
import { AdminContainer } from '@/components/admin/AdminContainer';
import { useFilters } from '@/features/filters';
import { FilterBar } from '@/features/filters';

const BatchEditScreen = lazy(() => import('@/features/batch-edit/BatchEditScreen').then(m => ({ default: m.BatchEditScreen })));
const StatisticsScreen = lazy(() => import('@/features/statistics/components/StatisticsScreen').then(m => ({ default: m.StatisticsScreen })));
const DiagDashboard = lazy(() => import('@/features/diagnostics/DiagDashboard').then(m => ({ default: m.DiagDashboard })));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));

export function AdminPageContent() {
  const filters = useFilters({ enableStatus: true, enableBatch: true });
  const { user } = useAuth();
  const { uploadFiles } = usePhotoUpload();
  
  const { 
    uploadModeDialogOpen, 
    pendingFiles, 
    patch,
  } = useUI((s) => ({
    uploadModeDialogOpen: s.uploadModeDialogOpen,
    pendingFiles: s.pendingFiles,
    patch: s.patch,
  }));
  
  const { handleBatchAiAnalyze } = useAIBatchAnalysis();
  const tasks = useTask((s) => Array.from(s.tasks.values()));
  const { navigate, route } = useAppRouter();
  
  const currentScreen = (() => {
    if (route?.name === 'admin') return 'gallery';
    if (route?.name === 'adminTasks') return 'tasks';
    if (route?.name === 'adminDiagnosticsLogs') return 'error-logs';
    if (route?.name === 'adminDiagnostics') return 'diagnose';
    if (route?.name === 'settings') return 'settings';
    if (route?.name === 'adminBatchEdit') return 'batch';
    return 'gallery' as const;
  })();

  return (
    <AdminAuthGate>
      <div className="flex flex-col h-screen bg-slate-50 overflow-hidden w-full relative">
        {/* Gallery is kept alive */}
        <div className={currentScreen === 'gallery' ? 'flex-1 relative overflow-hidden order-0' : 'hidden'}>
          <div key="admin-gallery" className="absolute inset-0 animate-fade-in translate-z-0">
            <AdminContainer />
          </div>
          
          <div className="absolute bottom-8 right-8 z-[9999]">
            <UploadButton 
              onAdd={() => patch({ uploadModeDialogOpen: true })}
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
                  <DiagDashboard />
                </ScreenWrapper>
              ) : ['settings', 'tasks', 'error-logs'].includes(currentScreen) ? (
                <div key="admin-settings-container" className="h-full bg-slate-50 animate-scale-in">
                  <SettingsPage onClose={navigate.admin} />
                </div>
              ) : null}
            </Suspense>
          </div>
        )}

        <SelectionToolbar />

        {currentScreen === 'gallery' && (
          <>
            <FilterBar mode="admin" className="order-[-1]" />
            <AdminHeader className="order-first" />
          </>
        )}
        

        <input 
          type="file" id="admin-quick-add-input" multiple accept="image/*" className="hidden" 
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              uploadFiles(e.target.files);
            }
            e.target.value = '';
          }}
        />
      </div>

      {/* UploadModeDialog is still fine here for fine-grained control if needed, but consider moving to global if it conflicts */}
      <Suspense fallback={null}>
        <UploadModeDialog 
          open={uploadModeDialogOpen}
          onOpenChange={(open) => patch({ uploadModeDialogOpen: open })}
          onSelectMode={(mode) => {
            patch({ uploadModeDialogOpen: false, uploadAsGroup: mode === 'group' });
            const input = document.getElementById('admin-quick-add-input') as HTMLInputElement;
            if (input) input.click();
          }}
        />
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
