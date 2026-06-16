import { api } from '@/lib/api';

export interface PreviewResult {
  message?: string;
  count?: number;
  [key: string]: any;
}

export type IssueAction = {
  name: string;
  execute: () => Promise<{ jobId?: string; message?: string; [key: string]: any }>;
  getStatus?: (jobId: string) => Promise<{ status: 'running' | 'completed' | 'failed' | 'processing'; progress?: number; message?: string }>;
  preview?: () => Promise<PreviewResult>;
};

export const ISSUE_ACTIONS: Record<string, IssueAction> = {
  excessive_tags: {
    name: "清理照片多余标签",
    preview: async () => {
      const res = await api.admin.repair.preview.$post({ json: { issueId: 'excessive_tags' } });
      const data = await res.json() as any;
      return data;
    },
    execute: async () => {
      const res = await api.admin.repair.$post({ json: { issueId: 'excessive_tags' } });
      const data = await res.json() as any;
      return { message: data.message || "修复成功", ...data };
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
      const data = await res.json() as any;
      return { message: data.message || "修复成功", ...data };
    }
  },
  cleanup_temp_urls: {
    name: "清理过期的临时 URL",
    execute: async () => {
      const res = await api.admin.repair.$post({ json: { issueId: 'cleanup_temp_urls' } });
      const data = await res.json() as any;
      return { message: data.message || "修复成功", ...data };
    }
  },
  cleanup_redundant: {
    name: "清理冗余照片文件",
    execute: async () => {
      const res = await api.admin.repair.$post({ json: { issueId: 'cleanup_redundant' } });
      const data = await res.json() as any;
      return { message: data.message || "修复成功", ...data };
    }
  },
  missing_db_records: {
    name: "恢复孤儿照片 (由存储回写)",
    execute: async () => {
      const res = await api.storage['import-orphans'].$post();
      const data = await res.json() as any;
      return { message: data.message || "恢复成功" };
    }
  },
  orphan_files: {
    name: "恢复孤儿照片",
    execute: async () => {
      const res = await api.storage['import-orphans'].$post();
      const data = await res.json() as any;
      return { message: data.message || "恢复成功" };
    }
  },
  empty_groups: {
    name: "清理空合组",
    execute: async () => {
      const res = await api.admin.repair.$post({ json: { issueId: 'empty_groups' } });
      const data = await res.json() as any;
      return { message: data.message || "清理完成", ...data };
    }
  },
  ghost_records: {
    name: "清理幽灵数据记录",
    execute: async () => {
      const res = await api.admin.repair.$post({ json: { issueId: 'ghost_records' } });
      const data = await res.json() as any;
      return { message: data.message || "幽灵数据清理完成", ...data };
    }
  },
  ai_retranslate: {
    name: "AI 全量语种校对",
    execute: async () => {
      const res = await api.admin.repair.$post({ json: { issueId: 'repair_i18n_names' } });
      const data = await res.json() as any;
      return { message: data.message || "语种校对已完成", ...data };
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
      const data = await res.json() as any;
      return { message: '清理成功' };
    }
  }
};
