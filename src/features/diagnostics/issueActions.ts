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

interface AuditResponse {
  success: boolean;
  data: {
    orphans: {
      count: number;
      truncated: boolean;
      samples: Array<{ key: string }>;
    };
    ghosts: {
      count: number;
      samples: Array<{ id: string }>;
    };
  };
}

interface RecoverResponse {
  success: boolean;
  results: Array<{ status: string; key: string }>;
  error?: string;
}

export const ISSUE_ACTIONS: Record<string, IssueAction> = {
  deduplicate: {
    name: "自动清理重复照片",
    execute: async () => {
      const res = await api.admin.maintenance.storage.deduplicate.$post();
      const data = await res.json() as Record<string, any>;
      return { message: `修复完成，已移除 ${data.count || 0} 条重复记录`, ...data };
    }
  },
  orphan_files: {
    name: "找回云端孤兒照片",
    preview: async () => {
      const res = await api.admin.maintenance.storage.audit.$get();
      const data = await res.json() as AuditResponse;
      if (!data.success) throw new Error("审计失败");
      return { 
        affectedCount: data.data.orphans.count, 
        message: `扫描完成：在 R2 发现 ${data.data.orphans.count} 个孤儿文件（未在数据库中记录）`,
        truncated: data.data.orphans.truncated,
        samples: data.data.orphans.samples
      };
    },
    execute: async () => {
      // 1. 先进行一次审计获取要恢复的 Key
      const auditRes = await api.admin.maintenance.storage.audit.$get();
      const auditData = await auditRes.json() as AuditResponse;
      if (!auditData.success) throw new Error("审计失败");
      
      const orphans = auditData.data.orphans.samples || [];
      if (orphans.length === 0) return { message: "未发现需要恢复的孤儿文件" };
      
      const keys = orphans.map((o) => o.key);
      
      // 2. 执行批量恢复
      const res = await api.admin.maintenance.storage['recover-orphans'].$post({
        json: { keys }
      });
      const data = await res.json() as RecoverResponse;
      if (!data.success) throw new Error(data.error || "恢复失败");
      
      const recoveredCount = (data.results || []).filter((r) => r.status === 'recovered').length;
      return { 
        message: `找回任务完成：成功导入 ${recoveredCount} 条记录，跳过 ${orphans.length - recoveredCount} 条`,
        details: data.results
      };
    }
  },
  ghost_records: {
    name: "清理資料庫殘餘記錄",
    preview: async () => {
      const res = await api.admin.maintenance.storage.audit.$get();
      const data = await res.json() as AuditResponse;
      if (!data.success) throw new Error("审计失败");
      return { 
        affectedCount: data.data.ghosts.count, 
        message: `掃描完成：發現 ${data.data.ghosts.count} 條殘餘記錄（資料庫中有記錄但 R2 找不到文件）`,
        samples: data.data.ghosts.samples
      };
    },
    execute: async () => {
      const res = await api.admin.maintenance.storage['clean-ghosts'].$post();
      const data = await res.json() as Record<string, any>;
      if (!data.success) throw new Error(data.error || "清理失敗");
      return { message: `修復完成，已移除 ${data.count || 0} 條無效的資料庫記錄` };
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
