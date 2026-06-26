import React from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { showToast } from '@/lib/ui/toast';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { useCopyToClipboard } from '@/hooks';
import { isAppError } from '@/lib/error/AppError';

function GlobalErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const { copy } = useCopyToClipboard({ successMessage: '诊断信息已复制' });

  const isChunkFailure = error instanceof Error && (
    error.message.includes('Failed to fetch dynamically imported module') || 
    error.message.includes('Loading chunk')
  );

  if (isChunkFailure) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8 bg-slate-50">
        <div className="text-center max-w-sm">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">更新应用中...</h2>
          <p className="text-slate-500 mb-8 text-sm">正在自动加载最新资源，请稍候</p>
        </div>
      </div>
    );
  }

  const handleCopy = () => {
    const timestamp = new Date().toISOString();
    const isErrObj = error && typeof error === 'object';
    const errorType = (isErrObj && 'name' in error) ? String((error as Error).name) : 'Error';
    
    let errorCode = 'N/A';
    let traceId = 'N/A';

    if (isErrObj && isAppError(error)) {
        errorCode = String(error.code);
        traceId = error.traceId;
    } else if (isErrObj) {
        if ('code' in error) errorCode = String((error as { code?: string | number }).code);
        else if ('status' in error) errorCode = String((error as { status?: string | number }).status);
        if ('traceId' in error) traceId = String((error as { traceId?: string }).traceId);
    }

    const message = error instanceof Error ? error.message : String(error);
    
    const diagnosticInfo = [
      `--- 诊断信息 ---`,
      `时间戳: ${timestamp}`,
      `错误类型: ${errorType}`,
      `代码: ${errorCode}`,
      `Trace ID: ${traceId}`,
      `原始信息: ${message}`,
      `----------------`,
      `堆栈信息:`,
      error instanceof Error ? error.stack || '无堆栈信息' : '无堆栈信息'
    ].join('\n');
    
    copy(diagnosticInfo);
  };

  return (
    <div className="p-4 bg-red-50 text-red-800 rounded-lg">
      <h2 className="text-lg font-bold">系统发生错误</h2>
      <p className="mt-2 text-sm">{error instanceof Error ? error.message : String(error)}</p>
      <div className="flex gap-2 mt-4">
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200"
        >
          重试
        </button>
        <button
          onClick={handleCopy}
          className="px-4 py-2 border border-red-200 bg-white text-red-800 rounded-md hover:bg-red-50"
        >
          复制诊断信息
        </button>
      </div>
    </div>
  );
}

export function AppErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      FallbackComponent={GlobalErrorFallback}
      onError={(error) => {
        if (error instanceof Error) {
          const isChunkFailure = error.message.includes('Failed to fetch dynamically imported module') || 
               error.message.includes('Loading chunk');
          if (isChunkFailure) {
            import('@/lib/chunkErrorHandler').then(({ handleChunkError }) => {
              handleChunkError(error.message);
            });
            return;
          }
        }

        ErrorFactory.capture(error);
        showToast.error('系統發生錯誤，已自動記錄');
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
