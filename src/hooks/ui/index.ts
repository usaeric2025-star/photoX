/**
 * ============================================================================
 * PHOTOX UI & STATE HOOKS (UI 與 URL 狀態控制器)
 * ============================================================================
 * 
 * 📌 [三大狀態體系之嚴格邊界]
 * 1. URL 狀態 (唯一的視圖真相來源):
 *    - 適用：搜尋、篩選、分頁、批量模式開關 (batch)。
 *    - 核心原則：嚴禁將高頻變動的「選中 IDs (selected)」存入 URL。
 * 2. UI 瞬態 (跨組件臨時交互 - Jotai):
 *    - 適用：多選 IDs (selectedIdsSetAtom)、全域 Dialog 開關、主題、語系。
 * 📌 [設計原則]
 * - 嚴禁為單一的 URL 狀態或單一彈窗控制編寫獨立的微型 Hook 檔案！
 * ============================================================================
 */

import { useRef, useCallback } from 'react';

export * from './useUI.js';

/**
 * useTopLayer
 * 管理原生 Top Layer 元素 (dialog/popover) 的 Hook。
 */
export function useTopLayer() {
  const ref = useRef<HTMLElement & { showPopover?: () => void; hidePopover?: () => void; showModal?: () => void; close?: () => void }>(null);

  const show = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    
    try {
      if (el.showPopover) {
        el.showPopover();
      } else if (el.showModal) {
        el.showModal();
      }
    } catch (e) {
      // Ignore
    }
  }, []);

  const hide = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    
    try {
      if (el.hidePopover) {
        el.hidePopover();
      } else if (el.close) {
        el.close();
      }
    } catch (e) {
      // Ignore
    }
  }, []);

  return { ref, show, hide };
}

export { useFilters, useSearchTransition } from '../photo/useFilters.js';
