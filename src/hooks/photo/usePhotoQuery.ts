import { useAppQuery } from '#lib/query/index.js';
import { api } from '#lib/api.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { useTranslation } from '#src/hooks/core/index.js';

export interface PhotoQueryParams {
  search?: string;
  category?: string;
  categories?: string[];
  tags?: string[];
  sort?: string;
  groupId?: string;
  groups?: string[];
  page?: number;
  limit?: number;
}

/**
 * usePhotoQuery
 * Pure data fetching hook for photos.
 * Separated for better maintainability and future API extensions.
 */
export function usePhotoQuery(params: PhotoQueryParams) {
  const { uiTranslations: labels } = useTranslation();

  return useAppQuery(
    ['photos', params],
    async () => {
      // @ts-ignore - Hono client indexing
      const res = await api.photos.list.$post({
        json: {
          q: params.search,
          category: params.category,
          categories: params.categories,
          tags: params.tags,
          sort: params.sort,
          group: params.groupId,
          groups: params.groups,
          page: params.page?.toString(),
          limit: params.limit?.toString(),
        }
      });
      return ErrorFactory.unwrap<any>(res, labels.pullFail || 'Fetch Failed');
    },
    {
      staleTime: 1000 * 60, // 1 minute
    }
  );
}
