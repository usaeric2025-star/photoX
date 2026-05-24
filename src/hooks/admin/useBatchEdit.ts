import { useState, useCallback, useEffect, useMemo } from 'react';
import { useGalleryStore, useShallow } from '@/store';
import { useTasks } from '@/hooks';
import { useAdmin } from '@/contexts/AdminContext';
import { safeArray } from '@/lib/utils';
import { useMountedRef } from '@/hooks/shared/useMountedRef';

export const useBatchEdit = () => {
  const logic = useAdmin();
  const {
    resetAddState, saveBatchEditWithSuccess: saveBatchEdit, batchEditIds,
    formState, updateForm, batchIsHiddenApplied, setBatchIsHiddenApplied,
    handleDeletePhotos: onDelete, resetForm, disableMultiSelect
  } = logic;
  
  const [isLocalSaving, setIsLocalSaving] = useState(false);
  const isMounted = useMountedRef();
  const { tasks } = useTasks();
  
  const isSyncing = useMemo(() => tasks.some(t => t.status === 'running' && (t.name.includes('同步') || t.name.includes('导入'))), [tasks]);

  const { 
    setAlertDialog,
    setBatchEditingIds
  } = useGalleryStore(useShallow(s => ({
    setAlertDialog: s.setAlertDialog,
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
      if (isMounted.current) {
        setBatchEditingIds(null);
      }
    } finally {
      if (isMounted.current) {
        setIsLocalSaving(false);
      }
    }
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
        await onDelete(batchEditIds);
        setAlertDialog(null);
        setBatchEditingIds(null);
        disableMultiSelect();
      }
    });
  }, [batchEditIds, onDelete, setAlertDialog, setBatchEditingIds, disableMultiSelect]);

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
    isLocalSaving,
    isSyncing,
    batchIsHiddenApplied,
    setBatchIsHiddenApplied,
    logic // pass through for other props if needed
  };
};
