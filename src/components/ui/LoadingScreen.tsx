import { logger } from '@/lib/logger';
import React, { useEffect, useRef, useState } from 'react';
import { GlobalDiagnosticsDialog } from './GlobalDiagnosticsDialog';
import { Terminal } from 'lucide-react';

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
        className="m-auto w-screen h-screen max-w-none max-h-none border-none outline-none p-0 flex items-center justify-center bg-white/90 backdrop:bg-white/90 backdrop:backdrop-blur-sm shadow-none animate-in fade-in duration-200"
        id="full-page-loading"
      >
        <div className="flex flex-col items-center gap-6">
          <div className="text-brand-navy font-black tracking-widest text-sm animate-pulse-gentle">
            PHOT
            <span className="text-amber-500">O</span>
            X
          </div>

          {/* 載入超時輔助恢復小條 */}
          {showHelper && (
            <button
              onClick={() => setDiagnosticsOpen(true)}
              className="mt-4 px-4 py-2 border rounded-full text-slate-500 hover:text-slate-800 bg-white/50 backdrop-blur border-slate-200 text-[10px] sm:text-xs font-semibold hover:bg-white flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm animate-slide-in-up"
            >
              <Terminal size={12} className="text-slate-400" />
              載入時間較長？開啟連線診斷與快取修復
            </button>
          )}
        </div>
      </dialog>

      <GlobalDiagnosticsDialog 
        open={diagnosticsOpen} 
        onClose={() => setDiagnosticsOpen(false)} 
      />
    </>
  );
};

