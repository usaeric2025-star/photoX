import { useAppRouter } from '#lib/router/index.js';
import React, { Suspense, lazy } from 'react';
import { Icon } from '#src/components/ui/Icon.js';
import { LoadingSpinner } from '#src/components/ui/feedback/LoadingSpinner.js';
import { useAuth } from '#lib/store/index.js';
interface UploadModeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectMode: (mode: 'single' | 'group') => void;
}
const UploadModeDialog = lazy(() => import('#src/features/upload/components/UploadModeDialog.js').then(m => ({ default: m.UploadModeDialog }))) as React.ComponentType<UploadModeDialogProps>;

import { usePhotoUpload } from '#src/hooks/index.js';
import { UploadButton } from '#src/components/shared/UploadButton.js';
import { SelectionToolbar } from '#src/features/selection/index.js';
import { useAIBatchAnalysis } from '#src/hooks/index.js';
import { useUI, useSignal } from '#lib/store/index.js';
import { AdminHeader } from '#src/components/layouts/headers/AdminHeader.js';
import { AdminAuthGate } from '#src/components/admin/AdminAuthGate.js';
import { AdminContainer } from '#src/components/admin/AdminContainer.js';
import { TaskIndicator } from '#src/components/admin/TaskIndicator.js';
import { useFilters } from '#src/features/filters/index.js';
import { FilterBar } from '#src/features/filters/index.js';

interface SettingsPageProps {
  onClose?: () => void;
}
const BatchEditScreen = lazy(() => import('#src/features/batch-edit/BatchEditScreen.js').then(m => ({ default: m.BatchEditScreen })));
const DiagDashboard = lazy(() => import('#src/features/diagnostics/DiagDashboard.js').then(m => ({ default: m.DiagDashboard })));
const SettingsPage = lazy(() => import('#src/features/settings/SettingsPage.js').then(m => ({ default: m.SettingsPage }))) as React.ComponentType<SettingsPageProps>;

export function AdminPageContent() {
  const filters = useFilters({ enableStatus: true, enableBatch: true });
  const { user } = useAuth();
  const { uploadFiles } = usePhotoUpload();
  
  const uploadModeDialogOpen = useUI(s => s.uploadModeDialogOpen);
  const pendingFiles = useUI(s => s.pendingFiles);
  const patch = useUI(s => s.patch);
  
  const { handleBatchAiAnalyze } = useAIBatchAnalysis();
  const { navigate, route } = useAppRouter();
  
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const currentScreen = (() => {
    if (pathname.startsWith('/admin/batch-edit')) return 'batch';
    if (pathname.startsWith('/admin/tasks')) return 'tasks';
    if (pathname.startsWith('/admin/error-logs')) return 'error-logs';
    if (pathname.startsWith('/admin/diagnose') || pathname.startsWith('/admin/diagnostics')) return 'diagnose';
    if (pathname.startsWith('/settings')) return 'settings';
    if (pathname.startsWith('/admin')) return 'gallery';
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
        <TaskIndicator />

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
