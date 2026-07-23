import { atom } from 'jotai';

/**
 * 核心 Selection 原子 (Jotai)
 * 选中数据存储在内存 (Jotai) 以保证性能，URL 仅保留 ?batch=true 状态
 */

// 选中的 ID 集合 (Set<string>)
export const selectedIdsSetAtom = atom<Set<string>>(new Set<string>());

// 选中的 ID 数组 (衍生 atom)
export const selectedIdsAtom = atom(
  (get) => Array.from(get(selectedIdsSetAtom)),
  (_get, set, newIds: string[]) => {
    set(selectedIdsSetAtom, new Set(newIds));
  }
);

// 退出锁 (Exit Lock) - 防止关闭选择栏时点击穿透下层卡片
export const isExitingSelectionAtom = atom<boolean>(false);
