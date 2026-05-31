// [FRESHNESS-SCHEMA-DEFINED]
import { type } from 'arktype';

export const DataFreshnessPolicySchema = type("'REALTIME' | 'STABLE' | 'ARCHIVE' | 'INFINITY'");
export type DataFreshnessPolicy = typeof DataFreshnessPolicySchema.infer;

export const FRESHNESS_POLICIES = {
  REALTIME: {
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    aiDebugHint: "適用於高度動態的數據，如照片列表、編輯狀態。數據變更頻率高，需要即時反映。",
  },
  STABLE: {
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    aiDebugHint: "適用於相對穩定的數據，如分組信息、用戶配置。數據變更頻率中等。",
  },
  ARCHIVE: {
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    aiDebugHint: "適用於極少變更的數據，如統計數據、系統不變設置。數據變更頻率極低。",
  },
  INFINITY: {
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
    aiDebugHint: "適用於幾乎不變的靜態數據，如分類列表、標籤列表。數據變更頻率極低，且可以手動刷新。",
  }
} as const;

export function createStaleTime(policy: DataFreshnessPolicy): number {
  return FRESHNESS_POLICIES[policy].staleTime;
}

export function createGcTime(policy: DataFreshnessPolicy): number {
  return FRESHNESS_POLICIES[policy].gcTime;
}
