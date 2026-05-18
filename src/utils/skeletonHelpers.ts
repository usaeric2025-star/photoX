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
  
  // 核心逻辑：如果已知总量小于分页（如某个标签下只有 3 张），精准显示 3 个骨架屏
  if (totalCount > 0 && totalCount < pageSize) {
    return totalCount;
  }

  // 视野填充逻辑：
  // 手机 (columns=2): 一屏约 3-4 行 -> 8 个足以填满
  // 平板 (columns=3): 一屏约 3 行 -> 9 个
  // 桌面 (columns=5): 一屏约 3 行 -> 15 个
  // 我们取 columns * 4 为基准，确保至少有一屏多一点的占位感，且不超过分页上限
  const viewportFill = columns * 4;

  // 如果是首次加载或切换（总量未知），返回填满视野所需且不超过 20 个
  return Math.min(pageSize, Math.max(viewportFill, 12));
};
