/**
 * ============================================================================
 * PHOTOX UNIFIED HOOK ENTRYPOINT (全域 Hooks 統一導出路徑)
 * ============================================================================
 * 
 * 📌 [架構指南 - 檔案定位與尋找原則]
 * 1. 核心工具層 (Core Hooks)     -> 📂 src/hooks/core/
 *    - 通用不變的底層工具，如語系、本端儲存、點擊外部關閉、尺寸/多媒體監聽。
 * 2. 狀態路由控制層 (UI & URL)    -> 📂 src/hooks/ui/
 *    - 負責 URL 狀態 (nuqs) 及 UI 瞬態 (Jotai) 控制。
 * 3. 領域業務層 (Domain Hooks)   -> 📂 src/hooks/[domain]/
 *    - 管理特定的 API (Server State) 與業務流程。
 *    - 嚴禁在全域目錄隨意散落微型檔案！同領域的 hooks 請整合在該領域目錄下。
 * ============================================================================
 */

// Core Hooks
export * from './core/index.js';

// Domain Hooks
export * from './admin/index.js';
export * from './photo/index.js';
export * from './group/index.js';
export * from './metadata/index.js';
export * from './settings/index.js';
export * from './selection/index.js';

// Utils
export * from './ui/index.js';
export {   fatalError, isTaskDrawerOpen}  from '#lib/store/index.js';
export type { UIStoreState } from '#lib/store/index.js';




