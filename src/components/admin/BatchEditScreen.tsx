import React, { useCallback, useState, useEffect } from 'react';
import { X as CloseIcon, RefreshCcw, ChevronRight, EyeOff, Eye, Save, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { ProductFormData, Tag, ApiResponse, Photo } from '../../types';
import { PhotoTagSelector } from './edit/PhotoTagSelector';
import { FormSectionHeader, CategoryGrid, ManufacturerList } from './FormShared';
import { useGalleryStore, useShallow } from '../../store';
import { safeArray } from '../../lib/utils';
import { useCategoriesQuery, useTagsQuery, useManufacturersQuery } from '../../hooks';

import { useAdmin } from '../../contexts/AdminContext';

export const BatchEditScreen = () => {
  const logic = useAdmin();
  const {
    resetAddState, saveBatchEditWithSuccess: saveBatchEdit, batchEditIds,
    formState, updateForm, batchIsHiddenApplied, setBatchIsHiddenApplied,
    showOtherFields, setShowOtherFields, handleDeletePhotos: onDelete,
    quickAddManufacturer: quickAddMfr, quickAddTag: quickAddT,
    addTag, updateTag, deleteTag, resetForm
  } = logic;
  
  const [isLocalSaving, setIsLocalSaving] = useState(false);
  const { 
    setPromptDialog, 
    setAlertDialog,
    isSyncing,
    appLang,
    setBatchEditingIds
  } = useGalleryStore(useShallow(s => ({
    setPromptDialog: s.setPromptDialog,
    setAlertDialog: s.setAlertDialog,
    isSyncing: s.isSyncing,
    appLang: s.appLang,
    setBatchEditingIds: s.setBatchEditingIds
  })));

  useEffect(() => {
    resetForm();
  }, [resetForm]);

  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  const handleUpdateForm = useCallback((updates: any) => {
    updateForm(updates);
    const keys = Object.keys(updates);
    setTouchedFields(prev => {
        const next = new Set(prev);
        keys.forEach(k => next.add(k));
        return next;
    });
  }, [updateForm]);

  const handleSave = async () => {
    setIsLocalSaving(true);
    try {
      const changes: any = {};
      touchedFields.forEach(key => {
        changes[key] = (formState as any)[key];
      });
      
      if (Object.keys(changes).length === 0) {
        setAlertDialog({ title: '提示', message: '没有检测到修改', confirmLabel: '确定', onConfirm: () => setAlertDialog(null) });
        return;
      }
      
      await saveBatchEdit(changes);
      setBatchEditingIds(null);
    } finally {
      setIsLocalSaving(false);
    }
  };


  const { data: categories = [] } = useCategoriesQuery();
  const { data: manufacturers = [] } = useManufacturersQuery();
  const { data: tags = [] } = useTagsQuery();

  const handleDelete = useCallback(() => {
    if (!batchEditIds || !onDelete) return;
    setAlertDialog({
      title: '确认删除',
      message: `确定要删除这 ${safeArray(batchEditIds).length} 张照片吗？此操作不可恢复。`,
      confirmLabel: '删除',
      cancelLabel: '取消',
      type: 'danger',
      onConfirm: async () => {
        await onDelete(batchEditIds);
        setAlertDialog(null);
      }
    });
  }, [batchEditIds, onDelete, setAlertDialog]);

  const handleImageClick = useCallback((photo: Photo) => {
    // Need access to logic from parent, but this function is in BatchEditScreen
    // As per instructions, not refactoring entire architecture, keeping logic same as possible
  }, []); // Placeholder as logic was not fully visible here

  return (
    <div className="fixed inset-0 z-[600] bg-slate-50 flex flex-col pt-safe">
      <div className="px-4 py-3 border-b border-slate-200 
        bg-white flex items-center justify-between gap-3 shadow-sm">
        
        <h2 className="font-black text-base text-slate-800">
          批量修改 ({safeArray(batchEditIds).length})
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

          <button onClick={handleSave}
            className={`w-10 h-10 bg-blue-600 text-white 
            rounded-xl flex items-center justify-center 
            shadow-md ${(isLocalSaving || isSyncing) ? 'opacity-50 pointer-events-none' : 'active:bg-blue-700'}`}>
            {(isLocalSaving || isSyncing) ? <RefreshCcw size={18} className="animate-spin" /> : <Save size={18} />}
          </button>
          <button onClick={() => { resetAddState(); setBatchEditingIds(null); }}
            className="w-10 h-10 bg-slate-100 text-slate-600 
            rounded-xl flex items-center justify-center 
            active:bg-slate-200"
            title="关闭批量修改"
          >
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
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">产品名称 / PRODUCT NAME</h3>
            <input 
              type="text" 
              placeholder="输入统一产品名称..."
              className="w-full bg-white border border-slate-200 p-5 rounded-3xl text-sm outline-none focus:border-blue-500 shadow-sm font-bold placeholder:text-slate-300"
              value={formState.name}
              onChange={(e) => handleUpdateForm({ name: e.target.value })}
            />
        </section>

        <section className="space-y-4">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">产品编号 / ITEM CODE</h3>
            <input 
              type="text" 
              placeholder="输入统一编号 (如: SK-2024)..."
              className="w-full bg-white border border-slate-200 p-5 rounded-3xl text-sm outline-none focus:border-blue-500 shadow-sm font-bold placeholder:text-slate-300"
              value={formState.manual_code}
              onChange={(e) => handleUpdateForm({ manual_code: e.target.value })}
            />
        </section>

        <section className="space-y-4">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">型號 / MODEL NUMBER</h3>
            <input 
              type="text" 
              placeholder="输入统一型号编号 (如: MOD-123)..."
              className="w-full bg-white border border-slate-200 p-5 rounded-3xl text-sm outline-none focus:border-blue-500 shadow-sm font-bold placeholder:text-slate-300"
              value={formState.model_number}
              onChange={(e) => handleUpdateForm({ model_number: e.target.value })}
            />
        </section>

        <section className="space-y-4">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">價格 / PRICE</h3>
            <input 
              type="text" 
              placeholder="输入统一价格..."
              className="w-full bg-white border border-slate-200 p-5 rounded-3xl text-sm outline-none focus:border-blue-500 shadow-sm font-bold placeholder:text-slate-300 text-blue-600"
              value={formState.price}
              onChange={(e) => handleUpdateForm({ price: e.target.value })}
            />
        </section>

        <section className="space-y-4">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">显示状态 / VISIBILITY</h3>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setBatchIsHiddenApplied(true);
                  handleUpdateForm({ is_hidden: false });
                }}
                className={`flex-1 flex flex-col items-center justify-center gap-1 p-4 rounded-2xl border-2 transition-all ${batchIsHiddenApplied && !formState.is_hidden ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-slate-50 text-slate-400 border-slate-100'}`}
              >
                <Eye size={16} />
                <span className="text-[10px] font-black uppercase">全部显示</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setBatchIsHiddenApplied(true);
                  handleUpdateForm({ is_hidden: true });
                }}
                className={`flex-1 flex flex-col items-center justify-center gap-1 p-4 rounded-2xl border-2 transition-all ${batchIsHiddenApplied && formState.is_hidden ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-white border-slate-50 text-slate-400 border-slate-100'}`}
              >
                <EyeOff size={16} />
                <span className="text-[10px] font-black uppercase">全部屏蔽</span>
              </button>
              <button
                type="button"
                onClick={() => setBatchIsHiddenApplied(false)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 p-4 rounded-2xl border-2 transition-all ${!batchIsHiddenApplied ? 'bg-slate-100 border-slate-400 text-slate-700' : 'bg-white border-slate-50 text-slate-400 border-slate-100'}`}
              >
                <RefreshCcw size={14} />
                <span className="text-[10px] font-black uppercase">保持现状</span>
              </button>
            </div>
        </section>

        <section className="space-y-4">
          <FormSectionHeader title="产品目录" subtitle="CATEGORY *" />
          <CategoryGrid 
            categories={categories}
            selectedId={formState.category_id}
            onSelect={(id) => handleUpdateForm({ category_id: id })}
            appLang={appLang}
          />
        </section>

        <section className="space-y-4">
          <FormSectionHeader 
            title="厂商名称" 
            subtitle="MANUFACTURER" 
            onAction={quickAddMfr} 
          />
          <ManufacturerList 
            manufacturers={manufacturers}
            selectedId={formState?.manufacturer_id}
            onSelect={(id) => handleUpdateForm({ manufacturer_id: id })}
          />
        </section>

         <section className="space-y-4">
          <PhotoTagSelector 
            tags={tags}
            selectedTagIds={safeArray<string>(formState.tag_ids)}
            onChange={(newIds) => handleUpdateForm({ tag_ids: newIds })}
            addTag={addTag}
            updateTag={updateTag}
            deleteTag={deleteTag}
          />
        </section>
      </div>
    </div>
  );
};
