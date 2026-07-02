/**
 * 管理員具體操作集合（單張、批量、AI）
 */
export * from './useAdminMaintenance.js';

/**
 * 診斷報表與檢查邏輯
 */
export * from './useDiagnostics.js';

/**
 * 系統級後台任務管理（全局）
 */
export * from './useGlobalTasks.js';

/**
 * 性能審計與報表
 */
export * from './usePerformanceAudit.js';

/**
 * 管理員分類/標籤/製造商刪除操作
 */
export * from './useAdminCategory.js';

// Modularized business hooks
export * from './useAdminMutations.js';
export * from './useAdminBatch.js';
export * from './useMaintenanceExecution.js';
