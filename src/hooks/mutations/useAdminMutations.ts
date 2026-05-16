import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  });
};

export const useUpdateTagMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateTagInDB(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tags });
      queryClient.invalidateQueries({ queryKey: ['photos'] });
    },
  });
};

export const useDeleteTagMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTagFromDB,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tags });
      queryClient.invalidateQueries({ queryKey: ['photos'] });
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
  });
};

export const useUpdateCategoryMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Category> }) => updateCategoryInDB(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
      queryClient.invalidateQueries({ queryKey: ['photos'] });
    },
  });
};

export const useDeleteCategoryMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCategoryFromDB,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
      queryClient.invalidateQueries({ queryKey: ['photos'] });
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
  });
};

export const useUpdateManufacturerMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateManufacturerInDB(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.manufacturers });
      queryClient.invalidateQueries({ queryKey: ['photos'] });
    },
  });
};

export const useDeleteManufacturerMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteManufacturerFromDB,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.manufacturers });
      queryClient.invalidateQueries({ queryKey: ['photos'] });
    },
  });
};
