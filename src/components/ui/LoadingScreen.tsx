import { logger } from '@/lib/logger';
import React, { useEffect, useRef, useState, lazy, Suspense } from 'react';
const DiagnosticsDialog = lazy(() => import('./DiagnosticsDialog').then(m => ({ default: m.DiagnosticsDialog })));
import { Icon } from '@/components/ui/Icon';

export const LoadingScreen = () => {
  const ref = useRef<HTMLDialogElement>(null);
  const [showHelper, setShowHelper] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    try {
      if (!el.open) {
        el.showModal();
      }
    } catch (e) {
      logger.warn('[LoadingScreen] Failed to show modal, fallback to open attribute:', e);
      el.setAttribute('open', '');
    }
    return () => {
      try {
        if (el && el.open) {
          el.close();
        }
      } catch (e) {
        if (el) el.removeAttribute('open');
      }
    };
  }, []);

  useEffect(() => {
    const skeleton = document.getElementById('app-startup-skeleton');
    if (skeleton) {
      skeleton.style.opacity = '0';
      setTimeout(() => {
        skeleton.remove();
      }, 300);
    }
  }, []);

  // 如果載入介面持續 4.5 秒，提供一鍵診斷
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowHelper(true);
    }, 4550);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <dialog
        ref={ref}
        onCancel={(e) => e.preventDefault()}
        className="m-auto w-screen h-screen max-w-none max-h-none border-none outline-none p-0 flex flex-col bg-slate-50/95 transition-all duration-200 select-none overflow-hidden"
        id="full-page-loading"
      >
        {/* Top-edge dynamic linear progress bar (sleek Apple/RSC vibe) */}
        <div className="h-[3px] w-full bg-slate-200 relative overflow-hidden shrink-0">
          <div className="absolute top-0 left-0 h-full w-[35%] bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 rounded-full animate-[loading-bar_1.2s_infinite_ease-in-out]"></div>
        </div>

        {/* Mock Header skeleton */}
        <header className="h-14 border-b border-slate-100 bg-white/80 backdrop-blur px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="text-brand-navy font-black tracking-widest text-sm flex items-center gap-1">
              <span>PH</span>
              <span className="w-2.5 h-2.5 rounded-full border-[2.5px] border-amber-500 animate-ping"></span>
              <span>TOX</span>
            </div>
            <div className="hidden sm:flex text-[9px] text-slate-400 font-semibold px-1.5 py-0.5 rounded border border-slate-100 bg-slate-50">
              连接中...
            </div>
          </div>
          
          <div className="w-[120px] sm:w-[240px] h-8 rounded-full bg-slate-100/80 animate-pulse hidden xs:block"></div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse"></div>
            <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse hidden sm:block"></div>
          </div>
        </header>

        {/* Mock Categories pill skeleton row */}
        <div className="py-3 px-4 bg-white/50 border-b border-slate-100 flex gap-2 overflow-hidden shrink-0">
          <div className="w-16 h-7 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 flex items-center justify-center">
            <div className="w-10 h-2 bg-amber-500/30 rounded animate-pulse"></div>
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
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
                <div className="flex items-center justify-between px-0.5 pb-0.5">
                  <div className="w-1/2 h-2.5 bg-slate-100 rounded"></div>
                  <div className="w-4 h-2.5 bg-slate-100 rounded"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Floating diagnostic launcher to recover if things get stuck */}
          <div className="absolute inset-x-0 bottom-6 flex justify-center pointer-events-none">
            {showHelper && (
              <button
                onClick={() => setDiagnosticsOpen(true)}
                className="pointer-events-auto px-4 py-2.5 border rounded-full text-slate-600 hover:text-slate-900 bg-white border-slate-200/80 text-[11px] sm:text-xs font-semibold hover:bg-slate-55 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-md shadow-slate-100/80 animate-slide-in-up"
              >
                <Icon name="terminal" size={12} className="text-amber-500 animate-pulse" />
                连线诊断与缓存修复 (Diagnostics)
              </button>
            )}
          </div>
        </div>
      </dialog>

      <Suspense fallback={null}>
        <DiagnosticsDialog 
          open={diagnosticsOpen} 
          onClose={() => setDiagnosticsOpen(false)} 
        />
      </Suspense>
    </>
  );
};

