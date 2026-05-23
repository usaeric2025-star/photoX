import { useState, useCallback } from 'react';
import { 
  useUpdateTagMutation, useDeleteTagMutation, 
  useUpdateCategoryMutation, useDeleteCategoryMutation,
  useAddTagMutation, useAddCategoryMutation,
  useAddManufacturerMutation, useUpdateManufacturerMutation, useDeleteManufacturerMutation,
} from '@/hooks/mutations/useAdminMutations';
import { useQueryClient } from '@tanstack/react-query';
import { useGalleryStore } from '@/store';
import { safeArray } from '@/lib/utils';
import { useFeedback, useInvalidatePhotos } from '@/hooks';
import { Category, Photo, Tag, Manufacturer } from '@/types';
import { useCategoriesQuery, useTagsQuery, useManufacturersQuery } from '@/hooks';
import { QUERY_KEYS } from '@/hooks/queries/keys';

export const useAdminCategory = (adminUI: {
  setAlertDialog: (d: { title: string, message: string, onConfirm?: () => void, onCancel?: () => void, confirmLabel?: string, type?: 'danger' | 'info' } | null) => void;
}) => {
  const queryClient = useQueryClient();
  const { showError: handleError, showSuccess } = useFeedback();
  const invalidatePhotos = useInvalidatePhotos();
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

  const addTag = useCallback(async (name: string) => {
    return addTagMutation.mutateAsync(name);
  }, [addTagMutation]);

  const updateTag = useCallback(async (tagId: string, updates: Partial<Tag>) => {
    return updateTagMutation.mutateAsync({ id: tagId, updates });
  }, [updateTagMutation]);

  const deleteTag = useCallback(async (id: string | number) => {
    return deleteTagMutation.mutateAsync(String(id));
  }, [deleteTagMutation]);

  const addCategory = useCallback(async (name: string) => {
    return addCategoryMutation.mutateAsync(name);
  }, [addCategoryMutation]);

  const updateCategory = useCallback(async (id: string, updates: Partial<Category>) => {
    return updateCategoryMutation.mutateAsync({ id, updates });
  }, [updateCategoryMutation]);

  const deleteCategory = useCallback(async (id: string) => {
    return deleteCategoryMutation.mutateAsync(id);
  }, [deleteCategoryMutation]);

  const addManufacturer = useCallback(async (name: string) => {
    return addManufacturerMutation.mutateAsync(name);
  }, [addManufacturerMutation]);

  const updateManufacturer = useCallback(async (id: string | number, updates: Partial<Manufacturer>) => {
    return updateManufacturerMutation.mutateAsync({ id: String(id), updates });
  }, [updateManufacturerMutation]);

  const deleteManufacturer = useCallback(async (id: string | number) => {
    return deleteManufacturerMutation.mutateAsync(String(id));
  }, [deleteManufacturerMutation]);

  const removeTagFromPhoto = useCallback(async (photoId: string, tagId: string) => {
    try {
      const { removeTagFromPhotoFromDB } = await import('../services/tagService');
      
      // Optimistic update
      queryClient.setQueriesData({ queryKey: ['photos', 'infinite'] }, (old: any) => {
        if (!old || !old.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            photos: page.photos.map((p: Photo) => {
              if (p.id === photoId && p.tag_ids) {
                return { ...p, tag_ids: p.tag_ids.filter(tId => String(tId) !== String(tagId)) };
              }
              return p;
            })
          }))
        };
      });
      
      await removeTagFromPhotoFromDB(photoId, tagId);
    } catch (err) {
      handleError(err, '从照片移除标签失败');
      throw err;
    }
  }, [queryClient, handleError]);

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
