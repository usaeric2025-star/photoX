import { useCallback, useEffect, useRef, useMemo } from 'react';
import { User, Photo, ProductFormData } from '@/types';
import { useGalleryStore, useShallow } from '@/store';
import { useTaskExecutor, useDeletePhotoMutation, useUpdatePhotoMutation, useBatchEditMutation, useGroupPhotosMutation, useUngroupMutation, useFeedback } from '@/hooks';
import { loadPhotosByGroupId } from '@/services/photoService';

/**
 * @hook-contract {
 *   "inputs": { "user": "User | null", "photos": "Photo[]", "onComplete": "() => void" },
 *   "outputs": {
 *     "formState": "ProductFormData",
 *     "newPhotoData": "Partial<Photo>",
 *     "showOtherFields": "boolean",
 *     "deletePhoto": "Function",
 *     "batchUpdatePhotos": "Function"
 *   },
 *   "invariants": [
 *     "返回具名對象而非數組",
 *     "內部管理相片的編輯與删除行為"
 *   ],
 *   "forbidden": ["禁止直接調用 supabase API 寫入"],
 *   "ai_maintenance_rule": "修改此 Hook 前必須先讀取並更新 @hook-contract"
 * }
 */
export const useAdminEdit = (user: User | null, photos: Photo[], onComplete?: () => void) => {
  const { runTask } = useTaskExecutor();
  const { showSuccess, showError } = useFeedback();
  const { mutateAsync: deletePhotoMut } = useDeletePhotoMutation();
  const { mutateAsync: updatePhotoMut } = useUpdatePhotoMutation();
  const { mutateAsync: batchUpdateMut } = useBatchEditMutation(user?.id || '')();
  const { mutateAsync: groupPhotosMut } = useGroupPhotosMutation();
  const { mutateAsync: ungroupMut } = useUngroupMutation();

  const { 
    formState, updateForm, newPhotoData, setNewPhotoData, 
    showOtherFields, setShowOtherFields, resetForm, isStaffMode, batchEditingIds
  } = useGalleryStore(useShallow(s => ({
    formState: s.formState,
    updateForm: s.updateForm,
    newPhotoData: s.newPhotoData,
    setNewPhotoData: s.setNewPhotoData,
    showOtherFields: s.showOtherFields,
    setShowOtherFields: s.setShowOtherFields,
    resetForm: s.resetForm,
    isStaffMode: s.isStaffMode,
    batchEditingIds: s.batchEditingIds
  })));

  const photosRef = useRef(photos);
  photosRef.current = photos;
  
  // ... (Consolidate PhotoManagement logic here...)
  
  // Calculate common attributes for batch editing
  const lastBatchIds = useRef<string[] | null>(null);

  useEffect(() => {
    if (!batchEditingIds || batchEditingIds.length === 0) {
        lastBatchIds.current = null;
        return;
    }
    
    // Only run initialization if batchEditingIds changed
    if (JSON.stringify(lastBatchIds.current) === JSON.stringify(batchEditingIds)) return;
    lastBatchIds.current = batchEditingIds;
    
    const selectedPhotos = photosRef.current.filter(p => batchEditingIds.includes(p.id));
    if (selectedPhotos.length === 0) return;

    // Helper for simple fields
    const getCommonValue = <T>(key: keyof Photo): T | undefined => {
      const first = selectedPhotos[0];
      const val = first[key];
      if (selectedPhotos.every(p => p[key] === val)) return val as T;
      return undefined;
    };

    const commonCategory = getCommonValue<string | null>('category_id');
    const commonManufacturer = getCommonValue<string | null>('manufacturer_id');
    
    // Tag intersection
    const commonTags = selectedPhotos.reduce<string[]>((acc, p, i) => {
      if (i === 0) return p.tag_ids || [];
      return acc.filter(id => (p.tag_ids || []).includes(id));
    }, []);

    // Only update if we have a valid common value (string or array)
    const updates: Partial<ProductFormData> = {};
    if (commonCategory !== undefined) updates.category_id = commonCategory;
    if (commonManufacturer !== undefined) updates.manufacturer_id = commonManufacturer;
    
    // For tags, simple check
    if (commonTags.length > 0) updates.tag_ids = commonTags;

    if (Object.keys(updates).length > 0) {
      updateForm(updates);
    }
    // @deps-contract: static=[updateForm] dynamic=[batchEditingIds, photos]
  }, [batchEditingIds, photos, updateForm]);

  // 批量编辑 API 调用
  const batchUpdatePhotos = useCallback(async (ids: string[], changes: any) => {
    try {
      await batchUpdateMut({ ids, updates: changes });
      showSuccess('批量更新成功');
      onComplete?.();
    } catch (err: any) {
      // Error handled by mutation
    }
  }, [batchUpdateMut, showSuccess, onComplete]);

  const deletePhoto = useCallback(async (idOrIds: string | string[]) => {
    const isStaff = isStaffMode || !!user;
    if (!isStaff) return;
    const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
    const targetPhotos = photos.filter(p => ids.includes(p.id));
    if (targetPhotos.length === 0) return;
    
    const opUserId = user?.id || targetPhotos[0]?.user_id || 'default';
    
    try {
      await deletePhotoMut({ userId: opUserId, photos: targetPhotos });
      showSuccess(ids.length > 1 ? `已删除 ${ids.length} 张照片` : '照片已删除');
      onComplete?.();
    } catch (err: any) {
      // Error handled by mutation
    }
  }, [user, isStaffMode, deletePhotoMut, photos, showSuccess, onComplete]);

  const updatePhotosBulk = useCallback(async (ids: string[], updates: Partial<Photo>, options?: { taskName?: string, skipToast?: boolean }) => {
    const isStaff = isStaffMode || !!user;
    if (ids.length === 0 || !isStaff) return;
    
    try {
      if (ids.length === 1) {
        await updatePhotoMut({ id: ids[0], updates });
        if (!options?.skipToast) {
            showSuccess('保存成功');
        }
      } else {
        await batchUpdateMut({ ids, updates });
        if (!options?.skipToast) {
            showSuccess(`已更新 ${ids.length} 张照片`);
        }
      }
      onComplete?.();
    } catch (err: any) {
      if (options?.skipToast) throw err;
      // Error handled by mutation
    }
  }, [user, isStaffMode, batchUpdateMut, updatePhotoMut, showSuccess, onComplete]);

  const updatePhoto = useCallback((id: string, updates: Partial<Photo>) => {
    return updatePhotosBulk([id], updates);
  }, [updatePhotosBulk]);

  const togglePinned = useCallback(async (photo: Photo) => {
    const isStaff = isStaffMode || !!user;
    if (!isStaff) return;
    const newStatus = !photo.is_pinned;
    let affectedIds = [photo.id];
    if (photo.group_id) {
      try {
        const dbGroupPhotos = await loadPhotosByGroupId(photo.group_id, true);
        affectedIds = dbGroupPhotos.length > 0
          ? dbGroupPhotos.map((p: Photo) => p.id)
          : photosRef.current.filter(p => p.group_id === photo.group_id).map(p => p.id);
      } catch (e) {
        affectedIds = photosRef.current.filter(p => p.group_id === photo.group_id).map(p => p.id);
      }
    }
    await updatePhotosBulk(affectedIds, { is_pinned: newStatus });
  }, [user, isStaffMode, updatePhotosBulk]);

  const setGroupCover = useCallback(async (id: string, groupId: string) => {
    const isStaff = isStaffMode || !!user;
    if (!isStaff) return;

    try {
      const oldCover = photosRef.current.find(p => p.group_id === groupId && p.is_group_cover);
      
      const updates = [];
      if (oldCover && oldCover.id !== id) {
          updates.push(updatePhotosBulk([oldCover.id], { is_group_cover: false }, { skipToast: true }));
      }
      updates.push(updatePhotosBulk([id], { is_group_cover: true }, { skipToast: true }));
      
      await Promise.all(updates);
      showSuccess('封面设置成功');
    } catch (err: any) {
      // Error handled by mutation
    }
  }, [user, isStaffMode, updatePhotosBulk, showSuccess]);

  const handleGroupPhotos = useCallback(async (photoIds: string[]) => {
    console.log('[useAdminEdit] Grouping photos:', photoIds);
    if (!photoIds || photoIds.length < 2) {
      showError(new Error('请选择至少 2 张照片'), '操作无效');
      return;
    }
    try {
      await groupPhotosMut({ photoIds });
      showSuccess('照片已合组');
      onComplete?.();
    } catch (err: any) {
      // Error handled by mutation
    }
  }, [groupPhotosMut, showSuccess, onComplete]);

  const handleAddToGroup = useCallback(async (photoIds: string[], groupId: string) => {
    if (!photoIds || photoIds.length === 0) return;
    try {
      await groupPhotosMut({ photoIds, targetGroupId: groupId });
      showSuccess('照片已加入群组');
      onComplete?.();
    } catch (err: any) {
      // Error handled by mutation
    }
  }, [groupPhotosMut, showSuccess, onComplete]);

  const handleBatchToggleHidden = useCallback(async (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    
    // Find if the majority or any are visible to decide target state
    const targetPhotos = photosRef.current.filter(p => ids.includes(p.id));
    const allHidden = targetPhotos.every(p => p.is_hidden);
    const nextStatus = !allHidden;

    await updatePhotosBulk(ids, { is_hidden: nextStatus });
  }, [updatePhotosBulk]);

  const handleUngroup = useCallback(async (groupId: string) => {
    try {
      await ungroupMut(groupId);
      showSuccess('分组已拆分');
      onComplete?.();
    } catch (err: any) {
      // Error handled by mutation
    }
  }, [ungroupMut, showSuccess, onComplete]);

  const resetAddState = useCallback(() => {
    setNewPhotoData(null);
    setShowOtherFields(false);
    resetForm();
  }, [setNewPhotoData, setShowOtherFields, resetForm]);

  return useMemo(() => ({ 
    deletePhoto, updatePhoto, updatePhotosBulk, handleGroupPhotos, handleUngroup,
    handleAddToGroup,
    handleBatchToggleHidden,
    togglePinned, setGroupCover,
    formState, updateForm, newPhotoData, setNewPhotoData, 
    showOtherFields, setShowOtherFields, resetAddState 
  }), [
    deletePhoto, updatePhoto, updatePhotosBulk, handleGroupPhotos, handleUngroup,
    handleAddToGroup,
    handleBatchToggleHidden,
    togglePinned, setGroupCover,
    formState, updateForm, newPhotoData, setNewPhotoData, 
    showOtherFields, setShowOtherFields, resetAddState 
  ]);
};
