import { 
  useUpdateTagMutation, useDeleteTagMutation, 
  useUpdateCategoryMutation, useDeleteCategoryMutation,
  useAddTagMutation, useAddCategoryMutation,
  useAddManufacturerMutation, useUpdateManufacturerMutation, useDeleteManufacturerMutation,
} from './mutations/useAdminMutations';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useGallery } from './useGallery';
import { safeArray } from '../lib/utils';
import { toast } from 'sonner';
import { Category, Photo, Tag } from '../types';

export const useAdminCategory = (adminUI: {
  setAlertDialog: (d: { title: string, message: string, onConfirm?: () => void, onCancel?: () => void, confirmLabel?: string, type?: 'danger' | 'info' } | null) => void;
}) => {
  const queryClient = useQueryClient();
  const { photos, tags, categories, manufacturers } = useGallery();

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

  const updateTag = async (tagId: string, newName: string) => {
    return updateTagMutation.mutateAsync({ id: tagId, name: newName });
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

  const updateManufacturer = async (id: string | number, name: string) => {
    return updateManufacturerMutation.mutateAsync({ id: String(id), name });
  };

  const deleteManufacturer = async (id: string | number) => {
    return deleteManufacturerMutation.mutateAsync(String(id));
  };

  const removeTagFromPhoto = async (photoId: string, tagId: string) => {
    try {
      const { error } = await supabase
          .from('photo_tags')
          .delete()
          .eq('photo_id', photoId)
          .eq('tag_id', tagId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['photos'] });
    } catch (err) {
      toast.error('从照片移除标签失败');
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
