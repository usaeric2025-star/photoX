import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Category, Tag, Manufacturer } from '../../types';
import { addTagToDB, updateTagInDB, deleteTagFromDB } from '../../services/tagService';
import { addCategoryToDB, updateCategoryInDB, deleteCategoryFromDB } from '../../services/categoryService';
import { addManufacturerToDB, updateManufacturerInDB, deleteManufacturerFromDB } from '../../services/manufacturerService';
import { QUERY_KEYS } from '../queries/keys';
import { useErrorHandler } from '../../utils/errorHandler';

export const useAddTagMutation = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();
  return useMutation({
    mutationFn: addTagToDB,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tags });
    },
    onError: (err: any) => {
      handleError(err, '添加标签失败');
    },
  });
};

export const useUpdateTagMutation = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Tag> }) => updateTagInDB(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tags });
    },
    onError: (err: any) => {
      handleError(err, '更新标签失败');
    },
  });
};

export const useDeleteTagMutation = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();
  return useMutation({
    mutationFn: deleteTagFromDB,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tags });
    },
    onError: (err: any) => {
      handleError(err, '删除标签失败');
    },
  });
};

export const useAddCategoryMutation = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();
  return useMutation({
    mutationFn: addCategoryToDB,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
    },
    onError: (err: any) => {
      handleError(err, '添加分类失败');
    },
  });
};

export const useUpdateCategoryMutation = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Category> }) => updateCategoryInDB(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
    },
    onError: (err: any) => {
      handleError(err, '更新分类失败');
    },
  });
};

export const useDeleteCategoryMutation = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();
  return useMutation({
    mutationFn: deleteCategoryFromDB,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
    },
    onError: (err: any) => {
      handleError(err, '删除分类失败');
    },
  });
};

export const useAddManufacturerMutation = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();
  return useMutation({
    mutationFn: addManufacturerToDB,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.manufacturers });
    },
    onError: (err: any) => {
      handleError(err, '添加厂商失败');
    },
  });
};

export const useUpdateManufacturerMutation = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Manufacturer> }) => updateManufacturerInDB(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.manufacturers });
    },
    onError: (err: any) => {
      handleError(err, '更新厂商失败');
    },
  });
};

export const useDeleteManufacturerMutation = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();
  return useMutation({
    mutationFn: deleteManufacturerFromDB,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.manufacturers });
    },
    onError: (err: any) => {
      handleError(err, '删除厂商失败');
    },
  });
};
