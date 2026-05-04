import React from 'react';
import { AnimatePresence, motion } from 'motion/react';

export function AdminLoadingOverlay({
  loadingState,
  batchProgress,
  importProgress,
  importTotal,
  abortAnalysis,
  cancelBatchAiRef,
  t
}: any) {
  return (
    <AnimatePresence>
      {loadingState !== 'idle' && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[2000] bg-white/70 backdrop-blur-xl flex flex-col items-center justify-center p-8"
        >
          <div className="w-16 h-16 relative mb-8">
             <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
             <div className="absolute inset-0 border-t-4 border-blue-600 rounded-full animate-spin shadow-lg shadow-blue-200"></div>
          </div>
          
          <div className="text-center mb-6">
            <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">
               {loadingState === 'analyzing' ? 'AI 智能辨識中... / AI Analyzing...' :
                loadingState === 'importing' ? '正在匯入照片... / Importing...' :
                loadingState === 'compressing' ? '影像壓縮中... / Compressing...' :
                loadingState === 'uploading' ? '正在上傳雲端... / Uploading...' :
                '正在同步數據... / Synching...'}
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t?.doNotClose || 'DO NOT CLOSE'}</p>
          </div>

          {(batchProgress?.total > 0 || (loadingState === 'importing' && importTotal > 0)) && (
            <div className="w-full max-w-xs">
              <div className="flex justify-between text-xs font-black text-slate-500 mb-2 uppercase tracking-tight">
                 <span>
                   {loadingState === 'importing' ? '匯入進度 / Import Progress' : '處理進度 / Progress'}
                 </span>
                 <span>
                   {loadingState === 'importing' ? `${importProgress} / ${importTotal}` : `${batchProgress?.current} / ${batchProgress?.total}`}
                 </span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner border border-slate-200">
                <motion.div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600" 
                  initial={{ width: 0 }}
                  animate={{ 
                    width: `${Math.round(((loadingState === 'importing' ? importProgress : batchProgress?.current) / (loadingState === 'importing' ? importTotal : batchProgress?.total)) * 100)}%` 
                  }}
                />
              </div>
            </div>
          )}

          {loadingState === 'analyzing' && (
            <button 
              onClick={() => {
                abortAnalysis?.();
                if (cancelBatchAiRef) cancelBatchAiRef.current = true;
              }}
              className="mt-12 px-8 py-3 bg-red-50 text-red-600 rounded-full font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-all border border-red-100"
            >
              取消辨識 / Cancel
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
