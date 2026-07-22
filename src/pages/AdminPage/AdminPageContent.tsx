import { useAtomValue } from 'jotai';
import { uploadModeDialogOpenAtom, uploadAsGroupAtom } from '#src/store/index.js';
import { patch } from '#lib/store/index.js';
import React, { useEffect } from 'react';
import { ErrorBoundary } from '#src/components/shared/ErrorBoundary.js';
import { Outlet } from 'react-router-dom';
import { UploadModeDialog } from '#src/features/upload/components/UploadModeDialog.js';
import { usePhotoUpload, useSelectionActions } from '#src/hooks/index.js';
import { useNormalizedLocation } from '#src/hooks/core/index.js';
import { SelectionToolbar } from '#src/features/selection/index.js';

export function AdminPageContent({ children }: { children?: React.ReactNode }) {
  const { uploadFiles } = usePhotoUpload();
  const uploadModeDialogOpen = useAtomValue(uploadModeDialogOpenAtom);
  const uploadAsGroup = useAtomValue(uploadAsGroupAtom);
  const { clearSelection } = useSelectionActions();
  const [location] = useNormalizedLocation();

  const lastPathname = React.useRef(location.split('?')[0]);
  useEffect(() => {
    const currentPathname = location.split('?')[0];
    const isBatchEdit = currentPathname.includes('batch-edit');
    
    if (currentPathname !== lastPathname.current && !isBatchEdit) {
      clearSelection();
    }
    lastPathname.current = currentPathname;
  }, [location, clearSelection]);

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden w-full relative">
      <div className="flex-1 flex flex-col min-w-0 relative h-full">
        <ErrorBoundary>
          {children || <Outlet />}
        </ErrorBoundary>
        <SelectionToolbar />
      </div>

      <input 
        type="file" id="admin-quick-add-input" multiple accept="image/*" className="hidden" 
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            uploadFiles({
              files: Array.from(e.target.files),
              asGroup: uploadAsGroup
            });
            e.target.value = '';
          }
        }}
      />
      <UploadModeDialog 
        open={uploadModeDialogOpen} 
        onOpenChange={(open) => patch({ uploadModeDialogOpen: open })}
        onSelectMode={(mode) => {
          patch({ uploadModeDialogOpen: false, uploadAsGroup: mode === 'group' });
          const input = document.getElementById('admin-quick-add-input') as HTMLInputElement;
          input?.click();
        }}
      />
    </div>
  );
}
