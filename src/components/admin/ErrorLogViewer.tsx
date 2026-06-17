import React from 'react';
import { Trash2, Download, AlertCircle, AlertTriangle, Info, ShieldAlert, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { showToast } from '@/lib/ui/toast';
import { useDisclosure } from '@/hooks/core/useDisclosure';
import { formatters } from '@/utils/formatters';
import { useCopyToClipboard } from '@/hooks';

type ErrorLevel = 'critical' | 'error' | 'warn' | 'medium' | 'low' | 'info';

interface LogEntry {
  id: string;
  level: ErrorLevel;
  message?: string;
  error_message?: string;
  context?: string;
  created_at: string;
  stack?: string;
  stack_trace?: string;
  metadata?: Record<string, unknown> | null;
}
const LevelIcon = ({ level }: { level: ErrorLevel }) => {
  switch (level) {
    case 'critical': return <ShieldAlert size={14} className="text-red-600" />;
    case 'error': return <AlertCircle size={14} className="text-red-500" />;
    case 'warn': return <AlertTriangle size={14} className="text-amber-500" />;
    case 'medium': return <AlertTriangle size={14} className="text-amber-400" />;
    case 'low': return <Info size={14} className="text-blue-400" />;
    case 'info': return <Info size={14} className="text-slate-400" />;
    default: return <Info size={14} className="text-slate-400" />;
  }
};

const LogItem = ({ log }: { log: LogEntry }) => {
  const [expanded, { toggle }] = useDisclosure(false);
  const { copy } = useCopyToClipboard({ successMessage: '日志详情已复制' });
  const dateTimeStr = formatters.dateTime(log.created_at);
  const level = log.level || log.metadata?.level || 'info';

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const stack = log.stack || log.stack_trace;
    const metadataStr = log.metadata ? `\nMetadata: ${JSON.stringify(log.metadata, null, 2)}` : '';
    const textToCopy = `[Log Context: ${log.context || 'global'}]
Level: ${level}
Time: ${formatters.dateTime(log.created_at)}
Message: ${log.message || log.error_message || ''}${metadataStr}${stack ? `\nStack: ${stack}` : ''}`;
    
    copy(textToCopy);
  };

  return (
    <div className={`border-b border-slate-100 last:border-0 py-3 ${level === 'critical' ? 'bg-red-50/30' : ''}`}>
      <div className="flex items-start gap-3 cursor-pointer group" onClick={toggle}>
        <div className="mt-0.5">
          <LevelIcon level={level} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-bold text-slate-400 tabular-nums">{dateTimeStr}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 font-black text-slate-500 uppercase tracking-tighter">
              {log.context || (log as any).metadata?.context || 'global'}
            </span>
          </div>
          <p className="text-[12px] font-medium text-slate-700 leading-snug line-clamp-2 group-hover:line-clamp-none transition-all">
            {log.message || log.error_message}
          </p>
        </div>
        <div className="text-slate-300 flex items-center gap-2">
          <button 
            type="button"
            onClick={handleCopy}
            className="p-1 rounded hover:bg-slate-150 hover:text-slate-600 transition-colors"
            title="复制日志详情 / Copy details"
          >
            <Copy size={12} className="text-slate-400 hover:text-slate-600" />
          </button>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>
      
      {expanded && (
        <div className="mt-3 space-y-2">
          {(log.stack || log.stack_trace) && (
            <div className="p-3 bg-slate-50 rounded-xl overflow-x-auto">
              <span className="text-[9px] font-bold text-slate-400 block mb-1">STACK TRACE</span>
              <pre className="text-[9px] font-mono text-slate-500 whitespace-pre leading-relaxed">
                {log.stack || log.stack_trace}
              </pre>
            </div>
          )}
          {log.metadata && (
            <div className="p-3 bg-slate-50 rounded-xl overflow-x-auto">
              <span className="text-[9px] font-bold text-slate-400 block mb-1">METADATA / CONTEXT</span>
              <pre className="text-[9px] font-mono text-slate-500 whitespace-pre-wrap leading-relaxed">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const ErrorLogViewer = () => {
  const queryClient = useQueryClient();

  const { data: logs = [], refetch } = useQuery({
    queryKey: ['error_logs'],
    queryFn: async () => {
        const res = await api.admin['error-events'].$get();
        const json = await res.json();
        if (!json.success) throw new Error(json.error || '获取日志失败');
        return json.data as LogEntry[];
    }
  });

  const clearMutation = useMutation({
      mutationFn: async () => {
          const res = await api.admin['error-events-clear'].$post();
          const json = await res.json();
          if (!json.success) throw new Error(json.error || '清除日志失败');
          return json as { success: boolean; count?: number };
      },
      onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: ['error_logs'] });
          const count = data?.count ?? 0;
          if (count > 0) {
            showToast.success(`日志清理成功：已从物理数据表清除 ${count} 条历史日志记录`);
          } else {
            showToast.success('日志清理成功：当前无历史日志记录');
          }
      },
       onError: (err: Error) => {
          console.error('[ErrorLogViewer] Clear failed:', err);
          showToast.error(`清除失败: ${err.message}`);
      }
  });

  return (
    <div className="bg-white p-6 rounded-[32px] border border-brand-navy/10 mt-4 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-black text-brand-navy text-[10px] uppercase tracking-widest flex items-center gap-2">
          <div className="w-1.5 h-3.5 bg-brand-gold rounded-full"></div>
          系统错误与操作日志 / System Logs
        </h3>
        
        <div className="flex items-center gap-2">
          {logs.length > 0 && (
             <button 
                onClick={() => clearMutation.mutate()}
                className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition-colors"
                title="清除日志"
              >
                <Trash2 size={14} />
              </button>
          )}
        </div>
      </div>

      <div className="max-h-[500px] overflow-y-auto no-scrollbar">
        {logs.length === 0 ? (
          <div className="text-xs text-slate-400 py-12 text-center italic flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">
              <Info size={16} className="text-slate-200" />
            </div>
            暂无日志记录 / No logs yet
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map(log => (
              <LogItem key={log.id} log={log} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
