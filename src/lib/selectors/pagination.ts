import { Photo } from '@/types';

/**
 * [SELECTOR] flattenPagination
 * 統一處理 TanStack Query InfiniteData 的鋪平邏輯
 */
export const flattenPagination = <T>(data: { pages: { photos: T[] }[] } | undefined): T[] => {
  if (!data?.pages) return [];
  return data.pages.flatMap(page => page.photos);
};

/**
 * [SELECTOR] filterByHidden
 * 根據權限過濾隱藏照片
 */
export const filterByHidden = (photos: Photo[], isAdmin: boolean): Photo[] => {
  if (isAdmin) return photos;
  return photos.filter(p => !p.is_hidden);
};
