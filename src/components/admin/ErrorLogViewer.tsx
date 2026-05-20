import React from 'react';
import { useGalleryStore } from '../../store';
import { Trash2, Download } from 'lucide-react';
import { useFeedback } from '../../hooks';

export const ErrorLogViewer = () => {
  const { errors, clearErrors } = useGalleryStore();
  const { showSuccess } = useFeedback();

  const exportLogs = () => {
    const blob = new Blob([JSON.stringify(errors, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error_logs_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mt-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">系統错误与操作日志 ({errors.length})</h3>
        <div className="flex gap-2">
          {errors.length > 0 && (
            <>
              <button 
                onClick={exportLogs}
                className="text-slate-500 hover:text-slate-800 p-1 transition-colors"
                title="导出日志 / Export"
              >
                <Download size={16} />
              </button>
              <button 
                onClick={clearErrors} 
                className="text-red-500 hover:text-red-700 p-1 transition-colors"
                title="清空日志 / Clear"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
          <button
            onClick={() => {
              import('@sentry/react').then(Sentry => {
                Sentry.captureMessage('Sentry 管理后台测试');
                showSuccess('Sentry 测试消息已发送');
              });
            }}
            className="text-blue-500 hover:text-blue-700 p-1 transition-colors"
            title="Sentry 测试"
          >
              <span className="text-[10px] uppercase font-bold">Test</span>
          </button>
        </div>
      </div>
      
      {errors.length === 0 ? (
        <div className="text-xs text-slate-400 py-4 text-center italic">
          暂无记录
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
          {errors.map((error, index) => {
            const isWarning = error.type === 'warning';
            const logColor = isWarning 
                ? 'bg-amber-50 border-amber-100 text-amber-900' 
                : (error.context?.includes('识别') || error.message.includes('AI'))
                    ? 'bg-purple-50 border-purple-100 text-purple-900'
                    : 'bg-white border-red-100 text-red-900';

            return (
              <div key={index} className={`text-[10px] p-2 rounded border font-mono ${logColor}`}>
                <div className="flex justify-between items-start mb-1">
                    <span className="text-slate-400">
                        {new Date(error.timestamp).toLocaleTimeString()}
                    </span>
                    {error.context && (
                        <span className="px-1 bg-black/5 rounded uppercase font-bold text-[8px]">
                            {error.context}
                        </span>
                    )}
                </div>
                <div className="break-all">{typeof error.message === 'string' ? error.message : JSON.stringify(error.message)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
