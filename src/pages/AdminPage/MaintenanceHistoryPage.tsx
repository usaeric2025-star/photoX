import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronLeft, History, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { ROUTES } from '@/config/constants';

import { useUIStore } from '@/store/useUIStore';

// Helper for MM-dd HH:mm
const formatLogDate = (date: Date) => {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${mm}-${dd} ${hh}:${min}`;
};

/**
 * [PAGE] MaintenanceHistoryPage
 * Displays a list of recent background maintenance tasks and their outcomes.
 */
export const MaintenanceHistoryPage = () => {
  const navigate = useNavigate();
  const update = useUIStore(s => s.update);
  const activeScreen = useUIStore(s => s.activeScreen);
  
  const { data: logs, isLoading } = useQuery({
    queryKey: ['maintenance', 'logs'],
    queryFn: async () => {
      // In a real app, this would fetch from maintenance_logs table
      // For now, we simulate with a mock response or the diagnose endpoint
      const res = await api.admin.diagnose.$get();
      return await res.json() as any;
    }
  });

  const handleBack = () => {
    update({ activeScreen: 'gallery' });
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleBack}
            className="rounded-full"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-brand-navy tracking-tight flex items-center gap-2">
              <History className="w-6 h-6" />
              维护操作序列
            </h1>
            <p className="text-sm text-slate-500">记录了所有后台数据修复与对账任务的执行结果</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="text-[10px] font-black uppercase text-slate-400">时间</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-slate-400">操作名称</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-slate-400">状态</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-slate-400">影响条数</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-slate-400">执行细节</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-64 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Clock className="w-6 h-6 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-widest">正在加载序列记录...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              // Mocking a few history items since we don't have real log persistence yet
              [
                { id: 1, time: new Date(), action: '孤本照片恢复', status: 'success', count: 12, details: '从 photox/public/ 成功找回 12 张无主照片' },
                { id: 2, time: new Date(Date.now() - 3600000), action: '合组数量同步', status: 'success', count: 4, details: '修复了 4 个合组的 member_count 计数器' },
                { id: 3, time: new Date(Date.now() - 7200000), action: 'R2 物理清理', status: 'success', count: 85, details: '成功从云端存储删除了 85 个无效缩略图及临时文件' }
              ].map((log) => (
                <TableRow key={log.id} className="hover:bg-slate-50/50 transition-colors cursor-default group">
                  <TableCell className="text-xs font-mono text-slate-400">
                    {formatLogDate(log.time)}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-black text-brand-navy uppercase tracking-tight">{log.action}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {log.status === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                        {log.status === 'success' ? '已完成' : '失败'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center justify-center bg-slate-100 text-slate-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                      {log.count}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-[11px] text-slate-500">
                    {log.details}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-center italic text-[10px] text-slate-400 uppercase tracking-widest">
        --- 仅展示最近 50 条操作记录 ---
      </div>
    </div>
  );
};

export default MaintenanceHistoryPage;
