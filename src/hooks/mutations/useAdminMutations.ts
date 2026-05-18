import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Category, Tag, Manufacturer } from '../../types';
import { addTagToDB, updateTagInDB, deleteTagFromDB } from '../../services/tagService';
import { addCategoryToDB, updateCategoryInDB, deleteCategoryFromDB } from '../../services/categoryService';
import { addManufacturerToDB, updateManufacturerInDB, deleteManufacturerFromDB } from '../../services/manufacturerService';
import { QUERY_KEYS } from '../queries/keys';

export const useAddTagMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addTagToDB,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tags });
    },
    onError: (err: any) => {
      toast.error(`添加标签失败: ${err.message}`);
    },
  });
};

export const useUpdateTagMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Tag> }) => updateTagInDB(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tags });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.photos });
    },
    onError: (err: any) => {
      toast.error(`更新标签失败: ${err.message}`);
    },
  });
};

export const useDeleteTagMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTagFromDB,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tags });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.photos });
    },
    onError: (err: any) => {
      toast.error(`删除标签失败: ${err.message}`);
    },
  });
};

export const useAddCategoryMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addCategoryToDB,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
    },
    onError: (err: any) => {
      toast.error(`添加分类失败: ${err.message}`);
    },
  });
};

export const useUpdateCategoryMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Category> }) => updateCategoryInDB(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.photos });
    },
    onError: (err: any) => {
      toast.error(`更新分类失败: ${err.message}`);
    },
  });
};

export const useDeleteCategoryMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCategoryFromDB,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.photos });
    },
    onError: (err: any) => {
      toast.error(`删除分类失败: ${err.message}`);
    },
  });
};

export const useAddManufacturerMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addManufacturerToDB,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.manufacturers });
    },
    onError: (err: any) => {
      toast.error(`添加厂商失败: ${err.message}`);
    },
  });
};

export const useUpdateManufacturerMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Manufacturer> }) => updateManufacturerInDB(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.manufacturers });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.photos });
    },
    onError: (err: any) => {
      toast.error(`更新厂商失败: ${err.message}`);
    },
  });
};

export const useDeleteManufacturerMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteManufacturerFromDB,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.manufacturers });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.photos });
    },
    onError: (err: any) => {
      toast.error(`删除厂商失败: ${err.message}`);
    },
  });
};
