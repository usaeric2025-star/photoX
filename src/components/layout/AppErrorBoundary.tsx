import React from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { showToast } from '#lib/ui/toast';
import { ErrorFactory } from '#lib/error/ErrorFactory';
import { useCopyToClipboard, useTranslation } from '#src/hooks';
import { isAppError } from '#lib/error/AppError';
import { handleChunkError } from '#lib/chunkErrorHandler';

function GlobalErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const { uiTranslations: t } = useTranslation();
  const { copy } = useCopyToClipboard({ successMessage: t.copySuccess });

  const isChunkFailure = error instanceof Error && (
    error.message.includes('Failed to fetch dynamically imported module') || 
    error.message.includes('Loading chunk')
  );

  if (isChunkFailure) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8 bg-slate-50">
        <div className="text-center max-w-sm">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">{t.updatingApp}</h2>
          <p className="text-slate-500 mb-8 text-sm">{t.autoLoadingRes}</p>
        </div>
      </div>
    );
  }

  let message = error instanceof Error ? error.message : String(error);
  if (message) {
    message = message.replace(/data:image\/[^;]+;base64,[a-zA-Z0-9+/=]+/g, '[BASE64_IMAGE_TRUNCATED]');
    if (message.length > 500) {
      message = message.substring(0, 500) + t.errorTruncated;
    }
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
    
    const diagnosticInfo = [
      t.errorDiagReport,
      `${t.timeLabel}${timestamp}`,
      `${t.errorTypeLabel}${errorType}`,
      `${t.errorCodeLabel}${errorCode}`,
      `${t.traceIdLabel}${traceId}`,
      `${t.errorMsgLabel}${message}`
    ].join('\n');
    
    copy(diagnosticInfo);
  };

  return (
    <div className="p-4 bg-red-50 text-red-800 rounded-lg">
      <h2 className="text-lg font-bold">{t.sysError}</h2>
      <p className="mt-2 text-sm">{message}</p>
      <div className="flex gap-2 mt-4">
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200"
        >
          {t.retryBtn}
        </button>
        <button
          onClick={handleCopy}
          className="px-4 py-2 border border-red-200 bg-white text-red-800 rounded-md hover:bg-red-50"
        >
          {t.copyDiag}
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
            handleChunkError(error.message);
            return;
          }
        }

        ErrorFactory.handle(error, { context: 'System Render Error' });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
