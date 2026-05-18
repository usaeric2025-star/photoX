import { PAGINATION } from '../constants/config';

/**
 * 計算骨架屏應顯示的數量 / Calculate the number of skeleton placeholders to show
 * @param totalCount 總量已知時的精確值 / Precise count if total is known
 * @param columns 當前列數 / Current number of columns
 * @returns 應顯示的骨架屏數量 / Number of skeletons to show
 */
export const getSkeletonCount = (
  totalCount: number = 0,
  columns: number = 2
): number => {
  const pageSize = PAGINATION.PUBLIC_PAGE_SIZE || 20;
  
  // 核心邏輯：如果知道總數（如篩選標籤時），則精準顯示總數數量的骨架屏，避免佔位多於實際數據
  if (totalCount > 0 && totalCount < pageSize) {
    return totalCount;
  }

  // 核心邏輯：針對視野優化
  // 手機端 (columns=2): 一屏約 4-5 行 -> 10 個
  // 桌面端 (columns=5): 一屏約 2-3 行 -> 15 個
  const minNeeded = columns * 5; 

  // 返回「填充視野」所需，但不超過分頁大小
  return Math.min(pageSize, Math.max(minNeeded, 10));
};
