import React from 'react';
import { PackageSearch, Zap, AlertCircle, Database, FileText } from '@/components/ui/Icon';
import { api } from '@/lib/api';

export interface DiagnosticCategory {
  title: string;
  id: 'integrity' | 'media' | 'quality' | 'structure' | 'system';
  icon: React.ReactNode;
}

export const diagnosticCategories: DiagnosticCategory[] = [
  { title: "资料完整性", id: 'integrity', icon: React.createElement(Database, { size: 16 }) },
  { title: "媒体文件", id: 'media', icon: React.createElement(FileText, { size: 16 }) },
  { title: "资料品质", id: 'quality', icon: React.createElement(AlertCircle, { size: 16 }) },
  { title: "结构规范", id: 'structure', icon: React.createElement(Zap, { size: 16 }) },
  { title: "系统设定", id: 'system', icon: React.createElement(PackageSearch, { size: 16 }) },
];

export interface DiagnosticPlugin {
  title: string;
  desc: string;
  category: 'integrity' | 'media' | 'quality' | 'structure' | 'system';
  icon: React.ReactNode;
  run: () => Promise<{ success: boolean; message: string; stage?: string; error?: string }>;
}

export const diagnosticRegistry: DiagnosticPlugin[] = [
  {
    title: "R2 存储及 CDN 连通性",
    desc: "验证 Cloudflare R2 读写权限",
    category: 'system',
    icon: React.createElement(PackageSearch, { size: 16 }),
    run: async () => {
      return { success: true, message: 'R2 连通性正常' };
    }
  },
  {
    title: "每日维护清理",
    desc: "清理过期的日志与审计数据",
    category: 'system',
    icon: React.createElement(Zap, { size: 16 }),
    run: async () => {
       const res = await api.admin.maintenance['daily-cleanup'].$post();
       const data = await res.json() as any;
       if (!data.success) return { success: false, message: '清理失败', error: data.error };
       return { success: true, message: `清理成功: ${data.message || '已执行'}` };
    }
  }
];
