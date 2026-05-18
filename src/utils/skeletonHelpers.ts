import { PAGINATION } from '../constants/config';

/**
 * 計算骨架屏應顯示的數量 / Calculate the number of skeleton placeholders to show
 * @param hasData 是否已有數據 / Whether data already exists
 * @param isFetchingNextPage 是否正在加載下一頁 / Whether fetching the next page
 * @returns 應顯示的骨架屏數量 / Number of skeletons to show
 */
export const getSkeletonCount = (
  hasData: boolean,
  isFetchingNextPage: boolean = false
): number => {
  // 首次加載且無數據 → 用分頁大小
  if (!hasData) return PAGINATION.PUBLIC_PAGE_SIZE || 20;

  // 正在加載下一頁 → 底部顯示 5 個佔位
  if (isFetchingNextPage) return 5;

  // 正常情況 → 不顯示骨架屏
  return 0;
};
