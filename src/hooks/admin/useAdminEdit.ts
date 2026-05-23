import { useCallback, useEffect, useRef } from 'react';
import { User, Photo, ProductFormData } from '@/types';
import { useGalleryStore, useShallow } from '@/store';
import { useTaskExecutor, useDeletePhotoMutation, useUpdatePhotoMutation, useBatchEditMutation, useGroupPhotosMutation, useUngroupMutation, useFeedback } from '@/hooks';
import { loadPhotosByGroupId } from '@/services/photoService';

export const useAdminEdit = (user: User | null, photos: Photo[]) => {
  const { runTask } = useTaskExecutor();
  const { showSuccess, showError } = useFeedback();
  const { mutateAsync: deletePhotoMut } = useDeletePhotoMutation();
  const { mutateAsync: updatePhotoMut } = useUpdatePhotoMutation();
  const { mutateAsync: batchUpdateMut } = useBatchEditMutation(user?.id || '');
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

  // ... (Consolidate PhotoManagement logic here...)
  
  // Calculate common attributes for batch editing
  useEffect(() => {
    if (!batchEditingIds || batchEditingIds.length === 0) return;
    
    const selectedPhotos = photos.filter(p => batchEditingIds.includes(p.id));
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
    if (commonCategory !== undefined && formState.category_id !== commonCategory) updates.category_id = commonCategory;
    if (commonManufacturer !== undefined && formState.manufacturer_id !== commonManufacturer) updates.manufacturer_id = commonManufacturer;
    
    // For tags, simple check
    if (commonTags.length > 0 && JSON.stringify(formState.tag_ids) !== JSON.stringify(commonTags)) updates.tag_ids = commonTags;

    if (Object.keys(updates).length > 0) {
      updateForm(updates);
    }
  }, [batchEditingIds, photos, updateForm, formState.category_id, formState.manufacturer_id, formState.tag_ids]);

  // 批量编辑 API 调用
  const batchUpdatePhotos = useCallback(async (ids: string[], changes: any) => {
    await runTask('批量编辑', async () => {
      await batchUpdateMut({ ids, updates: changes });
    }, { showSuccessToast: true });
  }, [batchUpdateMut, runTask]);

  const deletePhoto = useCallback(async (idOrIds: string | string[]) => {

    const isStaff = isStaffMode || !!user;
    if (!isStaff) return;
    const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
    const targetPhotos = photos.filter(p => ids.includes(p.id));
    if (targetPhotos.length === 0) return;
    
    const opUserId = user?.id || targetPhotos[0]?.user_id || 'default';
    
    await runTask(ids.length > 1 ? `删除 ${ids.length} 张照片` : '删除照片', async () => {
        await deletePhotoMut({ userId: opUserId, photos: targetPhotos });
    }, { showSuccessToast: true });
  }, [user, isStaffMode, deletePhotoMut, photos, runTask]);

  const updatePhotosBulk = useCallback(async (ids: string[], updates: Partial<Photo>, options?: { taskName?: string, skipToast?: boolean }) => {
    const isStaff = isStaffMode || !!user;
    if (ids.length === 0 || !isStaff) return;
    
    // For single photo updates (saves, rotations, edits), apply directly and optimistically
    // to bypass the heavy background task queue UI for a frictionless, ultra-responsive feel
    if (ids.length === 1) {
      try {
        await updatePhotoMut({ id: ids[0], updates });
        if (!options?.skipToast) {
            showSuccess('保存成功');
        }
      } catch (err: any) {
        if (!options?.skipToast) {
            showError(err, '保存失败');
        } else {
            throw err;
        }
      }
      return;
    }

    await runTask(options?.taskName || `更新 ${ids.length} 张照片`, async ({ updateProgress }) => {
        updateProgress(50, '正在应用批量更新...');
        await batchUpdateMut({ ids, updates });
    }, { showSuccessToast: !options?.skipToast });
  }, [user, isStaffMode, batchUpdateMut, updatePhotoMut, runTask, showSuccess, showError]);

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
          : photos.filter(p => p.group_id === photo.group_id).map(p => p.id);
      } catch (e) {
        affectedIds = photos.filter(p => p.group_id === photo.group_id).map(p => p.id);
      }
    }
    await updatePhotosBulk(affectedIds, { is_pinned: newStatus });
  }, [user, isStaffMode, photos, updatePhotosBulk]);

  const setGroupCover = useCallback(async (id: string, groupId: string) => {
    const isStaff = isStaffMode || !!user;
    if (!isStaff) return;

    await runTask('设置封面', async () => {
        const oldCover = photos.find(p => p.group_id === groupId && p.is_group_cover);
        
        const updates = [];
        if (oldCover && oldCover.id !== id) {
            updates.push(updatePhotosBulk([oldCover.id], { is_group_cover: false }, { skipToast: true }));
        }
        updates.push(updatePhotosBulk([id], { is_group_cover: true }, { skipToast: true }));
        
        await Promise.all(updates);
    }, { showSuccessToast: true });
  }, [user, isStaffMode, photos, updatePhotosBulk, runTask]);

  const handleGroupPhotos = useCallback(async (photoIds: string[]) => {
    await runTask('分组照片', async () => {
      await groupPhotosMut(photoIds);
    }, { showSuccessToast: true });
  }, [groupPhotosMut, runTask]);

  const handleUngroup = useCallback(async (groupId: string) => {
    await runTask('拆分群组', async () => {
      await ungroupMut(groupId);
    }, { showSuccessToast: true });
  }, [ungroupMut, runTask]);

  const resetAddState = useCallback(() => {
    setNewPhotoData(null);
    setShowOtherFields(false);
    resetForm();
  }, [setNewPhotoData, setShowOtherFields, resetForm]);

  return { 
    deletePhoto, updatePhoto, updatePhotosBulk, handleGroupPhotos, handleUngroup,
    togglePinned, setGroupCover,
    formState, updateForm, newPhotoData, setNewPhotoData, 
    showOtherFields, setShowOtherFields, resetAddState 
  };
};
