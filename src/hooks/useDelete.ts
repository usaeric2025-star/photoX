
import { useDeleteTagMutation, useDeleteCategoryMutation, useDeleteManufacturerMutation } from './mutations/useAdminMutations';
import { useDeletePhotoMutation } from './mutations/useDeletePhoto';
import { useDeleteGroupFromCloudMutation } from './mutations/useGroupOperations';
import { Photo } from '../types';

export function useDelete() {
  const deletePhotoMutation = useDeletePhotoMutation();
  const deleteTagMutation = useDeleteTagMutation();
  const deleteCategoryMutation = useDeleteCategoryMutation();
  const deleteManufacturerMutation = useDeleteManufacturerMutation();
  const deleteGroupMutation = useDeleteGroupFromCloudMutation();

  const deletePhotos = async (
    idOrIds: string | string[], 
    photos: Photo[],
    onProgress?: (current: number, total: number) => void,
    signal?: AbortSignal
  ): Promise<{ success: boolean, error?: any }> => {
    const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
    const photosToDelete = photos.filter(p => ids.includes(p.id));

    try {
      // Need to find which user owns these. For now assume current user if we had one.
      // Better: Get user from context or pass it.
      // In this app, we typically have a single user or handle it in the service if needed.
      // But useDeletePhotoMutation explicitly asks for {userId, photos}.
      const userId = photosToDelete[0]?.userId || ''; 
      await deletePhotoMutation.mutateAsync({ userId, photos: photosToDelete });
      return { success: true };
    } catch (err) {
      return { success: false, error: err };
    }
  };

  const deleteGroup = async (groupId: string): Promise<{ success: boolean, error?: any }> => {
    try {
      await deleteGroupMutation.mutateAsync(groupId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err };
    }
  };

  const deleteTag = async (tagId: string): Promise<{ success: boolean, error?: any }> => {
    try {
      await deleteTagMutation.mutateAsync(tagId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err };
    }
  };

  const deleteCategory = async (categoryId: string): Promise<{ success: boolean, error?: any }> => {
    try {
      await deleteCategoryMutation.mutateAsync(categoryId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err };
    }
  };

  const deleteManufacturer = async (mfrId: string): Promise<{ success: boolean, error?: any }> => {
    try {
      await deleteManufacturerMutation.mutateAsync(mfrId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err };
    }
  };

  return {
    deletePhotos,
    deleteGroup,
    deleteTag,
    deleteCategory,
    deleteManufacturer
  };
}
