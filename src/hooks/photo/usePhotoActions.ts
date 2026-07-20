import { useCallback } from 'react';
import { useFilters } from '#src/hooks/ui/index.js';

/**
 * usePhotoActions
 * Encapsulates complex UI interaction patterns for photo filtering.
 * Prevents logic duplication and provides "smart" filter behaviors.
 */
export function usePhotoActions() {
  const { 
    updateFilters, 
    tags: currentTags, 
    categories: currentCategories,
    category: currentCategory 
  } = useFilters();

  /**
   * Toggle a tag filter.
   * If the tag is already selected, remove it. Otherwise, add it.
   */
  const toggleTag = useCallback((tag: string) => {
    const nextTags = currentTags?.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...(currentTags || []), tag];
    
    updateFilters({ tags: nextTags.length ? nextTags : undefined });
  }, [currentTags, updateFilters]);

  /**
   * Set exclusive tag filter.
   * Clears all other tags and sets only this one.
   */
  const setExclusiveTag = useCallback((tag: string) => {
    updateFilters({ tags: [tag] });
  }, [updateFilters]);

  /**
   * Toggle a category filter (Multi-select).
   */
  const toggleCategory = useCallback((category: string) => {
    const nextCategories = currentCategories?.includes(category)
      ? currentCategories.filter(c => c !== category)
      : [...(currentCategories || []), category];
    
    updateFilters({ categories: nextCategories.length ? nextCategories : undefined });
  }, [currentCategories, updateFilters]);

  /**
   * Clear all filters.
   */
  const clearFilters = useCallback(() => {
    updateFilters({
      search: undefined,
      category: undefined,
      categories: undefined,
      tags: undefined,
      groupId: undefined,
      groups: undefined
    });
  }, [updateFilters]);

  return {
    toggleTag,
    setExclusiveTag,
    toggleCategory,
    clearFilters
  };
}
