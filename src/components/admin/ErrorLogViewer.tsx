import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, Download, AlertCircle, AlertTriangle, Info, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react';
import { ErrorReporter, LogEntry, ErrorLevel } from '@/lib/errorReporter';
import { toast } from '@/lib/ui/toast';

const LevelIcon = ({ level }: { level: ErrorLevel }) => {
  switch (level) {
    case 'critical': return <ShieldAlert className="text-red-600" size={14} />;
    case 'error': return <AlertCircle className="text-orange-500" size={14} />;
    case 'warn': return <AlertTriangle className="text-amber-500" size={14} />;
    case 'info': return <Info className="text-blue-500" size={14} />;
  }
};

const LogItem = ({ log }: { log: LogEntry }) => {
  const [expanded, setExpanded] = useState(false);
  const timeStr = new Date(log.time).toLocaleTimeString();
  const dateStr = new Date(log.time).toLocaleDateString();

  return (
    <div className="border-b border-slate-100 last:border-0 py-3">
      <div className="flex items-start gap-3 cursor-pointer group" onClick={() => setExpanded(!expanded)}>
        <div className="mt-0.5">
          <LevelIcon level={log.level} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-bold text-slate-400 tabular-nums">{dateStr} {timeStr}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 font-black text-slate-500 uppercase tracking-tighter">
              {log.context}
            </span>
          </div>
          <p className="text-[12px] font-medium text-slate-700 leading-snug line-clamp-2 group-hover:line-clamp-none transition-all">
            {log.message}
          </p>
        </div>
        <div className="text-slate-300">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>
      
      {expanded && log.stack && (
        <div className="mt-3 p-3 bg-slate-50 rounded-xl overflow-x-auto">
          <pre className="text-[9px] font-mono text-slate-500 whitespace-pre leading-relaxed">
            {log.stack}
          </pre>
        </div>
      )}
    </div>
  );
};

export const ErrorLogViewer = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const refreshLogs = useCallback(() => {
    setLogs(ErrorReporter.getLogs());
  }, []);

  useEffect(() => {
    refreshLogs();
    window.addEventListener('error_logs_updated', refreshLogs);
    return () => window.removeEventListener('error_logs_updated', refreshLogs);
  }, [refreshLogs]);

  const handleClear = () => {
    ErrorReporter.clearLogs();
    toast.success('日志已清除');
  };

  const handleExport = () => {
    try {
      const dataStr = JSON.stringify(logs, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `photox_logs_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      toast.success('日志已准备导出');
    } catch (e) {
      console.error('Export failed', e);
    }
  };

  return (
    <div className="bg-white p-6 rounded-[32px] border border-brand-navy/10 mt-4 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-black text-brand-navy text-[10px] uppercase tracking-widest flex items-center gap-2">
          <div className="w-1.5 h-3.5 bg-brand-gold rounded-full"></div>
          系统错误与操作日志 / System Logs
        </h3>
        
        <div className="flex items-center gap-2">
          {logs.length > 0 && (
            <>
              <button 
                onClick={handleExport}
                className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors"
                title="导出日志"
              >
                <Download size={14} />
              </button>
              <button 
                onClick={handleClear}
                className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition-colors"
                title="清除日志"
              >
                <Trash2 size={14} />
              </button>
            </>
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
