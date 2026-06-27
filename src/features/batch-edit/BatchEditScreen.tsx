import React, { useCallback } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useDisclosure } from '@/hooks/core/useDisclosure';
import { useConfirm } from '@/context/ConfirmContext';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { usePhotoDelete } from '@/hooks';
import { BatchEditForm } from './BatchEditForm';
import { useBatchEdit } from './useBatchEdit';
import { useSelection } from '@/features/selection';
import { useFormSubmit } from '@/lib/forms/useFormSubmit';
import * as v from 'valibot';
import { Button } from '@/components/ui/Button';
import { type ProductFormData } from '@/types';

function BatchDeleteButton({ selectedIds, onSuccess }: { selectedIds: string[], onSuccess: () => void }) {
  const confirm = useConfirm();
  
  // Re-define mutation here to use standard TanStack Query
  const deleteMutation = usePhotoDelete();

  const handleConfirm = async () => {
    if (await confirm({
      title: "確認刪除",
      description: `確認刪除這 ${selectedIds.length} 項嗎？`,
      confirmText: "刪除",
      variant: "destructive"
    })) {
      await deleteMutation.mutateAsync(selectedIds);
      onSuccess();
    }
  };

  return (
    <div className="relative">
      <Button 
        onClick={handleConfirm}
        loading={deleteMutation.isMutating}
        disabled={selectedIds.length === 0}
        variant="destructive"
        className="h-10 px-3 flex items-center justify-center gap-1.5"
        leftIcon={!deleteMutation.isMutating && <Icon name="trash-2" size={16} />}
      >
        {deleteMutation.isMutating ? '刪除中...' : `刪除 (${selectedIds.length})`}
      </Button>
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
  } = useBatchEdit();

  const { selectedIds, clearSelection } = useSelection();

  const { submit: saveBatch, isLoading: isSaving } = useFormSubmit({
    schema: v.object({}),
    mutationFn: async () => {
      await originalSave(selectedIds);
      clearSelection();
      return true;
    },
    onSuccess: () => {
      handleClose();
    },
    successMessage: '批量儲存成功',
    errorMessage: '批量儲存失敗'
  });

  // Convert formState to match BatchEditForm's expected type (name as string)
  const photoEditFormState = React.useMemo(() => ({
    ...formState,
    name: typeof formState.name === 'object' ? formState.name.zh : (formState.name as string || '')
  }), [formState]);

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 pt-safe">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 
        bg-white flex items-center justify-between gap-3 shadow-sm">
        
        <h2 className="font-black text-base text-slate-800">
          批量修改 ({batchEditIds.length})
        </h2>
        
        <div className="flex items-center gap-2">
          <BatchDeleteButton 
            selectedIds={batchEditIds} 
            onSuccess={() => {
              clearSelection();
              handleClose();
            }} 
          />

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
          formState={photoEditFormState}
          handleUpdateForm={(updates) => handleUpdateForm(updates as unknown as ProductFormData)}
        />
      </div>
    </div>
  );
};
