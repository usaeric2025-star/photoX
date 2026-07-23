/**
 * 手势与几何计算纯函数
 */

export interface Point {
  x?: number;
  y?: number;
  clientX?: number;
  clientY?: number;
}

/**
 * 计算两点之间的欧几里得距离
 */
export function getPointerDistance(p1: Point, p2: Point): number {
  const x1 = p1.x ?? p1.clientX ?? 0;
  const y1 = p1.y ?? p1.clientY ?? 0;
  const x2 = p2.x ?? p2.clientX ?? 0;
  const y2 = p2.y ?? p2.clientY ?? 0;
  return Math.hypot(x1 - x2, y1 - y2);
}

/**
 * 计算两点之间的中点坐标
 */
export function getPointerCenter(p1: Point, p2: Point): { x: number; y: number } {
  const x1 = p1.x ?? p1.clientX ?? 0;
  const y1 = p1.y ?? p1.clientY ?? 0;
  const x2 = p2.x ?? p2.clientX ?? 0;
  const y2 = p2.y ?? p2.clientY ?? 0;
  return {
    x: (x1 + x2) / 2,
    y: (y1 + y2) / 2,
  };
}

/**
 * 限制数值在 [min, max] 范围内
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

/**
 * 限制双指缩放/平移时的偏移边界，防止图片超出视口范围
 */
export function clampPosition(
  pos: { x: number; y: number },
  scale: number,
  viewportWidth: number,
  viewportHeight: number
): { x: number; y: number } {
  if (scale <= 1) return { x: 0, y: 0 };

  const limitX = ((scale - 1) * viewportWidth) / 2;
  const limitY = ((scale - 1) * viewportHeight) / 2;

  return {
    x: clamp(pos.x, -limitX, limitX),
    y: clamp(pos.y, -limitY, limitY),
  };
}
