import { useState, useCallback, useEffect, useMemo } from 'react';
import { useGalleryStore, useShallow } from '@/store';
import { useTasks, useTaskExecutor } from '@/hooks';
import { useAdmin } from '@/contexts/AdminContext';
import { safeArray } from '@/lib/utils';

export const useBatchEdit = () => {
  const logic = useAdmin();
  const {
    resetAddState, saveBatchEditWithSuccess: saveBatchEdit, batchEditIds,
    formState, updateForm, batchIsHiddenApplied, setBatchIsHiddenApplied,
    handleDeletePhotos: onDelete, resetForm, disableMultiSelect
  } = logic;
  
  const { runTask } = useTaskExecutor();
  const { tasks } = useTasks();
  
  const isSaving = useMemo(() => tasks.some(t => t.status === 'running' && t.name.includes('保存')), [tasks]);
  const isSyncing = useMemo(() => tasks.some(t => t.status === 'running' && (t.name.includes('同步') || t.name.includes('导入'))), [tasks]);

  const { 
    setAlertDialog,
    setBatchEditingIds
  } = useGalleryStore(useShallow(s => ({
    setAlertDialog: s.setAlertDialog,
    setBatchEditingIds: s.setBatchEditingIds
  })));

  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  useEffect(() => {
    resetForm();
  }, [resetForm]);

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
    const changes: any = {};
    touchedFields.forEach(key => {
      changes[key] = (formState as any)[key];
    });
    
    if (Object.keys(changes).length === 0) {
      setAlertDialog({ title: '提示', message: '没有检测到修改', confirmLabel: '确定', onConfirm: () => setAlertDialog(null) });
      return;
    }

    await runTask('保存批量修改', async () => {
      await saveBatchEdit(changes);
      setBatchEditingIds(null);
    }, { showSuccessToast: true });
  };

  const handleDelete = useCallback(() => {
    if (!batchEditIds || !onDelete) return;
    setAlertDialog({
      title: '确认删除',
      message: `确定要删除这 ${safeArray(batchEditIds).length} 张照片吗？此操作不可恢复。`,
      confirmLabel: '删除',
      cancelLabel: '取消',
      type: 'danger',
      onConfirm: async () => {
        await runTask('删除照片', async () => {
          await onDelete(batchEditIds);
          setAlertDialog(null);
          setBatchEditingIds(null);
          disableMultiSelect();
        }, { showSuccessToast: true });
      }
    });
  }, [batchEditIds, onDelete, setAlertDialog, setBatchEditingIds, disableMultiSelect, runTask]);

  const handleClose = useCallback(() => {
    resetAddState(); 
    setBatchEditingIds(null); 
    disableMultiSelect();
  }, [resetAddState, setBatchEditingIds, disableMultiSelect]);

  return {
    batchEditIds: safeArray(batchEditIds),
    formState,
    handleUpdateForm,
    handleSave,
    handleDelete,
    handleClose,
    isLocalSaving: isSaving,
    isSyncing,
    batchIsHiddenApplied,
    setBatchIsHiddenApplied,
    logic
  };
};
