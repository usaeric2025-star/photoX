import { type QueryClient, useMutation, useQueryClient, CancelledError } from '#lib/query/index.js';
import { type UseMutationOptions } from '@tanstack/react-query';
import { queryKeys } from '#lib/query/keys.js';
import { Photo } from '#src/types/index.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';

export interface PhotoPage {
  items?: Photo[];
  data?: Photo[];
}

export interface InfinitePhotoData {
  pages: PhotoPage[];
  pageParams: unknown[];
}

export interface SinglePhotoQuery {
  id?: string;
  data?: Photo;
}

export const backupPhotosCache = async (queryClient: QueryClient) => {
  await queryClient.cancelQueries({ queryKey: queryKeys.photos.all });
  return queryClient.getQueriesData({ queryKey: queryKeys.photos.all });
};

export const rollbackPhotosCache = (queryClient: QueryClient, previousQueries: [unknown, unknown][]) => {
  previousQueries.forEach(([queryKey, previousData]) => {
    queryClient.setQueryData(queryKey as any, previousData);
  });
};

export const updatePhotosCache = (
  queryClient: QueryClient,
  ids: string | string[],
  updater: (photo: Photo) => Photo | null
) => {
  const idArray = Array.isArray(ids) ? ids : [ids];
  queryClient.setQueriesData({ queryKey: queryKeys.photos.all }, (old: InfinitePhotoData | Photo[] | SinglePhotoQuery | Photo | undefined) => {
    if (!old) return old;
    if (typeof old === 'object' && 'pages' in old && Array.isArray(old.pages)) {
      return {
        ...old,
        pages: old.pages.map((page: PhotoPage) => ({
          ...page,
          data: page.data?.map(p => idArray.includes(p.id) ? updater(p) : p).filter((p): p is Photo => p !== null),
          items: page.items?.map(p => idArray.includes(p.id) ? updater(p) : p).filter((p): p is Photo => p !== null),
        })),
      };
    }
    if (Array.isArray(old)) {
      return old.map(p => idArray.includes(p.id) ? updater(p) : p).filter((p): p is Photo => p !== null);
    }
    const singleOld = old as SinglePhotoQuery;
    const photoId = singleOld.id || (singleOld.data?.id);
    if (photoId && idArray.includes(photoId)) {
      if (singleOld.data) {
        const updated = updater(singleOld.data);
        return updated ? { ...singleOld, data: updated } : null;
      }
      return updater(old as unknown as Photo);
    }
    return old;
  });
};

export function useOptimisticPhotoMutation<TVariables, TData>(
  options: Omit<UseMutationOptions<TData, Error, TVariables, { previousQueries: [unknown, unknown][] }>, 'onMutate' | 'onError'> & {
    mutationFn: (variables: TVariables) => Promise<TData>,
    onMutateOptimistic: (variables: TVariables) => { ids: string | string[], updater: (photo: Photo) => Photo | null },
    errorContext: string
  }
) {
  const queryClient = useQueryClient();
  return useMutation({
    ...options,
    onMutate: async (variables) => {
      const previousQueries = await backupPhotosCache(queryClient);
      const { ids, updater } = options.onMutateOptimistic(variables);
      updatePhotosCache(queryClient, ids, updater);
      return { previousQueries };
    },
    onError: (err, _, context) => {
      if (err instanceof CancelledError) return;
      if (context?.previousQueries) rollbackPhotosCache(queryClient, context.previousQueries);
      ErrorFactory.handle(err, { context: options.errorContext });
    },
  });
}
