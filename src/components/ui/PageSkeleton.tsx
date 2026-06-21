import React, { useState, useEffect } from 'react';
import { PhotoGridSkeleton } from '../photo/PhotoGridSkeleton';
import { useColumns } from '@/hooks';
import { GlobalDiagnosticsDialog } from './GlobalDiagnosticsDialog';
import { Icon } from '@/components/ui/Icon';

export function PageSkeleton() {
  const { columns } = useColumns();
  const [showHelper, setShowHelper] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);

  // 如果 3.5 秒後仍卡在骨架屏，說明加載過慢或遇到 chunk/快取異常
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowHelper(true);
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-50 w-full min-h-screen relative" id="page-skeleton-container">
      {/* Header Area styled exactly as PublicHeader/AdminHeader */}
      <div className="flex-shrink-0 bg-white h-14 sm:h-16 w-full px-2.5 sm:px-4 flex items-center justify-between border-b border-slate-200 shadow-sm">
        <div className="w-24 h-8 animate-pulse bg-slate-100 rounded-xl" />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 sm:w-10 sm:h-10 animate-pulse bg-slate-100 rounded-xl" />
          <div className="w-8 h-8 sm:w-10 sm:h-10 animate-pulse bg-slate-100 rounded-xl" />
        </div>
      </div>
      
      {/* Filter Area styled as PublicFilters */}
      <div className="px-3 sm:px-4 py-2 bg-white border-b border-slate-200/50 flex items-center justify-between gap-4">
        <div className="h-9 sm:h-10 w-full max-w-xs sm:max-w-md animate-pulse bg-slate-100 rounded-full" />
        <div className="flex items-center gap-2">
          <div className="h-9 w-20 animate-pulse bg-slate-100 rounded-full hidden sm:block" />
          <div className="h-9 w-9 animate-pulse bg-slate-100 rounded-full" />
        </div>
      </div>

      {/* Grid area matching VirtualPhotoGrid exact wrapper with zero extra outer padding */}
      <div className="flex-1 overflow-hidden relative">
        <div className="h-full w-full overflow-y-auto">
          <PhotoGridSkeleton columns={columns} count={12} />
        </div>
      </div>

      {/* stuck recovery panel */}
      {showHelper && (
        <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 bg-slate-900 border border-slate-800 text-white rounded-3xl p-5 shadow-2xl flex flex-col gap-3 animate-slide-in-up">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-805 flex items-center justify-center shrink-0 text-amber-500 animate-pulse">
              <Icon name="Terminal" size={15} />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold leading-tight tracking-wide">資源載入超時中 (Loading Timeout)</h4>
              <p className="text-[10px] text-slate-400 leading-normal">
                模組載入或數據解析似乎有些緩慢，您可以嘗試一鍵診斷以找出根本問題或重構快取。
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 font-semibold">
            <button
              onClick={() => setDiagnosticsOpen(true)}
              className="flex-1 px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <Icon name="Terminal" size={12} />
              點擊進行診斷
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-705 text-slate-300 rounded-xl text-[11px] flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
              title="立即整理"
            >
              <Icon name="RefreshCw" size={11} />
              重新整理
            </button>
          </div>
        </div>
      )}

      {/* Global diagnostics dialog popup */}
      <GlobalDiagnosticsDialog 
        open={diagnosticsOpen} 
        onClose={() => setDiagnosticsOpen(false)} 
      />
    </div>
  );
}
