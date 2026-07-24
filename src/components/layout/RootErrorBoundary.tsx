import React, { useEffect } from 'react';
import { useRouteError } from 'react-router-dom';

export function RootErrorBoundary() {
  const error = useRouteError() as Error;
  const isChunkLoadError = error?.message?.includes('Failed to fetch dynamically imported module') ||
    error?.message?.includes('Importing a module script failed') ||
    error?.name === 'ChunkLoadError';

  useEffect(() => {
    if (isChunkLoadError) {
      window.location.reload();
    }
  }, [isChunkLoadError]);

  if (isChunkLoadError) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center p-8 text-center bg-slate-50">
        <h2 className="text-xl font-semibold mb-2">更新載入中... / Updating...</h2>
        <p className="text-muted-foreground text-sm">
          正在獲取最新版本，請稍候。如果沒有自動重整，請手動刷新頁面。
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-black/90 transition-colors"
        >
          手動重整 (Reload manually)
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center p-8 text-center bg-slate-50">
      <h2 className="text-xl font-semibold mb-2 text-destructive">Application Error</h2>
      <p className="text-muted-foreground text-sm max-w-md break-words mb-4">
        {error?.message || 'An unexpected error occurred.'}
      </p>
      <button 
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-black/90 transition-colors"
      >
        重新載入頁面 (Reload Page)
      </button>
    </div>
  );
}
