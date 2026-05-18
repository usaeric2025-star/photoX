import { 
  useUpdateTagMutation, useDeleteTagMutation, 
  useUpdateCategoryMutation, useDeleteCategoryMutation,
  useAddTagMutation, useAddCategoryMutation,
  useAddManufacturerMutation, useUpdateManufacturerMutation, useDeleteManufacturerMutation,
} from './mutations/useAdminMutations';
import { useQueryClient } from '@tanstack/react-query';
import { useGalleryStore } from '../store';
import { safeArray } from '../lib/utils';
import { useErrorHandler } from '../utils/errorHandler';
import { Category, Photo, Tag, Manufacturer } from '../types';
import { useCategoriesQuery, useTagsQuery, useManufacturersQuery } from './';
import { QUERY_KEYS } from './queries/keys';

export const useAdminCategory = (adminUI: {
  setAlertDialog: (d: { title: string, message: string, onConfirm?: () => void, onCancel?: () => void, confirmLabel?: string, type?: 'danger' | 'info' } | null) => void;
}) => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();
  const { data: categories = [] } = useCategoriesQuery();
  const { data: tags = [] } = useTagsQuery();
  const { data: manufacturers = [] } = useManufacturersQuery();

  const addTagMutation = useAddTagMutation();
  const updateTagMutation = useUpdateTagMutation();
  const deleteTagMutation = useDeleteTagMutation();
  
  const addCategoryMutation = useAddCategoryMutation();
  const updateCategoryMutation = useUpdateCategoryMutation();
  const deleteCategoryMutation = useDeleteCategoryMutation();

  const addManufacturerMutation = useAddManufacturerMutation();
  const updateManufacturerMutation = useUpdateManufacturerMutation();
  const deleteManufacturerMutation = useDeleteManufacturerMutation();

  const addTag = async (name: string) => {
    return addTagMutation.mutateAsync(name);
  };

  const updateTag = async (tagId: string, updates: Partial<Tag>) => {
    return updateTagMutation.mutateAsync({ id: tagId, updates });
  };

  const deleteTag = async (id: string | number) => {
    return deleteTagMutation.mutateAsync(String(id));
  };

  const addCategory = async (name: string) => {
    return addCategoryMutation.mutateAsync(name);
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    return updateCategoryMutation.mutateAsync({ id, updates });
  };

  const deleteCategory = async (id: string) => {
    return deleteCategoryMutation.mutateAsync(id);
  };

  const addManufacturer = async (name: string) => {
    return addManufacturerMutation.mutateAsync(name);
  };

  const updateManufacturer = async (id: string | number, updates: Partial<Manufacturer>) => {
    return updateManufacturerMutation.mutateAsync({ id: String(id), updates });
  };

  const deleteManufacturer = async (id: string | number) => {
    return deleteManufacturerMutation.mutateAsync(String(id));
  };

  const removeTagFromPhoto = async (photoId: string, tagId: string) => {
    try {
      const { removeTagFromPhotoFromDB } = await import('../services/tagService');
      await removeTagFromPhotoFromDB(photoId, tagId);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.photos });
    } catch (err) {
      handleError(err, '从照片移除标签失败');
      throw err;
    }
  };

  return {
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    tags,
    addTag,
    updateTag,
    deleteTag,
    removeTagFromPhoto,
    manufacturers,
    addManufacturer,
    updateManufacturer,
    deleteManufacturer,
  };
};
