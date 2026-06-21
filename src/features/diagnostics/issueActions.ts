import { api } from '@/lib/api';
import { scheduler } from '@/lib/task-queue';
import { generateId } from '@/lib/id';

export interface PreviewResult {
  message?: string;
  count?: number;
  healthyCount?: number;
  affectedCount?: number;
  truncated?: boolean;
  affectedPhotos?: Array<{
    photoId: string;
    photoName: string;
    keptTags?: string[];
    removedTags?: string[];
  }>;
  orphans?: {
    count: number;
    samples?: Array<{ key: string }>;
  };
  ghosts?: {
    count: number;
    samples?: Array<{ id: string; name: string }>;
  };
  [key: string]: unknown;
}

export type IssueAction = {
  name: string;
  execute: () => Promise<{ jobId?: string; message?: string; [key: string]: unknown }>;
  getStatus?: (jobId: string) => Promise<{ status: 'running' | 'completed' | 'failed' | 'processing'; progress?: number; message?: string }>;
  preview?: () => Promise<PreviewResult>;
};

export const ISSUE_ACTIONS: Record<string, IssueAction> = {
  excessive_tags: {
    name: "清理照片多余标签",
    preview: async () => {
      const res = await api.admin.repair.preview.$post({ json: { issueId: 'excessive_tags' } });
      const data = await res.json() as Record<string, unknown>;
      return data as PreviewResult;
    },
    execute: async () => {
      scheduler.enqueue({
        id: `repair-${generateId()}`,
        label: "清理照片多余标签",
        type: 'repair',
        state: { status: 'queued' },
        createdAt: Date.now(),
        execute: async () => {
          const res = await api.admin.repair.$post({ json: { issueId: 'excessive_tags' } });
          return await res.json();
        }
      });
      return { message: "修复任务已派发" };
    }
  },
  sync: {
    name: "应用重传补全",
    execute: async () => ({ jobId: "sync", message: "同步任务已派发" })
  },
  cleanup: {
    name: "常规清理",
    execute: async () => ({ jobId: "cleanup", message: "清理任务已派發" })
  },
  non_standard_item_codes: {
    name: "标准化型号代码",
    execute: async () => {
      const res = await api.admin.repair.$post({ json: { issueId: 'non_standard_item_codes' } });
      const data = await res.json() as Record<string, unknown>;
      return { message: (data.message as string) || "修复成功", ...data };
    }
  },
  cleanup_temp_urls: {
    name: "清理过期的临时 URL",
    execute: async () => {
      const res = await api.admin.repair.$post({ json: { issueId: 'cleanup_temp_urls' } });
      const data = await res.json() as Record<string, unknown>;
      return { message: (data.message as string) || "修复成功", ...data };
    }
  },
  cleanup_redundant: {
    name: "清理冗余照片文件",
    execute: async () => {
      const res = await api.admin.repair.$post({ json: { issueId: 'cleanup_redundant' } });
      const data = await res.json() as Record<string, unknown>;
      return { message: (data.message as string) || "修复成功", ...data };
    }
  },
  missing_db_records: {
    name: "恢复孤儿照片 (由存储回写)",
    execute: async () => {
      const res = await api.storage['import-orphans'].$post();
      const data = await res.json() as Record<string, unknown>;
      return { message: (data.message as string) || "恢复成功" };
    }
  },
  orphan_files: {
    name: "恢复孤儿照片",
    execute: async () => {
      const res = await api.storage['import-orphans'].$post();
      const data = await res.json() as Record<string, unknown>;
      return { message: (data.message as string) || "恢复成功" };
    }
  },
  empty_groups: {
    name: "清理空合组",
    execute: async () => {
      const res = await api.admin.repair.$post({ json: { issueId: 'empty_groups' } });
      const data = await res.json() as Record<string, unknown>;
      return { message: (data.message as string) || "清理完成", ...data };
    }
  },
  ghost_records: {
    name: "清理幽灵数据记录",
    execute: async () => {
      const res = await api.admin.repair.$post({ json: { issueId: 'ghost_records' } });
      const data = await res.json() as Record<string, unknown>;
      return { message: (data.message as string) || "幽灵数据清理完成", ...data };
    }
  },
  ai_retranslate: {
    name: "AI 全量语种校對",
    execute: async () => {
      const res = await api.admin.repair.$post({ json: { issueId: 'repair_i18n_names' } });
      const data = await res.json() as Record<string, unknown>;
      return { message: (data.message as string) || "语种校对已完成", ...data };
    }
  },
  ai_redimension: {
    name: "AI 深度尺寸重提",
    execute: async () => {
      // not actively implemented in repair.ts so we'll just mock it or map to repair_i18n_names for now as placeholder
      return { message: "该模块目前未激活，请等待系统升级" };
    }
  },
  orphaned_r2_files: {
    name: "深度清理无效的云端文件",
    execute: async () => {
      const res = await api.storage.clean.$post();
      const data = await res.json() as Record<string, unknown>;
      return { message: '清理成功' };
    }
  },
  schema_sync: {
    name: "同步数据库架構",
    execute: async () => {
      const res = await api.admin.repair.$post({ json: { issueId: 'schema_sync' } });
      const data = await res.json() as Record<string, unknown>;
      return { message: (data.message as string) || "Schema 同步成功", ...data };
    }
  },
  "duplicate-photos": {
    name: "自动清理重复照片",
    execute: async () => {
      const res = await (api as unknown as { storage: { deduplicate: { $post: () => Promise<{ ok: boolean; json: () => Promise<Record<string, unknown>> }> } } }).storage.deduplicate.$post();
      const data = await res.json();
      return { message: (data.message as string) || "重复记录清理完成", ...data };
    }
  }
};
