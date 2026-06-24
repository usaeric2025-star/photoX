import { logger } from '@/lib/logger';
import React, { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
const DiagnosticsDialog = lazy(() => import('./DiagnosticsDialog').then(m => ({ default: m.DiagnosticsDialog })));
import { Icon } from '@/components/ui/Icon';

export const LoadingScreen = ({ error, onRetry }: { error?: Error | null, onRetry?: () => void }) => {
  const [showHelper, setShowHelper] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);

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

  const content = error ? (
    <div className="fixed inset-0 flex items-center justify-center bg-white/95 backdrop-blur-sm z-[999999]">
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
    <div className="fixed inset-0 flex items-center justify-center bg-slate-50/95 backdrop-blur-sm z-[999999] select-none">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-900 border-t-transparent" />
        <p className="text-slate-500 font-medium">載入中...</p>
      </div>
      
      {showHelper && (
        <div className="absolute inset-x-0 bottom-6 flex justify-center">
          <button
            onClick={() => setDiagnosticsOpen(true)}
            className="px-4 py-2.5 border rounded-full text-slate-600 hover:text-slate-900 bg-white border-slate-200/80 text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-md"
          >
            <Icon name="terminal" size={12} className="text-amber-500" />
            连线诊断与缓存修复 (Diagnostics)
          </button>
        </div>
      )}
    </div>
  );

  return createPortal(
    <>
      {content}
      <Suspense fallback={null}>
        <DiagnosticsDialog 
          open={diagnosticsOpen} 
          onClose={() => setDiagnosticsOpen(false)} 
        />
      </Suspense>
    </>,
    document.getElementById('loading-root')!
  );
};

