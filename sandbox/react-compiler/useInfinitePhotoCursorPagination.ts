// Copied from src/hooks/useInfinitePhotoCursorPagination.ts
import { useInfiniteQuery } from '@tanstack/react-query';
import { Photo } from '../../types'; // Mock path

// Mocking dependencies to avoid install issues
const photoKeys = { infinite: (f: any) => ['photos', f] };
const flattenPhotoInfiniteQueryPages = (p: any) => [];

/**
 * @hook-contract { ... }
 */
export const useInfinitePhotoCursorPagination = (
  queryKeyFilters: Record<string, any>,
  fetchFn: (pageParam: number) => Promise<{ photos: Photo[], total: number }>,
  pageSize: number = 60
) => {
  return {
    photos: [] as Photo[],
  };
};
