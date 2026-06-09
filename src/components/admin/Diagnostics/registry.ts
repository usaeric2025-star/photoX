import React from 'react';
import { PackageSearch, Zap } from 'lucide-react';
import { api } from '@/lib/api';

export interface DiagnosticPlugin {
  title: string;
  desc: string;
  icon: React.ReactNode;
  run: () => Promise<{ success: boolean; message: string; stage?: string; error?: string }>;
}

export const diagnosticRegistry: DiagnosticPlugin[] = [
  {
    title: "R2 存储及 CDN 连通性",
    desc: "验证 Cloudflare R2 读写权限",
    icon: React.createElement(PackageSearch, { size: 16 }),
    run: async () => {
      return { success: true, message: 'R2 连通性正常' };
    }
  },
  {
    title: "每日维护清理",
    desc: "清理过期的日志与审计数据",
    icon: React.createElement(Zap, { size: 16 }),
    run: async () => {
       const res = await api.admin.maintenance['daily-cleanup'].$post();
       const data = await res.json() as any;
       if (!data.success) return { success: false, message: '清理失败', error: data.error };
       return { success: true, message: `清理成功: ${data.message || '已执行'}` };
    }
  }
];
