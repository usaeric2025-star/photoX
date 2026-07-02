import { logger } from '#lib/logger.js';
import React, { useEffect, useRef, lazy, Suspense } from 'react';
import { Icon } from '#src/components/ui/Icon.js';

export const LoadingScreen = ({ error, onRetry }: { error?: Error | null, onRetry?: () => void }) => {
  logger.debug('🔄 [LoadingScreen] Rendered');

  useEffect(() => {
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
      <div className="text-center max-w-md p-8 bg-white rounded-3xl shadow-2xl border border-red-100 animate-in fade-in zoom-in duration-300">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Icon name="alert-triangle" className="w-10 h-10 text-red-500" />
        </div>
        <h3 className="text-2xl font-black text-gray-900 mb-2">啟動失敗</h3>
        <p className="text-slate-500 mb-6 font-medium leading-relaxed">
          {error.message?.includes('逾時') ? '連線速度較慢或系統正在初始化，請稍候再試' : (error.message || '應用程式在啟動過程中遇到未知錯誤')}
        </p>
        
        <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">診斷報告 (Diagnostics)</div>
            <button 
              onClick={() => {
                const data = {
                  url: window.location.href,
                  ua: navigator.userAgent,
                  time: new Date().toISOString(),
                  error: error.stack || error.message,
                  type: error.name
                };
                navigator.clipboard.writeText(JSON.stringify(data, null, 2));
                alert('診斷資料已複製到剪貼簿');
              }}
              className="text-[10px] text-brand-navy font-bold hover:underline"
            >
              複製代碼
            </button>
          </div>
          <code className="text-[11px] text-slate-600 block break-all font-mono leading-tight max-h-40 overflow-y-auto">
            <div className="text-red-600 font-bold mb-1">Error: {error.name}</div>
            <div className="mb-2 italic opacity-70">{error.message}</div>
            {error.stack && (
              <div className="text-slate-400 text-[9px] mt-2 whitespace-pre-wrap">
                {error.stack.split('\n').slice(0, 5).join('\n')}
              </div>
            )}
          </code>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onRetry || (() => window.location.reload())}
            className="w-full py-4 bg-brand-navy text-white font-bold rounded-2xl hover:opacity-90 transition active:scale-95 shadow-lg flex items-center justify-center gap-2"
          >
            <Icon name="refresh-cw" className="w-4 h-4" />
            嘗試重新載入
          </button>
          
          <button
            onClick={() => window.location.href = '/?mode=admin&view=maintenance'}
            className="w-full py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition active:scale-95"
          >
            進入維護中心 (Diagnostics)
          </button>
        </div>
        
        <div className="mt-8 text-[10px] text-slate-300 font-medium">
          PhotoX Core Engine v2.6 • 穩定性優先模式
        </div>
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
    <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-50/95 backdrop-blur-sm select-none overflow-hidden h-screen w-screen">
      {content}
    </div>
  );
};

