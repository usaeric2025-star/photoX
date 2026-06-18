import { createInfiniteQuery } from '@/lib/query/queryFactory';
import { PhotoListItem, PhotoListItemSchema } from '@/types/api';
import { api } from '@/lib/api';
import { keepPreviousData } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import { assertPhotoListItem } from '@/utils/schemaGuard';
import { AppError, ErrorCode, ErrorFactory } from '@/lib/error';
import { logger } from '@/lib/logger';

export type PhotoListFilters = {
  categoryId?: string | null;
  tagId?: string | null;
  searchQuery?: string | null;
  sortOrder?: 'asc' | 'desc' | string | null;
  onlyGroupsCover?: boolean;
  groupId?: string | null;
};

export const usePhotos = createInfiniteQuery<
  { items: PhotoListItem[]; nextCursor: string | null; total: number },
  PhotoListFilters & { mode?: 'admin' | 'public' },
  string | null
>({
  queryKey: (filters) => queryKeys.photos.infinite(filters, filters.mode ?? 'public'),
  queryFn: async (filters, cursor) => {
    logger.info('[Query] usePhotos starting request...', { filters, cursor });
    try {
      const response = await api.photos.list.$post({
        json: {
          cursor,
          limit: 100,
          isAdminMode: filters.mode === 'admin',
          categoryId: filters.categoryId || undefined,
          tagId: filters.tagId || undefined,
          searchQuery: filters.searchQuery || undefined,
          sortOrder: filters.sortOrder || undefined,
          onlyGroupsCover: filters.onlyGroupsCover,
          groupId: filters.groupId || undefined,
        },
      });
      
      logger.info('[Query] usePhotos response status:', response.status);
      
      if (!response.ok) {
        const status = response.status;
        let message = 'Failed to fetch photos';
        try {
          const errJson = await response.json() as Record<string, unknown>;
          if (errJson && typeof errJson === 'object' && typeof errJson.message === 'string') {
            message = errJson.message;
          }
        } catch {
          // ignore parsing error
        }
        
        throw new AppError({
          code: status === 401 ? ErrorCode.UNAUTHORIZED : status === 403 ? ErrorCode.PERMISSION_DENIED : status === 404 ? ErrorCode.NOT_FOUND : ErrorCode.UNKNOWN_ERROR,
          message,
          statusCode: status,
        });
      }
      
      const result = await response.json();
      logger.info('[Query] usePhotos success payload:', { success: result.success, hasData: !!result.data, total: result.total });
      
      // ✅ 統一契約驗證 + 雙重守衛
      const validatedData = assertPhotoListItem(result.data) as PhotoListItem[];
      logger.info('[Query] usePhotos validation check count:', validatedData?.length);
      
      return {
        items: validatedData,
        nextCursor: (result as any).nextCursor || null,
        total: (result as any).total || 0
      };
    } catch (error) {
      logger.error('[Query] usePhotos failed deeply:', error);
      if (error instanceof AppError) {
        throw error;
      }
      // Wrap other unexpected/network errors using ErrorFactory
      throw ErrorFactory.wrap(error, 'Fetch photos list', undefined);
    }
  },
  getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  initialPageParam: null,
  staleTime: 60 * 1000,
  placeholderData: keepPreviousData as never
});
