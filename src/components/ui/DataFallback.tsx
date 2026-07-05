import React from 'react';
import { Icon } from './Icon.js';
import { Button } from './Button.js';
import { useTranslation } from '#src/hooks/index.js';

interface DataFallbackProps {
  loading?: boolean;
  error?: Error | string | null;
  isEmpty?: boolean;
  onRetry?: () => void;
  loadingSkeleton?: React.ReactNode;
  emptyIcon?: string;
  emptyTitle?: string;
  emptyMessage?: string;
  children: React.ReactNode;
}

export function DataFallback({
  loading,
  error,
  isEmpty,
  onRetry,
  loadingSkeleton,
  emptyIcon = 'inbox',
  emptyTitle,
  emptyMessage,
  children
}: DataFallbackProps) {
  const { t } = useTranslation();

  if (loading) {
    if (loadingSkeleton) return <>{loadingSkeleton}</>;
    return (
      <div className="p-1 sm:p-2 lg:p-4 w-full h-full flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    const errorMsg = typeof error === 'string' ? error : error.message;
    return (
      <div className="p-4 flex flex-col justify-center items-center h-full min-h-[50vh] text-center bg-surface-mute/20 rounded-xl">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
          <Icon name="alert-circle" size={32} />
        </div>
        <div className="text-xl font-semibold text-text-base mb-2">
          {t('errorPrefix')}
        </div>
        <p className="text-text-soft mb-6 max-w-md">{errorMsg}</p>
        {onRetry ? (
          <Button onClick={onRetry}>{t('retry') || 'Retry'}</Button>
        ) : (
          <Button onClick={() => window.history.back()}>{t('goBack')}</Button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="p-4 flex flex-col justify-center items-center h-full min-h-[50vh] text-center bg-surface-mute/20 rounded-xl">
        <div className="w-16 h-16 bg-surface-soft rounded-full flex items-center justify-center mb-4">
          <Icon name={emptyIcon as any} size={32} className="text-text-mute" />
        </div>
        <div className="text-xl font-semibold text-text-base mb-2">
          {emptyTitle || 'No Data'}
        </div>
        {emptyMessage && (
          <p className="text-text-soft mb-6 max-w-md">{emptyMessage}</p>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
