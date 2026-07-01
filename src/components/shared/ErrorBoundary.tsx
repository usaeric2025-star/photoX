import React, { Component, ReactNode } from 'react';
import { useCopyToClipboard } from '#src/hooks';
import { isAppError } from '#lib/error/AppError';
import { ErrorFactory } from '#lib/error/ErrorFactory';
import { cn } from '#lib/utils';
import { LoadingSpinner } from '#src/components/ui/feedback/LoadingSpinner';
import { handleChunkError } from '#lib/chunkErrorHandler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

const ErrorActions = ({ error, isChunkFailure }: { error?: Error, isChunkFailure: boolean }) => {
  const { copy, copied } = useCopyToClipboard({ successMessage: '诊断信息已复制到剪贴板' });

  const handleCopy = () => {
    const timestamp = new Date().toISOString();
    const errorType = error?.name || 'Error';
    
    let errorCode = 'N/A';
    let traceId = 'N/A';

    if (error && isAppError(error)) {
        errorCode = String(error.code);
        traceId = error.traceId;
    } else if (error) {
        if ('code' in error) errorCode = String((error as { code?: string | number }).code);
        else if ('status' in error) errorCode = String((error as { status?: string | number }).status);
        
        if ('traceId' in error) traceId = String((error as { traceId?: string }).traceId);
    }

    const message = error?.message || '未知错误';
    let safeMessage = message;
    if (safeMessage) {
      safeMessage = safeMessage.replace(/data:image\/[^;]+;base64,[a-zA-Z0-9+/=]+/g, '[BASE64_IMAGE_TRUNCATED]');
      if (safeMessage.length > 500) {
        safeMessage = safeMessage.substring(0, 500) + '... (内容过长已截断)';
      }
    }
    
    const diagnosticInfo = [
      `--- 诊断信息 ---`,
      `时间戳: ${timestamp}`,
      `错误类型: ${errorType}`,
      `代码: ${errorCode}`,
      `Trace ID: ${traceId}`,
      `信息: ${safeMessage}`
    ].join('\n');
    
    copy(diagnosticInfo);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
        {isChunkFailure ? '立即更新系统' : '刷新页面重试'}
      </button>
      {!isChunkFailure && (
        <>
          <button
            onClick={handleCopy}
            className={cn(
              "px-6 py-2.5 border rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-2",
              copied ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            {copied ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            )}
            {copied ? '已复制' : '复制诊断信息'}
          </button>
          <button
            onClick={() => (window.location.href = '/')}
            className="px-6 py-2.5 border border-slate-200 bg-white text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            回到底部首页
          </button>
        </>
      )}
    </div>
  );
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    ErrorFactory.handle(error, { context: 'ErrorBoundary' });
    const isChunkFailure = error.message.includes('Failed to fetch dynamically imported module') || 
         error.message.includes('Loading chunk');
    if (isChunkFailure) {
      handleChunkError(error.message);
    }
  }

  override render() {
    if (this.state.hasError) {
      const isChunkFailure = this.state.error instanceof Error && 
        (this.state.error.message.includes('Failed to fetch dynamically imported module') || 
         this.state.error.message.includes('Loading chunk'));

      if (isChunkFailure) {
        // Return null or a subtle loading state while handleChunkError reloads the page
        return (
          <div className="flex items-center justify-center min-h-screen p-8 bg-slate-50">
            <div className="text-center max-w-sm">
              <LoadingSpinner size="lg" className="mx-auto mb-6" />
              <h2 className="text-xl font-bold text-slate-900 mb-2">更新应用中...</h2>
              <p className="text-slate-500 mb-8 text-sm">正在自动加载最新资源，请稍候</p>
            </div>
          </div>
        );
      }

      return (
        this.props.fallback || (
          <div className="min-h-[500px] w-full flex items-center justify-center p-6 bg-slate-50/30">
            <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
              <div className="p-8 text-center space-y-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-red-50 text-red-500 mb-2 animate-bounce-subtle">
                   <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">应用发生意外错误</h2>
                  <p className="text-slate-500 text-sm leading-relaxed px-4">
                    程序在运行过程中遇到了无法自动处理的问题。您可以尝试刷新页面，或将诊断信息发送给管理员。
                  </p>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-100 group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">错误摘要</span>
                    <span className="text-[10px] p-1 bg-white rounded border border-slate-200 text-slate-400">
                      Trace ID: {this.state.error && isAppError(this.state.error) ? this.state.error.traceId : (this.state.error && 'traceId' in this.state.error ? (this.state.error as { traceId: string }).traceId : 'N/A')}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-slate-600 break-all line-clamp-3">
                    {this.state.error?.message || '未知内部错误'}
                  </p>
                </div>

                <ErrorActions error={this.state.error} isChunkFailure={false} />
              </div>
              
              <div className="bg-slate-50/50 px-8 py-4 border-t border-slate-100 flex justify-center">
                <p className="text-[10px] text-slate-400">如果您多次遇到此问题，请联系系统维护人员</p>
              </div>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
