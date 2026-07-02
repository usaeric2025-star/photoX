import useSWR, { SWRConfiguration, mutate as swrMutate } from 'swr';
import { useState } from 'react';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';

/**
 * 統一的 Query Adapter (SWR Facade)
 */

/**
 * Global Query/Mutation Controller
 */
export const appQuery = {
  /**
   * Invalidate or update cache globally
   * If a functional updater is provided as the second argument, it's used directly for optimisticData
   */
  mutate: (key: string | readonly unknown[] | ((key: import('swr').Key) => boolean), data?: unknown, options?: unknown) => {
    type SwrKey = Parameters<typeof swrMutate>[0];
    if (typeof data === 'function' && !options) {
      return swrMutate(key as SwrKey, data, {
        optimisticData: data as (currentData: unknown) => unknown,
        rollbackOnError: true,
      });
    }
    return swrMutate(key as SwrKey, data, options as import('swr').MutatorOptions);
  },
  
  /**
   * Invalidate all photo-related queries
   */
  invalidatePhotos: async () => {
    // 1. Invalidate using pattern matching (including Infinite keys)
    await swrMutate(
      (key: any) => {
        if (!key) return false;
        // SWRInfinite keys might be strings like "$inf$..." or arrays
        const keyStr = typeof key === 'string' ? key : JSON.stringify(key);
        
        const isTarget = keyStr.includes('photos') || 
               keyStr.includes('groups') || 
               keyStr.includes('storage') || 
               keyStr.includes('ai-audit') ||
               keyStr.includes('ai-result');
               
        return isTarget;
      },
      undefined,
      { revalidate: true }
    );
  },

  /**
   * Optimistically update a photo in all lists
   */
  updatePhotoOptimistically: async (photoId: string, updates: Record<string, any>) => {
    return swrMutate(
      (key: any) => {
        if (!key) return false;
        const keyStr = JSON.stringify(key);
        return keyStr.includes('photos') && keyStr.includes('list');
      },
      (pages: any[] | undefined) => {
        if (!pages || !Array.isArray(pages)) return pages;
        return pages.map(page => {
          if (!page || !Array.isArray(page.data)) return page;
          return {
            ...page,
            data: page.data.map((photo: any) => 
              photo.id === photoId ? { ...photo, ...updates } : photo
            )
          };
        });
      },
      { revalidate: false }
    );
  },

  /**
   * Optimistically update groupId for multiple photos
   */
  updatePhotosGroupIdOptimistically: async (photoIds: string[], targetGroupId: string | null) => {
    return swrMutate(
      (key: any) => {
        if (!key) return false;
        const keyStr = JSON.stringify(key);
        return keyStr.includes('photos') && keyStr.includes('list');
      },
      (pages: any[] | undefined) => {
        if (!pages || !Array.isArray(pages)) return pages;
        return pages.map(page => {
          if (!page || !Array.isArray(page.data)) return page;
          return {
            ...page,
            data: page.data.map((photo: any) => 
              photoIds.includes(photo.id) ? { ...photo, groupId: targetGroupId, isGroupCover: false } : photo
            )
          };
        });
      },
      { revalidate: false }
    );
  },

  /**
   * Optimistically remove photos from all lists
   */
  deletePhotosOptimistically: async (photoIds: string[]) => {
    return swrMutate(
      (key: any) => {
        if (!key) return false;
        const keyStr = JSON.stringify(key);
        return keyStr.includes('photos') && keyStr.includes('list');
      },
      (pages: any[] | undefined) => {
        if (!pages || !Array.isArray(pages)) return pages;
        return pages.map(page => {
          if (!page || !Array.isArray(page.data)) return page;
          const filtered = page.data.filter((photo: any) => !photoIds.includes(photo.id));
          const removedCount = page.data.length - filtered.length;
          return {
            ...page,
            data: filtered,
            total: page.total ? page.total - removedCount : page.total
          };
        });
      },
      { revalidate: false }
    );
  },

  /**
   * Optimistically update multiple photos in all lists
   */
  updatePhotosOptimistically: async (photoIds: string[], updates: Record<string, any>) => {
    return swrMutate(
      (key: any) => {
        if (!key) return false;
        const keyStr = JSON.stringify(key);
        return keyStr.includes('photos') && keyStr.includes('list');
      },
      (pages: any[] | undefined) => {
        if (!pages || !Array.isArray(pages)) return pages;
        return pages.map(page => {
          if (!page || !Array.isArray(page.data)) return page;
          return {
            ...page,
            data: page.data.map((photo: any) => 
              photoIds.includes(photo.id) ? { ...photo, ...updates } : photo
            )
          };
        });
      },
      { revalidate: false }
    );
  },

  /**
   * Optimistically update group cover
   */
  updateGroupCoverOptimistically: async (groupId: string, photoId: string | null) => {
    return swrMutate(
      (key: any) => {
        if (!key) return false;
        const keyStr = JSON.stringify(key);
        return keyStr.includes('photos') && keyStr.includes('list');
      },
      (pages: any[] | undefined) => {
        if (!pages || !Array.isArray(pages)) return pages;
        return pages.map(page => {
          if (!page || !Array.isArray(page.data)) return page;
          return {
            ...page,
            data: page.data.map((photo: any) => {
              if (photo.groupId !== groupId) return photo;
              return {
                ...photo,
                isGroupCover: photo.id === photoId
              };
            })
          };
        });
      },
      { revalidate: false }
    );
  }
};

