import React, { startTransition, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X as CloseIcon, RefreshCcw, Save, Trash2 } from 'lucide-react';
import { useDisclosure } from '@mantine/hooks';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useBatchEdit } from '@/hooks';
import { BatchEditForm } from './edit/BatchEditForm';
import { supabase } from '@/lib/supabase';
import { reportError } from '@/lib/errorTracker';
import { photoKeys } from '@/lib/queryKeys';

function BatchDeleteButton({ selectedIds, onSuccess }: { selectedIds: string[], onSuccess: () => void }) {
  const [isDeleteOpen, deleteDialog] = useDisclosure(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (photoIds: string[]) => {
      const { data, error } = await supabase.from('furniture_items').delete().in('id', photoIds);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: photoKeys.all });
      onSuccess();
    },
    onError: (err) => {
      reportError(err as Error, 'BatchDeleteAction');
    }
  });

  const handleDelete = () => {
    if (selectedIds.length === 0) return;
    deleteDialog.open();
  };

  const confirmDelete = () => {
    deleteMutation.mutate(selectedIds);
  };

  const isPending = deleteMutation.isPending;

  return (
    <div className="relative">
      <button 
        onClick={handleDelete}
        disabled={isPending || selectedIds.length === 0}
        className="h-10 px-3 bg-red-50 text-red-500 
        rounded-xl flex items-center justify-center gap-1.5
        active:bg-red-100 transition-colors disabled:opacity-50 text-sm font-bold"
        title="批量删除"
      >
        <Trash2 size={16} />
        {isPending ? '删除中...' : `删除 (${selectedIds.length})`}
      </button>
      <ConfirmDialog
          open={isDeleteOpen}
          onOpenChange={deleteDialog.toggle}
          title="确认删除"
          description={`确认删除这 ${selectedIds.length} 项吗？`}
          confirmText="删除"
          variant="destructive"
          onConfirm={confirmDelete}
      />
      {deleteMutation.isError && <span className="absolute top-full left-0 mt-1 min-w-max text-[10px] bg-red-500 text-white px-2 py-1 rounded shadow">{(deleteMutation.error as Error).message}</span>}
    </div>
  );
}

export const BatchEditScreen = () => {
  const {
    batchEditIds,
    formState,
    handleUpdateForm,
    handleSave,
    handleDelete,
    handleClose,
    isLocalSaving,
    isSyncing,
    batchIsHiddenApplied,
    setBatchIsHiddenApplied,
    logic
  } = useBatchEdit();

  return (
    <div className="fixed inset-0 z-[var(--z-index-max)] bg-slate-50 flex flex-col pt-safe">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 
        bg-white flex items-center justify-between gap-3 shadow-sm">
        
        <h2 className="font-black text-base text-slate-800">
          批量修改 ({batchEditIds.length})
        </h2>
        
        <div className="flex items-center gap-2">
          {(logic.handleDeletePhotos as any) && (
            <BatchDeleteButton selectedIds={batchEditIds} onSuccess={handleClose} />
          )}

          <button onClick={handleSave}
            disabled={isLocalSaving || isSyncing}
            className={`px-3 h-10 bg-blue-600 text-white 
            rounded-xl flex items-center justify-center gap-1.5
            shadow-md text-sm font-bold transition-all ${(isLocalSaving || isSyncing) ? 'opacity-50 pointer-events-none' : 'active:bg-blue-700'}`}>
            {(isLocalSaving || isSyncing) ? <RefreshCcw size={16} className="animate-spin" /> : <Save size={16} />}
            {(isLocalSaving || isSyncing) ? '保存中...' : '保存'}
          </button>
          
          <button onClick={handleClose}
            className="w-10 h-10 bg-slate-100 text-slate-600 
            rounded-xl flex items-center justify-center 
            active:bg-slate-200"
            title="关闭批量修改"
          >
            <CloseIcon size={18} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar pb-32">
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
