import { useAtomValue, getDefaultStore } from 'jotai';
import { uploadModeDialogOpenAtom, uploadAsGroupAtom } from '#src/store/index.js';
import { patch } from '#lib/store/index.js';
import React, { Suspense, lazy, useEffect } from 'react';
import { Icon } from '#src/components/ui/Icon.js';
import { LoadingSpinner } from '#src/components/ui/feedback/LoadingSpinner.js';
import { } from '#lib/store/index.js';
import { ErrorBoundary } from '#src/components/shared/ErrorBoundary.js';
import { LocalErrorBoundary } from '#src/components/ui/feedback/LocalErrorBoundary.js';

import { UploadModeDialog } from '#src/features/upload/components/UploadModeDialog.js';

import { usePhotoUpload, useSelectionActions } from '#src/hooks/index.js';
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
  const { clearSelection } = useSelectionActions();
  const [location] = useNormalizedLocation();

  // Clear selection on context change (navigation) to prevent "mysterious" photo inclusion
  // This addresses the user concern that unselected photos occasionally enter groups
  const lastPathname = React.useRef(location.split('?')[0]);
  useEffect(() => {
    const currentPathname = location.split('?')[0];
    const isBatchEdit = currentPathname.includes('batch-edit');
    
    // 如果路徑發生重大變化（非進入批量編輯頁面），則清空選取
    if (currentPathname !== lastPathname.current && !isBatchEdit) {
      clearSelection();
    }
    lastPathname.current = currentPathname;
  }, [location, clearSelection]);

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden w-full relative">
      <div className="flex-1 flex flex-col min-w-0 relative h-full">
        <ErrorBoundary>
          <Switch>
            <Route path={ADMIN_ROUTES.BATCH_EDIT} component={AdminBatchEditRoute} />
            <Route path={`${ADMIN_ROUTES.BATCH_EDIT}/:subpath*`} component={AdminBatchEditRoute} />
            <Route path={ADMIN_ROUTES.BATCH} component={AdminBatchEditRoute} />
            <Route path={`${ADMIN_ROUTES.BATCH}/:subpath*`} component={AdminBatchEditRoute} />
            
            <Route path={ADMIN_ROUTES.DIAGNOSTICS} component={AdminDiagRoute} />
            <Route path={`${ADMIN_ROUTES.DIAGNOSTICS}/:subpath*`} component={AdminDiagRoute} />
            <Route path="/admin/diagnose" component={AdminDiagRoute} />
            <Route path="/admin/diagnose/:subpath*" component={AdminDiagRoute} />
            <Route path="/diagnostics/:subpath*" component={AdminDiagRoute} />

            <Route path={ADMIN_ROUTES.TASKS} component={AdminSettingsRoute} />
            <Route path={`${ADMIN_ROUTES.TASKS}/:subpath*`} component={AdminSettingsRoute} />
            <Route path={ADMIN_ROUTES.SETTINGS} component={AdminSettingsRoute} />
            <Route path={`${ADMIN_ROUTES.SETTINGS}/:subpath*`} component={AdminSettingsRoute} />
            <Route path={ADMIN_ROUTES.ERROR_LOGS} component={AdminSettingsRoute} />
            <Route path={`${ADMIN_ROUTES.ERROR_LOGS}/:subpath*`} component={AdminSettingsRoute} />
            <Route path="/admin/system" component={AdminSettingsRoute} />
            <Route path="/admin/system/:subpath*" component={AdminSettingsRoute} />
            <Route path="/settings/:subpath*" component={AdminSettingsRoute} />

            <Route path={ADMIN_ROUTES.GROUP_DETAIL} component={AdminGroupDetailRoute} />
            <Route path={`${ADMIN_ROUTES.GROUP_DETAIL_BASE}/:id/:subpath*`} component={AdminGroupDetailRoute} />

            {/* Admin Gallery as the default view for anything under /admin */}
            <Route path="/admin/:subpath*">
              <LocalErrorBoundary name="AdminGallery">
                <AdminGallery />
              </LocalErrorBoundary>
            </Route>
            <Route path="/admin">
              <LocalErrorBoundary name="AdminGallery">
                <AdminGallery />
              </LocalErrorBoundary>
            </Route>
            
            <Route component={() => <NotFoundPage />} />
          </Switch>
        </ErrorBoundary>
        <SelectionToolbar />
      </div>

      <input 
        type="file" id="admin-quick-add-input" multiple accept="image/*" className="hidden" 
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            const isGroup = getDefaultStore().get(uploadAsGroupAtom);
            uploadFiles({
              files: e.target.files,
              asGroup: isGroup
            });
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
