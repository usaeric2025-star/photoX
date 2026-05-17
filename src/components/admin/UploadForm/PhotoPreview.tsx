import React from 'react';
import { X, Sparkles, RefreshCcw } from 'lucide-react';

export const PhotoPreview: React.FC<{
  newPhotoData: string | null;
  isAnalyzing: boolean;
  aiDebugInfo: any;
  abortAnalysis?: () => void;
}> = ({ newPhotoData, isAnalyzing, aiDebugInfo, abortAnalysis }) => {
  return (
    <div className="aspect-[4/3] rounded-[40px] overflow-hidden bg-slate-900 shadow-2xl flex items-center justify-center border-4 border-white relative">
      {newPhotoData && <img src={newPhotoData} className="max-w-full max-h-full object-contain" alt="New" />}
      {isAnalyzing && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-20 rounded-[36px]">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white font-bold text-sm">正在识别中 (AI Analyzing)...</p>
          {aiDebugInfo && <p className="text-blue-300 text-[10px] mt-1">{aiDebugInfo.step}: {aiDebugInfo.message}</p>}
          {abortAnalysis && (
            <button onClick={abortAnalysis} className="px-6 py-2 bg-red-500 text-white text-[10px] font-bold rounded-full">取消</button>
          )}
        </div>
      )}
    </div>
  );
};
