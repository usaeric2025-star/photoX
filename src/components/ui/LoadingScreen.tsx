import { logger } from '@/lib/logger';
import React, { useEffect, useRef, lazy, Suspense } from 'react';
import { Icon } from '@/components/ui/Icon';

export const LoadingScreen = ({ error, onRetry }: { error?: Error | null, onRetry?: () => void }) => {
  logger.debug('🔄 [LoadingScreen] Rendered');
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
    const skeleton = document.getElementById('app-startup-skeleton');
    if (skeleton) {
      skeleton.style.opacity = '0';
      setTimeout(() => {
        skeleton.remove();
      }, 300);
    }
  }, []);

  const content = error ? (
    <div className="flex items-center justify-center bg-white/95 backdrop-blur-sm select-none min-h-screen">
      <div className="text-center max-w-md p-6">
        <div className="text-red-500 text-4xl mb-4">⚠️</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">載入失敗</h3>
        <p className="text-sm text-gray-600 mb-4">{error.message}</p>
        <button
          onClick={onRetry || (() => window.location.reload())}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
        >
          重新載入
        </button>
      </div>
    </div>
  ) : (
    <div className="flex flex-col bg-slate-50/95 backdrop-blur-sm select-none overflow-hidden min-h-screen w-full">
      {/* Top-edge dynamic linear progress bar */}
      <div className="h-[3px] w-full bg-slate-200 relative overflow-hidden shrink-0">
        <div className="absolute top-0 left-0 h-full w-[35%] bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 rounded-full animate-[loading-bar_1.2s_infinite_ease-in-out]"></div>
      </div>

      {/* Mock Header skeleton */}
      <header className="h-14 border-b border-slate-100 bg-white/80 backdrop-blur px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="text-brand-navy font-black tracking-widest text-sm flex items-center gap-1">
            <span>PH</span>
            <span className="w-2.5 h-2.5 rounded-full border-[2.5px] border-amber-500 animate-pulse"></span>
            <span>TOX</span>
          </div>
        </div>
        <div className="w-[120px] sm:w-[240px] h-8 rounded-full bg-slate-100/80 animate-pulse hidden xs:block"></div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse"></div>
        </div>
      </header>

      {/* Mock Categories pill skeleton row */}
      <div className="py-3 px-4 bg-white/50 border-b border-slate-100 flex gap-2 overflow-hidden shrink-0">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="w-16 h-7 rounded-full bg-slate-100 border border-slate-200/50 px-3 py-1 flex items-center justify-center">
            <div className="w-8 h-2 bg-slate-200 rounded animate-pulse"></div>
          </div>
        ))}
      </div>

      {/* Mock Grid skeleton layout */}
      <div className="flex-1 p-2 sm:p-4 overflow-hidden relative">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5 sm:gap-3 h-full">
          {Array.from({ length: 18 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square w-full rounded-lg bg-white border border-slate-100 shadow-sm p-1 flex flex-col justify-between animate-pulse"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="w-full h-[82%] rounded-md bg-slate-100/70"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <dialog 
      ref={dialogRef}
      className="w-screen h-screen max-w-none max-h-none m-0 p-0 bg-transparent backdrop:bg-transparent focus:outline-none"
    >
      {content}
    </dialog>
  );
};

