import { useInfiniteQuery } from '@tanstack/react-query';
import { Photo } from '@/types';
import { photoKeys } from '@/lib/queryKeys';
import { flattenPhotoInfiniteQueryPages } from '@/lib/selectors/photos';

/**
 * @hook-contract {
 *   "inputs": { "queryKeyFilters": "Record<string, any>", "fetchFn": "(pageParam: number) => Promise<{ photos: Photo[], total: number }>", "pageSize": "number" },
 *   "outputs": { "query": "UseInfiniteQueryResult", "photos": "Photo[]" },
 *   "invariants": [
 *     "返回具名對象而非數組",
 *     "內部不包含 useEffect"
 *   ],
 *   "forbidden": ["禁止調用任何 DOM API"],
 *   "ai_maintenance_rule": "修改此 Hook 前必須先讀取並更新 @hook-contract"
 * }
 */
export const useInfinitePhotoCursorPagination = (
  queryKeyFilters: Record<string, any>,
  fetchFn: (pageParam: number) => Promise<{ photos: Photo[], total: number }>,
  pageSize: number = 60
) => {
  const query = useInfiniteQuery({
    queryKey: photoKeys.infinite(queryKeyFilters),
    queryFn: ({ pageParam }) => fetchFn(pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.photos.length, 0);
      return (loaded < lastPage.total && lastPage.photos.length > 0) ? allPages.length + 1 : undefined;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
  });

  const photos = flattenPhotoInfiniteQueryPages(query.data?.pages || []);

  return {
    ...query,
    photos,
  };
};
