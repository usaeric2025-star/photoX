export const VIRTUOSO_CONFIG = {
  overscan: (columns: number) => columns * 2, // 调低渲染行数
  increaseViewportBy: 300, // 调低缓存视口，降低 DOM 数量
};
