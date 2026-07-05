import React, { useCallback } from 'react';
import { Icon } from '#src/components/ui/Icon.js';
import { useDisclosure } from '#src/hooks/core/useDisclosure.js';
import { useConfirm } from '#src/context/ConfirmContext.js';
import { ConfirmDialog } from '#src/components/ui/ConfirmDialog.js';
import { usePhotoMutations, useTranslation } from '#src/hooks/index.js';
import { BatchEditForm } from './BatchEditForm.js';
import { useBatchEdit } from '#src/hooks/index.js'; // fixed import path
import { useSelectedIds, useSelectionActions } from '#src/hooks/index.js';
import { useFormSubmit } from '#lib/forms/useFormSubmit.js';
import * as v from 'valibot';
import { Button } from '#src/components/ui/Button.js';
import { type ProductFormData } from '#src/types/index.js';

function BatchDeleteButton({ selectedIds, onSuccess }: { selectedIds: string[], onSuccess: () => void }) {
  const confirm = useConfirm();
  
  // Re-define mutation here to use standard TanStack Query
  const { deletePhotoAsync, deleteMutation } = usePhotoMutations();

  const { t } = useTranslation();
  const handleConfirm = async () => {
    if (await confirm({
      title: t('confirmDeleteTitleBatch'),
      description: t('confirmDeleteCount', selectedIds.length),
      confirmText: t('delete'),
      variant: "destructive"
    })) {
      await deletePhotoAsync(selectedIds);
      onSuccess();
    }
  };

  return (
    <div className="relative">
      <Button 
        onClick={handleConfirm}
        loading={deleteMutation.isPending}
        disabled={selectedIds.length === 0}
        variant="destructive"
        className="h-10 px-3 flex items-center justify-center gap-1.5"
        leftIcon={!deleteMutation.isPending && <Icon name="trash-2" size={16} />}
      >
        {deleteMutation.isPending ? t('deleting') : `${t('delete')} (${selectedIds.length})`}
      </Button>
    </div>
  );
}

import { StandardModalLayout } from '#src/components/ui/StandardModalLayout.js';

export const BatchEditScreen = () => {
  const {
    batchEditIds,
    formState,
    handleUpdateForm,
    handleSave: originalSave,
    handleClose,
    isSyncing,
  } = useBatchEdit();

  const selectedIds = useSelectedIds();
  const { clearSelection } = useSelectionActions();

  const { t } = useTranslation();

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
    successMessage: t('saveSuccessToast'),
    errorMessage: t('updateFailedToast')
  });

  // Convert formState to match BatchEditForm's expected type (name as string)
  const photoEditFormState = React.useMemo(() => ({
    ...formState,
    name: formState.name as string || ''
  }), [formState]);

  return (
    <StandardModalLayout
      onClose={handleClose}
      className="bg-slate-50"
      header={
        <div className="flex items-center justify-between gap-3 w-full">
          <h2 className="font-black text-base text-slate-800">
            {t('batchEditTitle', batchEditIds.length)}
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
              {(isSaving || isSyncing) ? t('saving') : t('save')}
            </Button>
            
            <button onClick={handleClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-900"
              title={t('closeBatchEdit')}
            >
              <Icon name="x" size={24} />
            </button>
          </div>
        </div>
      }
    >
      <div className="mt-6">
        <BatchEditForm 
          formState={photoEditFormState}
          handleUpdateForm={(updates) => handleUpdateForm(updates as Record<string, unknown>)}
        />
      </div>
    </StandardModalLayout>
  );
};
