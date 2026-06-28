import { useCategories as useCategoriesService } from '@/services/category/categoryService';

/**
 * Hook to get the list of categories.
 */
export function useCategories() {
  const { categories, isLoading, error } = useCategoriesService();
  return { data: categories, isPending: isLoading, error };
}


