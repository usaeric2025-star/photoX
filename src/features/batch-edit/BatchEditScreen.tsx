import React, { useCallback } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useDisclosure } from '@/hooks/core/useDisclosure';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { usePhotoDelete } from '@/hooks';
import { BatchEditForm } from './BatchEditForm';
import { useBatchEditSelection } from './useBatchEditSelection';
import { useFormSubmit } from '@/lib/form/useFormSubmit';
import { type } from 'arktype';
import { Button } from '@/components/ui/Button';

function BatchDeleteButton({ selectedIds, onSuccess }: { selectedIds: string[], onSuccess: () => void }) {
  const [isDeleteOpen, deleteDialog] = useDisclosure(false);
  
  // Re-define mutation here to use standard TanStack Query
  const deleteMutation = usePhotoDelete();

  const handleConfirm = async () => {
    await deleteMutation.mutateAsync(selectedIds);
    onSuccess();
    deleteDialog.close();
  };

  return (
    <div className="relative">
      <Button 
        onClick={() => deleteDialog.open()}
        loading={deleteMutation.isPending}
        disabled={selectedIds.length === 0}
        variant="danger"
        className="h-10 px-3 flex items-center justify-center gap-1.5"
        leftIcon={!deleteMutation.isPending && <Icon name="trash-2" size={16} />}
      >
        {deleteMutation.isPending ? '刪除中...' : `刪除 (${selectedIds.length})`}
      </Button>
      <ConfirmDialog
          open={isDeleteOpen}
          onOpenChange={deleteDialog.toggle}
          title="確認刪除"
          description={`確認刪除這 ${selectedIds.length} 項嗎？`}
          confirmText="刪除"
          variant="destructive"
          onConfirm={handleConfirm}
      />
    </div>
  );
}

export const BatchEditScreen = () => {
  const {
    batchEditIds,
    formState,
    handleUpdateForm,
    handleSave: originalSave,
    handleClose,
    isSyncing,
    batchIsHiddenApplied,
    setBatchIsHiddenApplied,
    logic
  } = useBatchEditSelection();

  const { submit: saveBatch, isLoading: isSaving } = useFormSubmit({
    schema: type('unknown'),
    mutationFn: async () => {
      await originalSave();
      return true;
    },
    onSuccess: () => {
      handleClose();
    },
    successMessage: '批量儲存成功',
    errorMessage: '批量儲存失敗'
  });

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 pt-safe">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 
        bg-white flex items-center justify-between gap-3 shadow-sm">
        
        <h2 className="font-black text-base text-slate-800">
          批量修改 ({batchEditIds.length})
        </h2>
        
        <div className="flex items-center gap-2">
          {logic && (
            <BatchDeleteButton selectedIds={batchEditIds} onSuccess={handleClose} />
          )}

          <Button onClick={() => saveBatch({})}
            loading={isSaving || isSyncing}
            variant="primary"
            className="px-3 h-10 flex items-center justify-center gap-1.5 shadow-md text-sm bg-blue-600 hover:bg-blue-700"
            leftIcon={!(isSaving || isSyncing) && <Icon name="save" size={16} />}
          >
            {(isSaving || isSyncing) ? '儲存中...' : '儲存'}
          </Button>
          
          <button onClick={handleClose}
            className="w-10 h-10 bg-slate-100 text-slate-600 
            rounded-xl flex items-center justify-center 
            active:bg-slate-200"
            title="關閉批量修改"
          >
            <Icon name="x" size={18} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden bg-slate-50 relative">
        <BatchEditForm 
          formState={formState}
          handleUpdateForm={handleUpdateForm}
          batchIsHiddenApplied={batchIsHiddenApplied}
          setBatchIsHiddenApplied={setBatchIsHiddenApplied}
          quickAddMfr={logic.quickAddManufacturer}
          addTag={logic.addTag}
          updateTag={logic.updateTag}
          deleteTag={logic.deleteTag}
        />
      </div>
    </div>
  );
};
