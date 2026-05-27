import React from 'react';
import { X as CloseIcon, RefreshCcw, Save, Trash2 } from 'lucide-react';
import { useBatchEdit } from '@/hooks/admin/useBatchEdit';
import { BatchEditForm } from './edit/BatchEditForm';

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
            <button 
              onClick={handleDelete}
              disabled={isLocalSaving || isSyncing}
              className="w-10 h-10 bg-red-50 text-red-500 
              rounded-xl flex items-center justify-center 
              active:bg-red-100 transition-colors disabled:opacity-50"
              title="批量删除"
            >
              <Trash2 size={18} />
            </button>
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
