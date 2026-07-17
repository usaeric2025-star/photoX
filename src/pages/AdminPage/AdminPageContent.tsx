import React, { Suspense, lazy } from 'react';
import { Icon } from '#src/components/ui/Icon.js';
import { LoadingSpinner } from '#src/components/ui/feedback/LoadingSpinner.js';
import { useAuth } from '#lib/store/index.js';
import { ErrorBoundary } from '#src/components/shared/ErrorBoundary.js';

interface UploadModeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectMode: (mode: 'single' | 'group') => void;
}

const UploadModeDialog = lazy(() => import('#src/features/upload/components/UploadModeDialog.js').then(m => ({ default: m.UploadModeDialog }))) as React.ComponentType<UploadModeDialogProps>;

import { usePhotoUpload } from '#src/hooks/index.js';
import { UploadButton } from '#src/components/shared/UploadButton.js';
import { SelectionToolbar } from '#src/features/selection/index.js';
import { useUI } from '#lib/store/index.js';
import { useNormalizedLocation } from '#src/hooks/core/index.js';
import { AdminHeader } from '#src/components/layout/AdminHeader.js';
import { AdminAuthGate } from '#src/components/admin/AdminAuthGate.js';
import { AdminContainer } from '#src/components/admin/AdminContainer.js';
import { FilterBar } from '#src/features/filters/index.js';

interface SettingsPageProps {
  onClose?: () => void;
}

const BatchEditScreen = lazy(() => import('#src/features/batch-edit/BatchEditScreen.js').then(m => ({ default: m.BatchEditScreen })));
const DiagDashboard = lazy(() => import('#src/features/diagnostics/DiagDashboard.js').then(m => ({ default: m.DiagDashboard })));
const SettingsPage = lazy(() => import('#src/features/settings/SettingsPage.js').then(m => ({ default: m.SettingsPage }))) as React.ComponentType<SettingsPageProps>;
const AdminGroupDetailPage = lazy(() => import('#src/features/group/AdminGroupDetail.js').then(m => ({ default: m.AdminGroupDetailPage })));

import { ScreenWrapper } from '#src/components/admin/ScreenWrapper.js';
import { Switch, Route } from 'wouter';

function AdminGallery() {
  const patch = useUI(s => s.patch);
  return (
    <>
      <AdminHeader className="border-b bg-white shadow-none" />
      <div className="flex-1 relative overflow-hidden flex flex-col">
        <FilterBar mode="admin" className="bg-white border-b shadow-none z-10" />
        <div className="flex-1 relative animate-fade-in translate-z-0 overflow-hidden flex flex-col">
          <AdminContainer />
        </div>
        <div className="absolute bottom-8 right-8 z-[9999]">
          <UploadButton 
            onAdd={() => patch({ uploadModeDialogOpen: true })}
          />
        </div>
      </div>
    </>
  );
}

function AdminBatchEditRoute() {
  const [_, setLocation] = useNormalizedLocation();
  return (
    <ScreenWrapper key="admin-batch" onClose={() => setLocation('/admin')}>
      <BatchEditScreen />
    </ScreenWrapper>
  );
}

function AdminDiagRoute() {
  const [_, setLocation] = useNormalizedLocation();
  return (
    <ScreenWrapper key="admin-diagnose" onClose={() => setLocation('/admin')}>
      <DiagDashboard />
    </ScreenWrapper>
  );
}

function AdminSettingsRoute() {
  const [_, setLocation] = useNormalizedLocation();
  return (
    <div key="admin-settings-container" className="h-full bg-slate-50 animate-scale-in">
      <SettingsPage onClose={() => setLocation('/admin')} />
    </div>
  );
}

function AdminGroupDetailRoute() {
  return <AdminGroupDetailPage />;
}

export function AdminPageContent() {
  const { uploadFiles } = usePhotoUpload();
  const uploadModeDialogOpen = useUI(s => s.uploadModeDialogOpen);
  const patch = useUI(s => s.patch);

  return (
    <AdminAuthGate>
      <div className="flex h-full bg-slate-50 overflow-hidden w-full relative">
        <div className="flex-1 flex flex-col min-w-0 relative h-full">
          <ErrorBoundary>
            <Suspense fallback={<div className="h-full flex items-center justify-center bg-slate-50"><LoadingSpinner size="lg" /></div>}>
              <Switch>
                <Route path="/admin/batch-edit" component={AdminBatchEditRoute} />
                <Route path="/admin/batch" component={AdminBatchEditRoute} />
                
                <Route path="/admin/diagnostics" component={AdminDiagRoute} />
                <Route path="/admin/diagnose" component={AdminDiagRoute} />
                <Route path="/diagnostics" component={AdminDiagRoute} />
                <Route path="/diagnostics/:any*" component={AdminDiagRoute} />

                <Route path="/admin/tasks" component={AdminSettingsRoute} />
                <Route path="/admin/settings" component={AdminSettingsRoute} />
                <Route path="/admin/error-logs" component={AdminSettingsRoute} />
                <Route path="/admin/system" component={AdminSettingsRoute} />
                <Route path="/settings" component={AdminSettingsRoute} />

                <Route path="/admin/group/:id" component={AdminGroupDetailRoute} />

                <Route path="/admin/groups" component={AdminGallery} />
                <Route path="/admin/photos" component={AdminGallery} />
                <Route path="/admin/tags" component={AdminGallery} />
                <Route path="/admin/categories" component={AdminGallery} />
                <Route path="/admin/manufacturer" component={AdminGallery} />
                
                <Route path="/admin" component={AdminGallery} />
                <Route path="/admin/:any*">
                  <AdminGallery />
                </Route>
              </Switch>
            </Suspense>
          </ErrorBoundary>
          <SelectionToolbar />
        </div>

        <input 
          type="file" id="admin-quick-add-input" multiple accept="image/*" className="hidden" 
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              uploadFiles(e.target.files);
            }
            e.target.value = '';
          }}
        />

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
      </div>
    </AdminAuthGate>
  );
}
