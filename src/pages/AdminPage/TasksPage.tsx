import React from 'react';
import { 
  History, CheckCircle2, AlertCircle, Clock, 
  Terminal, RefreshCw, BarChart3, Database, 
  Zap, PackageSearch, ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useGlobalTasks } from '@/hooks/admin/useGlobalTasks';
import { UnifiedTask } from '@/features/tasks/taskTypes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useUIStore } from '@/store/useUIStore';
import { formatters } from '@/utils/formatters';

export default function TasksPage() {
  const { tasks, isLoading, refetch } = useGlobalTasks();
  const update = useUIStore(s => s.update);

  const stats = {
    total: tasks.length,
    active: tasks.filter(t => t.status === 'processing').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    failed: tasks.filter(t => t.status === 'failed').length,
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => update({ activeScreen: 'gallery' })}
            className="rounded-full shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-navy text-white rounded-2xl flex items-center justify-center shadow-lg">
                <Terminal size={20} />
              </div>
              <h1 className="text-3xl font-black text-brand-navy tracking-tight uppercase">任务指挥部</h1>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">
              Task Monitoring & Control
            </p>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          onClick={() => refetch()} 
          disabled={isLoading}
          className="rounded-full font-black uppercase tracking-widest text-[10px] h-10 px-6 border-slate-200"
        >
          <RefreshCw size={14} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          手动刷新
        </Button>
      </div>

      {/* 概览统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '全部记录', value: stats.total, icon: History, color: 'text-slate-600', bg: 'bg-slate-50' },
          { label: '进行中', value: stats.active, icon: Zap, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: '已完成', value: stats.completed, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
          { label: '失败/取消', value: stats.failed, icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`p-5 rounded-[24px] ${stat.bg} border border-white shadow-sm space-y-1`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</span>
              <stat.icon size={14} className={stat.color} />
            </div>
            <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
          </motion.div>
        ))}
      </div>

      {/* 任务列表 */}
      <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm overflow-hidden relative min-h-[400px]">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
          <Database size={160} />
        </div>

        <div className="relative space-y-6">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4">
            <h3 className="text-sm font-black text-brand-navy uppercase tracking-tight flex items-center gap-2">
              <BarChart3 size={18} className="text-blue-500" />
              任务队列演练
            </h3>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Last Updated: {formatters.time(new Date())}
            </div>
          </div>

          <div className="space-y-4">
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-300 space-y-3">
                <PackageSearch size={48} className="opacity-20" />
                <p className="text-sm font-black uppercase tracking-widest">暂无记录</p>
              </div>
            ) : (
              <div className="grid gap-4">
                <AnimatePresence mode="popLayout">
                  {tasks.map((task) => (
                    <TaskItem key={task.id} task={task} />
                  ))}
                </AnimatePresence>
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
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group bg-slate-50/50 border border-slate-100 rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-4 hover:bg-white hover:shadow-md transition-all duration-300"
    >
      {/* 状态图标 */}
      <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-white border border-slate-100 shadow-sm relative">
        {task.status === 'processing' ? (
          <div className="relative">
             <RefreshCw size={20} className="text-blue-500 animate-spin" />
             <div className="absolute inset-0 bg-blue-500/10 blur-xl animate-pulse" />
          </div>
        ) : task.status === 'completed' ? (
          <CheckCircle2 size={24} className="text-green-500" />
        ) : (
          <AlertCircle size={24} className="text-red-500" />
        )}
      </div>

      {/* 信息区域 */}
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
          <span className="text-[10px] text-slate-400 font-mono">#{task.id.slice(0, 8)}</span>
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

      {/* 进度控制 */}
      <div className="md:w-48 space-y-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] font-bold text-slate-400">PROGRESS</span>
          <span className="text-[10px] font-black text-slate-600 tabular-nums">{Math.round(task.progress)}%</span>
        </div>
        <Progress value={task.progress} className="h-1.5" />
      </div>
    </motion.div>
  );
}
