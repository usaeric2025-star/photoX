import { PAGINATION } from '../constants/config';

/**
 * 計算骨架屏應顯示的數量 / Calculate the number of skeleton placeholders to show
 * @param totalCount 總量已知時的精確值 / Precise count if total is known
 * @returns 應顯示的骨架屏數量 / Number of skeletons to show
 */
export const getSkeletonCount = (
  totalCount: number = 0
): number => {
  const pageSize = PAGINATION.PUBLIC_PAGE_SIZE || 20;
  
  // 如果知道總數，且總數小於分頁大小，則精準顯示總數數量的骨架屏
  if (totalCount > 0 && totalCount < pageSize) {
    return totalCount;
  }

  // 默認返回分頁大小
  return pageSize;
};
