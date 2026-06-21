import React, { useEffect, useRef } from 'react';
import { useUIStore } from '@/store/useUIStore';
import { useCopyToClipboard } from '@/hooks';
import { isAppError } from '@/lib/error/AppError';

export const FatalErrorOverlay = () => {
  const fatalError = useUIStore((s) => s.fatalError);
  const { copy, copied } = useCopyToClipboard({ 
    successMessage: '诊断信息已复制到剪贴板',
    showToast: false // Toast feedback is often hidden behind native dialogs
  });
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (fatalError) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [fatalError]);

  if (!fatalError) return null;

  const handleCopy = () => {
    const timestamp = new Date().toISOString();
    const errorType = fatalError.name || 'FatalError';
    
    let errorCode = 'FATAL';
    let traceId = 'N/A';

    if (isAppError(fatalError)) {
        errorCode = String(fatalError.code);
        traceId = fatalError.traceId;
    } else if ('code' in fatalError) {
        errorCode = String((fatalError as { code?: string | number }).code);
    } else if ('status' in fatalError) {
        errorCode = String((fatalError as { status?: string | number }).status);
    }

    if (!isAppError(fatalError) && 'traceId' in fatalError) {
        traceId = String((fatalError as { traceId?: string }).traceId);
    }

    const message = fatalError.message || '未知内部错误';
    
    const diagnosticInfo = [
      `--- 核心系统诊断 ---`,
      `时间戳: ${timestamp}`,
      `错误类型: ${errorType}`,
      `代码: ${errorCode}`,
      `Trace ID: ${traceId}`,
      `原始信息: ${message}`,
      `----------------`,
      `堆栈信息:`,
      fatalError.stack || '无堆栈信息'
    ].join('\n');
    
    copy(diagnosticInfo);
  };

  const getDisplayCode = () => {
      if (isAppError(fatalError)) return fatalError.code;
      if ('code' in fatalError) return (fatalError as { code?: string | number }).code;
      return 'FATAL';
  };

  const getDisplayTrace = () => {
      if (isAppError(fatalError)) return fatalError.traceId;
      if ('traceId' in fatalError) return (fatalError as { traceId?: string }).traceId;
      return 'N/A';
  };

  return (
    <dialog 
      ref={dialogRef}
      className="backdrop:bg-slate-900/90 backdrop:backdrop-blur-sm p-0 rounded-3xl overflow-hidden border-none shadow-2xl w-full max-w-lg focus:outline-none"
      onClose={() => {}} // Prevent accidental close
    >
      <div className="bg-white p-8 space-y-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-red-50 text-red-600 animate-pulse">
             <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">系统核心组件故障</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            {fatalError.message || '系统底层发生了未预期的严重异常，可能影响数据一致性。'}
          </p>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">故障摘要</span>
            <span className="text-[10px] p-1 bg-white rounded border border-slate-200 text-slate-400 font-mono">CODE: {getDisplayCode()}</span>
          </div>
          <p className="text-xs font-mono text-slate-600 break-all">
            {fatalError.message || 'Internal System Failure'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
            重载应用
          </button>
          <button
            onClick={handleCopy}
            className={`flex-1 px-6 py-3 border rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-2 ${
              copied ? 'bg-green-50 border-green-200 text-green-600' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            {copied ? '已复制' : '复制诊断'}
          </button>
        </div>
        
        <div className="flex justify-center flex-col items-center">
             <span className="text-[10px] text-slate-400 mt-2 font-mono italic">TRACE: {getDisplayTrace()}</span>
        </div>
      </div>
    </dialog>
  );
};
