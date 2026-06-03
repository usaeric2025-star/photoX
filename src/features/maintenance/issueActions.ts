import { api } from "@/lib/api";
import { MaintenanceAction } from "./maintenanceTypes";

/**
 * [MAPPING] ISSUE_ACTIONS
 * Maps internal issue IDs to their respective preview and execution logic.
 */
export const ISSUE_ACTIONS: Record<string, MaintenanceAction> = {
  member_count_mismatch: {
    name: '修复成员数',
    preview: async () => {
      const res = await api.admin.maintenance['member-count-mismatch'].preview.$post();
      return await res.json() as any;
    },
    execute: async () => {
      const res = await api.admin.repair['member-count-mismatch'].execute.$post();
      const data = await res.json() as any;
      return { jobId: data.jobId || 'sync', message: data.message };
    },
    getStatus: async (jobId) => {
      const res = await api.admin.maintenance.job[':jobId'].$get({ param: { jobId } });
      return await res.json() as any;
    }
  },
  orphan_files: {
    name: '恢复孤儿照片',
    preview: async () => {
      const res = await api.storage.audit.$get();
      const data = await res.json() as any;
      return { affectedCount: data.data?.orphans || 0 };
    },
    execute: async () => {
      const res = await api.storage['import-orphans'].$post();
      const data = await res.json() as any;
      return { jobId: data.jobId || 'restore_orphans_job', message: data.message };
    },
    getStatus: async (jobId) => {
      const res = await api.admin.maintenance.job[':jobId'].$get({ param: { jobId } });
      return await res.json() as any;
    }
  },
  missing_hashes: {
    name: '补全哈希',
    preview: async () => {
      const res = await api.admin.maintenance['missing-hash'].preview.$post();
      return await res.json() as any;
    },
    execute: async () => {
      const res = await api.admin.repair['missing-hash'].execute.$post();
      const data = await res.json() as any;
      return { jobId: data.jobId || 'hash', message: data.message };
    },
    getStatus: async (jobId) => {
      const res = await api.admin.maintenance.job[':jobId'].$get({ param: { jobId } });
      return await res.json() as any;
    }
  },
  orphaned_photos: {
    name: '修复孤儿照片(DB)',
    preview: async () => {
      const res = await api.admin.diagnose.$get();
      const data = await res.json() as any;
      const issue = data.issues?.find((i: any) => i.id === 'orphaned_photos');
      return { affectedCount: issue?.affectedCount || 0 };
    },
    execute: async () => {
      const res = await api.admin.repair.$post({ json: { issueId: 'orphaned_photos' } });
      const data = await res.json() as any;
      return { jobId: 'cleanup', message: data.message };
    }
  },
  non_standard_item_codes: {
    name: '规范编号',
    preview: async () => {
      const res = await api.admin.diagnose.$get();
      const data = await res.json() as any;
      const issue = data.issues?.find((i: any) => i.id === 'non_standard_item_codes');
      return { affectedCount: issue?.affectedCount || 0 };
    },
    execute: async () => {
       const res = await api.maintenance['normalize-item-codes'].$post();
       const data = await res.json() as any;
       return { jobId: 'norm', message: data.message };
    }
  },
  empty_groups: {
    name: '清理空合组',
    preview: async () => {
      const res = await api.admin.diagnose.$get();
      const data = await res.json() as any;
      const issue = data.issues?.find((i: any) => i.id === 'empty_groups');
      return { affectedCount: issue?.affectedCount || 0 };
    },
    execute: async () => {
      const res = await api.admin.repair.$post({ json: { issueId: 'empty_groups' } });
      const data = await res.json() as any;
      return { jobId: 'cleanup', message: data.message };
    },
    getStatus: async (jobId) => {
      const res = await api.admin.maintenance.job[':jobId'].$get({ param: { jobId } });
      return await res.json() as any;
    }
  },
  ghost_records: {
    name: '清理幽灵记录',
    preview: async () => {
      const res = await api.admin.diagnose.$get();
      const data = await res.json() as any;
      const issue = data.issues?.find((i: any) => i.id === 'ghost_records');
      return { affectedCount: issue?.affectedCount || 0 };
    },
    execute: async () => {
      const res = await api.admin.repair.$post({ json: { issueId: 'ghost_records' } });
      const data = await res.json() as any;
      return { jobId: 'cleanup', message: data.message };
    },
    getStatus: async (jobId) => {
      const res = await api.admin.maintenance.job[':jobId'].$get({ param: { jobId } });
      return await res.json() as any;
    }
  },
  cleanup_temp_urls: {
    name: '物理路径 UUID 化',
    preview: async () => {
       const res = await api.admin.diagnose.$get();
       const data = await res.json() as any;
       const issue = data.issues?.find((i: any) => i.id === 'cleanup_temp_urls');
       return { affectedCount: issue?.affectedCount || 0 };
    },
    execute: async () => {
       const res = await api.admin.repair.$post({ json: { issueId: 'cleanup_temp_urls' } });
       const data = await res.json() as any;
       return { jobId: 'uuid', message: data.message };
    },
    getStatus: async (jobId) => {
      const res = await api.admin.maintenance.job[':jobId'].$get({ param: { jobId } });
      return await res.json() as any;
    }
  }
};
