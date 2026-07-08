import { api } from '#lib/api.js';

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
  execute: (onProgress?: (progress: number, message?: string) => void) => Promise<{ jobId?: string; message?: string; [key: string]: unknown }>;
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
      const data = await res.json() as { success: boolean; count?: number; [key: string]: unknown };
      return { message: `修复完成，已移除 ${data.count || 0} 条重复记录`, ...data };
    }
  },
  orphan_files: {
    name: "找回云端孤兒照片",
    preview: async () => {
      const res = await api.admin.maintenance.storage.audit.$get();
      const data = (await res.json()) as unknown as AuditResponse;
      if (!data.success) throw new Error("审计失败");
      return { 
        affectedCount: data.data.orphans.count, 
        message: `扫描完成：在 R2 发现 ${data.data.orphans.count} 个孤儿文件（未在数据库中记录）`,
        truncated: data.data.orphans.truncated,
        samples: data.data.orphans.samples
      };
    },
    execute: async (onProgress) => {
      // 1. 先进行一次审计获取要恢复的 Key
      const auditRes = await api.admin.maintenance.storage.audit.$get();
      const auditData = (await auditRes.json()) as unknown as AuditResponse;
      if (!auditData.success) throw new Error("审计失败");
      
      const orphans = auditData.data.orphans.samples || [];
      if (orphans.length === 0) return { message: "未发现需要恢复的孤儿文件" };
      
      const keys = orphans.map((o) => o.key);
      
      // 2. 执行批量恢复 (SSE Stream)
      const res = await api.admin.maintenance.storage['recover-orphans'].$post({
        json: { keys }
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('Response stream not supported');

      const decoder = new TextDecoder();
      let buffer = '';
      let finalData: RecoverResponse | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        
        // Keep the last partial chunk in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const dataStr = line.slice(6);
              const data = JSON.parse(dataStr);
              
              if (data.error) throw new Error(data.error);
              
              if (data.progress !== undefined) {
                onProgress?.(data.progress, data.message);
              }
              
              if (data.success) {
                finalData = data as RecoverResponse;
              }
            } catch (e: unknown) {
              // Only throw if it's our parsed error, otherwise it might be partial JSON (shouldn't happen with split)
              if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
                 throw e;
              }
            }
          }
        }
      }

      if (!finalData) throw new Error("Stream closed before completion");

      const recoveredCount = (finalData.results || []).filter((r) => r.status === 'recovered').length;
      return { 
        message: `找回任务完成：成功导入 ${recoveredCount} 条记录，跳过 ${orphans.length - recoveredCount} 条`,
        details: finalData.results
      };
    }
  },
  ghost_records: {
    name: "清理資料庫殘餘記錄",
    preview: async () => {
      const res = await api.admin.maintenance.storage.audit.$get();
      const data = (await res.json()) as unknown as AuditResponse;
      if (!data.success) throw new Error("审计失败");
      return { 
        affectedCount: data.data.ghosts.count, 
        message: `掃描完成：發現 ${data.data.ghosts.count} 條殘餘記錄（資料庫中有記錄但 R2 找不到文件）`,
        samples: data.data.ghosts.samples
      };
    },
    execute: async () => {
      const res = await api.admin.maintenance.storage['clean-ghosts'].$post();
      const data = await res.json() as { success: boolean; count?: number; error?: string; [key: string]: unknown };
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
  refresh_view: {
    name: "刷新照片列表缓存",
    execute: async () => {
      const res = await api.admin.maintenance['refresh-view'].$post();
      const data = await res.json() as Record<string, unknown>;
      if (!data.success) throw new Error(String(data.error || '刷新失败'));
      return { message: "已强制刷新全局照片列表缓存 (Materialized View)" };
    }
  },
  repair_integrity: {
    name: "修复数据库约束与合组一致性",
    execute: async () => {
      const res = await api.groups['repair-integrity'].$post();
      const data = await res.json() as { success: boolean; data?: { dissolved?: number; synced?: number }; error?: string; [key: string]: unknown };
      if (!data.success) throw new Error(String(data.error || '修复失败'));
      return { message: `修复完成：解散了 ${data.data?.dissolved || 0} 个无效合组，同步了 ${data.data?.synced || 0} 个合组。`, ...data };
    }
  }
};
