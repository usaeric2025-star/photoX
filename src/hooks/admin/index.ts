/**
 * 管理員照片加載邏輯
 */
export * from './useAdminPhotos';

/**
 * 管理員勾選操作與批量狀態
 */
export * from './useAdminSelection';

/**
 * 管理員具體操作集合（單張、批量、AI）
 */
export * from './useAdminMaintenance';

/**
 * 診斷報表與檢查邏輯
 */
export * from './useDiagnostics';

/**
 * 系統級後台任務管理（全局）
 */
export * from './useGlobalTasks';

/**
 * 性能審計與報表
 */
export * from './usePerformanceAudit';

/**
 * 管理員分類/標籤/製造商刪除操作
 */
export * from './useAdminCategory';

// Modularized business hooks
export * from './useAdminMutations';
export * from './useAdminBatch';
export * from './useTagMutations';
export * from './useCategoryMutations';
export * from './useManufacturerMutations';
