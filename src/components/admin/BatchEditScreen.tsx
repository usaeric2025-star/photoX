import React from 'react';
import { useErrorHandler } from '../../utils/errorHandler';
import { X as CloseIcon, RefreshCcw, ChevronRight, EyeOff, Eye, Save, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { ProductFormData } from '../../types';
import { useAdminPhoto, useAdminSession } from '../../context/AdminContexts';
import { TagEditor } from './TagEditor';
import { useAdminUI } from '../../context/AdminContexts';
import { FormSectionHeader, CategoryGrid, ManufacturerList } from './FormShared';

export const BatchEditScreen = ({
  resetAddState,
  saveBatchEdit,
  batchEditIds,
  formState,
  updateForm,
  batchIsHiddenApplied,
  setBatchIsHiddenApplied,
  showOtherFields,
  setShowOtherFields,
  onDelete,
}: {
  resetAddState: () => void;
  saveBatchEdit: (batchIsHiddenApplied: boolean) => Promise<void>;
  batchEditIds: string[] | null;
  formState: ProductFormData;
  updateForm: (updates: Partial<ProductFormData>) => void;
  batchIsHiddenApplied: boolean;
  setBatchIsHiddenApplied: (a: boolean) => void;
  showOtherFields: boolean;
  setShowOtherFields: (s: boolean) => void;
  onDelete?: (ids: string[]) => void;
}) => {
  const { handleError } = useErrorHandler();
  const { 
    quickAddManufacturer: quickAddMfr, 
    quickAddTag: quickAddT,
    categories,
    manufacturers,
    tags,
    updateTag,
    deleteTag
  } = useAdminPhoto();
  const { setPromptDialog, setAlertDialog } = useAdminUI();
  const { isSyncing, appLang } = useAdminSession();

  const handleDelete = () => {
    if (!batchEditIds || !onDelete) return;
    setAlertDialog({
      title: `确定要删除选中的 ${batchEditIds.length} 张照片吗？`,
      message: '此操作不可撤销，所有选中照片将从云端彻底移除。',
      onConfirm: async () => {
        await onDelete(batchEditIds);
        setAlertDialog(null);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[600] bg-slate-50 flex flex-col pt-safe">
      <div className="px-4 py-3 border-b border-slate-200 
        bg-white flex items-center justify-between gap-3 shadow-sm">
        
        <h2 className="font-black text-base text-slate-800">
          批量修改 ({batchEditIds?.length || 0})
        </h2>
        
        <div className="flex items-center gap-2">
          {onDelete && (
            <button 
              onClick={handleDelete}
              className="w-10 h-10 bg-red-50 text-red-500 
              rounded-xl flex items-center justify-center 
              active:bg-red-100 transition-colors"
              title="批量删除"
            >
              <Trash2 size={18} />
            </button>
          )}

          <button onClick={() => saveBatchEdit(batchIsHiddenApplied)}
            className={`w-10 h-10 bg-blue-600 text-white 
            rounded-xl flex items-center justify-center 
            shadow-md ${isSyncing ? 'opacity-50 pointer-events-none' : 'active:bg-blue-700'}`}>
            {isSyncing ? <RefreshCcw size={18} className="animate-spin" /> : <Save size={18} />}
          </button>
          <button onClick={resetAddState}
            className="w-10 h-10 bg-slate-100 text-slate-600 
            rounded-xl flex items-center justify-center 
            active:bg-slate-200">
            <CloseIcon size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar pb-32">
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-3xl">
          <p className="text-[11px] text-blue-700 font-medium leading-relaxed flex items-start gap-2">
            <span className="shrink-0 w-1.5 h-1.5 bg-blue-500 rounded-full mt-1"></span>
            注意：這會更新所有選中照片。僅手動修改的欄位會被套用至所有選取項目。
          </p>
        </div>

        <section className="space-y-4">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">產品名稱 / PRODUCT NAME</h3>
            <input 
              type="text" 
              placeholder="输入统一产品名称..."
              className="w-full bg-white border border-slate-200 p-5 rounded-3xl text-sm outline-none focus:border-blue-500 shadow-sm font-bold placeholder:text-slate-300"
              value={formState.name}
              onChange={(e) => updateForm({ name: e.target.value })}
            />
        </section>

        <section className="space-y-4">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">產品編號 / ITEM CODE</h3>
            <input 
              type="text" 
              placeholder="输入统一编号 (如: SK-2024)..."
              className="w-full bg-white border border-slate-200 p-5 rounded-3xl text-sm outline-none focus:border-blue-500 shadow-sm font-bold placeholder:text-slate-300"
              value={formState.manual_code}
              onChange={(e) => updateForm({ manual_code: e.target.value })}
            />
        </section>

        <section className="space-y-4">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">型號 / MODEL NUMBER</h3>
            <input 
              type="text" 
              placeholder="输入统一型号编号 (如: MOD-123)..."
              className="w-full bg-white border border-slate-200 p-5 rounded-3xl text-sm outline-none focus:border-blue-500 shadow-sm font-bold placeholder:text-slate-300"
              value={formState.model_number}
              onChange={(e) => updateForm({ model_number: e.target.value })}
            />
        </section>

        <section className="space-y-4">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">價格 / PRICE</h3>
            <input 
              type="text" 
              placeholder="输入统一价格..."
              className="w-full bg-white border border-slate-200 p-5 rounded-3xl text-sm outline-none focus:border-blue-500 shadow-sm font-bold placeholder:text-slate-300 text-blue-600"
              value={formState.price}
              onChange={(e) => updateForm({ price: e.target.value })}
            />
        </section>

        <section className="space-y-4">
          <FormSectionHeader title="產品目錄" subtitle="CATEGORY *" />
          <CategoryGrid 
            categories={categories}
            selectedId={formState.categoryId}
            onSelect={(id) => updateForm({ categoryId: id })}
            appLang={appLang}
          />
        </section>

        <section className="space-y-4">
          <FormSectionHeader 
            title="廠商名稱" 
            subtitle="MANUFACTURER" 
            onAction={quickAddMfr} 
          />
          <ManufacturerList 
            manufacturers={manufacturers}
            selectedId={formState.manufacturerId}
            onSelect={(id) => updateForm({ manufacturerId: id })}
          />
        </section>

         <section className="space-y-4">
          <TagEditor 
            tags={tags}
            selectedTagIds={formState.tagIds}
            onToggleTag={(tag) => {
              const tagIdStr = String(tag.id);
              const exists = formState.tagIds.map(String).includes(tagIdStr);
              if (exists) {
                updateForm({ 
                  tagIds: formState.tagIds.filter((tid: string) => String(tid) !== tagIdStr) 
                });
              } else if (formState.tagIds.length < 3) {
                updateForm({ 
                  tagIds: [...formState.tagIds, tagIdStr] 
                });
              }
            }}
            onUpdateTag={updateTag}
            onDeleteTag={deleteTag}
            onQuickAdd={quickAddT}
            onRenameTagRequest={(tag) => {
              setPromptDialog({
                title: '编辑标签 / Edit Tag',
                message: "输入标签名称 / Enter Tag Name:",
                placeholder: tag.name,
                onSubmit: (n) => {
                  if(n && n.trim()) { 
                    updateTag(tag.id, n.trim()); 
                  }
                }
              });
            }}
            showHotEffects={false}
          />
        </section>
      </div>
    </div>
  );
};
