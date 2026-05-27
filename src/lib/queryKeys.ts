import { DataFreshnessPolicy, createStaleTime, createGcTime } from '../shared/freshnessSchema';

// [QUERY-KEY-CONTRACT-INTEGRATED]
export const photoKeys = {
  all: ['photos'] as const,
  lists: () => [...photoKeys.all, 'list'] as const,
  list: (filters: Record<string, any>, freshness: DataFreshnessPolicy = 'REALTIME') => 
    [...photoKeys.lists(), filters, { freshness }] as const,
  infinite: (filters: Record<string, any>, freshness: DataFreshnessPolicy = 'REALTIME') => 
    [...photoKeys.all, 'infinite', filters, { freshness }] as const,
  group: (groupId: string, freshness: DataFreshnessPolicy = 'STABLE') => 
    [...photoKeys.all, 'group', groupId, { freshness }] as const,
};

export const groupKeys = {
  all: ['groups'] as const,
  list: (freshness: DataFreshnessPolicy = 'STABLE') => [...groupKeys.all, 'list', { freshness }] as const,
  detail: (groupId: string, freshness: DataFreshnessPolicy = 'STABLE') => 
    [...groupKeys.all, 'detail', groupId, { freshness }] as const,
};

export const settingsKeys = {
  all: ['settings'] as const,
  list: (freshness: DataFreshnessPolicy = 'ARCHIVE') => [...settingsKeys.all, { freshness }] as const,
};

// 工具替換導出
export { createStaleTime, createGcTime };

export type PhotoQueryKey = ReturnType<typeof photoKeys.list>;
export type GroupQueryKey = ReturnType<typeof groupKeys.detail>;
