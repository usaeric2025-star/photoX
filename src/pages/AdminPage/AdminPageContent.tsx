import { useAtomValue } from 'jotai';
import { uploadModeDialogOpenAtom } from '#src/store/index.js';
import { patch } from '#lib/store/index.js';
import React, { Suspense, lazy } from 'react';
import { Icon } from '#src/components/ui/Icon.js';
import { LoadingSpinner } from '#src/components/ui/feedback/LoadingSpinner.js';
import { } from '#lib/store/index.js';
import { ErrorBoundary } from '#src/components/shared/ErrorBoundary.js';

import { UploadModeDialog } from '#src/features/upload/components/UploadModeDialog.js';

import { usePhotoUpload } from '#src/hooks/index.js';
import { UploadButton } from '#src/components/shared/UploadButton.js';
import { SelectionToolbar } from '#src/features/selection/index.js';
import { } from '#lib/store/index.js';
import { useNormalizedLocation } from '#src/hooks/core/index.js';
import { AdminHeader } from '#src/components/layout/AdminHeader.js';
import { AdminContainer } from '#src/components/admin/AdminContainer.js';
import { FilterBar } from '#src/features/filters/index.js';
import { NotFoundPage } from '#src/pages/NotFoundPage.js';
import { ADMIN_ROUTES } from '#src/constants/config.js';

interface SettingsPageProps {
  onClose?: () => void;
}

import { BatchEditScreen } from '#src/features/batch-edit/BatchEditScreen.js';
import { DiagDashboard } from '#src/features/diagnostics/DiagDashboard.js';
import { SettingsPage } from '#src/features/settings/SettingsPage.js';
import { AdminGroupDetailPage } from '#src/features/group/AdminGroupDetail.js';

import { ScreenWrapper } from '#src/components/admin/ScreenWrapper.js';
import { Switch, Route } from 'wouter';

function AdminGallery() {
  
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
    <ScreenWrapper key="admin-batch" onClose={() => setLocation(ADMIN_ROUTES.HOME)}>
      <BatchEditScreen />
    </ScreenWrapper>
  );
}

function AdminDiagRoute() {
  const [_, setLocation] = useNormalizedLocation();
  return (
    <ScreenWrapper key="admin-diagnose" onClose={() => setLocation(ADMIN_ROUTES.HOME)}>
      <DiagDashboard />
    </ScreenWrapper>
  );
}

function AdminSettingsRoute() {
  const [_, setLocation] = useNormalizedLocation();
  return (
    <div key="admin-settings-container" className="h-full bg-slate-50 animate-scale-in">
      <SettingsPage onClose={() => setLocation(ADMIN_ROUTES.HOME)} />
    </div>
  );
}

function AdminGroupDetailRoute() {
  return <AdminGroupDetailPage />;
}

export function AdminPageContent() {
  const { uploadFiles } = usePhotoUpload();
  const uploadModeDialogOpen = useAtomValue(uploadModeDialogOpenAtom);
  
  

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden w-full relative">
      <div className="flex-1 flex flex-col min-w-0 relative h-full">
        <ErrorBoundary>
          <Switch>
            <Route path={ADMIN_ROUTES.BATCH_EDIT} component={AdminBatchEditRoute} />
            <Route path={ADMIN_ROUTES.BATCH} component={AdminBatchEditRoute} />
            
            <Route path={ADMIN_ROUTES.DIAGNOSTICS} component={AdminDiagRoute} />
            <Route path="/admin/diagnose" component={AdminDiagRoute} />
            <Route path="/diagnostics/:subpath*" component={AdminDiagRoute} />
            <Route path="/diagnostics" component={AdminDiagRoute} />

            <Route path={ADMIN_ROUTES.TASKS} component={AdminSettingsRoute} />
            <Route path={ADMIN_ROUTES.SETTINGS} component={AdminSettingsRoute} />
            <Route path={ADMIN_ROUTES.ERROR_LOGS} component={AdminSettingsRoute} />
            <Route path="/admin/system" component={AdminSettingsRoute} />
            <Route path="/settings/:subpath*" component={AdminSettingsRoute} />
            <Route path="/settings" component={AdminSettingsRoute} />

            <Route path={ADMIN_ROUTES.GROUP_DETAIL} component={AdminGroupDetailRoute} />

            <Route path="/admin/:subpath*" component={AdminGallery} />
            <Route path="/admin" component={AdminGallery} />
            
            <Route component={NotFoundPage} />
          </Switch>
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

      <UploadModeDialog 
        open={uploadModeDialogOpen}
        onOpenChange={(open) => patch({ uploadModeDialogOpen: open })}
        onSelectMode={(mode) => {
          patch({ uploadModeDialogOpen: false, uploadAsGroup: mode === 'group' });
          const input = document.getElementById('admin-quick-add-input') as HTMLInputElement;
          if (input) input.click();
        }}
      />
    </div>
  );
}
