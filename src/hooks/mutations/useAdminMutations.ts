import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Category, Tag, Manufacturer } from '@/types';
import { addTagToDB, updateTagInDB, deleteTagFromDB } from '@/services/tagService';
import { addCategoryToDB, updateCategoryInDB, deleteCategoryFromDB } from '@/services/categoryService';
import { addManufacturerToDB, updateManufacturerInDB, deleteManufacturerFromDB } from '@/services/manufacturerService';
import { QUERY_KEYS } from '@/hooks/queries/keys';
import { useFeedback } from '@/hooks/uiFeedback';

export const useAddTagMutation = () => {
  const queryClient = useQueryClient();
  const { handleError } = useFeedback();
  return useMutation({
    mutationFn: addTagToDB,
    onMutate: async (newTag) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.tags });
      const previousTags = queryClient.getQueryData<Tag[]>(QUERY_KEYS.tags);
      
      if (previousTags) {
        queryClient.setQueryData<Tag[]>(QUERY_KEYS.tags, [...previousTags, { 
          id: `temp-${Date.now()}`, 
          name: newTag,
          usageCount: 0 
        } as Tag]);
      }
      return { previousTags };
    },
    onError: (err: any, _, context) => {
      if (context?.previousTags) {
        queryClient.setQueryData(QUERY_KEYS.tags, context.previousTags);
      }
      handleError(err, '添加标签失败');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tags });
    },
  });
};

export const useUpdateTagMutation = () => {
  const queryClient = useQueryClient();
  const { handleError } = useFeedback();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Tag> }) => updateTagInDB(id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.tags });
      const previousTags = queryClient.getQueryData<Tag[]>(QUERY_KEYS.tags);
      
      if (previousTags) {
        queryClient.setQueryData<Tag[]>(QUERY_KEYS.tags, previousTags.map(t => 
          String(t.id) === String(id) ? { ...t, ...updates } : t
        ));
      }
      return { previousTags };
    },
    onError: (err: any, _, context) => {
      if (context?.previousTags) {
        queryClient.setQueryData(QUERY_KEYS.tags, context.previousTags);
      }
      handleError(err, '更新标签失败');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tags });
    },
  });
};

export const useDeleteTagMutation = () => {
  const queryClient = useQueryClient();
  const { handleError } = useFeedback();
  return useMutation({
    mutationFn: deleteTagFromDB,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.tags });
      const previousTags = queryClient.getQueryData<Tag[]>(QUERY_KEYS.tags);
      
      if (previousTags) {
        queryClient.setQueryData<Tag[]>(QUERY_KEYS.tags, previousTags.filter(t => 
          String(t.id) !== String(id)
        ));
      }
      return { previousTags };
    },
    onError: (err: any, _, context) => {
      if (context?.previousTags) {
        queryClient.setQueryData(QUERY_KEYS.tags, context.previousTags);
      }
      handleError(err, '删除标签失败');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tags });
    },
  });
};

export const useAddCategoryMutation = () => {
  const queryClient = useQueryClient();
  const { handleError } = useFeedback();
  return useMutation({
    mutationFn: addCategoryToDB,
    onMutate: async (newCat) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.categories });
      const previousCats = queryClient.getQueryData<Category[]>(QUERY_KEYS.categories);
      
      if (previousCats) {
        queryClient.setQueryData<Category[]>(QUERY_KEYS.categories, [...previousCats, { 
          id: `temp-${Date.now()}`, 
          name: newCat
        } as Category]);
      }
      return { previousCats };
    },
    onError: (err: any, _, context) => {
      if (context?.previousCats) {
        queryClient.setQueryData(QUERY_KEYS.categories, context.previousCats);
      }
      handleError(err, '添加分类失败');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
    },
  });
};

export const useUpdateCategoryMutation = () => {
  const queryClient = useQueryClient();
  const { handleError } = useFeedback();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Category> }) => updateCategoryInDB(id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.categories });
      const previousCats = queryClient.getQueryData<Category[]>(QUERY_KEYS.categories);
      
      if (previousCats) {
        queryClient.setQueryData<Category[]>(QUERY_KEYS.categories, previousCats.map(c => 
          String(c.id) === String(id) ? { ...c, ...updates } : c
        ));
      }
      return { previousCats };
    },
    onError: (err: any, _, context) => {
      if (context?.previousCats) {
        queryClient.setQueryData(QUERY_KEYS.categories, context.previousCats);
      }
      handleError(err, '更新分类失败');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
    },
  });
};

export const useDeleteCategoryMutation = () => {
  const queryClient = useQueryClient();
  const { handleError } = useFeedback();
  return useMutation({
    mutationFn: deleteCategoryFromDB,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.categories });
      const previousCats = queryClient.getQueryData<Category[]>(QUERY_KEYS.categories);
      
      if (previousCats) {
        queryClient.setQueryData<Category[]>(QUERY_KEYS.categories, previousCats.filter(c => 
          String(c.id) !== String(id)
        ));
      }
      return { previousCats };
    },
    onError: (err: any, _, context) => {
      if (context?.previousCats) {
        queryClient.setQueryData(QUERY_KEYS.categories, context.previousCats);
      }
      handleError(err, '删除分类失败');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
    },
  });
};

export const useAddManufacturerMutation = () => {
  const queryClient = useQueryClient();
  const { handleError } = useFeedback();
  return useMutation({
    mutationFn: addManufacturerToDB,
    onMutate: async (name) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.manufacturers });
      const previousData = queryClient.getQueryData<Manufacturer[]>(QUERY_KEYS.manufacturers);
      
      if (previousData) {
        queryClient.setQueryData<Manufacturer[]>(QUERY_KEYS.manufacturers, [...previousData, { 
          id: `temp-${Date.now()}`, 
          name 
        } as Manufacturer]);
      }
      return { previousData };
    },
    onError: (err: any, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(QUERY_KEYS.manufacturers, context.previousData);
      }
      handleError(err, '添加厂商失败');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.manufacturers });
    },
  });
};

export const useUpdateManufacturerMutation = () => {
  const queryClient = useQueryClient();
  const { handleError } = useFeedback();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Manufacturer> }) => updateManufacturerInDB(id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.manufacturers });
      const previousData = queryClient.getQueryData<Manufacturer[]>(QUERY_KEYS.manufacturers);
      
      if (previousData) {
        queryClient.setQueryData<Manufacturer[]>(QUERY_KEYS.manufacturers, previousData.map(m => 
          String(m.id) === String(id) ? { ...m, ...updates } : m
        ));
      }
      return { previousData };
    },
    onError: (err: any, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(QUERY_KEYS.manufacturers, context.previousData);
      }
      handleError(err, '更新厂商失败');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.manufacturers });
    },
  });
};

export const useDeleteManufacturerMutation = () => {
  const queryClient = useQueryClient();
  const { handleError } = useFeedback();
  return useMutation({
    mutationFn: deleteManufacturerFromDB,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.manufacturers });
      const previousData = queryClient.getQueryData<Manufacturer[]>(QUERY_KEYS.manufacturers);
      
      if (previousData) {
        queryClient.setQueryData<Manufacturer[]>(QUERY_KEYS.manufacturers, previousData.filter(m => 
          String(m.id) !== String(id)
        ));
      }
      return { previousData };
    },
    onError: (err: any, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(QUERY_KEYS.manufacturers, context.previousData);
      }
      handleError(err, '删除厂商失败');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.manufacturers });
    },
  });
};
