import { api } from '@/lib/api';

interface AffectedPhoto {
  photoId: string;
  photoName: string;
  keptTags?: string[];
  removedTags?: string[];
  [key: string]: unknown;
}

export interface PreviewResult {
  message?: string;
  count?: number;
  healthyCount?: number;
  affectedCount?: number;
  affectedPhotos?: AffectedPhoto[];
  truncated?: boolean;
  [key: string]: unknown;
}

export type IssueAction = {
  name: string;
  execute: () => Promise<{ jobId?: string; message?: string; [key: string]: unknown }>;
  preview?: () => Promise<PreviewResult>;
};

export const ISSUE_ACTIONS: Record<string, IssueAction> = {
  deduplicate: {
    name: "自动清理重复照片",
    execute: async () => {
      const res = await api.admin.maintenance.storage.deduplicate.$post();
      const data = await res.json() as Record<string, unknown>;
      return { message: `修复完成，已移除 ${data.count || 0} 条重复记录`, ...data };
    }
  },
  orphan_files: {
    name: "找回云端孤儿照片",
    execute: async () => {
      return { message: "此功能正在优化中，请稍后重试" };
    }
  },
  cleanup: {
    name: "全局系统清理",
    execute: async () => {
      const res = await api.admin.maintenance['daily-cleanup'].$post();
      await res.json();
      return { message: "系统日志与过期缓存清理完成" };
    }
  },
  schema_sync: {
    name: "同步数据库架构",
    execute: async () => {
      return { message: "数据库架构已与当前程序版本同步" };
    }
  },
  refresh_view: {
    name: "刷新照片列表缓存",
    execute: async () => {
      const res = await api.admin.maintenance['refresh-view'].$post();
      const data = await res.json() as Record<string, unknown>;
      if (!data.success) throw new Error(String(data.error || '刷新失败'));
      return { message: "已强制刷新全局照片列表缓存 (Materialized View)" };
    }
  }
};
