import { logger } from '@/lib/logger';
import React from 'react';
import { Icon } from '@/components/ui/Icon';
import { useAppQuery, useAppMutation, appQuery } from '@/lib/query';
import { api } from '@/lib/api';
import { useFormSubmit } from '@/lib/forms/useFormSubmit';
import { Button } from '@/components/shared/Button';
import * as v from 'valibot';
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
    case 'critical': return <Icon name="shield-alert" size={14} className="text-red-600" />;
    case 'error': return <Icon name="alert-circle" size={14} className="text-red-500" />;
    case 'warn': return <Icon name="alert-triangle" size={14} className="text-amber-500" />;
    case 'medium': return <Icon name="alert-triangle" size={14} className="text-amber-400" />;
    case 'low': return <Icon name="info" size={14} className="text-blue-400" />;
    case 'info': return <Icon name="info" size={14} className="text-slate-400" />;
    default: return <Icon name="info" size={14} className="text-slate-400" />;
  }
};

const LogItem = ({ log }: { log: LogEntry }) => {
  const [expanded, { toggle }] = useDisclosure(false);
  const { copy } = useCopyToClipboard({ successMessage: '日志详情已复制' });
  const dateTimeStr = formatters.dateTime(log.created_at);
  const level = (log.level || log.metadata?.level || 'info') as ErrorLevel;

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
              {log.context || (log.metadata?.context as string) || 'global'}
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
            <Icon name="copy" size={12} className="text-slate-400 hover:text-slate-600" />
          </button>
          <Icon name={expanded ? "chevron-up" : "chevron-down"} size={14} />
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
  const { data: logs = [] } = useAppQuery(
    'error_logs',
    async () => {
        const res = await api.admin.maintenance['error-events'].$get();
        const json = await res.json();
        if (!json.success) throw new Error(json.error || '获取日志失败');
        return json.data as LogEntry[];
    }
  );

  const { submit: runClear, isLoading: isClearing } = useFormSubmit({
      schema: v.unknown(),
      mutationFn: async () => {
          const res = await api.admin.maintenance['error-events-clear'].$post();
          const json = await res.json();
          if (!json.success) throw new Error(json.error || '清除日誌失敗');
          return json as { success: boolean; count?: number };
      },
      onSuccess: () => {
          appQuery.mutate('error_logs');
      },
      successMessage: '日誌清理成功 / Cleanup successful',
      errorMessage: '清除失敗 / Cleanup failed'
  });

  return (
    <div className="bg-white p-6 rounded-[32px] border border-brand-navy/10 mt-4 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-black text-brand-navy text-[10px] uppercase tracking-widest flex items-center gap-2">
          <div className="w-1.5 h-3.5 bg-brand-gold rounded-full"></div>
          系統錯誤與操作日誌 / System Logs
        </h3>
        
        <div className="flex items-center gap-2">
          {logs.length > 0 && (
             <Button 
                variant="danger"
                size="icon"
                onClick={() => runClear({})}
                loading={isClearing}
                className="w-8 h-8 rounded-lg"
                title="清除日誌"
              >
                <Icon name="trash-2" size={14} />
              </Button>
          )}
        </div>
      </div>

      <div className="max-h-[500px] overflow-y-auto no-scrollbar">
        {logs.length === 0 ? (
          <div className="text-xs text-slate-400 py-12 text-center italic flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">
              <Icon name="info" size={16} className="text-slate-200" />
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
