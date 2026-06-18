import React from 'react';
import { useUIStore } from '@/store/useUIStore';
import { useCopyToClipboard } from '@/hooks';

export const FatalErrorOverlay = () => {
  const fatalError = useUIStore((s) => s.fatalError);
  const { copy } = useCopyToClipboard({ successMessage: '错误信息已复制到剪贴板' });

  if (!fatalError) return null;

  const handleCopy = () => {
    const traceId = 'traceId' in fatalError ? `\nTrace ID: ${(fatalError as any).traceId}` : '';
    const errorText = `${fatalError.message || 'Unknown error'}${traceId}\n\n${fatalError.stack || ''}`;
    copy(errorText);
  };

  return (
    <div 
      className="fixed inset-0 z-[99999] bg-slate-900/95 flex items-center justify-center p-8 backdrop-blur-sm"
      role="alert"
    >
      <div className="bg-white p-8 rounded-2xl max-w-lg w-full shadow-2xl space-y-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600">
             <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">严重系统错误</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            {fatalError.message || '系统底层发生了未预期的严重异常'}
            {'traceId' in fatalError && (
              <span className="block mt-2 font-mono text-[10px] text-slate-400">
                Trace ID: {(fatalError as any).traceId}
              </span>
            )}
          </p>
        </div>

        <div className="flex gap-3 justify-center pt-4 border-t border-slate-100">
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all active:scale-95"
          >
            刷新页面
          </button>
          <button
            onClick={handleCopy}
            className="px-6 py-2.5 border border-slate-200 bg-white text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all active:scale-95"
          >
            复制日志
          </button>
        </div>
      </div>
    </div>
  );
};