/**
 * Standard data fetching hook with Schema Validation
 */
export function useAppQuery<
  TData,
  TSchema extends import('valibot').BaseSchema<unknown, unknown, import('valibot').BaseIssue<unknown>>
>(
  key: string | readonly unknown[] | null,
  fetcher: (...args: unknown[]) => Promise<TData>,
  options: SWRConfiguration<import('valibot').InferOutput<TSchema>> & { schema: TSchema }
): import('swr').SWRResponse<import('valibot').InferOutput<TSchema>> & { isPending: boolean };

/**
 * Standard data fetching hook
 */
export function useAppQuery<TData = unknown>(
  key: string | readonly unknown[] | null,
  fetcher: (...args: unknown[]) => Promise<TData>,
  options?: SWRConfiguration<TData>
): import('swr').SWRResponse<TData> & { isPending: boolean };

export function useAppQuery<
  TData = unknown,
  TSchema extends import('valibot').BaseSchema<unknown, unknown, import('valibot').BaseIssue<unknown>> = import('valibot').BaseSchema<unknown, unknown, import('valibot').BaseIssue<unknown>>
>(
  key: string | readonly unknown[] | null,
  fetcher: (...args: unknown[]) => Promise<TData>,
  options?: SWRConfiguration<TData | import('valibot').InferOutput<TSchema>> & { schema?: TSchema }
) {
  const fetcherWithValidation = async (...args: unknown[]) => {
    try {
      const data = await fetcher(...args);
      if (options?.schema) {
        const v = await import('valibot');
        return v.parse(options.schema, data) as TData;
      }
      return data;
    } catch (e) {
      const wrappedError = ErrorFactory.wrap(e, '数据加载');
      ErrorFactory.capture(wrappedError);
      throw wrappedError;
    }
  };

  const result = useSWR<TData>(
    key as import('swr').Key, 
    fetcherWithValidation as import('swr').Fetcher<TData>, 
    options as SWRConfiguration<TData>
  );
  return { ...result, isPending: result.isLoading };
}

/**
 * Standard mutation hook (trigger-based)
 */
export function useAppMutation<TVariables, TData>(
  config: {
    mutationFn: (variables: TVariables) => Promise<TData>,
    onSuccess?: (data: TData, variables: TVariables) => void,
    onError?: (error: Error, variables: TVariables) => void
  }
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { mutationFn, onSuccess, onError } = config;

  const trigger = async (variables: TVariables) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await mutationFn(variables);
      onSuccess?.(data, variables);
      return data;
    } catch (e) {
      const wrappedError = ErrorFactory.wrap(e, 'Mutation 操作');
      ErrorFactory.capture(wrappedError);
      setError(wrappedError);
      onError?.(wrappedError, variables);
      throw wrappedError;
    } finally {
      setIsLoading(false);
    }
  };

  return { 
    mutate: trigger, 
    mutateAsync: trigger, 
    trigger,
    isPending: isLoading, 
    isMutating: isLoading, 
    error 
  };
}

// For compatibility with useSWRConfig pattern
;
export { swrMutate as mutate };
