import React from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, History, Zap, Clock, PackageSearch as PackageSearchIcon, BarChart3 } from 'lucide-react';
import { useGlobalTasks } from '@/hooks/admin/useGlobalTasks';
import { UnifiedTask } from '@/types';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { Progress } from '@/components/shared/Progress';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatters } from '@/utils/formatters';

export function TasksContent() {
  const { tasks = [], isLoading, refetch } = useGlobalTasks();
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  
  const stats = {
    total: safeTasks.length,
    active: safeTasks.filter(t => t.status === 'processing').length,
    completed: safeTasks.filter(t => t.status === 'completed').length,
    failed: safeTasks.filter(t => t.status === 'failed').length,
  };

  return (
    <div className="space-y-8">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '全部记录', value: stats.total, icon: History, color: 'text-slate-600', bg: 'bg-slate-50' },
          { label: '进行中', value: stats.active, icon: Zap, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: '已完成', value: stats.completed, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
          { label: '失败/异常', value: stats.failed, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className={`p-5 rounded-[24px] ${stat.bg} border border-white shadow-sm space-y-1`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</span>
              <stat.icon size={14} className={stat.color} />
            </div>
            <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm overflow-hidden min-h-[400px]">
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4">
            <h3 className="text-sm font-black text-brand-navy uppercase tracking-tight flex items-center gap-2">
              <BarChart3 size={18} className="text-blue-500" />
              后台任务队列
            </h3>
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-8 px-3 rounded-full text-[10px] font-black uppercase tracking-widest">
              <RefreshCw size={12} className={`mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>

          <div className="space-y-4">
            {safeTasks.length === 0 ? (
              <EmptyState 
                title="暂无执行记录" 
                icon={<PackageSearchIcon size={48} className="opacity-20" />}
              />
            ) : (
              <div className="grid gap-4">
                  {safeTasks.map((task) => (
                    <TaskItem key={task.id} task={task} />
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskItem({ task }: { task: UnifiedTask }) {
  const isMaintenance = task.source === 'maintenance';
  
  return (
    <div
      className="group bg-slate-50/50 border border-slate-100 rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-4 hover:bg-white hover:shadow-md transition-all duration-300 animate-fade-right"
    >
      <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-white border border-slate-100 shadow-sm relative">
        {task.status === 'processing' ? (
          <div className="relative">
             <RefreshCw size={20} className="text-blue-500 animate-spin" />
             <div className="absolute inset-0 bg-blue-500/10 blur-xl animate-pulse" />
          </div>
        ) : task.status === 'completed' ? (
          <CheckCircle2 size={24} className="text-green-500" />
        ) : (
          <AlertTriangle size={24} className="text-red-500" />
        )}
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`text-[9px] font-black uppercase px-2 py-0 border-none ${
            isMaintenance ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
          }`}>
            {isMaintenance ? '系统维护' : '会话任务'}
          </Badge>
          <span className="text-sm font-black text-brand-navy truncate uppercase tracking-tight">
            {task.title}
          </span>
        </div>
        
        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
          <span className="flex items-center gap-1">
            <Clock size={10} />
            {formatters.time(task.createdAt)}
          </span>
          {task.total && (
             <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-500">
               进度: {task.processed}/{task.total}
             </span>
          )}
        </div>

        {task.message && (
          <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 group-hover:line-clamp-none transition-all">
            {task.message}
          </p>
        )}
      </div>

      <div className="md:w-48 space-y-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] font-bold text-slate-400">PROGRESS</span>
          <span className="text-[10px] font-black text-slate-600 tabular-nums">{Math.round(task.progress)}%</span>
        </div>
        <Progress value={task.progress} className="h-1.5" />
      </div>
    </div>
  );
}
