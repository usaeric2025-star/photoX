import React, { Component, ReactNode } from 'react';
import { useCopyToClipboard, useTranslation } from '#src/hooks/index.js';
import { isAppError, AppError } from '#shared/AppError.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { cn } from '#lib/utils.js';
import { LoadingSpinner } from '#src/components/ui/feedback/LoadingSpinner.js';
import { handleChunkError } from '#lib/chunkErrorHandler.js';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

const ErrorActions = ({ error, isChunkFailure }: { error?: Error, isChunkFailure: boolean }) => {
  const { t } = useTranslation();
  const { copy, copied } = useCopyToClipboard({ successMessage: t('copyDiagInfo') });

  const handleCopy = () => {
    const timestamp = new Date().toISOString();
    const errorType = error?.name || 'Error';
    
    let errorCode = 'N/A';
    let traceIdStr = 'N/A';

    if (error && isAppError(error)) {
        errorCode = String(error.code);
        traceIdStr = error.traceId;
    } else if (error) {
        if ('code' in error) errorCode = String((error as { code?: string | number }).code);
        else if ('status' in error) errorCode = String((error as { status?: string | number }).status);
        
        if ('traceId' in error) traceIdStr = String((error as { traceId?: string }).traceId);
    }

    const message = error?.message || t('unknownInternalError');
    let safeMessage = message;
    if (safeMessage) {
      safeMessage = safeMessage.replace(/data:image\/[^;]+;base64,[a-zA-Z0-9+/=]+/g, '[BASE64_IMAGE_TRUNCATED]');
      if (safeMessage.length > 500) {
        safeMessage = safeMessage.substring(0, 500) + '... ' + t('errorTruncated');
      }
    }
    
    const diagnosticInfo = [
      t('errorDiagReport'),
      `${t('timestamp')}: ${timestamp}`,
      `${t('errorType')}: ${errorType}`,
      `${t('errorCode')}: ${errorCode}`,
      `${t('traceId')}: ${traceIdStr}`,
      `${t('errorMsgLabel')}: ${safeMessage}`
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
        {isChunkFailure ? t('updateSystemNow') : t('refreshRetry')}
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
            {copied ? t('copied') : t('copyDiagInfo')}
          </button>
          <button
            onClick={() => (window.location.href = '/')}
            className="px-6 py-2.5 border border-slate-200 bg-white text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            {t('backToHome')}
          </button>
        </>
      )}
    </div>
  );
};

const ErrorUI = ({ error, fallback }: { error?: Error, fallback?: ReactNode }) => {
    const { t } = useTranslation();
    const isChunkFailure = error instanceof Error && 
        (error.message.includes('Failed to fetch dynamically imported module') || 
         error.message.includes('Loading chunk'));

    if (isChunkFailure) {
        return (
          <div className="flex items-center justify-center min-h-screen p-8 bg-slate-50">
            <div className="text-center max-w-sm">
              <LoadingSpinner size="lg" className="mx-auto mb-6" />
              <h2 className="text-xl font-bold text-slate-900 mb-2">{t('updatingApp')}</h2>
              <p className="text-slate-500 mb-8 text-sm">{t('autoLoadingRes')}</p>
            </div>
          </div>
        );
    }

    return fallback || (
      <div className="min-h-[500px] w-full flex items-center justify-center p-6 bg-slate-50/30">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="p-8 text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-red-50 text-red-500 mb-2 animate-bounce-subtle">
               <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{t('appUnexpectedError')}</h2>
              <p className="text-slate-500 text-sm leading-relaxed px-4">
                {t('appUnexpectedErrorDesc')}
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-100 group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('errorSummary')}</span>
                <span className="text-[10px] p-1 bg-white rounded border border-slate-200 text-slate-400">
                  Trace ID: {error && isAppError(error) ? error.traceId : (error && 'traceId' in error ? (error as { traceId: string }).traceId : 'N/A')}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-600 break-all line-clamp-3">
                {error?.message || t('unknownInternalError')}
              </p>
            </div>

            <ErrorActions error={error} isChunkFailure={false} />
          </div>
          
          <div className="bg-slate-50/50 px-8 py-4 border-t border-slate-100 flex justify-center">
            <p className="text-[10px] text-slate-400">{t('contactSupport')}</p>
          </div>
        </div>
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
      return <ErrorUI error={this.state.error} fallback={this.props.fallback} />;
    }

    return this.props.children;
  }
}
