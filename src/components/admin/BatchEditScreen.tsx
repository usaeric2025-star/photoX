import React, { useActionState, useOptimistic, startTransition, useEffect } from 'react';
import { X as CloseIcon, RefreshCcw, Save, Trash2 } from 'lucide-react';
import { useBatchEdit } from '@/hooks';
import { BatchEditForm } from './edit/BatchEditForm';
import { supabase } from '@/lib/supabase';
import { reportError } from '@/lib/errorTracker';
import { queryClient } from '@/lib/queryClient';
import { photoKeys } from '@/lib/queryKeys';

async function batchDeleteAction(prevState: { error: string | null; success?: boolean }, formData: FormData) {
  const photoIdsStr = formData.get('photoIds') as string;
  if (!photoIdsStr) return { error: null };
  const photoIds = JSON.parse(photoIdsStr);
  try {
    const { error } = await supabase.from('furniture_items').delete().in('id', photoIds);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: photoKeys.lists() });
    return { error: null, success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : '删除失败';
    reportError(err, 'BatchDeleteAction');
    return { error: message, success: false };
  }
}

function BatchDeleteButton({ selectedIds, onSuccess }: { selectedIds: string[], onSuccess: () => void }) {
  const [state, formAction, isPending] = useActionState(batchDeleteAction, { error: null });
  const [optimisticCount, setOptimisticCount] = useOptimistic(selectedIds.length);

  useEffect(() => {
    if (state.success) {
      onSuccess();
    }
  }, [state.success, onSuccess]);

  const handleDelete = () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`确认删除这 ${selectedIds.length} 项吗？`)) return;
    
    startTransition(() => {
      setOptimisticCount(0);
      const formData = new FormData();
      formData.append('photoIds', JSON.stringify(selectedIds));
      formAction(formData);
    });
  };

  return (
    <div className="relative">
      <button 
        onClick={handleDelete}
        disabled={isPending || optimisticCount === 0}
        className="h-10 px-3 bg-red-50 text-red-500 
        rounded-xl flex items-center justify-center gap-1.5
        active:bg-red-100 transition-colors disabled:opacity-50 text-sm font-bold"
        title="批量删除"
      >
        <Trash2 size={16} />
        {isPending ? '删除中...' : `删除 (${optimisticCount})`}
      </button>
      {state.error && <span className="absolute top-full left-0 mt-1 min-w-max text-[10px] bg-red-500 text-white px-2 py-1 rounded shadow">{state.error}</span>}
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
    <div className="fixed inset-0 z-[600] bg-slate-50 flex flex-col pt-safe">
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
